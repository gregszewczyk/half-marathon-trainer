import { useState, useEffect } from 'react'

interface TrainingStats {
  daysToRace: number;
  weekCompletion: number;
  weekDistance: number;
   isLoading: boolean;
  predictedTime: string;
  
}

export function useTrainingStats(userId: string = 'default'): TrainingStats {
  const [completionData, setCompletionData] = useState<TrainingStats>({
    daysToRace: 83,
    weekCompletion: 0,
    weekDistance: 22,
    predictedTime: "2:00:00",
    isLoading: true,
  });
// Removed top-level await fetch; fetching is handled inside useEffect.
// Removed duplicate isLoading state.

  useEffect(() => {
    const fetchCompletionData = async () => {
      setCompletionData(prev => ({ ...prev, isLoading: true })); // Set loading first
      
      try {
        console.log(`🔄 Loading data for user: ${userId}`);
        
        const raceDate = new Date('2025-10-12');
        const today = new Date();
        const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const response = await fetch(`/api/feedback?weekNumber=1&userId=${userId}`);
        let weekCompletion = 0;
        
        if (response.ok) {
          const { feedback } = await response.json();
          console.log(`📊 Data for ${userId}:`, feedback);
          
          const totalRunningSessions = 4;
          const completedSessions = Array.isArray(feedback) ? 
            feedback.filter((f: any) => f.completed === 'yes' && f.sessionType === 'running').length : 0;
          
          weekCompletion = Math.round((completedSessions / totalRunningSessions) * 100);
          console.log(`✅ ${userId} completion: ${weekCompletion}%`);
        }

        setCompletionData({
          daysToRace,
          weekCompletion,
          weekDistance: 22,
          predictedTime: "2:00:00",
          isLoading: false
        });
        
      } catch (error) {
        console.error(`Error for ${userId}:`, error);
        setCompletionData(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchCompletionData();
  }, [userId]);

  return completionData;
}
