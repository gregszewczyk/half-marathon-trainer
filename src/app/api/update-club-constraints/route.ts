// 🚀 NEW: API to update club run constraints with distance limits
// Allows users to set max distance per club day

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId, clubConstraints } = await request.json();
    
    console.log(`🏃 Updating club constraints for user ${userId}`);
    
    if (!userId || !clubConstraints) {
      return NextResponse.json(
        { error: 'User ID and club constraints are required' },
        { status: 400 }
      );
    }

    // Validate constraints format
    // Expected: [{ day: "Monday", time: "5PM", maxDistance: 5, sessionType: "easy" }]
    const isValidConstraints = Array.isArray(clubConstraints) && clubConstraints.every(constraint => 
      constraint.day && constraint.time && 
      typeof constraint.maxDistance === 'number' && 
      constraint.maxDistance > 0 && constraint.maxDistance <= 50 // Reasonable limits
    );

    if (!isValidConstraints) {
      return NextResponse.json(
        { error: 'Invalid club constraints format' },
        { status: 400 }
      );
    }

    // Store constraints as JSON in the clubSchedule field (enhanced format)
    const enhancedSchedule = clubConstraints.map((constraint: any) => 
      `${constraint.day} ${constraint.time}|${constraint.maxDistance}km|${constraint.sessionType || 'easy'}`
    );

    // Update user profile with enhanced club schedule
    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: {
        clubSchedule: enhancedSchedule,
        keepClubRuns: true, // Ensure club runs are kept
        lastPlanUpdate: new Date()
      }
    });

    console.log(`✅ Updated club constraints for ${clubConstraints.length} sessions`);

    return NextResponse.json({
      success: true,
      message: 'Club constraints updated successfully',
      constraints: clubConstraints,
      enhancedSchedule
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Club constraints update error:', errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to update club constraints', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET to retrieve current club constraints
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { 
        clubSchedule: true, 
        runningClub: true,
        keepClubRuns: true 
      }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse enhanced club schedule format
    const parsedConstraints = userProfile.clubSchedule.map(scheduleEntry => {
      // New format: "Monday 5PM|5km|easy" 
      // Old format: "Monday 5PM" (backward compatibility)
      const parts = scheduleEntry.split('|');
      
      if (parts.length === 3) {
        // Enhanced format with constraints
        const [dayTime, distance, sessionType] = parts;
        const [day, time] = dayTime.split(' ');
        return {
          day,
          time,
          maxDistance: parseInt(distance.replace('km', '')),
          sessionType,
          hasConstraints: true
        };
      } else {
        // Legacy format - use default constraints
        const [day, time] = scheduleEntry.split(' ');
        return {
          day,
          time,
          maxDistance: null, // No limit set
          sessionType: 'easy', // Default
          hasConstraints: false
        };
      }
    });

    return NextResponse.json({
      success: true,
      clubName: userProfile.runningClub,
      keepClubRuns: userProfile.keepClubRuns,
      constraints: parsedConstraints
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}