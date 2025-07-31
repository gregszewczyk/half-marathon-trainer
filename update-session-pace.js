// Script to update session pace in database for AI trigger testing
// Run with: node update-session-pace.js

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSessionPace() {
  try {
    console.log('🔧 Updating session pace for AI trigger testing...');
    
    // Find the most recent session feedback
    const recentFeedback = await prisma.sessionFeedback.findFirst({
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        actualPace: true,
        plannedPace: true,
        sessionSubType: true,
        rpe: true,
        difficulty: true,
        comments: true
      }
    });
    
    if (!recentFeedback) {
      console.log('❌ No recent feedback found');
      return;
    }
    
    console.log('📊 Current session data:');
    console.log(`- Session ID: ${recentFeedback.sessionId}`);
    console.log(`- Session Type: ${recentFeedback.sessionSubType}`);
    console.log(`- Planned Pace: ${recentFeedback.plannedPace}`);
    console.log(`- Current Actual Pace: ${recentFeedback.actualPace}`);
    console.log(`- RPE: ${recentFeedback.rpe}`);
    console.log(`- Difficulty: ${recentFeedback.difficulty}`);
    console.log(`- Comments: ${recentFeedback.comments || 'None'}`);
    
    // Update to make pace much faster to trigger AI
    const newPace = '5:30'; // Very fast for easy run - should definitely trigger
    
    const updated = await prisma.sessionFeedback.update({
      where: { id: recentFeedback.id },
      data: {
        actualPace: newPace
      }
    });
    
    console.log(`✅ Updated actual pace from ${recentFeedback.actualPace} to ${newPace}`);
    console.log('');
    console.log('🧪 Now use the Test (resubmit) button to see if AI triggers!');
    console.log('Expected: 35+ second improvement should trigger AI analysis');
    
  } catch (error) {
    console.error('❌ Error updating session pace:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSessionPace().catch(console.error);