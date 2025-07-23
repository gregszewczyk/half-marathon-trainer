// Complete /api/ai/auto-adjust/route.ts with pace analysis
import { NextResponse } from 'next/server';

// Helper function to convert pace string to seconds per km
const paceToSeconds = (pace: string): number => {
  const parts = pace.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0] || '0', 10);
  const seconds = parseInt(parts[1] || '0', 10);
  return minutes * 60 + seconds;
};

// Calculate pace difference (negative = faster, positive = slower)
const calculatePaceDifference = (actualPace: string, plannedPace: string): number => {
  const actualSeconds = paceToSeconds(actualPace);
  const plannedSeconds = paceToSeconds(plannedPace);
  return actualSeconds - plannedSeconds;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionData, currentGoalTime, predictedTime, currentWeek } = body;

    // Calculate pace difference for analysis
    const paceDifference = sessionData.actualPace && sessionData.plannedPace 
      ? calculatePaceDifference(sessionData.actualPace, sessionData.plannedPace)
      : 0;

    // Enhanced AI prompt with pace analysis
    const prompt = `
You are an expert running coach analyzing training session feedback with special focus on PACE EXECUTION vs RPE.

SESSION DATA:
- Session Type: ${sessionData.type}
- Planned: ${sessionData.plannedDistance}km at ${sessionData.plannedPace}/km
- Actual: ${sessionData.actualDistance}km at ${sessionData.actualPace}/km
- Pace Difference: ${paceDifference} seconds (negative=faster, positive=slower)
- RPE (1-10): ${sessionData.rpe}
- Difficulty (1-10): ${sessionData.difficulty}
- Feeling: ${sessionData.feeling}
- Completed: ${sessionData.completed}
- Comments: "${sessionData.comments || 'No additional comments'}"

TRAINING CONTEXT:
- Goal Time: ${currentGoalTime}
- Current Week: ${currentWeek}/12
- Predicted Time: ${predictedTime}

PACE vs RPE ANALYSIS RULES:

**WENT TOO FAST (>15 seconds faster than planned):**
- High RPE (≥7): "Pacing discipline issue - went too fast and suffered"
  → Action: Maintain pace zones but emphasize effort-based training
  → Focus: "Teach pace control, not a fitness issue"

- Low RPE (≤5): "Fitness improvement detected!"
  → Action: Consider updating pace zones faster
  → Focus: "Current paces may be too easy"

**GOOD PACING (within ±15 seconds of planned):**
- Use standard RPE/difficulty protocol
- This shows good execution discipline

**WENT TOO SLOW (>15 seconds slower than planned):**
- High RPE (≥7): "Struggling even at reduced pace - need recovery"
  → Action: Reduce training intensity significantly
  → Focus: "Possible fatigue or fitness decline"

- Low RPE (≤5): "Conservative pacing or external factors"
  → Action: Monitor but maintain plan
  → Focus: "Check for environmental factors in comments"

**ENVIRONMENTAL CONTEXT (from comments):**
- Heat/weather: Expect 10-30 seconds slower naturally
- Treadmill: May affect pacing by 5-15 seconds
- New location/equipment: Pacing variations expected
- Life stress: May affect pace control

**PACING EDUCATION TRIGGERS:**
If athlete consistently runs >20 seconds faster than planned:
- Add guidance about effort-based easy running
- Emphasize "conversational pace" over speed targets

**FITNESS PROGRESSION DETECTION:**
If athlete runs significantly faster with low RPE:
- Consider pace zone updates
- May indicate readiness for goal time improvement

RESPOND ONLY with valid JSON in this exact format:
{
  "action": "increase|decrease|maintain|pace_discipline",
  "severity": "minor|moderate|significant",
  "reasoning": "Explain your decision including pace execution analysis",
  "nextSessionChanges": {
    "paceAdjustment": 0,
    "distanceAdjustment": 0,
    "intensityAdjustment": "easier|harder|same|focus_on_effort",
    "sessionsToModify": 1
  },
  "paceGuidance": {
    "needsPacingEducation": false,
    "pacingAdvice": "Specific pacing advice if needed"
  },
  "goalTimeUpdate": {
    "newGoalTime": "${currentGoalTime}",
    "confidence": 0.5,
    "improvement": 0,
    "basedOnPacePattern": false
  },
  "modifications": [
    "Specific description of changes and reasoning"
  ]
}

CRITICAL: Return ONLY the JSON object. No additional text, explanations, or markdown formatting.
`;

    // Call AI API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = await response.json();
    let aiResponseText = data.content[0].text;

    // Clean up response (remove any markdown formatting)
    aiResponseText = aiResponseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse AI response
    const aiResponse = JSON.parse(aiResponseText);

    // Validate response structure
    const adjustment = {
      action: aiResponse.action || 'maintain',
      severity: aiResponse.severity || 'minor',
      reasoning: aiResponse.reasoning || 'AI analysis completed',
      nextSessionChanges: {
        paceAdjustment: aiResponse.nextSessionChanges?.paceAdjustment || 0,
        distanceAdjustment: aiResponse.nextSessionChanges?.distanceAdjustment || 0,
        intensityAdjustment: aiResponse.nextSessionChanges?.intensityAdjustment || 'same',
        sessionsToModify: aiResponse.nextSessionChanges?.sessionsToModify || 1
      },
      paceGuidance: {
        needsPacingEducation: aiResponse.paceGuidance?.needsPacingEducation || false,
        pacingAdvice: aiResponse.paceGuidance?.pacingAdvice || ''
      },
      goalTimeUpdate: aiResponse.goalTimeUpdate || null,
      modifications: aiResponse.modifications || []
    };

    console.log('✅ AI Analysis Complete:', adjustment);

    return NextResponse.json({ 
      success: true, 
      adjustment,
      paceDifference: paceDifference,
      analysisNote: paceDifference > 15 ? 'Ran slower than planned' : 
                   paceDifference < -15 ? 'Ran faster than planned' : 
                   'Good pacing execution'
    });

  } catch (error: unknown) {
    console.error('❌ AI auto-adjustment error:', error);
    
    // Fallback adjustment if AI fails
    const fallbackAdjustment = {
      action: 'maintain' as const,
      severity: 'minor' as const,
      reasoning: 'AI analysis unavailable, maintaining current plan',
      nextSessionChanges: {
        paceAdjustment: 0,
        distanceAdjustment: 0,
        intensityAdjustment: 'same' as const,
        sessionsToModify: 0
      },
      paceGuidance: {
        needsPacingEducation: false,
        pacingAdvice: ''
      },
      goalTimeUpdate: null,
      modifications: ['Maintaining current training plan (AI analysis failed)']
    };

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      adjustment: fallbackAdjustment,
      error: errorMessage
    });
  }
}