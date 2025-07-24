'use client';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getStoredUserId, getStoredUserName, logout } from '@/lib/auth';
import AITrainingCalendar from '@/components/training/TrainingCalendar';
import { useTrainingStats } from '@/hooks/useTrainingData';

export default function Dashboard() {
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const storedUserId = getStoredUserId();
    const storedUserName = getStoredUserName();
    
    if (storedUserId) setUserId(storedUserId);
    if (storedUserName) setUserName(storedUserName);

    // Mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1200);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use the correct hook with the actual returned properties
  const { weekCompletion, daysToRace, weekDistance, predictedTime, isLoading } = useTrainingStats(userId);

  if (!userId) {
    return <div>Loading...</div>;
  }

  // Calculate estimated sessions completed (assuming 4 total running sessions per week)
  const totalSessions = 4;
  const completedSessions = Math.round((weekCompletion / 100) * totalSessions);

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-900">
        {/* Header with user info and logout */}
        <header className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🏃‍♂️ Half Marathon Trainer
              </h1>
              {userName && (
                <p className="text-gray-400">Welcome back, {userName}!</p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white font-semibold">
                  {isLoading ? 'Loading...' : `${weekCompletion}% Complete`}
                </div>
                <div className="text-gray-400 text-sm">
                  {isLoading ? 'Calculating...' : `${completedSessions}/${totalSessions} sessions`}
                </div>
                <div className="text-gray-400 text-xs">
                  {isLoading ? '' : `${daysToRace} days to race`}
                </div>
              </div>
              
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Training Calendar */}
        <main className="max-w-7xl mx-auto p-4">
          <div className={`${isMobile ? 'overflow-x-auto' : ''}`}>
            <AITrainingCalendar />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}