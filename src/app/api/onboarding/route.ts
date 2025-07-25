// 🚀 CLEAN: src/app/api/onboarding/route.ts
// Enhanced onboarding API with proper TypeScript and plan generation trigger

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

    // Parse race date with proper error handling
    let parsedRaceDate: Date | null = null
    if (raceDate && typeof raceDate === 'string') {
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

    // ✅ Trigger plan generation after saving profile
    console.log('🚀 Triggering plan generation for user:', userId)
    
    try {
      // Get proper base URL with TypeScript-safe environment variable handling
      const environmentUrl = process.env['VERCEL_URL']
      let baseUrl: string
      
      if (environmentUrl && typeof environmentUrl === 'string' && environmentUrl.length > 0) {
        baseUrl = `https://${environmentUrl}`
      } else {
        baseUrl = 'http://localhost:3000'
      }
      
      console.log('🌐 Using base URL for internal API call:', baseUrl)
      
      // Call the generate-plan API internally
      const generateResponse = await fetch(`${baseUrl}/api/generate-plan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-request': 'true'
        },
        body: JSON.stringify({ 
          userId,
          onboardingData: userProfile
        })
      })

      if (generateResponse.ok) {
        console.log('✅ Plan generation started successfully')
        
        // Update profile to indicate generation started
        await prisma.userProfile.update({
          where: { userId },
          data: { lastPlanUpdate: new Date() }
        })
        
        return NextResponse.json({
          success: true,
          profile: {
            id: userProfile.id,
            raceType: userProfile.raceType,
            targetTime: userProfile.targetTime,
            raceDate: userProfile.raceDate,
            onboardingComplete: userProfile.onboardingComplete
          },
          message: 'Profile saved and plan generation started!',
          planGenerationStarted: true
        })
      } else {
        const errorText = await generateResponse.text()
        console.error('❌ Failed to start plan generation:', generateResponse.status, errorText)
        
        // Still return success for profile save, but indicate generation failed
        return NextResponse.json({
          success: true,
          profile: {
            id: userProfile.id,
            raceType: userProfile.raceType,
            targetTime: userProfile.targetTime,
            raceDate: userProfile.raceDate,
            onboardingComplete: userProfile.onboardingComplete
          },
          message: 'Profile saved successfully. Plan generation will start shortly.',
          planGenerationStarted: false
        })
      }
    } catch (generationError: unknown) {
      const generationErrorMessage = generationError instanceof Error 
        ? generationError.message 
        : 'Unknown error occurred during plan generation'
      console.error('❌ Error triggering plan generation:', generationErrorMessage)
      
      // Still return success for profile save
      return NextResponse.json({
        success: true,
        profile: {
          id: userProfile.id,
          raceType: userProfile.raceType,
          targetTime: userProfile.targetTime,
          raceDate: userProfile.raceDate,
          onboardingComplete: userProfile.onboardingComplete
        },
        message: 'Profile saved successfully. Plan generation will start shortly.',
        planGenerationStarted: false
      })
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('❌ Onboarding API error:', errorMessage)
    
    return NextResponse.json(
      { error: 'Failed to save profile data', details: errorMessage },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}