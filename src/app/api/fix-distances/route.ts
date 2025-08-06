// 🚀 EMERGENCY: Fix incorrect distances + enforce club run constraints
// Restores proper progressive training distances with hard limits for club runs

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

    console.log(`🔧 Fixing distance progression with club run constraints for user ${userId}`);

    // 🚀 HARD CONSTRAINTS: Club runs (Monday, Wednesday) are fixed at 5km max
    // Thursday and Saturday (long runs) can be longer to compensate
    const correctDistances = {
      // Week 3: Proper progression with club run constraints
      3: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Hard limit 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Hard limit 5km (but tempo intensity)
        'thursday_easy': 8,      // 📈 COMPENSATE: Extra distance here
        'saturday_long': 13      // 📈 Main progression
      },
      // Week 4 (recovery week)
      4: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Always 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Always 5km
        'thursday_easy': 6,      // Recovery week - moderate
        'saturday_long': 10      // Recovery week - shorter
      },
      // Week 5 (build phase)
      5: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Always 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Always 5km
        'thursday_easy': 9,      // 📈 COMPENSATE: More distance
        'saturday_long': 15      // Progressive build
      },
      // Week 6
      6: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Always 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Always 5km
        'thursday_easy': 10,     // 📈 COMPENSATE: Build
        'saturday_long': 16      // Long run progression
      },
      // Week 7 (peak build)
      7: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Always 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Always 5km
        'thursday_easy': 11,     // 📈 COMPENSATE: Peak build
        'saturday_long': 18      // Peak long run
      },
      // Week 8 (recovery)
      8: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Always 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Always 5km
        'thursday_easy': 7,      // Recovery
        'saturday_long': 12      // Recovery
      },
      // Week 9 (build)
      9: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Always 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Always 5km
        'thursday_easy': 12,     // 📈 COMPENSATE: Long mid-week
        'saturday_long': 20      // Peak long run
      },
      // Week 10 (step back)
      10: {
        'monday_easy': 5,        // 🔒 CLUB RUN: Always 5km
        'wednesday_tempo': 5,    // 🔒 CLUB RUN: Always 5km
        'thursday_easy': 8,      // Step back
        'saturday_long': 16      // Step back
      }
    };

    let fixedCount = 0;
    const fixes: Array<{week: number, day: string, type: string, from: number | null, to: number}> = [];

    // Fix distances with constraints
    for (const [weekStr, distances] of Object.entries(correctDistances)) {
      const week = parseInt(weekStr);
      
      for (const [sessionKey, correctDistance] of Object.entries(distances)) {
        const [dayName, sessionType] = sessionKey.split('_');
        
        try {
          // Find the session to fix
          const sessions = await prisma.generatedSession.findMany({
            where: {
              userId,
              week,
              sessionType: 'RUNNING',
              sessionSubType: sessionType,
              dayOfWeek: dayName.charAt(0).toUpperCase() + dayName.slice(1).toLowerCase() // "Monday", "Wednesday"
            }
          });

          for (const session of sessions) {
            if (session.distance !== correctDistance) {
              console.log(`🔧 Fixing Week ${week} ${dayName} ${sessionType}: ${session.distance}km → ${correctDistance}km`);
              
              // Track the fix
              fixes.push({
                week,
                day: dayName,
                type: sessionType,
                from: session.distance,
                to: correctDistance
              });
              
              await prisma.generatedSession.update({
                where: { id: session.id },
                data: {
                  // Store the incorrect distance as original if not already stored
                  ...(session.distance && !session.originalData && {
                    originalData: {
                      distance: session.distance,
                      pace: session.pace,
                      reason: 'Distance correction with club run constraints',
                      fixedAt: new Date().toISOString()
                    }
                  }),
                  distance: correctDistance,
                  aiModified: true,
                  aiReason: dayName === 'Monday' || dayName === 'Wednesday' 
                    ? `Club run constraint: Max 5km (was ${session.distance}km)`
                    : `Distance adjusted to compensate for club run constraints (was ${session.distance}km)`,
                  lastModified: new Date()
                }
              });
              
              fixedCount++;
            }
          }
        } catch (error) {
          console.error(`❌ Error fixing Week ${week} ${dayName} ${sessionType}:`, error);
        }
      }
    }

    // 🚀 UPDATE USER PROFILE: Add club run constraints for future plan generation
    try {
      await prisma.userProfile.update({
        where: { userId },
        data: {
          // Store constraints for future AI planning
          clubSchedule: ['MONDAY', 'WEDNESDAY'], // Days with club runs
          keepClubRuns: true, // Always respect club run constraints
          lastPlanUpdate: new Date()
        }
      });
      console.log('✅ Updated user profile with club run constraints');
    } catch (profileError) {
      console.error('⚠️ Could not update profile constraints:', profileError);
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} sessions with proper distance progression and club constraints`,
      fixes,
      constraints: {
        clubDays: ['Monday', 'Wednesday'],
        maxClubDistance: 5,
        compensationDays: ['Thursday', 'Saturday'],
        logic: 'Club runs fixed at 5km max, extra distance redistributed to Thursday/Saturday'
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Distance fix error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to fix distances', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET to preview current distances vs expected with constraints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get current distances for weeks 3-10
    const sessions = await prisma.generatedSession.findMany({
      where: {
        userId,
        week: { gte: 3, lte: 10 },
        sessionType: 'RUNNING'
      },
      select: {
        week: true,
        dayOfWeek: true,
        sessionSubType: true,
        distance: true,
        isRunningClub: true
      },
      orderBy: [{ week: 'asc' }, { dayOfWeek: 'asc' }]
    });

    const analysis = sessions.map(session => ({
      week: session.week,
      day: session.dayOfWeek,
      type: session.sessionSubType,
      currentDistance: session.distance,
      isClubRun: session.dayOfWeek === 'MONDAY' || session.dayOfWeek === 'WEDNESDAY',
      expectedDistance: session.dayOfWeek === 'MONDAY' || session.dayOfWeek === 'WEDNESDAY' ? 5 : 'varies',
      needsFix: (session.dayOfWeek === 'MONDAY' || session.dayOfWeek === 'WEDNESDAY') && session.distance !== 5
    }));

    const clubRunViolations = analysis.filter(a => a.needsFix);

    return NextResponse.json({
      success: true,
      analysis,
      clubRunViolations,
      constraints: {
        rule: 'Monday/Wednesday = 5km max (club runs)',
        compensationRule: 'Extra distance goes to Thursday/Saturday'
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}