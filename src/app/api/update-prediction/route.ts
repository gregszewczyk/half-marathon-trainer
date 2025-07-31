// src/app/api/update-prediction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PerplexityAIService } from '@/lib/ai/perplexity_service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Manually updating prediction for user ${userId}`);

    // Get recent feedback data
    const feedback = await prisma.sessionFeedback.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      take: 10 // Get last 10 sessions
    });

    const completedSessions = feedback.filter(f => f.completed && f.completed !== '');
    
    if (completedSessions.length < 2) {
      return NextResponse.json({
        success: false,
        error: `Need at least 2 completed sessions for prediction (found ${completedSessions.length})`
      });
    }

    // Convert to SessionFeedback format
    const recentSessions = completedSessions.slice(0, 5).map(f => ({
      sessionId: f.id,
      completed: f.completed as 'yes' | 'no' | 'partial',
      actualPace: f.actualPace || '',
      difficulty: f.difficulty,
      rpe: f.rpe,
      feeling: f.feeling as 'terrible' | 'bad' | 'ok' | 'good' | 'great',
      comments: f.comments || '',
      weekNumber: f.week,
      sessionType: f.sessionSubType || f.sessionType,
      targetPace: f.plannedPace || '5:41',
      targetDistance: f.plannedDistance || 5
    }));

    // Get current goal time
    const trainingPlan = await prisma.trainingPlan.findFirst({
      where: { userId }
    });

    const currentGoalTime = trainingPlan?.goalTime || '2:00:00';

    // Call AI prediction
    const aiService = new PerplexityAIService();
    
    // Debug: Log what we're sending to AI
    console.log('🤖 Sending to AI:', {
      goalTime: currentGoalTime,
      sessions: recentSessions.map(s => ({
        type: s.sessionType,
        pace: s.actualPace,
        rpe: s.rpe,
        feeling: s.feeling
      }))
    });
    
    const newPrediction = await aiService.predictRaceTime(recentSessions, currentGoalTime);

    console.log(`🎯 AI predicted time: ${newPrediction} (was ${currentGoalTime})`);

    // Update training plan if prediction changed
    if (newPrediction && newPrediction !== currentGoalTime) {
      await prisma.trainingPlan.updateMany({
        where: { userId },
        data: { predictedTime: newPrediction }
      });
      
      console.log(`✅ Updated predicted time to ${newPrediction}`);
    }

    return NextResponse.json({
      success: true,
      previousPrediction: currentGoalTime,
      newPrediction,
      sessionsAnalyzed: recentSessions.length,
      sessionData: recentSessions.map(s => ({
        pace: s.actualPace,
        rpe: s.rpe,
        feeling: s.feeling,
        sessionType: s.sessionType
      }))
    });

  } catch (error) {
    console.error('Error updating prediction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update prediction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}