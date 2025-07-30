// 🚀 COMPLETE: Generate All Sessions (Weeks 2-12) for Admin User
// Based on your migration.sql structure with proper schema alignment
import { NextResponse } from 'next/server';
import { PrismaClient, SessionType } from '@prisma/client';

const prisma = new PrismaClient();

// Pace zones matching your migration file exactly
const paceZones = {
  easyPace: '6:32',
  tempoPace: '5:13', 
  racePace: '5:41'
};

// Exact distances from your migration.sql
const weeklyDistances: Record<number, { easy: number; tempo: number; tempoMain: number; long: number }> = {
  // Week: { easy: [Mon, Thu], tempo: Wed, long: Sat }
  2: { easy: 6.0, tempo: 6.0, tempoMain: 4.0, long: 10.0 },
  3: { easy: 7.0, tempo: 7.0, tempoMain: 5.0, long: 12.0 },
  4: { easy: 5.0, tempo: 5.0, tempoMain: 3.0, long: 10.0 }, // Recovery
  5: { easy: 6.0, tempo: 7.0, tempoMain: 5.0, long: 14.0 },
  6: { easy: 7.0, tempo: 8.0, tempoMain: 6.0, long: 16.0 },
  7: { easy: 8.0, tempo: 9.0, tempoMain: 7.0, long: 18.0 },
  8: { easy: 6.0, tempo: 7.0, tempoMain: 5.0, long: 16.0 }, // Recovery
  9: { easy: 8.0, tempo: 10.0, tempoMain: 8.0, long: 20.0 }, // PEAK
  10: { easy: 6.0, tempo: 8.0, tempoMain: 6.0, long: 18.0 }, // Recovery
  11: { easy: 5.0, tempo: 6.0, tempoMain: 4.0, long: 12.0 }, // Taper
  12: { easy: 3.0, tempo: 4.0, tempoMain: 2.0, long: 2.0 }   // Race week
};

export async function POST() {
  try {
    console.log('🚀 Starting complete session generation for weeks 2-12...');
    
    const adminUserId = 'cmdhtwtil0000vg18swahirhu';
    
    // Clear existing sessions for weeks 2-12 only (preserve week 1)
    const deleted = await prisma.generatedSession.deleteMany({
      where: { 
        userId: adminUserId,
        week: { in: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
      }
    });
    
    console.log(`✅ Cleared ${deleted.count} existing sessions for weeks 2-12`);
    
    // Generate all sessions for weeks 2-12 based on your migration.sql
    const allSessions = [];
    
    for (let weekNum = 2; weekNum <= 12; weekNum++) {
      const distances = weeklyDistances[weekNum];
      if (!distances) {
        console.error(`❌ No distances defined for week ${weekNum}`);
        continue;
      }
      const phase = weekNum <= 4 ? 'Base building' : 
                   weekNum <= 8 ? 'Build phase' : 
                   weekNum <= 10 ? 'Peak phase' : 
                   weekNum === 11 ? 'Taper phase' : 'Race week';
      
      console.log(`📅 Generating Week ${weekNum} (${phase})`);
      
      // Get phase-specific descriptions
      const getPhaseDescription = (type: string) => {
        if (weekNum <= 4) return 'Base building with strength foundation';
        if (weekNum <= 8) return type === 'gym' ? 'Build phase strength development' : 'Build phase aerobic development';
        if (weekNum <= 10) return type === 'gym' ? 'Peak phase high intensity' : 'Peak phase aerobic support';
        if (weekNum === 11) return 'Taper phase volume reduction';
        return 'Race week minimal stress';
      };

      const getGymIntensity = () => {
        if (weekNum >= 11) return { min: 5, max: 7, description: 'Light to moderate intensity' };
        return { min: 6, max: 8, description: 'Moderate gym intensity' };
      };

      const getRunningRPE = (type: string) => {
        if (weekNum >= 11 && type === 'easy') return { min: 2, max: 4, description: 'Very easy recovery pace' };
        if (type === 'easy') return { min: 3, max: 5, description: 'Easy aerobic pace' };
        if (type === 'tempo') return { min: 6, max: 8, description: 'Comfortably hard tempo' };
        return { min: 5, max: 7, description: 'Steady long run effort' };
      };

      // MONDAY - Push Gym + Easy Run with MadeRunning
      allSessions.push({
        userId: adminUserId, week: weekNum, dayOfWeek: 'Monday',
        sessionType: SessionType.GYM, sessionSubType: 'push',
        scheduledTime: '04:30', isRunningClub: false, isMoveable: true, aiModified: false,
        mainSet: weekNum >= 11 ? 'Push Day: Chest, Shoulders, Triceps - Reduced Volume' : 'Push Day: Chest, Shoulders, Triceps',
        targetRPE: getGymIntensity(),
        aiReason: getPhaseDescription('gym'), planVersion: '1.0'
      });
      
      allSessions.push({
        userId: adminUserId, week: weekNum, dayOfWeek: 'Monday',
        sessionType: SessionType.RUNNING, sessionSubType: 'easy',
        distance: distances.easy, pace: paceZones.easyPace, scheduledTime: '17:00',
        isRunningClub: true, isMoveable: true, aiModified: false,
        warmup: '10 min easy jog + dynamic stretching',
        mainSet: `${distances.easy}km steady at easy pace with MadeRunning`,
        cooldown: '5 min walk + stretching',
        targetRPE: getRunningRPE('easy'),
        aiReason: getPhaseDescription('run'), planVersion: '1.0'
      });

      // TUESDAY - Pull Gym
      allSessions.push({
        userId: adminUserId, week: weekNum, dayOfWeek: 'Tuesday',
        sessionType: SessionType.GYM, sessionSubType: 'pull',
        scheduledTime: '04:30', isRunningClub: false, isMoveable: true, aiModified: false,
        mainSet: weekNum >= 11 ? 'Pull Day: Back, Biceps - Reduced Volume' : 'Pull Day: Back, Biceps',
        targetRPE: getGymIntensity(),
        aiReason: getPhaseDescription('gym'), planVersion: '1.0'
      });

      // WEDNESDAY - Tempo Run + Legs Gym
      allSessions.push({
        userId: adminUserId, week: weekNum, dayOfWeek: 'Wednesday',
        sessionType: SessionType.RUNNING, sessionSubType: 'tempo',
        distance: distances.tempo, pace: paceZones.tempoPace, scheduledTime: '05:00',
        isRunningClub: true, isMoveable: true, aiModified: false,
        warmup: '15 min easy + 4x100m strides',
        mainSet: `${distances.tempoMain}km tempo at threshold pace with MadeRunning`,
        cooldown: '10 min easy jog + stretching',
        targetRPE: getRunningRPE('tempo'),
        aiReason: weekNum >= 11 ? 'Taper phase sharpening' : getPhaseDescription('run'),
        planVersion: '1.0'
      });

      allSessions.push({
        userId: adminUserId, week: weekNum, dayOfWeek: 'Wednesday',
        sessionType: SessionType.GYM, sessionSubType: 'legs',
        scheduledTime: '06:00', isRunningClub: false, isMoveable: true, aiModified: false,
        mainSet: weekNum >= 11 ? 'Legs Day: Quads, Hamstrings, Glutes, Calves - Reduced Volume' : 'Legs Day: Quads, Hamstrings, Glutes, Calves',
        targetRPE: getGymIntensity(),
        aiReason: getPhaseDescription('gym'), planVersion: '1.0'
      });

      // THURSDAY - Push Gym + Easy Run (solo)
      allSessions.push({
        userId: adminUserId, week: weekNum, dayOfWeek: 'Thursday',
        sessionType: SessionType.GYM, sessionSubType: 'push',
        scheduledTime: '04:30', isRunningClub: false, isMoveable: true, aiModified: false,
        mainSet: weekNum >= 11 ? 'Push Day: Chest, Shoulders, Triceps - Reduced Volume' : 'Push Day: Chest, Shoulders, Triceps',
        targetRPE: getGymIntensity(),
        aiReason: getPhaseDescription('gym'), planVersion: '1.0'
      });

      allSessions.push({
        userId: adminUserId, week: weekNum, dayOfWeek: 'Thursday',
        sessionType: SessionType.RUNNING, sessionSubType: 'easy',
        distance: distances.easy, pace: paceZones.easyPace, scheduledTime: '18:00',
        isRunningClub: false, isMoveable: true, aiModified: false,
        warmup: '10 min easy jog + dynamic stretching',
        mainSet: `${distances.easy}km steady at easy pace (solo)`,
        cooldown: '5 min walk + stretching',
        targetRPE: getRunningRPE('easy'),
        aiReason: getPhaseDescription('run'), planVersion: '1.0'
      });

      // FRIDAY - Pull Gym (or rest for race week)
      if (weekNum < 12) {
        allSessions.push({
          userId: adminUserId, week: weekNum, dayOfWeek: 'Friday',
          sessionType: SessionType.GYM, sessionSubType: 'pull',
          scheduledTime: '04:30', isRunningClub: false, isMoveable: true, aiModified: false,
          mainSet: weekNum >= 11 ? 'Pull Day: Back, Biceps - Reduced Volume' : 'Pull Day: Back, Biceps',
          targetRPE: getGymIntensity(),
          aiReason: getPhaseDescription('gym'), planVersion: '1.0'
        });
      } else {
        // Race week - complete rest Friday
        allSessions.push({
          userId: adminUserId, week: weekNum, dayOfWeek: 'Friday',
          sessionType: SessionType.REST, sessionSubType: 'easy',
          isRunningClub: false, isMoveable: true, aiModified: false,
          mainSet: 'Complete Rest - Pre-Race Recovery',
          targetRPE: { min: 1, max: 1, description: 'Complete rest' },
          aiReason: 'Race week complete rest', planVersion: '1.0'
        });
      }

      // SATURDAY - Legs Gym + Long Run (or race week shakeout)
      if (weekNum < 12) {
        allSessions.push({
          userId: adminUserId, week: weekNum, dayOfWeek: 'Saturday',
          sessionType: SessionType.GYM, sessionSubType: 'legs',
          scheduledTime: '06:00', isRunningClub: false, isMoveable: true, aiModified: false,
          mainSet: weekNum >= 11 ? 'Legs Day: Quads, Hamstrings, Glutes, Calves - Reduced Volume' : 'Legs Day: Quads, Hamstrings, Glutes, Calves',
          targetRPE: getGymIntensity(),
          aiReason: getPhaseDescription('gym'), planVersion: '1.0'
        });

        allSessions.push({
          userId: adminUserId, week: weekNum, dayOfWeek: 'Saturday',
          sessionType: SessionType.RUNNING, sessionSubType: 'long',
          distance: distances.long, pace: paceZones.easyPace, scheduledTime: '09:00',
          isRunningClub: true, isMoveable: true, aiModified: false,
          warmup: '15 min easy jog + dynamic stretching',
          mainSet: weekNum === 9 ? `${distances.long}km progressive long run with MadeRunning - PEAK DISTANCE!` : 
                   `${distances.long}km progressive long run with MadeRunning`,
          cooldown: '10 min walk + full stretching routine',
          targetRPE: weekNum === 9 ? { min: 6, max: 8, description: 'Strong long run effort' } : 
                     weekNum >= 11 ? { min: 4, max: 6, description: 'Comfortable long run' } :
                     { min: 5, max: 7, description: 'Steady long run effort' },
          aiReason: weekNum === 9 ? 'Peak phase long run - maximum distance' : 
                   weekNum >= 11 ? 'Taper phase long run' : getPhaseDescription('run'),
          planVersion: '1.0'
        });
      } else {
        // Race week - shakeout run
        allSessions.push({
          userId: adminUserId, week: weekNum, dayOfWeek: 'Saturday',
          sessionType: SessionType.RUNNING, sessionSubType: 'easy',
          distance: distances.long, pace: paceZones.easyPace, scheduledTime: '09:00',
          isRunningClub: false, isMoveable: true, aiModified: false,
          warmup: '5 min easy jog + dynamic stretching',
          mainSet: '2km easy shakeout with strides',
          cooldown: '5 min walk + stretching',
          targetRPE: { min: 1, max: 3, description: 'Pre-race activation' },
          aiReason: 'Race week activation run', planVersion: '1.0'
        });
      }

      // SUNDAY - Rest Day (or RACE DAY for week 12)
      if (weekNum < 12) {
        allSessions.push({
          userId: adminUserId, week: weekNum, dayOfWeek: 'Sunday',
          sessionType: SessionType.REST, sessionSubType: 'easy',
          isRunningClub: false, isMoveable: true, aiModified: false,
          mainSet: 'Rest Day - Recovery & Stretching',
          targetRPE: { min: 1, max: 2, description: 'Complete rest' },
          aiReason: 'Recovery day for adaptation', planVersion: '1.0'
        });
      } else {
        // RACE DAY!
        allSessions.push({
          userId: adminUserId, week: weekNum, dayOfWeek: 'Sunday',
          sessionType: SessionType.RUNNING, sessionSubType: 'race',
          distance: 21.1, pace: paceZones.racePace, scheduledTime: '09:00',
          isRunningClub: false, isMoveable: true, aiModified: false,
          warmup: '15 min easy jog + dynamic stretching + strides',
          mainSet: 'HALF MARATHON RACE - 21.1km at goal pace! Execute the plan!',
          cooldown: '15 min cool-down walk + celebration!',
          targetRPE: { min: 8, max: 10, description: 'RACE EFFORT - Give everything!' },
          aiReason: 'RACE DAY - Execute the plan!', planVersion: '1.0'
        });
      }
    }
    
    console.log(`📊 Generated ${allSessions.length} sessions for weeks 2-12`);
    
    // Insert sessions into database
    const result = await prisma.generatedSession.createMany({
      data: allSessions,
      skipDuplicates: true
    });
    
    console.log(`✅ Successfully created ${result.count} sessions`);
    
    // Verification
    const verification = await prisma.generatedSession.findMany({
      where: { 
        userId: adminUserId,
        week: { gte: 2, lte: 12 }
      },
      select: {
        week: true,
        dayOfWeek: true,
        sessionType: true,
        sessionSubType: true,
        distance: true,
        pace: true
      },
      orderBy: [{ week: 'asc' }, { dayOfWeek: 'asc' }]
    });
    
    return NextResponse.json({
      success: true,
      message: `Generated ${result.count} sessions for weeks 2-12`,
      sessionsCreated: result.count,
      weeksGenerated: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      phases: ['Base (2-4)', 'Build (5-8)', 'Peak (9-10)', 'Taper (11-12)'],
      verification: verification.slice(0, 15) // Show sample
    });
    
  } catch (error) {
    console.error('❌ Session generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}