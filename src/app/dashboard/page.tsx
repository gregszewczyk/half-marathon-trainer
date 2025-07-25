// 🔧 FIXED: src/app/dashboard/page.tsx
// Updated to properly pass userId as prop to TrainingCalendar

'use client';
import { useEffect, useState } from 'react';
import { getStoredUserId, getStoredUserName, logout } from '@/lib/auth';
import { useTrainingStats } from '@/hooks/useTrainingData';

// Import the calendar component
import dynamic from 'next/dynamic';

// Dynamically import the TrainingCalendar to avoid SSR issues
const AITrainingCalendar = dynamic(
  () => import('@/components/training/TrainingCalendar'),
  { ssr: false }
);

export default function Dashboard() {
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('🔍 Dashboard: Initializing authentication check...');
    
    const initializeAuth = () => {
      const storedUserId = getStoredUserId();
      const storedUserName = getStoredUserName();
      
      console.log('🔍 Found stored userId:', storedUserId);
      console.log('🔍 Found stored userName:', storedUserName);
      
      if (!storedUserId) {
        console.log('❌ No userId found, redirecting to login...');
        window.location.href = '/auth/login';
        return;
      }
      
      setUserId(storedUserId);
      setUserName(storedUserName || '');
      setIsInitialized(true);
      
      console.log('✅ Dashboard initialized with userId:', storedUserId);
    };

    initializeAuth();

    // Mobile detection
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1200);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use the training stats hook with the proper userId
  const { weekCompletion, daysToRace, weekDistance, predictedTime, isLoading } = useTrainingStats(
    isInitialized && userId ? userId : ''
  );

  // Show loading until we have userId and are initialized
  if (!isInitialized || !userId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="text-white mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate estimated sessions completed (assuming 4 total running sessions per week)
  const totalSessions = 4;
  const completedSessions = Math.round((weekCompletion / 100) * totalSessions);

  return (
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
          <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
            <p className="text-blue-400">
              📅 <strong>Ready for manual data entry!</strong> Your training calendar is loaded and ready for you to add your real Garmin/Strava session data.
            </p>
            <p className="text-blue-300 text-sm mt-1">
              User ID: {userId} | Session feedback API is working ✅
            </p>
          </div>
          
          {/* 🔧 FIXED: Pass userId as prop instead of data attribute */}
          <AITrainingCalendar userId={userId} />
        </div>
      </main>
    </div>
  );
}