import { useState, useEffect } from 'react'

export function useTrainingStats() {
  const [completionData, setCompletionData] = useState({
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
        
        const response = await fetch('/api/feedback?weekNumber=1');
        let weekCompletion = 0;
        
        if (response.ok) {
          const { feedback } = await response.json();
          console.log('📊 Raw feedback data:', feedback); // DEBUG
          
          // Calculate completion percentage
          const totalRunningSessions = 4;
          const completedSessions = Array.isArray(feedback) ? 
            feedback.filter((f: any) => {
              const isCompleted = f.completed === 'yes';
              const isRunning = f.sessionType === 'running';
              console.log(`📋 Session ${f.sessionId}: completed=${f.completed}, type=${f.sessionType}, matches=${isCompleted && isRunning}`); // DEBUG
              return isCompleted && isRunning;
            }).length : 0;
          
          console.log(`✅ Completed running sessions: ${completedSessions}/${totalRunningSessions}`); // DEBUG
          weekCompletion = Math.round((completedSessions / totalRunningSessions) * 100);
          console.log(`📈 Week completion: ${weekCompletion}%`); // DEBUG
        }

        setCompletionData({
          daysToRace,
          weekCompletion,
          weekDistance: 22,
          predictedTime: "2:00:00"
        });
        
      } catch (error) {
        console.error('Error fetching completion data:', error);
        // Fallback code...
      }
    };

    fetchCompletionData();
  }, []);

  return completionData;
}