// AI-Driven Plan Regeneration API
// Analyzes performance data and creates intelligent, adaptive training plan

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PerformanceAnalysis {
  avgActualVsPlanned: number;
  recentTempoPerformance: number;
  recentLongRunPerformance: number;
  avgRPE: number;
  completionRate: number;
  fitnessImprovement: number;
}

interface PaceZones {
  easy: string;
  tempo: string;
  threshold: string;
  intervals: string;
  race: string;
}

// Calculate new goal time based on recent performance
function calculateNewGoalTime(currentGoal: string, performanceAnalysis: PerformanceAnalysis): string {
  const [hours, minutes] = currentGoal.split(':').map(Number);
  const currentTimeSeconds = hours * 3600 + minutes * 60;
  
  // If consistently running faster than planned with good RPE, suggest faster goal
  const improvementFactor = performanceAnalysis.fitnessImprovement;
  
  if (improvementFactor > 0.1 && performanceAnalysis.avgRPE < 7) {
    // Suggest 2-5% improvement based on fitness gains
    const improvementPercent = Math.min(0.05, improvementFactor * 0.3);
    const newTimeSeconds = currentTimeSeconds * (1 - improvementPercent);
    
    const newHours = Math.floor(newTimeSeconds / 3600);
    const newMinutes = Math.floor((newTimeSeconds % 3600) / 60);
    const newSeconds = Math.round(newTimeSeconds % 60);
    
    return `${newHours}:${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}`;
  }
  
  return currentGoal;
}

// Calculate pace zones based on goal time AND actual performance data
function calculatePaceZones(goalTime: string, performanceAnalysis?: PerformanceAnalysis, recentFeedback?: any[]): PaceZones {
  const [hours, minutes, seconds] = goalTime.split(':').map(Number);
  const goalTimeSeconds = hours * 3600 + minutes * 60 + (seconds || 0);
  const goalPacePerKm = goalTimeSeconds / 21.0975;
  
  // Calculate different training zones
  const racePace = goalPacePerKm;
  const tempoPace = racePace * 0.95; // 5% faster
  const thresholdPace = racePace * 0.92; // 8% faster  
  const intervalPace = racePace * 0.88; // 12% faster
  
  // 🚀 SMART EASY PACE: Use actual performance data instead of formula
  let easyPace = racePace * 1.15; // Default: 15% slower (was 20%)
  
  if (recentFeedback && recentFeedback.length > 0) {
    // Find recent easy runs to calculate actual easy pace
    const easyRuns = recentFeedback.filter(f => 
      f.sessionSubType === 'easy' && 
      f.actualPace && 
      f.rpe && f.rpe <= 6 // Only use low-effort easy runs
    );
    
    if (easyRuns.length >= 2) {
      // Calculate average actual easy pace
      const easyPaceSeconds = easyRuns.map(run => {
        const [min, sec] = run.actualPace.split(':').map(Number);
        return min * 60 + sec;
      });
      
      const avgEasyPace = easyPaceSeconds.reduce((a, b) => a + b, 0) / easyPaceSeconds.length;
      
      // Use actual performance but cap it within reasonable bounds
      const maxEasyPace = racePace * 1.25; // No slower than 25% slower than race pace
      const minEasyPace = racePace * 1.05; // No faster than 5% slower than race pace
      
      easyPace = Math.max(minEasyPace, Math.min(maxEasyPace, avgEasyPace));
      
      console.log(`🎯 Smart easy pace: ${easyRuns.length} recent easy runs averaged ${Math.floor(avgEasyPace/60)}:${Math.round(avgEasyPace%60).toString().padStart(2,'0')}`);
    }
  }
  
  const formatPace = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return {
    easy: formatPace(easyPace),
    tempo: formatPace(tempoPace),
    threshold: formatPace(thresholdPace),
    intervals: formatPace(intervalPace),
    race: formatPace(racePace)
  };
}

// Calculate appropriate long run starting pace (slightly slower than easy pace)
function calculateLongRunPace(paceZones: PaceZones): string {
  // Long runs should start 5-15 seconds slower than easy pace for progressive builds
  const easyPaceSeconds = paceZones.easy.split(':').map(Number);
  const easyPaceTotal = easyPaceSeconds[0] * 60 + easyPaceSeconds[1];
  
  // Add 10 seconds for conservative long run start pace
  const longRunPaceTotal = easyPaceTotal + 10;
  
  const mins = Math.floor(longRunPaceTotal / 60);
  const secs = longRunPaceTotal % 60;
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate session variety based on training phase
function generateSessionVariety(week: number, totalWeeks: number = 12) {
  const phase = week <= 4 ? 'base' : 
                week <= 8 ? 'build' : 
                week <= 10 ? 'peak' : 'taper';
  
  const sessionTypes = {
    base: ['easy', 'tempo', 'easy', 'long'],
    build: ['easy', 'tempo', 'easy', 'long', 'intervals'],
    peak: ['easy', 'threshold', 'easy', 'long', 'race_pace'],
    taper: ['easy', 'tempo', 'easy', 'long']
  };
  
  return sessionTypes[phase] || sessionTypes.base;
}

// Calculate progressive distances respecting constraints
function calculateProgressiveDistances(week: number, baseDistances: number[], maxWeeklyIncrease: number = 2) {
  const progressionFactors = {
    1: 1.0, 2: 1.05, 3: 1.1, 4: 1.15,
    5: 1.2, 6: 1.3, 7: 1.4, 8: 1.2, // Recovery week
    9: 1.5, 10: 1.3, 11: 0.6, 12: 0.8 // Peak then taper
  };
  
  const factor = progressionFactors[week] || 1.0;
  
  return baseDistances.map((distance, index) => {
    // Respect club constraints: Monday/Wednesday max 5km
    if (index === 0 || index === 1) { // Monday/Wednesday
      return Math.min(5, Math.round(distance * factor));
    }
    return Math.round(distance * factor);
  });
}

// Generate warm-up and cool-down based on session type
function generateWarmupCooldown(sessionType: string, distance: number) {
  const warmups = {
    easy: `10-15 min easy jog, dynamic stretches`,
    tempo: `15 min easy + 4x100m strides + dynamic stretches`,
    threshold: `15 min easy + 6x100m strides + drills`,
    intervals: `20 min easy + 6x100m strides + drills + activation`,
    race_pace: `15 min easy + 4x100m strides + drills`,
    long: `10 min easy start, build gradually`
  };
  
  const cooldowns = {
    easy: `5-10 min easy walk + static stretches`,
    tempo: `10-15 min easy jog + stretches + foam rolling`,
    threshold: `15 min easy jog + thorough stretching`,
    intervals: `15-20 min easy jog + stretches + recovery protocols`,
    race_pace: `10-15 min easy jog + stretches`,
    long: `10 min easy walk + comprehensive stretching`
  };
  
  return {
    warmup: warmups[sessionType] || warmups.easy,
    cooldown: cooldowns[sessionType] || cooldowns.easy
  };
}

// Generate detailed session description
function generateSessionDescription(
  sessionType: string, 
  distance: number, 
  pace: string, 
  week: number,
  phase: string
) {
  const descriptions = {
    easy: `${distance}km easy run at ${pace}/km. Focus on aerobic base building and recovery. Should feel conversational throughout.`,
    
    tempo: `${distance}km tempo run at ${pace}/km. This is your "comfortably hard" pace - sustainable for ~1 hour. ${
      week <= 4 ? 'Build lactate threshold steadily.' : 
      week <= 8 ? 'Sharp tempo work for race specificity.' :
      'Race prep tempo - dial in goal pace feeling.'
    }`,
    
    threshold: `${distance}km threshold run at ${pace}/km. This is just above your lactate threshold - you should feel like you're working but controlled. ${
      distance <= 6 ? 'Continuous threshold effort.' : 
      'Consider 2-3km intervals with 90s recovery if feeling strong.'
    }`,
    
    intervals: `${distance}km interval session at ${pace}/km. ${
      week <= 6 ? 'Focus on 800m-1000m intervals with equal recovery.' :
      'Mix of 400m, 800m, and 1000m intervals. Build speed and VO2max.'
    } Target pace should feel "hard but sustainable for the interval."`,
    
    race_pace: `${distance}km race pace run at ${pace}/km. This is your target half marathon pace. ${
      week <= 8 ? 'Get familiar with goal pace feeling.' :
      'Final race pace tune-up. Practice race day nutrition and rhythm.'
    }`,
    
    long: `${distance}km progressive long run. Start at ${pace}/km and build throughout. ${
      distance <= 13 ? 'Focus: Start easy, gradually increase to moderate pace in final third.' :
      distance <= 18 ? 'Peak endurance: Start conservatively, build to race pace in final 3-5km. Practice race fueling.' :
      'Race simulation: Progressive build from easy → moderate → race pace. Practice all race day elements.'
    } ${week >= 9 ? 'Finish with 3-5km at goal race pace.' : 'Build effort gradually - this develops race fitness better than constant pace.'}`
  };
  
  return descriptions[sessionType] || descriptions.easy;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, forceRegenerate = false } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    console.log(`🤖 AI Plan Regeneration starting for user: ${userId}`);
    
    // Get user profile and current plan
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        targetTime: true,
        aiPredictedTime: true,
        fitnessLevel: true,
        clubSchedule: true,
        keepClubRuns: true,
        lastPlanUpdate: true
      }
    });
    
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Check if regeneration is needed (don't regenerate too frequently)
    const lastUpdate = userProfile.lastPlanUpdate;
    const daysSinceUpdate = lastUpdate ? 
      (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24) : 999;
    
    if (!forceRegenerate && daysSinceUpdate < 7) {
      return NextResponse.json({
        success: false,
        message: `Plan was updated ${Math.round(daysSinceUpdate)} days ago. Use forceRegenerate=true to override.`,
        daysSinceUpdate
      });
    }
    
    // Analyze recent performance (last 2 weeks)
    const recentFeedback = await prisma.sessionFeedback.findMany({
      where: {
        userId,
        completed: 'yes',
        submittedAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 14 days
        }
      },
      orderBy: { submittedAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Analyzing ${recentFeedback.length} recent sessions`);
    
    // Calculate performance analysis
    let performanceAnalysis: PerformanceAnalysis = {
      avgActualVsPlanned: 0,
      recentTempoPerformance: 0,
      recentLongRunPerformance: 0,
      avgRPE: 6,
      completionRate: 1,
      fitnessImprovement: 0
    };
    
    if (recentFeedback.length > 0) {
      // Calculate actual vs planned pace performance
      const paceComparisons = recentFeedback
        .filter(f => f.actualPace && f.plannedPace)
        .map(f => {
          const actualSeconds = f.actualPace!.split(':').reduce((acc, val, i) => acc + parseInt(val) * Math.pow(60, 1-i), 0);
          const plannedSeconds = f.plannedPace!.split(':').reduce((acc, val, i) => acc + parseInt(val) * Math.pow(60, 1-i), 0);
          return (plannedSeconds - actualSeconds) / plannedSeconds; // Positive = faster than planned
        });
      
      performanceAnalysis.avgActualVsPlanned = paceComparisons.length > 0 ? 
        paceComparisons.reduce((a, b) => a + b, 0) / paceComparisons.length : 0;
      
      // Calculate other metrics
      performanceAnalysis.avgRPE = recentFeedback.reduce((sum, f) => sum + (f.rpe || 6), 0) / recentFeedback.length;
      performanceAnalysis.completionRate = recentFeedback.filter(f => f.completed === 'yes').length / recentFeedback.length;
      
      // Tempo and long run specific performance
      const tempoSessions = recentFeedback.filter(f => f.sessionSubType === 'tempo');
      const longSessions = recentFeedback.filter(f => f.sessionSubType === 'long');
      
      if (tempoSessions.length > 0) {
        performanceAnalysis.recentTempoPerformance = tempoSessions
          .filter(f => f.actualPace && f.plannedPace)
          .reduce((sum, f) => {
            const actualSeconds = f.actualPace!.split(':').reduce((acc, val, i) => acc + parseInt(val) * Math.pow(60, 1-i), 0);
            const plannedSeconds = f.plannedPace!.split(':').reduce((acc, val, i) => acc + parseInt(val) * Math.pow(60, 1-i), 0);
            return sum + ((plannedSeconds - actualSeconds) / plannedSeconds);
          }, 0) / tempoSessions.length;
      }
      
      // Fitness improvement calculation
      performanceAnalysis.fitnessImprovement = Math.max(0, performanceAnalysis.avgActualVsPlanned);
    }
    
    console.log(`🎯 Performance Analysis:`, performanceAnalysis);
    
    // Determine new goal time based on performance
    const currentGoal = userProfile.targetTime || '2:00:00';
    const suggestedGoal = calculateNewGoalTime(currentGoal, performanceAnalysis);
    const workingGoal = suggestedGoal; // Use AI suggestion
    
    console.log(`🎯 Goal progression: ${currentGoal} → ${suggestedGoal}`);
    
    // Calculate new pace zones based on working goal AND recent performance
    const paceZones = calculatePaceZones(workingGoal, performanceAnalysis, recentFeedback);
    console.log(`⚡ New pace zones:`, paceZones);
    
    // Get current week
    const currentWeek = await getCurrentWeek(userId);
    console.log(`📅 Current training week: ${currentWeek}`);
    
    // Delete existing future sessions (from current week onwards)
    await prisma.generatedSession.deleteMany({
      where: {
        userId,
        week: { gte: currentWeek }
      }
    });
    
    console.log(`🗑️ Cleared sessions from week ${currentWeek} onwards`);
    
    // Generate new plan from current week to week 12
    const newSessions = [];
    const baseDistances = [5, 5, 6, 10]; // Monday, Wednesday, Thursday, Saturday base
    
    for (let week = currentWeek; week <= 12; week++) {
      const weekDistances = calculateProgressiveDistances(week, baseDistances);
      const sessionTypes = generateSessionVariety(week);
      const phase = week <= 4 ? 'base' : 
                   week <= 8 ? 'build' : 
                   week <= 10 ? 'peak' : 'taper';
      
      const weekSessions = [
        // Monday - Easy (club constraint: max 5km)
        {
          dayOfWeek: 'Monday',
          sessionType: 'RUNNING',
          sessionSubType: 'easy',
          distance: Math.min(5, weekDistances[0]),
          pace: paceZones.easy,
          scheduledTime: '17:00',
          isRunningClub: true,
          isMoveable: false
        },
        
        // Wednesday - Tempo/Threshold (club constraint: max 5km) 
        {
          dayOfWeek: 'Wednesday',
          sessionType: 'RUNNING',
          sessionSubType: week <= 4 ? 'tempo' : week <= 8 ? 'threshold' : week === 11 ? 'race_pace' : 'tempo',
          distance: Math.min(5, weekDistances[1]),
          pace: week <= 4 ? paceZones.tempo : week <= 8 ? paceZones.threshold : paceZones.race,
          scheduledTime: '05:00',
          isRunningClub: true,
          isMoveable: false
        },
        
        // Thursday - Easy/Intervals
        {
          dayOfWeek: 'Thursday',
          sessionType: 'RUNNING',
          sessionSubType: week >= 6 && week <= 9 && week % 2 === 0 ? 'intervals' : 'easy',
          distance: weekDistances[2],
          pace: week >= 6 && week <= 9 && week % 2 === 0 ? paceZones.intervals : paceZones.easy,
          scheduledTime: '18:00',
          isRunningClub: false,
          isMoveable: true
        },
        
        // Saturday - Long run
        {
          dayOfWeek: 'Saturday',
          sessionType: 'RUNNING', 
          sessionSubType: 'long',
          distance: weekDistances[3],
          pace: calculateLongRunPace(paceZones), // Long runs at appropriate progressive pace
          scheduledTime: '09:00',
          isRunningClub: false,
          isMoveable: true
        },
        
        // Add gym sessions back (Tuesday, Friday)
        {
          dayOfWeek: 'Tuesday',
          sessionType: 'GYM',
          sessionSubType: 'pull',
          duration: '60 min',
          scheduledTime: '04:30',
          isRunningClub: false,
          isMoveable: true,
          mainSet: 'Pull day: Back, biceps, posterior delts. Focus on pulling patterns to balance running.'
        },
        
        {
          dayOfWeek: 'Friday', 
          sessionType: 'GYM',
          sessionSubType: 'push',
          duration: '60 min',
          scheduledTime: '04:30',
          isRunningClub: false,
          isMoveable: true,
          mainSet: 'Push day: Chest, shoulders, triceps. Maintain upper body strength for running posture.'
        }
      ];
      
      // Add detailed session information
      weekSessions.forEach(session => {
        // Only generate warmup/cooldown for running sessions
        if (session.sessionType === 'RUNNING') {
          const warmupCooldown = generateWarmupCooldown(session.sessionSubType!, session.distance!);
          
          session.warmup = warmupCooldown.warmup;
          session.cooldown = warmupCooldown.cooldown;
          session.mainSet = generateSessionDescription(
            session.sessionSubType!,
            session.distance!,
            session.pace!,
            week,
            phase
          );
        }
        // Gym sessions already have mainSet defined above
        
        // Add week and user info for all sessions
        session.week = week;
        session.userId = userId;
        session.planVersion = 'ai-regenerated';
        session.aiReason = `AI-generated based on recent performance analysis. ${
          suggestedGoal !== currentGoal ? `Goal updated to ${suggestedGoal} based on fitness improvements.` : ''
        }`;
      });
      
      newSessions.push(...weekSessions);
    }
    
    // Create all new sessions
    await prisma.generatedSession.createMany({
      data: newSessions
    });
    
    console.log(`✅ Created ${newSessions.length} new AI-generated sessions`);
    
    // Update user profile with new goal and plan update time
    await prisma.userProfile.update({
      where: { userId },
      data: {
        aiPredictedTime: suggestedGoal,
        lastPlanUpdate: new Date()
      }
    });
    
    // Generate summary
    const summary = {
      totalSessions: newSessions.length,
      weeksRegenerated: 12 - currentWeek + 1,
      goalProgression: {
        from: currentGoal,
        to: suggestedGoal,
        improved: suggestedGoal !== currentGoal
      },
      paceZones,
      performanceAnalysis,
      phaseBreakdown: {
        base: newSessions.filter(s => s.week <= 4).length,
        build: newSessions.filter(s => s.week > 4 && s.week <= 8).length,
        peak: newSessions.filter(s => s.week > 8 && s.week <= 10).length,
        taper: newSessions.filter(s => s.week > 10).length
      }
    };
    
    console.log(`🎉 AI Regeneration Complete:`, summary);
    
    return NextResponse.json({
      success: true,
      message: 'AI-driven plan regeneration completed successfully',
      summary,
      aiMessage: `🤖 AI Coach has analyzed your recent performance and regenerated your training plan. ${
        suggestedGoal !== currentGoal ? 
        `Based on your strong performances, I've updated your goal to ${suggestedGoal}! ` : 
        ''
      }Your new plan includes progressive training with proper pace zones, session variety, and maintains your club constraints. Each session is now intelligently designed based on your actual fitness level.`
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI Plan Regeneration error:', errorMessage);
    
    return NextResponse.json({
      error: 'Failed to regenerate plan',
      details: errorMessage
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to get current training week
async function getCurrentWeek(userId: string): Promise<number> {
  try {
    // Check weeks 1-12 to find the current week based on completion
    for (let week = 1; week <= 12; week++) {
      const response = await fetch(`http://localhost:3000/api/feedback?userId=${userId}&weekNumber=${week}`);
      if (response.ok) {
        const data = await response.json();
        const feedback = data.feedback || [];
        const completedCount = feedback.filter((f: any) => f.completed && f.completed !== '').length;
        
        // If this week has fewer than 4 completed sessions, it's the current week
        if (completedCount < 4) {
          return week;
        }
      }
    }
    
    // If all weeks are complete, return week 12 (race week)
    return 12;
  } catch (error) {
    console.error('Error calculating current week:', error);
    return 4; // Default fallback
  }
}