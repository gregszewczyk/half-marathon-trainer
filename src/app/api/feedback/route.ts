// 🔧 COMPLETE WORKING FEEDBACK API
// Replace your entire src/app/api/feedback/route.ts with this

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PerplexityAIService } from '../../../lib/ai/perplexity_service';
import { WeatherService } from '../../../lib/weather/weatherService';

const prisma = new PrismaClient();
const aiService = new PerplexityAIService();
const weatherService = new WeatherService();

// 🚀 NEW: Helper function to check if actual pace is significantly faster than planned
function isPaceSignificantlyFaster(actualPace: string, plannedPace: string): boolean {
  try {
    // Convert pace strings (MM:SS) to seconds per km
    const actualSeconds = timeToSeconds(actualPace);
    const plannedSeconds = timeToSeconds(plannedPace);
    
    if (actualSeconds === 0 || plannedSeconds === 0) return false;
    
    // Consider it significant if 15+ seconds per km faster
    const improvement = plannedSeconds - actualSeconds;
    console.log(`⏱️ Pace analysis: planned ${plannedPace} (${plannedSeconds}s), actual ${actualPace} (${actualSeconds}s), improvement: ${improvement}s`);
    
    return improvement >= 15; // 15+ seconds per km improvement triggers prediction update
  } catch (error) {
    console.error('❌ Error comparing paces:', error);
    return false;
  }
}

function timeToSeconds(timeStr: string | undefined): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0] || '0', 10) || 0;
  const seconds = parseInt(parts[1] || '0', 10) || 0;
  
  return minutes * 60 + seconds;
}

// 🚀 NEW: Fetch weather data for session
async function fetchSessionWeatherData(userId: string, sessionDate: Date) {
  try {
    // Get user's location from profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { location: true }
    });
    
    if (!userProfile?.location) {
      console.log('⚠️ No location set for user, skipping weather data');
      return null;
    }
    
    console.log(`🌤️ Fetching weather data for ${userProfile.location} on ${sessionDate.toDateString()}`);
    
    const weatherData = await weatherService.getHistoricalWeather(
      userProfile.location,
      sessionDate
    );
    
    if (weatherData) {
      console.log(`✅ Weather data fetched: ${weatherData.temperature}°C, ${weatherData.conditions}`);
      return {
        weatherTemp: weatherData.temperature,
        weatherConditions: weatherData.conditions,
        weatherWindSpeed: weatherData.windSpeed,
        weatherHumidity: weatherData.humidity,
        weatherDescription: weatherData.description,
        weatherTimestamp: weatherData.timestamp
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching weather data:', error);
    return null;
  }
}

// 🚀 NEW: Weekly completion detection and AI analysis trigger
async function checkWeekCompletion(userId: string, weekNumber: number) {
  try {
    console.log(`🔍 Checking week ${weekNumber} completion for user ${userId}`);
    
    // Get all sessions for the week
    const weekSessions = await prisma.generatedSession.findMany({
      where: { 
        userId,
        week: weekNumber,
        sessionType: 'RUNNING' // Only check running sessions for completion
      },
      select: {
        id: true,
        dayOfWeek: true,
        sessionType: true,
        sessionSubType: true
      }
    });
    
    if (weekSessions.length === 0) {
      console.log(`⚠️ No sessions found for week ${weekNumber}`);
      return;
    }
    
    // Get feedback for all running sessions in the week
    const sessionIds = weekSessions.map(s => 
      `${s.dayOfWeek.toLowerCase().slice(0, 3)}-run-${weekNumber}`
    );
    
    const completedFeedback = await prisma.sessionFeedback.findMany({
      where: {
        userId,
        week: weekNumber,
        sessionId: { in: sessionIds },
        completed: 'yes'
      }
    });
    
    console.log(`📊 Week ${weekNumber}: ${completedFeedback.length}/${sessionIds.length} running sessions completed`);
    
    // If all running sessions are completed, trigger AI analysis
    if (completedFeedback.length === sessionIds.length && completedFeedback.length >= 3) {
      console.log(`🎉 Week ${weekNumber} completed! Triggering AI analysis...`);
      await triggerWeeklyAIAnalysis(userId, weekNumber, completedFeedback);
    }
    
  } catch (error) {
    console.error('❌ Error checking week completion:', error);
  }
}

// 🚀 NEW: Trigger weekly AI analysis 
async function triggerWeeklyAIAnalysis(userId: string, completedWeek: number, weekFeedback: any[]) {
  try {
    // Calculate week metrics
    const completionRate = 1.0; // Since we only call this when week is complete
    const averageRPE = weekFeedback.reduce((sum, f) => sum + (f.rpe || 5), 0) / weekFeedback.length;
    const averageDifficulty = weekFeedback.reduce((sum, f) => sum + (f.difficulty || 5), 0) / weekFeedback.length;
    
    const weekMetrics = {
      completionRate,
      averageRPE,
      averageDifficulty,
      totalSessions: weekFeedback.length,
      comments: weekFeedback.map(f => f.comments).filter(Boolean)
    };
    
    // Call proactive week analysis API
    const analysisResponse = await fetch('http://localhost:3000/api/ai/proactive-week-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        completedWeek,
        upcomingWeek: completedWeek + 1,
        weekFeedback,
        weekMetrics,
        goalTime: '1:50:00',
        currentPhase: completedWeek <= 4 ? 'Base building' : 
                     completedWeek <= 8 ? 'Build phase' : 
                     completedWeek <= 10 ? 'Peak phase' : 'Taper',
        weeksRemaining: 12 - completedWeek
      })
    });
    
    if (analysisResponse.ok) {
      const analysis = await analysisResponse.json();
      console.log(`✅ AI analysis completed for week ${completedWeek}:`, analysis);
      
      // Store weekly analysis in user profile for retrieval
      await prisma.userProfile.update({
        where: { userId },
        data: {
          weeklyAnalysis: JSON.stringify({
            completedWeek,
            analysis: analysis.weekAnalysis,
            generatedAt: new Date().toISOString()
          })
        }
      });
      
      console.log(`💾 Stored weekly analysis for week ${completedWeek}`);
    } else {
      console.error('❌ AI analysis API failed:', analysisResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Error triggering AI analysis:', error);
  }
}

// 🚀 NEW: Update race time prediction based on recent feedback
async function updateRaceTimePrediction(userId: string): Promise<string | null> {
  try {
    console.log(`🏃 Updating race time prediction for user ${userId}`);
    
    // Get recent feedback from last 3-4 sessions for prediction
    const recentFeedback = await prisma.sessionFeedback.findMany({
      where: {
        userId,
        completed: 'yes',
        sessionSubType: { in: ['tempo', 'intervals', 'long', 'threshold'] }
      },
      orderBy: { submittedAt: 'desc' },
      take: 5 // Last 5 quality sessions
    });
    
    console.log(`📊 Found ${recentFeedback.length} recent quality sessions for prediction analysis`);
    
    if (recentFeedback.length < 2) {
      console.log('⚠️ Not enough recent sessions for prediction update (need at least 2)');
      return null;
    }
    
    // Get user's current goal time
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { targetTime: true }
    });
    
    const currentGoalTime = userProfile?.targetTime || '2:00:00';
    
    // Convert to AI service format
    const sessionFeedbackData = recentFeedback.map(f => ({
      sessionId: f.sessionId,
      completed: f.completed as 'yes' | 'no' | 'partial',
      actualPace: f.actualPace || f.plannedPace || '5:30',
      difficulty: f.difficulty,
      rpe: f.rpe,
      feeling: f.feeling as 'terrible' | 'bad' | 'ok' | 'good' | 'great',
      comments: f.comments || '',
      weekNumber: f.week,
      sessionType: f.sessionSubType || 'easy',
      targetPace: f.plannedPace || '5:30',
      targetDistance: f.plannedDistance || 5
    }));
    
    // Call AI prediction service
    console.log(`🤖 Calling AI prediction service with ${sessionFeedbackData.length} sessions, current goal: ${currentGoalTime}`);
    const updatedPrediction = await aiService.predictRaceTime(sessionFeedbackData, currentGoalTime);
    console.log(`🎯 AI returned prediction: ${updatedPrediction}`);
    
    if (updatedPrediction !== currentGoalTime) {
      console.log(`🎯 AI updated prediction: ${currentGoalTime} → ${updatedPrediction}`);
      
      // 🚀 NEW: Store updated prediction in database with history tracking
      try {
        // Get current prediction history
        const currentProfile = await prisma.userProfile.findUnique({
          where: { userId }
        });
        
        // Parse existing history or create new array
        let predictionHistory = [];
        if ((currentProfile as any)?.predictionHistory) {
          try {
            predictionHistory = JSON.parse((currentProfile as any).predictionHistory);
          } catch (error) {
            console.warn('Could not parse prediction history, starting fresh');
            predictionHistory = [];
          }
        }
        
        // Add new prediction to history
        predictionHistory.push({
          prediction: updatedPrediction,
          previousPrediction: (currentProfile as any)?.aiPredictedTime || currentGoalTime,
          timestamp: new Date().toISOString(),
          sessionCount: sessionFeedbackData.length,
          triggeredBy: sessionFeedbackData[0]?.sessionType || 'unknown'
        });
        
        // Keep only last 20 predictions to avoid bloat
        if (predictionHistory.length > 20) {
          predictionHistory = predictionHistory.slice(-20);
        }
        
        // Update user profile with new prediction and history
        await prisma.userProfile.update({
          where: { userId },
          data: {
            aiPredictedTime: updatedPrediction,
            lastPredictionUpdate: new Date(),
            predictionHistory: JSON.stringify(predictionHistory)
          } as any
        });
        
        console.log(`💾 Stored AI prediction: ${updatedPrediction} with history (${predictionHistory.length} entries)`);
      } catch (error) {
        console.error('❌ Error storing AI prediction:', error);
        // Don't fail the entire request if prediction storage fails
      }
      
      return updatedPrediction;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error updating race prediction:', error);
    return null;
  }
}

// GET - Fetch feedback for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('weekNumber');
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit');

    console.log('📊 GET Feedback request:', { weekNumber, userId, limit });

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Build where clause dynamically
    const whereClause: any = {
      userId: userId
    };

    if (weekNumber) {
      whereClause.week = parseInt(weekNumber);  // CORRECT: Use 'week' as per your DB
    }

    // Use Prisma typed query with optional limit and ordering
    const queryOptions: any = {
      where: whereClause
    };
    
    // Add ordering by submission date (most recent first)
    queryOptions.orderBy = { submittedAt: 'desc' };
    
    // Add limit if specified
    if (limit) {
      queryOptions.take = parseInt(limit);
    }
    
    const feedback = await prisma.sessionFeedback.findMany(queryOptions);

    console.log(`✅ Found ${feedback.length} feedback records for user ${userId}`);

    return NextResponse.json({
      success: true,
      feedback: feedback || []
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ GET Feedback error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch feedback', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Save new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('💾 POST Feedback request:', body);

    const {
      userId,
      sessionId,
      weekNumber,
      day,
      sessionType,
      sessionSubType,
      plannedDistance,
      plannedPace,
      plannedTime,
      completed,
      actualDistance,
      actualPace,
      difficulty,
      rpe,
      feeling,
      comments
    } = body;

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!sessionId || !weekNumber || !day) {
      return NextResponse.json(
        { error: 'Session ID, week number, and day are required' },
        { status: 400 }
      );
    }

    // Get user's training plan using Prisma typed query
    const trainingPlan = await prisma.trainingPlan.findFirst({
      where: { userId: userId }
    });

    let trainingPlanId = null;
    if (trainingPlan) {
      trainingPlanId = trainingPlan.id;
    } else {
      // Create a training plan if user doesn't have one
      console.log('📋 Creating training plan for user:', userId);
      const newPlan = await prisma.trainingPlan.create({
        data: {
          userId: userId,
          goalTime: '2:00:00',
          raceDate: new Date('2025-10-12T00:00:00Z')
        }
      });
      trainingPlanId = newPlan.id;
      console.log('✅ Created training plan:', trainingPlanId);
    }

    // Check if feedback already exists for this session
    const existingFeedback = await prisma.sessionFeedback.findFirst({
      where: { 
        userId: userId, 
        sessionId: sessionId 
      }
    });

    if (existingFeedback) {
      // Update existing feedback
      console.log('📝 Updating existing feedback for:', sessionId);
      
      // Fetch weather data if session was actually attempted (completed or partial) and no weather data exists
      let weatherData = null;
      if ((completed === 'yes' || completed === 'partial') && !(existingFeedback as any).weatherTemp) {
        // Calculate session date based on week and day
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - ((weekNumber - 1) * 7) - (7 - ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day.toLowerCase())));
        weatherData = await fetchSessionWeatherData(userId, sessionDate);
      }
      
      await prisma.sessionFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          completed: completed || 'no',
          actualPace: actualPace || null,
          difficulty: difficulty ? parseInt(difficulty) : 5,
          rpe: rpe ? parseInt(rpe) : 5,
          feeling: feeling || 'okay',
          comments: comments || null,
          // Add weather data if fetched
          ...(weatherData && {
            weatherTemp: weatherData.weatherTemp,
            weatherConditions: weatherData.weatherConditions,
            weatherWindSpeed: weatherData.weatherWindSpeed,
            weatherHumidity: weatherData.weatherHumidity,
            weatherDescription: weatherData.weatherDescription,
            weatherTimestamp: weatherData.weatherTimestamp
          } as any)
        }
      });
      
      console.log('✅ Updated feedback for session:', sessionId);
    } else {
      // Create new feedback
      console.log('📝 Creating new feedback for sessionId:', sessionId);
      
      // Fetch weather data if session was actually attempted (completed or partial)
      let weatherData = null;
      if (completed === 'yes' || completed === 'partial') {
        // Calculate session date based on week and day
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - ((weekNumber - 1) * 7) - (7 - ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day.toLowerCase())));
        weatherData = await fetchSessionWeatherData(userId, sessionDate);
      }
      
      await prisma.sessionFeedback.create({
        data: {
          userId: userId,
          trainingPlanId: trainingPlanId,
          sessionId: sessionId,
          week: weekNumber ? parseInt(weekNumber) : 1,  // CORRECT: Use 'week' as per your DB
          day: day,
          sessionType: sessionType || 'running',
          sessionSubType: sessionSubType || 'easy',
          plannedDistance: plannedDistance ? parseFloat(plannedDistance) : null,
          plannedPace: plannedPace || null,
          plannedTime: plannedTime || null,
          completed: completed || 'no',
          actualPace: actualPace || null,
          difficulty: difficulty ? parseInt(difficulty) : 5,
          rpe: rpe ? parseInt(rpe) : 5,
          feeling: feeling || 'okay',
          comments: comments || null,
          submittedAt: new Date(), // Add submittedAt as required by the model
          // Add weather data if fetched
          ...(weatherData && {
            weatherTemp: weatherData.weatherTemp,
            weatherConditions: weatherData.weatherConditions,
            weatherWindSpeed: weatherData.weatherWindSpeed,
            weatherHumidity: weatherData.weatherHumidity,
            weatherDescription: weatherData.weatherDescription,
            weatherTimestamp: weatherData.weatherTimestamp
          } as any)
        }
      });
      
      console.log('✅ Created new feedback for session:', sessionId);
    }

    // 🚀 NEW: Check if week is completed after feedback submission
    await checkWeekCompletion(userId, weekNumber ? parseInt(weekNumber) : 1);

    // 🚀 NEW: Trigger AI adaptation analysis for session feedback
    let adaptation = null;
    if (completed === 'yes' || completed === 'partial') {
      try {
        console.log('🤖 Checking if AI adaptation is needed for session feedback...');
        
        // Create SessionFeedback object for AI analysis
        const sessionFeedbackForAI = {
          sessionId: sessionId,
          completed: completed as 'yes' | 'no' | 'partial',
          actualPace: actualPace || plannedPace || '5:30',
          difficulty: difficulty ? parseInt(difficulty) : 5,
          rpe: rpe ? parseInt(rpe) : 5,
          feeling: feeling as 'terrible' | 'bad' | 'ok' | 'good' | 'great',
          comments: comments || '',
          weekNumber: weekNumber ? parseInt(weekNumber) : 1,
          sessionType: sessionSubType || 'easy',
          targetPace: plannedPace || '5:30',
          targetDistance: plannedDistance ? parseFloat(plannedDistance) : 5
        };

        const shouldTrigger = aiService.shouldTriggerAI(sessionFeedbackForAI);
        console.log(`🤖 AI trigger decision: ${shouldTrigger}`);

        if (shouldTrigger) {
          console.log('🤖 Generating AI adaptation...');
          
          // Get recent feedback for context
          const recentFeedback = await prisma.sessionFeedback.findMany({
            where: { userId },
            orderBy: { submittedAt: 'desc' },
            take: 3
          });

          const recentSessionsForAI = recentFeedback.map(f => ({
            sessionId: f.sessionId,
            completed: f.completed as 'yes' | 'no' | 'partial',
            actualPace: f.actualPace || f.plannedPace || '5:30',
            difficulty: f.difficulty,
            rpe: f.rpe,
            feeling: f.feeling as 'terrible' | 'bad' | 'ok' | 'good' | 'great',
            comments: f.comments || '',
            weekNumber: f.week,
            sessionType: f.sessionSubType || 'easy',
            targetPace: f.plannedPace || '5:30', 
            targetDistance: f.plannedDistance || 5
          }));

          adaptation = await aiService.generateAdaptations(
            sessionFeedbackForAI,
            recentSessionsForAI,
            weekNumber ? parseInt(weekNumber) : 1
          );
          
          console.log('✅ AI adaptation generated:', adaptation.recommendations.length, 'recommendations');
          
          // 🚀 NEW: Store AI feedback for user review
          try {
            await prisma.aIFeedback.create({
              data: {
                userId: userId,
                sessionId: sessionId,
                weekNumber: weekNumber ? parseInt(weekNumber) : 1,
                recommendations: adaptation.recommendations || [],
                adaptations: adaptation.adaptations || {},
                reasoning: adaptation.reasoning || '',
                severity: adaptation.severity || 'medium',
                source: adaptation.source || 'ai',
                userMessage: adaptation.userMessage || '',
                // Session context for display
                sessionType: sessionSubType || 'easy',
                actualPace: actualPace || null,
                targetPace: plannedPace || null,
                rpe: rpe ? parseInt(rpe) : null,
                difficulty: difficulty ? parseInt(difficulty) : null
              }
            });
            console.log('💾 AI feedback stored for future review');
          } catch (feedbackError) {
            // Handle unique constraint error (feedback already exists)
            if ((feedbackError as any).code === 'P2002') {
              console.log('📝 Updating existing AI feedback...');
              await prisma.aIFeedback.update({
                where: {
                  userId_sessionId: {
                    userId: userId,
                    sessionId: sessionId
                  }
                },
                data: {
                  recommendations: adaptation.recommendations || [],
                  adaptations: adaptation.adaptations || {},
                  reasoning: adaptation.reasoning || '',
                  severity: adaptation.severity || 'medium',
                  source: adaptation.source || 'ai',
                  userMessage: adaptation.userMessage || '',
                  sessionType: sessionSubType || 'easy',
                  actualPace: actualPace || null,
                  targetPace: plannedPace || null,
                  rpe: rpe ? parseInt(rpe) : null,
                  difficulty: difficulty ? parseInt(difficulty) : null
                }
              });
            } else {
              console.error('❌ Error storing AI feedback:', feedbackError);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error generating AI adaptation:', error);
        // Don't fail the entire request if AI fails
      }
    }

    // 🚀 NEW: Trigger race time prediction update after significant sessions
    let updatedPrediction = null;
    console.log(`🔍 Checking prediction trigger: sessionSubType=${sessionSubType}, completed=${completed}`);
    
    // Expand criteria to include easy runs with significant pace improvements
    const shouldTriggerPrediction = sessionSubType && completed === 'yes' && (
      ['tempo', 'intervals', 'long', 'threshold'].includes(sessionSubType.toLowerCase()) ||
      // Include easy runs if they're significantly faster than planned
      (sessionSubType.toLowerCase() === 'easy' && actualPace && plannedPace && 
       isPaceSignificantlyFaster(actualPace, plannedPace))
    );
    
    if (shouldTriggerPrediction) {
      console.log(`🚀 Triggering prediction update for ${sessionSubType} session`);
      updatedPrediction = await updateRaceTimePrediction(userId);
    } else {
      console.log(`⏭️ Skipping prediction update - criteria not met`);
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully',
      adaptation: adaptation,
      updatedPrediction: updatedPrediction
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ POST Feedback error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to save feedback', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}