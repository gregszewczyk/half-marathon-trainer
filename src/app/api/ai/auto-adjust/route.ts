// // src/app/api/ai/auto-adjust/route.ts

// export async function POST(req: Request) {
//   let sessionData: any = null;
  
//   try {
//     const requestBody = await req.json();
//     sessionData = requestBody.sessionData;
//     const { currentGoalTime, predictedTime, currentWeek, weekData } = requestBody;
    
//     const apiKey = process.env.PERPLEXITY_API_KEY;
//     if (!apiKey) {
//       throw new Error('Perplexity API key not found');
//     }

//     // Enhanced prompt for auto-adjustment
//     const prompt = `You are an AI running coach that automatically adjusts training plans based on session feedback. Analyze this session and provide specific modifications for future sessions.

// CURRENT SESSION FEEDBACK:
// - Session Type: ${sessionData.type} run
// - Planned: ${sessionData.plannedDistance}km at ${sessionData.plannedPace}/km  
// - Actual: ${sessionData.actualDistance}km at ${sessionData.actualPace}/km
// - RPE: ${sessionData.rpe}/10 (1=very easy, 10=maximal effort)
// - Difficulty: ${sessionData.difficulty}/10 (1=very easy, 10=very hard)
// - Feeling: ${sessionData.feeling}
// - Completed: ${sessionData.completed}
// - Comments: ${sessionData.comments}

// CURRENT TRAINING CONTEXT:
// - Goal Time: ${currentGoalTime}
// - Current Predicted Time: ${predictedTime}
// - Training Week: ${currentWeek}/12
// - Phase: ${currentWeek <= 4 ? 'Base Building' : currentWeek <= 8 ? 'Build Phase' : currentWeek <= 10 ? 'Peak Phase' : 'Taper'}

// AUTO-ADJUSTMENT RULES:
// 1. HIGH INTENSITY (RPE/Difficulty ≥8): Make training EASIER
//    - Slow down paces by 10-30 seconds per km
//    - Reduce distances by 0.5-2km  
//    - Add extra recovery if needed
//    - Keep goal time achievable but may need to be more conservative

// 2. LOW INTENSITY (RPE/Difficulty ≤3 AND completed successfully): Make training HARDER
//    - Speed up paces by 5-20 seconds per km
//    - Increase distances by 0.5-1km
//    - Consider updating goal time to be faster
//    - Push athlete toward better performance

// 3. MODERATE INTENSITY (RPE/Difficulty 4-7): Maintain current plan
//    - Minor adjustments only
//    - Stay on track for current goal

// REQUIRED JSON RESPONSE FORMAT:
// {
//   "action": "increase" | "decrease" | "maintain",
//   "severity": "minor" | "moderate" | "significant",
//   "nextSessionChanges": {
//     "paceAdjustment": [number in seconds per km, positive = slower, negative = faster],
//     "distanceAdjustment": [number in km, positive = longer, negative = shorter],
//     "intensityAdjustment": "easier" | "harder" | "same",
//     "sessionsToModify": [number of upcoming sessions to change, 1-5]
//   },
//   "goalTimeUpdate": {
//     "newGoalTime": "[HH:MM:SS format if updating]",
//     "confidence": [0-1, confidence in this goal change],
//     "improvement": [seconds improvement, negative = faster]
//   } | null,
//   "reasoning": "[Brief explanation of why these changes were made]",
//   "modifications": [
//     "[List of specific changes made, e.g., 'Next easy run: +15s/km pace']",
//     "[Another change, e.g., 'Tempo run distance: -1km']"
//   ]
// }

// SAFETY LIMITS:
// - Pace adjustments: Max ±30 seconds per km
// - Distance adjustments: Max ±2km per session
// - Goal time changes: Only if confidence >0.8
// - Sessions to modify: 1-5 sessions max

// Respond ONLY with the JSON object. Be specific and actionable in your adjustments.`;

//     const response = await fetch('https://api.perplexity.ai/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${apiKey}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         model: 'sonar',
//         messages: [{ role: 'user', content: prompt }],
//         max_tokens: 500
//       })
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
//     }

//     const data = await response.json();
//     let responseText = data.choices[0]?.message?.content || '';
    
//     // Clean up response - remove markdown formatting
//     responseText = responseText.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    
//     let adjustment;
//     try {
//       adjustment = JSON.parse(responseText);
//     } catch (parseError) {
//       // Fallback if JSON parsing fails
//       console.error('Failed to parse AI response:', responseText);
//       adjustment = createFallbackAdjustment(sessionData);
//     }

//     // Validate and sanitize the adjustment
//     adjustment = validateAdjustment(adjustment, sessionData);

//     return Response.json({ adjustment });
    
//   } catch (error) {
//     console.error('Auto-adjustment error:', error);
    
//     // Return fallback adjustment on error
//     // Use the sessionData from the try block if available, otherwise create default
//     const fallbackSessionData = sessionData || { rpe: 5, difficulty: 5, completed: 'yes' };
//     const fallback = createFallbackAdjustment(fallbackSessionData);
//     return Response.json({ adjustment: fallback });
//   }
// }

// // Fallback adjustment if AI fails
// function createFallbackAdjustment(sessionData: any) {
//   const isHardSession = (sessionData.rpe >= 8 || sessionData.difficulty >= 8);
//   const isEasySession = (sessionData.rpe <= 3 && sessionData.difficulty <= 3 && sessionData.completed === 'yes');

//   if (isHardSession) {
//     return {
//       action: 'decrease',
//       severity: 'moderate',
//       nextSessionChanges: {
//         paceAdjustment: 15, // 15 seconds slower per km
//         distanceAdjustment: -1, // 1km shorter
//         intensityAdjustment: 'easier',
//         sessionsToModify: 3
//       },
//       goalTimeUpdate: null,
//       reasoning: 'High intensity detected. Making next sessions easier to prevent overtraining.',
//       modifications: [
//         'Next 3 runs: +15s/km pace',
//         'Distances reduced by 1km',
//         'Focus on recovery'
//       ]
//     };
//   } else if (isEasySession) {
//     return {
//       action: 'increase',
//       severity: 'minor',
//       nextSessionChanges: {
//         paceAdjustment: -10, // 10 seconds faster per km
//         distanceAdjustment: 0.5, // 0.5km longer
//         intensityAdjustment: 'harder',
//         sessionsToModify: 2
//       },
//       goalTimeUpdate: {
//         newGoalTime: '1:58:00',
//         confidence: 0.7,
//         improvement: -120 // 2 minutes faster
//       },
//       reasoning: 'Low intensity suggests room for improvement. Increasing challenge.',
//       modifications: [
//         'Next 2 runs: -10s/km pace',
//         'Distances increased by 0.5km',
//         'Goal time updated to 1:58:00'
//       ]
//     };
//   } else {
//     return {
//       action: 'maintain',
//       severity: 'minor',
//       nextSessionChanges: {
//         paceAdjustment: 0,
//         distanceAdjustment: 0,
//         intensityAdjustment: 'same',
//         sessionsToModify: 0
//       },
//       goalTimeUpdate: null,
//       reasoning: 'Session intensity in good range. Maintaining current plan.',
//       modifications: ['No changes needed - training on track']
//     };
//   }
// }

// // Validate and sanitize AI adjustment
// function validateAdjustment(adjustment: any, sessionData: any) {
//   // Ensure required fields exist
//   if (!adjustment.action) adjustment.action = 'maintain';
//   if (!adjustment.severity) adjustment.severity = 'minor';
//   if (!adjustment.nextSessionChanges) adjustment.nextSessionChanges = {};
//   if (!adjustment.reasoning) adjustment.reasoning = 'Auto-adjustment applied';
//   if (!adjustment.modifications) adjustment.modifications = [];

//   // Apply safety limits
//   const changes = adjustment.nextSessionChanges;
//   if (changes.paceAdjustment > 30) changes.paceAdjustment = 30;
//   if (changes.paceAdjustment < -30) changes.paceAdjustment = -30;
//   if (changes.distanceAdjustment > 2) changes.distanceAdjustment = 2;
//   if (changes.distanceAdjustment < -2) changes.distanceAdjustment = -2;
//   if (changes.sessionsToModify > 5) changes.sessionsToModify = 5;
//   if (changes.sessionsToModify < 0) changes.sessionsToModify = 0;

//   // Validate goal time update
//   if (adjustment.goalTimeUpdate && adjustment.goalTimeUpdate.confidence < 0.8) {
//     adjustment.goalTimeUpdate = null;
//   }

//   return adjustment;
// }

// src/app/api/ai/auto-adjust/route.ts

// Fallback adjustment if AI fails
function createFallbackAdjustment(sessionData: any) {
  const isHardSession = (sessionData.rpe >= 8 || sessionData.difficulty >= 8);
  const isEasySession = (sessionData.rpe <= 3 && sessionData.difficulty <= 3 && sessionData.completed === 'yes');

  if (isHardSession) {
    return {
      action: 'decrease',
      severity: 'moderate',
      nextSessionChanges: {
        paceAdjustment: 15, // 15 seconds slower per km
        distanceAdjustment: -1, // 1km shorter
        intensityAdjustment: 'easier',
        sessionsToModify: 3
      },
      goalTimeUpdate: null,
      reasoning: 'High intensity detected. Making next sessions easier to prevent overtraining.',
      modifications: [
        'Next 3 runs: +15s/km pace',
        'Distances reduced by 1km',
        'Focus on recovery'
      ]
    };
  } else if (isEasySession) {
    return {
      action: 'increase',
      severity: 'minor',
      nextSessionChanges: {
        paceAdjustment: -10, // 10 seconds faster per km
        distanceAdjustment: 0.5, // 0.5km longer
        intensityAdjustment: 'harder',
        sessionsToModify: 2
      },
      goalTimeUpdate: {
        newGoalTime: '1:58:00',
        confidence: 0.7,
        improvement: -120 // 2 minutes faster
      },
      reasoning: 'Low intensity suggests room for improvement. Increasing challenge.',
      modifications: [
        'Next 2 runs: -10s/km pace',
        'Distances increased by 0.5km',
        'Goal time updated to 1:58:00'
      ]
    };
  } else {
    return {
      action: 'maintain',
      severity: 'minor',
      nextSessionChanges: {
        paceAdjustment: 0,
        distanceAdjustment: 0,
        intensityAdjustment: 'same',
        sessionsToModify: 0
      },
      goalTimeUpdate: null,
      reasoning: 'Session intensity in good range. Maintaining current plan.',
      modifications: ['No changes needed - training on track']
    };
  }
}

// Validate and sanitize AI adjustment
function validateAdjustment(adjustment: any, sessionData: any) {
  // Ensure required fields exist
  if (!adjustment.action) adjustment.action = 'maintain';
  if (!adjustment.severity) adjustment.severity = 'minor';
  if (!adjustment.nextSessionChanges) adjustment.nextSessionChanges = {};
  if (!adjustment.reasoning) adjustment.reasoning = 'Auto-adjustment applied';
  if (!adjustment.modifications) adjustment.modifications = [];

  // Apply safety limits
  const changes = adjustment.nextSessionChanges;
  if (changes.paceAdjustment > 30) changes.paceAdjustment = 30;
  if (changes.paceAdjustment < -30) changes.paceAdjustment = -30;
  if (changes.distanceAdjustment > 2) changes.distanceAdjustment = 2;
  if (changes.distanceAdjustment < -2) changes.distanceAdjustment = -2;
  if (changes.sessionsToModify > 5) changes.sessionsToModify = 5;
  if (changes.sessionsToModify < 0) changes.sessionsToModify = 0;

  // Validate goal time update
  if (adjustment.goalTimeUpdate && adjustment.goalTimeUpdate.confidence < 0.8) {
    adjustment.goalTimeUpdate = null;
  }

  return adjustment;
}

export async function POST(req: Request) {
  let sessionData: any = null;
  
  try {
    console.log('🤖 AI Auto-adjust API called');
    
    const requestBody = await req.json();
    sessionData = requestBody.sessionData;
    const { currentGoalTime, predictedTime, currentWeek, weekData } = requestBody;
    
    console.log('📊 Session data received:', sessionData);
    
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error('❌ Perplexity API key not found');
      throw new Error('Perplexity API key not found');
    }

    console.log('🔑 API key found, calling Perplexity...');

    // Enhanced prompt for auto-adjustment
    const prompt = `You are an AI running coach that automatically adjusts training plans based on session feedback. Analyze this session and provide specific modifications for future sessions.

CURRENT SESSION FEEDBACK:
- Session Type: ${sessionData.type} run
- Planned: ${sessionData.plannedDistance}km at ${sessionData.plannedPace}/km  
- Actual: ${sessionData.actualDistance}km at ${sessionData.actualPace}/km
- RPE: ${sessionData.rpe}/10 (1=very easy, 10=maximal effort)
- Difficulty: ${sessionData.difficulty}/10 (1=very easy, 10=very hard)
- Feeling: ${sessionData.feeling}
- Completed: ${sessionData.completed}
- Comments: ${sessionData.comments}

CURRENT TRAINING CONTEXT:
- Goal Time: ${currentGoalTime}
- Current Predicted Time: ${predictedTime}
- Training Week: ${currentWeek}/12
- Phase: ${currentWeek <= 4 ? 'Base Building' : currentWeek <= 8 ? 'Build Phase' : currentWeek <= 10 ? 'Peak Phase' : 'Taper'}

AUTO-ADJUSTMENT RULES:
1. HIGH INTENSITY (RPE/Difficulty ≥8): Make training EASIER
   - Slow down paces by 10-30 seconds per km
   - Reduce distances by 0.5-2km  
   - Add extra recovery if needed
   - Keep goal time achievable but may need to be more conservative

2. LOW INTENSITY (RPE/Difficulty ≤3 AND completed successfully): Make training HARDER
   - Speed up paces by 5-20 seconds per km
   - Increase distances by 0.5-1km
   - Consider updating goal time to be faster
   - Push athlete toward better performance

3. MODERATE INTENSITY (RPE/Difficulty 4-7): Maintain current plan
   - Minor adjustments only
   - Stay on track for current goal

REQUIRED JSON RESPONSE FORMAT:
{
  "action": "increase" | "decrease" | "maintain",
  "severity": "minor" | "moderate" | "significant",
  "nextSessionChanges": {
    "paceAdjustment": [number in seconds per km, positive = slower, negative = faster],
    "distanceAdjustment": [number in km, positive = longer, negative = shorter],
    "intensityAdjustment": "easier" | "harder" | "same",
    "sessionsToModify": [number of upcoming sessions to change, 1-5]
  },
  "goalTimeUpdate": {
    "newGoalTime": "[HH:MM:SS format if updating]",
    "confidence": [0-1, confidence in this goal change],
    "improvement": [seconds improvement, negative = faster]
  } | null,
  "reasoning": "[Brief explanation of why these changes were made]",
  "modifications": [
    "[List of specific changes made, e.g., 'Next easy run: +15s/km pace']",
    "[Another change, e.g., 'Tempo run distance: -1km']"
  ]
}

SAFETY LIMITS:
- Pace adjustments: Max ±30 seconds per km
- Distance adjustments: Max ±2km per session
- Goal time changes: Only if confidence >0.8
- Sessions to modify: 1-5 sessions max

Respond ONLY with the JSON object. Be specific and actionable in your adjustments.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });

    console.log('📡 Perplexity response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let responseText = data.choices[0]?.message?.content || '';
    
    console.log('🤖 Raw AI response:', responseText);
    
    // Clean up response - remove markdown formatting
    responseText = responseText.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
    
    console.log('🧹 Cleaned AI response:', responseText);
    
    let adjustment;
    try {
      adjustment = JSON.parse(responseText);
      console.log('✅ Successfully parsed AI response:', adjustment);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.error('❌ Failed to parse AI response:', responseText);
      console.error('Parse error:', parseError);
      adjustment = createFallbackAdjustment(sessionData);
      console.log('🔄 Using fallback adjustment:', adjustment);
    }

    // Validate and sanitize the adjustment
    adjustment = validateAdjustment(adjustment, sessionData);
    
    console.log('✅ Final adjustment to return:', adjustment);

    return Response.json({ adjustment });
    
  } catch (error) {
    console.error('💥 Auto-adjustment error:', error);
    
    // Return fallback adjustment on error
    const fallbackSessionData = sessionData || { rpe: 5, difficulty: 5, completed: 'yes' };
    const fallback = createFallbackAdjustment(fallbackSessionData);
    
    console.log('🔄 Returning fallback due to error:', fallback);
    
    return Response.json({ adjustment: fallback });
  }
}