// src/app/api/ai/rebalance-schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface SessionMoveRequest {
  sessionId: string;
  sessionType: string;
  sessionSubType: string;
  fromDay: string;
  toDay: string;
  distance?: number;
  currentWeek: number;
  goalTime: string;
  weeklySchedule: any;
}

interface AIRebalanceResponse {
  analysis: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  recommendations: string[];
  futureAdjustments: Array<{
    week: number;
    day: string;
    sessionId?: string;
    adjustment: {
      type: 'pace' | 'distance' | 'move' | 'intensity';
      value: string | number;
      reason: string;
    };
  }>;
  trainingLoadImpact: {
    currentWeek: number;
    nextWeek: number;
    recoveryRisk: 'low' | 'medium' | 'high';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SessionMoveRequest = await request.json();
    const { sessionType, sessionSubType, fromDay, toDay, distance, currentWeek, goalTime, weeklySchedule } = body;

    // Build AI prompt for schedule rebalancing analysis
    const aiPrompt = `
As an expert running coach, analyze this training schedule change and provide intelligent recommendations.

CONTEXT:
- Runner's goal: Half marathon in ${goalTime}
- Current training week: ${currentWeek} of 12
- Session moved: ${sessionSubType} run (${distance}km) from ${fromDay} to ${toDay}

CURRENT WEEKLY SCHEDULE:
${Object.entries(weeklySchedule).map(([day, sessions]) => {
  const sessionList = Array.isArray(sessions) ? sessions : [];
  return `${day}: ${sessionList.map((s: any) => s.type === 'running' ? `${s.subType} ${s.distance}km` : `${s.type} ${s.subType}`).join(', ')}`;
}).join('\n')}

ANALYSIS REQUIRED:
1. Impact on recovery patterns between hard/easy sessions
2. Training stimulus distribution across the week
3. Risk of overreaching or under-recovery
4. Optimal adjustments for future weeks (weeks ${currentWeek + 1}-12)
5. Specific pace/distance modifications needed

TRAINING PRINCIPLES TO CONSIDER:
- Hard sessions should have 48+ hours recovery between them
- Long runs are best preceded by rest or easy days
- Tempo/interval sessions need adequate recovery
- Weekly training load should progress logically

Respond in this exact JSON format (no other text):
{
  "analysis": "Detailed analysis of the schedule change",
  "impact": "positive|negative|neutral",
  "confidence": 0.85,
  "recommendations": ["specific actionable recommendations"],
  "futureAdjustments": [
    {
      "week": ${currentWeek + 1},
      "day": "tuesday",
      "adjustment": {
        "type": "pace",
        "value": "5:25",
        "reason": "Compensate for reduced recovery"
      }
    }
  ],
  "trainingLoadImpact": {
    "currentWeek": 8,
    "nextWeek": 7,
    "recoveryRisk": "medium"
  }
}`;

    // Call Perplexity AI (using your existing setup)
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
            content: 'You are an expert running coach with deep knowledge of half marathon training periodization, recovery patterns, and training load management. Provide precise, actionable coaching advice.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Perplexity AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    let analysis: AIRebalanceResponse;
    
    try {
      // Parse AI response
      analysis = JSON.parse(aiResult.choices[0].message.content);
    } catch (parseError) {
      // Fallback to rule-based analysis
      analysis = generateRuleBasedAnalysis(body);
    }

    // Validate and enhance the response
    analysis = validateAnalysis(analysis, body);

    return NextResponse.json({
      success: true,
      analysis,
      appliedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AI Rebalance Error:', error);
    
    // Fallback to rule-based analysis
    const fallbackAnalysis = generateRuleBasedAnalysis(await request.json());
    
    return NextResponse.json({
      success: true,
      analysis: fallbackAnalysis,
      fallbackMode: true,
      appliedAt: new Date().toISOString(),
    });
  }
}

function generateRuleBasedAnalysis(sessionMove: SessionMoveRequest): AIRebalanceResponse {
  const { sessionSubType, fromDay, toDay, currentWeek } = sessionMove;
  
  const dayIndices = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
    'Friday': 4, 'Saturday': 5, 'Sunday': 6
  };
  
  const fromIndex = dayIndices[fromDay as keyof typeof dayIndices] || 0;
  const toIndex = dayIndices[toDay as keyof typeof dayIndices] || 0;
  const dayShift = toIndex - fromIndex;

  let analysis = '';
  let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
  let confidence = 0.75;
  let recommendations: string[] = [];
  let futureAdjustments: any[] = [];
  let recoveryRisk: 'low' | 'medium' | 'high' = 'low';

  // Long run analysis
  if (sessionSubType === 'long') {
    if (fromDay === 'Saturday' && toDay === 'Sunday') {
      analysis = 'Excellent change! Moving long run to Sunday provides better recovery after Saturday\'s gym session and aligns with classic training patterns.';
      impact = 'positive';
      confidence = 0.9;
      recommendations = [
        'Perfect timing for recovery optimization',
        'Consider keeping this pattern for remaining weeks',
        'Next week: Move Wednesday tempo slightly easier for better distribution'
      ];
      futureAdjustments = [
        {
          week: currentWeek + 1,
          day: 'Wednesday',
          adjustment: {
            type: 'pace',
            value: '5:30',
            reason: 'Slightly easier tempo to optimize weekly load distribution'
          }
        }
      ];
    } else if (toDay === 'Monday' || toDay === 'Tuesday') {
      analysis = 'Risky placement! Long runs early in the week create recovery issues for subsequent hard sessions.';
      impact = 'negative';
      confidence = 0.85;
      recoveryRisk = 'high';
      recommendations = [
        'High risk of compromised training quality mid-week',
        'Strong recommendation: Move to weekend instead',
        'If unchanged: Reduce intensity of following sessions by 10-15 seconds/km'
      ];
      futureAdjustments = [
        {
          week: currentWeek,
          day: 'Wednesday',
          adjustment: {
            type: 'pace',
            value: '5:35',
            reason: 'Reduce tempo intensity due to inadequate recovery from early week long run'
          }
        }
      ];
    }
  }
  
  // Tempo run analysis
  else if (sessionSubType === 'tempo') {
    if (Math.abs(dayShift) >= 3) {
      analysis = `Tempo session moved ${Math.abs(dayShift)} days - significant schedule disruption but manageable with adjustments.`;
      impact = 'neutral';
      recommendations = [
        'Monitor RPE carefully for next few sessions',
        'Adjust following week\'s tempo based on recovery response',
        'Consider slight pace reduction if moving closer to other hard sessions'
      ];
      
      if (toDay === 'Saturday' || toDay === 'Sunday') {
        recoveryRisk = 'medium';
        futureAdjustments = [
          {
            week: currentWeek + 1,
            day: 'Tuesday',
            adjustment: {
              type: 'pace',
              value: '5:25',
              reason: 'Slight pace reduction following weekend tempo disruption'
            }
          }
        ];
      }
    }
  }

  return {
    analysis: analysis || `${sessionSubType} session moved from ${fromDay} to ${toDay} - reviewing training flow.`,
    impact,
    confidence,
    recommendations: recommendations.length ? recommendations : [
      'Schedule change appears neutral - monitor training response',
      'Maintain focus on consistent pacing and effort levels',
      'Adjust future sessions if recovery becomes compromised'
    ],
    futureAdjustments,
    trainingLoadImpact: {
      currentWeek: Math.max(1, 10 - Math.abs(dayShift)),
      nextWeek: recoveryRisk === 'high' ? 6 : recoveryRisk === 'medium' ? 8 : 9,
      recoveryRisk
    }
  };
}

function validateAnalysis(analysis: AIRebalanceResponse, sessionMove: SessionMoveRequest): AIRebalanceResponse {
  // Ensure confidence is within bounds
  analysis.confidence = Math.max(0.6, Math.min(0.95, analysis.confidence));
  
  // Validate impact
  if (!['positive', 'negative', 'neutral'].includes(analysis.impact)) {
    analysis.impact = 'neutral';
  }
  
  // Ensure recommendations exist
  if (!analysis.recommendations || analysis.recommendations.length === 0) {
    analysis.recommendations = [
      'Monitor your body\'s response to this schedule change',
      'Maintain consistent effort levels across sessions',
      'Be prepared to adjust if recovery becomes compromised'
    ];
  }
  
  // Validate future adjustments
  if (!analysis.futureAdjustments) {
    analysis.futureAdjustments = [];
  }
  
  // Ensure training load impact exists
  if (!analysis.trainingLoadImpact) {
    analysis.trainingLoadImpact = {
      currentWeek: 8,
      nextWeek: 8,
      recoveryRisk: 'low'
    };
  }
  
  // Filter future adjustments to valid weeks
  analysis.futureAdjustments = analysis.futureAdjustments.filter(adj => 
    adj.week && adj.week > sessionMove.currentWeek && adj.week <= 12
  );
  
  return analysis;
}