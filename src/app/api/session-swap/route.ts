// 🚀 NEW: API endpoint for session swapping
// Handles accepting AI-suggested session swaps

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, action, swap } = await request.json();
    
    console.log(`🔄 Session swap request: ${action} for user ${userId}`);
    console.log('📋 Swap details:', swap);

    if (!userId || !action || !swap) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, action, swap' },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      // Find the target session in the database
      const targetSession = await prisma.generatedSession.findFirst({
        where: {
          userId,
          week: swap.targetWeek,
          dayOfWeek: swap.targetDay,
          sessionType: swap.currentSession.type === 'running' ? 'RUNNING' : 
                      swap.currentSession.type === 'gym' ? 'GYM' :
                      swap.currentSession.type === 'cross_training' ? 'CROSS_TRAINING' : 'REST'
        }
      });

      if (!targetSession) {
        return NextResponse.json(
          { error: 'Target session not found' },
          { status: 404 }
        );
      }

      console.log(`🎯 Found target session: ${targetSession.id}`);

      // Update the session with the suggested replacement
      const updatedSession = await prisma.generatedSession.update({
        where: { id: targetSession.id },
        data: {
          sessionType: swap.suggestedSession.type === 'cross_training' ? 'CROSS_TRAINING' :
                      swap.suggestedSession.type === 'rest' ? 'REST' :
                      swap.suggestedSession.type === 'recovery' ? 'RUNNING' : 'RUNNING',
          sessionSubType: swap.suggestedSession.subType || 'recovery',
          duration: swap.suggestedSession.duration,
          mainSet: swap.suggestedSession.description,
          distance: swap.suggestedSession.type === 'cross_training' ? null : targetSession.distance,
          aiModified: true,
          aiReason: `Session swapped for recovery: ${swap.reason}`,
          originalData: {
            sessionType: targetSession.sessionType,
            sessionSubType: targetSession.sessionSubType,
            duration: targetSession.duration,
            mainSet: targetSession.mainSet,
            distance: targetSession.distance
          },
          lastModified: new Date()
        }
      });

      console.log(`✅ Session swap completed: ${targetSession.id} -> ${swap.suggestedSession.type}`);

      // Log the swap for analytics/learning
      await prisma.aIAdjustment.create({
        data: {
          userId,
          sessionId: targetSession.id,
          adjustmentType: 'session_swap',
          reason: swap.reason,
          data: {
            originalSession: swap.currentSession,
            newSession: swap.suggestedSession,
            priority: swap.priority,
            userAccepted: true
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Session swap completed successfully',
        updatedSession: {
          id: updatedSession.id,
          type: updatedSession.sessionType,
          subType: updatedSession.sessionSubType,
          description: updatedSession.mainSet,
          duration: updatedSession.duration,
          aiModified: true
        }
      });

    } else if (action === 'decline') {
      // Log the declined swap for learning
      await prisma.aIAdjustment.create({
        data: {
          userId,
          sessionId: `${swap.targetWeek}-${swap.targetDay}`, // Composite ID since no actual session ID
          adjustmentType: 'session_swap_declined',
          reason: swap.reason,
          data: {
            originalSession: swap.currentSession,
            suggestedSession: swap.suggestedSession,
            priority: swap.priority,
            userAccepted: false
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Session swap declined and logged'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "accept" or "decline"' },
      { status: 400 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Session swap API error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to process session swap', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}