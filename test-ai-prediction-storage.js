// Test script for AI prediction storage
// Run with: node test-ai-prediction-storage.js

require('dotenv').config({ path: '.env.local' });

async function testAIPredictionStorage() {
  console.log('🎯 Testing AI Prediction Storage...');
  
  // Test the feedback API endpoint with mock data
  const testUserId = 'clwz1x2340001v8aabbccddee'; // Replace with a real user ID from your database
  
  const mockFeedbackData = {
    userId: testUserId,
    sessionId: 'test-session-tempo-1',
    weekNumber: 4,
    day: 'Wednesday',
    sessionType: 'running',
    sessionSubType: 'tempo',
    plannedDistance: 8,
    plannedPace: '5:06',
    plannedTime: '40:48',
    completed: 'yes',
    actualPace: '5:00', // Faster than planned - should trigger prediction update
    difficulty: 7,
    rpe: 6,
    feeling: 'good',
    comments: 'Felt strong throughout, negative split'
  };
  
  try {
    console.log('\n1. Submitting tempo session feedback...');
    const response = await fetch('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockFeedbackData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Feedback submitted successfully');
      
      if (result.updatedPrediction) {
        console.log(`🎯 AI prediction updated: ${result.updatedPrediction}`);
        console.log('✅ AI prediction storage is working!');
      } else {
        console.log('⚠️ No prediction update (may be same as current goal)');
      }
    } else {
      console.error('❌ Feedback submission failed:', response.status, await response.text());
    }
    
    console.log('\n2. Testing training plan API to verify stored prediction...');
    const planResponse = await fetch(`http://localhost:3000/api/training-plan?userId=${testUserId}`);
    
    if (planResponse.ok) {
      const planData = await planResponse.json();
      if (planData.userProfile?.aiPredictedTime) {
        console.log(`✅ AI prediction loaded from database: ${planData.userProfile.aiPredictedTime}`);
        console.log(`📅 Last updated: ${planData.userProfile.lastPredictionUpdate}`);
        
        if (planData.userProfile.predictionHistory) {
          const history = JSON.parse(planData.userProfile.predictionHistory);
          console.log(`📊 Prediction history: ${history.length} entries`);
          console.log('Latest entry:', history[history.length - 1]);
        }
      } else {
        console.log('⚠️ No AI prediction found in user profile');
      }
    } else {
      console.error('❌ Training plan API failed:', planResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
  
  console.log('\n✅ AI prediction storage test completed!');
}

// Only run if called directly
if (require.main === module) {
  testAIPredictionStorage().catch(console.error);
}

module.exports = { testAIPredictionStorage };