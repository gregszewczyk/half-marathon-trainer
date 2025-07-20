export interface SessionFeedback {
  sessionId: string;
  completed: 'yes' | 'no' | 'partial';
  actualPace?: string;
  difficulty: number; // 1-10
  rpe: number; // 1-10
  feeling: 'terrible' | 'bad' | 'ok' | 'good' | 'great';
  comments?: string;
  weekNumber: number;
  sessionType: string;
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
   * Main AI trigger - determines if training adaptations are needed
   */
  shouldTriggerAI(feedback: SessionFeedback): boolean {
    // High RPE (≥8)
    if (feedback.rpe >= 8) return true;
    
    // High difficulty (≥8)
    if (feedback.difficulty >= 8) return true;
    
    // Session not completed
    if (feedback.completed === 'no') return true;
    
    // Feeling terrible or bad
    if (feedback.feeling === 'terrible' || feedback.feeling === 'bad') return true;
    
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
      return this.getFallbackAdaptation(feedback);
    }

    const prompt = this.buildAdaptationPrompt(feedback, recentFeedback, currentWeek);

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
      
      return this.parseAIResponse(aiResponse, feedback);
    } catch (error) {
      console.error('Perplexity API Error:', error);
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

    return `
HALF MARATHON TRAINING ADAPTATION REQUEST

Current Session:
- Week ${currentWeek} (${phase} phase)
- Session: ${feedback.sessionType}
- Target: ${feedback.targetDistance}km at ${feedback.targetPace}/km
- Completion: ${feedback.completed}
- RPE: ${feedback.rpe}/10
- Difficulty: ${feedback.difficulty}/10
- Feeling: ${feedback.feeling}
- Actual Pace: ${feedback.actualPace || 'Not recorded'}
- Comments: ${feedback.comments || 'None'}

Recent Training Trend (last 3 sessions):
${recentTrend}

CONSTRAINTS:
- Must be hamstring-safe (avoid aggressive speedwork if high RPE)
- Training for Manchester Half Marathon (flat course, October weather)
- Training with MadeRunning club (Mon 5PM, Wed 5AM, Sat 9AM)
- Goal: Sub-2 hours (currently targeting ~1:50-1:55)

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
        severity: this.calculateSeverity(feedback)
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackAdaptation(feedback);
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
      severity: this.calculateSeverity(feedback)
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