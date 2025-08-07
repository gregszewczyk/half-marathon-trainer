// 🚀 PLAN REGENERATION: Apply adaptive half marathon plan
// Preserves completed sessions, applies proper progression with session variety

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

    console.log(`🔄 Regenerating adaptive plan for user ${userId}`);

    // New adaptive plan data (targeting 1:45-1:50 based on current 1:48:30 prediction)
    const adaptivePlan = {
      // WEEK 3 - Fix current week (preserve completed Monday/Wednesday)
      3: {
        thursday: { type: "RUNNING", subType: "easy", distance: 6, pace: "6:31", 
                   mainSet: "6km easy run - Recovery pace after tempo work",
                   warmup: "5min dynamic stretching: leg swings, hip circles",
                   cooldown: "5min walking + stretching" },
        saturday: { type: "RUNNING", subType: "long", distance: 10, pace: "5:51",
                   mainSet: "10km long run - Build aerobic base at steady effort",  
                   warmup: "8min preparation: 3min walking + 5min dynamic stretching",
                   cooldown: "10min walking + thorough stretching routine" }
      },
      
      // WEEK 4 - Recovery week
      4: {
        monday: { type: "RUNNING", subType: "recovery", distance: 5, pace: "6:45",
                 mainSet: "5km recovery run - Very easy pace, focus on form" },
        wednesday: { type: "RUNNING", subType: "fartlek", distance: 5, pace: "varied",
                    mainSet: "5km fartlek - 10min easy + 20min play (lamp post to lamp post) + 5min easy" },
        thursday: { type: "RUNNING", subType: "easy", distance: 7, pace: "6:31",
                   mainSet: "7km easy run - Comfortable conversational pace" },
        saturday: { type: "RUNNING", subType: "long", distance: 9, pace: "6:15",
                   mainSet: "9km recovery long run - Easy effort, focus on time on feet" }
      },
      
      // WEEK 5 - Build begins with session variety
      5: {
        monday: { type: "RUNNING", subType: "easy", distance: 5, pace: "6:31",
                 mainSet: "5km easy run - Base building pace" },
        wednesday: { type: "RUNNING", subType: "threshold", distance: 5, pace: "5:21",
                    mainSet: "5km threshold run - 1.5km WU + 2km @ threshold + 1.5km CD" },
        thursday: { type: "RUNNING", subType: "intervals", distance: 8, pace: "varied", 
                   mainSet: "8km interval session - 2km WU + 5x1km @ 5:00/km (90s rec) + 2km CD" },
        saturday: { type: "RUNNING", subType: "long", distance: 12, pace: "6:01",
                   mainSet: "12km long run - Aerobic development pace, steady throughout" }
      },
      
      // WEEK 6 - Continue build
      6: {
        monday: { type: "RUNNING", subType: "progressive", distance: 5, pace: "varied",
                 mainSet: "5km progressive run - Start 6:30/km, finish 5:45/km" },
        wednesday: { type: "RUNNING", subType: "tempo", distance: 5, pace: "5:25",
                    mainSet: "5km tempo run - 1km WU + 3km @ tempo pace + 1km CD" },
        thursday: { type: "RUNNING", subType: "easy", distance: 9, pace: "6:31",
                   mainSet: "9km easy run - Recovery pace, building weekly volume" },
        saturday: { type: "RUNNING", subType: "long", distance: 14, pace: "5:55",
                   mainSet: "14km long run - Steady progression, last 2km at marathon pace" }
      },
      
      // WEEK 7 - Peak build
      7: {
        monday: { type: "RUNNING", subType: "fartlek", distance: 5, pace: "varied",
                 mainSet: "5km fartlek - Speed endurance with varied efforts" },
        wednesday: { type: "RUNNING", subType: "intervals", distance: 5, pace: "varied",
                    mainSet: "5km intervals - 1km WU + 6x800m @ 4:45/km (60s rec) + 1km CD" },
        thursday: { type: "RUNNING", subType: "tempo", distance: 10, pace: "5:31",
                   mainSet: "10km tempo run - Extended threshold session, 2km WU + 6km @ tempo + 2km CD" },
        saturday: { type: "RUNNING", subType: "long", distance: 16, pace: "5:51",
                   mainSet: "16km long run - Peak volume week, steady effort throughout" }
      },
      
      // WEEK 8 - Recovery
      8: {
        monday: { type: "RUNNING", subType: "easy", distance: 5, pace: "6:31",
                 mainSet: "5km easy run - Recovery week, gentle pace" },
        wednesday: { type: "RUNNING", subType: "strides", distance: 5, pace: "varied",
                    mainSet: "5km with strides - 3km easy + 6x100m strides + 1km easy" },
        thursday: { type: "RUNNING", subType: "easy", distance: 7, pace: "6:31",
                   mainSet: "7km easy run - Active recovery, conversational pace" },
        saturday: { type: "RUNNING", subType: "long", distance: 12, pace: "6:01",
                   mainSet: "12km long run - Maintain fitness, comfortable effort" }
      },
      
      // WEEK 9 - Peak week
      9: {
        monday: { type: "RUNNING", subType: "progressive", distance: 5, pace: "varied",
                 mainSet: "5km progressive - Race simulation, 6:15/km to 5:30/km" },
        wednesday: { type: "RUNNING", subType: "race_pace", distance: 5, pace: "5:15",
                    mainSet: "5km race pace run - 1km WU + 3km @ goal race pace + 1km CD" },
        thursday: { type: "RUNNING", subType: "intervals", distance: 9, pace: "varied",
                   mainSet: "9km intervals - 2km WU + 4x2km @ 5:00/km (2min rec) + 1km CD" },
        saturday: { type: "RUNNING", subType: "long", distance: 18, pace: "5:45",
                   mainSet: "18km peak long run - Last 3km include race pace segments" }
      },
      
      // WEEK 10 - Maintain
      10: {
        monday: { type: "RUNNING", subType: "easy", distance: 5, pace: "6:15",
                 mainSet: "5km easy run - Maintain fitness, recovery pace" },
        wednesday: { type: "RUNNING", subType: "threshold", distance: 5, pace: "5:21",
                    mainSet: "5km threshold - Maintain speed, 1km WU + 3km @ threshold + 1km CD" },
        thursday: { type: "RUNNING", subType: "progressive", distance: 8, pace: "varied",
                   mainSet: "8km progressive - Race prep, 6:00/km to 5:15/km" },
        saturday: { type: "RUNNING", subType: "long", distance: 17, pace: "5:45",
                   mainSet: "17km long run with race pace - Middle 5km at goal race pace" }
      },
      
      // WEEK 11 - Taper begins
      11: {
        monday: { type: "RUNNING", subType: "easy", distance: 5, pace: "6:15",
                 mainSet: "5km taper easy - Recovery pace, staying loose" },
        wednesday: { type: "RUNNING", subType: "race_pace", distance: 5, pace: "5:10",
                    mainSet: "5km race pace sharpening - 1km WU + 3km @ race pace + 1km CD" },
        thursday: { type: "RUNNING", subType: "easy", distance: 6, pace: "6:15",
                   mainSet: "6km easy taper run - Gentle pace, maintaining form" },
        saturday: { type: "RUNNING", subType: "long", distance: 13, pace: "5:40",
                   mainSet: "13km taper long run - Include 3x1km at race pace" }
      },
      
      // WEEK 12 - Race week
      12: {
        monday: { type: "RUNNING", subType: "easy", distance: 4, pace: "6:15",
                 mainSet: "4km pre-race easy - Very gentle, staying loose" },
        wednesday: { type: "RUNNING", subType: "strides", distance: 4, pace: "varied",
                    mainSet: "4km with race prep strides - 2km easy + 4x100m strides + 1km easy" },
        thursday: { type: "REST", subType: "rest", distance: 0, pace: null,
                   mainSet: "Complete rest day - Prepare for race" },
        saturday: { type: "RUNNING", subType: "race", distance: 21.1, pace: "5:10",
                   mainSet: "HALF MARATHON RACE - Goal: Sub-1:50!" }
      }
    };

    let sessionsUpdated = 0;
    let sessionsCreated = 0;

    // Apply the adaptive plan week by week
    for (const [weekStr, weekPlan] of Object.entries(adaptivePlan)) {
      const week = parseInt(weekStr);
      
      for (const [dayName, sessionData] of Object.entries(weekPlan)) {
        const dayOfWeek = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        
        // Skip completed sessions (preserve user's actual runs)
        if ((week === 1 || week === 2 || week === 3) && 
            (dayOfWeek === 'Monday' || (week === 3 && dayOfWeek === 'Wednesday'))) {
          console.log(`⏭️  Skipping completed session: W${week} ${dayOfWeek}`);
          continue;
        }

        try {
          // Find existing session
          const existingSession = await prisma.generatedSession.findFirst({
            where: {
              userId,
              week,
              dayOfWeek,
              sessionType: sessionData.type,
              sessionSubType: sessionData.subType
            }
          });

          const sessionUpdate = {
            userId,
            week,
            dayOfWeek,
            sessionType: sessionData.type,
            sessionSubType: sessionData.subType,
            distance: sessionData.distance,
            pace: sessionData.pace,
            mainSet: sessionData.mainSet,
            warmup: sessionData.warmup || "5min dynamic stretching: leg swings, hip circles",
            cooldown: sessionData.cooldown || "5min walking + stretching",
            aiModified: true,
            aiReason: "Plan regenerated with adaptive progression and session variety",
            lastModified: new Date(),
            // Set proper scheduling
            time: dayOfWeek === 'Monday' ? '17:00' : 
                  dayOfWeek === 'Wednesday' ? '05:00' :
                  dayOfWeek === 'Thursday' ? '18:00' :
                  dayOfWeek === 'Saturday' ? '09:00' : null,
            madeRunning: dayOfWeek === 'Monday' || dayOfWeek === 'Wednesday' || dayOfWeek === 'Saturday',
            targetRPE: sessionData.subType === 'easy' || sessionData.subType === 'recovery' ? 4 :
                      sessionData.subType === 'long' ? 5 :
                      sessionData.subType === 'tempo' || sessionData.subType === 'threshold' ? 7 :
                      sessionData.subType === 'intervals' ? 8 : 6
          };

          if (existingSession) {
            // Update existing session
            await prisma.generatedSession.update({
              where: { id: existingSession.id },
              data: sessionUpdate
            });
            sessionsUpdated++;
            console.log(`✅ Updated W${week} ${dayOfWeek}: ${sessionData.subType} ${sessionData.distance}km`);
          } else {
            // Create new session
            await prisma.generatedSession.create({
              data: {
                ...sessionUpdate,
                id: `${dayName}-${sessionData.subType}-${week}`
              }
            });
            sessionsCreated++;
            console.log(`🆕 Created W${week} ${dayOfWeek}: ${sessionData.subType} ${sessionData.distance}km`);
          }
        } catch (error) {
          console.error(`❌ Error updating W${week} ${dayOfWeek}:`, error);
        }
      }
    }

    console.log(`🎉 Plan regeneration complete: ${sessionsUpdated} updated, ${sessionsCreated} created`);

    return NextResponse.json({
      success: true,
      message: `Applied adaptive plan: ${sessionsUpdated} sessions updated, ${sessionsCreated} created`,
      sessionsUpdated,
      sessionsCreated
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Plan regeneration error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to regenerate plan', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}