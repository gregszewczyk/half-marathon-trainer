// Test Perplexity API key
const apiKey = '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';

async function testPerplexityAPI() {
  console.log('Testing Perplexity API...');
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "sonar-deep-research",
        messages: [
          {
            role: "user",
            content: "What is 2+2? Reply with just the number."
          }
        ]
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      return;
    }

    const result = await response.json();
    console.log('API Response:', result.choices[0]?.message?.content);
    console.log('✅ API key is working!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testPerplexityAPI();