// 🆕 NEW: Create this file: src/app/api/ai/proactive-week-analysis/route.ts
// Complete fresh start - no complex helper functions, just working code

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      completedWeek,
      upcomingWeek,
      weekFeedback,
      weekMetrics,
      fitnessTrajectory,
      goalTime,
      userId,
      currentPhase,
      weeksRemaining
    } = await req.json();

    console.log(`🧠 Proactive analysis: Week ${completedWeek} → Week ${upcomingWeek} for user: ${userId}`);

    // Simple performance assessment
    const completionRate = weekMetrics?.completionRate || 0;
    const averageRPE = weekMetrics?.averageRPE || 5;
    
    let performanceLevel = 'solid_progress';
    if (completionRate >= 0.9 && averageRPE <= 6) {
      performanceLevel = 'ahead_of_schedule';
    } else if (completionRate < 0.6 || averageRPE >= 8) {
      performanceLevel = 'behind_pace';
    }

    // Create AI prompt
    const aiPrompt = `You are an expert half marathon coach analyzing Week ${completedWeek} performance.

WEEK ${completedWeek} SUMMARY:
- Completion Rate: ${Math.round(completionRate * 100)}%
- Average RPE: ${averageRPE}/10
- Goal: ${goalTime} half marathon
- Weeks Remaining: ${weeksRemaining}
- Current Phase: ${currentPhase}

Provide encouraging analysis and specific recommendations for Week ${upcomingWeek}. Keep it positive and motivational, focusing on progress toward the goal.`;

    // Call Perplexity AI
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
            content: 'You are an expert half marathon coach. Provide encouraging, specific training advice.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    let aiAnalysis = `Excellent work completing Week ${completedWeek}! Your consistency is building the foundation for race day success. Week ${upcomingWeek} will continue progressing toward your ${goalTime} goal with smart training adaptations.`;

    if (response.ok) {
      const data = await response.json();
      aiAnalysis = data.choices[0]?.message?.content || aiAnalysis;
    }

    // Simple recommendations based on performance
    const recommendations = [
      `Great progress through Week ${completedWeek}! Your dedication is paying off.`,
      `Week ${upcomingWeek} focus: Continue building toward your ${goalTime} goal.`,
      'Maintain consistency - every session contributes to race day fitness.',
      'Listen to your body and adjust effort based on daily energy levels.'
    ];

    if (performanceLevel === 'ahead_of_schedule') {
      recommendations.push('Excellent consistency! Consider slightly more aggressive pacing in quality sessions.');
    } else if (performanceLevel === 'behind_pace') {
      recommendations.push('Focus on completing sessions rather than perfect paces - consistency is key.');
    }

    // Create analysis result
    const weekAnalysis = {
      analysis: aiAnalysis,
      impact: performanceLevel === 'ahead_of_schedule' ? 'positive' : 
              performanceLevel === 'behind_pace' ? 'negative' : 'neutral',
      confidence: 0.8,
      goalImpact: 'helps_sub2' as const,
      recommendations: recommendations,
      crossWeekModifications: [], // Keep empty for now - can add later
      weekTransitionSummary: {
        completedWeekPerformance: performanceLevel,
        upcomingWeekAdjustments: performanceLevel === 'ahead_of_schedule' ? 'increase_intensity' : 
                                 performanceLevel === 'behind_pace' ? 'reduce_load' : 'maintain_progression',
        keyFocusAreas: ['consistency', 'recovery', 'progression']
      }
    };

    console.log(`✅ Week analysis complete for Week ${upcomingWeek}`);

    return NextResponse.json({
      weekAnalysis,
      success: true
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Proactive week analysis API error:', errorMessage);

    // Simple fallback analysis
    const fallbackAnalysis = {
      analysis: "Congratulations on completing another week of training! Your consistency is building the fitness needed for race day success. Keep focusing on completing your sessions and listening to your body.",
      impact: 'positive' as const,
      confidence: 0.75,
      goalImpact: 'helps_sub2' as const,
      recommendations: [
        'Excellent work staying consistent with your training plan!',
        'Continue focusing on appropriate effort levels for each session type.',
        'Prioritize recovery between quality training sessions.',
        'Trust the process - you\'re building toward race day success!'
      ],
      crossWeekModifications: [],
      weekTransitionSummary: {
        completedWeekPerformance: 'solid_progress',
        upcomingWeekAdjustments: 'maintain_progression',
        keyFocusAreas: ['consistency', 'effort_management', 'recovery']
      }
    };

    return NextResponse.json({
      weekAnalysis: fallbackAnalysis,
      success: true,
      fallback: true
    });
  }
}