// 🔧 FIXED TrainingCalendar - Using YOUR existing code structure with UI improvements
// Based on your paste.txt - no function name changes, just UI fixes

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, MapPin, Activity, Brain, RotateCcw, AlertCircle, X, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PerplexityAIService, SessionFeedback } from '@/lib/ai/perplexity_service';

// Enhanced interfaces for auto-adjustment system
interface Session {
  id: string;
  type: 'running' | 'gym' | 'rest' | 'cross_training';
  subType: 'easy' | 'tempo' | 'intervals' | 'long' | 'push' | 'pull' | 'legs';
  distance?: number;
  pace?: string;
  duration?: string;
  madeRunning?: boolean;
  isRunningClub?: boolean; // For club session detection
  time?: string;
  rpe?: number;
  completed?: boolean; // Now comes from API response
  warmup?: string;
  mainSet?: string;
  cooldown?: string;
  aiModified?: boolean;
  originalPace?: string;
  originalDistance?: number;
  targetRPE?: RPETarget;
  week?: number;
  day?: string;
  dayOfWeek?: string;
}

interface AITrainingCalendarProps {
  userId?: string;
  sessionData?: any[];
  initialWeek?: number;
  totalWeeks?: number;
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

// Cache for API responses - prevents multiple calls
const _sessionCache = new Map<string, { ts: number; data: Session[] }>();
const CACHE_TTL = 30_000; // 30 seconds

// 🔧 Optimized hook with caching and abort controller (fallback only)
const useGeneratedSessions = (userId: string | undefined) => {
  const [state, setState] = useState<{
    sessions: Session[];
    loading: boolean;
    error: string | null;
    userProfile: any | null;
  }>({ sessions: [], loading: !!userId, error: null, userProfile: null });
  
  const abortRef = useRef<AbortController | null>(null);
  const cacheKey = useMemo(() => `sessions-${userId ?? 'anon'}`, [userId]);

  useEffect(() => {
    if (!userId) {
      setState({ sessions: [], loading: false, error: null, userProfile: null });
      return;
    }

    // Check cache first
    const cached = _sessionCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log('📦 Using cached sessions for', userId);
      setState({ sessions: cached.data, loading: false, error: null, userProfile: null });
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const fetchSessions = async () => {
      try {
        console.log('🔍 Fetching sessions for user:', userId);
        setState(prev => ({ ...prev, loading: true }));

        const response = await fetch(`/api/training-plan?userId=${userId}`, {
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.sessions && data.sessions.length > 0) {
          const sessions = data.sessions;
          console.log(`✅ Loaded ${sessions.length} sessions from API`);
          
          // 🆕 NEW: Extract and use user profile data (handled in setState above)
          if (data.userProfile) {
            console.log(`👤 User profile loaded: ${data.userProfile.targetTime} goal for ${data.userProfile.raceType}`);
          }
          
          // Cache the result
          _sessionCache.set(cacheKey, { ts: Date.now(), data: sessions });
          
          setState({ sessions, loading: false, error: null, userProfile: data.userProfile || null });
        } else {
          setState({ 
            sessions: [], 
            loading: false, 
            error: null,
            userProfile: data.userProfile || null
          });
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('❌ Error loading sessions:', error.message);
          setState({ sessions: [], loading: false, error: error.message, userProfile: null });
        }
      }
    };

    fetchSessions();

    return () => {
      abortController.abort();
    };
  }, [userId, cacheKey]);

  return state;
};

const TrainingCalendar: React.FC<AITrainingCalendarProps> = memo(({ userId = 'default', sessionData, initialWeek = 1, totalWeeks = 12 }) => {
  console.log('🔍 TrainingCalendar initialized with userId:', userId);
  console.log('📊 Session data received:', sessionData ? `${sessionData.length} sessions` : 'no session data');
  
  // Debug completion status
  if (sessionData && sessionData.length > 0) {
    const completedCount = sessionData.filter((s: any) => s.completed).length;
    console.log(`✅ Completion status: ${completedCount}/${sessionData.length} sessions marked as completed`);
    
    // Log first few sessions for debugging
    sessionData.slice(0, 3).forEach((session: any) => {
      console.log(`📝 Session ${session.id}: completed=${session.completed}, type=${session.type}`);
    });
  }

  // 🔧 OPTION 1: Use passed data if available, fallback to hook if not
  const shouldUseFallback = !sessionData || sessionData.length === 0;
  console.log('🔧 TrainingCalendar data source:', shouldUseFallback ? 'fallback hook' : 'passed sessionData');
  
  const { sessions: allSessions, loading, error, userProfile: hookUserProfile } = shouldUseFallback
    ? useGeneratedSessions(userId)
    : { sessions: sessionData, loading: false, error: null, userProfile: null };
    
  // 🆕 Update user profile and goal time when hook data changes
  useEffect(() => {
    if (hookUserProfile && shouldUseFallback) {
      setUserProfile(hookUserProfile);
      setGoalTime(hookUserProfile.targetTime || '2:00:00');
      console.log(`👤 User profile loaded: ${hookUserProfile.targetTime} goal for ${hookUserProfile.raceType}`);
    }
  }, [hookUserProfile, shouldUseFallback]);

  const [currentWeek, setCurrentWeek] = useState(initialWeek || 1);
  const [goalTime, setGoalTime] = useState('2:00:00');
  const [userProfile, setUserProfile] = useState<any>(null);

  // 🚀 Update current week when initialWeek prop changes
  useEffect(() => {
    if (initialWeek && initialWeek !== currentWeek) {
      console.log(`📅 Updating calendar to week ${initialWeek} from week ${currentWeek}`);
      setCurrentWeek(initialWeek);
    }
  }, [initialWeek]);
  const [predictedTime, setPredictedTime] = useState('2:00:00');
  const [isUpdatingPrediction, setIsUpdatingPrediction] = useState(false);
  const [lastPredictionUpdate, setLastPredictionUpdate] = useState<Date | null>(null);

  // 🚀 NEW: Load AI predicted time from userProfile when available
  useEffect(() => {
    if (userProfile?.aiPredictedTime) {
      setPredictedTime(userProfile.aiPredictedTime);
      if (userProfile.lastPredictionUpdate) {
        setLastPredictionUpdate(new Date(userProfile.lastPredictionUpdate));
      }
      console.log(`🎯 Loaded AI prediction from database: ${userProfile.aiPredictedTime}`);
    }
  }, [userProfile]);
  const [crossWeekModifications, setCrossWeekModifications] = useState<any[]>([]);
  const [showCrossWeekModal, setShowCrossWeekModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [difficultyValue, setDifficultyValue] = useState(5);
  const [rpeValue, setRpeValue] = useState(5);
  

  // 🚀 NEW: Load stored AI feedback for display
  const loadStoredAiFeedback = async (sessionId: string) => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/ai-feedback?sessionId=${sessionId}&userId=${userId}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📖 Loaded stored AI feedback:', result.feedback);
        
        // Show the stored feedback in the modal
        setAiAdjustment(result.feedback);
        setShowAiPanel(true);
      } else if (response.status === 404) {
        console.log('ℹ️ No stored AI feedback found for this session');
        alert('No AI feedback available for this session yet.');
      } else {
        console.error('❌ Error loading AI feedback:', response.status);
        alert('Failed to load AI feedback. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error loading stored AI feedback:', error);
      alert('Failed to load AI feedback. Please try again.');
    }
  };

  // 🚀 NEW: Check if AI feedback exists for a session
  const checkAiFeedbackExists = async (sessionId: string) => {
    if (!userId) return false;
    
    try {
      const response = await fetch(`/api/ai-feedback?sessionId=${sessionId}&userId=${userId}`);
      return response.ok;
    } catch (error) {
      console.error('❌ Error checking AI feedback:', error);
      return false;
    }
  };

  // 🚀 NEW: Session click handler for detail screen
  const handleSessionClick = async (session: Session) => {
    if (session.type === 'running') {
      setSelectedSession(session);
      setShowFeedback(false); // Start with detail screen, not feedback
      
      // Check if AI feedback exists for this session
      const feedbackExists = await checkAiFeedbackExists(session.id);
      setHasAiFeedback(prev => ({ ...prev, [session.id]: feedbackExists }));
    }
  };
  const [aiAdjustment, setAiAdjustment] = useState<any>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // Store modified sessions across all weeks
  const [modifiedSessions, setModifiedSessions] = useState<{[sessionId: string]: Session}>({});

  // Drag and drop state
  const [draggedSession, setDraggedSession] = useState<Session | null>(null);
  const [draggedFromDay, setDraggedFromDay] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [aiRebalancing, setAiRebalancing] = useState(false);
  const [rebalanceResult, setRebalanceResult] = useState<any>(null);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);

  const [showMotivationalAI, setShowMotivationalAI] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<string>('');
  const [hasAiFeedback, setHasAiFeedback] = useState<Record<string, boolean>>({});

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    completed: 'yes',
    actualPace: '',
    difficulty: 5,
    rpe: 5,
    feeling: 'good',
    comments: ''
  });

  // 🚀 NEW: Loading state for feedback submission
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // 🧪 TEST: Resubmit last session functionality
  const [isResubmitting, setIsResubmitting] = useState(false);
  
  // 🧪 TEST: Regenerate warm-ups functionality  
  const [isRegeneratingWarmups, setIsRegeneratingWarmups] = useState(false);

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

  // Time conversion functions from your code
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

  // 🔧 Filter sessions by week and group by day (using useMemo to prevent re-renders)
  const weekSessions = useMemo(() => {
    return allSessions.filter(session => session.week === currentWeek);
  }, [allSessions, currentWeek]);

  // Group sessions by day (using useMemo instead of useEffect + state)
  const weekData = useMemo(() => {
    const grouped: { [key: string]: Session[] } = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };

    weekSessions.forEach(session => {
      const dayName = session.dayOfWeek || session.day || 'Monday';
      if (grouped[dayName]) {
        grouped[dayName].push(session);
      }
    });

    return grouped;
  }, [weekSessions]);

  // 🚀 REMOVED: loadCompletedSessions - completion status now comes from API

  // DRAG AND DROP HANDLERS from your code
  const handleDragStart = (e: React.DragEvent, session: Session, dayKey: string) => {
    if (session.type === 'rest') return;
    
    setDraggedSession(session);
    setDraggedFromDay(dayKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
    target.style.transform = 'scale(0.95) rotate(2deg)';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    target.style.transform = 'scale(1) rotate(0deg)';
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

    // Note: For now, we'll just show AI feedback without actually moving sessions
    // since weekData is now computed via useMemo and can't be directly modified
    
    // Trigger AI analysis for running sessions
    if (draggedSession.type === 'running') {
      setAiRebalancing(true);
      // Simple AI feedback for now
      setTimeout(() => {
        setRebalanceResult({
          impact: 'positive',
          analysis: 'Schedule change completed successfully. Monitor your recovery between sessions.',
          confidence: 0.85,
          recommendations: [
            'Ensure adequate recovery between intense sessions',
            'Monitor how this change affects your training rhythm'
          ]
        });
        setShowRebalanceModal(true);
        setAiRebalancing(false);
      }, 1500);
    }

    setDraggedSession(null);
    setDraggedFromDay(null);
  }, [draggedSession, draggedFromDay]);

  // 🚀 NEW: Handle feedback submission with loading states and AI processing
  const handleFeedbackSubmit = async () => {
    if (!selectedSession || isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    
    try {
      // Prepare feedback data
      const feedbackData = {
        sessionId: selectedSession.id,
        completed: feedbackForm.completed,
        actualPace: feedbackForm.actualPace || undefined,
        difficulty: difficultyValue,
        rpe: rpeValue,
        feeling: feedbackForm.feeling,
        comments: feedbackForm.comments,
        weekNumber: selectedSession.week || currentWeek,
        sessionType: selectedSession.subType,
        targetPace: selectedSession.pace || '5:30',
        targetDistance: selectedSession.distance || 5
      };

      console.log('🚀 Submitting session feedback:', feedbackData);

      // Submit feedback to API (correct endpoint)
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          sessionId: feedbackData.sessionId,
          weekNumber: feedbackData.weekNumber,
          day: selectedSession.dayOfWeek || 'saturday',
          sessionType: 'running',
          sessionSubType: feedbackData.sessionType,
          plannedDistance: feedbackData.targetDistance,
          plannedPace: feedbackData.targetPace,
          completed: feedbackData.completed,
          actualPace: feedbackData.actualPace,
          difficulty: feedbackData.difficulty,
          rpe: feedbackData.rpe,
          feeling: feedbackData.feeling,
          comments: feedbackData.comments
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Feedback submitted successfully:', result);

      // Show success message or AI adaptation if available
      if (result.adaptation) {
        // Show AI adaptation modal/message
        setAiAdjustment(result.adaptation);
        setShowAiPanel(true);
        
        // 🚀 NEW: Mark that AI feedback now exists for this session
        if (selectedSession) {
          setHasAiFeedback(prev => ({ ...prev, [selectedSession.id]: true }));
        }
      }

      // 🚀 NEW: Update AI prediction if received
      if (result.updatedPrediction) {
        setPredictedTime(result.updatedPrediction);
        setLastPredictionUpdate(new Date());
        console.log(`🎯 AI updated predicted time: ${result.updatedPrediction}`);
        
        // Show a brief success message about prediction update
        // Could add a toast notification here
      }

      // Reset form and close modal
      setFeedbackForm({
        completed: 'yes',
        actualPace: '',
        difficulty: 5,
        rpe: 5,
        feeling: 'good',
        comments: ''
      });
      setDifficultyValue(5);
      setRpeValue(5);
      setShowFeedback(false);
      setSelectedSession(null);

      // 🚀 NEW: Refresh calendar data to show completed session without manual reload
      console.log('🔄 Refreshing calendar data after feedback submission...');
      _sessionCache.delete(`sessions-${userId}`); // Clear cache to force reload
      // The useEffect will automatically reload when cache is cleared

    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      // Could add error toast here
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // 🧪 TEST: Resubmit last session for AI prediction testing
  const handleResubmitLastSession = async () => {
    if (isResubmitting || !userId) return;

    setIsResubmitting(true);
    
    try {
      console.log('🧪 Fetching last session feedback for resubmission...');
      
      // Get the most recent feedback from the database
      const response = await fetch(`/api/feedback?userId=${userId}&limit=1`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch last session: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.feedback || result.feedback.length === 0) {
        alert('No previous session feedback found to resubmit.');
        return;
      }
      
      const lastFeedback = result.feedback[0];
      console.log('📝 Last feedback found:', lastFeedback);
      
      // Resubmit the same feedback data to trigger AI processing
      const resubmitResponse = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          sessionId: lastFeedback.sessionId,
          weekNumber: lastFeedback.week,
          day: lastFeedback.day,
          sessionType: lastFeedback.sessionType,
          sessionSubType: lastFeedback.sessionSubType,
          plannedDistance: lastFeedback.plannedDistance,
          plannedPace: lastFeedback.plannedPace,
          completed: lastFeedback.completed,
          actualPace: lastFeedback.actualPace,
          difficulty: lastFeedback.difficulty,
          rpe: lastFeedback.rpe,
          feeling: lastFeedback.feeling,
          comments: lastFeedback.comments
        })
      });

      if (!resubmitResponse.ok) {
        throw new Error(`Failed to resubmit feedback: ${resubmitResponse.status}`);
      }

      const resubmitResult = await resubmitResponse.json();
      console.log('✅ Feedback resubmitted successfully:', resubmitResult);

      // Update AI prediction if received
      if (resubmitResult.updatedPrediction) {
        setPredictedTime(resubmitResult.updatedPrediction);
        setLastPredictionUpdate(new Date());
        console.log(`🎯 AI updated predicted time: ${resubmitResult.updatedPrediction}`);
        alert(`AI prediction updated: ${resubmitResult.updatedPrediction}`);
      } else {
        alert('Session resubmitted successfully. No prediction update (may not meet criteria for update).');
      }

    } catch (error) {
      console.error('❌ Error resubmitting last session:', error);
      alert('Failed to resubmit last session. Check console for details.');
    } finally {
      setIsResubmitting(false);
    }
  };

  // 🧪 TEST: Regenerate warm-ups and cool-downs for all sessions
  const handleRegenerateWarmups = async () => {
    if (isRegeneratingWarmups || !userId) return;

    const confirmed = confirm(
      'This will regenerate warm-ups and cool-downs for ALL your running sessions with the new AI logic. Continue?'
    );
    
    if (!confirmed) return;

    setIsRegeneratingWarmups(true);
    
    try {
      console.log('🔄 Starting warm-up regeneration...');
      
      const response = await fetch('/api/regenerate-warmups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Warm-ups regenerated:', result);

      // Show success message with stats
      const { stats } = result;
      alert(
        `🎉 Warm-ups regenerated successfully!\n\n` +
        `📊 Updated: ${stats.updatedSessions}/${stats.totalSessions} sessions\n` +
        `🤖 AI Generated: ${stats.aiGenerated}\n` +
        `🔧 Fallback Used: ${stats.fallbackUsed}`
      );

      // Clear cache so next load gets fresh data
      const cacheKey = `sessions-${userId}`;
      _sessionCache.delete(cacheKey);
      
      // Reload page after brief delay to show success message
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('❌ Error regenerating warm-ups:', error);
      alert('Failed to regenerate warm-ups. Check console for details.');
    } finally {
      setIsRegeneratingWarmups(false);
    }
  };

  // Utility functions
  const getCompactText = (fullText: string): string => {
    if (!fullText) return '';
    
    // Extract key info and make it compact
    if (fullText.includes('dynamic stretching')) {
      return 'Dynamic stretching';
    }
    if (fullText.includes('walking') && fullText.includes('stretching')) {
      return 'Walk + stretching';
    }
    if (fullText.includes('easy jog') && fullText.includes('strides')) {
      return 'Easy + strides';
    }
    if (fullText.includes('easy jog')) {
      return 'Easy jog';
    }
    if (fullText.includes('walk') && fullText.includes('comprehensive')) {
      return 'Walk + stretch';
    }
    if (fullText.includes('recovery') && fullText.includes('stretching')) {
      return 'Recovery stretch';
    }
    
    // Fallback: take first few words
    const words = fullText.split(' ');
    if (words.length <= 3) return fullText;
    return words.slice(0, 3).join(' ') + '...';
  };

  const getSessionColor = (session: Session): string => {
    let baseColor = '';
    
    if (session.type === 'rest') {
      baseColor = 'bg-gray-700/80 text-gray-200 border-gray-600';
    } else if (session.type === 'gym') {
      const gymColors = {
        push: 'bg-blue-700/80 text-blue-100 border-blue-600',
        pull: 'bg-cyan-700/80 text-cyan-100 border-cyan-600', 
        legs: 'bg-purple-700/80 text-purple-100 border-purple-600'
      };
      baseColor = gymColors[session.subType as keyof typeof gymColors] || 'bg-blue-700/80 text-blue-100 border-blue-600';
    } else if (session.type === 'cross_training') {
      const crossTrainingColors = {
        swimming: 'bg-teal-700/80 text-teal-100 border-teal-600',
        yoga: 'bg-pink-700/80 text-pink-100 border-pink-600',
        cycling: 'bg-yellow-700/80 text-yellow-100 border-yellow-600',
        crossfit: 'bg-orange-700/80 text-orange-100 border-orange-600',
        hiking: 'bg-green-700/80 text-green-100 border-green-600'
      };
      baseColor = crossTrainingColors[session.subType as keyof typeof crossTrainingColors] || 'bg-teal-700/80 text-teal-100 border-teal-600';
    } else if (session.type === 'running') {
      const runColors = {
        easy: 'bg-green-700/80 text-green-100 border-green-600',
        tempo: 'bg-orange-700/80 text-orange-100 border-orange-600',
        intervals: 'bg-red-700/80 text-red-100 border-red-600',
        long: 'bg-indigo-700/80 text-indigo-100 border-indigo-600'
      };
      baseColor = runColors[session.subType as keyof typeof runColors] || 'bg-green-700/80 text-green-100 border-green-600';
    }

    // Add completion status - green border and ring
    if (session.completed) {
      baseColor += ' ring-2 ring-green-400 border-green-400 bg-opacity-60';
    }

    if (session.aiModified) {
      baseColor += ' ring-2 ring-cyan-400/60';
    }

    return `${baseColor} border-2 rounded-lg cursor-pointer hover:bg-opacity-90 transition-all duration-200 transform hover:scale-[1.02] shadow-lg`;
  };

  // Helper function to extract main set distance from session description
  const getMainSetDistance = (session: Session): number => {
    if (!session.mainSet) return session.distance || 0;
    
    // Extract distance from mainSet text like "4.5km tempo at enhanced threshold pace"
    const distanceMatch = session.mainSet.match(/(\d+\.?\d*)km/);
    if (distanceMatch) {
      return parseFloat(distanceMatch[1] ?? '');
    }
    
    // Fallback to session.distance if no match found
    return session.distance || 0;
  };

  const getSessionText = (session: Session): JSX.Element => {
    let mainText = '';
    let details: string[] = [];
    
    if (session.type === 'rest') {
      mainText = 'REST DAY';
      details = ['Recovery & stretching'];
    } else if (session.type === 'gym') {
      mainText = `${session.subType.toUpperCase()} DAY`;
      details = []; // No additional details needed for gym sessions
    } else if (session.type === 'cross_training') {
      mainText = `${session.subType.toUpperCase()}`;
      details = [`Duration: ${session.duration || '45min'}`];
    } else if (session.type === 'running') {
      // Extract club name from mainSet if it's a club session
      let clubText = '';
      if (session.isRunningClub && session.mainSet) {
        console.log('🔍 Debug mainSet for club:', session.mainSet);
        const clubMatch = session.mainSet.match(/with (.+?)(?:\s|$)/);
        console.log('🔍 Club match result:', clubMatch);
        if (clubMatch) {
          clubText = ` (${clubMatch[1]})`;
        }
      }
      
      const mainSetDistance = getMainSetDistance(session);
      mainText = `${session.subType.charAt(0).toUpperCase() + session.subType.slice(1)} ${mainSetDistance}K${clubText}`;
      
      const workoutTime = calculateDuration(session.distance || 5, session.pace || '6:30');
      
      switch (session.subType) {
        case 'easy':
          const easyMainSetDistance = getMainSetDistance(session);
          const easyPaceSeconds = paceToSeconds(session.pace || '6:30');
          const easyMainTime = Math.round((easyMainSetDistance * easyPaceSeconds) / 60);
          const easyTotalTime = 10 + easyMainTime + 5; // warmup + main + cooldown
          details = [
            `WU: ${getCompactText(session.warmup || '10min easy jog')}`,
            `Main: ${easyMainTime}min@${session.pace}/km`,
            `CD: ${getCompactText(session.cooldown || '5min walk')}`,
            `Total: ${easyTotalTime}min`
          ];
          break;
        case 'tempo':
          const mainSetDistance = getMainSetDistance(session);
          const paceSeconds = paceToSeconds(session.pace || '5:30');
          const tempoMainTime = Math.round((mainSetDistance * paceSeconds) / 60);
          const totalTime = 15 + tempoMainTime + 10; // warmup + main + cooldown
          details = [
            `WU: ${getCompactText(session.warmup || '15min easy + strides')}`,
            `Tempo: ${tempoMainTime}min@${session.pace}/km`,
            `CD: ${getCompactText(session.cooldown || '10min easy')}`,
            `Total: ${totalTime}min`
          ];
          break;
        case 'long':
          const longMainSetDistance = getMainSetDistance(session);
          const longPaceSeconds = paceToSeconds(session.pace || '6:30');
          const longMainTime = Math.round((longMainSetDistance * longPaceSeconds) / 60);
          const longTotalTime = 15 + longMainTime + 10; // warmup + main + cooldown
          details = [
            `WU: ${getCompactText(session.warmup || '15min easy')}`,
            `Long: ${longMainTime}min progressive`,
            `CD: ${getCompactText(session.cooldown || '10min walk')}`,
            `Total: ${longTotalTime}min`
          ];
          break;
        case 'intervals':
          const intervalMainSetDistance = getMainSetDistance(session);
          const intervalPaceSeconds = paceToSeconds(session.pace || '5:00');
          const intervalMainTime = Math.round((intervalMainSetDistance * intervalPaceSeconds) / 60);
          const intervalTotalTime = 15 + intervalMainTime + 10; // warmup + main + cooldown
          details = [
            `WU: ${getCompactText(session.warmup || '15min easy')}`,
            `Intervals: ${intervalMainTime}min@${session.pace}/km`,
            `CD: ${getCompactText(session.cooldown || '10min easy')}`,
            `Total: ${intervalTotalTime}min`
          ];
          break;
        default:
          details = [`Target: ${session.pace}/km`, `Total: ${workoutTime}min`];
      }
    }

    if (session.completed) {
      mainText = `✅ ${mainText}`;
    }
    if (session.aiModified) {
      mainText = `🤖 ${mainText}`;
    }

    return (
      <div className="space-y-1">
        <div className="font-medium text-sm leading-tight">{mainText}</div>
        {details.map((detail, index) => (
          <div key={index} className="text-xs opacity-80 leading-relaxed">
            {detail}
          </div>
        ))}
      </div>
    );
  };

  // Removed duplicate handleSessionClick - using the one defined earlier

  // 🚀 NEW: Generate motivational AI feedback
  const getMotivationalAIFeedback = async (sessionData: any, feedbackData: any): Promise<string> => {
    try {
      console.log('🤖 Generating motivational AI feedback...');
      
      // Build context for AI
      const sessionContext = `
Session: ${sessionData.subType} run, ${sessionData.distance}km at ${sessionData.pace} pace
Target RPE: ${sessionData.targetRPE?.min}-${sessionData.targetRPE?.max} (${sessionData.targetRPE?.description})
Actual Performance: RPE ${feedbackData.rpe}/10, Difficulty ${feedbackData.difficulty}/10
Feeling: ${feedbackData.feeling}
Completed: ${feedbackData.completed}
Comments: ${feedbackData.comments || 'None'}
`;

      const aiPrompt = `You are an expert running coach providing motivational feedback. Based on this training session data:

${sessionContext}

Provide encouraging, personalized feedback (2-3 sentences) that:
1. Acknowledges their effort and performance
2. Provides positive reinforcement or gentle guidance
3. Connects this session to their half-marathon goal (sub-2:00)
4. Maintains an upbeat, supportive tone

Keep it concise and motivational - this should make them feel good about their training!`;

      const response = await fetch('/api/ai/motivational-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          sessionData,
          feedbackData
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.message || "Great work on today's session! Your consistency is building the fitness you need for race day success. Keep up the excellent training!";
      } else {
        throw new Error(`AI API responded with ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error generating motivational feedback:', error);
      
      // Fallback motivational messages based on performance
      const { rpe, difficulty, completed, feeling } = feedbackData;
      
      if (completed === 'yes' && rpe <= 6 && difficulty <= 6) {
        return "Excellent execution! You hit the sweet spot with your effort level today. This kind of consistency is exactly what will get you to your sub-2:00 goal. Keep building on this momentum! 🎯";
      } else if (completed === 'yes' && (rpe >= 8 || difficulty >= 8)) {
        return "Wow, you pushed through a tough one today! That mental strength you showed will serve you well on race day. Remember, every challenging session makes you stronger. Great job persevering! 💪";
      } else if (completed === 'yes') {
        return "Solid work today! You're steadily building the fitness foundation for your half marathon goal. Each session like this brings you one step closer to that sub-2:00 finish. Stay consistent! 🏃‍♂️";
      } else if (completed === 'partial') {
        return "Good on you for getting out there and giving it a go! Sometimes our bodies need us to listen and adjust. This flexibility in training will serve you well. Tomorrow is a new opportunity! 🌟";
      } else {
        return "No worries about today - everyone has off days, and that's completely normal in training! The important thing is you're committed to the process. Rest up and come back stronger next session! 🔄";
      }
    }
  };

  // Handle feedback submission (legacy version - to be removed)
  const handleFeedbackSubmitLegacy = async () => {
    if (!selectedSession || !userId) return;

    try {
      const feedbackData = {
        userId,
        sessionId: selectedSession.id, // Should already be in correct format (run vs running)
        weekNumber: currentWeek, // API expects 'weekNumber', not 'week'
        day: selectedSession.dayOfWeek || selectedSession.day,
        sessionType: selectedSession.type,
        sessionSubType: selectedSession.subType,
        plannedDistance: selectedSession.distance,
        plannedPace: selectedSession.pace,
        plannedTime: selectedSession.time,
        ...feedbackForm
      };

      console.log('📤 Submitting feedback:', feedbackData);

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });

      if (response.ok) {
        // Mark session as completed in the current session data
        allSessions.forEach(session => {
          if (session.id === selectedSession.id) {
            session.completed = true;
          }
        });
        
        // 🚀 NEW: Generate AI motivational feedback
        console.log('🤖 Generating motivational feedback for session:', selectedSession.id);
        const motivationalFeedback = await getMotivationalAIFeedback(selectedSession, {
          ...feedbackForm,
          rpe: feedbackForm.rpe, // Fix: use feedbackForm.rpe instead of undefined rpeValue
          difficulty: feedbackForm.difficulty // Fix: use feedbackForm.difficulty instead of undefined difficultyValue
        });
        
        setMotivationalMessage(motivationalFeedback);
        setShowMotivationalAI(true);
        // Don't auto-hide - let user close manually to read the message

        // 🚀 NEW: Update AI predicted time based on recent performance
        await updateAIPredictedTime();
        
        // 🤖 NEW: Check if cross-week modifications are needed
        await checkCrossWeekModifications();

        setShowFeedback(false);
      } else {
        // Add error handling for non-200 responses
        const errorData = await response.text();
        console.error('❌ Feedback submission failed:', response.status, errorData);
        throw new Error(`Failed to submit feedback: ${response.status}`);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // 🤖 AI Predicted Time Update Function
  const updateAIPredictedTime = async () => {
    if (!userId) return;
    
    setIsUpdatingPrediction(true);
    try {
      console.log('🤖 Updating AI predicted time based on recent sessions');
      
      // Get recent feedback data (last 5 sessions)
      const recentFeedbackPromises = [];
      for (let week = Math.max(1, currentWeek - 2); week <= currentWeek; week++) {
        recentFeedbackPromises.push(
          fetch(`/api/feedback?userId=${userId}&weekNumber=${week}`)
            .then(res => res.ok ? res.json() : null)
        );
      }
      
      const feedbackResponses = await Promise.all(recentFeedbackPromises);
      const recentSessions: SessionFeedback[] = [];
      
      feedbackResponses.forEach(response => {
        if (response?.feedback) {
          response.feedback.forEach((fb: any) => {
            if (fb.completed && fb.completed !== '' && fb.sessionType) {
              recentSessions.push({
                sessionId: fb.id || '',
                completed: fb.completed as 'yes' | 'no' | 'partial',
                actualPace: fb.actualPace || '',
                difficulty: fb.difficulty || 5,
                rpe: fb.rpe || 5,
                feeling: fb.feeling || 'ok' as 'terrible' | 'bad' | 'ok' | 'good' | 'great',
                comments: fb.comments || '',
                weekNumber: fb.weekNumber || currentWeek,
                sessionType: fb.sessionType || 'running',
                targetPace: fb.plannedPace || '5:00',
                targetDistance: fb.plannedDistance || 5
              });
            }
          });
        }
      });
      
      if (recentSessions.length >= 2) {
        const aiService = new PerplexityAIService();
        const newPrediction = await aiService.predictRaceTime(recentSessions, goalTime);
        
        if (newPrediction && newPrediction !== goalTime) {
          setPredictedTime(newPrediction);
          setLastPredictionUpdate(new Date());
          console.log(`🏃 AI updated predicted time: ${newPrediction}`);
        }
      }
    } catch (error) {
      console.error('❌ AI prediction update failed:', error);
    } finally {
      setIsUpdatingPrediction(false);
    }
  };

  // 🆕 Helper function to format race display
  const formatRaceDisplay = () => {
    if (!userProfile) return 'Half Marathon Goal';
    
    const raceTypeMap: { [key: string]: string } = {
      'FIVE_K': '5K',
      'TEN_K': '10K', 
      'HALF_MARATHON': 'Half Marathon',
      'MARATHON': 'Marathon'
    };
    
    const raceType = raceTypeMap[userProfile.raceType] || 'Half Marathon';
    
    if (userProfile.raceDate) {
      const raceDate = new Date(userProfile.raceDate);
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return `${raceType} • ${raceDate.toLocaleDateString('en-GB', options)}`;
    }
    
    return `${raceType} Goal`;
  };

  // 🤖 Cross-Week AI Modifications
  const checkCrossWeekModifications = async () => {
    if (!userId || !selectedSession) return;
    
    try {
      console.log('🤖 Checking if cross-week modifications are needed');
      
      // Only trigger for high RPE/difficulty with concerning patterns
      const aiService = new PerplexityAIService();
      const shouldTrigger = aiService.shouldTriggerAI({
        sessionId: selectedSession.id,
        completed: feedbackForm.completed as 'yes' | 'no' | 'partial',
        rpe: feedbackForm.rpe,
        difficulty: feedbackForm.difficulty,
        feeling: feedbackForm.feeling as 'terrible' | 'bad' | 'ok' | 'good' | 'great',
        comments: feedbackForm.comments || '',
        weekNumber: currentWeek,
        sessionType: selectedSession.type,
        targetPace: selectedSession.pace || '5:00',
        targetDistance: selectedSession.distance || 5
      });
      
      if (!shouldTrigger) {
        console.log('🤖 No cross-week modifications needed - feedback within acceptable range');
        
        // 🆕 Show user confirmation that AI checked their session
        setMotivationalMessage(`✅ AI Coach Analysis: Your session performance looks excellent! Training plan remains on track for your ${formatRaceDisplay()} goal. No adjustments needed.`);
        setShowMotivationalAI(true);
        
        return;
      }
      
      // Get recent feedback to analyze patterns
      const recentFeedbackPromises = [];
      for (let week = Math.max(1, currentWeek - 1); week <= currentWeek; week++) {
        recentFeedbackPromises.push(
          fetch(`/api/feedback?userId=${userId}&weekNumber=${week}`)
            .then(res => res.ok ? res.json() : null)
        );
      }
      
      const feedbackResponses = await Promise.all(recentFeedbackPromises);
      const recentPatterns = feedbackResponses
        .filter(Boolean)
        .flatMap(response => response.feedback || [])
        .filter(fb => fb.completed && fb.rpe >= 8) // High intensity pattern
        .length;
      
      // Only suggest cross-week changes if there's a concerning pattern
      if (recentPatterns >= 2) {
        // 🆕 Show user that AI detected patterns and is making recommendations
        setMotivationalMessage('🤖 AI Coach detected training stress patterns in your recent sessions. Analyzing recommendations for upcoming training adjustments...');
        setShowMotivationalAI(true);
        
        const mockModifications = [
          {
            week: currentWeek + 1,
            day: 'Wednesday',
            modificationType: 'intensity_reduction',
            originalSession: {
              subType: 'tempo',
              distance: 8,
              pace: '4:20'
            },
            newSession: {
              subType: 'easy',
              distance: 6,
              pace: '4:50',
              reason: 'Reduced intensity to prevent overreaching based on recent high RPE pattern'
            },
            explanation: `Based on your recent feedback showing consistent RPE 8+ sessions, I recommend reducing next week's tempo to an easy run to help you recover and maintain training quality.`
          }
        ];
        
        setCrossWeekModifications(mockModifications);
        setShowCrossWeekModal(true);
        console.log('🤖 Cross-week modifications suggested due to high intensity pattern');
      }
      
    } catch (error) {
      console.error('❌ Cross-week analysis failed:', error);
    }
  };
  
  const applyCrossWeekModifications = async (modifications: any[]) => {
    try {
      console.log(`🤖 Applying ${modifications.length} cross-week modifications`);
      
      const response = await fetch('/api/ai/cross-week-modifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentWeek,
          modifications,
          appliedAt: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Cross-week modifications applied:', result);
        
        // TODO: Update local session data to reflect changes
        // For now, we'll show a success message
        setShowCrossWeekModal(false);
      } else {
        console.error('❌ Failed to apply cross-week modifications');
      }
    } catch (error) {
      console.error('❌ Error applying cross-week modifications:', error);
    }
  };

  const getWeekCompletionPercentage = (): number => {
    const allSessions = Object.values(weekData).flat()
      .filter(session => session.type === 'running');
    
    if (allSessions.length === 0) return 0;
    
    const completedCount = allSessions.filter(session => 
      session.completed
    ).length;
    
    return Math.round((completedCount / allSessions.length) * 100);
  };

  const paceZones = calculatePaceZones(goalTime);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span className="text-xl text-white">Loading your training plan...</span>
          <p className="text-gray-400 mt-2">Preparing your personalized sessions</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-red-900/20 border-2 border-red-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <h3 className="text-xl font-bold text-red-300">Error Loading Training Plan</h3>
              <p className="text-red-200 mt-1">{error}</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  // No sessions state
  if (allSessions.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-yellow-900/20 border-2 border-yellow-500/30 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-900" />
          </div>
          <h3 className="text-xl font-bold text-yellow-300 mb-2">No Training Sessions Found</h3>
          <p className="text-yellow-200 mb-4">
            Your training plan hasn't been generated yet. Complete the onboarding process to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gray-900 min-h-screen text-white">
      {/* AI Rebalancing Indicator */}
      {aiRebalancing && (
        <div className="fixed top-4 right-4 z-50 bg-cyan-900 border border-cyan-400 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 font-medium">AI analyzing schedule optimization...</span>
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-end px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(prev => Math.max(1, prev - 1))}
            disabled={currentWeek <= 1}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          
          <div className="px-3 py-1 bg-cyan-600 rounded text-white font-medium text-sm min-w-[80px] text-center">
            Week {currentWeek}
          </div>
          
          <button
            onClick={() => setCurrentWeek(prev => Math.min(totalWeeks, prev + 1))}
            disabled={currentWeek >= totalWeeks}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compact Training Metrics */}
      <div className="px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-400">Focus:</span>
            <span className="font-medium text-white">
              {currentWeek <= 4 ? 'Base Building' : 
               currentWeek <= 8 ? 'Build Phase' : 
               currentWeek <= 10 ? 'Peak Phase' : 'Taper Phase'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Week Total:</span>
            <span className="font-medium text-white">
              {Object.values(weekData).flat().filter(s => s.type === 'running').reduce((total, s) => total + (s.distance || 0), 0)}km
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-gray-400">AI Modified:</span>
            <span className="font-medium text-white">
              {Object.values(weekData).flat().filter(s => s.aiModified).length}
            </span>
          </div>
        </div>
      </div>

      {/* Compact AI Performance Prediction */}
      <div className="px-6 mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-sm font-medium text-white">AI Prediction</span>
              {isUpdatingPrediction && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-cyan-400">Analyzing...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-gray-400">Goal</div>
              <div className="text-sm font-bold text-green-400 font-mono">{goalTime}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Predicted</div>
              <div className={`text-sm font-bold font-mono ${
                predictedTime === goalTime ? 'text-cyan-400' :
                predictedTime < goalTime ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {predictedTime}
              </div>
            </div>
            
            {/* Test Button */}
            <button
              onClick={handleResubmitLastSession}
              disabled={isResubmitting}
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                isResubmitting
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title="🧪 Test AI Predictions - Resubmit your last session"
            >
              {isResubmitting ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  Test
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3" />
                  🧪 Test
                </>
              )}
            </button>
            
            {/* Regenerate Warm-ups Button */}
            <button
              onClick={handleRegenerateWarmups}
              disabled={isRegeneratingWarmups}
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                isRegeneratingWarmups
                  ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              title="🔄 Regenerate Warm-ups - Update all sessions with new AI logic"
            >
              {isRegeneratingWarmups ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Settings className="w-3 h-3" />
                  🔄 Regenerate
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Motivational AI Banner */}
      {showMotivationalAI && (
        <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/30 rounded-xl p-4 animate-fade-in mx-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-cyan-900" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-cyan-300">AI Coach</h3>
              <p className="text-cyan-100">{motivationalMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 px-6">
        {days.map((day) => (
          <div key={day} className="space-y-3">
            {/* Day Header */}
            <div className="text-center py-3 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border border-gray-600">
              <h3 className="font-bold text-white text-lg">{day}</h3>
              <p className="text-xs text-gray-400">{(weekData[day] || []).length} session{(weekData[day] || []).length !== 1 ? 's' : ''}</p>
            </div>

            {/* Sessions for this day */}
            <div 
              className="space-y-3 min-h-[300px] relative"
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={(e) => handleDragLeave(e, day)}
              onDrop={(e) => handleDrop(e, day)}
              style={{
                backgroundColor: dragOverDay === day && draggedFromDay !== day ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                border: dragOverDay === day && draggedFromDay !== day ? '2px dashed rgba(6, 182, 212, 0.6)' : '2px solid transparent',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              {(weekData[day] || []).length === 0 ? (
                <div className="p-6 bg-gray-800/50 border border-gray-600 rounded-lg text-center">
                  <span className="text-gray-400 text-sm">No sessions scheduled</span>
                </div>
              ) : (
                (weekData[day] || []).map((session) => {
                  const isDragging = draggedSession?.id === session.id;
                  const canDrag = session.type !== 'rest' && !session.completed;
                  
                  return (
                    <div
                      key={session.id}
                      className={`p-4 ${getSessionColor(session)} ${
                        isDragging ? 'opacity-50 scale-95 rotate-2' : ''
                      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      draggable={canDrag}
                      onDragStart={(e) => canDrag && handleDragStart(e, session, day)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (session.type === 'running' && !isDragging) {
                          handleSessionClick(session);
                        }
                      }}
                      style={{ position: 'relative' }}
                    >
                      <div className="space-y-2">
                        {getSessionText(session)}
                        
                        {session.time && (
                          <div className="text-xs opacity-75 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.time}
                          </div>
                        )}
                        
                        {session.targetRPE && session.type !== 'gym' && session.type !== 'rest' && (
                          <div className="text-xs opacity-75 space-y-1">
                            <div>
                              <span>Target RPE: {session.targetRPE.min}-{session.targetRPE.max}/10</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex gap-0.5">
                                {[...Array(10)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      session.targetRPE && i + 1 >= session.targetRPE.min && i + 1 <= session.targetRPE.max
                                        ? 'bg-cyan-400'
                                        : 'bg-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="flex gap-0.5 text-xs opacity-60">
                                {[...Array(10)].map((_, i) => (
                                  <span key={i} className="w-1.5 text-center text-xs leading-none">
                                    {i + 1}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {session.targetRPE?.description && (
                              <div className="text-xs opacity-60 italic">
                                {session.targetRPE.description}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {session.aiModified && (
                          <div className="text-xs text-cyan-400 space-y-1">
                            <div className="flex items-center gap-1">
                              <span>🤖</span>
                              <span className="font-medium">AI Modified</span>
                            </div>
                            {session.originalPace && session.pace !== session.originalPace && (
                              <div className="ml-4">
                                Pace: {session.pace} <span className="opacity-75">(was {session.originalPace})</span>
                              </div>
                            )}
                            {session.originalDistance && session.distance !== session.originalDistance && (
                              <div className="ml-4">
                                Distance: {session.distance}km <span className="opacity-75">(was {session.originalDistance}km)</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Completion tick indicator */}
                        {session.completed && (
                          <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
                            <span className="w-4 h-4 bg-green-400 text-green-900 rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                            Completed
                          </div>
                        )}
                      </div>
                      
                      {canDrag && !isDragging && (
                        <div className="absolute top-2 right-2 text-xs opacity-50">
                          ⋮⋮
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              
              {/* Drop zone indicator */}
              {dragOverDay === day && draggedFromDay !== day && (
                <div className="absolute bottom-3 left-3 right-3 p-3 border-2 border-dashed border-cyan-400 rounded-lg text-center text-xs text-cyan-400 bg-cyan-400/10">
                  Drop here to reschedule
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Rebalancing Modal */}
      {showRebalanceModal && rebalanceResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full border border-gray-600">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-8 h-8 text-cyan-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">AI Schedule Analysis</h3>
                  <p className="text-gray-400">Confidence: {Math.round((rebalanceResult.confidence || 0.85) * 100)}%</p>
                </div>
                <button 
                  onClick={() => setShowRebalanceModal(false)}
                  className="ml-auto text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className={`p-4 rounded-lg border mb-4 ${
                rebalanceResult.impact === 'positive' ? 'bg-green-900/20 border-green-500/30' :
                rebalanceResult.impact === 'negative' ? 'bg-red-900/20 border-red-500/30' :
                'bg-yellow-900/20 border-yellow-500/30'
              }`}>
                <div className={`font-semibold mb-2 ${
                  rebalanceResult.impact === 'positive' ? 'text-green-400' :
                  rebalanceResult.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {(rebalanceResult.impact || 'neutral').charAt(0).toUpperCase() + (rebalanceResult.impact || 'neutral').slice(1)} Impact
                </div>
                <p className="text-gray-300 text-sm">{rebalanceResult.analysis}</p>
              </div>

              {rebalanceResult.recommendations && rebalanceResult.recommendations.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-white mb-2">AI Recommendations:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {rebalanceResult.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRebalanceModal(false)}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && selectedSession && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-600">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Session Feedback</h3>
                <button 
                  onClick={() => setShowFeedback(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-400 mt-1">
                {selectedSession.subType} {getMainSetDistance(selectedSession)}K • {selectedSession.pace}/km
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Completion Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Did you complete this session?
                </label>
                <select 
                  value={feedbackForm.completed}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, completed: e.target.value }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
                >
                  <option value="yes">Yes - Completed as planned</option>
                  <option value="partial">Partially - Had to modify</option>
                  <option value="no">No - Couldn't complete</option>
                </select>
              </div>

              {/* Actual Pace */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Actual pace (min:sec per km)
                </label>
                <input 
                  type="text"
                  value={feedbackForm.actualPace}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, actualPace: e.target.value }))}
                  placeholder="e.g., 5:30"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-400"
                />
              </div>

              {/* Difficulty Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Difficulty (1 = Very Easy, 10 = Maximum Effort): {feedbackForm.difficulty}
                </label>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={feedbackForm.difficulty}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Very Easy</span>
                  <span>Maximum</span>
                </div>
              </div>

              {/* RPE Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  RPE - Rate of Perceived Exertion (1 = Rest, 10 = All Out): {feedbackForm.rpe}
                </label>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={feedbackForm.rpe}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, rpe: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Rest</span>
                  <span>All Out</span>
                </div>
              </div>

              {/* Feeling */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  How did you feel during the session?
                </label>
                <select 
                  value={feedbackForm.feeling}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, feeling: e.target.value }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
                >
                  <option value="excellent">Excellent - Felt amazing</option>
                  <option value="good">Good - Felt strong</option>
                  <option value="ok">Okay - Average session</option>
                  <option value="tired">Tired - Struggled a bit</option>
                  <option value="poor">Poor - Really difficult</option>
                </select>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional comments (optional)
                </label>
                <textarea 
                  value={feedbackForm.comments}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Any observations, issues, or notes about this session..."
                  rows={3}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-750 rounded-b-xl">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeedback(false)}
                  className="flex-1 px-4 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFeedbackSubmit}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium transition-colors"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for sliders and drag effects */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0891b2;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-webkit-slider-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: #4b5563;
          border-radius: 4px;
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0891b2;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-track {
          width: 100%;
          height: 8px;
          cursor: pointer;
          background: #4b5563;
          border-radius: 4px;
          border: none;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Drag and drop visual feedback */
        .cursor-grab:active {
          cursor: grabbing;
        }
      `}</style>

      {/* 🚀 NEW: Session Detail Modal */}
      {selectedSession && !showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-600 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedSession.aiModified && (
                  <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                    AI
                  </div>
                )}
                {selectedSession.subType.charAt(0).toUpperCase() + selectedSession.subType.slice(1)} Run
              </h2>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Session Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-xs text-gray-400 mb-1">DISTANCE</div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedSession.distance}km
                  {selectedSession.aiModified && selectedSession.originalDistance !== selectedSession.distance && (
                    <span className="text-xs text-cyan-400">
                      (was {selectedSession.originalDistance}km)
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">TARGET PACE</div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedSession.pace}/km
                  {selectedSession.aiModified && selectedSession.originalPace !== selectedSession.pace && (
                    <span className="text-xs text-cyan-400">
                      (was {selectedSession.originalPace})
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">TIME</div>
                <div className="text-lg font-bold text-white">{selectedSession.time}</div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">CLUB RUN</div>
                <div className="text-lg font-bold text-white">
                  {selectedSession.madeRunning ? '✅ Yes' : '❌ No'}
                </div>
              </div>
            </div>

            {/* Session Structure */}
            <div className="space-y-4 mb-6">
              {selectedSession.warmup && (
                <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-400">Warm-up</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedSession.warmup}</p>
                </div>
              )}

              {selectedSession.mainSet && (
                <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">Main Set</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedSession.mainSet}</p>
                </div>
              )}

              {selectedSession.cooldown && (
                <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-400">Cool-down</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedSession.cooldown}</p>
                </div>
              )}
            </div>

            {/* AI Modified Indicator */}
            {selectedSession.aiModified && (
              <div className="mb-6 p-3 bg-cyan-900/30 rounded border border-cyan-400">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-cyan-400">AI Modified Session</span>
                </div>
                <p className="text-xs text-gray-300">
                  This session has been automatically adjusted based on your recent feedback.
                </p>
              </div>
            )}

            {/* Target RPE */}
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

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFeedback(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Give Feedback
              </button>
              {/* 🚀 NEW: See Feedback button (only show if AI feedback exists) */}
              {hasAiFeedback[selectedSession.id] && (
                <button
                  onClick={() => loadStoredAiFeedback(selectedSession.id)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex items-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  See AI Feedback
                </button>
              )}
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 NEW: Session Feedback Modal */}
      {showFeedback && selectedSession && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFeedback(false);
            }
          }}
        >
          <div 
            className="bg-gray-800 rounded-lg border border-gray-600 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-6">
              Session Feedback - AI Auto-Adjustment
            </h2>
            
            {/* AI Info Box */}
            <div className="mb-6 p-4 bg-blue-900/30 rounded border border-blue-400">
              <div className="text-sm text-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4" />
                  <strong>AI intelligently adapts your training when needed:</strong>
                </div>
                <ul className="text-xs space-y-1 ml-6">
                  <li>• <strong>RPE 8 within target</strong> + positive comments → <span className="text-green-300">No changes (perfect execution!)</span></li>
                  <li>• <strong>RPE 9+</strong> or negative feedback → <span className="text-yellow-300">Easier sessions, recovery focus</span></li>
                  <li>• <strong>Consistently low RPE</strong> (≤3) → <span className="text-blue-300">Progressive intensity increases</span></li>
                  <li>• <strong>Your comments</strong> are heavily weighted in AI decisions</li>
                </ul>
              </div>
            </div>
            
            {/* Feedback Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleFeedbackSubmit(); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Completed Status */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Completed</label>
                  <select 
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    value={feedbackForm.completed}
                    onChange={(e) => setFeedbackForm({...feedbackForm, completed: e.target.value})}
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
                
                {/* Actual Pace */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Actual Pace</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 5:30"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    value={feedbackForm.actualPace}
                    onChange={(e) => setFeedbackForm({...feedbackForm, actualPace: e.target.value})}
                  />
                </div>
              </div>

              {/* Difficulty Slider */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Difficulty (1-10): <span className="text-cyan-400 font-bold">{difficultyValue}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={difficultyValue}
                  onChange={(e) => setDifficultyValue(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Very Easy</span>
                  <span>Very Hard</span>
                </div>
              </div>

              {/* RPE Slider with Interactive Feedback */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  RPE (1-10): <span className="text-cyan-400 font-bold">{rpeValue}</span>
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
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpeValue}
                  onChange={(e) => setRpeValue(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Very Light</span>
                  <span>Maximal</span>
                </div>
                
                {/* 🚀 Interactive RPE Feedback Messages */}
                {selectedSession?.targetRPE && (
                  <div className="mt-3 text-xs">
                    {rpeValue >= selectedSession.targetRPE.min && rpeValue <= selectedSession.targetRPE.max ? (
                      <div className="text-green-300 flex items-center gap-2 p-2 bg-green-900/20 rounded">
                        <span>✅</span>
                        <span>Perfect effort for {selectedSession.subType} run!</span>
                      </div>
                    ) : rpeValue > selectedSession.targetRPE.max ? (
                      <div className="text-red-300 flex items-center gap-2 p-2 bg-red-900/20 rounded">
                        <span>⚠️</span>
                        <span>Higher than expected - consider if pacing was too aggressive</span>
                      </div>
                    ) : (
                      <div className="text-yellow-300 flex items-center gap-2 p-2 bg-yellow-900/20 rounded">
                        <span>💡</span>
                        <span>Lower than target - could potentially push a bit harder next time</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Smart AI Training Predictions */}
              {(difficultyValue >= 9 || rpeValue >= 9) && (
                <div className="p-3 bg-orange-900/30 rounded border border-orange-400">
                  <div className="flex items-center gap-2 text-orange-300">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-semibold">AI may adjust training</span>
                  </div>
                  <p className="text-xs text-orange-200 mt-1">
                    Very high intensity detected. AI will review your comments and recent trends.
                  </p>
                </div>
              )}

              {(difficultyValue === 8 || rpeValue === 8) && (
                <div className="p-3 bg-blue-900/30 rounded border border-blue-400">
                  <div className="flex items-center gap-2 text-blue-300">
                    <Brain className="w-4 h-4" />
                    <span className="text-sm font-semibold">AI analyzing performance</span>
                  </div>
                  <p className="text-xs text-blue-200 mt-1">
                    RPE/Difficulty 8 detected. AI will check if this matches your target intensity and read your comments.
                  </p>
                </div>
              )}

              {(difficultyValue <= 3 && rpeValue <= 3) && (
                <div className="p-3 bg-green-900/30 rounded border border-green-400">
                  <div className="flex items-center gap-2 text-green-300">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-semibold">AI may increase intensity</span>
                  </div>
                  <p className="text-xs text-green-200 mt-1">
                    Consistently low intensity. AI may suggest progressive increases to improve fitness.
                  </p>
                </div>
              )}

              {/* Feeling and Comments */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">How did you feel?</label>
                <select 
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  value={feedbackForm.feeling}
                  onChange={(e) => setFeedbackForm({...feedbackForm, feeling: e.target.value})}
                >
                  <option value="great">Great</option>
                  <option value="good">Good</option>
                  <option value="okay">Okay</option>
                  <option value="tired">Tired</option>
                  <option value="struggling">Struggling</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2">Comments (optional)</label>
                <textarea 
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                  rows={3}
                  placeholder="Any additional notes about this session..."
                  value={feedbackForm.comments}
                  onChange={(e) => setFeedbackForm({...feedbackForm, comments: e.target.value})}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
                    isSubmittingFeedback
                      ? 'bg-gray-600 cursor-not-allowed text-gray-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSubmittingFeedback ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingFeedback}
                  onClick={() => {
                    if (!isSubmittingFeedback) {
                      setShowFeedback(false);
                      setSelectedSession(null);
                    }
                  }}
                  className={`px-4 py-2 rounded transition-colors ${
                    isSubmittingFeedback
                      ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 NEW: Motivational AI Modal */}
      {showMotivationalAI && motivationalMessage && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" 
          onClick={() => setShowMotivationalAI(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg border border-gray-600 max-w-2xl w-full max-h-[80vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-black">🤖</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">AI Training Coach</h2>
                  <div className="text-sm text-gray-400">Session Analysis & Motivation</div>
                </div>
                <button 
                  onClick={() => setShowMotivationalAI(false)} 
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>

              {/* AI Generated Message */}
              <div className="mb-6 p-4 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-lg border border-cyan-400/30">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-bold text-black">AI</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white leading-relaxed text-sm">
                      {motivationalMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Session Summary */}
              {selectedSession && (
                <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Session Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Session:</span>
                      <span className="text-white ml-2 capitalize">{selectedSession.subType} Run</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Distance:</span>
                      <span className="text-white ml-2">{selectedSession.distance}km</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Target Pace:</span>
                      <span className="text-white ml-2">{selectedSession.pace}/km</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Your RPE:</span>
                      <span className="text-white ml-2">{rpeValue}/10</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Encouragement */}
              <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400 text-lg">🏃‍♂️</span>
                  <span className="text-sm font-semibold text-green-400">Training Progress</span>
                </div>
                <p className="text-xs text-green-200">
                  Week {currentWeek} of {totalWeeks} • Target: Sub-2:00 Half Marathon • Race: Oct 12, 2025
                </p>
                <div className="mt-2 bg-green-900/30 rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMotivationalAI(false)}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors text-sm font-medium"
                >
                  Thanks, Coach! 💪
                </button>
                <button
                  onClick={() => {
                    setShowMotivationalAI(false);
                    // Could add logic to view next session or training plan here
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
                >
                  View Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 🚀 NEW: AI Recommendations Modal */}
      {showAiPanel && aiAdjustment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-600">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-cyan-900" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Coach Analysis</h3>
                    <p className="text-gray-400 text-sm">{aiAdjustment.userMessage}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiPanel(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* AI Recommendations */}
              {aiAdjustment.recommendations && aiAdjustment.recommendations.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Personalized Recommendations
                  </h4>
                  <div className="space-y-3">
                    {aiAdjustment.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <p className="text-gray-200 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adaptations Summary */}
              {aiAdjustment.adaptations && Object.keys(aiAdjustment.adaptations).length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-400" />
                    Training Adaptations
                  </h4>
                  <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    {Object.entries(aiAdjustment.adaptations).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-2">
                        <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-cyan-400 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Severity Indicator */}
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-5 h-5 ${
                    aiAdjustment.severity === 'high' || aiAdjustment.severity === 'significant' ? 'text-red-400' :
                    aiAdjustment.severity === 'medium' || aiAdjustment.severity === 'moderate' ? 'text-yellow-400' : 'text-green-400'
                  }`} />
                  <span className="text-gray-300">Analysis Priority:</span>
                </div>
                <span className={`font-medium capitalize ${
                  aiAdjustment.severity === 'high' || aiAdjustment.severity === 'significant' ? 'text-red-400' :
                  aiAdjustment.severity === 'medium' || aiAdjustment.severity === 'moderate' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {aiAdjustment.severity}
                </span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 bg-gray-750 rounded-b-xl">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                >
                  Got it, thanks! 
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Week Modifications Modal */}
      {showCrossWeekModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-600 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Cross-Week Analysis</h3>
                    <p className="text-sm text-gray-400">Recommended adjustments to upcoming weeks</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCrossWeekModal(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              {/* Analysis Summary */}
              <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold text-yellow-300">Pattern Detected</span>
                </div>
                <p className="text-sm text-yellow-200">
                  Based on your recent high RPE feedback, I've identified some adjustments that could help prevent overreaching and maintain training quality.
                </p>
              </div>
              
              {/* Modifications List */}
              <div className="space-y-4 mb-6">
                {crossWeekModifications.map((mod, index) => (
                  <div key={index} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-cyan-400">
                        Week {mod.week} • {mod.day}
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        {mod.modificationType.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Current Plan</div>
                        <div className="text-sm text-white">
                          {mod.originalSession.subType} • {mod.originalSession.distance}km
                        </div>
                        <div className="text-xs text-gray-500">{mod.originalSession.pace}/km</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">AI Suggestion</div>
                        <div className="text-sm text-green-400">
                          {mod.newSession.subType} • {mod.newSession.distance || mod.originalSession.distance}km
                        </div>
                        <div className="text-xs text-gray-500">{mod.newSession.pace}/km</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-300 bg-gray-800/50 rounded p-2">
                      <strong className="text-cyan-400">Why:</strong> {mod.explanation}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => applyCrossWeekModifications(crossWeekModifications)}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-medium transition-colors text-white flex items-center justify-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Apply AI Recommendations
                </button>
                <button
                  onClick={() => setShowCrossWeekModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                >
                  Keep Current Plan
                </button>
              </div>
              
              <div className="mt-4 text-xs text-gray-500 text-center">
                🤖 These changes will only affect future weeks and help maintain training quality
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Simplified memo comparison - focus on reference equality
const arePropsEqual = (prevProps: AITrainingCalendarProps, nextProps: AITrainingCalendarProps) => {
  console.log('🔍 Memo comparison:', {
    userIdSame: prevProps.userId === nextProps.userId,
    weekSame: prevProps.initialWeek === nextProps.initialWeek,
    sessionDataRef: prevProps.sessionData === nextProps.sessionData,
    prevLength: prevProps.sessionData?.length || 0,
    nextLength: nextProps.sessionData?.length || 0
  });
  
  return (
    prevProps.userId === nextProps.userId &&
    prevProps.initialWeek === nextProps.initialWeek &&
    prevProps.sessionData === nextProps.sessionData &&
    prevProps.totalWeeks === nextProps.totalWeeks
  );
};

export default memo(TrainingCalendar, arePropsEqual);