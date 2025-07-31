// 🚀 src/app/api/generate-plan/route.ts
// Complete AI-powered custom training plan generation with proper TypeScript

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProgressionSafetyValidator, UserTrainingProfile } from '@/lib/training/progressionSafety';

const prisma = new PrismaClient();

// Calculate training weeks based on race date
function calculateTrainingWeeks(raceDate?: string): number {
  if (!raceDate) {
    // If no race date provided, use default 12 weeks
    return 12;
  }
  
  const today = new Date();
  const race = new Date(raceDate);
  const timeDiff = race.getTime() - today.getTime();
  const weeksDiff = Math.ceil(timeDiff / (1000 * 3600 * 24 * 7));
  
  // Ensure reasonable bounds: minimum 4 weeks, maximum 20 weeks
  if (weeksDiff < 4) {
    console.log(`⚠️ Race date too soon (${weeksDiff} weeks), using minimum 4 weeks`);
    return 4;
  }
  if (weeksDiff > 20) {
    console.log(`⚠️ Race date too far (${weeksDiff} weeks), using maximum 20 weeks`);
    return 20;
  }
  
  console.log(`📅 Calculated ${weeksDiff} weeks until race date: ${raceDate}`);
  return weeksDiff;
}

// Clean interface matching exact Prisma schema
interface GeneratedSessionCreate {
  userId: string;
  week: number;
  dayOfWeek: string;
  sessionType: 'RUNNING' | 'GYM' | 'REST' | 'CROSS_TRAINING';
  sessionSubType?: string | null;
  distance?: number | null;
  pace?: string | null;
  duration?: string | null;
  scheduledTime?: string | null;
  isRunningClub: boolean;
  isMoveable: boolean;
  warmup?: string | null;
  mainSet?: string | null;
  cooldown?: string | null;
  targetRPE?: any; // JSON field - can be null
  aiModified: boolean;
  originalData?: any; // JSON field - can be null
  aiReason?: string | null;
  planVersion: string;
}

// Onboarding data interface
interface OnboardingData {
  raceType: 'FIVE_K' | 'TEN_K' | 'HALF_MARATHON' | 'FULL_MARATHON' | 'CUSTOM';
  targetTime: string;
  raceDate?: string;
  pb5k?: string;
  pb10k?: string;
  pbHalfMarathon?: string;
  pbMarathon?: string;
  trainingDaysPerWeek: number;
  timePreferences: string[];
  workoutTypes: string[];
  otherWorkouts: string[];
  gymDaysPerWeek?: number;
  gymType?: string;
  runningClub?: string;
  clubSchedule: string[];
  keepClubRuns: boolean;
  injuryHistory: string[];
  restDayPrefs: string[];
  maxWeeklyMiles?: number;
  location?: string;
  age?: number;
  gender?: string;
  weight?: number;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId: string = body.userId;
    const onboardingData: OnboardingData = body.onboardingData;

    // Validation
    if (!userId || !onboardingData) {
      return NextResponse.json(
        { error: 'UserId and onboarding data are required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Generating AI-powered plan for user ${userId}`);
    
    // Calculate training weeks based on race date
    const totalWeeks = calculateTrainingWeeks(onboardingData.raceDate);
    console.log(`📊 Plan will be ${totalWeeks} weeks long`);

    // Check if plan is already being generated or exists
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });
    
    if (userProfile?.planGenerated) {
      const existingSessionCount = await prisma.generatedSession.count({
        where: { userId }
      });
      
      console.log(`⚠️ User ${userId} already has a generated plan with ${existingSessionCount} sessions`);
      return NextResponse.json({
        success: true,
        message: 'Plan already exists',
        sessionsGenerated: existingSessionCount,
        alreadyExists: true
      });
    }

    // Delete any partial existing sessions if they exist
    const existingSessions = await prisma.generatedSession.findMany({
      where: { userId }
    });

    if (existingSessions.length > 0) {
      await prisma.generatedSession.deleteMany({
        where: { userId }
      });
      console.log(`🗑️ Deleted ${existingSessions.length} existing sessions`);
    }

    // Generate AI-powered plan
    const sessions = await generateAITrainingPlan(userId, onboardingData, totalWeeks);
    
    // Save to database
    const result = await prisma.generatedSession.createMany({
      data: sessions
    });

    // Update user profile
    await prisma.userProfile.update({
      where: { userId },
      data: {
        planGenerated: true,
        lastPlanUpdate: new Date(),
        onboardingComplete: true
      }
    });

    console.log(`✅ Generated ${result.count} AI sessions for user ${userId} over ${totalWeeks} weeks`);

    return NextResponse.json({
      success: true,
      sessionsGenerated: result.count,
      plan: {
        raceType: onboardingData.raceType,
        targetTime: onboardingData.targetTime,
        totalWeeks: totalWeeks, // 🚀 Dynamic total weeks based on race date
        trainingDaysPerWeek: onboardingData.trainingDaysPerWeek,
        aiGenerated: true
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI Plan generation error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to generate AI training plan', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 🤖 AI PLAN GENERATION FUNCTIONS

async function generateAITrainingPlan(userId: string, data: OnboardingData, totalWeeks: number): Promise<GeneratedSessionCreate[]> {
  console.log(`🤖 Starting AI plan generation for user ${userId}`);
  console.log(`📅 Using ${totalWeeks} weeks for training plan`);
  
  try {
    
    // Step 1: Analyze user profile with AI
    const aiAnalysis = await analyzeUserProfile(data);
    console.log(`📊 AI analysis complete: ${aiAnalysis.fitnessLevel}`);
    
    // Step 2: Generate AI-customized pace zones
    const paceZones = await generateAIPaceZones(data, aiAnalysis);
    console.log(`🏃 AI pace zones: ${paceZones.easy} - ${paceZones.tempo} - ${paceZones.interval}`);
    
    // Step 3: Create AI-optimized weekly progression
    const rawProgression = await generateAIProgression(data, aiAnalysis, totalWeeks);
    console.log(`📈 AI progression: ${rawProgression.totalWeeks} weeks`);
    
    // Step 3.5: Apply research-based safety boundaries
    const weeklyProgression = await applySafetyBoundariesToProgression(rawProgression, data);
    console.log(`🛡️ Safety-validated progression: ${weeklyProgression.safetyValidation?.adjustmentsMade || 0} adjustments made`);
    
    // Step 4: Generate sessions with AI reasoning
    const sessions: GeneratedSessionCreate[] = [];
    
    for (let week = 1; week <= totalWeeks; week++) {
      console.log(`🗓️ Generating AI sessions for week ${week}`);
      
      const weekPlan = weeklyProgression.weeks[week - 1];
      const weekSessions = await generateAIWeekSessions(
        userId, 
        week, 
        data, 
        paceZones, 
        weekPlan,
        aiAnalysis
      );
      
      sessions.push(...weekSessions);
    }
    
    console.log(`✅ AI generated ${sessions.length} personalized sessions`);
    return sessions;
    
  } catch (error) {
    console.error('❌ AI plan generation failed:', error);
    // Fallback to static generation
    return await generateStaticTrainingPlan(userId, data);
  }
}

async function analyzeUserProfile(data: OnboardingData): Promise<any> {
  console.log('🤖 STARTING AI ANALYSIS');
  console.log('🔑 API Key exists:', !!process.env.PERPLEXITY_API_KEY);
  
  const prompt = `Analyze this runner's profile and provide training recommendations:

RUNNER PROFILE:
- Race Goal: ${data.raceType} in ${data.targetTime}
- Experience: PB 5K: ${data.pb5k || 'None'}, PB 10K: ${data.pb10k || 'None'}, PB Half: ${data.pbHalfMarathon || 'None'}
- Training Days: ${data.trainingDaysPerWeek} days per week
- Other Activities: ${data.otherWorkouts.join(', ')}
- Age: ${data.age}, Gender: ${data.gender}, Weight: ${data.weight}kg
- Injury History: ${data.injuryHistory.join(', ') || 'None'}
- Running Club: ${data.runningClub || 'None'} - Schedule: ${data.clubSchedule.join(', ')}

ANALYSIS NEEDED:
1. Fitness Level: beginner/intermediate/advanced
2. Training Intensity: conservative/moderate/aggressive
3. Key Focus Areas: [list 3-4 priorities]
4. Injury Risk Factors: [assessment]
5. Optimal Training Approach: [strategy]

CRITICAL BEGINNER GUIDELINES:
- If fitness level is "beginner" and they have no 5K PB, they should start with run/walk intervals
- Week 1 for beginners should be 1-2km total distance with walking breaks
- Beginners targeting 5K should follow: Week 1-2: run/walk intervals, Week 3-4: continuous 2-3k, Week 5-8: build to 5k
- Never start beginners with their goal distance on day 1
- Use progressive overload: increase distance by 10% each week maximum

Respond with JSON only:
{
  "fitnessLevel": "intermediate",
  "intensity": "moderate", 
  "focusAreas": ["aerobic base", "consistency", "injury prevention"],
  "injuryRisk": "low",
  "approach": "progressive training",
  "reasoning": "detailed explanation"
}`;

  console.log('📡 Making Perplexity API call...');

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ AI Analysis result received');
    
    const aiText = result.choices[0]?.message?.content || '{}';
    
    try {
      // Extract JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { 
        fitnessLevel: 'intermediate', 
        intensity: 'moderate',
        focusAreas: ['aerobic base', 'consistency'],
        injuryRisk: 'low',
        approach: 'progressive training'
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return { 
        fitnessLevel: 'intermediate', 
        intensity: 'moderate',
        focusAreas: ['aerobic base', 'consistency'],
        injuryRisk: 'low',
        approach: 'progressive training'
      };
    }
  } catch (fetchError) {
    console.error('Fetch error:', fetchError);
    throw fetchError;
  }
}

async function generateAIPaceZones(data: OnboardingData, analysis: any): Promise<any> {
  console.log('🏃 STARTING AI PACE ZONES');
  
  const prompt = `Based on this runner's profile, calculate optimal training pace zones:

RUNNER DATA:
- Goal: ${data.raceType} in ${data.targetTime}
- Current PRs: 5K: ${data.pb5k || 'None'}, 10K: ${data.pb10k || 'None'}, Half: ${data.pbHalfMarathon || 'None'}
- Fitness Level: ${analysis.fitnessLevel}
- Training Intensity: ${analysis.intensity}

Calculate training pace zones in min:sec per kilometer format:
1. Easy/Recovery Pace (conversational)
2. Tempo/Threshold Pace (comfortably hard)  
3. Interval/VO2 Max Pace (hard effort)
4. Long Run Pace (progressive)

Consider their current fitness and goal time. Be realistic but progressive.

Respond with JSON only:
{
  "easy": "6:30",
  "tempo": "5:45", 
  "interval": "5:15",
  "long": "6:15",
  "target": "5:41"
}`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    console.log('📡 Pace zones response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pace zones API Error:', response.status, errorText);
      throw new Error(`AI pace zones failed: ${response.status}`);
    }

    const result = await response.json();
    const aiText = result.choices[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : calculateStaticPaceZones(data.raceType, data.targetTime);
    } catch (parseError) {
      console.error('Pace zones parse error:', parseError);
      return calculateStaticPaceZones(data.raceType, data.targetTime);
    }
  } catch (fetchError) {
    console.error('Pace zones fetch error:', fetchError);
    return calculateStaticPaceZones(data.raceType, data.targetTime);
  }
}
async function generateAIProgression(data: OnboardingData, analysis: any, totalWeeks: number): Promise<any> {
  console.log('📈 STARTING AI PROGRESSION');
  
  const prompt = `Create a ${totalWeeks}-week training progression for this runner:

PROFILE:
- Goal: ${data.raceType} in ${data.targetTime}
- Fitness: ${analysis.fitnessLevel}
- Training Days: ${data.trainingDaysPerWeek}/week
- Focus Areas: ${analysis.focusAreas?.join(', ')}
- Injury Risk: ${analysis.injuryRisk}
- Other Activities: ${data.otherWorkouts.join(', ')}

Create a progressive ${totalWeeks}-week plan with weekly mileage and session types.
Consider: base building → build phase → peak phase → taper

CRITICAL SAFETY REQUIREMENTS:
- BEGINNERS: Start Week 1 with 1-2 mile easy runs, max 10 miles/16km total, use run/walk intervals
- INTERMEDIATE: Start Week 1 with max 20 miles/32km total
- ADVANCED: Start Week 1 with max 30 miles/48km total
- PROGRESSION LIMITS: Never exceed 10% weekly increase for beginners, 15% intermediate, 20% advanced
- VOLUME CAPS: Half Marathon training should not exceed 25km/week (beginners), 38km/week (intermediate), 53km/week (advanced)
- Focus on time on feet rather than pace for beginners
- Include cutback weeks every 3-4 weeks with 20-25% volume reduction

Respond with JSON only:
{
  "totalWeeks": ${totalWeeks},
  "weeks": [
    {
      "week": 1,
      "phase": "base",
      "totalMiles": 20,
      "easyMiles": 12,
      "tempoMiles": 4,
      "intervalMiles": 2,
      "longMiles": 8,
      "focus": "aerobic base"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    console.log('📡 Progression response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Progression API Error:', response.status, errorText);
      throw new Error(`AI progression failed: ${response.status}`);
    }

    const result = await response.json();
    const aiText = result.choices[0]?.message?.content || '{}';
    
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const progression = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      
      if (progression && progression.weeks && progression.weeks.length === totalWeeks) {
        return progression;
      }
    } catch (parseError) {
      console.error('Progression parse error:', parseError);
    }
    
    // Fallback to basic progression
    return {
      totalWeeks: totalWeeks,
      weeks: Array.from({ length: totalWeeks }, (_, i) => ({
        week: i + 1,
        phase: i < Math.floor(totalWeeks * 0.33) ? 'base' : 
               i < Math.floor(totalWeeks * 0.67) ? 'build' : 
               i < Math.floor(totalWeeks * 0.83) ? 'peak' : 'taper',
        easyMiles: 4 + i * (8 / totalWeeks),
        tempoMiles: 3 + Math.floor(i * (6 / totalWeeks)),
        intervalMiles: 2 + Math.floor(i * (4 / totalWeeks)),
        longMiles: 8 + i * (8 / totalWeeks)
      }))
    };
  } catch (fetchError) {
    console.error('Progression fetch error:', fetchError);
    // Return fallback progression
    return {
      totalWeeks: totalWeeks,
      weeks: Array.from({ length: totalWeeks }, (_, i) => ({
        week: i + 1,
        phase: i < Math.floor(totalWeeks * 0.33) ? 'base' : 
               i < Math.floor(totalWeeks * 0.67) ? 'build' : 
               i < Math.floor(totalWeeks * 0.83) ? 'peak' : 'taper',
        easyMiles: 4 + i * (8 / totalWeeks),
        tempoMiles: 3 + Math.floor(i * (6 / totalWeeks)),
        intervalMiles: 2 + Math.floor(i * (4 / totalWeeks)),
        longMiles: 8 + i * (8 / totalWeeks)
      }))
    };
  }
}

// Apply research-based safety boundaries to AI-generated progression
async function applySafetyBoundariesToProgression(
  aiProgression: any, 
  data: OnboardingData
): Promise<any> {
  if (!aiProgression?.weeks) return aiProgression;

  console.log('🛡️ Applying safety boundaries to AI progression');
  
  const userProfile: UserTrainingProfile = {
    fitnessLevel: (data.fitnessLevel as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
    raceType: (data.raceType as 'Half Marathon') || 'Half Marathon',
    trainingDaysPerWeek: data.trainingDaysPerWeek || 5,
    currentWeeklyDistance: 0, // Will be set dynamically
    weeksInCurrentVolume: 1,
    ...(data.injuryHistory && data.injuryHistory.length > 0 && { injuryHistory: data.injuryHistory })
  };

  const validatedWeeks = [];
  let adjustmentsMade = 0;

  for (let i = 0; i < aiProgression.weeks.length; i++) {
    const week = aiProgression.weeks[i];
    const previousWeek = i === 0 ? null : validatedWeeks[i - 1];
    
    // Calculate current week's total distance in km
    const proposedDistance = (week.easyMiles || 0) + (week.tempoMiles || 0) + 
                           (week.intervalMiles || 0) + (week.longMiles || 0);
    const proposedDistanceKm = proposedDistance * 1.60934; // Convert miles to km
    
    if (previousWeek) {
      const previousDistance = (previousWeek.easyMiles || 0) + (previousWeek.tempoMiles || 0) + 
                              (previousWeek.intervalMiles || 0) + (previousWeek.longMiles || 0);
      const previousDistanceKm = previousDistance * 1.60934;
      
      // Update current volume for user profile
      userProfile.currentWeeklyDistance = previousDistanceKm;
      
      // Get recent week distances for ACWR (simplified - using last 4 weeks)
      const recentDistances = validatedWeeks.slice(Math.max(0, i - 4), i).map(w => 
        ((w.easyMiles || 0) + (w.tempoMiles || 0) + (w.intervalMiles || 0) + (w.longMiles || 0)) * 1.60934
      );
      
      // Validate weekly increase
      const validation = ProgressionSafetyValidator.validateWeeklyIncrease(
        previousDistanceKm,
        proposedDistanceKm,
        userProfile,
        recentDistances
      );
      
      if (!validation.isValid) {
        console.log(`⚠️ Week ${week.week}: AI suggested ${proposedDistanceKm.toFixed(1)}km, adjusted to ${validation.adjustedDistance}km - ${validation.reasoning}`);
        
        // Apply the adjustment proportionally across session types
        const adjustmentRatio = validation.adjustedDistance / proposedDistanceKm;
        const adjustedWeek = {
          ...week,
          easyMiles: Math.round((week.easyMiles || 0) * adjustmentRatio),
          tempoMiles: Math.round((week.tempoMiles || 0) * adjustmentRatio), 
          intervalMiles: Math.round((week.intervalMiles || 0) * adjustmentRatio),
          longMiles: Math.round((week.longMiles || 0) * adjustmentRatio),
          safetyAdjusted: true,
          safetyReason: validation.reasoning,
          originalDistance: proposedDistanceKm,
          adjustedDistance: validation.adjustedDistance
        };
        
        validatedWeeks.push(adjustedWeek);
        adjustmentsMade++;
      } else {
        validatedWeeks.push({
          ...week, 
          safetyValidated: true,
          warningLevel: validation.warningLevel
        });
      }
    } else {
      // First week - validate against beginner starting recommendations
      const maxFirstWeek = userProfile.fitnessLevel === 'beginner' ? 16 : // 10 miles = 16km
                          userProfile.fitnessLevel === 'intermediate' ? 32 : 48; // 20-30 miles
      
      if (proposedDistanceKm > maxFirstWeek) {
        console.log(`⚠️ Week 1: AI suggested ${proposedDistanceKm.toFixed(1)}km, adjusted to ${maxFirstWeek}km for ${userProfile.fitnessLevel} runner`);
        const adjustmentRatio = maxFirstWeek / proposedDistanceKm;
        validatedWeeks.push({
          ...week,
          easyMiles: Math.round((week.easyMiles || 0) * adjustmentRatio),
          tempoMiles: Math.round((week.tempoMiles || 0) * adjustmentRatio),
          intervalMiles: Math.round((week.intervalMiles || 0) * adjustmentRatio),
          longMiles: Math.round((week.longMiles || 0) * adjustmentRatio),
          safetyAdjusted: true,
          safetyReason: `Starting volume reduced for ${userProfile.fitnessLevel} runner safety`
        });
        adjustmentsMade++;
      } else {
        validatedWeeks.push({...week, safetyValidated: true});
      }
    }
  }

  console.log(`🛡️ Safety validation complete: ${adjustmentsMade} weeks adjusted out of ${aiProgression.weeks.length}`);
  
  return {
    ...aiProgression,
    weeks: validatedWeeks,
    safetyValidation: {
      adjustmentsMade,
      totalWeeks: aiProgression.weeks.length,
      appliedAt: new Date().toISOString()
    }
  };
}

async function generateAIWeekSessions(
  userId: string,
  week: number,
  data: OnboardingData,
  paceZones: any,
  weekPlan: any,
  aiAnalysis: any
): Promise<GeneratedSessionCreate[]> {
  const sessions: GeneratedSessionCreate[] = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Parse club schedule
  const clubDays = parseClubSchedule(data.clubSchedule);
  
  let runningSessions = 0;
  const maxRunningSessions = Math.min(data.trainingDaysPerWeek, 6); // Allow up to 6 running sessions
  
  for (const day of days) {
    // 1. Running club sessions (fixed)
    const clubSession = clubDays.find(club => club.day === day);
    if (clubSession && data.keepClubRuns && runningSessions < maxRunningSessions) {
      const sessionType = getAIRunningSessionType(runningSessions, day, weekPlan, aiAnalysis);
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'RUNNING',
        sessionSubType: sessionType,
        distance: getAIDistanceForType(sessionType, weekPlan),
        pace: getPaceForType(sessionType, paceZones),
        duration: null,
        scheduledTime: clubSession.time,
        isRunningClub: true,
        isMoveable: false,
        warmup: await getWarmup(sessionType),
        mainSet: getMainSet(sessionType, weekPlan, true, data.runningClub),
        cooldown: await getCooldown(sessionType),
        targetRPE: getTargetRPE(sessionType),
        aiModified: false,
        originalData: null,
        aiReason: `AI-optimized ${sessionType} session for ${aiAnalysis.fitnessLevel} runner`,
        planVersion: "1.0"
      });
      runningSessions++;
    }
    
    // 2. Gym sessions (if requested)
    if (data.otherWorkouts.includes('gym') && shouldAddGym(day, data.gymDaysPerWeek || 0)) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'GYM',
        sessionSubType: getGymType(day),
        distance: null,
        pace: null,
        duration: '60 min',
        scheduledTime: getPreferredTime(data.timePreferences, 'gym'),
        isRunningClub: false,
        isMoveable: true,
        warmup: null,
        mainSet: `${getGymType(day)} training session`,
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }
    
    // 3. Additional running sessions
    console.log(`📅 ${day}: clubSession=${!!clubSession}, runningSessions=${runningSessions}, maxRunningSessions=${maxRunningSessions}, shouldAddRunning=${shouldAddRunning(day, data)}`);
    if (!clubSession && runningSessions < maxRunningSessions && shouldAddRunning(day, data)) {
      const sessionType = getAIRunningSessionType(runningSessions, day, weekPlan, aiAnalysis);
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'RUNNING',
        sessionSubType: sessionType,
        distance: getAIDistanceForType(sessionType, weekPlan),
        pace: getPaceForType(sessionType, paceZones),
        duration: null,
        scheduledTime: getPreferredTime(data.timePreferences, 'running'),
        isRunningClub: false,
        isMoveable: true,
        warmup: await getWarmup(sessionType),
        mainSet: getMainSet(sessionType, weekPlan, false),
        cooldown: await getCooldown(sessionType),
        targetRPE: getTargetRPE(sessionType),
        aiModified: false,
        originalData: null,
        aiReason: `AI-customized ${sessionType} session based on ${aiAnalysis.approach}`,
        planVersion: "1.0"
      });
      runningSessions++;
    }
    
    // 4. Cross training - Yoga
    if (data.otherWorkouts.includes('yoga') && shouldAddYoga(day, week)) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'CROSS_TRAINING',
        sessionSubType: 'yoga',
        distance: null,
        pace: null,
        duration: '60 min',
        scheduledTime: getPreferredTime(data.timePreferences, 'yoga'),
        isRunningClub: false,
        isMoveable: true,
        warmup: null,
        mainSet: 'Yoga session - flexibility and recovery focus',
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }

    // 5. Cross training - Swimming
    if (data.otherWorkouts.includes('swimming') && shouldAddSwimming(day, week)) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'CROSS_TRAINING',
        sessionSubType: 'swimming',
        distance: null,
        pace: null,
        duration: '45 min',
        scheduledTime: getPreferredTime(data.timePreferences, 'swimming'),
        isRunningClub: false,
        isMoveable: true,
        warmup: null,
        mainSet: 'Swimming session - aerobic cross-training and recovery',
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }
    
    // 6. Rest days  
    const restDays = (data as any).restDayPrefs || ['sunday'];
    if (sessions.filter(s => s.dayOfWeek === day).length === 0 || restDays.includes(day.toLowerCase())) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'REST',
        sessionSubType: 'recovery',
        distance: null,
        pace: null,
        duration: null,
        scheduledTime: null,
        isRunningClub: false,
        isMoveable: false,
        warmup: null,
        mainSet: 'Rest day - recovery and stretching',
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }
  }
  
  return sessions;
}

// 🔧 STATIC FALLBACK FUNCTIONS (when AI fails)

async function generateStaticTrainingPlan(userId: string, data: OnboardingData): Promise<GeneratedSessionCreate[]> {
  const sessions: GeneratedSessionCreate[] = [];
  
  // Calculate pace zones
  const paceZones = calculateStaticPaceZones(data.raceType, data.targetTime);
  
  // Generate dynamic weeks based on race date
  const totalWeeks = calculateTrainingWeeks(data.raceDate);
  console.log(`📊 Static plan will be ${totalWeeks} weeks long`);
  
  for (let week = 1; week <= totalWeeks; week++) {
    const weekSessions = await generateStaticWeekSessions(userId, week, data, paceZones);
    sessions.push(...weekSessions);
  }
  
  return sessions;
}

async function generateStaticWeekSessions(
  userId: string, 
  week: number, 
  data: OnboardingData, 
  paceZones: any
): Promise<GeneratedSessionCreate[]> {
  const sessions: GeneratedSessionCreate[] = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Get weekly distances based on race type and week
  const weekPlan = getStaticWeeklyDistances(data.raceType, week);
  
  // Parse club schedule
  const clubDays = parseClubSchedule(data.clubSchedule);
  
  let runningSessions = 0;
  const maxRunningSessions = Math.min(data.trainingDaysPerWeek, 6); // Allow up to 6 running sessions
  
  for (const day of days) {
    // 1. Running club sessions (fixed)
    const clubSession = clubDays.find(club => club.day === day);
    if (clubSession && data.keepClubRuns && runningSessions < maxRunningSessions) {
      const sessionType = getRunningSessionType(runningSessions, day);
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'RUNNING',
        sessionSubType: sessionType,
        distance: getDistanceForType(sessionType, weekPlan),
        pace: getPaceForType(sessionType, paceZones),
        duration: null,
        scheduledTime: clubSession.time,
        isRunningClub: true,
        isMoveable: false,
        warmup: await getWarmup(sessionType),
        mainSet: getMainSet(sessionType, weekPlan, true, data.runningClub),
        cooldown: await getCooldown(sessionType),
        targetRPE: getTargetRPE(sessionType),
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
      runningSessions++;
    }
    
    // 2. Gym sessions (if requested)
    if (data.otherWorkouts.includes('gym') && shouldAddGym(day, data.gymDaysPerWeek || 0)) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'GYM',
        sessionSubType: getGymType(day),
        distance: null,
        pace: null,
        duration: '60 min',
        scheduledTime: getPreferredTime(data.timePreferences, 'gym'),
        isRunningClub: false,
        isMoveable: true,
        warmup: null,
        mainSet: `${getGymType(day)} training session`,
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }
    
    // 3. Additional running sessions
    if (!clubSession && runningSessions < maxRunningSessions && shouldAddRunning(day, data)) {
      const sessionType = getRunningSessionType(runningSessions, day);
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'RUNNING',
        sessionSubType: sessionType,
        distance: getDistanceForType(sessionType, weekPlan),
        pace: getPaceForType(sessionType, paceZones),
        duration: null,
        scheduledTime: getPreferredTime(data.timePreferences, 'running'),
        isRunningClub: false,
        isMoveable: true,
        warmup: await getWarmup(sessionType),
        mainSet: getMainSet(sessionType, weekPlan, false),
        cooldown: await getCooldown(sessionType),
        targetRPE: getTargetRPE(sessionType),
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
      runningSessions++;
    }

    // 4. Cross training - Yoga
    if (data.otherWorkouts.includes('yoga') && shouldAddYoga(day, week)) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'CROSS_TRAINING',
        sessionSubType: 'yoga',
        distance: null,
        pace: null,
        duration: '60 min',
        scheduledTime: getPreferredTime(data.timePreferences, 'yoga'),
        isRunningClub: false,
        isMoveable: true,
        warmup: null,
        mainSet: 'Yoga session - flexibility and recovery focus',
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }

    // 5. Cross training - Swimming
    if (data.otherWorkouts.includes('swimming') && shouldAddSwimming(day, week)) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'CROSS_TRAINING',
        sessionSubType: 'swimming',
        distance: null,
        pace: null,
        duration: '45 min',
        scheduledTime: getPreferredTime(data.timePreferences, 'swimming'),
        isRunningClub: false,
        isMoveable: true,
        warmup: null,
        mainSet: 'Swimming session - aerobic cross-training and recovery',
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }

    // 6. Rest days  
    const restDays = (data as any).restDayPrefs || ['sunday'];
    if (sessions.filter(s => s.dayOfWeek === day).length === 0 || restDays.includes(day.toLowerCase())) {
      sessions.push({
        userId,
        week,
        dayOfWeek: day,
        sessionType: 'REST',
        sessionSubType: 'recovery',
        distance: null,
        pace: null,
        duration: null,
        scheduledTime: null,
        isRunningClub: false,
        isMoveable: false,
        warmup: null,
        mainSet: 'Rest and recovery day',
        cooldown: null,
        targetRPE: null,
        aiModified: false,
        originalData: null,
        aiReason: null,
        planVersion: "1.0"
      });
    }
  }
  
  return sessions;
}

// 🔧 HELPER FUNCTIONS

function calculateStaticPaceZones(raceType: string, targetTime: string) {
  let targetPaceSeconds = 360; // Default 6:00/km
  
  if (targetTime !== "FINISH") {
    const timeSeconds = timeStringToSeconds(targetTime);
    switch (raceType) {
      case 'FIVE_K':
        targetPaceSeconds = timeSeconds / 5;
        break;
      case 'TEN_K':
        targetPaceSeconds = timeSeconds / 10;
        break;
      case 'HALF_MARATHON':
        targetPaceSeconds = timeSeconds / 21.1;
        break;
      case 'FULL_MARATHON':
        targetPaceSeconds = timeSeconds / 42.2;
        break;
    }
  }
  
  return {
    target: secondsToPace(targetPaceSeconds),
    easy: secondsToPace(Math.floor(targetPaceSeconds * 1.2)),
    tempo: secondsToPace(Math.floor(targetPaceSeconds * 0.95)),
    interval: secondsToPace(Math.floor(targetPaceSeconds * 0.85)),
    recovery: secondsToPace(Math.floor(targetPaceSeconds * 1.3))
  };
}

function getStaticWeeklyDistances(raceType: string, week: number) {
  const baseDistances = {
    1: { easy: 4, tempo: 4, interval: 3, long: 8 },
    2: { easy: 5, tempo: 5, interval: 4, long: 10 },
    3: { easy: 6, tempo: 6, interval: 5, long: 12 },
    4: { easy: 4, tempo: 4, interval: 4, long: 8 },
    5: { easy: 6, tempo: 7, interval: 6, long: 14 },
    6: { easy: 7, tempo: 8, interval: 7, long: 16 },
    7: { easy: 8, tempo: 9, interval: 8, long: 18 },
    8: { easy: 5, tempo: 6, interval: 6, long: 14 },
    9: { easy: 7, tempo: 8, interval: 8, long: 20 },
    10: { easy: 6, tempo: 7, interval: 7, long: 16 },
    11: { easy: 4, tempo: 5, interval: 5, long: 10 },
    12: { easy: 3, tempo: 3, interval: 3, long: 6 }
  };
  
  const multipliers = {
    'FIVE_K': 0.7,
    'TEN_K': 0.85,
    'HALF_MARATHON': 1.0,
    'FULL_MARATHON': 1.4,
    'CUSTOM': 1.0
  };
  
  const base = baseDistances[week as keyof typeof baseDistances] || baseDistances[1];
  const multiplier = multipliers[raceType as keyof typeof multipliers] || 1.0;
  
  return {
    easy: Math.round(base.easy * multiplier),
    tempo: Math.round(base.tempo * multiplier),
    interval: Math.round(base.interval * multiplier),
    long: Math.round(base.long * multiplier)
  };
}

function parseClubSchedule(clubSchedule: string[]): { day: string; time: string }[] {
  return clubSchedule.map(schedule => {
    const parts = schedule.split(' ');
    const day = parts[0] || '';
    const time = parts.slice(1).join(' ').replace(/[^\d:]/g, '') || '17:00';
    return { day, time };
  });
}

function getAIRunningSessionType(sessionIndex: number, day: string, weekPlan: any, aiAnalysis: any): string {
  // Use AI analysis to determine session type
  if (day === 'Saturday' || day === 'Sunday') return 'long';
  
  // For aggressive training, add more tempo/intervals
  if (aiAnalysis.intensity === 'aggressive') {
    if (day === 'Tuesday' || day === 'Wednesday') return sessionIndex % 2 === 0 ? 'tempo' : 'intervals';
  } else if (aiAnalysis.intensity === 'conservative') {
    // More easy runs for conservative approach
    if (day === 'Wednesday') return 'tempo';
    return 'easy';
  }
  
  // Moderate approach (default)
  if (day === 'Wednesday') return sessionIndex % 2 === 0 ? 'tempo' : 'intervals';
  return 'easy';
}

function getRunningSessionType(sessionIndex: number, day: string): string {
  if (day === 'Saturday' || day === 'Sunday') return 'long';
  if (day === 'Wednesday') return sessionIndex % 2 === 0 ? 'tempo' : 'intervals';
  return 'easy';
}

function getAIDistanceForType(sessionType: string, weekPlan: any): number {
  // Use AI-generated week plan distances
  if (weekPlan && weekPlan.easyMiles) {
    const kmMultiplier = 1.60934; // Convert miles to km
    switch (sessionType) {
      case 'easy': return Math.round(weekPlan.easyMiles / kmMultiplier);
      case 'tempo': return Math.round(weekPlan.tempoMiles / kmMultiplier);
      case 'intervals': return Math.round(weekPlan.intervalMiles / kmMultiplier);
      case 'long': return Math.round(weekPlan.longMiles / kmMultiplier);
      default: return Math.round(weekPlan.easyMiles / kmMultiplier);
    }
  }
  
  // Beginner-friendly fallback based on session type
  switch (sessionType) {
    case 'easy': return 2; // Start with 2km for beginners
    case 'tempo': return 1.5; // Short tempo intervals for beginners
    case 'intervals': return 1; // Very short intervals for beginners
    case 'long': return 3; // Modest long run for beginners
    default: return 2;
  }
}

function getDistanceForType(sessionType: string, weekPlan: any): number {
  switch (sessionType) {
    case 'easy': return weekPlan.easy;
    case 'tempo': return weekPlan.tempo;
    case 'intervals': return weekPlan.interval;
    case 'long': return weekPlan.long;
    default: return weekPlan.easy;
  }
}

function getPaceForType(sessionType: string, paceZones: any): string {
  switch (sessionType) {
    case 'easy': return paceZones.easy;
    case 'tempo': return paceZones.tempo;
    case 'intervals': return paceZones.interval;
    case 'long': return paceZones.easy;
    default: return paceZones.easy;
  }
}

async function getWarmup(sessionType: string, userProfile?: any): Promise<string> {
  // For now, use improved fallback logic
  // TODO: Integrate full AI generation with user profile data
  switch (sessionType) {
    case 'easy': 
      return '5min dynamic stretching: leg swings, hip circles, ankle rolls';
    case 'long': 
      return '8min preparation: 3min walking + 5min dynamic stretching';
    case 'tempo': 
      return '15min build-up: 10min easy jog + 4x100m strides + dynamic stretching';
    case 'intervals': 
      return '20min activation: 12min easy jog + 6x100m strides + dynamic stretching';
    default: 
      return '10min easy jog + dynamic stretching';
  }
}

function getMainSet(sessionType: string, weekPlan: any, isClub: boolean, clubName?: string): string {
  const clubText = isClub && clubName ? ` with ${clubName}` : isClub ? ' with running club' : '';
  
  // Beginner-friendly distances with run/walk guidance
  const distance = weekPlan?.[sessionType] || getAIDistanceForType(sessionType, null);
  
  switch (sessionType) {
    case 'easy': 
      if (distance <= 2) {
        return `${distance}km run/walk intervals - start with 1 min run, 1 min walk${clubText}`;
      }
      return `${distance}km steady at easy pace${clubText}`;
    case 'tempo': 
      const tempoDistance = Math.round(distance * 0.6);
      if (tempoDistance <= 1.5) {
        return `${tempoDistance}km tempo intervals - 3x 400m at tempo pace with 2min recovery${clubText}`;
      }
      return `${tempoDistance}km tempo at threshold pace${clubText}`;
    case 'intervals': 
      if (distance <= 1.5) {
        return `${distance}km interval training - short repeats at 5K effort${clubText}`;
      }
      return `${distance}km intervals at 5K pace${clubText}`;
    case 'long': 
      if (distance <= 3) {
        return `${distance}km long run - mix of running and walking as needed${clubText}`;
      }
      return `${distance}km progressive long run${clubText}`;
    default: 
      return `${distance}km steady running${clubText}`;
  }
}

async function getCooldown(sessionType: string, userProfile?: any): Promise<string> {
  // For now, use improved fallback logic
  // TODO: Integrate full AI generation with user profile data
  switch (sessionType) {
    case 'easy': 
      return '8min recovery: 3min walk + 5min stretching (calves, quads, hamstrings)';
    case 'long': 
      return '15min comprehensive: 5min walk + 10min full body stretching routine';
    case 'tempo': 
      return '12min recovery: 5min easy jog + 7min stretching focus on legs';
    case 'intervals': 
      return '15min complete recovery: 8min easy jog + 7min comprehensive stretching';
    default: 
      return '8min: 3min walk + 5min stretching';
  }
}

function getTargetRPE(sessionType: string): any {
  const rpeTargets = {
    'easy': { min: 3, max: 5, description: 'Conversational pace', context: 'You should be able to chat comfortably' },
    'tempo': { min: 6, max: 7, description: 'Comfortably hard', context: 'Sustainable effort - challenging but controlled' },
    'intervals': { min: 8, max: 9, description: 'Near maximum effort', context: 'High intensity - should feel very challenging' },
    'long': { min: 4, max: 6, description: 'Progressively harder', context: 'Start easy, build to moderate effort by the end' }
  };
  
  return rpeTargets[sessionType as keyof typeof rpeTargets] || rpeTargets['easy'];
}

function shouldAddGym(day: string, gymDaysPerWeek: number): boolean {
  if (gymDaysPerWeek === 0) return false;
  const gymDays = ['Monday', 'Wednesday', 'Friday'];
  return gymDays.slice(0, gymDaysPerWeek).includes(day);
}

function shouldAddRunning(day: string, data: OnboardingData): boolean {
  // For training days per week, we should add running sessions to reach the target
  // Only exclude Sunday as default rest day, but allow running on all other days
  const restDays = (data as any).restDayPrefs || ['sunday'];
  console.log(`🏃 shouldAddRunning(${day}): restDays=${JSON.stringify(restDays)}, result=${!restDays.includes(day.toLowerCase())}`);
  return !restDays.includes(day.toLowerCase());
}

function shouldAddYoga(day: string, week: number): boolean {
  return ['Tuesday', 'Thursday'].includes(day) && week % 2 === 0;
}

function shouldAddSwimming(day: string, week: number): boolean {
  // Add swimming on weekends, preferring Saturday then Sunday
  return ['Saturday', 'Sunday'].includes(day);
}

function getGymType(day: string): string {
  const schedule: { [key: string]: string } = {
    'Monday': 'push',
    'Wednesday': 'legs', 
    'Friday': 'pull'
  };
  return schedule[day] || 'push';
}

function getPreferredTime(timePreferences: string[], activityType: string): string {
  if (timePreferences.includes('early_morning')) return '06:00';
  if (timePreferences.includes('evening')) return '18:00';
  
  const defaults: { [key: string]: string } = {
    'gym': '07:00',
    'running': '17:00',
    'yoga': '19:00'
  };
  
  return defaults[activityType] || '17:00';
}

function timeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0');
  } else if (parts.length === 3) {
    return parseInt(parts[0] || '0') * 3600 + parseInt(parts[1] || '0') * 60 + parseInt(parts[2] || '0');
  }
  return 0;
}

function secondsToPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}