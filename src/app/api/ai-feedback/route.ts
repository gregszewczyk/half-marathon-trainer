// AI Feedback API endpoint - returns AI feedback for completed sessions
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Both Session ID and User ID are required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Looking for AI feedback: userId=${userId}, sessionId=${sessionId}`);

    // Retrieve AI feedback from database
    const aiFeedback = await prisma.aIFeedback.findFirst({
      where: {
        userId: userId,
        sessionId: sessionId
      },
      select: {
        id: true,
        recommendations: true,
        adaptations: true,
        reasoning: true,
        severity: true,
        source: true,
        userMessage: true,
        sessionType: true,
        actualPace: true,
        targetPace: true,
        rpe: true,
        difficulty: true,
        createdAt: true
      }
    });

    if (!aiFeedback) {
      console.log(`📝 No AI feedback found for session ${sessionId}`);
      return NextResponse.json(
        { error: 'No AI feedback found for this session' },
        { status: 404 }
      );
    }

    console.log(`✅ Found AI feedback for session ${sessionId}`);

    // Return the stored AI feedback in the format expected by the UI
    return NextResponse.json({
      success: true,
      feedback: {
        recommendations: aiFeedback.recommendations,
        adaptations: aiFeedback.adaptations,
        reasoning: aiFeedback.reasoning,
        severity: aiFeedback.severity,
        source: aiFeedback.source,
        userMessage: aiFeedback.userMessage,
        sessionContext: {
          sessionType: aiFeedback.sessionType,
          actualPace: aiFeedback.actualPace,
          targetPace: aiFeedback.targetPace,
          rpe: aiFeedback.rpe,
          difficulty: aiFeedback.difficulty
        },
        createdAt: aiFeedback.createdAt
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI feedback error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to fetch AI feedback', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
