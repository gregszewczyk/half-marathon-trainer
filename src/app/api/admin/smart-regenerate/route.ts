// src/app/api/admin/smart-regenerate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProgressionSafetyValidator, UserTrainingProfile } from '@/lib/training/progressionSafety';

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

    console.log(`🔄 Starting smart regeneration for user ${userId}`);

    // Get all sessions
    const allSessions = await prisma.generatedSession.findMany({
      where: {
        userId,
        sessionType: 'RUNNING'
      },
      orderBy: [
        { week: 'asc' },
        { dayOfWeek: 'asc' }
      ]
    });

    // Get completed sessions from feedback
    const feedback = await prisma.sessionFeedback.findMany({
      where: { userId }
    });
    const completedSessionIds = new Set(feedback.map(f => f.sessionId));

    // Categorize sessions
    const toPreserve = allSessions.filter(s => 
      completedSessionIds.has(s.id) || s.aiModified
    );
    const toRegenerate = allSessions.filter(s => 
      !completedSessionIds.has(s.id) && !s.aiModified
    );

    console.log(`✅ Preserving ${toPreserve.length} sessions (completed or AI-modified)`);
    console.log(`🔄 Regenerating ${toRegenerate.length} sessions with safety boundaries`);

    // Apply safety boundaries to the overall progression
    const weeklyDistances = applyWeeklyProgression(toPreserve, toRegenerate);
    
    // Delete sessions to regenerate
    if (toRegenerate.length > 0) {
      await prisma.generatedSession.deleteMany({
        where: {
          id: {
            in: toRegenerate.map(s => s.id)
          }
        }
      });
    }

    // Generate new sessions with safety boundaries
    const newSessions = [];
    
    for (const week of Object.keys(weeklyDistances).sort((a, b) => parseInt(a) - parseInt(b))) {
      const weekNum = parseInt(week);
      const targetDistance = weeklyDistances[week];
      
      // Skip weeks that are fully preserved
      const weekSessions = toPreserve.filter(s => s.week === weekNum);
      if (weekSessions.length >= 4) continue; // Full week preserved
      
      // Generate missing sessions for this week
      const weekSessionsNeeded = generateWeekSessions(
        userId, 
        weekNum, 
        targetDistance || 20, 
        weekSessions
      );
      
      newSessions.push(...weekSessionsNeeded);
    }

    // Insert new sessions
    if (newSessions.length > 0) {
      await prisma.generatedSession.createMany({
        data: newSessions
      });
    }

    console.log(`✅ Smart regeneration complete: ${newSessions.length} new sessions created`);

    return NextResponse.json({
      success: true,
      message: `Smart regeneration complete`,
      stats: {
        preserved: toPreserve.length,
        regenerated: newSessions.length,
        totalSessions: toPreserve.length + newSessions.length
      }
    });

  } catch (error) {
    console.error('Smart regeneration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to regenerate sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Apply research-based safety progression
function applyWeeklyProgression(preservedSessions: any[], toRegenerate: any[]): Record<string, number> {
  const userProfile: UserTrainingProfile = {
    fitnessLevel: 'intermediate',
    raceType: 'Half Marathon',
    trainingDaysPerWeek: 4,
    currentWeeklyDistance: 0,
    weeksInCurrentVolume: 1
  };

  // Calculate current weekly distances from preserved sessions
  const preservedWeeklyDistances: Record<number, number> = {};
  preservedSessions.forEach(session => {
    if (!preservedWeeklyDistances[session.week]) {
      preservedWeeklyDistances[session.week] = 0;
    }
    preservedWeeklyDistances[session.week] += session.distance || 0;
  });

  // Create safe progression for all 12 weeks
  const weeklyDistances: Record<string, number> = {};
  
  for (let week = 1; week <= 12; week++) {
    const preservedDistance = preservedWeeklyDistances[week] || 0;
    
    if (week === 1) {
      // Week 1: Start conservatively
      weeklyDistances[week.toString()] = Math.max(preservedDistance, 20);
    } else {
      const previousWeekDistance = weeklyDistances[(week - 1).toString()] || 20;
      let proposedDistance = previousWeekDistance * 1.10; // 10% increase
      
      // Apply cutback weeks (every 4th week)
      if (week % 4 === 0) {
        proposedDistance = previousWeekDistance * 0.75; // 25% reduction
      }
      
      // Final taper (weeks 11-12)
      if (week >= 11) {
        proposedDistance = previousWeekDistance * 0.60; // Significant taper
      }
      
      // Validate against safety boundaries
      const validation = ProgressionSafetyValidator.validateWeeklyIncrease(
        previousWeekDistance,
        proposedDistance,
        userProfile,
        []
      );
      
      const safeDistance = validation.isValid ? proposedDistance : validation.adjustedDistance;
      
      // Use preserved distance if it exists and is reasonable, otherwise use safe distance
      if (preservedDistance > 0) {
        // If preserved distance is within 20% of safe distance, use it
        const ratio = preservedDistance / safeDistance;
        weeklyDistances[week.toString()] = (ratio >= 0.8 && ratio <= 1.2) ? preservedDistance : safeDistance;
      } else {
        weeklyDistances[week.toString()] = safeDistance;
      }
    }
    
    // Ensure week 12 is race week (21.1km)
    if (week === 12) {
      weeklyDistances[week.toString()] = Math.max(preservedDistance, 28); // Race + easy runs
    }
  }

  return weeklyDistances;
}

// Generate sessions for a specific week
function generateWeekSessions(
  userId: string, 
  week: number, 
  targetDistance: number, 
  preservedSessions: any[]
): any[] {
  const sessions: any[] = [];
  const preservedDistance = preservedSessions.reduce((sum, s) => sum + (s.distance || 0), 0);
  const remainingDistance = Math.max(0, targetDistance - preservedDistance);
  const preservedDays = new Set(preservedSessions.map(s => s.dayOfWeek));
  
  // Standard weekly pattern: Monday, Wednesday, Thursday, Saturday
  const weekPattern = [
    { day: 'Monday', type: 'easy', ratio: 0.25 },
    { day: 'Wednesday', type: 'tempo', ratio: 0.25 },
    { day: 'Thursday', type: 'easy', ratio: 0.25 },
    { day: 'Saturday', type: 'long', ratio: 0.25 }
  ];

  // Special handling for race week (week 12)
  if (week === 12) {
    if (!preservedDays.has('Sunday')) {
      sessions.push({
        userId,
        week,
        dayOfWeek: 'Sunday',
        sessionType: 'RUNNING',
        sessionSubType: 'race',
        distance: 21.1,
        pace: '5:41',
        duration: null,
        scheduledTime: '09:00',
        isRunningClub: false,
        isMoveable: false,
        warmup: '15min race preparation: dynamic stretching + 3x100m strides',
        mainSet: 'Manchester Half Marathon - Sub-2:00 goal race',
        cooldown: '10min easy walking + gentle stretching',
        targetRPE: 8,
        aiModified: false,
        originalData: null,
        aiReason: 'Race day - Manchester Half Marathon',
        planVersion: 'v2.0-safety'
      });
    }
    // Add easy runs for remaining distance
    const easyDistance = Math.max(2, (remainingDistance - 21.1) / 2);
    ['Monday', 'Thursday'].forEach(day => {
      if (!preservedDays.has(day)) {
        sessions.push({
          userId,
          week,
          dayOfWeek: day,
          sessionType: 'RUNNING',
          sessionSubType: 'easy',
          distance: Math.round(easyDistance),
          pace: '6:32',
          duration: null,
          scheduledTime: day === 'Monday' ? '17:00' : '18:00',
          isRunningClub: day === 'Monday',
          isMoveable: false,
          warmup: '5min dynamic stretching: leg swings, hip circles',
          mainSet: `${Math.round(easyDistance)}km easy recovery run`,
          cooldown: '5min walking + stretching',
          targetRPE: 3,
          aiModified: false,
          originalData: null,
          aiReason: 'Easy recovery run before/after race',
          planVersion: 'v2.0-safety'
        });
      }
    });
    return sessions;
  }

  // Generate sessions for non-preserved days
  weekPattern.forEach(({ day, type, ratio }) => {
    if (!preservedDays.has(day)) {
      const distance = Math.round(remainingDistance * ratio);
      if (distance > 0) {
        sessions.push(createSession(userId, week, day, type, distance));
      }
    }
  });

  return sessions;
}

function createSession(userId: string, week: number, day: string, type: string, distance: number): any {
  const sessionTypes = {
    easy: {
      pace: '6:32',
      warmup: '5min dynamic stretching: leg swings, hip circles',
      cooldown: '5min walking + stretching',
      rpe: 4
    },
    tempo: {
      pace: '5:13',
      warmup: '15min build-up: 10min easy jog + 4x100m strides',
      cooldown: '10min easy jog + stretching',
      rpe: 7
    },
    long: {
      pace: '6:15',
      warmup: '8min preparation: 3min walking + 5min dynamic stretching',
      cooldown: '10min walking + thorough stretching routine',
      rpe: 5
    }
  };

  const config = sessionTypes[type as keyof typeof sessionTypes];
  const isClubDay = (day === 'Monday' && week <= 10) || (day === 'Wednesday' && week <= 10) || (day === 'Saturday' && week <= 10);

  return {
    userId,
    week,
    dayOfWeek: day,
    sessionType: 'RUNNING',
    sessionSubType: type,
    distance,
    pace: config.pace,
    duration: null,
    scheduledTime: day === 'Monday' ? '17:00' : day === 'Wednesday' ? '05:00' : day === 'Saturday' ? '09:00' : '18:00',
    isRunningClub: isClubDay,
    isMoveable: false,
    warmup: config.warmup,
    mainSet: `${distance}km ${type} run - Safety-validated progression`,
    cooldown: config.cooldown,
    targetRPE: config.rpe,
    aiModified: false,
    originalData: null,
    aiReason: `Safety-validated ${type} session for week ${week}`,
    planVersion: 'v2.0-safety'
  };
}