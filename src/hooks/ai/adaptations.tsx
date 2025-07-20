import { useState } from 'react';
import { SessionFeedback, TrainingAdaptation } from '@/lib/ai/perplexity-service';

export function useAIAdaptations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAdaptation, setLastAdaptation] = useState<TrainingAdaptation | null>(null);

  const triggerAIAnalysis = async (
    feedback: SessionFeedback,
    recentFeedback: SessionFeedback[] = [],
    currentWeek: number
  ) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/ai/adapt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback,
          recentFeedback,
          currentWeek
        })
      });

      const result = await response.json();
      
      if (result.triggered) {
        setLastAdaptation(result.adaptations);
        return result.adaptations;
      }
      
      return null;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const predictRaceTime = async (
    recentSessions: SessionFeedback[],
    currentGoalTime: string
  ) => {
    try {
      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recentSessions,
          currentGoalTime
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Prediction Error:', error);
      return null;
    }
  };

  return {
    triggerAIAnalysis,
    predictRaceTime,
    isProcessing,
    lastAdaptation
  };
}