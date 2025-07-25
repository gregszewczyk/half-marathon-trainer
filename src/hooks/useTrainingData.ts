// 🔧 FIXED: src/hooks/useTrainingData.ts
// Updated to handle empty database and API errors gracefully

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

  useEffect(() => {
    // Don't fetch if userId is null or empty
    if (!userId) {
      console.log('⏳ useTrainingStats waiting for userId...');
      return;
    }

    const fetchCompletionData = async () => {
      setCompletionData(prev => ({ ...prev, isLoading: true }));
      
      try {
        console.log(`🔄 Loading data for user: ${userId}`);
        
        const raceDate = new Date('2025-10-12');
        const today = new Date();
        const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Try to fetch feedback data
        let weekCompletion = 0;
        
        try {
          const response = await fetch(`/api/feedback?weekNumber=1&userId=${userId}`);
          
          if (response.ok) {
            const { feedback } = await response.json();
            console.log(`📊 Data for ${userId}:`, feedback);
            
            const totalRunningSessions = 4;
            const completedSessions = Array.isArray(feedback) ? 
              feedback.filter((f: any) => f.completed === 'yes' && f.sessionType === 'running').length : 0;
            
            weekCompletion = Math.round((completedSessions / totalRunningSessions) * 100);
            console.log(`✅ ${userId} completion: ${weekCompletion}%`);
          } else {
            console.log(`⚠️ API returned ${response.status}, using default values`);
            // Don't throw error, just use default values
            weekCompletion = 0;
          }
        } catch (apiError) {
          console.log('⚠️ API call failed, using default values:', apiError instanceof Error ? apiError.message : 'Unknown error');
          // Don't throw error, just use default values
          weekCompletion = 0;
        }

        setCompletionData({
          daysToRace,
          weekCompletion,
          weekDistance: 22,
          predictedTime: "2:00:00",
          isLoading: false
        });
        
      } catch (error) {
        console.error(`Error for ${userId}:`, error instanceof Error ? error.message : 'Unknown error');
        
        // Set safe default values even on error
        const raceDate = new Date('2025-10-12');
        const today = new Date();
        const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        setCompletionData({
          daysToRace,
          weekCompletion: 0,
          weekDistance: 22,
          predictedTime: "2:00:00",
          isLoading: false
        });
      }
    };

    fetchCompletionData();
  }, [userId]); // This will only run when userId is actually set

  return completionData;
}