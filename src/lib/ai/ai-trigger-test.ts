// Test scenarios for improved AI trigger logic
// This file demonstrates how the new smart triggering works

import { PerplexityAIService, SessionFeedback } from './perplexity_service';

const aiService = new PerplexityAIService();

// Test scenarios
const scenarios: { name: string; feedback: SessionFeedback; expectedTrigger: boolean; reasoning: string }[] = [
  {
    name: "Your scenario: RPE 8, target 6-8, positive comments",
    feedback: {
      sessionId: "test1",
      completed: "yes",
      rpe: 8,
      difficulty: 8,
      feeling: "good",
      comments: "Felt controlled and strong throughout. Right on target pace. Good effort.",
      weekNumber: 5,
      sessionType: "Tempo Run",
      targetPace: "4:30",
      targetDistance: 8
    },
    expectedTrigger: false,
    reasoning: "RPE 8 within target range + positive comments = no adaptation needed"
  },
  
  {
    name: "RPE 8 with concerning comments",
    feedback: {
      sessionId: "test2", 
      completed: "yes",
      rpe: 8,
      difficulty: 8,
      feeling: "ok",
      comments: "Really struggled in the last 2km. Legs felt heavy and pace was hard to maintain.",
      weekNumber: 5,
      sessionType: "Tempo Run",
      targetPace: "4:30",
      targetDistance: 8
    },
    expectedTrigger: true,
    reasoning: "RPE 8 + negative indicators in comments = adaptation needed"
  },
  
  {
    name: "RPE 9 regardless of comments",
    feedback: {
      sessionId: "test3",
      completed: "yes", 
      rpe: 9,
      difficulty: 7,
      feeling: "ok",
      comments: "Actually felt pretty good, just pushed hard today",
      weekNumber: 5,
      sessionType: "Interval Training",
      targetPace: "4:00",
      targetDistance: 6
    },
    expectedTrigger: true,
    reasoning: "RPE 9 is very high regardless of positive comments"
  },
  
  {
    name: "RPE 8 with no comments (conservative approach)",
    feedback: {
      sessionId: "test4",
      completed: "yes",
      rpe: 8,
      difficulty: 8, 
      feeling: "ok",
      comments: "",
      weekNumber: 5,
      sessionType: "Tempo Run",
      targetPace: "4:30",
      targetDistance: 8
    },
    expectedTrigger: false,
    reasoning: "RPE 8 with no comments = assume within target, no adaptation"
  },
  
  {
    name: "Lower RPE but injury concerns",
    feedback: {
      sessionId: "test5",
      completed: "partial",
      rpe: 6,
      difficulty: 5,
      feeling: "ok", 
      comments: "Had to stop early due to sharp pain in left hamstring",
      weekNumber: 5,
      sessionType: "Easy Run",
      targetPace: "5:00",
      targetDistance: 10
    },
    expectedTrigger: true,
    reasoning: "Injury-related comments always trigger adaptation"
  }
];

// Test function
export function testAITriggerLogic() {
  console.log('🧪 Testing Improved AI Trigger Logic\n');
  
  scenarios.forEach((scenario, index) => {
    const shouldTrigger = aiService.shouldTriggerAI(scenario.feedback);
    const passed = shouldTrigger === scenario.expectedTrigger;
    
    console.log(`Test ${index + 1}: ${scenario.name}`);
    console.log(`Expected: ${scenario.expectedTrigger ? 'TRIGGER' : 'NO TRIGGER'}`);
    console.log(`Actual: ${shouldTrigger ? 'TRIGGER' : 'NO TRIGGER'}`);
    console.log(`Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Reasoning: ${scenario.reasoning}\n`);
  });
}