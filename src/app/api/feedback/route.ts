// 🔧 COMPLETE WORKING FEEDBACK API
// Replace your entire src/app/api/feedback/route.ts with this

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

// GET - Fetch feedback for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('weekNumber');
    const userId = searchParams.get('userId');

    console.log('📊 GET Feedback request:', { weekNumber, userId });

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

    // Use Prisma typed query - remove orderBy to avoid field name issues
    const feedback = await prisma.sessionFeedback.findMany({
      where: whereClause
    });

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
      
      await prisma.sessionFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          completed: completed || 'no',
          actualPace: actualPace || null,
          difficulty: difficulty ? parseInt(difficulty) : 5,
          rpe: rpe ? parseInt(rpe) : 5,
          feeling: feeling || 'okay',
          comments: comments || null
          // Remove submittedAt since it doesn't exist in the model
        }
      });
      
      console.log('✅ Updated feedback for session:', sessionId);
    } else {
      // Create new feedback
      console.log('📝 Creating new feedback for sessionId:', sessionId);
      
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
          submittedAt: new Date() // Add submittedAt as required by the model
        }
      });
      
      console.log('✅ Created new feedback for session:', sessionId);
    }

    // 🚀 NEW: Check if week is completed after feedback submission
    await checkWeekCompletion(userId, weekNumber ? parseInt(weekNumber) : 1);

    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully'
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