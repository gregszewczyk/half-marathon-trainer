// src/app/api/ai/cross-week-modifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CrossWeekModificationRequest {
  currentWeek: number;
  modifications: Array<{
    week: number;
    day: string;
    modificationType: string;
    originalSession?: any;
    newSession: any;
    explanation: string;
  }>;
  selectedAlternative?: number;
  appliedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CrossWeekModificationRequest = await request.json();
    const { currentWeek, modifications, selectedAlternative, appliedAt } = body;

    console.log(`💾 Saving ${modifications.length} cross-week AI modifications`);

    // For now, we'll log the modifications
    // In a full implementation, you'd save to database
    for (const mod of modifications) {
      console.log(`📅 Week ${mod.week} ${mod.day}: ${mod.modificationType}`);
      console.log(`   Original: ${mod.originalSession?.subType || 'none'}`);
      console.log(`   New: ${mod.newSession.subType} - ${mod.newSession.reason}`);
      console.log(`   Explanation: ${mod.explanation}`);
    }

    // Save to database (this would be your actual implementation)

await prisma.crossWeekModification.createMany({
  data: modifications.map(mod => ({
    currentWeek,
    targetWeek: mod.week,
    targetDay: mod.day,
    modificationType: mod.modificationType,
    originalSessionData: JSON.stringify(mod.originalSession),
    newSessionData: JSON.stringify(mod.newSession),
    explanation: mod.explanation,
    selectedAlternative: selectedAlternative ?? null, // Convert undefined to null
    appliedAt: new Date(appliedAt),
  }))
});
    

    // For demo purposes, we'll just return success
    const response = {
      success: true,
      message: `Applied ${modifications.length} AI training modifications`,
      modifications: modifications.map(mod => ({
        week: mod.week,
        day: mod.day,
        change: `${mod.originalSession?.subType || 'New'} → ${mod.newSession.subType}`,
        reason: mod.newSession.reason
      })),
      appliedAt
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error saving cross-week modifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save AI modifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('week');

    // Return AI modification history for a specific week
    // This would query your database for applied modifications
    
    const modifications = [
      // Mock data for demo - replace with actual database query
      {
        id: 1,
        currentWeek: 1,
        targetWeek: 2,
        targetDay: 'wednesday',
        modificationType: 'session_conversion',
        originalSession: 'tempo',
        newSession: 'fartlek',
        reason: 'Reduce structured pressure while maintaining lactate work',
        appliedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      modifications: weekNumber ? 
        modifications.filter(m => m.targetWeek === parseInt(weekNumber)) : 
        modifications
    });

  } catch (error) {
    console.error('Error fetching cross-week modifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch modifications' }, 
      { status: 500 }
    );
  }
}