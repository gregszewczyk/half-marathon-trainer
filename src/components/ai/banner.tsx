import React from 'react';
import { TrainingAdaptation } from '@/lib/ai/perplexity-service';
import { Button } from '@/components/ui/Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/cn';

interface AIBannerProps {
  adaptation: TrainingAdaptation;
  onClose: () => void;
  onAccept: () => void;
}

export function AIBanner({ adaptation, onClose, onAccept }: AIBannerProps) {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high': 
        return {
          color: 'border-red-500 bg-red-900/20',
          icon: '🚨',
          title: 'High Priority Training Adaptation'
        };
      case 'medium': 
        return {
          color: 'border-orange-500 bg-orange-900/20',
          icon: '⚠️',
          title: 'Training Adaptation Recommended'
        };
      default: 
        return {
          color: 'border-primary-500 bg-primary-900/20',
          icon: '🤖',
          title: 'AI Training Suggestion'
        };
    }
  };

  const config = getSeverityConfig(adaptation.severity);

  return (
    <div className={cn(
      'ai-banner border-2 rounded-lg p-4 mb-6 animate-fade-in-up',
      config.color
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <h3 className="text-lg font-semibold text-white">
            {config.title}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1"
          aria-label="Close AI banner"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Analysis */}
      <div className="space-y-4">
        <div className="glass-dark rounded p-3">
          <p className="text-sm text-gray-300">
            <strong className="text-white">Analysis:</strong> {adaptation.reasoning}
          </p>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="font-medium text-white mb-2 flex items-center gap-2">
            💡 Recommended Actions:
          </h4>
          <ul className="space-y-1">
            {adaptation.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-primary-400 mt-1 text-xs">●</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Adaptations Grid */}
        {Object.keys(adaptation.adaptations).length > 0 && (
          <div>
            <h4 className="font-medium text-white mb-2 flex items-center gap-2">
              ⚙️ Training Adjustments:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {adaptation.adaptations.intensityChange && (
                <div className="bg-gray-800/30 rounded p-2 text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Intensity</div>
                  <div className="text-sm font-medium text-white capitalize mt-1">
                    {adaptation.adaptations.intensityChange === 'increase' && '📈'}
                    {adaptation.adaptations.intensityChange === 'decrease' && '📉'}
                    {adaptation.adaptations.intensityChange === 'maintain' && '➡️'}
                    {' '}
                    {adaptation.adaptations.intensityChange}
                  </div>
                </div>
              )}
              
              {adaptation.adaptations.volumeChange && (
                <div className="bg-gray-800/30 rounded p-2 text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Volume</div>
                  <div className="text-sm font-medium text-white capitalize mt-1">
                    {adaptation.adaptations.volumeChange === 'increase' && '📈'}
                    {adaptation.adaptations.volumeChange === 'decrease' && '📉'}
                    {adaptation.adaptations.volumeChange === 'maintain' && '➡️'}
                    {' '}
                    {adaptation.adaptations.volumeChange}
                  </div>
                </div>
              )}
              
              {adaptation.adaptations.recoveryDays && (
                <div className="bg-gray-800/30 rounded p-2 text-center">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Recovery</div>
                  <div className="text-sm font-medium text-white mt-1">
                    😴 {adaptation.adaptations.recoveryDays} day{adaptation.adaptations.recoveryDays > 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 border-t border-gray-600">
          <Button
            onClick={onAccept}
            size="sm"
            className="flex-1 bg-primary-600 hover:bg-primary-700"
          >
            ✅ Apply Adaptations
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="px-4"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}