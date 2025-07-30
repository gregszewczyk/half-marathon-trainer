// 🔧 FIXED: Dashboard that doesn't show plan generation for existing users
// Only shows plan generation during actual onboarding process

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AITrainingCalendar from '@/components/training/TrainingCalendar';
import PlanGenerationStatus from '@/components/PlanGenerationStatus';

// Add session data to the interfaces
interface PlanStatus {
  planGenerated: boolean;
  onboardingComplete: boolean;
  checking: boolean;
  error: string | null;
  sessions: any[]; // 🔧 NEW: Store sessions in plan status
}

interface TrainingStats {
  completionPercentage: number;
  currentWeek: number;
  totalWeeks: number;
  totalSessions: number;
  completedSessions: number;
  loading: boolean;
}

// 🚀 NEW: Calculate current week based on completed weeks
async function calculateCurrentWeek(userId: string): Promise<number> {
  try {
    // Check weeks 1-12 to find the current week
    for (let week = 1; week <= 12; week++) {
      const response = await fetch(`/api/feedback?userId=${userId}&weekNumber=${week}`);
      if (response.ok) {
        const data = await response.json();
        const feedback = data.feedback || [];
        const completedCount = feedback.filter((f: any) => f.completed && f.completed !== '').length;
        
        // If this week has fewer than 4 completed sessions, it's the current week
        if (completedCount < 4) {
          console.log(`📅 Week ${week}: ${completedCount}/4 completed - this is current week`);
          return week;
        }
        console.log(`✅ Week ${week}: ${completedCount}/4 completed - moving to next week`);
      }
    }
    
    // If all weeks are complete, return week 12 (race week)
    return 12;
  } catch (error) {
    console.error('❌ Error calculating current week:', error);
    return 1; // Default to week 1 on error
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>({
    planGenerated: false,
    onboardingComplete: false,
    checking: true,
    error: null,
    sessions: [] // 🔧 NEW: Initialize empty sessions
  });
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({
    completionPercentage: 0,
    currentWeek: 1,
    totalWeeks: 12,
    totalSessions: 0,
    completedSessions: 0,
    loading: true
  });

  // 🔧 FIXED: Memoize session data to prevent re-renders
  const memoizedSessionData = useMemo(() => {
    console.log('🔄 Dashboard memoizing session data:', planStatus.sessions.length, 'sessions');
    return planStatus.sessions;
  }, [planStatus.sessions.length, planStatus.planGenerated]);

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      const storedUserId = localStorage.getItem('userId');
      const storedUserName = localStorage.getItem('userName');
      
      if (!storedUserId) {
        console.log('🔒 No userId found, redirecting to login');
        router.push('/auth/login');
        return;
      }
      
      setUserId(storedUserId);
      setUserName(storedUserName);
      console.log('✅ User authenticated:', storedUserId);
    };

    checkAuth();
  }, [router]);

  // 🔧 FIXED: Plan status check that stores session data
  useEffect(() => {
    const checkPlanStatus = async () => {
      if (!userId) return;

      try {
        console.log(`🔍 Checking plan status for user: ${userId}`);
        
        const response = await fetch(`/api/training-plan?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 🔧 NEW: Store sessions regardless of whether they exist
        const sessions = data.sessions || [];
        const hasExistingSessions = sessions.length > 0;
        
        if (hasExistingSessions) {
          console.log(`✅ User has ${sessions.length} existing sessions - showing calendar`);
          setPlanStatus({
            planGenerated: true,
            onboardingComplete: true,
            checking: false,
            error: null,
            sessions: sessions // 🔧 NEW: Store the loaded sessions
          });
          return;
        }

        // Handle users without sessions
        console.log(`📋 No sessions found - checking onboarding status`);
        setPlanStatus({
          planGenerated: false,
          onboardingComplete: data.onboardingComplete || false,
          checking: false,
          error: null,
          sessions: [] // 🔧 NEW: Empty sessions array
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error checking plan status:', errorMessage);
        
        setPlanStatus({
          planGenerated: false,
          onboardingComplete: false,
          checking: false,
          error: errorMessage,
          sessions: [] // 🔧 NEW: Empty sessions on error
        });
      }
    };

    if (userId) {
      checkPlanStatus();
    }
  }, [userId, userName]);

  // Load training stats when plan is ready
  useEffect(() => {
    const loadTrainingStats = async () => {
      if (!userId || !planStatus.planGenerated || planStatus.checking) return;

      try {
        console.log(`📈 Loading training stats for user: ${userId}`);
        
        // 🚀 NEW: Calculate current week based on completed weeks
        const currentWeek = await calculateCurrentWeek(userId);
        console.log(`📅 Calculated current week: ${currentWeek}`);
        
        // Get all sessions to calculate total weeks and current week stats
        const [feedbackResponse, sessionsResponse] = await Promise.all([
          fetch(`/api/feedback?userId=${userId}&weekNumber=${currentWeek}`),
          fetch(`/api/training-plan?userId=${userId}`)
        ]);
        
        let totalWeeks = 12; // Default fallback
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          const sessions = sessionsData.sessions || [];
          if (sessions.length > 0) {
            totalWeeks = Math.max(...sessions.map((s: any) => s.week));
            console.log(`📊 Calculated total weeks from sessions: ${totalWeeks}`);
          }
        }
        
        if (feedbackResponse.ok) {
          const data = await feedbackResponse.json();
          const feedback = Array.isArray(data.feedback) ? data.feedback : [];
          
          // Calculate basic stats
          const completedCount = feedback.filter((f: any) => f.completed && f.completed !== '').length;
          const totalRunningSessions = 4; // Assume 4 running sessions per week
          const completionPercentage = totalRunningSessions > 0 ? Math.round((completedCount / totalRunningSessions) * 100) : 0;
          
          setTrainingStats({
            completionPercentage,
            currentWeek, // 🚀 FIXED: Use calculated current week
            totalWeeks, // 🚀 NEW: Dynamic total weeks from sessions
            totalSessions: totalRunningSessions,
            completedSessions: completedCount,
            loading: false
          });
          
          console.log(`✅ Training stats loaded: ${completedCount}/${totalRunningSessions} (${completionPercentage}%)`);
        } else {
          // Set default stats if API fails
          setTrainingStats({
            completionPercentage: 0,
            currentWeek, // 🚀 FIXED: Use calculated current week even on API failure
            totalWeeks, // Use calculated total weeks even on feedback failure
            totalSessions: 4,
            completedSessions: 0,
            loading: false
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error loading training stats:', errorMessage);
        
        // Set default stats on error
        setTrainingStats({
          completionPercentage: 0,
          currentWeek: await calculateCurrentWeek(userId), // 🚀 FIXED: Calculate current week even on error
          totalWeeks: 12, // Default fallback on error
          totalSessions: 4,
          completedSessions: 0,
          loading: false
        });
      }
    };

    loadTrainingStats();
  }, [userId, planStatus.planGenerated, planStatus.checking]);

  // Handle plan generation completion
  const handlePlanReady = () => {
    setPlanStatus(prev => ({
      ...prev,
      planGenerated: true,
      checking: false
    }));
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    router.push('/auth/login');
  };

  // Show loading while checking authentication
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking plan status
  if (planStatus.checking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading your training plan...</p>
        </div>
      </div>
    );
  }

  // 🔧 FIXED: Only show plan generation if onboarding is NOT complete
  // This means: first-time users who haven't finished onboarding yet
  if (!planStatus.onboardingComplete) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8 bg-gray-800 rounded-lg border border-gray-600">
          <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-4">Setup Required</h2>
          <p className="text-gray-300 mb-6">
            Complete your training preferences to generate a personalized plan.
          </p>
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Complete Setup
          </button>
        </div>
      </div>
    );
  }

  // 🔧 FIXED: Only show plan generation if onboarding is complete but NO sessions exist
  // This handles the edge case where onboarding finished but plan generation failed
  if (planStatus.onboardingComplete && !planStatus.planGenerated && planStatus.sessions.length === 0) {
    return <PlanGenerationStatus userId={userId} onPlanReady={handlePlanReady} />;
  }

  // Show error state
  if (planStatus.error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8 bg-gray-800 rounded-lg border border-red-600">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-4">Plan Loading Error</h2>
          <p className="text-gray-300 mb-6">
            {planStatus.error}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/onboarding')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Restart Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show main dashboard with training calendar
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Training Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Welcome back, {userName || 'Runner'}! 
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Plan Status</div>
              <div className="text-green-400 font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                Active & Personalized
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Compact Training Stats */}
      <div className="px-6 py-3 bg-gray-800/30 border-t border-gray-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            
            {/* Compact Stats */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Week:</span>
              {trainingStats.loading ? (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="font-medium text-white">{trainingStats.currentWeek}/{trainingStats.totalWeeks}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Progress:</span>
              {trainingStats.loading ? (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="font-medium text-cyan-400">{trainingStats.completionPercentage}%</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Sessions:</span>
              {trainingStats.loading ? (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="font-medium text-white">{trainingStats.completedSessions}/{trainingStats.totalSessions}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Plan:</span>
              <span className="font-medium text-cyan-400">AI Custom</span>
            </div>

          </div>
        </div>
      </div>

      {/* Main Content - Training Calendar */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* 🔧 FIXED: Use memoized session data to prevent TrainingCalendar re-renders */}
          <AITrainingCalendar 
            userId={userId} 
            sessionData={memoizedSessionData}
            initialWeek={trainingStats.currentWeek} // 🚀 FIXED: Pass current week to calendar
            totalWeeks={trainingStats.totalWeeks} // 🚀 NEW: Pass dynamic total weeks to calendar
            key={`calendar-${userId}-${memoizedSessionData.length}`}
          />
        </div>
      </div>
    </div>
  );
}