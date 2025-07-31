// src/app/api/validate-progression/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProgressionSafetyValidator, UserTrainingProfile } from '@/lib/training/progressionSafety';

const prisma = new PrismaClient();

interface ProgressionValidationRequest {
  userId: string;
  proposedWeeklyDistance: number;
  currentWeek: number;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, proposedWeeklyDistance, currentWeek }: ProgressionValidationRequest = await request.json();

    // Get user profile and training history
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        generatedSessions: {
          where: {
            week: {
              in: [currentWeek - 4, currentWeek - 3, currentWeek - 2, currentWeek - 1]
            },
            sessionType: 'RUNNING'
          },
          orderBy: { week: 'asc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate previous week's distance
    const previousWeekSessions = await prisma.generatedSession.findMany({
      where: {
        userId,
        week: currentWeek - 1,
        sessionType: 'RUNNING'
      }
    });

    const previousWeekDistance = previousWeekSessions.reduce((total, session) => {
      return total + (session.distance || 0);
    }, 0);

    // Get recent weekly distances for ACWR calculation
    const recentWeekDistances: number[] = [];
    for (let week = currentWeek - 4; week < currentWeek; week++) {
      const weekSessions = await prisma.generatedSession.findMany({
        where: {
          userId,
          week,
          sessionType: 'RUNNING'
        }
      });
      const weekDistance = weekSessions.reduce((total, session) => total + (session.distance || 0), 0);
      if (weekDistance > 0) {
        recentWeekDistances.push(weekDistance);
      }
    }

    // Build training profile from user data (simplified without userProfile table)
    const trainingProfile: UserTrainingProfile = {
      fitnessLevel: 'intermediate', // Default fallback - should be stored somewhere
      raceType: 'Half Marathon',
      trainingDaysPerWeek: 5,
      currentWeeklyDistance: previousWeekDistance,
      weeksInCurrentVolume: 1 // This would need tracking in database for accurate calculation
    };

    // Validate the proposed increase
    const validationResult = ProgressionSafetyValidator.validateWeeklyIncrease(
      previousWeekDistance,
      proposedWeeklyDistance,
      trainingProfile,
      recentWeekDistances
    );

    // Check if cutback week is needed
    const needsCutback = ProgressionSafetyValidator.needsCutbackWeek(
      trainingProfile.weeksInCurrentVolume,
      trainingProfile.fitnessLevel
    );

    const cutbackVolume = needsCutback ? 
      ProgressionSafetyValidator.calculateCutbackVolume(previousWeekDistance, trainingProfile.fitnessLevel) : 
      null;

    const response = {
      success: true,
      validation: validationResult,
      previousWeekDistance,
      proposedWeekDistance: proposedWeeklyDistance,
      needsCutback,
      cutbackVolume,
      userProfile: {
        fitnessLevel: trainingProfile.fitnessLevel,
        raceType: trainingProfile.raceType,
        trainingDaysPerWeek: trainingProfile.trainingDaysPerWeek
      },
      recentWeekDistances,
      recommendations: {
        safeIncrease: validationResult.isValid,
        adjustedDistance: validationResult.adjustedDistance,
        reasoning: validationResult.reasoning,
        warningLevel: validationResult.warningLevel
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error validating progression:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to validate training progression',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}