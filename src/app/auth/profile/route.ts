import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create user profile during onboarding
export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      raceType, 
      targetTime, 
      raceDate, 
      fitnessLevel,
      trainingDaysPerWeek,
      age,
      weight,
      gender
    } = await request.json();

    console.log('🎯 Creating profile for user:', userId);

    // Create user profile
    const profile = await prisma.userProfile.create({
      data: {
        userId,
        raceType: raceType || 'HALF_MARATHON',
        targetTime: targetTime || '2:00:00',
        raceDate: raceDate ? new Date(raceDate) : null,
        fitnessLevel: fitnessLevel || 'INTERMEDIATE',
        trainingDaysPerWeek: trainingDaysPerWeek || 4,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        gender: gender || null,
      }
    });

    // Create initial training plan based on profile
    const trainingPlan = await prisma.trainingPlan.create({
      data: {
        userId,
        goalTime: targetTime || '2:00:00',
        raceDate: raceDate ? new Date(raceDate) : new Date('2025-10-12'),
      }
    });

    console.log('✅ Profile and training plan created');

    return NextResponse.json({
      success: true,
      profile,
      trainingPlan
    });

  } catch (error) {
    console.error('❌ Profile creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Get user profile
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  try {
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}