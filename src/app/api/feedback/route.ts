// src/app/api/feedback/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Saving feedback:', body);
    
    const {
      sessionId,
      weekNumber,
      completed,
      actualPace,
      difficulty,
      rpe,
      feeling,
      comments,
      sessionType,
      sessionSubType,
      plannedDistance,
      plannedPace,
      plannedTime,
      day,
      userId = 'default' // Add userId support
    }: {
      sessionId: string;
      weekNumber: number;
      completed: string;
      actualPace?: string;
      difficulty: number;
      rpe: number;
      feeling: string;
      comments?: string;
      sessionType: string;
      sessionSubType?: string;
      plannedDistance?: number;
      plannedPace?: string;
      plannedTime?: string;
      day?: string;
      userId?: string;
    } = body;

    // Ensure we have a training plan for this user
    let trainingPlan = await prisma.trainingPlan.findFirst({
      where: { userId: userId }
    });

    if (!trainingPlan) {
      trainingPlan = await prisma.trainingPlan.create({
        data: {
          userId: userId,
          goalTime: "2:00:00",
          predictedTime: "2:00:00",
          currentWeek: 1,
          raceDate: new Date('2025-10-12')
        }
      });
      console.log(`Created training plan for user ${userId}:`, trainingPlan.id);
    }

    // Determine the day from sessionId if not provided
    const sessionDay = day || sessionId.split('-')[0] || 'monday';

    // Check if feedback already exists for this session AND user
    const existingFeedback = await prisma.sessionFeedback.findFirst({
      where: {
        sessionId,
        week: weekNumber,
        trainingPlan: {
          userId: userId
        }
      }
    });

    let feedback;

    if (existingFeedback) {
      // Update existing feedback
      feedback = await prisma.sessionFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          completed,
          actualPace: actualPace || null,
          difficulty: parseInt(difficulty.toString()),
          rpe: parseInt(rpe.toString()),
          feeling,
          comments: comments || null,
          submittedAt: new Date()
        }
      });
      console.log(`Updated existing feedback for user ${userId}:`, feedback.id);
    } else {
      // Create new feedback
      feedback = await prisma.sessionFeedback.create({
        data: {
          sessionId,
          week: weekNumber,
          day: sessionDay,
          sessionType,
          sessionSubType: sessionSubType || 'unknown',
          plannedDistance: plannedDistance || null,
          plannedPace: plannedPace || null,
          plannedTime: plannedTime || null,
          completed,
          actualPace: actualPace || null,
          difficulty: parseInt(difficulty.toString()),
          rpe: parseInt(rpe.toString()),
          feeling,
          comments: comments || null,
          trainingPlanId: trainingPlan.id
        }
      });
      console.log(`Created new feedback for user ${userId}:`, feedback.id);
    }

    return NextResponse.json({ 
      success: true, 
      feedbackId: feedback.id,
      action: existingFeedback ? 'updated' : 'created',
      data: feedback,
      userId: userId
    });

  } catch (error: unknown) {
    console.error('Error saving feedback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to save feedback', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const weekNumber = searchParams.get('weekNumber');
    const userId = searchParams.get('userId') || 'default'; // Add userId support

    let feedback;
    
    if (sessionId) {
      // Get feedback for specific session AND user
      feedback = await prisma.sessionFeedback.findFirst({
        where: { 
          sessionId,
          trainingPlan: {
            userId: userId
          }
        },
        include: { trainingPlan: true }
      });
    } else if (weekNumber) {
      // Get all feedback for a week AND user
      feedback = await prisma.sessionFeedback.findMany({
        where: { 
          week: parseInt(weekNumber),
          trainingPlan: {
            userId: userId
          }
        },
        include: { trainingPlan: true },
        orderBy: { submittedAt: 'desc' }
      });
    } else {
      // Get all feedback for user
      feedback = await prisma.sessionFeedback.findMany({
        where: {
          trainingPlan: {
            userId: userId
          }
        },
        include: { trainingPlan: true },
        orderBy: [
          { week: 'asc' },
          { submittedAt: 'desc' }
        ]
      });
    }

    console.log(`📊 Fetched feedback for user ${userId}:`, Array.isArray(feedback) ? feedback.length : feedback ? 1 : 0, 'records');

    return NextResponse.json({ 
      success: true,
      feedback,
      userId: userId
    });

  } catch (error: unknown) {
    console.error('Error fetching feedback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch feedback', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}