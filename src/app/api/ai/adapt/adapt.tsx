import { NextRequest, NextResponse } from 'next/server';
import { PerplexityAIService, SessionFeedback } from '@/lib/ai/perplexity-service';

const aiService = new PerplexityAIService();

export async function POST(request: NextRequest) {
  try {
    const { feedback, recentFeedback, currentWeek } = await request.json();

    // Validate required fields
    if (!feedback || typeof currentWeek !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if AI should be triggered
    const shouldTrigger = aiService.shouldTriggerAI(feedback);
    
    if (!shouldTrigger) {
      return NextResponse.json({
        triggered: false,
        message: 'Training parameters within normal range - no adaptations needed'
      });
    }

    // Generate adaptations
    const adaptations = await aiService.generateAdaptations(
      feedback,
      recentFeedback || [],
      currentWeek
    );

    return NextResponse.json({
      triggered: true,
      adaptations,
      feedback: feedback
    });

  } catch (error) {
    console.error('AI Adaptation API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate adaptations' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Adaptations API',
    status: 'Active',
    model: 'sonar-pro',
    features: [
      'Training adaptations based on RPE feedback',
      'Smart triggering (RPE ≥8, difficulty ≥8, incomplete sessions)',
      'Context-aware analysis (training phase, injury considerations)',
      'Cost-optimized API usage'
    ]
  });
}