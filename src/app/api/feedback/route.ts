// 🔧 COMPLETE WORKING FEEDBACK API
// Replace your entire src/app/api/feedback/route.ts with this

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      console.log('📝 Creating new feedback for:', sessionId);
      
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