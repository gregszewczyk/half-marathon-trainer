// 🚀 EMERGENCY FIX: Update mainSet text to match corrected distances
// Also ensure originalData is properly stored for distance tracking

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔧 Fixing mainSet text to match corrected distances for user ${userId}`);

    // Get all running sessions that were modified by the distance fix
    const sessionsToFix = await prisma.generatedSession.findMany({
      where: {
        userId,
        sessionType: 'RUNNING',
        aiModified: true,
        aiReason: {
          contains: 'Distance corrected'
        }
      }
    });

    console.log(`📝 Found ${sessionsToFix.length} sessions with corrected distances to fix`);

    let fixedCount = 0;

    for (const session of sessionsToFix) {
      try {
        // Extract the old distance from mainSet text
        const oldDistanceMatch = session.mainSet?.match(/(\d+\.?\d*)km/);
        const oldDistance = oldDistanceMatch ? parseFloat(oldDistanceMatch[1]) : null;
        
        if (session.mainSet && session.distance && oldDistance !== session.distance) {
          // Update mainSet text to match the corrected distance
          const newMainSet = session.mainSet.replace(
            /(\d+\.?\d*)km/,
            `${session.distance}km`
          );

          // Ensure originalData includes the old distance and old mainSet
          const currentOriginalData = session.originalData as any || {};
          const updatedOriginalData = {
            ...currentOriginalData,
            distance: oldDistance,
            mainSet: session.mainSet, // Store original mainSet text
            pace: currentOriginalData.pace || session.pace,
            updatedAt: new Date().toISOString(),
            reason: 'Distance correction with mainSet sync'
          };

          await prisma.generatedSession.update({
            where: { id: session.id },
            data: {
              mainSet: newMainSet,
              originalData: updatedOriginalData,
              aiReason: `Distance corrected from ${oldDistance}km to ${session.distance}km with mainSet sync`,
              lastModified: new Date()
            }
          });

          console.log(`✅ Fixed ${session.dayOfWeek} W${session.week} ${session.sessionSubType}: mainSet "${oldDistance}km" → "${session.distance}km"`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ Error fixing session ${session.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed mainSet text for ${fixedCount} sessions`,
      sessionsFixed: fixedCount
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ MainSet fix error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to fix mainSet text', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}