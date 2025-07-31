export interface SessionFeedback {
  sessionId: string;
  completed: 'yes' | 'no' | 'partial';
  actualPace?: string; // Keep optional for backwards compatibility
  difficulty: number; // 1-10
  rpe: number; // 1-10
  feeling: 'terrible' | 'bad' | 'ok' | 'good' | 'great';
  comments?: string;
  weekNumber: number;
  sessionType: string; // 'easy', 'tempo', 'intervals', 'long', etc.
  targetPace: string;
  targetDistance: number;
  // 🚀 NEW: Weather data for enhanced AI analysis
  weatherTemp?: number; // Temperature in Celsius
  weatherConditions?: string; // "sunny", "cloudy", "rainy", etc.
  weatherWindSpeed?: number; // Wind speed in km/h
  weatherHumidity?: number; // Humidity percentage
  weatherDescription?: string; // Human-readable description
}

export interface TrainingAdaptation {
  recommendations: string[];
  adaptations: {
    intensityChange?: 'increase' | 'decrease' | 'maintain';
    volumeChange?: 'increase' | 'decrease' | 'maintain';
    recoveryDays?: number;
    paceAdjustment?: string;
  };
  reasoning: string;
  severity: 'low' | 'medium' | 'high';
  source: 'ai' | 'fallback'; // Indicates if response is from AI or fallback
  userMessage: string; // User-facing message indicating the source and quality of response
}

export class PerplexityAIService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Perplexity API key not found. AI features will be disabled.');
    }
  }

  /**
   * Analyze comments for negative indicators that suggest need for adaptation
   */
  private hasNegativeIndicators(comments: string): boolean {
    if (!comments || comments.trim().length === 0) return false;
    
    const comment = comments.toLowerCase();
    
    // Strong negative indicators
    const strongNegatives = [
      'pain', 'hurt', 'injury', 'injured', 'strain', 'pulled',
      'couldn\'t finish', 'had to stop', 'too hard', 'exhausted',
      'struggled', 'terrible', 'awful', 'miserable', 'burning'
    ];
    
    // Moderate negative indicators
    const moderateNegatives = [
      'difficult', 'tough', 'challenging', 'hard', 'tired',
      'heavy legs', 'sluggish', 'slow', 'struggled a bit'
    ];
    
    // Positive indicators that override moderate negatives
    const positives = [
      'felt good', 'strong', 'controlled', 'comfortable',
      'within target', 'on target', 'as expected', 'perfect',
      'nailed it', 'spot on', 'right pace', 'good effort'
    ];
    
    // Check for positive indicators first
    const hasPositives = positives.some(positive => comment.includes(positive));
    if (hasPositives) return false;
    
    // Check for strong negatives (always trigger adaptation)
    const hasStrongNegatives = strongNegatives.some(negative => comment.includes(negative));
    if (hasStrongNegatives) return true;
    
    // Check for moderate negatives (only trigger if no positives)
    const hasModerateNegatives = moderateNegatives.some(negative => comment.includes(negative));
    return hasModerateNegatives;
  }

  /**
   * Get expected RPE range for different session types
   */
  private getExpectedRPERange(sessionType: string): { min: number; max: number } {
    const rpeRanges: { [key: string]: { min: number; max: number } } = {
      'easy': { min: 3, max: 5 },
      'tempo': { min: 6, max: 7 },
      'intervals': { min: 8, max: 9 },
      'long': { min: 4, max: 6 },
      'recovery': { min: 2, max: 4 },
      'threshold': { min: 7, max: 8 },
      'fartlek': { min: 5, max: 8 },
      'race_pace': { min: 7, max: 8 }
    };

    // Default to easy run range if session type not found
    return rpeRanges[sessionType.toLowerCase()] ?? rpeRanges['easy']!;
  }

  /**
   * Get pace deviation threshold based on session type
   */
  private getPaceDeviationThreshold(sessionType: string): number {
    const thresholds: { [key: string]: number } = {
      'easy': 15,        // More flexible - easy runs are about effort, not precise pace
      'recovery': 20,    // Very flexible - recovery is all about easy effort
      'long': 12,        // Moderate - consistency matters but some drift is OK
      'tempo': 8,        // Strict - tempo pace is specific for lactate threshold
      'threshold': 8,    // Strict - threshold work needs precision
      'intervals': 5,    // Very strict - interval pacing is critical for training stimulus
      'race_pace': 6,    // Very strict - race pace practice needs accuracy
      'fartlek': 15,     // Flexible - fartlek is about varied effort, not precise pacing
      'hill': 12         // Moderate - hill repeats have natural pace variation
    };

    return thresholds[sessionType.toLowerCase()] || 10; // Default: 10 seconds
  }

  /**
   * Check if actual pace deviates significantly from target pace
   */
  private isPaceDeviationSignificant(actualPace: string, targetPace: string, sessionType: string = 'easy'): boolean {
    try {
      const actualSeconds = this.paceToSeconds(actualPace);
      const targetSeconds = this.paceToSeconds(targetPace);
      
      if (actualSeconds === 0 || targetSeconds === 0) return false;
      
      const deviationSeconds = Math.abs(actualSeconds - targetSeconds);
      const thresholdSeconds = this.getPaceDeviationThreshold(sessionType);
      
      if (deviationSeconds >= thresholdSeconds) {
        const deviationType = actualSeconds > targetSeconds ? 'slower' : 'faster';
        console.log(`🤖 Significant pace deviation for ${sessionType}: ${deviationSeconds}s ${deviationType} than target (threshold: ${thresholdSeconds}s)`);
        return true;
      }
      
      console.log(`🤖 Pace deviation for ${sessionType}: ${deviationSeconds}s (within ${thresholdSeconds}s threshold)`);
      return false;
    } catch (error) {
      console.error('Error calculating pace deviation:', error);
      return false;
    }
  }

  /**
   * Convert pace string (MM:SS) to total seconds
   */
  private paceToSeconds(pace: string): number {
    try {
      const parts = pace.split(':');
      if (parts.length !== 2) return 0;
      
      const minutes = parseInt(parts[0] || '0', 10);
      const seconds = parseInt(parts[1] || '0', 10);
      
      if (isNaN(minutes) || isNaN(seconds)) return 0;
      
      return (minutes * 60) + seconds;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Main AI trigger - determines if training adaptations are needed
   * Now uses smarter logic that considers context and comment sentiment
   */
  shouldTriggerAI(feedback: SessionFeedback): boolean {
    // Session not completed - always needs attention
    if (feedback.completed === 'no') return true;
    
    // Poor feelings - always needs attention
    if (feedback.feeling === 'terrible' || feedback.feeling === 'bad') return true;
    
    // VERY high RPE (≥9) - always concerning regardless of target
    if (feedback.rpe >= 9) return true;
    
    // VERY high difficulty (≥9) - always concerning regardless of target  
    if (feedback.difficulty >= 9) return true;
    
    // 🆕 NEW: Check if RPE is outside expected range for session type
    const expectedRPE = this.getExpectedRPERange(feedback.sessionType);
    if (feedback.rpe < expectedRPE.min || feedback.rpe > expectedRPE.max) {
      console.log(`🤖 RPE ${feedback.rpe} outside expected range ${expectedRPE.min}-${expectedRPE.max} for ${feedback.sessionType} - triggering adaptation`);
      return true;
    }
    
    // 🆕 NEW: Check if actual pace deviates significantly from target
    if (feedback.actualPace && this.isPaceDeviationSignificant(feedback.actualPace, feedback.targetPace, feedback.sessionType)) {
      console.log(`🤖 Pace deviation detected for ${feedback.sessionType}: actual ${feedback.actualPace} vs target ${feedback.targetPace} - triggering adaptation`);
      return true;
    }
    
    // Moderate RPE (8) - only trigger if comments indicate real problems
    if (feedback.rpe === 8) {
      // If no comments provided, be conservative and don't trigger
      if (!feedback.comments || feedback.comments.trim().length === 0) {
        console.log('🤖 RPE 8 with no comments - assuming within target range, no adaptation needed');
        return false;
      }
      
      // Check comment sentiment
      if (this.hasNegativeIndicators(feedback.comments)) {
        console.log('🤖 RPE 8 with negative comments - triggering adaptation');
        return true;
      } else {
        console.log('🤖 RPE 8 with neutral/positive comments - no adaptation needed');
        return false;
      }
    }
    
    // Moderate difficulty (8) - same logic as RPE
    if (feedback.difficulty === 8) {
      if (!feedback.comments || feedback.comments.trim().length === 0) {
        console.log('🤖 Difficulty 8 with no comments - assuming acceptable, no adaptation needed');
        return false;
      }
      
      if (this.hasNegativeIndicators(feedback.comments)) {
        console.log('🤖 Difficulty 8 with negative comments - triggering adaptation');
        return true;
      } else {
        console.log('🤖 Difficulty 8 with neutral/positive comments - no adaptation needed');
        return false;
      }
    }
    
    // Check for strong negative comments even with lower RPE/difficulty
    if (feedback.comments && this.hasNegativeIndicators(feedback.comments)) {
      // Only trigger if comments indicate serious issues (pain, injury, etc.)
      const comment = feedback.comments.toLowerCase();
      const seriousIssues = ['pain', 'hurt', 'injury', 'injured', 'strain', 'pulled', 'couldn\'t finish'];
      if (seriousIssues.some(issue => comment.includes(issue))) {
        console.log('🤖 Serious issue detected in comments - triggering adaptation');
        return true;
      }
    }
    
    // Default: no adaptation needed
    console.log('🤖 All indicators within acceptable range - no adaptation needed');
    return false;
  }

  /**
   * Generate training adaptations based on feedback
   */
  async generateAdaptations(
    feedback: SessionFeedback,
    recentFeedback: SessionFeedback[],
    currentWeek: number
  ): Promise<TrainingAdaptation> {
    if (!this.apiKey) {
      console.log('🤖 Using fallback adaptations (Perplexity API not available)');
      return this.getFallbackAdaptation(feedback);
    }

    const prompt = this.buildAdaptationPrompt(feedback, recentFeedback, currentWeek);

    try {
      console.log('🤖 Generating AI adaptations using Perplexity API...');
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are an expert running coach specializing in half marathon training. Provide practical, evidence-based training adaptations based on athlete feedback. Always consider injury prevention and gradual progression.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || '';
      
      console.log('✅ AI adaptation generated successfully');
      return this.parseAIResponse(aiResponse, feedback);
    } catch (error) {
      console.error('Perplexity API Error:', error);
      console.log('🤖 Falling back to basic adaptations due to API error');
      return this.getFallbackAdaptation(feedback);
    }
  }

  /**
   * Generate race time predictions
   */
  async predictRaceTime(
    recentSessions: SessionFeedback[],
    currentGoalTime: string
  ): Promise<string> {
    console.log(`🔑 AI Service - API key present: ${!!this.apiKey}`);
    
    if (!this.apiKey) {
      console.log('❌ No API key - returning current goal time');
      return currentGoalTime; // Return current goal as fallback
    }

    console.log(`📝 Building prediction prompt for ${recentSessions.length} sessions, current goal: ${currentGoalTime}`);
    const prompt = this.buildPredictionPrompt(recentSessions, currentGoalTime);
    console.log(`📝 Prediction prompt: ${prompt.substring(0, 200)}...`);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a running coach specialized in half marathon performance prediction. Analyze training data to predict realistic race times based on current fitness.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 150,
          temperature: 0.2
        })
      });

      console.log(`📡 API Response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ API request failed with status ${response.status}`);
        const errorText = await response.text();
        console.error(`❌ Error response: ${errorText}`);
        return currentGoalTime;
      }
      
      const data = await response.json();
      const prediction = data.choices[0]?.message?.content || '';
      
      console.log('🤖 AI Raw Response:', prediction);
      const extractedTime = this.extractTimeFromPrediction(prediction, currentGoalTime);
      console.log('🎯 Extracted Time:', extractedTime);
      
      return extractedTime;
    } catch (error) {
      console.error('❌ Prediction API Error:', error);
      return currentGoalTime;
    }
  }

  /**
   * Format weather context for AI prompts
   */
  private formatWeatherContext(feedback: SessionFeedback): string {
    if (!feedback.weatherTemp && !feedback.weatherConditions) {
      return 'Weather: Not available';
    }

    const weatherParts = [];
    
    if (feedback.weatherTemp !== undefined) {
      weatherParts.push(`${feedback.weatherTemp}°C`);
    }
    
    if (feedback.weatherConditions) {
      weatherParts.push(feedback.weatherConditions);
    }
    
    if (feedback.weatherWindSpeed && feedback.weatherWindSpeed > 10) {
      weatherParts.push(`${feedback.weatherWindSpeed}km/h wind`);
    }
    
    if (feedback.weatherHumidity && feedback.weatherHumidity > 70) {
      weatherParts.push(`${feedback.weatherHumidity}% humidity`);
    }

    const weatherInfo = weatherParts.length > 0 ? weatherParts.join(', ') : 'Conditions not recorded';
    
    // Add weather impact analysis if we have temperature data
    let weatherImpact = '';
    if (feedback.weatherTemp !== undefined) {
      if (feedback.weatherTemp > 25) {
        weatherImpact = ' (Hot conditions - expect 10-30s/km slower, higher RPE normal)';
      } else if (feedback.weatherTemp < 5) {
        weatherImpact = ' (Cold conditions - expect faster paces, lower RPE normal)';
      } else if (feedback.weatherTemp >= 15 && feedback.weatherTemp <= 20) {
        weatherImpact = ' (Ideal running conditions)';
      }
    }
    
    return `Weather: ${weatherInfo}${weatherImpact}`;
  }

  /**
   * Build the adaptation prompt
   */
  private buildAdaptationPrompt(
    feedback: SessionFeedback,
    recentFeedback: SessionFeedback[],
    currentWeek: number
  ): string {
    const phase = this.getTrainingPhase(currentWeek);
    const recentTrend = this.analyzeRecentTrend(recentFeedback);

    // 🚀 NEW: Get weather context for this session
    const weatherContext = this.formatWeatherContext(feedback);

    // Determine if this might be expected performance
    const isHighButExpected = (feedback.rpe === 8 || feedback.difficulty === 8) && 
                              feedback.comments && 
                              !this.hasNegativeIndicators(feedback.comments);
    
    const contextNote = isHighButExpected ? 
      "\n⚠️  IMPORTANT: RPE/Difficulty of 8 may be EXPECTED for this session type. Check if adaptation is actually needed before recommending changes." : "";

    // Check why AI was triggered
    const expectedRPE = this.getExpectedRPERange(feedback.sessionType);
    const isRPEOutOfRange = feedback.rpe < expectedRPE.min || feedback.rpe > expectedRPE.max;
    const hasPaceDeviation = feedback.actualPace && this.isPaceDeviationSignificant(feedback.actualPace, feedback.targetPace, feedback.sessionType);
    
    let triggerReason = "";
    if (isRPEOutOfRange) {
      triggerReason += `\n🚨 TRIGGER: RPE ${feedback.rpe} is outside expected range ${expectedRPE.min}-${expectedRPE.max} for ${feedback.sessionType} sessions`;
    }
    if (hasPaceDeviation) {
      triggerReason += `\n🚨 TRIGGER: Significant pace deviation detected (actual: ${feedback.actualPace}, target: ${feedback.targetPace})`;
    }

    return `
HALF MARATHON TRAINING ADAPTATION REQUEST${triggerReason}

Current Session:
- Week ${currentWeek} (${phase} phase)
- Session: ${feedback.sessionType} (Expected RPE: ${expectedRPE.min}-${expectedRPE.max})
- Target: ${feedback.targetDistance}km at ${feedback.targetPace}/km  
- Completion: ${feedback.completed}
- RPE: ${feedback.rpe}/10 ${feedback.rpe === 8 ? '(moderate-high)' : feedback.rpe >= 9 ? '(very high)' : isRPEOutOfRange ? '(OUTSIDE EXPECTED RANGE)' : ''}
- Difficulty: ${feedback.difficulty}/10 ${feedback.difficulty === 8 ? '(moderate-high)' : feedback.difficulty >= 9 ? '(very high)' : ''}
- Feeling: ${feedback.feeling}
- Actual Pace: ${feedback.actualPace || 'Not recorded'}${hasPaceDeviation ? ' (SIGNIFICANT DEVIATION)' : ''}
- ${weatherContext}
- Comments: ${feedback.comments || 'None'}${contextNote}

Recent Training Trend (last 3 sessions):
${recentTrend}

CONSTRAINTS:
- Must be hamstring-safe (avoid aggressive speedwork if high RPE)
- Training for Manchester Half Marathon (flat course, October weather)
- Training with MadeRunning club (Mon 5PM, Wed 5AM, Sat 9AM)
- Goal: Sub-2 hours (currently targeting ~1:50-1:55)

IMPORTANT GUIDANCE:
- RPE 8 during tempo/interval sessions may be PERFECT execution, not a problem
- Only recommend DECREASE if runner shows signs of overreaching/injury risk
- Consider runner's comments heavily - positive comments suggest good execution
- Focus on maintaining current training if performance is on target

Please provide:
1. IMMEDIATE RECOMMENDATIONS (2-3 specific actions for next sessions)
2. INTENSITY ADJUSTMENT (increase/decrease/maintain with reasoning)
3. VOLUME ADJUSTMENT (if needed)
4. RECOVERY RECOMMENDATIONS (if high stress detected)
5. REASONING (why these adaptations are needed)

Format as: RECOMMENDATIONS: [list] | INTENSITY: [change] | VOLUME: [change] | RECOVERY: [days if needed] | REASONING: [explanation]
`;
  }

  /**
   * Build race prediction prompt
   */
  private buildPredictionPrompt(
    recentSessions: SessionFeedback[],
    currentGoal: string
  ): string {
    // Calculate goal pace for context
    const goalTimeInSeconds = this.timeToSeconds(currentGoal);
    const goalPacePerKm = Math.floor(goalTimeInSeconds / 21.1);
    const goalPaceMin = Math.floor(goalPacePerKm / 60);
    const goalPaceSec = goalPacePerKm % 60;
    const goalPaceString = `${goalPaceMin}:${goalPaceSec.toString().padStart(2, '0')}`;

    const sessionSummary = recentSessions.map(s => {
      const actualPace = s.actualPace || s.targetPace;
      const targetPace = s.targetPace || 'unknown';
      const sessionContext = this.getSessionContext(s.sessionType, s.targetDistance);
      const paceAnalysis = this.analyzePaceForSession(actualPace, targetPace, s.sessionType, s.rpe);
      const weatherContext = this.formatWeatherContext(s);
      
      return `• ${sessionContext}: ${actualPace}/km (target: ${targetPace}/km), RPE ${s.rpe}/10, feeling: ${s.feeling}
  → ${weatherContext}
  → Analysis: ${paceAnalysis}`;
    }).join('\n');

    return `
HALF MARATHON TIME PREDICTION - SESSION TYPE ANALYSIS

GOAL CONTEXT:
• Target: ${currentGoal} (requires ${goalPaceString}/km race pace)
• Course: Manchester Half Marathon (flat, fast)
• Conditions: October (ideal for racing)

RECENT TRAINING SESSIONS WITH CONTEXT:
${sessionSummary}

SESSION TYPE EXPECTATIONS:
• EASY runs: Should be 6:15-6:45/km (RPE 3-5), conversational pace
• TEMPO runs: Should be 5:10-5:20/km (RPE 6-7), comfortably hard, race pace effort
• LONG runs: Should be 6:00-6:30/km (RPE 4-6), building to moderate effort
• INTERVAL/SPEED: Should be 4:45-5:05/km (RPE 8-9), very hard efforts

PREDICTION ANALYSIS:
1. Assess if paces match expected effort for each session type
2. Strong tempo paces (5:00-5:10/km at RPE 6-7) indicate excellent race fitness
3. Easy runs at 6:00/km or faster with low RPE show good aerobic base
4. If achieving race pace (${goalPaceString}/km) in training at moderate RPE, runner is ready for goal
5. If exceeding race pace in tempo sessions, runner likely capable of faster than goal

WEATHER-ADJUSTED ANALYSIS:
- Fast paces in hot conditions (>25°C) are more impressive than same pace in cool conditions
- Slower paces in extreme weather (hot/windy/humid) should not lower fitness assessment
- Ideal conditions (15-20°C, calm) provide most accurate fitness indicators
- Adjust expectations based on weather impact when predicting race performance

Provide predicted half marathon time in HH:MM:SS format based on session-specific pace analysis with weather considerations.
`;
  }

  private timeToSeconds(timeString: string): number {
    if (!timeString || timeString === '') return 999999;
    
    const parts = timeString.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0] || '0', 10) || 0;
      const seconds = parseInt(parts[1] || '0', 10) || 0;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      const hours = parseInt(parts[0] || '0', 10) || 0;
      const minutes = parseInt(parts[1] || '0', 10) || 0;
      const seconds = parseInt(parts[2] || '0', 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 999999;
  }

  private getSessionContext(sessionType: string, distance?: number): string {
    const distanceStr = distance ? `${distance}km ` : '';
    
    switch (sessionType.toLowerCase()) {
      case 'tempo':
        return `${distanceStr}TEMPO session (threshold pace)`;
      case 'easy':
        return `${distanceStr}EASY run (aerobic base)`;
      case 'long':
        return `${distanceStr}LONG run (endurance)`;
      case 'intervals':
        return `${distanceStr}INTERVAL session (speed work)`;
      default:
        return `${distanceStr}${sessionType.toUpperCase()} session`;
    }
  }

  private analyzePaceForSession(actualPace: string, targetPace: string, sessionType: string, rpe: number): string {
    if (!actualPace || actualPace === '') return 'No pace data available';
    
    const sessionLower = sessionType.toLowerCase();
    
    // Convert paces to seconds for comparison
    const actualSeconds = this.timeToSeconds(actualPace);
    const targetSeconds = this.timeToSeconds(targetPace);
    
    // Session-specific analysis
    if (sessionLower === 'tempo') {
      if (actualSeconds < 310) { // Faster than 5:10/km
        return `EXCELLENT tempo pace (faster than 5:10/km) at RPE ${rpe} - indicates strong race fitness`;
      } else if (actualSeconds < 330) { // 5:10-5:30/km
        return `Good tempo pace (5:10-5:30/km) at RPE ${rpe} - solid threshold fitness`;
      } else {
        return `Moderate tempo pace (slower than 5:30/km) at RPE ${rpe}`;
      }
    } else if (sessionLower === 'easy') {
      if (actualSeconds < 360) { // Faster than 6:00/km
        return `Fast easy pace (${actualPace}/km) at RPE ${rpe} - ${rpe <= 4 ? 'excellent aerobic efficiency' : 'may be too fast for easy run'}`;
      } else if (actualSeconds < 405) { // 6:00-6:45/km
        return `Appropriate easy pace (${actualPace}/km) at RPE ${rpe} - good aerobic base`;
      } else {
        return `Conservative easy pace (${actualPace}/km) at RPE ${rpe}`;
      }
    } else if (sessionLower === 'long') {
      if (actualSeconds < 360) { // Faster than 6:00/km
        return `Strong long run pace (${actualPace}/km) at RPE ${rpe} - excellent endurance`;
      } else {
        return `Steady long run pace (${actualPace}/km) at RPE ${rpe}`;
      }
    }
    
    return `${actualPace}/km at RPE ${rpe} for ${sessionType} session`;
  }

  /**
   * Parse AI response into structured adaptation
   */
  private parseAIResponse(aiResponse: string, feedback: SessionFeedback): TrainingAdaptation {
    try {
      const parts = aiResponse.split('|').map(p => p.trim());
      
      const recommendations = parts[0]?.replace('RECOMMENDATIONS:', '').trim().split('\n') || [];
      const intensity = parts[1]?.replace('INTENSITY:', '').trim().toLowerCase() as 'increase' | 'decrease' | 'maintain';
      const volume = parts[2]?.replace('VOLUME:', '').trim().toLowerCase() as 'increase' | 'decrease' | 'maintain';
      const recovery = parts[3]?.replace('RECOVERY:', '').trim();
      const reasoning = parts[4]?.replace('REASONING:', '').trim() || '';

      return {
        recommendations: recommendations.filter(r => r.length > 0),
        adaptations: {
          intensityChange: intensity,
          volumeChange: volume,
          recoveryDays: recovery?.includes('day') 
  ? parseInt(recovery.match(/\d+/)?.[0] || '0') || 0 
  : 0
        },
        reasoning,
        severity: this.calculateSeverity(feedback),
        source: 'ai',
        userMessage: '🤖 AI Coach Analysis - Personalized recommendations based on your training data and Manchester Half Marathon goal'
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('🤖 Falling back to basic adaptations due to parsing error');
      const fallback = this.getFallbackAdaptation(feedback);
      // Override the user message to indicate parsing issue
      fallback.userMessage = '⚠️ Basic Recommendations - AI response received but couldn\'t be processed, showing general guidance';
      return fallback;
    }
  }

  /**
   * Fallback adaptations when AI is unavailable
   */
  private getFallbackAdaptation(feedback: SessionFeedback): TrainingAdaptation {
    const adaptations: TrainingAdaptation = {
      recommendations: [],
      adaptations: {},
      reasoning: '',
      severity: this.calculateSeverity(feedback),
      source: 'fallback',
      userMessage: '⚠️ Basic Recommendations - AI coach temporarily unavailable, showing general training guidance'
    };

    // High RPE/Difficulty
    if (feedback.rpe >= 8 || feedback.difficulty >= 8) {
      adaptations.recommendations = [
        'Reduce intensity for next 2 sessions',
        'Focus on easy pace recovery runs',
        'Consider adding extra rest day if pattern continues'
      ];
      adaptations.adaptations.intensityChange = 'decrease';
      adaptations.reasoning = 'High perceived exertion indicates need for recovery';
    }

    // Session not completed
    if (feedback.completed === 'no') {
      adaptations.recommendations = [
        'Investigate reason for incomplete session',
        'Modify next session to rebuild confidence',
        'Consider scheduling assessment with coach'
      ];
      adaptations.adaptations.intensityChange = 'decrease';
      adaptations.reasoning = 'Incomplete session suggests overreaching or external factors';
    }

    // Poor feeling
    if (feedback.feeling === 'terrible' || feedback.feeling === 'bad') {
      adaptations.recommendations = [
        'Schedule easy recovery run for next session',
        'Check sleep, nutrition, and stress levels',
        'Monitor for signs of overtraining'
      ];
      adaptations.adaptations.recoveryDays = 1;
      adaptations.reasoning = 'Poor subjective feeling requires attention to recovery';
    }

    return adaptations;
  }

  /**
   * Calculate severity based on feedback
   */
  private calculateSeverity(feedback: SessionFeedback): 'low' | 'medium' | 'high' {
    if (feedback.rpe >= 9 || feedback.difficulty >= 9 || feedback.feeling === 'terrible') {
      return 'high';
    }
    if (feedback.rpe >= 7 || feedback.difficulty >= 7 || feedback.feeling === 'bad') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Determine training phase based on week
   */
  private getTrainingPhase(week: number): string {
    if (week <= 4) return 'Base';
    if (week <= 8) return 'Build';
    if (week <= 10) return 'Peak';
    return 'Taper';
  }

  /**
   * Analyze recent training trend
   */
  private analyzeRecentTrend(recentFeedback: SessionFeedback[]): string {
    if (recentFeedback.length === 0) return 'No recent data';
    
    const avgRPE = recentFeedback.reduce((sum, f) => sum + f.rpe, 0) / recentFeedback.length;
    const completionRate = recentFeedback.filter(f => f.completed === 'yes').length / recentFeedback.length;
    
    return `Average RPE: ${avgRPE.toFixed(1)}, Completion Rate: ${(completionRate * 100).toFixed(0)}%`;
  }

  /**
   * Extract time from prediction response
   */
  private extractTimeFromPrediction(prediction: string, fallback: string): string {
    console.log(`🔍 Extracting time from prediction: "${prediction}"`);
    const timeMatch = prediction.match(/\d{1,2}:\d{2}:\d{2}/);
    console.log(`⏱️ Time pattern match: ${timeMatch?.[0] || 'none found'}`);
    const result = timeMatch ? timeMatch[0] : fallback;
    console.log(`✅ Final extracted time: ${result} (fallback: ${fallback})`);
    return result;
  }

  /**
   * Generate AI-powered warm-up and cool-down routines
   */
  async generateWarmupCooldown(
    sessionType: string,
    userProfile: {
      fitnessLevel: string;
      injuryHistory?: string;
      age?: number;
    },
    timeOfDay?: 'morning' | 'afternoon' | 'evening'
  ): Promise<{ warmup: string; cooldown: string }> {
    try {
      if (!this.apiKey) {
        console.warn('No Perplexity API key - using fallback warm-up and cool-down');
        return this.getFallbackWarmupCooldown(sessionType, userProfile);
      }

      const prompt = this.buildWarmupCooldownPrompt(sessionType, userProfile, timeOfDay);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are an expert running coach specializing in personalized warm-up and cool-down routines. Provide specific, actionable routines.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        console.error('AI warm-up generation failed:', response.status);
        return this.getFallbackWarmupCooldown(sessionType, userProfile);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        console.error('Empty AI response for warm-up generation');
        return this.getFallbackWarmupCooldown(sessionType, userProfile);
      }

      return this.parseWarmupCooldownResponse(aiResponse, sessionType, userProfile);

    } catch (error) {
      console.error('Error generating AI warm-up/cool-down:', error);
      return this.getFallbackWarmupCooldown(sessionType, userProfile);
    }
  }

  /**
   * Build prompt for warm-up and cool-down generation
   */
  private buildWarmupCooldownPrompt(
    sessionType: string,
    userProfile: { fitnessLevel: string; injuryHistory?: string; age?: number },
    timeOfDay?: string
  ): string {
    const sessionContext = {
      'easy': 'Easy aerobic run - main session is already at easy conversational pace',
      'long': 'Long run - main session is at easy pace but longer duration requires good preparation',
      'tempo': 'Tempo run - sustained moderate-hard effort, needs proper activation',
      'intervals': 'Interval training - high intensity repeats, needs thorough preparation and recovery'
    };

    return `
GENERATE PERSONALIZED WARM-UP AND COOL-DOWN ROUTINES

SESSION TYPE: ${sessionType.toUpperCase()}
Session Context: ${sessionContext[sessionType as keyof typeof sessionContext] || 'Standard running session'}

RUNNER PROFILE:
- Fitness Level: ${userProfile.fitnessLevel}
- Age: ${userProfile.age || 'Not specified'}
- Injury History: ${userProfile.injuryHistory || 'None specified'}
- Time of Day: ${timeOfDay || 'Not specified'}

IMPORTANT GUIDELINES:
- For EASY/LONG runs: No warm-up jogging needed (main run is already easy pace)
- For TEMPO/INTERVALS: Include gradual build-up with easy jogging
- Consider injury history for targeted activation/recovery
- Morning sessions need more activation, evening sessions focus on mobility
- Keep routines practical and time-efficient (5-20 minutes max)

REQUIREMENTS:
1. WARM-UP: Specific routine with timing and exercises
2. COOL-DOWN: Specific routine with timing and recovery focus

Format response as:
WARMUP: [specific routine with timing]
COOLDOWN: [specific routine with timing]

Be concise but specific with exercise names and durations.
`;
  }

  /**
   * Parse AI response for warm-up and cool-down
   */
  private parseWarmupCooldownResponse(
    aiResponse: string,
    sessionType: string,
    userProfile: { fitnessLevel: string; injuryHistory?: string }
  ): { warmup: string; cooldown: string } {
    try {
      const warmupMatch = aiResponse.match(/WARMUP:\s*(.+?)(?=COOLDOWN:|$)/i);
      const cooldownMatch = aiResponse.match(/COOLDOWN:\s*(.+?)$/i);

      const warmup = warmupMatch?.[1]?.trim() || this.getFallbackWarmup(sessionType);
      const cooldown = cooldownMatch?.[1]?.trim() || this.getFallbackCooldown(sessionType);

      return { warmup, cooldown };
    } catch (error) {
      console.error('Error parsing warm-up/cool-down response:', error);
      return this.getFallbackWarmupCooldown(sessionType, userProfile);
    }
  }

  /**
   * Fallback warm-up and cool-down when AI is unavailable
   */
  private getFallbackWarmupCooldown(
    sessionType: string,
    userProfile: { fitnessLevel: string; injuryHistory?: string }
  ): { warmup: string; cooldown: string } {
    return {
      warmup: this.getFallbackWarmup(sessionType),
      cooldown: this.getFallbackCooldown(sessionType)
    };
  }

  /**
   * Get fallback warm-up routine
   */
  private getFallbackWarmup(sessionType: string): string {
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

  /**
   * Get fallback cool-down routine
   */
  private getFallbackCooldown(sessionType: string): string {
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
}