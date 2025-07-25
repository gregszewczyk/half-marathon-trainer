// 🚀 Updated src/app/dashboard/page.tsx
// Dashboard with plan generation status checking - CLEAN TYPESCRIPT VERSION

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AITrainingCalendar from '@/components/training/TrainingCalendar';
import PlanGenerationStatus from '@/components/PlanGenerationStatus';

// Clean interfaces
interface PlanStatus {
  planGenerated: boolean;
  onboardingComplete: boolean;
  checking: boolean;
  error: string | null;
}

interface TrainingStats {
  completionPercentage: number;
  currentWeek: number;
  totalSessions: number;
  completedSessions: number;
  loading: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus>({
    planGenerated: false,
    onboardingComplete: false,
    checking: true,
    error: null
  });
  const [trainingStats, setTrainingStats] = useState<TrainingStats>({
    completionPercentage: 0,
    currentWeek: 1,
    totalSessions: 0,
    completedSessions: 0,
    loading: true
  });

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

  // Plan status check
  useEffect(() => {
    const checkPlanStatus = async () => {
      if (!userId) return;

      // Admin bypass - go straight to hardcoded plan
      const isAdminUser = userId === 'cmdhtwtil00000vg18swahirhu' || 
                         userName?.toLowerCase().includes('admin') ||
                         userId === 'default';
      
      if (isAdminUser) {
        console.log(`👑 Admin user detected: ${userId} - bypassing plan generation`);
        setPlanStatus({
          planGenerated: true, // Pretend plan is generated to show calendar
          onboardingComplete: true,
          checking: false,
          error: null
        });
        return;
      }

      try {
        console.log(`🔍 Checking plan status for user: ${userId}`);
        
        const response = await fetch(`/api/training-plan?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        setPlanStatus({
          planGenerated: data.planGenerated || false,
          onboardingComplete: data.onboardingComplete || false,
          checking: false,
          error: null
        });

        console.log(`📊 Plan status for ${userId}:`, {
          planGenerated: data.planGenerated,
          onboardingComplete: data.onboardingComplete,
          sessionsCount: data.sessions?.length || 0
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error checking plan status:', errorMessage);
        
        setPlanStatus({
          planGenerated: false,
          onboardingComplete: false,
          checking: false,
          error: errorMessage
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
        
        // Simple stats calculation from current week feedback
        const response = await fetch(`/api/feedback?userId=${userId}&weekNumber=1`);
        
        if (response.ok) {
          const data = await response.json();
          const feedback = Array.isArray(data.feedback) ? data.feedback : [];
          
          // Calculate basic stats
          const completedCount = feedback.filter((f: any) => f.completed === 'yes').length;
          const totalRunningSessions = 4; // Assume 4 running sessions per week
          const completionPercentage = totalRunningSessions > 0 ? Math.round((completedCount / totalRunningSessions) * 100) : 0;
          
          setTrainingStats({
            completionPercentage,
            currentWeek: 1, // Start with week 1
            totalSessions: totalRunningSessions,
            completedSessions: completedCount,
            loading: false
          });
          
          console.log(`✅ Training stats loaded: ${completedCount}/${totalRunningSessions} (${completionPercentage}%)`);
        } else {
          // Set default stats if API fails
          setTrainingStats({
            completionPercentage: 0,
            currentWeek: 1,
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
          currentWeek: 1,
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

  // Show plan generation status if not complete
  if (planStatus.checking || (!planStatus.planGenerated && planStatus.onboardingComplete)) {
    return <PlanGenerationStatus userId={userId} onPlanReady={handlePlanReady} />;
  }

  // Show onboarding redirect if not completed
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

      {/* Training Stats */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            
            {/* Completion Percentage */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Week Progress</h3>
                <div className="text-2xl">📈</div>
              </div>
              {trainingStats.loading ? (
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="text-3xl font-bold text-white">{trainingStats.completionPercentage}%</div>
              )}
              <p className="text-sm text-gray-400 mt-1">Sessions completed this week</p>
            </div>

            {/* Current Week */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Training Week</h3>
                <div className="text-2xl">📅</div>
              </div>
              <div className="text-3xl font-bold text-white">{trainingStats.currentWeek}/12</div>
              <p className="text-sm text-gray-400 mt-1">Current training week</p>
            </div>

            {/* Total Sessions */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Total Sessions</h3>
                <div className="text-2xl">🏃‍♂️</div>
              </div>
              {trainingStats.loading ? (
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="text-3xl font-bold text-white">{trainingStats.completedSessions}/{trainingStats.totalSessions}</div>
              )}
              <p className="text-sm text-gray-400 mt-1">Sessions completed overall</p>
            </div>

            {/* Plan Type */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Plan Type</h3>
                <div className="text-2xl">🤖</div>
              </div>
              <div className="text-lg font-bold text-cyan-400">AI Custom</div>
              <p className="text-sm text-gray-400 mt-1">Personalized for your goals</p>
            </div>

          </div>

          {/* Success Message - Different for Admin vs Generated Plans */}
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-black">
                  {userId === 'cmdhtwtil00000vg18swahirhu' || userName?.toLowerCase().includes('admin') || userId === 'default' ? '👑' : 'AI'}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-green-300">
                  {userId === 'cmdhtwtil00000vg18swahirhu' || userName?.toLowerCase().includes('admin') || userId === 'default' 
                    ? 'Admin Training Plan Active!' 
                    : 'Custom Plan Generated Successfully!'}
                </h3>
                <p className="text-sm text-green-200 mt-1">
                  {userId === 'cmdhtwtil00000vg18swahirhu' || userName?.toLowerCase().includes('admin') || userId === 'default'
                    ? 'Using your original hardcoded half-marathon plan with full AI coaching capabilities and session adjustments.'
                    : 'Your training plan has been personalized based on your goals, experience, and schedule preferences. The AI will continue to adapt your sessions based on your feedback.'}
                </p>
              </div>
            </div>
          </div>

          {/* Training Calendar */}
          <AITrainingCalendar userId={userId} />
        </div>
      </div>
    </div>
  );
}