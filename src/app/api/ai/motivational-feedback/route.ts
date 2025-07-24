// 🆕 NEW: Create this file: src/app/api/ai/motivational-feedback/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      sessionData,
      feedbackData,
      currentWeek,
      goalTime,
      userId,
      completionPercentage
    } = await req.json();

    console.log('🤖 Generating motivational AI feedback for user:', userId);

    // Build comprehensive session context for the AI
    const sessionContext = {
      sessionType: sessionData.type,
      plannedDistance: sessionData.plannedDistance,
      actualPace: sessionData.actualPace || sessionData.plannedPace,
      plannedPace: sessionData.plannedPace,
      rpe: feedbackData.rpe,
      difficulty: feedbackData.difficulty,
      feeling: feedbackData.feeling,
      completed: feedbackData.completed,
      comments: feedbackData.comments,
      currentWeek,
      goalTime,
      weekProgress: completionPercentage
    };

    // Create AI prompt for motivational coaching
    const aiPrompt = `You are an expert running coach providing motivational feedback after a training session. 

SESSION DETAILS:
- Session Type: ${sessionContext.sessionType} run
- Distance: ${sessionContext.plannedDistance}km
- Target Pace: ${sessionContext.plannedPace}/km
- Actual Pace: ${sessionContext.actualPace}/km
- RPE (1-10): ${sessionContext.rpe}
- Difficulty (1-10): ${sessionContext.difficulty}
- How it felt: ${sessionContext.feeling}
- Completed: ${sessionContext.completed}
- Comments: ${sessionContext.comments || 'None'}

TRAINING CONTEXT:
- Current Week: ${sessionContext.currentWeek} of 12
- Goal: ${sessionContext.goalTime} half marathon
- Week Progress: ${sessionContext.weekProgress}% complete
- Race Date: October 12, 2025 (Manchester Half Marathon)

COACHING GUIDELINES:
1. Always be positive and encouraging, regardless of performance
2. Acknowledge their effort and consistency
3. Connect this session to their half marathon goal
4. If performance was good (RPE 4-7, completed): celebrate progress
5. If performance was tough (RPE 8+): emphasize that challenging sessions build strength
6. If performance was easy (RPE 1-3): note good recovery or base building
7. Mention specific aspects like pacing, endurance, or mental toughness
8. Keep it concise (2-3 sentences max)
9. Use encouraging emojis sparingly
10. Reference their goal time and race date when relevant

Provide motivational feedback that makes them feel supported and confident about their training progress.`;

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
            content: 'You are an expert running coach providing personalized, motivational feedback to half marathon trainees. Always be encouraging and connect training sessions to race goals.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API failed: ${response.status}`);
    }

    const data = await response.json();
    const motivationalFeedback = data.choices[0]?.message?.content || '';

    console.log('✅ Generated motivational feedback:', motivationalFeedback.substring(0, 100) + '...');

    return NextResponse.json({
      motivationalFeedback,
      success: true
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Motivational feedback API error:', errorMessage);

    // Return fallback motivational message
    const fallbackMessages = [
      "Excellent work completing your training session! Every run brings you closer to your Manchester Half Marathon goal. Your consistency is building the endurance you'll need on race day.",
      "Great job staying committed to your training plan! This session adds to your growing fitness base. Keep up the momentum toward your goal time!",
      "Well done on another quality training session! Your dedication to the process is exactly what will carry you to success in October. Trust the training!",
      "Strong effort today! Each session is an investment in your race day performance. You're building both physical and mental strength with every run.",
      "Fantastic consistency! Your training discipline is paying dividends. Every step forward is progress toward achieving your half marathon goals."
    ];

    const randomFallback = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

    return NextResponse.json({
      motivationalFeedback: randomFallback,
      success: true,
      fallback: true
    });
  }
}