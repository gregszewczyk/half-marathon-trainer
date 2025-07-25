import { useState, useEffect, useRef } from 'react';
import { Brain, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface PlanGenerationStatusProps {
  userId: string;
  onPlanReady: () => void;
}

const PlanGenerationStatus = ({ userId, onPlanReady }: PlanGenerationStatusProps) => {
  const [status, setStatus] = useState<'generating' | 'complete' | 'error' | 'checking'>('checking');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Checking plan status...');
  const [retryCount, setRetryCount] = useState(0);
  
  // Use ref to track current status for interval callback
  const statusRef = useRef(status);
  statusRef.current = status;

  // Check plan generation status
  const checkPlanStatus = async () => {
    try {
      console.log(`🔍 Checking plan status for user: ${userId}`);
      
      const response = await fetch(`/api/training-plan?userId=${userId}`);
      const data = await response.json();
      
      if (data.planGenerated && data.sessions.length > 0) {
        console.log('✅ Plan generation complete!');
        setStatus('complete');
        setMessage('Training plan ready! Loading your dashboard...');
        setProgress(100);
        
        // Delay to show success state
        setTimeout(() => {
          onPlanReady();
        }, 2000);
      } else if (data.onboardingComplete) {
        console.log('🤖 Plan still generating...');
        setStatus('generating');
        setMessage('AI is analyzing your goals and creating your personalized training plan...');
        setProgress(prev => Math.min(prev + 20, 90));
      } else {
        console.log('❌ Onboarding not completed');
        setStatus('error');
        setMessage('Onboarding not completed. Please complete the setup process.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error checking plan status:', errorMessage);
      setStatus('error');
      setMessage('Error checking plan status. Click retry to try again.');
    }
  };

  // ✅ FIXED: Auto-check status every 3 seconds with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    
    console.log(`🚀 Starting plan status monitoring for user: ${userId}`);
    
    // Initial check
    if (isMounted) {
      checkPlanStatus();
    }
    
    // Set up interval that checks current status via ref
    interval = setInterval(() => {
      if (!isMounted) {
        console.log('🛑 Component unmounted, stopping checks');
        return;
      }
      
      const currentStatus = statusRef.current;
      console.log(`⏰ Interval check - current status: ${currentStatus}`);
      
      if (currentStatus === 'generating' || currentStatus === 'checking') {
        checkPlanStatus();
      } else if (currentStatus === 'complete' || currentStatus === 'error') {
        console.log(`🛑 Stopping interval - final status: ${currentStatus}`);
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    }, 3000);

    return () => {
      console.log('🧹 Cleaning up plan status interval');
      isMounted = false;
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [userId]); // ✅ ONLY userId dependency - no status!

  // Manual retry function
  const handleRetry = async () => {
    console.log(`🔄 Manual retry attempt ${retryCount + 1}`);
    setRetryCount(prev => prev + 1);
    setStatus('checking');
    setMessage('Retrying plan generation...');
    setProgress(10);
    
    try {
      // First try to trigger plan generation again
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          retryGeneration: true 
        })
      });

      if (response.ok) {
        setStatus('generating');
        setMessage('Plan generation restarted. Please wait...');
        setProgress(30);
      } else {
        setStatus('error');
        setMessage('Failed to restart plan generation. Please contact support.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Retry error:', errorMessage);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
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
        
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {getStatusIcon()}
        </div>
        
        {/* Main Heading */}
        <h1 className="text-2xl font-bold text-white text-center mb-4">
          {status === 'complete' ? 'Plan Ready!' : 
           status === 'error' ? 'Generation Error' :
           'Generating Your Training Plan'}
        </h1>
        
        {/* Status Message */}
        <p className="text-gray-300 text-center mb-6 leading-relaxed">
          {message}
        </p>
        
        {/* Progress Bar (for generating state) */}
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
        
        {/* Generation Details */}
        {status === 'generating' && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-semibold text-cyan-400 mb-2">AI is working on:</h3>
            <ul className="text-xs text-gray-300 space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Analyzing your race goals and personal bests
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Creating optimal pace zones for training
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Scheduling around your gym and club sessions
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                Generating 12 weeks of personalized sessions
              </li>
            </ul>
          </div>
        )}
        
        {/* Success State */}
        {status === 'complete' && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
            <p className="text-green-300 text-sm">
              🎉 Your personalized training plan is ready! Redirecting to dashboard...
            </p>
          </div>
        )}
        
        {/* Error State with Retry */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm text-center">
                Plan generation encountered an issue. This sometimes happens during high usage.
              </p>
            </div>
            
            <button
              onClick={handleRetry}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Generation {retryCount > 0 && `(Attempt ${retryCount + 1})`}
            </button>
            
            {retryCount >= 2 && (
              <div className="text-center">
                <p className="text-gray-400 text-xs mb-2">Still having issues?</p>
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                >
                  Continue with default plan →
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Tips while waiting */}
        {(status === 'generating' || status === 'checking') && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              💡 Tip: This usually takes 30-60 seconds. We're creating a plan that adapts to your specific goals and schedule.
            </p>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default PlanGenerationStatus;