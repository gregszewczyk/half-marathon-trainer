'use client'

import React, { useState, useEffect } from 'react'
//import EnhancedTrainingCalendar from '@/components/training/EnhancedTrainingCalendar' // CHANGED: Import new component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTrainingStats } from '@/hooks/useTrainingData'
import AITrainingCalendar from '@/components/training/TrainingCalendar'
import { useSearchParams } from 'next/navigation'




export default function DashboardPage() {

  const searchParams = useSearchParams()
  const userId = searchParams.get('user') || 'default'
  
  console.log('Current user:', userId) // For testing
  // Use the custom hook for real training data
  const trainingStats = useTrainingStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-cyan-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
<h1 className="text-4xl md:text-5xl font-bold text-white">
  Training Dashboard
</h1>
<p className="text-xl text-gray-300">
  Manchester Half Marathon Training
</p>
        </div>

{/* Enhanced Quick Stats with better visual design */}
<div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6">
  {/* Days to Race */}
<Card className="dashboard-card bg-gray-800/60 border-gray-600 backdrop-blur-sm hover:bg-gray-800/80 transition-all duration-300">
  <CardContent className="card-content p-2 md:p-6 text-center">
      <div className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 bg-cyan-500/20 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 md:w-6 md:h-6 bg-cyan-400 rounded-full"></div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-cyan-400 mb-1 md:mb-2">{trainingStats.daysToRace}</div>
      <div className="text-gray-300 text-xs md:text-sm font-medium">days to race</div>
      <div className="text-xs text-gray-500 mt-1 hidden md:block">Manchester Half Marathon</div>
    </CardContent>
  </Card>

  {/* Week Completion */}
<Card className="dashboard-card bg-gray-800/60 border-gray-600 backdrop-blur-sm hover:bg-gray-800/80 transition-all duration-300">
  <CardContent className="card-content p-2 md:p-6 text-center">
      <div className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 bg-green-500/20 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 md:w-6 md:h-6 bg-green-400 rounded-full"></div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-green-400 mb-1 md:mb-2">{trainingStats.weekCompletion}%</div>
      <div className="text-gray-300 text-xs md:text-sm font-medium">week complete</div>
      <div className="text-xs text-gray-500 mt-1 hidden md:block">Running sessions completed</div>
    </CardContent>
  </Card>

  {/* Weekly Distance */}
<Card className="dashboard-card bg-gray-800/60 border-gray-600 backdrop-blur-sm hover:bg-gray-800/80 transition-all duration-300">
  <CardContent className="card-content p-2 md:p-6 text-center">
      <div className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 bg-blue-500/20 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 md:w-6 md:h-6 bg-blue-400 rounded-full"></div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-1 md:mb-2">{trainingStats.weekDistance}km</div>
      <div className="text-gray-300 text-xs md:text-sm font-medium">this week</div>
      <div className="text-xs text-gray-500 mt-1 hidden md:block">Total planned distance</div>
    </CardContent>
  </Card>

  {/* AI Predicted Time */}
<Card className="dashboard-card bg-gray-800/60 border-gray-600 backdrop-blur-sm hover:bg-gray-800/80 transition-all duration-300">
  <CardContent className="card-content p-2 md:p-6 text-center">
      <div className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 bg-purple-500/20 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 md:w-6 md:h-6 bg-purple-400 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-black">AI</span>
        </div>
      </div>
      <div className="text-xl md:text-2xl font-bold text-purple-400 mb-1 md:mb-2">{trainingStats.predictedTime}</div>
      <div className="text-gray-300 text-xs md:text-sm font-medium">AI predicted</div>
      <div className="text-xs text-gray-500 mt-1 hidden md:block">Based on current training</div>
    </CardContent>
  </Card>
</div>

        {/* Training Calendar */}
        <Card className="bg-gray-800/60 border-gray-600 backdrop-blur-sm">
          <CardHeader className="border-b border-gray-700">
            <CardTitle className="text-white text-2xl flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-cyan-400 rounded"></div>
              </div>
              AI Training Schedule with Drag & Drop
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0"> {/* CHANGED: Remove padding so calendar has full control */}
            <AITrainingCalendar /> {/* CHANGED: Use new component */}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}