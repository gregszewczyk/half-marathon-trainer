export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }
    
    const data = await response.json();
    return Response.json({ response: data.choices[0]?.message?.content });
    
  } catch (error) {
    console.error('Test connection error:', error);
    return Response.json(
      { error: 'Failed to test connection' }, 
      { status: 500 }
    );
  }
}