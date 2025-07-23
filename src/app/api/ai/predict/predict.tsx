import { NextRequest, NextResponse } from 'next/server';
import { PerplexityAIService } from '@/lib/ai/perplexity_service';

const aiService = new PerplexityAIService();

export async function POST(request: NextRequest) {
  try {
    const { recentSessions, currentGoalTime } = await request.json();

    if (!recentSessions || !currentGoalTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prediction = await aiService.predictRaceTime(recentSessions, currentGoalTime);

    return NextResponse.json({
      predictedTime: prediction,
      confidence: '87%', // Static for now, could be calculated
      analysis: 'Based on recent training performance and progression'
    });

  } catch (error) {
    console.error('AI Prediction API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Race Predictions API',
    status: 'Active',
    capabilities: [
      'Race time predictions based on training data',
      'Current fitness assessment',
      'Goal time recommendations',
      'Performance trend analysis'
    ]
  });
}