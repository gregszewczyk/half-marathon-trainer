// src/app/api/ai/enhanced-rebalance/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface EnhancedRebalanceRequest {
  sessionId: string;
  sessionType: string;
  sessionSubType: string;
  fromDay: string;
  toDay: string;
  distance?: number;
  currentWeek: number;
  goalTime: string;
  weeklySchedule: any;
  // Enhanced context for cross-week decisions
  recentFeedback?: Array<{
    sessionId: string;
    rpe: number;
    difficulty: number;
    completed: string;
    feeling: string;
  }>;
  fitnessTrajectory?: 'ahead' | 'on_track' | 'behind' | 'way_behind';
}

interface CrossWeekModification {
  week: number;
  day: string;
  sessionId?: string;
  modificationType: 'pace_adjustment' | 'session_conversion' | 'intensity_reduction' | 'phase_extension' | 'made_running_skip';
  originalSession?: {
    type: string;
    subType: string;
    distance?: number;
    pace?: string;
  };
  newSession: {
    type: string;
    subType: string;
    distance?: number;
    pace?: string;
    reason: string;
  };
  explanation: string;
}

interface EnhancedAIResponse {
  analysis: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  goalImpact: 'helps_sub2' | 'neutral_sub2' | 'hurts_sub2';
  recommendations: string[];
  crossWeekModifications: CrossWeekModification[];
  alternativeOptions?: Array<{
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    modifications: CrossWeekModification[];
  }>;
  trainingPhaseAdjustment?: {
    currentPhase: string;
    recommendedPhase: string;
    reason: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhancedRebalanceRequest = await request.json();
    const { 
      sessionType, sessionSubType, fromDay, toDay, distance, 
      currentWeek, goalTime, weeklySchedule, recentFeedback, fitnessTrajectory 
    } = body;

    // Build enhanced AI prompt for cross-week intelligence
    const enhancedPrompt = `
You are an expert running coach with one primary goal: Get this athlete to run a sub-2:00 half marathon on October 12, 2025.

ATHLETE CONTEXT:
- Current Week: ${currentWeek}/12 (${12 - currentWeek} weeks remaining)
- Goal: Sub-2:00 half marathon (5:41/km race pace)  
- Current change: Moved ${sessionSubType} run from ${fromDay} to ${toDay}
- Distance: ${distance}km
- Goal time: ${goalTime}
- Fitness trajectory: ${fitnessTrajectory || 'unknown'}

RECENT TRAINING FEEDBACK:
${recentFeedback ? recentFeedback.map(f => 
  `- ${f.sessionId}: RPE ${f.rpe}/10, Difficulty ${f.difficulty}/10, ${f.completed}, feeling ${f.feeling}`
).join('\n') : 'No recent feedback available'}

CURRENT WEEKLY SCHEDULE:
${Object.entries(weeklySchedule).map(([day, sessions]) => {
  const sessionList = Array.isArray(sessions) ? sessions : [];
  return `${day}: ${sessionList.map((s: any) => 
    s.type === 'running' ? `${s.subType} ${s.distance}km` : `${s.type} ${s.subType}`
  ).join(', ')}`;
}).join('\n')}

MANCHESTER-SPECIFIC CONSTRAINTS:
- No hills available (use bridge repeats, car park stairs, or treadmill)
- MadeRunning club sessions: Monday 5PM, Wednesday 5AM, Saturday 9AM
- Can skip/modify MadeRunning if it helps sub-2:00 goal
- Weather backup options needed (indoor alternatives)

CRITICAL ANALYSIS NEEDED:
1. How does this schedule change impact sub-2:00 goal achievement?
2. Should Week ${currentWeek + 1} training be modified as a result?
3. Are there signs this athlete needs phase adjustments (extend base, accelerate build)?
4. Should any MadeRunning sessions be skipped/modified for optimal progression?

PROVIDE 2-3 TRAINING OPTIONS for next week with specific modifications.
Consider session type changes (tempo→fartlek, intervals→progression runs) not just pace adjustments.
Be aggressive if needed - sub-2:00 is more important than following the original plan.

Respond in this exact JSON format:
{
  "analysis": "Detailed analysis of the schedule change and fitness trajectory",
  "impact": "positive|negative|neutral", 
  "confidence": 0.85,
  "goalImpact": "helps_sub2|neutral_sub2|hurts_sub2",
  "recommendations": ["specific actionable recommendations"],
  "crossWeekModifications": [
    {
      "week": ${currentWeek + 1},
      "day": "tuesday",
      "modificationType": "session_conversion",
      "originalSession": {
        "type": "running",
        "subType": "tempo", 
        "distance": 6,
        "pace": "5:13"
      },
      "newSession": {
        "type": "running",
        "subType": "fartlek",
        "distance": 6,
        "pace": "5:30-5:45",
        "reason": "Reduce pressure while maintaining lactate work"
      },
      "explanation": "Converting structured tempo to fartlek reduces psychological pressure"
    }
  ],
  "alternativeOptions": [
    {
      "title": "Conservative Approach",
      "description": "Minor adjustments to maintain current progression",
      "pros": ["Lower injury risk", "Maintains confidence"],
      "cons": ["May not accelerate fitness gains"],
      "modifications": []
    },
    {
      "title": "Aggressive Approach", 
      "description": "Significant changes to accelerate sub-2:00 preparation",
      "pros": ["Faster fitness gains", "Better goal preparation"],
      "cons": ["Higher injury risk", "More demanding"],
      "modifications": []
    }
  ],
  "trainingPhaseAdjustment": {
    "currentPhase": "Base Building",
    "recommendedPhase": "Extended Base", 
    "reason": "Need more aerobic development before build phase"
  }
}
`;

    // Call Perplexity AI with enhanced prompt
    const aiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are an expert running coach with deep knowledge of half marathon training, periodization, and Manchester terrain. Your primary goal is getting athletes to run sub-2:00 half marathons safely. You understand the balance between pushing for performance gains and injury prevention. Provide specific, actionable training modifications.`
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2, // Lower temperature for more consistent coaching advice
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Perplexity AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    let enhancedAnalysis: EnhancedAIResponse;
    
    try {
      // Parse AI response
      const aiContent = aiResult.choices[0].message.content;
      // Clean up any markdown formatting
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      enhancedAnalysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('AI JSON Parse Error:', parseError);
      // Fallback to rule-based enhanced analysis
      enhancedAnalysis = generateEnhancedRuleBasedAnalysis(body);
    }

    // Validate and enhance the response
    enhancedAnalysis = validateEnhancedAnalysis(enhancedAnalysis, body);

    return NextResponse.json({
      success: true,
      enhancedAnalysis,
      appliedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Enhanced AI Rebalance Error:', error);
    
    // Fallback to rule-based analysis
    const fallbackAnalysis = generateEnhancedRuleBasedAnalysis(await request.json());
    
    return NextResponse.json({
      success: true,
      enhancedAnalysis: fallbackAnalysis,
      fallbackMode: true,
      appliedAt: new Date().toISOString(),
    });
  }
}

function generateEnhancedRuleBasedAnalysis(sessionMove: EnhancedRebalanceRequest): EnhancedAIResponse {
  const { sessionSubType, fromDay, toDay, currentWeek, recentFeedback } = sessionMove;
  
  // Assess fitness trajectory from recent feedback
  const avgRPE = recentFeedback && recentFeedback.length > 0
    ? recentFeedback.reduce((sum, f) => sum + f.rpe, 0) / recentFeedback.length
    : 5;
  const avgDifficulty = recentFeedback && recentFeedback.length > 0
    ? recentFeedback.reduce((sum, f) => sum + f.difficulty, 0) / recentFeedback.length
    : 5;
  
  let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
  let goalImpact: 'helps_sub2' | 'neutral_sub2' | 'hurts_sub2' = 'neutral_sub2';
  let analysis = '';
  let crossWeekModifications: CrossWeekModification[] = [];
  let recommendations: string[] = [];

  // Enhanced rule-based logic for cross-week modifications
  if (avgRPE >= 7 && avgDifficulty >= 7) {
    // High stress - need easier next week
    impact = 'negative';
    goalImpact = 'hurts_sub2';
    analysis = 'Recent sessions show high stress. Need to reduce intensity next week to prevent overreaching and maintain sub-2:00 trajectory.';
    
    crossWeekModifications = [
      {
        week: currentWeek + 1,
        day: 'wednesday',
        modificationType: 'session_conversion',
        originalSession: { type: 'running', subType: 'tempo', distance: 6, pace: '5:13' },
        newSession: { 
          type: 'running', 
          subType: 'fartlek', 
          distance: 6, 
          pace: '5:30-5:45',
          reason: 'Reduce structured pressure while maintaining lactate work'
        },
        explanation: 'Converting tempo to fartlek reduces psychological and physical stress'
      }
    ];
    
    recommendations = [
      'Reduce next week\'s intensity by 10-15 seconds per km',
      'Consider skipping Wednesday MadeRunning for recovery focus',
      'Monitor RPE carefully - should feel "comfortably hard" not "very hard"'
    ];
  } 
  else if (avgRPE <= 4 && avgDifficulty <= 4) {
    // Low stress - can push harder
    impact = 'positive';
    goalImpact = 'helps_sub2';
    analysis = 'Recent sessions show good adaptation. Can safely increase intensity next week to accelerate sub-2:00 preparation.';
    
    crossWeekModifications = [
      {
        week: currentWeek + 1,
        day: 'saturday',
        modificationType: 'session_conversion',
        originalSession: { type: 'running', subType: 'long', distance: 10, pace: '6:32' },
        newSession: {
          type: 'running',
          subType: 'long_with_pickup',
          distance: 10,
          pace: '6:32 + 3km @ 5:41',
          reason: 'Add race pace segments to build specific fitness'
        },
        explanation: 'Adding race pace work to long run builds confidence and specific fitness'
      }
    ];
    
    recommendations = [
      'Add race pace segments to long runs',
      'Consider progression runs instead of easy sessions',
      'Maintain current training load - adapting well'
    ];
  }
  
  // Session-specific logic
  if (sessionSubType === 'tempo' && (toDay === 'Friday' || toDay === 'Monday')) {
    impact = 'negative';
    analysis += ' Moving tempo to ' + toDay + ' creates scheduling conflicts with recovery patterns.';
    
    crossWeekModifications.push({
      week: currentWeek + 1,
      day: 'sunday',
      modificationType: 'session_conversion',
      originalSession: { type: 'rest', subType: 'rest' },
      newSession: {
        type: 'running',
        subType: 'easy',
        distance: 5,
        pace: '6:45',
        reason: 'Add recovery run to balance weekly load'
      },
      explanation: 'Adding easy recovery run to rebalance weekly training stress'
    });
  }

  return {
    analysis,
    impact,
    confidence: 0.75,
    goalImpact,
    recommendations,
    crossWeekModifications,
    alternativeOptions: [
      {
        title: 'Conservative Adaptation',
        description: 'Minor adjustments to next week\'s training',
        pros: ['Lower injury risk', 'Maintains current progression'],
        cons: ['May not maximize fitness gains'],
        modifications: crossWeekModifications.slice(0, 1)
      },
      {
        title: 'Aggressive Adaptation',
        description: 'Significant changes to accelerate sub-2:00 preparation',
        pros: ['Faster fitness development', 'Better goal preparation'],
        cons: ['Higher training stress', 'Requires careful monitoring'],
        modifications: crossWeekModifications
      }
    ],
    trainingPhaseAdjustment: {
      currentPhase: currentWeek <= 4 ? 'Base Building' : currentWeek <= 8 ? 'Build Phase' : 'Peak Phase',
      recommendedPhase: avgRPE >= 7 ? 'Extended Base' : avgRPE <= 4 ? 'Accelerated Build' : 'Current Phase',
      reason: avgRPE >= 7 ? 'High RPE suggests need for more base fitness' : avgRPE <= 4 ? 'Good adaptation allows acceleration' : 'Current progression appropriate'
    }
  };
}

function validateEnhancedAnalysis(analysis: EnhancedAIResponse, sessionMove: EnhancedRebalanceRequest): EnhancedAIResponse {
  // Ensure all required fields exist
  analysis.confidence = Math.max(0.6, Math.min(0.95, analysis.confidence || 0.75));
  
  if (!analysis.impact || !['positive', 'negative', 'neutral'].includes(analysis.impact)) {
    analysis.impact = 'neutral';
  }
  
  if (!analysis.goalImpact || !['helps_sub2', 'neutral_sub2', 'hurts_sub2'].includes(analysis.goalImpact)) {
    analysis.goalImpact = 'neutral_sub2';
  }
  
  if (!analysis.recommendations || analysis.recommendations.length === 0) {
    analysis.recommendations = [
      'Monitor your body\'s response to this schedule change',
      'Focus on consistent pacing in upcoming sessions',
      'Prioritize recovery between hard training days'
    ];
  }
  
  if (!analysis.crossWeekModifications) {
    analysis.crossWeekModifications = [];
  }
  
  // Filter modifications to valid future weeks only
  analysis.crossWeekModifications = analysis.crossWeekModifications.filter(mod => 
    mod.week && mod.week > sessionMove.currentWeek && mod.week <= 12
  );
  
  return analysis;
}