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
    this.apiKey = process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY || '';
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
    if (!this.apiKey) {
      return currentGoalTime; // Return current goal as fallback
    }

    const prompt = this.buildPredictionPrompt(recentSessions, currentGoalTime);

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

      const data = await response.json();
      const prediction = data.choices[0]?.message?.content || '';
      
      return this.extractTimeFromPrediction(prediction, currentGoalTime);
    } catch (error) {
      console.error('Prediction API Error:', error);
      return currentGoalTime;
    }
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
    const sessionSummary = recentSessions.map(s => 
      `${s.sessionType}: ${s.actualPace || s.targetPace}/km, RPE ${s.rpe}, ${s.feeling}`
    ).join('\n');

    return `
HALF MARATHON TIME PREDICTION

Current Goal: ${currentGoal}
Recent Training Sessions:
${sessionSummary}

Based on this training data, what realistic half marathon time should this runner target?
Consider:
- Manchester Half Marathon (flat, fast course)
- October conditions (cool/ideal)
- Current fitness trend
- RPE and feeling scores

Provide a single predicted time in HH:MM:SS format with brief justification.
`;
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
    const timeMatch = prediction.match(/\d{1,2}:\d{2}:\d{2}/);
    return timeMatch ? timeMatch[0] : fallback;
  }
}