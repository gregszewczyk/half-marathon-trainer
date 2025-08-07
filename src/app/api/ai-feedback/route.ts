// AI Feedback API endpoint - returns AI feedback for completed sessions
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    
    if (!sessionId && !userId) {
      return NextResponse.json(
        { error: 'Session ID or User ID is required' },
        { status: 400 }
      );
    }

    // For now, return empty array or placeholder response
    // This prevents 404 errors when the UI tries to fetch AI feedback
    return NextResponse.json({
      success: true,
      feedback: [],
      message: 'AI feedback endpoint - coming soon'
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
