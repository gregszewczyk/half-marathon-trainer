// src/app/api/setup/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log('Setting up default training plan...');

    // Check if default training plan already exists
    let trainingPlan = await prisma.trainingPlan.findFirst({
      where: { userId: 'default_user' }
    });

    if (!trainingPlan) {
      // Create default training plan
      trainingPlan = await prisma.trainingPlan.create({
        data: {
          userId: 'default_user',
          goalTime: '2:00:00',
          predictedTime: '2:00:00',
          currentWeek: 1,
          raceDate: new Date('2025-10-12'), // Manchester Half Marathon date
          startDate: new Date('2025-07-21')  // Training start date
        }
      });
      console.log('Created default training plan:', trainingPlan);
    }

    return NextResponse.json({ 
      success: true,
      trainingPlan: { 
        id: trainingPlan.id, 
        goalTime: trainingPlan.goalTime,
        currentWeek: trainingPlan.currentWeek,
        predictedTime: trainingPlan.predictedTime
      }
    });

  } catch (error: unknown) {
    console.error('Error setting up training plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to setup training plan', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  try {
    // Check if setup is complete
    const trainingPlan = await prisma.trainingPlan.findFirst({
      where: { userId: 'default_user' }
    });

    // Also get recent feedback count (only if trainingPlan exists)
    const feedbackCount = trainingPlan 
      ? await prisma.sessionFeedback.count({
          where: { trainingPlanId: trainingPlan.id }
        })
      : 0;

    // Get AI adjustments count for user
    const aiAdjustmentsCount = await prisma.aIAdjustment.count({
      where: { userId: 'default_user' }
    });

    return NextResponse.json({ 
      setupComplete: !!trainingPlan,
      trainingPlan: trainingPlan ? {
        id: trainingPlan.id,
        goalTime: trainingPlan.goalTime,
        currentWeek: trainingPlan.currentWeek,
        predictedTime: trainingPlan.predictedTime
      } : null,
      stats: {
        feedbackCount,
        aiAdjustmentsCount
      }
    });

  } catch (error: unknown) {
    console.error('Error checking setup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { setupComplete: false, error: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}