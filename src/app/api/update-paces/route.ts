// 🚀 NEW: API endpoint to update existing sessions with comprehensive pace calculations
// Allows users to upgrade their training plans to use the new scientific pace formulas

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createPaceCalculator } from '@/lib/pace-calculator';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, updateMode = 'future_only' } = await request.json();
    
    console.log(`🔄 Updating pace calculations for user ${userId}, mode: ${updateMode}`);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user profile for pace calculator
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Create pace calculator with user's data
    const paceCalculator = createPaceCalculator({
      fitnessLevel: userProfile.fitnessLevel || 'INTERMEDIATE',
      ...(userProfile.pb5k && { pb5k: userProfile.pb5k }),
      ...(userProfile.pb10k && { pb10k: userProfile.pb10k }),
      ...(userProfile.pbHalfMarathon && { pbHalfMarathon: userProfile.pbHalfMarathon }),
      ...(userProfile.pbMarathon && { pbMarathon: userProfile.pbMarathon }),
      ...(userProfile.pbCustom && { pbCustom: userProfile.pbCustom }),
      ...(userProfile.pbCustomDistance && { pbCustomDistance: Number(userProfile.pbCustomDistance) }),
      targetTime: userProfile.targetTime || '2:00:00',
      raceType: userProfile.raceType || 'HALF_MARATHON'
    });

    console.log(`🎯 Created pace calculator with VDOT: ${paceCalculator.getVDOT().toFixed(1)}`);

    // Determine which sessions to update based on mode
    let whereClause: any = { userId };
    
    if (updateMode === 'future_only') {
      // Only update sessions that haven't been completed yet
      const completedSessionIds = await prisma.sessionFeedback.findMany({
        where: { userId, completed: 'yes' },
        select: { sessionId: true }
      });
      
      const completedIds = completedSessionIds.map(f => f.sessionId);
      console.log(`🔍 Found ${completedIds.length} completed sessions to skip`);
      
      whereClause.NOT = {
        id: { in: completedIds.map(id => 
          // Convert feedback sessionId back to database ID format
          id.replace(/^(mon|tue|wed|thu|fri|sat|sun)-(run|gym|rest|cross)-(\\d+)$/, '$1-$2-$3')
        )}
      };
    } else if (updateMode === 'all') {
      // Update all sessions (backup existing paces first)
      console.log('🔄 Updating all sessions including completed ones');
    }

    // Get sessions to update
    const sessionsToUpdate = await prisma.generatedSession.findMany({
      where: whereClause,
      select: {
        id: true,
        sessionType: true,
        sessionSubType: true,
        distance: true,
        pace: true,
        week: true,
        dayOfWeek: true,
        originalData: true
      }
    });

    console.log(`📝 Found ${sessionsToUpdate.length} sessions to update with new pace calculations`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each session with scientifically calculated pace
    for (const session of sessionsToUpdate) {
      try {
        // Skip non-running sessions
        if (session.sessionType !== 'RUNNING') {
          skippedCount++;
          continue;
        }

        // Calculate new pace based on session type
        const newPace = paceCalculator.getPaceForSession(
          'running',
          session.sessionSubType || 'easy',
          session.distance || undefined
        );

        // Only update if pace actually changed
        if (newPace !== session.pace) {
          await prisma.generatedSession.update({
            where: { id: session.id },
            data: {
              // 🚀 FIXED: Store original pace and distance properly
              ...(session.pace && !session.originalData && {
                originalData: {
                  pace: session.pace,
                  distance: session.distance, // Also store original distance
                  updatedAt: new Date().toISOString(),
                  reason: 'Pace calculator upgrade'
                }
              }),
              pace: newPace,
              // 🚀 IMPORTANT: Do NOT modify distance - only update pace
              aiModified: true,
              aiReason: 'Updated with comprehensive pace calculator (VDOT-based)',
              lastModified: new Date()
            }
          });
          
          console.log(`✅ Updated ${session.dayOfWeek} W${session.week} ${session.sessionSubType}: ${session.pace} → ${newPace}`);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating session ${session.id}:`, error);
        skippedCount++;
      }
    }

    // Update user profile to mark pace calculation upgrade
    await prisma.userProfile.update({
      where: { userId },
      data: {
        lastPlanUpdate: new Date()
        // Note: Could add paceCalculatorVersion field to schema in future
      }
    });

    const paceZones = paceCalculator.calculatePaceZones();
    const paceRanges = paceCalculator.getPaceRanges();

    return NextResponse.json({
      success: true,
      message: `Pace calculations updated successfully`,
      stats: {
        sessionsFound: sessionsToUpdate.length,
        sessionsUpdated: updatedCount,
        sessionsSkipped: skippedCount,
        updateMode
      },
      paceCalculator: {
        vdot: paceCalculator.getVDOT(),
        paceZones,
        paceRanges
      },
      raceTimePrediction: paceCalculator.predictRaceTime(21.0975) // Half marathon prediction
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Pace update API error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to update pace calculations', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET endpoint to preview what would be updated
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const updateMode = searchParams.get('updateMode') || 'future_only';
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Create pace calculator
    const paceCalculator = createPaceCalculator({
      fitnessLevel: userProfile.fitnessLevel || 'INTERMEDIATE',
      ...(userProfile.pb5k && { pb5k: userProfile.pb5k }),
      ...(userProfile.pb10k && { pb10k: userProfile.pb10k }),
      ...(userProfile.pbHalfMarathon && { pbHalfMarathon: userProfile.pbHalfMarathon }),
      ...(userProfile.pbMarathon && { pbMarathon: userProfile.pbMarathon }),
      ...(userProfile.pbCustom && { pbCustom: userProfile.pbCustom }),
      ...(userProfile.pbCustomDistance && { pbCustomDistance: Number(userProfile.pbCustomDistance) }),
      targetTime: userProfile.targetTime || '2:00:00',
      raceType: userProfile.raceType || 'HALF_MARATHON'
    });

    // Get sessions that would be updated
    let whereClause: any = { userId, sessionType: 'RUNNING' };
    
    if (updateMode === 'future_only') {
      const completedSessionIds = await prisma.sessionFeedback.findMany({
        where: { userId, completed: 'yes' },
        select: { sessionId: true }
      });
      
      const completedIds = completedSessionIds.map(f => f.sessionId);
      whereClause.NOT = {
        id: { in: completedIds }
      };
    }

    const sessions = await prisma.generatedSession.findMany({
      where: whereClause,
      select: {
        id: true,
        sessionType: true,
        sessionSubType: true,
        distance: true,
        pace: true,
        week: true,
        dayOfWeek: true,
        originalData: true
      },
      orderBy: [{ week: 'asc' }, { dayOfWeek: 'asc' }]
    });

    // Calculate what the new paces would be
    const preview = sessions.map(session => {
      const currentPace = session.pace;
      const newPace = paceCalculator.getPaceForSession(
        'running',
        session.sessionSubType || 'easy',
        session.distance || undefined
      );
      
      return {
        sessionId: session.id,
        week: session.week,
        day: session.dayOfWeek,
        type: session.sessionSubType,
        distance: session.distance,
        currentPace,
        newPace,
        willChange: currentPace !== newPace,
        improvement: currentPace && newPace ? 
          (parseFloat(currentPace.replace(':', '.')) - parseFloat(newPace.replace(':', '.'))).toFixed(2) : null
      };
    });

    const paceZones = paceCalculator.calculatePaceZones();
    const changesCount = preview.filter(p => p.willChange).length;

    return NextResponse.json({
      success: true,
      preview,
      summary: {
        totalSessions: sessions.length,
        sessionsToChange: changesCount,
        percentageChange: Math.round((changesCount / sessions.length) * 100),
        updateMode
      },
      paceCalculator: {
        vdot: paceCalculator.getVDOT(),
        currentPaceZones: paceZones
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Pace preview API error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to preview pace calculations', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}