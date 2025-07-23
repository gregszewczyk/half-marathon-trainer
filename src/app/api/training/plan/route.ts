// src/app/api/training/plan/route.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get training plan
export async function GET_PLAN() {
  try {
    let plan = await prisma.trainingPlan.findFirst({
      where: { userId: 'default_user' },
      include: {
        sessions: true,
        aiAdjustments: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 adjustments
        }
      }
    });

    // Create default plan if none exists
    if (!plan) {
      plan = await prisma.trainingPlan.create({
        data: {
          userId: 'default_user',
          goalTime: '2:00:00',
          predictedTime: '2:00:00',
          currentWeek: 1,
          raceDate: new Date('2025-10-12'),
        },
        include: {
          sessions: true,
          aiAdjustments: true
        }
      });
    }

    return Response.json({ plan });
  } catch (error) {
    console.error('Error fetching training plan:', error);
    return Response.json({ error: 'Failed to fetch training plan' }, { status: 500 });
  }
}

// Update training plan
export async function PUT_PLAN(req: Request) {
  try {
    const { goalTime, predictedTime, currentWeek } = await req.json();

    const plan = await prisma.trainingPlan.updateMany({
      where: { userId: 'default_user' },
      data: {
        goalTime,
        predictedTime,
        currentWeek,
        updatedAt: new Date()
      }
    });

    return Response.json({ success: true, plan });
  } catch (error) {
    console.error('Error updating training plan:', error);
    return Response.json({ error: 'Failed to update training plan' }, { status: 500 });
  }
}

// Submit session feedback
export async function POST_FEEDBACK(req: Request) {
  try {
    const feedbackData = await req.json();
    
    // Get the training plan
    const plan = await prisma.trainingPlan.findFirst({
      where: { userId: 'default_user' }
    });

    if (!plan) {
      return Response.json({ error: 'Training plan not found' }, { status: 404 });
    }

    // Create session feedback
    const feedback = await prisma.sessionFeedback.create({
      data: {
        ...feedbackData,
        trainingPlanId: plan.id
      }
    });

    return Response.json({ feedback });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}

// Get session feedback
export async function GET_FEEDBACK(req: Request) {
  try {
    const url = new URL(req.url);
    const week = url.searchParams.get('week');
    
    const plan = await prisma.trainingPlan.findFirst({
      where: { userId: 'default_user' }
    });

    if (!plan) {
      return Response.json({ sessions: [] });
    }

    const sessions = await prisma.sessionFeedback.findMany({
      where: {
        trainingPlanId: plan.id,
        ...(week && { week: parseInt(week) })
      },
      orderBy: { submittedAt: 'desc' }
    });

    return Response.json({ sessions });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return Response.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

// Submit session modification
export async function POST_MODIFICATION(req: Request) {
  try {
    const { sessionId, originalPace, originalDistance, modifiedPace, modifiedDistance, modifiedMainSet, aiReason, week } = await req.json();

    const modification = await prisma.modifiedSession.upsert({
      where: { sessionId },
      update: {
        modifiedPace,
        modifiedDistance,
        modifiedMainSet,
        aiReason,
        modifiedAt: new Date()
      },
      create: {
        sessionId,
        week,
        originalPace,
        originalDistance,
        modifiedPace,
        modifiedDistance,
        modifiedMainSet,
        aiReason
      }
    });

    return Response.json({ modification });
  } catch (error) {
    console.error('Error saving modification:', error);
    return Response.json({ error: 'Failed to save modification' }, { status: 500 });
  }
}

// Get AI modifications
export async function GET_MODIFICATIONS() {
  try {
    const modifications = await prisma.modifiedSession.findMany({
      orderBy: { modifiedAt: 'desc' }
    });

    return Response.json({ modifications });
  } catch (error) {
    console.error('Error fetching modifications:', error);
    return Response.json({ error: 'Failed to fetch modifications' }, { status: 500 });
  }
}

// Submit AI adjustment
export async function POST_AI_ADJUSTMENT(req: Request) {
  try {
    const adjustmentData = await req.json();
    
    const plan = await prisma.trainingPlan.findFirst({
      where: { userId: 'default_user' }
    });

    if (!plan) {
      return Response.json({ error: 'Training plan not found' }, { status: 404 });
    }

    const adjustment = await prisma.aIAdjustment.create({
      data: {
        ...adjustmentData,
        trainingPlanId: plan.id
      }
    });

    return Response.json({ adjustment });
  } catch (error) {
    console.error('Error saving AI adjustment:', error);
    return Response.json({ error: 'Failed to save AI adjustment' }, { status: 500 });
  }
}