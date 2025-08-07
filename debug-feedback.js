// Debug script to check if feedback was submitted and AI feedback generated
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFeedback() {
  try {
    const userId = 'cmdhtwtil0000vg18swahirhu';
    
    console.log('=== RECENT SESSION FEEDBACK ===');
    
    // Check recent session feedback submissions
    const recentFeedback = await prisma.sessionFeedback.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        sessionId: true,
        week: true,
        day: true,
        sessionSubType: true,
        completed: true,
        rpe: true,
        difficulty: true,
        submittedAt: true
      }
    });
    
    console.log(`Found ${recentFeedback.length} recent feedback entries:`);
    recentFeedback.forEach(feedback => {
      console.log(`  ${feedback.submittedAt.toISOString()}: ${feedback.sessionId} (W${feedback.week} ${feedback.day} ${feedback.sessionSubType}) - RPE:${feedback.rpe}, Diff:${feedback.difficulty}, Completed:${feedback.completed}`);
    });
    
    console.log('\n=== AI FEEDBACK ENTRIES ===');
    
    // Check AI feedback entries
    const aiFeedback = await prisma.aIFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        sessionId: true,
        weekNumber: true,
        sessionType: true,
        severity: true,
        createdAt: true,
        recommendations: true
      }
    });
    
    console.log(`Found ${aiFeedback.length} AI feedback entries:`);
    aiFeedback.forEach(ai => {
      const recCount = Array.isArray(ai.recommendations) ? ai.recommendations.length : 0;
      console.log(`  ${ai.createdAt.toISOString()}: ${ai.sessionId} (W${ai.weekNumber} ${ai.sessionType}) - ${ai.severity} severity, ${recCount} recommendations`);
    });
    
    // Check if there's a mismatch
    console.log('\n=== ANALYSIS ===');
    const latestFeedback = recentFeedback[0];
    if (latestFeedback) {
      const matchingAI = aiFeedback.find(ai => ai.sessionId === latestFeedback.sessionId);
      if (matchingAI) {
        console.log(`✅ Latest feedback (${latestFeedback.sessionId}) has matching AI feedback`);
      } else {
        console.log(`❌ Latest feedback (${latestFeedback.sessionId}) has NO matching AI feedback`);
        console.log(`   RPE: ${latestFeedback.rpe}, Difficulty: ${latestFeedback.difficulty}`);
        console.log(`   This might not have triggered AI adaptation`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFeedback();