// Debug script to check what data the resubmit button is trying to send
// Run with: node debug-resubmit.js

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugResubmitData() {
  try {
    console.log('🔍 Debugging resubmit data...');
    
    // Get the same data that the resubmit button would fetch
    const lastFeedback = await prisma.sessionFeedback.findFirst({
      orderBy: { submittedAt: 'desc' }
    });
    
    if (!lastFeedback) {
      console.log('❌ No feedback found');
      return;
    }
    
    console.log('📊 Data that would be resubmitted:');
    console.log(JSON.stringify({
      userId: lastFeedback.userId,
      sessionId: lastFeedback.sessionId,
      weekNumber: lastFeedback.week,
      day: lastFeedback.day,
      sessionType: lastFeedback.sessionType,
      sessionSubType: lastFeedback.sessionSubType,
      plannedDistance: lastFeedback.plannedDistance,
      plannedPace: lastFeedback.plannedPace,
      completed: lastFeedback.completed,
      actualPace: lastFeedback.actualPace,
      difficulty: lastFeedback.difficulty,
      rpe: lastFeedback.rpe,
      feeling: lastFeedback.feeling,
      comments: lastFeedback.comments
    }, null, 2));
    
    // Check for any obvious issues
    console.log('\n🔍 Potential issues:');
    if (!lastFeedback.userId) console.log('❌ Missing userId');
    if (!lastFeedback.sessionId) console.log('❌ Missing sessionId');
    if (!lastFeedback.week) console.log('❌ Missing week');
    if (!lastFeedback.actualPace) console.log('❌ Missing actualPace');
    if (!lastFeedback.plannedPace) console.log('❌ Missing plannedPace');
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Error debugging resubmit data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugResubmitData().catch(console.error);