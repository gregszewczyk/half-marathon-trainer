// 🚀 QUICK FIX: Update Week 3 Thursday and Saturday sessions
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    console.log(`🔧 Fixing Week 3 sessions for user ${userId}`);

    // Fix Thursday: 8km → 6km easy
    const thursdaySession = await prisma.generatedSession.findFirst({
      where: {
        userId,
        week: 3,
        dayOfWeek: 'Thursday',
        sessionType: 'RUNNING',
        sessionSubType: 'easy'
      }
    });

    if (thursdaySession) {
      await prisma.generatedSession.update({
        where: { id: thursdaySession.id },
        data: {
          distance: 6,
          mainSet: '6km easy run - Recovery pace after tempo work',
          aiReason: 'Distance reduced for proper progression (was 8km)',
          lastModified: new Date()
        }
      });
      console.log(`✅ Updated Thursday: 8km → 6km easy`);
    }

    // Fix Saturday: 13km → 10km long
    const saturdaySession = await prisma.generatedSession.findFirst({
      where: {
        userId,
        week: 3,
        dayOfWeek: 'Saturday',
        sessionType: 'RUNNING',
        sessionSubType: 'long'
      }
    });

    if (saturdaySession) {
      await prisma.generatedSession.update({
        where: { id: saturdaySession.id },
        data: {
          distance: 10,
          mainSet: '10km long run - Build aerobic base at steady effort',
          aiReason: 'Distance reduced for proper progression (was 13km)',
          lastModified: new Date()
        }
      });
      console.log(`✅ Updated Saturday: 13km → 10km long`);
    }

    return NextResponse.json({
      success: true,
      message: 'Fixed Week 3 sessions: Thursday 6km, Saturday 10km',
      thursdayUpdated: !!thursdaySession,
      saturdayUpdated: !!saturdaySession
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Week 3 fix error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to fix Week 3', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}