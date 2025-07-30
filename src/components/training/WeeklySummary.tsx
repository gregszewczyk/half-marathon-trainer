// 🚀 NEW: Weekly AI Summary Component
// Displays AI analysis when a week is completed

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, TrendingUp, CheckCircle, ChevronRight, X } from 'lucide-react';

interface WeeklySummaryProps {
  completedWeek: number;
  upcomingWeek: number;
  analysis: {
    analysis: string;
    impact: 'positive' | 'negative' | 'neutral';
    confidence: number;
    goalImpact: string;
    recommendations: string[];
    weekTransitionSummary: {
      completedWeekPerformance: string;
      upcomingWeekAdjustments: string;
      keyFocusAreas: string[];
    };
  };
  onClose?: () => void;
}

export function WeeklySummary({ 
  completedWeek, 
  upcomingWeek, 
  analysis,
  onClose 
}: WeeklySummaryProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const getPerformanceColor = (performance: string) => {
    if (performance === 'ahead_of_schedule') return 'text-green-600 bg-green-50';
    if (performance === 'behind_pace') return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getImpactIcon = (impact: string) => {
    if (impact === 'positive') return <TrendingUp className="w-5 h-5 text-green-600" />;
    return <CheckCircle className="w-5 h-5 text-blue-600" />;
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Week {completedWeek} Complete! 🎉
                </h2>
                <p className="text-gray-600">AI Analysis & Week {upcomingWeek} Preview</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Performance Summary */}
          <div className={`p-4 rounded-lg mb-6 ${getPerformanceColor(analysis.weekTransitionSummary.completedWeekPerformance)}`}>
            <div className="flex items-center gap-2 mb-2">
              {getImpactIcon(analysis.impact)}
              <span className="font-semibold capitalize">
                {analysis.weekTransitionSummary.completedWeekPerformance.replace('_', ' ')}
              </span>
              <span className="text-sm opacity-75">
                ({Math.round(analysis.confidence * 100)}% confidence)
              </span>
            </div>
            <p className="text-sm font-medium">
              Week {upcomingWeek} Adjustment: {' '}
              <span className="capitalize">
                {analysis.weekTransitionSummary.upcomingWeekAdjustments.replace('_', ' ')}
              </span>
            </p>
          </div>

          {/* AI Analysis */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              AI Coach Analysis
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800 leading-relaxed">{analysis.analysis}</p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Key Recommendations</h3>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Areas */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Week {upcomingWeek} Focus Areas</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.weekTransitionSummary.keyFocusAreas.map((area, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium capitalize"
                >
                  {area.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Continue to Week {upcomingWeek}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}