// API endpoint to retrieve stored AI feedback for sessions
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
        { error: 'SessionId and UserId are required' },
        { status: 400 }
      );
    }

    console.log(`📖 Retrieving AI feedback for session: ${sessionId}`);

    const aiFeedback = await prisma.aIFeedback.findUnique({
      where: {
        userId_sessionId: {
          userId: userId,
          sessionId: sessionId
        }
      }
    });

    if (!aiFeedback) {
      return NextResponse.json(
        { error: 'No AI feedback found for this session' },
        { status: 404 }
      );
    }

    console.log(`✅ Found AI feedback: ${aiFeedback.recommendations.length} recommendations`);

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
    console.error('❌ Error retrieving AI feedback:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to retrieve AI feedback', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}