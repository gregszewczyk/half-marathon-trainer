export async function POST(req: Request) {
  try {
    const { sessionData } = await req.json();
    
    const prompt = `Based on this training session feedback, provide a brief adaptation recommendation:

Session: ${sessionData.type} run
Planned: ${sessionData.plannedDistance}km at ${sessionData.plannedPace}/km
Actual: ${sessionData.actualDistance}km at ${sessionData.actualPace}/km
RPE: ${sessionData.rpe}/10
Difficulty: ${sessionData.difficulty}/10
Feeling: ${sessionData.feeling}
Comments: ${sessionData.comments}

Provide a concise recommendation for the next session.`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150
      })
    });
    
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Response.json({ adaptation: data.choices[0]?.message?.content });
    
  } catch (error) {
    console.error('Training adaptation error:', error);
    return Response.json(
      { error: 'Failed to get training adaptation' }, 
      { status: 500 }
    );
  }
}