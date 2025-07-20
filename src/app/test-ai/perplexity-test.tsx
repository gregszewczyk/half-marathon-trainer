'use client';
import { useState } from 'react';

const PerplexityTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  const testPerplexityConnection = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      // Use Next.js API route instead of direct call
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test connection: What is a good recovery strategy after a high-intensity running session?'
        })
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`API Error: ${res.status} - ${errorData}`);
      }

      const data = await res.json();
      setResponse(data.response || 'No response content');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Perplexity API Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const testTrainingAdaptation = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      // Test training adaptation prompt through API route
      const sessionData = {
        type: 'tempo',
        plannedDistance: 5,
        actualDistance: 3,
        plannedPace: '5:30',
        actualPace: '6:15',
        rpe: 9,
        difficulty: 8,
        feeling: 'tired',
        comments: 'Struggled to maintain pace, legs felt heavy'
      };

      const res = await fetch('/api/ai/adapt-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData: sessionData
        })
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`API Error: ${res.status} - ${errorData}`);
      }

      const data = await res.json();
      setResponse(data.adaptation || 'No adaptation content');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Training Adaptation API Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-white">Perplexity AI Integration Test</h2>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testPerplexityConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Basic Connection'}
        </button>
        
        <button
          onClick={testTrainingAdaptation}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-4"
        >
          {isLoading ? 'Testing...' : 'Test Training Adaptation'}
        </button>
      </div>

      {/* API Key Check */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2 text-white">API Key Status:</h3>
        <p className="text-sm text-gray-300">
          ❓ API key is stored server-side for security
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Make sure you have PERPLEXITY_API_KEY in your .env.local file (without NEXT_PUBLIC_ prefix)
        </p>
      </div>

      {/* Response Display */}
      {response && (
        <div className="mb-4 p-4 bg-green-900 border border-green-600 rounded">
          <h3 className="text-lg font-semibold mb-2 text-green-100">✅ API Response:</h3>
          <p className="text-green-200 whitespace-pre-wrap">{response}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-900 border border-red-600 rounded">
          <h3 className="text-lg font-semibold mb-2 text-red-100">❌ Error:</h3>
          <p className="text-red-200">{error}</p>
          
          {error.includes('401') && (
            <div className="mt-2 text-sm text-red-300">
              <p>This is likely an API key issue. Check:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Your API key is correct</li>
                <li>Your API key has the right permissions</li>
                <li>Your Perplexity account has credits</li>
              </ul>
            </div>
          )}
          
          {error.includes('404') && (
            <div className="mt-2 text-sm text-red-300">
              <p>API route not found. You need to create:</p>
              <ul className="list-disc list-inside mt-1">
                <li><code>/api/ai/test-connection.ts</code> - For basic testing</li>
                <li><code>/api/ai/adapt-training.ts</code> - For training adaptations</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2 text-white">Setup Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-gray-300 space-y-1">
          <li>Get your Perplexity API key from <a href="https://www.perplexity.ai/settings/api" className="text-blue-400 underline">perplexity.ai/settings/api</a></li>
          <li>Add it to your .env.local file: <code className="bg-gray-700 px-1 rounded">PERPLEXITY_API_KEY=pplx-your-key-here</code></li>
          <li>Create API routes in your Next.js app (see error messages above)</li>
          <li>Restart your development server</li>
          <li>Test the connection above</li>
        </ol>
      </div>

      {/* Integration Status */}
      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2 text-white">Current Integration Status:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>✅ AI triggers working (high RPE/difficulty detection)</li>
          <li>✅ Training data structure ready</li>
          <li>✅ Feedback form collecting all necessary data</li>
          <li>❓ Perplexity API connection (test above)</li>
          <li>❓ Automatic adaptations (requires API connection)</li>
        </ul>
      </div>
    </div>
  );
};

export default PerplexityTest;