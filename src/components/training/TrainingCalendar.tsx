import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, MapPin, Activity, Brain, RotateCcw, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Enhanced interfaces for auto-adjustment system
interface Session {
  id: string;
  type: 'running' | 'gym' | 'rest';
  subType: 'easy' | 'tempo' | 'intervals' | 'long' | 'push' | 'pull' | 'legs';
  distance?: number;
  pace?: string;
  duration?: string;
  madeRunning?: boolean;
  time?: string;
  rpe?: number;
  completed?: boolean;
  warmup?: string;
  mainSet?: string;
  cooldown?: string;
  aiModified?: boolean;
  originalPace?: string;
  originalDistance?: number;
  targetRPE?: RPETarget;
}

interface AITrainingCalendarProps {
  userId?: string;
}

interface RPETarget {
  min: number;
  max: number;
  description: string;
  context: string;
}

interface WeekData {
  weekNumber: number;
  weeklySchedule: {
    [key: string]: Session[];
  };
}

interface TrainingAdjustment {
  action: 'increase' | 'decrease' | 'maintain';
  severity: 'minor' | 'moderate' | 'significant';
  nextSessionChanges: {
    paceAdjustment: number;
    distanceAdjustment: number;
    intensityAdjustment: 'easier' | 'harder' | 'same';
    sessionsToModify: number;
  };
  goalTimeUpdate?: {
    newGoalTime: string;
    confidence: number;
    improvement: number;
  };
  reasoning: string;
  modifications: string[];
}

interface CrossWeekModification {
  week: number;
  day: string;
  sessionId?: string;
  modificationType: 'pace_adjustment' | 'session_conversion' | 'intensity_reduction' | 'phase_extension' | 'made_running_skip';
  originalSession?: {
    type: string;
    subType: string;
    distance?: number;
    pace?: string;
  };
  newSession: {
    type: string;
    subType: string;
    distance?: number;
    pace?: string;
    reason: string;
  };
  explanation: string;
}

interface EnhancedAIResult {
  analysis: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  goalImpact: 'helps_sub2' | 'neutral_sub2' | 'hurts_sub2';
  recommendations: string[];
  crossWeekModifications: CrossWeekModification[];
  alternativeOptions?: Array<{
    title: string;
    description: string;
    pros: string[];
    cons: string[];
    modifications: CrossWeekModification[];
  }>;
  trainingPhaseAdjustment?: {
    currentPhase: string;
    recommendedPhase: string;
    reason: string;
  };
  // 🆕 NEW: Add weekTransitionSummary property
  weekTransitionSummary?: {
    completedWeekPerformance: string;
    upcomingWeekAdjustments: string;
    keyFocusAreas: string[];
  };
}

const AITrainingCalendar = ({ userId = 'default' }: AITrainingCalendarProps) => {

    console.log('🔍 TrainingCalendar initialized with userId:', userId);

  const [currentWeek, setCurrentWeek] = useState(1);
  const [goalTime, setGoalTime] = useState('2:00:00');
  const [predictedTime, setPredictedTime] = useState('2:00:00');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [difficultyValue, setDifficultyValue] = useState(5);
  const [rpeValue, setRpeValue] = useState(5);
  const [aiAdjustment, setAiAdjustment] = useState<TrainingAdjustment | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // Store modified sessions across all weeks
  const [modifiedSessions, setModifiedSessions] = useState<{[sessionId: string]: Session}>({});
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedSession, setDraggedSession] = useState<Session | null>(null);
  const [draggedFromDay, setDraggedFromDay] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [aiRebalancing, setAiRebalancing] = useState(false);
  const [rebalanceResult, setRebalanceResult] = useState<any>(null);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);

  const [showMotivationalAI, setShowMotivationalAI] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<string>('');

  // Enhanced AI state
  const [enhancedAiResult, setEnhancedAiResult] = useState<EnhancedAIResult | null>(null);
  const [showEnhancedAiModal, setShowEnhancedAiModal] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<number>(0);

  const [showWeekTransition, setShowWeekTransition] = useState(false);
const [weekAnalysisResult, setWeekAnalysisResult] = useState<EnhancedAIResult | null>(null);
const [weekTransitionLoading, setWeekTransitionLoading] = useState(false);

  const [originalGoalTime, setOriginalGoalTime] = useState('2:00:00');

  useEffect(() => {
  // Track if user manually changes goal or if AI updates it
  if (goalTime !== originalGoalTime) {
    console.log(`🎯 Goal time changed: ${originalGoalTime} → ${goalTime}`);
  }
}, [goalTime, originalGoalTime]);



  useEffect(() => {
    console.log('🎯 CompletedSessions state updated:', Array.from(completedSessions), 'for user:', userId);
  }, [completedSessions, userId]);

const formatGoalTimeForDisplay = (goalTimeString: string): string => {
  // Convert "2:00:00" to "sub-2:00" or "1:55:00" to "sub-1:55"
  const parts = goalTimeString.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0] || '0');
    const minutes = parseInt(parts[1]|| '1');
    if (hours === 1) {
      return `sub-1:${minutes.toString().padStart(2, '0')}`;
    } else if (hours === 2) {
      return `sub-2:${minutes.toString().padStart(2, '0')}`;
    }
  }
  return `sub-${goalTimeString.substring(0, 4)}`;
};

  // Add this after your existing state variables
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 1200);
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  return () => window.removeEventListener('resize', checkMobile);
}, []);

  // Time conversion functions
  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    const s = parseInt(parts[2] || '0', 10);
    if (isNaN(h) || isNaN(m) || isNaN(s)) return 0;
    return h * 3600 + m * 60 + s;
  };

  const paceToSeconds = (pace: string): number => {
    const parts = pace.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0] || '0', 10);
    const seconds = parseInt(parts[1] || '0', 10);
    return minutes * 60 + seconds;
  };

  const secondsToPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePaceZones = (goalTime: string) => {
    const totalSeconds = timeToSeconds(goalTime);
    const targetPaceSeconds = Math.floor(totalSeconds / 21.1);
    const targetMinutes = Math.floor(targetPaceSeconds / 60);
    const targetSecondsRem = targetPaceSeconds % 60;
    const targetPace = `${targetMinutes}:${targetSecondsRem.toString().padStart(2, '0')}`;

    return {
      target: targetPace,
      easy: secondsToPace(Math.floor(targetPaceSeconds * 1.15)),
      tempo: secondsToPace(Math.floor(targetPaceSeconds * 0.92)),
      interval: secondsToPace(Math.floor(targetPaceSeconds * 0.82)),
      fiveK: secondsToPace(Math.floor(targetPaceSeconds * 0.78))
    };
  };

const AITrainingCalendar = ({ userId = 'default' }: AITrainingCalendarProps) => {
  // Remove the old URL parameter detection code and replace with prop usage
  console.log('🔍 TrainingCalendar initialized with userId:', userId);
}

  const calculateDuration = (distance: number, pace: string): number => {
    const paceSeconds = paceToSeconds(pace);
    const totalSeconds = (distance * paceSeconds) + 300 + 600;
    return Math.round(totalSeconds / 60);
  };

  const getTargetRPE = (sessionType: string): RPETarget => {
  const rpeTargets: { [key: string]: RPETarget } = {
    'easy': {
      min: 3,
      max: 5,
      description: 'Conversational pace',
      context: 'You should be able to chat comfortably during this run'
    },
    'tempo': {
      min: 6,
      max: 7,
      description: 'Comfortably hard',
      context: 'Sustainable effort - challenging but controlled'
    },
    'intervals': {
      min: 8,
      max: 9,
      description: 'Near maximum effort',
      context: 'High intensity - should feel very challenging'
    },
    'long': {
      min: 4,
      max: 6,
      description: 'Progressively harder',
      context: 'Start easy, build to moderate effort by the end'
    }
  };

  return rpeTargets[sessionType] ?? rpeTargets['easy']!;
};

  const getWeekData = (weekNum: number): WeekData => {
    const paceZones = calculatePaceZones(goalTime);
    
    const weeklyPlans = {
      1: { easyDistance: 5, tempoDistance: 5, intervalDistance: 4, longDistance: 8 },
      2: { easyDistance: 6, tempoDistance: 6, intervalDistance: 5, longDistance: 10 },
      3: { easyDistance: 7, tempoDistance: 7, intervalDistance: 6, longDistance: 12 },
      4: { easyDistance: 5, tempoDistance: 5, intervalDistance: 5, longDistance: 10 },
      5: { easyDistance: 6, tempoDistance: 7, intervalDistance: 6, longDistance: 14 },
      6: { easyDistance: 7, tempoDistance: 8, intervalDistance: 7, longDistance: 16 },
      7: { easyDistance: 8, tempoDistance: 9, intervalDistance: 8, longDistance: 18 },
      8: { easyDistance: 6, tempoDistance: 7, intervalDistance: 6, longDistance: 16 },
      9: { easyDistance: 8, tempoDistance: 10, intervalDistance: 10, longDistance: 20 },
      10: { easyDistance: 6, tempoDistance: 8, intervalDistance: 8, longDistance: 18 },
      11: { easyDistance: 5, tempoDistance: 6, intervalDistance: 6, longDistance: 12 },
      12: { easyDistance: 3, tempoDistance: 4, intervalDistance: 3, longDistance: 8 }
    };

    const plan = weeklyPlans[weekNum as keyof typeof weeklyPlans] || weeklyPlans[1];

// ✅ Better approach - check by stored user name/email
const storedUserName = localStorage.getItem('userName') || '';
const isAdminUser = storedUserName.toLowerCase().includes('admin') || 
                   userId === 'default' || 
                   userId === 'cmdhtwtil00000vg18swahirhu';
const showGymSessions = userId === null || isAdminUser;

    const baseSchedule: { [key: string]: Session[] } = {
    Monday: [
      // Only show gym session for default user
      ...(showGymSessions ? [{ 
        id: `mon-gym-${weekNum}`, 
        type: 'gym' as const, 
        subType: 'push' as const, 
        duration: '60 min', 
        time: '04:30' 
      }] : []),
      { 
        id: `mon-run-${weekNum}`, 
        type: 'running' as const, 
        subType: 'easy' as const, 
        distance: plan.easyDistance, 
        pace: paceZones.easy, 
        time: '17:00', 
        madeRunning: showGymSessions, // Only for default user
        warmup: '10 min easy jog + dynamic stretching',
        mainSet: `${plan.easyDistance}km steady at easy pace${showGymSessions ? ' with MadeRunning' : ''}`,
        cooldown: '5 min walk + stretching',
        targetRPE: getTargetRPE('easy')
      }
    ],
    Tuesday: showGymSessions ? [
      { 
        id: `tue-gym-${weekNum}`, 
        type: 'gym' as const, 
        subType: 'pull' as const, 
        duration: '60 min', 
        time: '04:30' 
      }
    ] : [
      // For non-default users, show rest day instead of gym
      { 
        id: `tue-rest-${weekNum}`, 
        type: 'rest' as const, 
        subType: 'easy' as const
      }
    ],
    Wednesday: [
      { 
        id: `wed-run-${weekNum}`, 
        type: 'running' as const, 
        subType: 'tempo' as const, 
        distance: plan.tempoDistance, 
        pace: paceZones.tempo, 
        time: '05:00', 
        madeRunning: showGymSessions, // Only for default user
        warmup: '15 min easy + 4x100m strides',
        mainSet: `${Math.round(plan.tempoDistance * 0.6)}km tempo at threshold pace${showGymSessions ? ' with MadeRunning' : ''}`,
        cooldown: '10 min easy jog + stretching',
        targetRPE: getTargetRPE('tempo')
      },
      // Only show gym session for default user
      ...(showGymSessions ? [{ 
        id: `wed-gym-${weekNum}`, 
        type: 'gym' as const, 
        subType: 'legs' as const, 
        duration: '60 min', 
        time: '06:00' 
      }] : [])
    ],
    Thursday: [
      // Only show gym session for default user
      ...(showGymSessions ? [{ 
        id: `thu-gym-${weekNum}`, 
        type: 'gym' as const, 
        subType: 'push' as const, 
        duration: '60 min', 
        time: '04:30' 
      }] : []),
      { 
        id: `thu-run-${weekNum}`, 
        type: 'running' as const, 
        subType: 'easy' as const, 
        distance: plan.intervalDistance, 
        pace: paceZones.easy, 
        time: '18:00', 
        madeRunning: false, // This one is solo for everyone
        warmup: '10 min easy jog + dynamic stretching',
        mainSet: `${plan.intervalDistance}km steady at easy pace (solo)`,
        cooldown: '5 min walk + stretching',
        targetRPE: getTargetRPE('easy')
      }
    ],
    Friday: showGymSessions ? [
      { 
        id: `fri-gym-${weekNum}`, 
        type: 'gym' as const, 
        subType: 'pull' as const, 
        duration: '60 min', 
        time: '04:30' 
      }
    ] : [
      // For non-default users, show rest day instead of gym
      { 
        id: `fri-rest-${weekNum}`, 
        type: 'rest' as const, 
        subType: 'easy' as const
      }
    ],
    Saturday: [
      // Only show gym session for default user
      ...(showGymSessions ? [{ 
        id: `sat-gym-${weekNum}`, 
        type: 'gym' as const, 
        subType: 'legs' as const, 
        duration: '60 min', 
        time: '06:00' 
      }] : []),
      { 
        id: `sat-run-${weekNum}`, 
        type: 'running' as const, 
        subType: 'long' as const, 
        distance: plan.longDistance, 
        pace: paceZones.easy, 
        time: '09:00', 
        madeRunning: showGymSessions, // Only for default user
        warmup: '15 min easy jog + dynamic stretching',
        mainSet: `${plan.longDistance}km progressive long run${showGymSessions ? ' with MadeRunning' : ''}`,
        cooldown: '10 min walk + full stretching routine',
        targetRPE: getTargetRPE('long')
      }
    ],
    Sunday: [{ 
      id: `sun-rest-${weekNum}`, 
      type: 'rest' as const, 
      subType: 'easy' as const
    }]
  };

    const modifiedSchedule: { [key: string]: Session[] } = {};
    Object.keys(baseSchedule).forEach(day => {
      const daySessions = baseSchedule[day];
      if (daySessions) {
        modifiedSchedule[day] = daySessions.map(session => {
          const modified = modifiedSessions[session.id];
          return modified || session;
        });
      }
    });

    return {
      weekNumber: weekNum,
      weeklySchedule: modifiedSchedule
    };
  };

const checkWeekCompletionAndAnalyze = useCallback(async () => {
  if (!userId) return;
  
  // Only analyze when week completion reaches 100%
  const completionPercentage = getWeekCompletionPercentage();
  
  if (completionPercentage === 100 && currentWeek < 12) {
    console.log(`🧠 Week ${currentWeek} completed (100%)! Triggering proactive AI analysis...`);
    
    // Small delay to ensure all feedback is processed
    setTimeout(() => {
      triggerProactiveWeekAnalysis();
    }, 2000);
  }
}, [currentWeek, userId, completedSessions]);

const triggerProactiveWeekAnalysis = async () => {
  if (weekTransitionLoading || currentWeek >= 12) return;
  
  setWeekTransitionLoading(true);
  
  try {
    console.log(`🤖 Starting proactive analysis for Week ${currentWeek} → Week ${currentWeek + 1}`);
    
    // Get all feedback from the completed week
    const weekFeedback = await getWeekFeedback(currentWeek);
    const recentFeedback = await getRecentFeedback();
    const fitnessTrajectory = assessFitnessTrajectory(recentFeedback);
    
    // Calculate week performance metrics
    const weekMetrics = calculateWeekMetrics(weekFeedback);
    
    const response = await fetch('/api/ai/proactive-week-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        completedWeek: currentWeek,
        upcomingWeek: currentWeek + 1,
        weekFeedback,
        weekMetrics,
        fitnessTrajectory,
        goalTime,
        userId,
        currentPhase: getCurrentTrainingPhase(currentWeek),
        weeksRemaining: 12 - currentWeek
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get proactive week analysis');
    }

    const data = await response.json();
    setWeekAnalysisResult(data.weekAnalysis);
    setShowWeekTransition(true);
    
    console.log(`✅ Proactive analysis complete for Week ${currentWeek + 1}:`, data.weekAnalysis);
    
  } catch (error) {
    console.error('❌ Proactive week analysis failed:', error);
    
    // Fallback analysis
    setWeekAnalysisResult({
      analysis: `Congratulations on completing Week ${currentWeek}! Based on your consistency, Week ${currentWeek + 1} will continue building your fitness toward your ${formatGoalTimeForDisplay(goalTime)} goal.`,
      impact: 'positive',
      confidence: 0.75,
      goalImpact: 'helps_sub2',
      recommendations: [
        `Great progress through Week ${currentWeek}! Keep maintaining this consistency.`,
        `Week ${currentWeek + 1} will build on your current fitness level.`,
        'Focus on recovery between sessions to maintain quality training.',
        'Trust the process - you\'re building toward race day success!'
      ],
      crossWeekModifications: [],
      weekTransitionSummary: {
        completedWeekPerformance: 'solid_progress',
        upcomingWeekAdjustments: 'maintain_progression',
        keyFocusAreas: ['consistency', 'recovery', 'pacing']
      }
    });
    setShowWeekTransition(true);
  } finally {
    setWeekTransitionLoading(false);
  }
};

const getWeekFeedback = async (weekNumber: number) => {
  try {
    const response = await fetch(`/api/feedback?weekNumber=${weekNumber}&userId=${userId}&all=true`);
    if (response.ok) {
      const { feedback } = await response.json();
      return Array.isArray(feedback) ? feedback : [];
    }
  } catch (error) {
    console.error('Error fetching week feedback:', error);
  }
  return [];
};

const calculateWeekMetrics = (weekFeedback: any[]) => {
  if (!weekFeedback || weekFeedback.length === 0) {
    return {
      completionRate: 0,
      averageRPE: 5,
      averageDifficulty: 5,
      paceConsistency: 'unknown',
      sessionTypes: {},
      totalSessions: 0,
      feelingDistribution: {}
    };
  }
  
  const runningSessions = weekFeedback.filter(f => f.sessionType === 'running');
  const completedSessions = runningSessions.filter(f => f.completed === 'yes');
  
  const averageRPE = runningSessions.reduce((sum, f) => sum + (f.rpe || 5), 0) / runningSessions.length;
  const averageDifficulty = runningSessions.reduce((sum, f) => sum + (f.difficulty || 5), 0) / runningSessions.length;
  
  // Group by session type
  const sessionTypes = runningSessions.reduce((acc: any, f) => {
    const type = f.sessionSubType || 'unknown';
    if (!acc[type]) acc[type] = { count: 0, avgRPE: 0, completed: 0 };
    acc[type].count++;
    acc[type].avgRPE = (acc[type].avgRPE + (f.rpe || 5)) / acc[type].count;
    if (f.completed === 'yes') acc[type].completed++;
    return acc;
  }, {});
  
  // Feeling distribution
  const feelingDistribution = runningSessions.reduce((acc: any, f) => {
    const feeling = f.feeling || 'unknown';
    acc[feeling] = (acc[feeling] || 0) + 1;
    return acc;
  }, {});
  
  return {
    completionRate: completedSessions.length / runningSessions.length,
    averageRPE: Math.round(averageRPE * 10) / 10,
    averageDifficulty: Math.round(averageDifficulty * 10) / 10,
    sessionTypes,
    totalSessions: runningSessions.length,
    feelingDistribution,
    paceConsistency: calculatePaceConsistency(completedSessions)
  };
};

const getCurrentTrainingPhase = (week: number): string => {
  if (week <= 4) return 'base_building';
  if (week <= 8) return 'build_phase';
  if (week <= 10) return 'peak_phase';
  return 'taper_phase';
};

const calculatePaceConsistency = (sessions: any[]): string => {
  const pacesWithTargets = sessions.filter(s => s.actualPace && s.plannedPace);
  if (pacesWithTargets.length === 0) return 'insufficient_data';
  
  const paceVariations = pacesWithTargets.map(s => {
    const actual = paceToSeconds(s.actualPace);
    const planned = paceToSeconds(s.plannedPace);
    return Math.abs(actual - planned);
  });
  
  const avgVariation = paceVariations.reduce((sum, v) => sum + v, 0) / paceVariations.length;
  
  if (avgVariation < 10) return 'excellent';
  if (avgVariation < 20) return 'good';
  if (avgVariation < 30) return 'moderate';
  return 'needs_improvement';
};

  const [weekData, setWeekData] = useState<WeekData>(() => getWeekData(currentWeek));

useEffect(() => {
  setWeekData(getWeekData(currentWeek));
}, [currentWeek, goalTime, modifiedSessions, userId]); // Add userId here

useEffect(() => {
  const loadCompletedSessions = async () => {
    if (!userId) {
      console.log('⏳ Waiting for userId to be determined...');
      return;
    }

    try {
      console.log(`🔄 Loading completed sessions for user: ${userId}, week: ${currentWeek}`);
      
      const response = await fetch(`/api/feedback?weekNumber=${currentWeek}&userId=${userId}`);
      if (response.ok) {
        const { feedback } = await response.json();
        const completed = new Set<string>();
        
        if (Array.isArray(feedback)) {
          feedback.forEach((f: any) => {
            if (f.completed === 'yes') {
              completed.add(f.sessionId);
            }
          });
        }
        
        setCompletedSessions(completed);
        console.log(`📋 FINAL: Loaded ${completed.size} completed sessions for week ${currentWeek}, user: ${userId}`);
        
        // Check for week completion after loading sessions
        if (completed.size > 0) {
          checkWeekCompletionAndAnalyze();
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading completed sessions:', errorMessage);
    }
  };
  
  loadCompletedSessions();
}, [currentWeek, userId]); // ✅ REMOVED checkWeekCompletionAndAnalyze

useEffect(() => {
  // Debug: Log both sets of IDs to compare
  if (userId && currentWeek === 1) {
    console.log('🔍 DEBUG: Current calendar session IDs for week 1:');
    
    // Get current week data to see what IDs the calendar is generating
    const debugWeekData = getWeekData(1);
    Object.keys(debugWeekData.weeklySchedule).forEach(day => {
      const daySessions = debugWeekData.weeklySchedule[day] || [];
      daySessions.forEach(session => {
        if (session.type === 'running') {
          console.log(`📅 ${day}: ${session.id} (${session.subType})`);
        }
      });
    });
    
    console.log('🔍 DEBUG: Completed session IDs from database:');
    completedSessions.forEach(id => {
      console.log(`✅ Completed: ${id}`);
    });
    
    console.log('🔍 DEBUG: ID comparison:');
    const calendarRunningIds = Object.values(debugWeekData.weeklySchedule)
      .flat()
      .filter(s => s.type === 'running')
      .map(s => s.id);
      
    calendarRunningIds.forEach(calendarId => {
      const isCompleted = completedSessions.has(calendarId);
      console.log(`${isCompleted ? '✅' : '❌'} ${calendarId} - ${isCompleted ? 'MATCHED' : 'NOT FOUND in database'}`);
    });
  }
}, [userId, currentWeek, completedSessions]);

// 🔍 ALSO: Check what's actually in your database
// Add this function to manually check your database
const debugDatabaseContent = async () => {
  if (!userId) return;
  
  try {
    console.log('🔍 DEBUG: Fetching ALL feedback for user:', userId);
    const response = await fetch(`/api/feedback?userId=${userId}&all=true`);
    if (response.ok) {
      const { feedback } = await response.json();
      console.log('📊 DEBUG: All feedback in database:', feedback);
      
      if (Array.isArray(feedback)) {
        feedback.forEach((f: any) => {
          console.log(`📝 DB Record: sessionId="${f.sessionId}", completed="${f.completed}", week=${f.weekNumber}, type=${f.sessionType}`);
        });
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('DEBUG: Error fetching all feedback:', errorMessage);
  }
};

  // Enhanced AI functions
 const getRecentFeedback = async () => {
    try {
      const response = await fetch(`/api/feedback?weekNumber=${currentWeek}&recent=5&userId=${userId}`);
      if (response.ok) {
        const { feedback } = await response.json();
        return Array.isArray(feedback) ? feedback : [];
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error fetching recent feedback:', errorMessage);
    }
    return [];
  };

  const assessFitnessTrajectory = (recentFeedback: any[]) => {
    if (!recentFeedback || recentFeedback.length === 0) return 'unknown';
    
    const avgRPE = recentFeedback.reduce((sum, f) => sum + (f.rpe || 5), 0) / recentFeedback.length;
    const completionRate = recentFeedback.filter(f => f.completed === 'yes').length / recentFeedback.length;
    
    if (avgRPE <= 4 && completionRate >= 0.8) return 'ahead';
    if (avgRPE >= 7 || completionRate < 0.5) return 'behind';
    if (avgRPE >= 8 || completionRate < 0.3) return 'way_behind';
    return 'on_track';
  };

  const applyCrossWeekModifications = async (modifications: CrossWeekModification[], alternativeIndex?: number) => {
    try {
      console.log(`🤖 Applying ${modifications.length} cross-week modifications`);
      
      for (const mod of modifications) {
        console.log(`📅 Week ${mod.week} ${mod.day}: ${mod.originalSession?.subType} → ${mod.newSession.subType}`);
        console.log(`   Reason: ${mod.newSession.reason}`);
      }
      
      // Save AI modifications to database for tracking
      await fetch('/api/ai/cross-week-modifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentWeek,
          modifications,
          selectedAlternative: alternativeIndex,
          appliedAt: new Date().toISOString()
        }),
      });

      setShowEnhancedAiModal(false);
      setEnhancedAiResult(null);
      
      // Show success notification
      showNotification('🤖 AI has optimized your future training for sub-2:00 goal!', 'success');
      
    } catch (error) {
      console.error('Error applying cross-week modifications:', error);
      showNotification('Failed to apply AI modifications', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 ${
      type === 'success' ? 'bg-green-900 border-green-400' : 'bg-red-900 border-red-400'
    } border rounded-lg p-4 shadow-lg`;
    notification.innerHTML = `
      <div class="flex items-center gap-2 ${type === 'success' ? 'text-green-300' : 'text-red-300'}">
        <div class="w-5 h-5 ${type === 'success' ? 'bg-green-400' : 'bg-red-400'} rounded-full flex items-center justify-center text-xs font-bold text-black">
          ${type === 'success' ? '✓' : '✗'}
        </div>
        <span class="font-bold">${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 4000);
  };

const getMotivationalAIFeedback = async (sessionData: any, feedbackData: any): Promise<string> => {
  try {
    const response = await fetch('/api/ai/motivational-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionData,
        feedbackData,
        currentWeek,
        goalTime,
        userId,
        completionPercentage: getWeekCompletionPercentage()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI feedback');
    }

    const result = await response.json();
    return result.motivationalFeedback;
  } catch (error) {
    console.error('Motivational AI feedback failed:', error);
    
    // 🆕 NEW: Fallback motivational messages when AI is unavailable
    const fallbackMessages = [
      `Great work completing your ${sessionData.type} session! You're ${getWeekCompletionPercentage()}% through this week's training.`,
      `Excellent consistency! Every session brings you closer to your ${formatGoalTimeForDisplay(goalTime)} goal.`,
      `Nice job staying on track! Your dedication to the training plan is showing.`,
      `Well done! Remember, consistency is key to achieving your half marathon goals.`,
      `Strong effort today! You're building the fitness needed for race day success.`
    ];
    
    return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)] ?? '';
  }
};

  const analyzeScheduleRebalancingEnhanced = async (session: Session | null, fromDay: string, toDay: string) => {
    if (!session) return;
    
    setAiRebalancing(true);
    
    try {
      // Get recent feedback for context
      const recentFeedback = await getRecentFeedback();
      const fitnessTrajectory = assessFitnessTrajectory(recentFeedback);
      
      const response = await fetch('/api/ai/enhanced-rebalance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          sessionType: session.type,
          sessionSubType: session.subType || 'unknown',
          fromDay,
          toDay,
          distance: session.distance || 0,
          currentWeek,
          goalTime,
          weeklySchedule: weekData.weeklySchedule,
          recentFeedback,
          fitnessTrajectory
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get enhanced AI analysis');
      }

      const data = await response.json();
      setEnhancedAiResult(data.enhancedAnalysis);
      setShowEnhancedAiModal(true);
      
      console.log('🧠 Enhanced AI Analysis:', data.enhancedAnalysis);
    } catch (error) {
      console.error('Enhanced AI Analysis Error:', error);
      
      // Fallback to basic analysis
      setEnhancedAiResult({
        analysis: 'Schedule change completed. Monitoring recommended for optimal sub-2:00 preparation.',
        impact: 'neutral',
        confidence: 0.7,
        goalImpact: 'neutral_sub2',
        recommendations: [
          'Monitor your training response over the next few sessions',
          'Focus on consistent pacing to maintain sub-2:00 trajectory',
          'Prioritize recovery between intense training days'
        ],
        crossWeekModifications: [],
      });
      setShowEnhancedAiModal(true);
    } finally {
      setAiRebalancing(false);
    }
  };

  // DRAG AND DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, session: Session, dayKey: string) => {
    if (session.type === 'rest') return;
    
    setDraggedSession(session);
    setDraggedFromDay(dayKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
    target.style.transform = 'scale(0.95)';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
    setDragOverDay(null);
  };

  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayKey);
  };

  const handleDragLeave = (e: React.DragEvent, dayKey: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverDay(null);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent, toDay: string) => {
    e.preventDefault();
    setDragOverDay(null);
    
    if (!draggedSession || !draggedFromDay || toDay === draggedFromDay) {
      setDraggedSession(null);
      setDraggedFromDay(null);
      return;
    }

    // Update the schedule immediately
    const newSchedule = { ...weekData.weeklySchedule };
    const fromArray = [...(newSchedule[draggedFromDay] ?? [])];
    const sessionIndex = fromArray.findIndex(s => s.id === draggedSession.id);
    
    if (sessionIndex > -1) {
      const removedSessions = fromArray.splice(sessionIndex, 1);
      const movedSession = removedSessions[0];
      
      if (movedSession) {
        newSchedule[draggedFromDay] = fromArray;
        
        if (!newSchedule[toDay]) {
          newSchedule[toDay] = [];
        }
        newSchedule[toDay].push(movedSession);
        
        // Update weekData with new schedule
        setWeekData(prev => ({
          ...prev,
          weeklySchedule: newSchedule
        }));
        
        // Trigger enhanced AI analysis for running sessions
        if (draggedSession.type === 'running') {
          await analyzeScheduleRebalancingEnhanced(draggedSession, draggedFromDay, toDay);
        }
      }
    }

    setDraggedSession(null);
    setDraggedFromDay(null);
  }, [draggedSession, draggedFromDay, weekData.weeklySchedule, currentWeek, goalTime]);

  // AI ADJUSTMENT FUNCTIONS
 const getAIAdjustment = async (sessionData: any): Promise<TrainingAdjustment> => {
  const response = await fetch('/api/ai/auto-adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      sessionData,
      currentGoalTime: goalTime,
      predictedTime: predictedTime,
      currentWeek,
      weekData: weekData.weeklySchedule,
      // NEW: Tell AI to be ambitious with goal updates
      goalUpdatePreference: 'ambitious', // 'ambitious' | 'conservative' | 'adaptive'
      allowFasterGoals: true
    })
  });

  const result = await response.json();
  return result.adjustment;
};

  const applyAIAdjustments = (adjustment: TrainingAdjustment) => {
    if (adjustment.action === 'maintain') return;

    const sessionsToModify = adjustment.nextSessionChanges.sessionsToModify;
    const paceAdjustment = adjustment.nextSessionChanges.paceAdjustment;
    const distanceAdjustment = adjustment.nextSessionChanges.distanceAdjustment;
    
    const newModifiedSessions = { ...modifiedSessions };
    let modifiedCount = 0;

    for (let week = currentWeek; week <= Math.min(12, currentWeek + 3) && modifiedCount < sessionsToModify; week++) {
      const weekData = getWeekData(week);
      
      Object.keys(weekData.weeklySchedule).forEach(day => {
        if (modifiedCount >= sessionsToModify) return;
        
        const daySessions = weekData.weeklySchedule[day];
        if (!daySessions) return;
        
        daySessions.forEach(session => {
          if (session.type === 'running' && modifiedCount < sessionsToModify) {
            if (selectedSession && session.id === selectedSession.id) {
              console.log(`🚫 Skipping current session: ${session.id}`);
              return;
            }

            if (week === currentWeek) {
              console.log(`⏭️ Future session in current week: ${session.id}`);
            }
            
            console.log(`🤖 Modifying future session: ${session.id}`);
            
            const currentPaceSeconds = paceToSeconds(session.pace || '6:00');
            const newPaceSeconds = Math.max(240, currentPaceSeconds + paceAdjustment);
            const newDistance = Math.max(1, (session.distance || 5) + distanceAdjustment);
            
            const modifiedSession: Session = {
              ...session,
              pace: secondsToPace(newPaceSeconds),
              distance: newDistance,
              aiModified: true,
              originalPace: session.originalPace || session.pace || '6:00',
              originalDistance: session.originalDistance || session.distance || 5,
              mainSet: `${newDistance}km at ${adjustment.nextSessionChanges.intensityAdjustment} pace (AI: ${adjustment.reasoning})`
            };
            
            newModifiedSessions[session.id] = modifiedSession;
            modifiedCount++;
          }
        });
      });
    }

    setModifiedSessions(newModifiedSessions);

    if (adjustment.goalTimeUpdate && adjustment.goalTimeUpdate.confidence > 0.8) {
      setPredictedTime(adjustment.goalTimeUpdate.newGoalTime);
        const currentGoalSeconds = timeToSeconds(goalTime);
  const newGoalSeconds = timeToSeconds(adjustment.goalTimeUpdate.newGoalTime);

  if (newGoalSeconds < currentGoalSeconds || adjustment.goalTimeUpdate.confidence > 0.9) {
    setGoalTime(adjustment.goalTimeUpdate.newGoalTime);
    setPredictedTime(adjustment.goalTimeUpdate.newGoalTime);
    console.log(`🚀 AI updated goal time to: ${adjustment.goalTimeUpdate.newGoalTime} (${adjustment.goalTimeUpdate.improvement > 0 ? 'FASTER' : 'safer'} target)`);
    
    // Show goal update notification
    showNotification(
      `🎯 AI updated your goal to ${formatGoalTimeForDisplay(adjustment.goalTimeUpdate.newGoalTime)}! You're performing better than expected.`,
      'success'
    );
  } else {
    setPredictedTime(adjustment.goalTimeUpdate.newGoalTime);
    console.log(`🤖 AI updated predicted time to: ${adjustment.goalTimeUpdate.newGoalTime}`);
  }
      console.log(`🤖 AI updated predicted time to: ${adjustment.goalTimeUpdate.newGoalTime}`);
    }

    console.log(`🤖 AI modified ${modifiedCount} FUTURE sessions (excluding current session: ${selectedSession?.id})`);
  };

  // FEEDBACK SUBMISSION
const handleFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const feedback = {
      completed: formData.get('completed') as string,
      actualPace: formData.get('actualPace') as string | null,
      difficulty: difficultyValue,
      rpe: rpeValue,
      feeling: formData.get('feeling') as string,
      comments: formData.get('comments') as string | null
    };

    try {
      if (!selectedSession) {
        throw new Error('No session selected');
      }

      if (completedSessions.has(selectedSession.id)) {
        const confirmOverwrite = window.confirm(
          'You have already submitted feedback for this session. Do you want to update it?'
        );
        if (!confirmOverwrite) {
          setShowFeedback(false);
          return;
        }
      }

      console.log('💾 Saving feedback for session:', selectedSession.id);
      
      const dayMap: { [key: string]: string } = {
        'mon': 'monday',
        'tue': 'tuesday', 
        'wed': 'wednesday',
        'thu': 'thursday',
        'fri': 'friday',
        'sat': 'saturday',
        'sun': 'sunday'
      };
      
      const sessionIdParts = selectedSession.id.split('-');
      const dayPrefix = sessionIdParts.length > 0 ? sessionIdParts[0] : '';
      const day = dayPrefix && dayMap[dayPrefix] ? dayMap[dayPrefix] : 'unknown';
      
      const feedbackData = {
        sessionId: selectedSession.id,
        weekNumber: currentWeek,
        day: day,
        sessionType: selectedSession.type,
        sessionSubType: selectedSession.subType,
        plannedDistance: selectedSession.distance,
        plannedPace: selectedSession.pace,
        plannedTime: selectedSession.time,
        completed: feedback.completed,
        actualPace: feedback.actualPace,
        difficulty: feedback.difficulty,
        rpe: feedback.rpe,
        feeling: feedback.feeling,
        comments: feedback.comments
      };
      
      const feedbackResponse = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...feedbackData,
          userId: userId  // Use prop userId here
        })
      });

      if (!feedbackResponse.ok) {
        const errorData = await feedbackResponse.json();
        throw new Error(`Failed to save feedback: ${errorData.error || 'Unknown error'}`);
      }

      const result = await feedbackResponse.json();
      console.log('✅ Feedback saved to database:', result);
      console.log('🎯 TrainingCalendar current userId:', userId);

    // Show success message
    const successPanel = document.createElement('div');
    successPanel.className = 'fixed top-4 right-4 z-50 bg-green-900 border border-green-400 rounded-lg p-4 shadow-lg';
    successPanel.innerHTML = `
      <div class="flex items-center gap-2 text-green-300">
        <div class="w-5 h-5 bg-green-400 rounded-full flex items-center justify-center text-xs font-bold text-black">✓</div>
        <span class="font-bold">Feedback Saved!</span>
      </div>
      <p class="text-sm text-green-200 mt-1">Training data saved to database successfully.</p>
    `;
    document.body.appendChild(successPanel);
    
    if (feedback.completed === 'yes') {
      setCompletedSessions(prev => new Set([...prev, selectedSession.id]));
      console.log('✅ Session marked as completed:', selectedSession.id);
    } else if (feedback.completed === 'no') {
      setCompletedSessions(prev => {
        const updated = new Set([...prev]);
        updated.delete(selectedSession.id);
        return updated;
      });
      console.log('❌ Session marked as not completed:', selectedSession.id);
    }

    setTimeout(() => {
      if (document.body.contains(successPanel)) {
        document.body.removeChild(successPanel);
      }
    }, 3000);

    // 🆕 NEW: Always get motivational AI feedback after every session
    console.log('🤖 Getting motivational AI feedback for every session...');
    
    const sessionData = {
      type: selectedSession.subType || 'unknown',
      plannedDistance: selectedSession.distance || 0,
      actualDistance: selectedSession.distance || 0,
      plannedPace: selectedSession.pace || '0:00',
      actualPace: feedback.actualPace || selectedSession.pace || '0:00',
      rpe: feedback.rpe,
      difficulty: feedback.difficulty,
      feeling: feedback.feeling,
      comments: feedback.comments,
      completed: feedback.completed
    };

    // Get motivational feedback for every session
const motivationalFeedback = await getMotivationalAIFeedback(sessionData, {
  ...feedback,
  // 🆕 NEW: Include RPE target context
  targetRPE: selectedSession.targetRPE,
  rpeComparison: selectedSession.targetRPE ? {
    target: `${selectedSession.targetRPE.min}-${selectedSession.targetRPE.max}`,
    actual: feedback.rpe,
    withinTarget: feedback.rpe >= selectedSession.targetRPE.min && 
                  feedback.rpe <= selectedSession.targetRPE.max
  } : null
});
    setMotivationalMessage(motivationalFeedback);
    setShowMotivationalAI(true);

    // ✏️ CHANGED: Still do auto-adjustments for extreme values, but also show motivational feedback
    if (feedback.difficulty >= 8 || feedback.rpe >= 8 || 
        (feedback.difficulty <= 3 && feedback.rpe <= 3 && feedback.completed === 'yes')) {
      
      try {
        console.log('🤖 Triggering AI auto-adjustment...');
        
       const adjustment = await getAIAdjustment({
  ...sessionData,
  // 🆕 NEW: Add target RPE context for smarter AI decisions
  targetRPE: selectedSession.targetRPE,
  rpeAnalysis: selectedSession.targetRPE ? {
    target: `${selectedSession.targetRPE.min}-${selectedSession.targetRPE.max}`,
    actual: feedback.rpe,
    withinTarget: feedback.rpe >= selectedSession.targetRPE.min && 
                  feedback.rpe <= selectedSession.targetRPE.max,
    sessionType: selectedSession.subType
  } : null
});       
        

        applyAIAdjustments(adjustment);
        setAiAdjustment(adjustment);
        setShowAiPanel(true);
        
        console.log('✅ AI auto-adjustment applied');
        
      } catch (aiError: unknown) {
        const aiErrorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error';
        console.error('AI auto-adjustment failed:', aiErrorMessage);
      }
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Failed to save feedback:', errorMessage);
    
    const errorPanel = document.createElement('div');
    errorPanel.className = 'fixed top-4 right-4 z-50 bg-red-900 border border-red-400 rounded-lg p-4 shadow-lg';
    errorPanel.innerHTML = `
      <div class="flex items-center gap-2 text-red-300">
        <div class="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center text-xs font-bold text-black">✗</div>
        <span class="font-bold">Save Failed</span>
      </div>
      <p class="text-sm text-red-200 mt-1">${errorMessage}</p>
    `;
    document.body.appendChild(errorPanel);
    
    setTimeout(() => {
      if (document.body.contains(errorPanel)) {
        document.body.removeChild(errorPanel);
      }
    }, 5000);
  }

  setShowFeedback(false);
  setSelectedSession(null);
  setDifficultyValue(5);
  setRpeValue(5);
};

  // UTILITY FUNCTIONS
  const getSessionColor = (session: Session): string => {
    let baseColor = '';
    
    if (session.type === 'rest') {
      baseColor = 'bg-gray-600/70 text-gray-200 border border-gray-500/30';
    } else if (session.type === 'gym') {
      const gymColors = {
        push: 'bg-blue-600/70 text-blue-100 border border-blue-400/30',
        pull: 'bg-cyan-600/70 text-cyan-100 border border-cyan-400/30', 
        legs: 'bg-purple-600/70 text-purple-100 border border-purple-400/30'
      };
      baseColor = gymColors[session.subType as keyof typeof gymColors] || 'bg-blue-600/70 text-blue-100 border border-blue-400/30';
    } else if (session.type === 'running') {
      const runColors = {
        easy: 'bg-green-600/70 text-green-100 border border-green-400/30',
        tempo: 'bg-orange-600/70 text-orange-100 border border-orange-400/30',
        intervals: 'bg-red-600/70 text-red-100 border border-red-400/30',
        long: 'bg-indigo-600/70 text-indigo-100 border border-indigo-400/30'
      };
      baseColor = runColors[session.subType as keyof typeof runColors] || 'bg-green-600/70 text-green-100 border border-green-400/30';
    }

    if (completedSessions.has(session.id)) {
      baseColor = baseColor.replace('border-', 'border-2 border-green-400 bg-opacity-50 ');
    }

    if (session.aiModified) {
      baseColor += ' ring-2 ring-cyan-400/60';
    }

    return baseColor;
  };

  const getSessionText = (session: Session): JSX.Element => {
    let mainText = '';
    let details: string[] = [];
    
    if (session.type === 'rest') {
      mainText = 'REST DAY';
      details = ['Recovery & stretching'];
    } else if (session.type === 'gym') {
      mainText = `${session.subType.toUpperCase()} DAY`;
      details = [];
    } else if (session.type === 'running') {
      const madeRunningText = session.madeRunning ? ' (MadeRunning)' : '';
      mainText = `${session.subType.charAt(0).toUpperCase() + session.subType.slice(1)} ${session.distance}K${madeRunningText}`;
      
      const workoutTime = calculateDuration(session.distance || 5, session.pace || '6:30');
      
      switch (session.subType) {
        case 'easy':
          details = [
            'WU: 10min easy jog',
            `Main: ${workoutTime - 15}min@${session.pace}/km`,
            'CD: 5min walk',
            `Total: ${workoutTime}min`
          ];
          break;
        case 'tempo':
          const tempoTime = Math.round(workoutTime * 0.6);
          details = [
            'WU: 15min easy + strides',
            `Tempo: ${tempoTime}min@${session.pace}/km`,
            'CD: 10min easy',
            `Total: ${workoutTime}min`
          ];
          break;
        case 'long':
          details = [
            'WU: 15min easy',
            `Long: ${workoutTime - 25}min progressive`,
            'CD: 10min walk',
            `Total: ${workoutTime}min`
          ];
          break;
        case 'intervals':
          details = [
            'WU: 15min easy',
            `Intervals@${session.pace}/km`,
            'CD: 10min easy',
            `Total: ${workoutTime}min`
          ];
          break;
        default:
          details = [`${session.pace}/km`, `Total: ${workoutTime}min`];
      }
    }

    if (completedSessions.has(session.id)) {
      mainText = `✅ ${mainText}`;
    }
    if (session.aiModified) {
      mainText = `🤖 ${mainText}`;
    }

    return (
      <div className="space-y-1">
        <div className="font-medium text-sm">{mainText}</div>
        {details.map((detail, index) => (
          <div key={index} className="text-xs opacity-75">
            {detail}
          </div>
        ))}
      </div>
    );
  };

  const getTotalWeekDistance = (): number => {
    return Object.values(weekData.weeklySchedule).flat()
      .filter(session => session.type === 'running' && session.distance)
      .reduce((total, session) => total + (session.distance || 0), 0);
  };

  const getWeekCompletionPercentage = (): number => {
    const allSessions = Object.values(weekData.weeklySchedule).flat()
      .filter(session => session.type === 'running');
    
    if (allSessions.length === 0) return 0;
    
    const completedCount = allSessions.filter(session => 
      completedSessions.has(session.id)
    ).length;
    
    return Math.round((completedCount / allSessions.length) * 100);
  };

const ProactiveWeekTransitionModal = () => {
  if (!showWeekTransition || !weekAnalysisResult) return null;

  const result = weekAnalysisResult;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowWeekTransition(false)}>
      <div className="bg-gray-800 rounded-lg border border-gray-600 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">🧠</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">Week {currentWeek} Analysis Complete!</h2>
              <div className="text-sm text-gray-400">AI recommendations for Week {currentWeek + 1}</div>
            </div>
            <button onClick={() => setShowWeekTransition(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
          </div>

          {/* Celebration Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-lg text-center">
            <div className="text-3xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-white mb-2">Week {currentWeek} Complete!</h3>
            <p className="text-green-200">
              You've completed {getWeekCompletionPercentage()}% of your running sessions. 
              Great consistency toward your {formatGoalTimeForDisplay(goalTime)} goal!
            </p>
          </div>

          {/* Week Performance Summary */}
          {(result as any).weekTransitionSummary && (
            <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
              <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                📊 Week {currentWeek} Performance Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-600/30 rounded">
                  <div className="text-xs text-gray-400 mb-1">OVERALL PERFORMANCE</div>
                  <div className="font-bold text-cyan-400 capitalize">
                    {(result as any).weekTransitionSummary.completedWeekPerformance.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-600/30 rounded">
                  <div className="text-xs text-gray-400 mb-1">WEEK {currentWeek + 1} APPROACH</div>
                  <div className="font-bold text-green-400 capitalize">
                    {(result as any).weekTransitionSummary.upcomingWeekAdjustments.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-600/30 rounded">
                  <div className="text-xs text-gray-400 mb-1">CONFIDENCE</div>
                  <div className="font-bold text-white">
                    {Math.round(result.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${
                result.impact === 'positive' ? 'bg-green-500' :
                result.impact === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className={`font-medium ${
                result.impact === 'positive' ? 'text-green-400' :
                result.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                Week {currentWeek + 1} Outlook: {result.impact.charAt(0).toUpperCase() + result.impact.slice(1)}
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed">{result.analysis}</p>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
              💡 Week {currentWeek + 1} Focus Areas
            </h3>
            <div className="grid gap-3">
              {result.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <span className="text-blue-400 font-bold text-sm mt-1">{idx + 1}</span>
                  <span className="text-gray-300 text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-Week Modifications */}
          {result.crossWeekModifications && result.crossWeekModifications.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                🔄 Week {currentWeek + 1} Training Adjustments
              </h3>
              <div className="space-y-3">
                {result.crossWeekModifications.map((mod, idx) => (
                  <div key={idx} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-white">
                        Week {mod.week}, {mod.day.charAt(0).toUpperCase() + mod.day.slice(1)}
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-bold bg-purple-900 text-purple-200">
                        {mod.modificationType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{mod.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (result.crossWeekModifications && result.crossWeekModifications.length > 0) {
                  applyCrossWeekModifications(result.crossWeekModifications);
                }
                setShowWeekTransition(false);
                // Advance to next week
                setCurrentWeek(prev => Math.min(12, prev + 1));
              }}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-medium transition-colors text-white flex items-center justify-center gap-2"
            >
              <span>🚀</span>
              Start Week {currentWeek + 1} with AI Optimizations
            </button>
            <button
              onClick={() => {
                setShowWeekTransition(false);
                setCurrentWeek(prev => Math.min(12, prev + 1));
              }}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
            >
              Continue Without Changes
            </button>
          </div>
          
          {/* Goal Focus Note */}
          <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
            <p className="text-sm text-green-200">
              🎯 <strong>Manchester Half Marathon:</strong> {12 - currentWeek} weeks remaining to achieve your {formatGoalTimeForDisplay(goalTime)} goal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MotivationalAIModal = () => {
  if (!showMotivationalAI || !motivationalMessage) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowMotivationalAI(false)}>
      <div className="bg-gray-800 rounded-lg border border-gray-600 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-black">AI</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">AI Training Coach</h2>
              <div className="text-sm text-gray-400">Session Analysis & Motivation</div>
            </div>
            <button onClick={() => setShowMotivationalAI(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
          </div>

          {/* Progress Ring */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="currentColor" 
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-700"
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="currentColor" 
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${getWeekCompletionPercentage() * 2.51} 251`}
                  className="text-cyan-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{getWeekCompletionPercentage()}%</span>
              </div>
            </div>
          </div>

          {/* AI Message */}
          <div className="mb-6 p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg">
            <p className="text-gray-200 leading-relaxed text-center">
              {motivationalMessage}
            </p>
          </div>

          {/* Training Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">WEEK PROGRESS</div>
              <div className="text-lg font-bold text-cyan-400">{getWeekCompletionPercentage()}%</div>
            </div>
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">CURRENT WEEK</div>
              <div className="text-lg font-bold text-white">{currentWeek}/12</div>
            </div>
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <div className="text-xs text-gray-400 mb-1">GOAL TARGET</div>
              <div className="text-lg font-bold text-green-400">{formatGoalTimeForDisplay(goalTime)}</div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowMotivationalAI(false)}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 px-6 py-3 rounded-lg font-medium transition-colors text-white flex items-center justify-center gap-2"
          >
            <span>Continue Training</span>
            <span>💪</span>
          </button>
          
          {/* Goal Focus Note */}
          <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
            <p className="text-sm text-green-200">
              🎯 <strong>Next Goal:</strong> Manchester Half Marathon - October 12, 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Enhanced AI Modal Component
  const EnhancedAIModal = () => {
    if (!showEnhancedAiModal || !enhancedAiResult) return null;

    // Create a local variable to satisfy TypeScript
    const result = enhancedAiResult;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setShowEnhancedAiModal(false)}>
        <div className="bg-gray-800 rounded-lg border border-gray-600 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Brain className="text-cyan-400" size={32} />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Enhanced AI Training Analysis</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">Confidence: {Math.round(result.confidence * 100)}%</span>
<span className={`font-medium ${
  result.goalImpact === 'helps_sub2' ? 'text-green-400' :
  result.goalImpact === 'hurts_sub2' ? 'text-red-400' : 'text-yellow-400'
}`}>
  {formatGoalTimeForDisplay(goalTime)} Impact: {result.goalImpact === 'helps_sub2' ? 'Positive' :
                                               result.goalImpact === 'hurts_sub2' ? 'Negative' : 'Neutral'}
</span>
                </div>
              </div>
              <button onClick={() => setShowEnhancedAiModal(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>

            {/* Analysis Summary */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${
                  result.impact === 'positive' ? 'bg-green-500' :
                  result.impact === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className={`font-medium ${
                  result.impact === 'positive' ? 'text-green-400' :
                  result.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {result.impact.charAt(0).toUpperCase() + result.impact.slice(1)} Schedule Impact
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed">{result.analysis}</p>
            </div>

            {/* Training Phase Adjustment */}
            {result.trainingPhaseAdjustment && result.trainingPhaseAdjustment.recommendedPhase !== result.trainingPhaseAdjustment.currentPhase && (
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <h3 className="font-semibold mb-2 text-blue-400">🎯 Training Phase Recommendation</h3>
                <div className="text-sm text-gray-300">
                  <p><strong>Current:</strong> {result.trainingPhaseAdjustment.currentPhase}</p>
                  <p><strong>Recommended:</strong> {result.trainingPhaseAdjustment.recommendedPhase}</p>
                  <p className="mt-2 text-blue-200">{result.trainingPhaseAdjustment.reason}</p>
                </div>
              </div>
            )}

            {/* Cross-Week Modifications */}
            {result.crossWeekModifications && result.crossWeekModifications.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-white flex items-center gap-2">
                  <RotateCcw size={16} />
                  Recommended Changes for Week {currentWeek + 1} and beyond
                </h3>
                <div className="space-y-3">
                  {result.crossWeekModifications.map((mod, idx) => (
                    <div key={idx} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-white">
                          Week {mod.week}, {mod.day.charAt(0).toUpperCase() + mod.day.slice(1)}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          mod.modificationType === 'session_conversion' ? 'bg-orange-900 text-orange-200' :
                          mod.modificationType === 'pace_adjustment' ? 'bg-blue-900 text-blue-200' :
                          mod.modificationType === 'made_running_skip' ? 'bg-purple-900 text-purple-200' :
                          'bg-gray-900 text-gray-200'
                        }`}>
                          {mod.modificationType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      
                      {mod.originalSession && (
                        <div className="text-sm text-gray-300 mb-2">
                          <span className="line-through text-red-400">
                            {mod.originalSession.subType} {mod.originalSession.distance}km @ {mod.originalSession.pace}
                          </span>
                          <span className="mx-2">→</span>
                          <span className="text-green-400">
                            {mod.newSession.subType} {mod.newSession.distance}km @ {mod.newSession.pace}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        <div className="mb-1"><strong>Reason:</strong> {mod.newSession.reason}</div>
                        <div>{mod.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Options */}
            {result.alternativeOptions && result.alternativeOptions.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-white">🎯 Training Approach Options</h3>
                <div className="space-y-3">
                  {result.alternativeOptions.map((option, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAlternative === idx 
                          ? 'border-cyan-400 bg-cyan-900/20' 
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedAlternative(idx)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white">{option.title}</h4>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedAlternative === idx 
                            ? 'border-cyan-400 bg-cyan-400' 
                            : 'border-gray-400'
                        }`} />
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-3">{option.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="font-semibold text-green-400 mb-1">Pros:</div>
                          <ul className="text-gray-300 space-y-1">
                            {option.pros.map((pro, i) => (
                              <li key={i}>• {pro}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-semibold text-red-400 mb-1">Cons:</div>
                          <ul className="text-gray-300 space-y-1">
                            {option.cons.map((con, i) => (
                              <li key={i}>• {con}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                <AlertCircle size={16} />
                AI Coach Recommendations
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const selectedOption = result.alternativeOptions?.[selectedAlternative];
                  const modifications = selectedOption?.modifications || result.crossWeekModifications || [];
                  applyCrossWeekModifications(modifications, selectedAlternative);
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 px-6 py-3 rounded-lg font-medium transition-colors text-white flex items-center justify-center gap-2"
                disabled={!result.crossWeekModifications || result.crossWeekModifications.length === 0}
              >
                <Brain size={16} />
                Apply AI Training Changes
              </button>
              <button
                onClick={() => setShowEnhancedAiModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                Keep Current Plan
              </button>
            </div>
            
            {/* Sub-2:00 Focus Note */}
<div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
  <p className="text-sm text-green-200">
    🎯 <strong>Goal Focus:</strong> All recommendations prioritize your {formatGoalTimeForDisplay(goalTime)} half marathon goal on October 12, 2025
  </p>
</div>
          </div>
        </div>
      </div>
    );
  };

  const paceZones = calculatePaceZones(goalTime);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div style={{
      '--primary-color': 'rgba(50, 184, 198, 1)',
      '--bg-color': 'rgba(31, 33, 33, 1)',
      '--surface-color': 'rgba(38, 40, 40, 1)',
      fontFamily: 'FKGroteskNeue, Geist, Inter, system-ui',
      letterSpacing: '-0.01em',
      backgroundColor: 'var(--bg-color)',
      color: 'white',
      minHeight: '100vh'
    } as React.CSSProperties}>
      
      {/* AI Rebalancing Indicator */}
      {aiRebalancing && (
        <div className="fixed top-4 right-4 z-50 bg-cyan-900 border border-cyan-400 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 font-medium">AI analyzing schedule optimization...</span>
        </div>
      )}

      {/* AI Adjustment Panel */}
      {showAiPanel && aiAdjustment && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 border border-cyan-400 rounded-lg p-4 max-w-sm shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
              AI
            </div>
            <h3 className="font-bold text-cyan-400">AI Auto-Adjustment</h3>
            <button 
              onClick={() => setShowAiPanel(false)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              &times;
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {aiAdjustment.action === 'increase' ? 
                <TrendingUp size={16} className="text-green-400" /> :
                <TrendingDown size={16} className="text-orange-400" />
              }
              <span className="capitalize">{aiAdjustment.action} intensity</span>
            </div>
            
            <div className="text-gray-300">
              <strong>Changes made:</strong>
              <ul className="list-disc list-inside mt-1">
                {aiAdjustment.modifications.map((mod, i) => (
                  <li key={i} className="text-xs">{mod}</li>
                ))}
              </ul>
            </div>
            
{aiAdjustment.goalTimeUpdate && (
  <div className="bg-cyan-900 bg-opacity-30 p-2 rounded text-xs">
    <strong>Goal Updated:</strong> {formatGoalTimeForDisplay(aiAdjustment.goalTimeUpdate.newGoalTime)}
    <br />
    <span className="text-cyan-300">
      {aiAdjustment.goalTimeUpdate.improvement > 0 ? '🚀 FASTER target - you\'re improving!' : '🛡️ Safer target'}
    </span>
  </div>
)}
            
            <div className="text-xs text-gray-400 italic">
              {aiAdjustment.reasoning}
            </div>
          </div>
        </div>
      )}
      
      {/* Training Pace Zones */}
      <div className="px-6 pt-8 pb-6">
        <Card className="bg-gray-800/60 border-gray-600 backdrop-blur-sm">
          <CardContent className="p-6">
            <div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
  gap: isMobile ? '12px' : '32px'
}}>
<div className="text-center" style={{ gridColumn: isMobile ? 'span 2' : 'span 1' }}>
  <label className="block text-xs text-gray-400 mb-3 font-medium">GOAL TIME</label>
                <input
                  type="text"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  className="bg-gray-700/50 border border-gray-500 rounded-lg px-3 py-2 text-sm font-mono text-center w-full text-white focus:border-gray-400 focus:outline-none transition-colors"
                />
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-3 font-medium">TARGET PACE</div>
                <div className="text-lg font-bold text-cyan-400 font-mono">
                  {paceZones.target}/km
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-3 font-medium">EASY PACE</div>
                <div className="text-lg font-bold text-green-400 font-mono">
                  {paceZones.easy}/km
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-3 font-medium">TEMPO PACE</div>
                <div className="text-lg font-bold text-orange-400 font-mono">
                  {paceZones.tempo}/km
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-3 font-medium">5K PACE</div>
                <div className="text-lg font-bold text-purple-400 font-mono">
                  {paceZones.fiveK}/km
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="h-8"></div>

      {/* Week Navigation */}
      <div className="px-6 pt-8 pb-6">
        <div className="max-w-6xl mx-auto">
          <div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '24px',
  flexDirection: isMobile ? 'column' : 'row',
  gap: isMobile ? '16px' : '0'
}}>
  <h1 style={{ 
    fontSize: isMobile ? '20px' : '24px', 
    fontWeight: 'bold',
    textAlign: isMobile ? 'center' : 'left'
  }}>
    AI Training Calendar - Week {currentWeek}
  </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentWeek(prev => Math.max(1, prev - 1))}
                disabled={currentWeek === 1}
                className="flex items-center gap-2 px-4 py-2 rounded disabled:opacity-50"
                style={{ backgroundColor: 'var(--surface-color)' }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span className="px-4 py-2 rounded" style={{ backgroundColor: 'var(--surface-color)' }}>
                Week {currentWeek} of 12
              </span>
              <button
                onClick={() => setCurrentWeek(prev => Math.min(12, prev + 1))}
                disabled={currentWeek === 12}
                className="flex items-center gap-2 px-4 py-2 rounded disabled:opacity-50"
                style={{ backgroundColor: 'var(--surface-color)' }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="mx-6 mb-8">
            <Card className="bg-gray-800/60 border-gray-600 backdrop-blur-sm">
              <CardContent className="p-6">
                <div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
  gap: isMobile ? '16px' : '32px'
}}>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-3 font-medium">TRAINING FOCUS</div>
                    <div className="text-lg font-bold text-white">
                      {currentWeek <= 4 ? 'Base Building' : 
                       currentWeek <= 8 ? 'Build Phase' :
                       currentWeek <= 10 ? 'Peak Phase' : 'Taper'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-3 font-medium">CURRENT WEEK</div>
                    <div className="text-lg font-bold text-cyan-400">
                      Week {currentWeek} of 12
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-3 font-medium">AI MODIFICATIONS</div>
                    <div className="text-lg font-bold text-white flex items-center justify-center gap-2">
                      <span className="text-xs bg-cyan-400 text-black px-2 py-1 rounded font-bold">AI</span>
                      {Object.keys(modifiedSessions).length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Grid */}
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(7, 1fr)',
  gap: '16px',
  minHeight: isMobile ? 'auto' : '480px' 
}}>
            {days.map((day) => (
              <div
                key={day}
                style={{
                  backgroundColor: dragOverDay === day && draggedFromDay !== day ? 'rgba(50, 184, 198, 0.2)' : '#2a2a3a',
                  border: dragOverDay === day && draggedFromDay !== day ? '2px dashed rgba(50, 184, 198, 0.8)' : '1px solid #3a3a4a',
                  borderRadius: '8px',
                  minHeight: '180px',
                  padding: '12px',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={(e) => handleDragLeave(e, day)}
                onDrop={(e) => handleDrop(e, day)}
              >
                <h3 style={{ 
                  fontWeight: '600', 
                  marginBottom: '12px', 
                  textAlign: 'center', 
                  color: '#d1d5db',
                  fontSize: '14px'
                }}>
                  {day}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(weekData.weeklySchedule[day] || []).map((session) => {
                    const isDragging = draggedSession?.id === session.id;
                    const canDrag = session.type !== 'rest' && !completedSessions.has(session.id);
                    
                    return (
                      <div
                        key={session.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-105 ${getSessionColor(session)} ${
                          isDragging ? 'opacity-50 scale-95 rotate-2' : ''
                        } ${canDrag ? 'cursor-grab hover:cursor-grabbing' : ''}`}
                        draggable={canDrag}
                        onDragStart={(e) => canDrag && handleDragStart(e, session, day)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (session.type === 'running' && !isDragging) {
                            setSelectedSession(session);
                          }
                        }}
                        style={{ position: 'relative' }}
                      >
                        {getSessionText(session)}
                        
                        {session.time && (
                          <div className="text-xs opacity-60 mt-2 flex items-center gap-1">
                            <span>🕐</span>
                            {session.time}
                          </div>
                        )}
                        
                        {session.aiModified && (
                          <div className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                            <span>🤖</span>
                            Pace: {session.pace} (was {session.originalPace})
                          </div>
                        )}
                        
                        {canDrag && !isDragging && (
                          <div className="absolute top-1 right-1 text-xs opacity-50">
                            ⋮⋮
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Drop zone indicator */}
                {dragOverDay === day && draggedFromDay !== day && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    padding: '8px',
                    border: '2px dashed rgba(50, 184, 198, 0.8)',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'rgba(50, 184, 198, 1)',
                    backgroundColor: 'rgba(50, 184, 198, 0.1)'
                  }}>
                    Drop here to reschedule
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Rebalancing Modal */}
      {showRebalanceModal && rebalanceResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
<div style={{ 
  backgroundColor: 'var(--surface-color)', 
  borderRadius: '8px', 
  padding: '24px', 
  maxWidth: isMobile ? '95%' : '600px', 
  width: '100%',
  border: '1px solid #3a3a4a',
  margin: isMobile ? '8px' : '0'
}}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                AI
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Schedule Rebalancing Analysis
              </h2>
              <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>
                Confidence: {Math.round((rebalanceResult.confidence || 0.7) * 100)}%
              </div>
            </div>

            <div className={`mb-4 p-3 rounded-lg border ${
              rebalanceResult.impact === 'positive' ? 'bg-green-900 bg-opacity-30 border-green-400' :
              rebalanceResult.impact === 'negative' ? 'bg-red-900 bg-opacity-30 border-red-400' :
              'bg-yellow-900 bg-opacity-30 border-yellow-400'
            }`}>
              <div className={`text-sm font-semibold ${
                rebalanceResult.impact === 'positive' ? 'text-green-400' :
                rebalanceResult.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {(rebalanceResult.impact || 'neutral').charAt(0).toUpperCase() + (rebalanceResult.impact || 'neutral').slice(1)} Impact
              </div>
            </div>

            <div className="mb-4">
              <p style={{ fontSize: '14px', color: '#d1d5db', lineHeight: '1.5' }}>
                {rebalanceResult.analysis || 'Schedule change completed.'}
              </p>
            </div>

            {rebalanceResult.recommendations && rebalanceResult.recommendations.length > 0 && (
              <div className="mb-6">
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                  AI Recommendations:
                </h3>
                <ul style={{ fontSize: '13px', color: '#d1d5db' }}>
                  {rebalanceResult.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} style={{ marginBottom: '4px', paddingLeft: '8px' }}>
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRebalanceModal(false)}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: '#6b7280', fontSize: '14px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Modal */}
      {selectedSession && !showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div style={{ 
            backgroundColor: 'var(--surface-color)', 
            borderRadius: '8px', 
            padding: '24px', 
            maxWidth: '600px', 
            width: '100%',
            border: '1px solid #3a3a4a'
          }}>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }} className="flex items-center gap-2">
                {selectedSession.aiModified && (
                  <div className="w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                    AI
                  </div>
                )}
                {selectedSession.subType.charAt(0).toUpperCase() + selectedSession.subType.slice(1)} Run
              </h2>
              <button
                onClick={() => setSelectedSession(null)}
                style={{ fontSize: '24px', color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
  gap: '16px',
  marginBottom: '24px'
}}>
                <div>
    <div style={{ fontSize: '12px', color: '#9ca3af' }}>DISTANCE</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold' }} className="flex items-center gap-2">
      {selectedSession.distance}km
      {selectedSession.aiModified && selectedSession.originalDistance !== selectedSession.distance && (
        <span className="text-xs text-cyan-400">
          (was {selectedSession.originalDistance}km)
        </span>
      )}
    </div>
  </div>
  <div>
    <div style={{ fontSize: '12px', color: '#9ca3af' }}>TARGET PACE</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold' }} className="flex items-center gap-2">
      {selectedSession.pace}/km
      {selectedSession.aiModified && selectedSession.originalPace !== selectedSession.pace && (
        <span className="text-xs text-cyan-400">
          (was {selectedSession.originalPace}/km)
        </span>
      )}
    </div>
  </div>
  <div>
    <div style={{ fontSize: '12px', color: '#9ca3af' }}>DURATION</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
      ~{calculateDuration(selectedSession.distance || 5, selectedSession.pace || '6:00')} mins
    </div>
  </div>
  {/* 🆕 NEW: Target RPE column */}
  <div>
    <div style={{ fontSize: '12px', color: '#9ca3af' }}>TARGET RPE</div>
    <div style={{ fontSize: '16px', fontWeight: 'bold' }} className="flex items-center gap-2">
      {selectedSession.targetRPE ? (
        <>
          <span className="text-orange-400">
            {selectedSession.targetRPE.min}-{selectedSession.targetRPE.max}
          </span>
          <div className="group relative">
            <span className="text-xs text-gray-400 cursor-help">ℹ️</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity w-48 text-center">
              {selectedSession.targetRPE.description}
            </div>
          </div>
        </>
      ) : (
        <span className="text-gray-400">-</span>
      )}
    </div>
  </div>
</div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Session Breakdown</h3>
              
              <div className="mb-3 p-3 rounded-lg bg-green-900 bg-opacity-20 border border-green-500 border-opacity-30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-green-400" />
                  <span className="text-sm font-semibold text-green-400">Warm-up</span>
                </div>
                <p className="text-sm text-gray-300">{selectedSession.warmup}</p>
              </div>

              <div className="mb-3 p-3 rounded-lg bg-blue-900 bg-opacity-20 border border-blue-500 border-opacity-30">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">Main Set</span>
                </div>
                <p className="text-sm text-gray-300">{selectedSession.mainSet}</p>
              </div>

              <div className="mb-3 p-3 rounded-lg bg-purple-900 bg-opacity-20 border border-purple-500 border-opacity-30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400">Cool-down</span>
                </div>
                <p className="text-sm text-gray-300">{selectedSession.cooldown}</p>
              </div>
            </div>

            {selectedSession.aiModified && (
              <div className="mb-4 p-3 bg-cyan-900 bg-opacity-30 rounded border border-cyan-400">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                    AI
                  </div>
                  <span className="text-sm font-semibold text-cyan-400">AI Modified Session</span>
                </div>
                <p className="text-xs text-gray-300">
                  This session has been automatically adjusted based on your recent feedback.
                </p>
              </div>
            )}

            {selectedSession.targetRPE && (
  <div className="mb-6 p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🎯</span>
      <span className="text-sm font-semibold text-orange-400">Target Effort Level</span>
    </div>
    <div className="text-sm text-gray-300 space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-medium text-orange-300">RPE {selectedSession.targetRPE.min}-{selectedSession.targetRPE.max}:</span>
        <span>{selectedSession.targetRPE.description}</span>
      </div>
      <p className="text-xs text-orange-200 italic">
        💡 {selectedSession.targetRPE.context}
      </p>
    </div>
  </div>
)}

            <div className="flex gap-3">
              <button
                onClick={() => setShowFeedback(true)}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: '#3b82f6', fontSize: '14px' }}
              >
                Give Feedback
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: '#6b7280', fontSize: '14px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
  <ProactiveWeekTransitionModal />
      <MotivationalAIModal />
      {/* Enhanced AI Modal */}
      <EnhancedAIModal />

      {/* Feedback Form */}
{showFeedback && selectedSession && (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowFeedback(false);
      }
    }}
  >
    <div 
      style={{ 
        backgroundColor: 'var(--surface-color)', 
        borderRadius: '8px', 
        padding: '24px', 
        maxWidth: '500px', 
        width: '100%',
        border: '1px solid #3a3a4a',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        // Ensure modal stays in viewport center
        margin: 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
    >


            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>
              Session Feedback - AI Auto-Adjustment
            </h2>
            
            <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 rounded border border-blue-400">
              <div className="text-sm text-blue-200">
                <div className="w-4 h-4 bg-blue-400 rounded-full inline-flex items-center justify-center text-xs font-bold text-black mr-2">
                  AI
                </div>
                <strong>AI will automatically adjust your training based on this feedback:</strong>
                <ul className="mt-2 text-xs space-y-1">
                  <li>• High RPE/Difficulty (≥8) → Easier sessions, slower paces</li>
                  <li>• Low RPE/Difficulty (≤3) → Harder sessions, faster paces</li>
                  <li>• Goal time may be updated based on performance trends</li>
                </ul>
              </div>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ 
  display: 'grid', 
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
  gap: '16px' 
}}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                    Completed
                  </label>
                  <select 
                    name="completed" 
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    style={{ fontSize: '14px' }}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                    Actual Pace
                  </label>
                  <input
                    type="text"
                    name="actualPace"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder={selectedSession.pace}
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>

<div style={{ 
  display: 'grid', 
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
  gap: '16px' 
}}>
<div>
  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
    Difficulty (1-10): <span className="text-cyan-400 font-bold">{difficultyValue}</span>
  </label>
  <div 
    style={{ 
      touchAction: 'none',  // Prevent scroll on touch
      userSelect: 'none'    // Prevent text selection
    }}
    onTouchStart={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
  >
    <input
      type="range"
      min="1"
      max="10"
      value={difficultyValue}
      onChange={(e) => setDifficultyValue(parseInt(e.target.value))}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="w-full"
      style={{
        touchAction: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none'
      }}
    />
  </div>
  <div className="flex justify-between text-xs text-gray-400 mt-1">
    <span>Very Easy</span>
    <span>Very Hard</span>
  </div>
</div>
<div>
  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
    RPE (1-10): <span className="text-cyan-400 font-bold">{rpeValue}</span>
    {/* 🆕 NEW: Show target vs actual comparison */}
    {selectedSession?.targetRPE && (
      <span className={`ml-2 text-xs px-2 py-1 rounded ${
        rpeValue >= selectedSession.targetRPE.min && rpeValue <= selectedSession.targetRPE.max
          ? 'bg-green-900 text-green-300' 
          : rpeValue > selectedSession.targetRPE.max
          ? 'bg-red-900 text-red-300'
          : 'bg-yellow-900 text-yellow-300'
      }`}>
        Target: {selectedSession.targetRPE.min}-{selectedSession.targetRPE.max}
      </span>
    )}
  </label>
  <div 
    style={{ 
      touchAction: 'none',
      userSelect: 'none' 
    }}
    onTouchStart={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
  >
    <input
      type="range"
      min="1"
      max="10"
      value={rpeValue}
      onChange={(e) => setRpeValue(parseInt(e.target.value))}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      className="w-full"
      style={{
        touchAction: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none'
      }}
    />
  </div>
  <div className="flex justify-between text-xs text-gray-400 mt-1">
    <span>Easy</span>
    <span>Maximal</span>
  </div>
  {/* 🆕 NEW: RPE interpretation based on session type */}
  {selectedSession?.targetRPE && (
    <div className="mt-2 text-xs">
      {rpeValue >= selectedSession.targetRPE.min && rpeValue <= selectedSession.targetRPE.max ? (
        <div className="text-green-300 flex items-center gap-1">
          <span>✅</span>
          <span>Perfect effort for {selectedSession.subType} run!</span>
        </div>
      ) : rpeValue > selectedSession.targetRPE.max ? (
        <div className="text-red-300 flex items-center gap-1">
          <span>⚠️</span>
          <span>Higher than expected - consider if pacing was too aggressive</span>
        </div>
      ) : (
        <div className="text-yellow-300 flex items-center gap-1">
          <span>💡</span>
          <span>Lower than target - could potentially push a bit harder next time</span>
        </div>
      )}
    </div>
  )}
</div>
              </div>

              {(difficultyValue >= 8 || rpeValue >= 8) && (
                <div className="p-3 bg-orange-900 bg-opacity-30 rounded border border-orange-400">
                  <div className="flex items-center gap-2 text-orange-300">
                    <TrendingDown size={16} />
                    <span className="text-sm font-semibold">AI will make training EASIER</span>
                  </div>
                  <p className="text-xs text-orange-200 mt-1">
                    High intensity detected. Next sessions will have slower paces and reduced volume.
                  </p>
                </div>
              )}

              {(difficultyValue <= 3 && rpeValue <= 3) && (
                <div className="p-3 bg-green-900 bg-opacity-30 rounded border border-green-400">
                  <div className="flex items-center gap-2 text-green-300">
                    <TrendingUp size={16} />
                    <span className="text-sm font-semibold">AI will make training HARDER</span>
                  </div>
                  <p className="text-xs text-green-200 mt-1">
                    Low intensity detected. Next sessions will have faster paces to improve your goal time.
                  </p>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                  Feeling
                </label>
                <select 
                  name="feeling" 
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  style={{ fontSize: '14px' }}
                >
                  <option value="great">Great</option>
                  <option value="good">Good</option>
                  <option value="ok">OK</option>
                  <option value="tired">Tired</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                  Comments
                </label>
                <textarea
                  name="comments"
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  rows={3}
                  placeholder="How did the session go? Any specific challenges or successes?"
                  style={{ fontSize: '14px' }}
                />
              </div>

<div style={{ 
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  gap: '12px',
  marginTop: '16px'
}}>
                <button
                  type="submit"
                  className="px-4 py-2 rounded text-white flex items-center gap-2"
                  style={{ backgroundColor: '#10b981', fontSize: '14px' }}
                >
                  <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs font-bold text-green-600">
                    AI
                  </div>
                  Submit & Auto-Adjust
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="px-4 py-2 rounded text-white"
                  style={{ backgroundColor: '#6b7280', fontSize: '14px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .drag-over {
          background-color: rgba(50, 184, 198, 0.2) !important;
          border: 2px dashed rgba(50, 184, 198, 0.8);
        }
        
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: #374151;
          border-radius: 2px;
          outline: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--primary-color);
          border-radius: 50%;
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--primary-color);
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default AITrainingCalendar;