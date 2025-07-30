// 🧪 Test the new RPE range and pace deviation triggers

import { PerplexityAIService, SessionFeedback } from './perplexity_service';

const aiService = new PerplexityAIService();

// Test scenarios for RPE range and pace deviation triggers
const testScenarios: { name: string; feedback: SessionFeedback; expectedTrigger: boolean }[] = [
  {
    name: "Perfect Easy Run - RPE 4, on target pace",
    feedback: {
      sessionId: "test-1",
      completed: 'yes',
      actualPace: '7:00',
      difficulty: 4,
      rpe: 4,
      feeling: 'good',
      comments: 'Felt comfortable throughout',
      weekNumber: 3,
      sessionType: 'easy',
      targetPace: '7:00',
      targetDistance: 5
    },
    expectedTrigger: false
  },
  {
    name: "Easy Run Too Hard - RPE 7 (expected 3-5)",
    feedback: {
      sessionId: "test-2", 
      completed: 'yes',
      actualPace: '6:30',
      difficulty: 6,
      rpe: 7, // Outside easy run range (3-5)
      feeling: 'ok',
      comments: 'Felt harder than usual',
      weekNumber: 3,
      sessionType: 'easy',
      targetPace: '7:00',
      targetDistance: 5
    },
    expectedTrigger: true // RPE outside range
  },
  {
    name: "Easy Run Too Easy - RPE 2 (expected 3-5)",
    feedback: {
      sessionId: "test-3",
      completed: 'yes', 
      actualPace: '7:30',
      difficulty: 3,
      rpe: 2, // Below easy run range (3-5)
      feeling: 'great',
      comments: 'Very easy, could have gone much faster',
      weekNumber: 3,
      sessionType: 'easy',
      targetPace: '7:00',
      targetDistance: 5
    },
    expectedTrigger: true // RPE outside range
  },
  {
    name: "Tempo Run Perfect - RPE 6 (expected 6-7)",
    feedback: {
      sessionId: "test-4",
      completed: 'yes',
      actualPace: '5:30', 
      difficulty: 6,
      rpe: 6, // Perfect for tempo
      feeling: 'good',
      comments: 'Controlled effort, felt strong',
      weekNumber: 5,
      sessionType: 'tempo',
      targetPace: '5:30',
      targetDistance: 6
    },
    expectedTrigger: false
  },
  {
    name: "Pace Deviation - 15 seconds slower",
    feedback: {
      sessionId: "test-5",
      completed: 'yes',
      actualPace: '7:15', // 15 seconds slower than target
      difficulty: 5,
      rpe: 5,
      feeling: 'ok',
      comments: 'Legs felt heavy today',
      weekNumber: 4,
      sessionType: 'easy',
      targetPace: '7:00',
      targetDistance: 5
    },
    expectedTrigger: true // Significant pace deviation (>10s)
  },
  {
    name: "Pace Deviation - 5 seconds faster (acceptable)",
    feedback: {
      sessionId: "test-6",
      completed: 'yes',
      actualPace: '6:55', // 5 seconds faster than target
      difficulty: 4,
      rpe: 4,
      feeling: 'good',
      comments: 'Felt good, natural pace',
      weekNumber: 4,
      sessionType: 'easy',
      targetPace: '7:00',
      targetDistance: 5
    },
    expectedTrigger: false // Small pace deviation (<10s)
  },
  {
    name: "Interval Session Perfect - RPE 8 (expected 8-9)",
    feedback: {
      sessionId: "test-7",
      completed: 'yes',
      actualPace: '4:30',
      difficulty: 8,
      rpe: 8, // Perfect for intervals
      feeling: 'good',
      comments: 'Challenging but controlled',
      weekNumber: 7,
      sessionType: 'intervals',
      targetPace: '4:30',
      targetDistance: 4
    },
    expectedTrigger: false
  },
  {
    name: "Interval Session Too Easy - RPE 6 (expected 8-9)",
    feedback: {
      sessionId: "test-8",
      completed: 'yes',
      actualPace: '4:45',
      difficulty: 6,
      rpe: 6, // Too easy for intervals
      feeling: 'good',
      comments: 'Felt way too easy, could go much faster',
      weekNumber: 7,
      sessionType: 'intervals',
      targetPace: '4:30',
      targetDistance: 4
    },
    expectedTrigger: true // RPE too low for intervals
  }
];

// Run the tests
console.log('🧪 Testing RPE Range and Pace Deviation Triggers\n');

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   Session: ${scenario.feedback.sessionType} | Target: ${scenario.feedback.targetPace}/km | RPE: ${scenario.feedback.rpe}`);
  if (scenario.feedback.actualPace) {
    console.log(`   Actual Pace: ${scenario.feedback.actualPace}/km`);
  }
  
  const shouldTrigger = aiService.shouldTriggerAI(scenario.feedback);
  const result = shouldTrigger === scenario.expectedTrigger ? '✅' : '❌';
  
  console.log(`   Expected: ${scenario.expectedTrigger ? 'TRIGGER' : 'NO TRIGGER'} | Actual: ${shouldTrigger ? 'TRIGGER' : 'NO TRIGGER'} ${result}`);
  console.log('');
});

console.log('🎯 Test complete! Check console logs above for detailed trigger logic.');
