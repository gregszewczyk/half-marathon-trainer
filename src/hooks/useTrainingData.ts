import { useState, useEffect } from 'react'

interface TrainingStats {
  daysToRace: number;
  weekCompletion: number;
  weekDistance: number;
  predictedTime: string;
}

export function useTrainingStats(userId: string = 'default'): TrainingStats {
  const [completionData, setCompletionData] = useState<TrainingStats>({
    daysToRace: 83,
    weekCompletion: 0,
    weekDistance: 22,
    predictedTime: "2:00:00"
  });

  useEffect(() => {
    const fetchCompletionData = async () => {
      try {
        const raceDate = new Date('2025-10-12');
        const today = new Date();
        const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Add userId parameter to the API call
        const response = await fetch(`/api/feedback?weekNumber=1&userId=${userId}`);
        let weekCompletion = 0;
        
        if (response.ok) {
          const { feedback } = await response.json();
          console.log(`📊 Raw feedback data for ${userId}:`, feedback); // DEBUG
          
          // Calculate completion percentage
          const totalRunningSessions = 4;
          const completedSessions = Array.isArray(feedback) ? 
            feedback.filter((f: any) => {
              const isCompleted = f.completed === 'yes';
              const isRunning = f.sessionType === 'running';
              console.log(`📋 Session ${f.sessionId} (${userId}): completed=${f.completed}, type=${f.sessionType}, matches=${isCompleted && isRunning}`); // DEBUG
              return isCompleted && isRunning;
            }).length : 0;
          
          console.log(`✅ Completed running sessions for ${userId}: ${completedSessions}/${totalRunningSessions}`); // DEBUG
          weekCompletion = Math.round((completedSessions / totalRunningSessions) * 100);
          console.log(`📈 Week completion for ${userId}: ${weekCompletion}%`); // DEBUG
        }

        setCompletionData({
          daysToRace,
          weekCompletion,
          weekDistance: 22,
          predictedTime: "2:00:00"
        });
        
      } catch (error) {
        console.error(`Error fetching completion data for ${userId}:`, error);
        // Keep default values on error
      }
    };

    fetchCompletionData();
  }, [userId]); // Re-fetch when userId changes

  return completionData;
}