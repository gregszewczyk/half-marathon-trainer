import { useState, useEffect } from 'react';
import { Brain, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface PlanGenerationStatusProps {
  userId: string;
  onPlanReady: () => void;
}

const PlanGenerationStatus = ({ userId, onPlanReady }: PlanGenerationStatusProps) => {
  const [status, setStatus] = useState<'generating' | 'complete' | 'error' | 'checking'>('checking');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Checking plan status...');
  const [hasTriggeredGeneration, setHasTriggeredGeneration] = useState(false);

  // Simple check plan status function
  const checkPlanStatus = async () => {
    try {
      console.log(`🔍 Checking plan status for user: ${userId}`);
      
      const response = await fetch(`/api/training-plan?userId=${userId}`);
      const data = await response.json();
      
      console.log(`📊 Plan status:`, {
        planGenerated: data.planGenerated,
        onboardingComplete: data.onboardingComplete,
        sessionsCount: data.sessions?.length || 0
      });

      if (data.planGenerated && data.sessions?.length > 0) {
        console.log('✅ Plan generation complete!');
        setStatus('complete');
        setMessage('Training plan ready! Loading your dashboard...');
        setProgress(100);
        
        setTimeout(() => {
          onPlanReady();
        }, 2000);
      } else if (data.onboardingComplete && !data.planGenerated) {
        // Only trigger generation once
        if (!hasTriggeredGeneration) {
          console.log('🚀 Need to generate plan - triggering once');
          setHasTriggeredGeneration(true);
          triggerPlanGeneration();
        } else {
          console.log('🤖 Plan generation in progress...');
          setStatus('generating');
          setMessage('AI is creating your personalized training plan...');
          setProgress(prev => Math.min(prev + 15, 90));
        }
      } else {
        console.log('❌ Onboarding not completed');
        setStatus('error');
        setMessage('Please complete the onboarding process first.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error checking plan status:', errorMessage);
      setStatus('error');
      setMessage('Error checking plan status. Please try again.');
    }
  };

  // Trigger plan generation - called only once
  const triggerPlanGeneration = async () => {
    try {
      console.log('🤖 Starting plan generation...');
      setStatus('generating');
      setMessage('Starting AI plan generation...');
      setProgress(30);
      
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        console.log('✅ Plan generation started successfully');
        setMessage('AI is analyzing your goals and preferences...');
        setProgress(50);
      } else {
        console.error('❌ Failed to start plan generation:', response.status);
        setStatus('error');
        setMessage('Failed to start plan generation. Please try again.');
        setHasTriggeredGeneration(false); // Reset to allow retry
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error starting plan generation:', errorMessage);
      setStatus('error');
      setMessage('Network error. Please check your connection.');
      setHasTriggeredGeneration(false); // Reset to allow retry
    }
  };

  // Simple polling every 5 seconds
  useEffect(() => {
    if (!userId) return;

    console.log(`🚀 Starting simple polling for user: ${userId}`);
    
    // Initial check
    checkPlanStatus();
    
    // Poll every 5 seconds
    const interval = setInterval(() => {
      if (status !== 'complete') {
        checkPlanStatus();
      }
    }, 5000);

    return () => {
      console.log('🧹 Cleanup polling interval');
      clearInterval(interval);
    };
  }, [userId]);

  // Manual retry
  const handleRetry = () => {
    console.log('🔄 Manual retry requested');
    setHasTriggeredGeneration(false);
    setStatus('checking');
    setMessage('Retrying...');
    setProgress(0);
    checkPlanStatus();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />;
      case 'generating':
        return <Brain className="w-8 h-8 text-cyan-400 animate-pulse" />;
      case 'complete':
        return <CheckCircle className="w-8 h-8 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-400" />;
      default:
        return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking': return 'border-blue-500/30 bg-blue-900/20';
      case 'generating': return 'border-cyan-500/30 bg-cyan-900/20';
      case 'complete': return 'border-green-500/30 bg-green-900/20';
      case 'error': return 'border-red-500/30 bg-red-900/20';
      default: return 'border-gray-500/30 bg-gray-900/20';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className={`max-w-md w-full p-8 rounded-lg border ${getStatusColor()}`}>
        
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          {status === 'complete' ? 'Plan Ready!' : 
           status === 'error' ? 'Generation Error' :
           'Generating Your Training Plan'}
        </h1>
        
        <p className="text-gray-300 text-center mb-6 leading-relaxed">
          {message}
        </p>
        
        {status === 'generating' && (
          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-cyan-400 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 text-center mt-2">{progress}% complete</p>
          </div>
        )}
        
        {status === 'complete' && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
            <p className="text-green-300 text-sm">
              🎉 Your training plan is ready! Redirecting...
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm text-center">
                Something went wrong. Please try again.
              </p>
            </div>
            
            <button
              onClick={handleRetry}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default PlanGenerationStatus;