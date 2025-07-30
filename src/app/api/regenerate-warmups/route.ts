import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PerplexityAIService } from '@/lib/ai/perplexity_service';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log(`🔄 Starting warm-up/cool-down regeneration for user ${userId}`);

    // Get user profile for AI context
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        fitnessLevel: true,
        injuryHistory: true,
        age: true,
      }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get all generated sessions for this user
    const sessions = await prisma.generatedSession.findMany({
      where: { 
        userId,
        sessionType: 'RUNNING' // Only regenerate for running sessions
      },
      select: {
        id: true,
        sessionSubType: true,
        warmup: true,
        cooldown: true,
        scheduledTime: true,
      }
    });

    console.log(`📋 Found ${sessions.length} running sessions to regenerate`);

    const aiService = new PerplexityAIService();
    let updatedCount = 0;
    let aiGeneratedCount = 0;
    let fallbackCount = 0;

    // Process sessions in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      
      for (const session of batch) {
        try {
          // Determine time of day from scheduledTime
          let timeOfDay: 'morning' | 'afternoon' | 'evening' | undefined;
          if (session.scheduledTime) {
            const timeStr = String(session.scheduledTime);
            const timeParts = timeStr.split(':');
            if (timeParts.length > 0 && timeParts[0]) {
              const hour = parseInt(timeParts[0]);
              if (hour < 12) timeOfDay = 'morning';
              else if (hour < 17) timeOfDay = 'afternoon';
              else timeOfDay = 'evening';
            }
          }

          // Generate new warm-up and cool-down
          const { warmup, cooldown } = await aiService.generateWarmupCooldown(
            session.sessionSubType || 'easy',
            {
              fitnessLevel: userProfile.fitnessLevel || 'intermediate',
              ...(userProfile.injuryHistory && userProfile.injuryHistory.length > 0 && {
                injuryHistory: userProfile.injuryHistory.join(', ')
              }),
              ...(userProfile.age && {
                age: userProfile.age
              }),
            },
            timeOfDay
          );

          // Check if this was AI-generated or fallback
          const isAIGenerated = warmup.length > 50 && !warmup.includes('min dynamic stretching:');
          if (isAIGenerated) {
            aiGeneratedCount++;
          } else {
            fallbackCount++;
          }

          // Update the session
          await prisma.generatedSession.update({
            where: { id: session.id },
            data: {
              warmup,
              cooldown,
            }
          });

          updatedCount++;
          console.log(`✅ Updated session ${session.id}: ${session.sessionSubType}`);

        } catch (error) {
          console.error(`❌ Failed to update session ${session.id}:`, error);
        }
      }

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < sessions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🎉 Regeneration complete:`);
    console.log(`   📈 Updated sessions: ${updatedCount}/${sessions.length}`);
    console.log(`   🤖 AI generated: ${aiGeneratedCount}`);
    console.log(`   🔧 Fallback used: ${fallbackCount}`);

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated warm-ups and cool-downs for ${updatedCount} sessions`,
      stats: {
        totalSessions: sessions.length,
        updatedSessions: updatedCount,
        aiGenerated: aiGeneratedCount,
        fallbackUsed: fallbackCount,
      }
    });

  } catch (error) {
    console.error('❌ Error regenerating warm-ups/cool-downs:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate warm-ups and cool-downs' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}