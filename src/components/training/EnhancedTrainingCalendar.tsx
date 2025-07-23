// src/components/training/TrainingCalendar.tsx
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Clock, Zap, Brain, AlertCircle, 
  CheckCircle, RotateCcw, Activity, Target, TrendingUp 
} from 'lucide-react';

interface Session {
  id: string;
  type: 'running' | 'gym' | 'rest';
  subType: string;
  time?: string | undefined;
  distance?: number | undefined;
  pace?: string | undefined;
  duration?: number | undefined;
  madeRunning?: boolean | undefined;
  completed: boolean;
  aiModified?: boolean | undefined;
  aiReason?: string | undefined;
}

interface WeeklySchedule {
  [key: string]: Session[];
}

interface AIAnalysisResult {
  analysis: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  recommendations: string[];
  futureAdjustments: Array<{
    week: number;
    day: string;
    sessionId?: string;
    adjustment: {
      type: 'pace' | 'distance' | 'move' | 'intensity';
      value: string | number;
      reason: string;
    };
  }>;
  trainingLoadImpact: {
    currentWeek: number;
    nextWeek: number;
    recoveryRisk: 'low' | 'medium' | 'high';
  };
}

export default function EnhancedTrainingCalendar() {
  // Internal state management
  const [currentWeek, setCurrentWeek] = useState(1);
  const [goalTime, setGoalTime] = useState('2:00:00');
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());
  
  // Drag and drop state
  const [draggedSession, setDraggedSession] = useState<Session | null>(null);
  const [draggedFromDay, setDraggedFromDay] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Generate training schedule
  const generateWeekSchedule = (weekNum: number): WeeklySchedule => {
    const weekPlans = {
      1: { easy: 5, tempo: 5, intervals: 4, long: 8 },
      2: { easy: 6, tempo: 6, intervals: 5, long: 10 },
      3: { easy: 7, tempo: 7, intervals: 6, long: 12 },
      // Add more weeks as needed
    };

    const plan = weekPlans[weekNum as keyof typeof weekPlans] || weekPlans[1];

    return {
      monday: [
        { id: `mon-gym-${weekNum}`, type: 'gym' as const, subType: 'push', time: '04:30', completed: false },
        { id: `mon-run-${weekNum}`, type: 'running' as const, subType: 'easy', distance: plan.easy, pace: '6:32', time: '17:00', madeRunning: true, completed: false }
      ],
      tuesday: [
        { id: `tue-gym-${weekNum}`, type: 'gym' as const, subType: 'pull', time: '04:30', completed: false }
      ],
      wednesday: [
        { id: `wed-run-${weekNum}`, type: 'running' as const, subType: 'tempo', distance: plan.tempo, pace: '5:13', time: '05:00', madeRunning: true, completed: false },
        { id: `wed-gym-${weekNum}`, type: 'gym' as const, subType: 'legs', time: '06:00', completed: false }
      ],
      thursday: [
        { id: `thu-gym-${weekNum}`, type: 'gym' as const, subType: 'push', time: '04:30', completed: false },
        { id: `thu-run-${weekNum}`, type: 'running' as const, subType: 'easy', distance: plan.intervals, pace: '6:32', time: '18:00', madeRunning: false, completed: false }
      ],
      friday: [
        { id: `fri-gym-${weekNum}`, type: 'gym' as const, subType: 'pull', time: '04:30', completed: false }
      ],
      saturday: [
        { id: `sat-gym-${weekNum}`, type: 'gym' as const, subType: 'legs', time: '06:00', completed: false },
        { id: `sat-run-${weekNum}`, type: 'running' as const, subType: 'long', distance: plan.long, pace: '6:32', time: '09:00', madeRunning: true, completed: false }
      ],
      sunday: [
        { id: `sun-rest-${weekNum}`, type: 'rest' as const, subType: 'rest', completed: false }
      ]
    };
  };

  // Load schedule and completed sessions
  useEffect(() => {
    const schedule = generateWeekSchedule(currentWeek);
    setWeeklySchedule(schedule);

    // Load completed sessions from database
    const loadCompletedSessions = async () => {
      try {
        const response = await fetch(`/api/feedback?weekNumber=${currentWeek}`);
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
        }
      } catch (error) {
        console.error('Error loading completed sessions:', error);
      }
    };
    
    loadCompletedSessions();
  }, [currentWeek]);

  const analyzeScheduleChange = async (session: Session, fromDay: string, toDay: string) => {
    if (session.type !== 'running') return; // Only analyze running sessions
    
    setAiAnalyzing(true);
    
    try {
      const response = await fetch('/api/ai/rebalance-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          sessionType: session.subType,
          fromDay,
          toDay,
          distance: session.distance,
          currentWeek,
          goalTime,
          weeklySchedule
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const data = await response.json();
      setAiResult(data.analysis);
      setShowAiModal(true);
    } catch (error) {
      console.error('AI Analysis Error:', error);
      // Show a basic confirmation without AI analysis
      setShowAiModal(true);
      setAiResult({
        analysis: 'Schedule change completed. Monitor your training response over the next few sessions.',
        impact: 'neutral',
        confidence: 0.7,
        recommendations: [
          'Keep track of your energy levels and recovery',
          'Adjust effort levels if you feel overly fatigued',
          'Maintain consistent pacing in your sessions'
        ],
        futureAdjustments: [],
        trainingLoadImpact: {
          currentWeek: 8,
          nextWeek: 8,
          recoveryRisk: 'low'
        }
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, session: Session, dayKey: string) => {
    setDraggedSession(session);
    setDraggedFromDay(dayKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // For Firefox compatibility
    
    // Visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDragOverDay(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, dayKey: string) => {
    // Only remove drag over effect if we're actually leaving the day container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverDay(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, toDay: string) => {
    e.preventDefault();
    setDragOverDay(null);
    
    if (!draggedSession || !draggedFromDay || toDay === draggedFromDay) {
      return;
    }

    // Update the schedule immediately
    const newSchedule = { ...weeklySchedule };
    const fromArray = [...newSchedule[draggedFromDay] ?? []];
    const sessionIndex = fromArray.findIndex(s => s.id === draggedSession.id);
    
    if (sessionIndex > -1) {
      // Remove from original day
      const removedSessions = fromArray.splice(sessionIndex, 1);
      const movedSession = removedSessions[0];
      
      if (movedSession) {
        newSchedule[draggedFromDay] = fromArray;
        
        // Add to new day
        if (!newSchedule[toDay]) {
          newSchedule[toDay] = [];
        }
        newSchedule[toDay].push(movedSession);
        
        // Update the schedule immediately
        setWeeklySchedule(newSchedule);
        
        // Then analyze with AI
        await analyzeScheduleChange(draggedSession, draggedFromDay, toDay);
      }
    }

    // Reset drag state
    setDraggedSession(null);
    setDraggedFromDay(null);
  }, [draggedSession, draggedFromDay, weeklySchedule, currentWeek, goalTime]);

  const applyAiSuggestions = async () => {
    if (!aiResult?.futureAdjustments) return;

    try {
      // Apply AI suggestions to future sessions
      const updatedSchedule = { ...weeklySchedule };
      
      for (const adjustment of aiResult.futureAdjustments) {
        if (adjustment.week === currentWeek && updatedSchedule[adjustment.day]) {
          const sessions = updatedSchedule[adjustment.day] ?? [];
          const runningSessionIndex = sessions.findIndex(s => s.type === 'running');
          
          if (runningSessionIndex > -1) {
            const session = { ...sessions[runningSessionIndex] } as Session;
            session.aiModified = true;
            session.aiReason = adjustment.adjustment.reason;

            if (adjustment.adjustment.type === 'pace') {
              session.pace = String(adjustment.adjustment.value);
            } else if (adjustment.adjustment.type === 'distance') {
              session.distance = Number(adjustment.adjustment.value);
            }

            sessions[runningSessionIndex] = session;
          }
        }
      }

      setWeeklySchedule(updatedSchedule);

      // Save AI analysis to database (optional)
      await fetch('/api/ai-adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week: currentWeek,
          triggerSession: draggedSession?.id,
          analysis: aiResult.analysis,
          adjustments: aiResult.futureAdjustments
        }),
      });

      setShowAiModal(false);
      setAiResult(null);
    } catch (error) {
      console.error('Error applying AI suggestions:', error);
    }
  };

  const SessionCard: React.FC<{ session: Session; dayKey: string }> = ({ session, dayKey }) => {
    const isRunning = session.type === 'running';
    const isRest = session.type === 'rest';
    const isDragging = draggedSession?.id === session.id;
    const isCompleted = completedSessions.has(session.id);
    
    let cardClasses = `
      relative p-3 mb-2 rounded-lg transition-all duration-200 text-sm border
      ${isCompleted ? 'opacity-75 border-green-500 border-2' : 'border-gray-600'}
      ${session.aiModified ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/20' : ''}
      ${isDragging ? 'opacity-50 scale-95' : ''}
    `;
    
    if (isRest) {
      cardClasses += ' bg-gray-800 text-gray-300 cursor-default';
    } else if (isRunning) {
      cardClasses += ` cursor-grab hover:cursor-grabbing hover:scale-105 shadow-lg
        ${session.subType === 'easy' ? 'bg-gradient-to-r from-green-600 to-green-700' : ''}
        ${session.subType === 'tempo' ? 'bg-gradient-to-r from-orange-600 to-red-600' : ''}
        ${session.subType === 'intervals' ? 'bg-gradient-to-r from-red-600 to-pink-600' : ''}
        ${session.subType === 'long' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
      `;
    } else {
      cardClasses += ` cursor-grab hover:cursor-grabbing hover:scale-105 shadow-lg
        ${session.subType === 'push' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700' : ''}
        ${session.subType === 'pull' ? 'bg-gradient-to-r from-teal-600 to-teal-700' : ''}
        ${session.subType === 'legs' ? 'bg-gradient-to-r from-purple-600 to-purple-700' : ''}
      `;
    }

    const displayText = isRest 
      ? 'REST DAY' 
      : isRunning 
        ? `${session.subType.charAt(0).toUpperCase() + session.subType.slice(1)} ${session.distance}K${session.madeRunning ? ' with MadeRunning' : ''}`
        : `${session.subType.toUpperCase()} DAY`;

    return (
      <div
        className={cardClasses}
        draggable={!isRest && !isCompleted}
        onDragStart={(e) => !isRest && !isCompleted && handleDragStart(e, session, dayKey)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCompleted && <CheckCircle size={16} className="text-green-400" />}
            {session.aiModified && (
              <div className="relative group">
                <Brain size={16} className="text-cyan-400" />
                {session.aiReason && (
                  <div className="absolute bottom-6 left-0 bg-gray-900 text-xs p-2 rounded shadow-lg border border-gray-600 w-48 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-cyan-400 font-medium mb-1">AI Modified</div>
                    {session.aiReason}
                  </div>
                )}
              </div>
            )}
            <span className="font-medium text-white">{displayText}</span>
          </div>
          {session.time && (
            <div className="flex items-center gap-1 text-xs text-white/75">
              <Clock size={12} />
              {session.time}
            </div>
          )}
        </div>
        {isRunning && (
          <div className="mt-1 text-xs text-white/75 flex items-center gap-4">
            {session.pace && (
              <div className="flex items-center gap-1">
                <Target size={12} />
                {session.pace}/km
              </div>
            )}
            {session.distance && (
              <div className="flex items-center gap-1">
                <Activity size={12} />
                {session.distance}km
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const DayColumn: React.FC<{ day: string; sessions: Session[] }> = ({ day, sessions }) => {
    const isDropTarget = dragOverDay === day && draggedFromDay !== day;
    
    return (
      <div 
        className={`
          bg-gray-900/50 rounded-lg p-4 min-h-[300px] border transition-all duration-200
          ${isDropTarget ? 'border-cyan-400 bg-cyan-900/20 scale-102' : 'border-gray-700'}
        `}
        onDragOver={(e) => handleDragOver(e, day)}
        onDragLeave={(e) => handleDragLeave(e, day)}
        onDrop={(e) => handleDrop(e, day)}
      >
        <h3 className="text-cyan-400 font-semibold mb-3 capitalize text-center">
          {day}
        </h3>
        <div className="space-y-2">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session} dayKey={day} />
          ))}
        </div>
        
        {isDropTarget && (
          <div className="mt-4 p-3 border-2 border-dashed border-cyan-400 rounded-lg text-center text-cyan-400 text-sm">
            Drop here to reschedule
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">AI Training Calendar - Week {currentWeek}</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentWeek(prev => Math.max(1, prev - 1))}
            disabled={currentWeek === 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 text-white"
          >
            Previous
          </button>
          <span className="px-4 py-2 bg-gray-800 rounded-lg text-white">
            Week {currentWeek} of 12
          </span>
          <button
            onClick={() => setCurrentWeek(prev => Math.min(12, prev + 1))}
            disabled={currentWeek === 12}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 text-white"
          >
            Next
          </button>
        </div>
      </div>

      {/* AI Analysis Status */}
      {aiAnalyzing && (
        <div className="flex items-center justify-center gap-3 bg-cyan-900/30 px-6 py-4 rounded-lg border border-cyan-500/30">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 font-medium">AI analyzing schedule optimization...</span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {days.map(day => (
          <DayColumn 
            key={day} 
            day={day} 
            sessions={weeklySchedule[day] || []} 
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="text-yellow-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Smart Drag & Drop Training</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
          <div>
            <p className="mb-2">• <strong className="text-white">Drag running sessions</strong> to reschedule</p>
            <p className="mb-2">• <strong className="text-white">AI analyzes</strong> impact automatically</p>
            <p>• <strong className="text-white">Get suggestions</strong> for optimal training flow</p>
          </div>
          <div>
            <p className="mb-2">• <Brain className="inline w-4 h-4 text-cyan-400 mr-1" /> AI-modified sessions</p>
            <p className="mb-2">• <CheckCircle className="inline w-4 h-4 text-green-400 mr-1" /> Completed sessions</p>
            <p>• <Activity className="inline w-4 h-4 text-blue-400 mr-1" /> Live schedule optimization</p>
          </div>
          <div>
            <p className="mb-2">• <strong className="text-white">Recovery patterns</strong> analyzed</p>
            <p className="mb-2">• <strong className="text-white">Training load</strong> balanced</p>
            <p>• <strong className="text-white">Future weeks</strong> adjusted automatically</p>
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {showAiModal && aiResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAiModal(false)}>
          <div className="bg-gray-800 rounded-lg border border-gray-600 max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <Brain className="text-cyan-400" size={28} />
                <div>
                  <h2 className="text-xl font-bold text-white">AI Schedule Analysis</h2>
                  <p className="text-gray-400 text-sm">Confidence: {Math.round(aiResult.confidence * 100)}%</p>
                </div>
              </div>

              {/* Analysis Summary */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-3 h-3 rounded-full ${
                    aiResult.impact === 'positive' ? 'bg-green-500' :
                    aiResult.impact === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className={`font-medium ${
                    aiResult.impact === 'positive' ? 'text-green-400' :
                    aiResult.impact === 'negative' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {aiResult.impact.charAt(0).toUpperCase() + aiResult.impact.slice(1)} Impact
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed">{aiResult.analysis}</p>
              </div>

              {/* Recommendations */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                  <AlertCircle size={16} />
                  AI Recommendations
                </h3>
                <ul className="space-y-2">
                  {aiResult.recommendations.map((rec, idx) => (
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
                  onClick={applyAiSuggestions}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 px-6 py-3 rounded-lg font-medium transition-colors text-white"
                  disabled={aiResult.futureAdjustments.length === 0}
                >
                  Apply AI Suggestions
                </button>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                >
                  Keep Current Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}