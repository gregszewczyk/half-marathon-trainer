// 🔧 SIMPLE: Generate only Week 1 with correct user ID
// src/app/api/admin/generate-week1/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, SessionType } from '@prisma/client';

const prisma = new PrismaClient();

// Pace zones for your sub-2:00 goal (5:41/km target pace)
const paceZones = {
  easyPace: '6:32',      // 115% of target pace
  tempoPace: '5:13',     // 92% of target pace  
  fiveKPace: '4:45',     // 85% of target pace
  longPace: '6:00'       // 105% of target pace
};

export async function POST() {
  try {
    console.log('🚀 Starting Week 1 generation...');
    
    // Your CORRECT admin user ID
    const adminUserId = 'cmdhtwtil0000vg18swahirhu';
    
    // Clear ALL existing sessions for admin user
    const deleted = await prisma.generatedSession.deleteMany({
      where: { userId: adminUserId }
    });
    
    console.log(`✅ Cleared ${deleted.count} existing sessions for ${adminUserId}`);
    
    // Generate ONLY Week 1 sessions
    const week1Sessions = [];
    const weekNumber = 1;
    
    console.log(`📅 Generating Week ${weekNumber} sessions`);
    
    // MONDAY - Push Gym + Easy Run with MadeRunning
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Monday',
      sessionType: SessionType.GYM,
      sessionSubType: 'push',
      scheduledTime: '04:30',
      duration: '60 min',
      mainSet: 'Push Day: Chest, Shoulders, Triceps @ 4:30 AM',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Monday',
      sessionType: SessionType.RUNNING,
      sessionSubType: 'easy',
      distance: 5.0,
      pace: paceZones.easyPace,
      scheduledTime: '17:00',
      duration: '25 min',
      isRunningClub: true,
      warmup: '10 min easy jog',
      mainSet: '25 min @ easy pace with MadeRunning',
      cooldown: '5 min walk + stretching',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    // TUESDAY - Pull Gym only
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Tuesday',
      sessionType: SessionType.GYM,
      sessionSubType: 'pull',
      scheduledTime: '04:30',
      duration: '60 min',
      mainSet: 'Pull Day: Back, Biceps @ 4:30 AM',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    // WEDNESDAY - Tempo Run + Legs Gym (Week 1 = Base phase)
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Wednesday',
      sessionType: SessionType.RUNNING,
      sessionSubType: 'tempo',
      distance: 6.0, // 6 + 0 for week 1
      pace: paceZones.tempoPace,
      scheduledTime: '05:00',
      duration: '40 min',
      isRunningClub: true,
      warmup: '15 min easy + drills',
      mainSet: '6km @ tempo pace with MadeRunning',
      cooldown: '10 min easy jog',
      targetRPE: { min: 6, max: 7, description: 'Comfortably hard' },
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Wednesday',
      sessionType: SessionType.GYM,
      sessionSubType: 'legs',
      scheduledTime: '06:00',
      duration: '60 min',
      mainSet: 'Legs Day: Quads, Hamstrings, Glutes, Calves @ 6:00 AM',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    // THURSDAY - Push Gym + Easy Run (solo)
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Thursday',
      sessionType: SessionType.GYM,
      sessionSubType: 'push',
      scheduledTime: '04:30',
      duration: '60 min',
      mainSet: 'Push Day: Chest, Shoulders, Triceps @ 4:30 AM',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Thursday',
      sessionType: SessionType.RUNNING,
      sessionSubType: 'easy',
      distance: 5.0, // 5 + Math.min(0, 4) for week 1
      pace: paceZones.easyPace,
      scheduledTime: '18:00',
      duration: '30 min',
      isRunningClub: false,
      warmup: '10 min easy jog',
      mainSet: '5km @ easy pace (solo)',
      cooldown: '5 min walk',
      targetRPE: { min: 3, max: 5, description: 'Conversational pace' },
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    // FRIDAY - Pull Gym only
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Friday',
      sessionType: SessionType.GYM,
      sessionSubType: 'pull',
      scheduledTime: '04:30',
      duration: '60 min',
      mainSet: 'Pull Day: Back, Biceps @ 4:30 AM',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    // SATURDAY - Legs Gym + Long Run with MadeRunning
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Saturday',
      sessionType: SessionType.GYM,
      sessionSubType: 'legs',
      scheduledTime: '06:00',
      duration: '60 min',
      mainSet: 'Legs Day: Quads, Hamstrings, Glutes, Calves @ 6:00 AM',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Saturday',
      sessionType: SessionType.RUNNING,
      sessionSubType: 'long',
      distance: 8.0, // First week long run
      pace: paceZones.longPace,
      scheduledTime: '09:00',
      duration: '52 min', // 8 * 6.5 min estimated
      isRunningClub: true,
      warmup: '10 min easy jog',
      mainSet: '8km @ long run pace with MadeRunning',
      cooldown: '10 min walk + stretching',
      targetRPE: { min: 5, max: 6, description: 'Steady effort' },
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    // SUNDAY - Rest Day
    week1Sessions.push({
      userId: adminUserId,
      week: weekNumber,
      dayOfWeek: 'Sunday',
      sessionType: SessionType.REST,
      sessionSubType: 'active',
      scheduledTime: '10:00',
      duration: '60 min',
      mainSet: 'Active recovery: 15k steps walking or gentle stretching',
      isMoveable: true,
      aiModified: false,
      planVersion: '1.0'
    });
    
    console.log(`📊 Generated ${week1Sessions.length} Week 1 sessions`);
    
    // Insert Week 1 sessions into database
    const result = await prisma.generatedSession.createMany({
      data: week1Sessions,
      skipDuplicates: true
    });
    
    console.log(`✅ Successfully created ${result.count} Week 1 sessions`);
    
    // Verify what was created
    const verification = await prisma.generatedSession.findMany({
      where: { 
        userId: adminUserId,
        week: 1
      },
      select: {
        id: true,
        dayOfWeek: true,
        sessionType: true,
        sessionSubType: true,
        distance: true,
        pace: true
      }
    });
    
    console.log('🔍 Verification - Created sessions:', verification);
    
    return NextResponse.json({
      success: true,
      message: `Generated Week 1 with ${result.count} sessions for ${adminUserId}`,
      sessionsCreated: result.count,
      verification: verification
    });
    
  } catch (error) {
    console.error('❌ Week 1 generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}