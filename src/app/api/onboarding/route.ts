// 🚀 NEW: src/app/api/onboarding/route.ts
// API endpoint to save onboarding data and create user profile

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log('📝 Onboarding data received:', { userId: data.userId, raceType: data.raceType })

    const {
      userId,
      raceType,
      customDistance,
      targetTime,
      raceDate,
      pb5k,
      pb10k,
      pbHalfMarathon,
      pbMarathon,
      pbCustom,
      pbCustomDistance,
      trainingDaysPerWeek,
      timePreferences,
      workoutTypes,
      otherWorkouts,
      gymDaysPerWeek,
      gymType,
      runningClub,
      clubSchedule,
      keepClubRuns,
      age,
      gender,
      location,
      injuryHistory,
      restDayPrefs,
      maxWeeklyMiles
    } = data

    // Validate required fields
    if (!userId || !raceType || !targetTime) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, raceType, targetTime' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse race date
    let parsedRaceDate: Date | null = null
    if (raceDate) {
      parsedRaceDate = new Date(raceDate)
      if (isNaN(parsedRaceDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid race date format' },
          { status: 400 }
        )
      }
    }

    // Create or update user profile
    const userProfile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        raceType: raceType as any,
        targetTime,
        raceDate: parsedRaceDate,
        trainingDaysPerWeek: trainingDaysPerWeek || 4,
        
        // Personal Bests
        pb5k: pb5k || null,
        pb10k: pb10k || null,
        pbHalfMarathon: pbHalfMarathon || null,
        pbMarathon: pbMarathon || null,
        pbCustom: pbCustom || null,
        pbCustomDistance: pbCustomDistance || null,
        
        // Training Preferences
        timePreferences: timePreferences || [],
        workoutTypes: workoutTypes || ['outdoor'],
        
        // Other Activities
        otherWorkouts: otherWorkouts || [],
        gymDaysPerWeek: gymDaysPerWeek || null,
        gymType: gymType || null,
        
        // Running Club
        runningClub: runningClub || null,
        clubSchedule: clubSchedule || [],
        keepClubRuns: keepClubRuns !== undefined ? keepClubRuns : true,
        
        // Personal Info
        age: age || null,
        gender: gender || null,
        location: location || null,
        
        // Advanced Preferences
        injuryHistory: injuryHistory || [],
        restDayPrefs: restDayPrefs || ['sunday'],
        maxWeeklyMiles: maxWeeklyMiles || null,
        
        // Metadata
        onboardingComplete: true,
        planGenerated: false,
        lastPlanUpdate: new Date()
      },
      update: {
        raceType: raceType as any,
        targetTime,
        raceDate: parsedRaceDate,
        trainingDaysPerWeek: trainingDaysPerWeek || 4,
        
        // Personal Bests
        pb5k: pb5k || null,
        pb10k: pb10k || null,
        pbHalfMarathon: pbHalfMarathon || null,
        pbMarathon: pbMarathon || null,
        pbCustom: pbCustom || null,
        pbCustomDistance: pbCustomDistance || null,
        
        // Training Preferences
        timePreferences: timePreferences || [],
        workoutTypes: workoutTypes || ['outdoor'],
        
        // Other Activities
        otherWorkouts: otherWorkouts || [],
        gymDaysPerWeek: gymDaysPerWeek || null,
        gymType: gymType || null,
        
        // Running Club
        runningClub: runningClub || null,
        clubSchedule: clubSchedule || [],
        keepClubRuns: keepClubRuns !== undefined ? keepClubRuns : true,
        
        // Personal Info
        age: age || null,
        gender: gender || null,
        location: location || null,
        
        // Advanced Preferences
        injuryHistory: injuryHistory || [],
        restDayPrefs: restDayPrefs || ['sunday'],
        maxWeeklyMiles: maxWeeklyMiles || null,
        
        // Metadata
        onboardingComplete: true,
        lastPlanUpdate: new Date()
      }
    })

    console.log('✅ User profile created/updated:', { 
      userId, 
      raceType, 
      targetTime,
      onboardingComplete: userProfile.onboardingComplete 
    })

    // TODO: In next phase, generate custom training plan based on profile data
    // For now, we'll use the existing plan structure

    return NextResponse.json({
      success: true,
      profile: {
        id: userProfile.id,
        raceType: userProfile.raceType,
        targetTime: userProfile.targetTime,
        raceDate: userProfile.raceDate,
        onboardingComplete: userProfile.onboardingComplete
      },
      message: 'Profile saved successfully! Training plan generation coming next.'
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Onboarding API error:', errorMessage)
    
    return NextResponse.json(
      { error: 'Failed to save profile data', details: errorMessage },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}