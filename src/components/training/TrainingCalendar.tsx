import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, MapPin, Activity } from 'lucide-react';

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
    paceAdjustment: number;        // seconds per km (+ or -)
    distanceAdjustment: number;    // km (+ or -)
    intensityAdjustment: 'easier' | 'harder' | 'same';
    sessionsToModify: number;      // how many upcoming sessions
  };
  goalTimeUpdate?: {
    newGoalTime: string;
    confidence: number;
    improvement: number;           // seconds faster/slower
  };
  reasoning: string;
  modifications: string[];        // List of specific changes made
}

const AITrainingCalendar = () => {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [goalTime, setGoalTime] = useState('2:00:00');
  const [predictedTime, setPredictedTime] = useState('2:00:00');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [difficultyValue, setDifficultyValue] = useState(5);
  const [rpeValue, setRpeValue] = useState(5);
  const [aiAdjustment, setAiAdjustment] = useState<TrainingAdjustment | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  // NEW STATE: Store modified sessions across all weeks
  const [modifiedSessions, setModifiedSessions] = useState<{[sessionId: string]: Session}>({});

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

  const secondsToTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Convert pace string to seconds per km
  const paceToSeconds = (pace: string): number => {
    const parts = pace.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0] || '0', 10);
    const seconds = parseInt(parts[1] || '0', 10);
    return minutes * 60 + seconds;
  };

  // Convert seconds per km back to pace string
  const secondsToPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate all pace zones from goal time
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

  // Calculate session duration in minutes
  const calculateDuration = (distance: number, pace: string): number => {
    const paceSeconds = paceToSeconds(pace);
    const totalSeconds = (distance * paceSeconds) + 300 + 600; // warmup + cooldown
    return Math.round(totalSeconds / 60);
  };

  // Progressive training plan with AI modification capability
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

    const baseSchedule: { [key: string]: Session[] } = {
      Monday: [
        { 
          id: `mon-gym-${weekNum}`, 
          type: 'gym', 
          subType: 'push', 
          duration: '60 min', 
          time: '04:30' 
        },
        { 
          id: `mon-run-${weekNum}`, 
          type: 'running', 
          subType: 'easy', 
          distance: plan.easyDistance, 
          pace: paceZones.easy, 
          time: '17:00', 
          madeRunning: true,
          warmup: '10 min easy jog + dynamic stretching',
          mainSet: `${plan.easyDistance}km steady at easy pace with MadeRunning`,
          cooldown: '5 min walk + stretching'
        }
      ],
      Tuesday: [
        { 
          id: `tue-gym-${weekNum}`, 
          type: 'gym', 
          subType: 'pull', 
          duration: '60 min', 
          time: '04:30' 
        }
      ],
      Wednesday: [
        { 
          id: `wed-run-${weekNum}`, 
          type: 'running', 
          subType: 'tempo', 
          distance: plan.tempoDistance, 
          pace: paceZones.tempo, 
          time: '05:00', 
          madeRunning: true,
          warmup: '15 min easy + 4x100m strides',
          mainSet: `${Math.round(plan.tempoDistance * 0.6)}km tempo at threshold pace with MadeRunning`,
          cooldown: '10 min easy jog + stretching'
        },
        { 
          id: `wed-gym-${weekNum}`, 
          type: 'gym', 
          subType: 'legs', 
          duration: '60 min', 
          time: '06:00' 
        }
      ],
      Thursday: [
        { 
          id: `thu-gym-${weekNum}`, 
          type: 'gym', 
          subType: 'push', 
          duration: '60 min', 
          time: '04:30' 
        },
        { 
          id: `thu-run-${weekNum}`, 
          type: 'running', 
          subType: 'easy', 
          distance: plan.intervalDistance, 
          pace: paceZones.easy, 
          time: '18:00', 
          madeRunning: false,
          warmup: '10 min easy jog + dynamic stretching',
          mainSet: `${plan.intervalDistance}km steady at easy pace (solo)`,
          cooldown: '5 min walk + stretching'
        }
      ],
      Friday: [
        { 
          id: `fri-gym-${weekNum}`, 
          type: 'gym', 
          subType: 'pull', 
          duration: '60 min', 
          time: '04:30' 
        }
      ],
      Saturday: [
        { 
          id: `sat-gym-${weekNum}`, 
          type: 'gym', 
          subType: 'legs', 
          duration: '60 min', 
          time: '06:00' 
        },
        { 
          id: `sat-run-${weekNum}`, 
          type: 'running', 
          subType: 'long', 
          distance: plan.longDistance, 
          pace: paceZones.easy, 
          time: '09:00', 
          madeRunning: true,
          warmup: '15 min easy jog + dynamic stretching',
          mainSet: `${plan.longDistance}km progressive long run with MadeRunning`,
          cooldown: '10 min walk + full stretching routine'
        }
      ],
      Sunday: [{ 
        id: `sun-rest-${weekNum}`, 
        type: 'rest', 
        subType: 'easy' 
      }]
    };

    // Apply any AI modifications to sessions
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

  const [weekData, setWeekData] = useState<WeekData>(() => getWeekData(currentWeek));

  useEffect(() => {
    setWeekData(getWeekData(currentWeek));
  }, [currentWeek, goalTime, modifiedSessions]);

  // Enhanced AI call for auto-adjustments
  const getAIAdjustment = async (sessionData: any): Promise<TrainingAdjustment> => {
    const response = await fetch('/api/ai/auto-adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionData,
        currentGoalTime: goalTime,
        predictedTime: predictedTime,
        currentWeek,
        weekData: weekData.weeklySchedule
      })
    });

    const result = await response.json();
    return result.adjustment;
  };

  // FIXED: Apply AI adjustments to future sessions and update state
  const applyAIAdjustments = (adjustment: TrainingAdjustment) => {
    if (adjustment.action === 'maintain') return;

    const sessionsToModify = adjustment.nextSessionChanges.sessionsToModify;
    const paceAdjustment = adjustment.nextSessionChanges.paceAdjustment;
    const distanceAdjustment = adjustment.nextSessionChanges.distanceAdjustment;
    
    const newModifiedSessions = { ...modifiedSessions };
    let modifiedCount = 0;

    // Find and modify upcoming running sessions across multiple weeks
    for (let week = currentWeek; week <= Math.min(12, currentWeek + 2) && modifiedCount < sessionsToModify; week++) {
      const weekData = getWeekData(week);
      
      Object.keys(weekData.weeklySchedule).forEach(day => {
        if (modifiedCount >= sessionsToModify) return;
        
        const daySessions = weekData.weeklySchedule[day];
        if (!daySessions) return;
        
        daySessions.forEach(session => {
          if (session.type === 'running' && modifiedCount < sessionsToModify) {
            // Apply modifications
            const currentPaceSeconds = paceToSeconds(session.pace || '6:00');
            const newPaceSeconds = Math.max(240, currentPaceSeconds + paceAdjustment); // min 4:00/km
            const newDistance = Math.max(1, (session.distance || 5) + distanceAdjustment);
            
            const modifiedSession: Session = {
              ...session,
              pace: secondsToPace(newPaceSeconds),
              distance: newDistance,
              aiModified: true,
              originalPace: session.originalPace || session.pace || '6:00',
              originalDistance: session.originalDistance || session.distance || 5,
              mainSet: `${newDistance}km at ${adjustment.nextSessionChanges.intensityAdjustment} pace (AI adjusted: ${adjustment.reasoning})`
            };
            
            newModifiedSessions[session.id] = modifiedSession;
            modifiedCount++;
          }
        });
      });
    }

    // Update state with modified sessions
    setModifiedSessions(newModifiedSessions);

    // Update goal time if AI suggests it
    if (adjustment.goalTimeUpdate && adjustment.goalTimeUpdate.confidence > 0.8) {
      setGoalTime(adjustment.goalTimeUpdate.newGoalTime);
      setPredictedTime(adjustment.goalTimeUpdate.newGoalTime);
    }

    console.log(`🤖 AI modified ${modifiedCount} upcoming sessions`);
  };

  // Enhanced feedback submission with auto-adjustment
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const feedback = {
      completed: formData.get('completed'),
      actualPace: formData.get('actualPace'),
      difficulty: difficultyValue,
      rpe: rpeValue,
      feeling: formData.get('feeling'),
      comments: formData.get('comments')
    };

    // AI triggers for both hard AND easy sessions
    if (feedback.difficulty >= 8 || feedback.rpe >= 8 || 
        (feedback.difficulty <= 3 && feedback.rpe <= 3 && feedback.completed === 'yes')) {
      
      try {
        const sessionData = {
          type: selectedSession?.subType || 'unknown',
          plannedDistance: selectedSession?.distance || 0,
          actualDistance: selectedSession?.distance || 0,
          plannedPace: selectedSession?.pace || '0:00',
          actualPace: feedback.actualPace || selectedSession?.pace || '0:00',
          rpe: feedback.rpe,
          difficulty: feedback.difficulty,
          feeling: feedback.feeling,
          comments: feedback.comments,
          completed: feedback.completed
        };

        const adjustment = await getAIAdjustment(sessionData);
        
        // Apply the adjustments automatically
        applyAIAdjustments(adjustment);
        
        // Show AI panel with what was changed
        setAiAdjustment(adjustment);
        setShowAiPanel(true);
        
      } catch (error) {
        console.error('AI auto-adjustment failed:', error);
      }
    }

    setShowFeedback(false);
    setSelectedSession(null);
    setDifficultyValue(5);
    setRpeValue(5);
  };

  const getSessionColor = (session: Session): string => {
    let baseColor = '';
    
    if (session.type === 'rest') baseColor = 'bg-gray-700 text-gray-300';
    else if (session.type === 'gym') {
      const gymColors = {
        push: 'bg-blue-600 text-white',
        pull: 'bg-cyan-600 text-white', 
        legs: 'bg-orange-600 text-white'
      };
      baseColor = gymColors[session.subType as keyof typeof gymColors] || 'bg-blue-600 text-white';
    }
    else if (session.type === 'running') {
      const runColors = {
        easy: 'bg-green-600 text-white',
        tempo: 'bg-orange-600 text-white',
        intervals: 'bg-purple-600 text-white',
        long: 'bg-red-600 text-white'
      };
      baseColor = runColors[session.subType as keyof typeof runColors] || 'bg-green-600 text-white';
    }

    // Add AI modification indicator
    return session.aiModified ? `${baseColor} ring-2 ring-cyan-400 ring-opacity-60` : baseColor;
  };

  const getSessionText = (session: Session): string => {
    if (session.type === 'rest') return 'REST DAY';
    if (session.type === 'gym') return `${session.subType.toUpperCase()} DAY`;
    if (session.type === 'running') {
      const madeRunningText = session.madeRunning ? ' with MadeRunning' : '';
      const text = `${session.subType.charAt(0).toUpperCase() + session.subType.slice(1)} ${session.distance}K${madeRunningText}`;
      return session.aiModified ? `🤖 ${text}` : text;
    }
    return '';
  };

  const getTotalWeekDistance = (): number => {
    return Object.values(weekData.weeklySchedule).flat()
      .filter(session => session.type === 'running' && session.distance)
      .reduce((total, session) => total + (session.distance || 0), 0);
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
              ×
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
                <strong>Goal Updated:</strong> {aiAdjustment.goalTimeUpdate.newGoalTime}
                <br />
                <span className="text-cyan-300">
                  {aiAdjustment.goalTimeUpdate.improvement > 0 ? 'Faster' : 'Safer'} target
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
      <div className="p-6 border-b" style={{ backgroundColor: 'var(--surface-color)', borderColor: '#3a3a4a' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <label className="block text-xs text-gray-400 mb-2">GOAL TIME</label>
                <input
                  type="text"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm font-mono text-center w-20"
                />
              </div>
              <div className="text-center">
                <label className="block text-xs text-gray-400 mb-2">TARGET PACE</label>
                <div className="text-sm font-mono" style={{ color: 'var(--primary-color)' }}>
                  {paceZones.target}/km
                </div>
              </div>
              <div className="text-center">
                <label className="block text-xs text-gray-400 mb-2">EASY PACE</label>
                <div className="text-sm font-mono text-green-400">
                  {paceZones.easy}/km
                </div>
              </div>
              <div className="text-center">
                <label className="block text-xs text-gray-400 mb-2">TEMPO PACE</label>
                <div className="text-sm font-mono text-orange-400">
                  {paceZones.tempo}/km
                </div>
              </div>
              <div className="text-center">
                <label className="block text-xs text-gray-400 mb-2">5K PACE</label>
                <div className="text-sm font-mono text-purple-400">
                  {paceZones.fiveK}/km
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-400">AI PREDICTED</div>
              <div className="text-lg font-mono text-cyan-400">{predictedTime}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
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
          <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: 'var(--surface-color)', borderColor: '#3a3a4a' }}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Total Distance</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {getTotalWeekDistance()}km
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Training Focus</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {currentWeek <= 4 ? 'Base Building' : 
                   currentWeek <= 8 ? 'Build Phase' :
                   currentWeek <= 10 ? 'Peak Phase' : 'Taper'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>AI Modifications</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }} className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
                    AI
                  </div>
                  {Object.keys(modifiedSessions).length}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '16px',
            minHeight: '480px'
          }}>
            {days.map((day) => (
              <div
                key={day}
                style={{
                  backgroundColor: '#2a2a3a',
                  borderRadius: '8px',
                  minHeight: '180px',
                  padding: '12px'
                }}
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
                  {(weekData.weeklySchedule[day] || []).map((session) => (
                    <div
                      key={session.id}
                      className={`p-2 rounded cursor-pointer transition-all hover:scale-105 ${getSessionColor(session)}`}
                      style={{ fontSize: '11px' }}
                      onClick={() => {
                        if (session.type === 'running') {
                          setSelectedSession(session);
                        }
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>{getSessionText(session)}</div>
                      {session.time && (
                        <div style={{ fontSize: '10px', opacity: 0.75, marginTop: '4px' }}>
                          {session.time}
                        </div>
                      )}
                      {session.aiModified && (
                        <div style={{ fontSize: '9px', color: '#00d4ff', marginTop: '2px' }}>
                          Pace: {session.pace} (was {session.originalPace})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ENHANCED Session Modal with Complete Breakdown */}
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
                ×
              </button>
            </div>

            {/* Session Overview Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
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
            </div>

            {/* COMPLETE Session Breakdown */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Session Breakdown</h3>
              
              {/* Warmup */}
              <div className="mb-3 p-3 rounded-lg bg-green-900 bg-opacity-20 border border-green-500 border-opacity-30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-green-400" />
                  <span className="text-sm font-semibold text-green-400">Warm-up</span>
                </div>
                <p className="text-sm text-gray-300">{selectedSession.warmup}</p>
              </div>

              {/* Main Set */}
              <div className="mb-3 p-3 rounded-lg bg-blue-900 bg-opacity-20 border border-blue-500 border-opacity-30">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">Main Set</span>
                </div>
                <p className="text-sm text-gray-300">{selectedSession.mainSet}</p>
              </div>

              {/* Cooldown */}
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

      {/* Enhanced Feedback Form */}
      {showFeedback && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div style={{ 
            backgroundColor: 'var(--surface-color)', 
            borderRadius: '8px', 
            padding: '24px', 
            maxWidth: '500px', 
            width: '100%',
            border: '1px solid #3a3a4a'
          }}>
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
              {/* Row 1: Completed & Actual Pace */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

              {/* Row 2: Difficulty & RPE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
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
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                    RPE (1-10): <span className="text-cyan-400 font-bold">{rpeValue}</span>
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
                    <span>Easy</span>
                    <span>Maximal</span>
                  </div>
                </div>
              </div>

              {/* AI Trigger Indicators */}
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

              {/* Row 3: Feeling */}
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

              {/* Row 4: Comments */}
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

              {/* Submit Buttons */}
              <div className="flex gap-3 mt-4">
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

      {/* Drag and Drop Styles */}
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