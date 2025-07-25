// 🚀 FIXED: src/app/api/training-plan/route.ts
// Now returns userProfile data for plan generation

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const week = searchParams.get('week');

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'UserId is required' },
        { status: 400 }
      );
    }

    console.log(`📅 Fetching training plan for user: ${userId}, week: ${week || 'all'}`);

    // ✅ FIXED: Get complete user profile data
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      return NextResponse.json({
        planGenerated: false,
        onboardingComplete: false,
        sessions: [],
        userProfile: null  // ✅ FIXED: Explicitly return null when no profile
      });
    }

    // ✅ FIXED: Check if sessions actually exist when plan is marked as generated
    if (!userProfile.planGenerated || !userProfile.onboardingComplete) {
      return NextResponse.json({
        planGenerated: false,
        onboardingComplete: userProfile.onboardingComplete || false,
        sessions: [],
        userProfile: userProfile
      });
    }

    // Fetch sessions
    const whereClause: any = { userId };
    if (week) {
      whereClause.week = parseInt(week);
    }

    const sessions = await prisma.generatedSession.findMany({
      where: whereClause,
      orderBy: [
        { week: 'asc' },
        { dayOfWeek: 'asc' }
      ]
    });

    // ✅ FIXED: If plan is marked generated but no sessions exist, it actually failed
    if (userProfile.planGenerated && sessions.length === 0) {
      console.log(`⚠️ Plan marked as generated but no sessions found for user ${userId} - resetting status`);
      
      // Reset the planGenerated flag
      await prisma.userProfile.update({
        where: { userId },
        data: { planGenerated: false }
      });
      
      return NextResponse.json({
        planGenerated: false,
        onboardingComplete: true,
        sessions: [],
        userProfile: userProfile
      });
    }

    console.log(`✅ Found ${sessions.length} sessions for user ${userId}`);

    // Convert database sessions to TrainingCalendar format
    const formattedSessions = sessions.map(session => ({
      id: `${session.dayOfWeek.toLowerCase().slice(0, 3)}-${session.sessionType.toLowerCase()}-${session.week}`,
      type: session.sessionType.toLowerCase(),
      subType: session.sessionSubType || 'easy',
      distance: session.distance,
      pace: session.pace,
      duration: session.duration,
      time: session.scheduledTime,
      madeRunning: session.isRunningClub,
      warmup: session.warmup,
      mainSet: session.mainSet,
      cooldown: session.cooldown,
      targetRPE: session.targetRPE,
      aiModified: session.aiModified,
      originalPace: session.originalData ? (session.originalData as any).pace : undefined,
      originalDistance: session.originalData ? (session.originalData as any).distance : undefined,
      week: session.week,
      dayOfWeek: session.dayOfWeek
    }));

    return NextResponse.json({
      planGenerated: true,
      onboardingComplete: true,
      sessions: formattedSessions,
      totalSessions: sessions.length,
      userProfile: userProfile  // ✅ FIXED: Always return userProfile data
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching training plan:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to fetch training plan', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST method unchanged
export async function POST(request: NextRequest) {
  try {
    // Handle AI modifications to individual sessions
    const body = await request.json();
    const userId: string = body.userId;
    const sessionId: string = body.sessionId;
    const modifications: any = body.modifications;

    if (!userId || !sessionId || !modifications) {
      return NextResponse.json(
        { error: 'UserId, sessionId, and modifications are required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Updating session ${sessionId} for user ${userId}:`, modifications);

    // Parse session ID to get week and day
    const sessionParts = sessionId.split('-');
    const dayPrefix = sessionParts[0] || 'mon';
    const week = parseInt(sessionParts[sessionParts.length - 1] || '1');
    
    const dayMap: { [key: string]: string } = {
      'mon': 'Monday',
      'tue': 'Tuesday', 
      'wed': 'Wednesday',
      'thu': 'Thursday',
      'fri': 'Friday',
      'sat': 'Saturday',
      'sun': 'Sunday'
    };
    
    const dayOfWeek = dayMap[dayPrefix] || 'Monday';

    // Find the session to update
    const existingSession = await prisma.generatedSession.findFirst({
      where: {
        userId,
        week,
        dayOfWeek,
        sessionType: 'RUNNING'
      }
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Store original data if not already stored
    const originalData = existingSession.originalData || {
      pace: existingSession.pace,
      distance: existingSession.distance,
      sessionSubType: existingSession.sessionSubType
    };

    // Update session with AI modifications
    const updatedSession = await prisma.generatedSession.update({
      where: { id: existingSession.id },
      data: {
        pace: modifications.pace || existingSession.pace,
        distance: modifications.distance || existingSession.distance,
        sessionSubType: modifications.sessionSubType || existingSession.sessionSubType,
        mainSet: modifications.mainSet || existingSession.mainSet,
        aiModified: true,
        aiReason: modifications.reason || 'AI auto-adjustment based on feedback',
        originalData: originalData,
        lastModified: new Date()
      }
    });

    console.log(`✅ Updated session ${sessionId} for user ${userId}`);

    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        pace: updatedSession.pace,
        distance: updatedSession.distance,
        sessionSubType: updatedSession.sessionSubType,
        aiModified: true,
        aiReason: updatedSession.aiReason
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error updating session:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to update session', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}