'use client'

import React from 'react'
import TrainingCalendar from '@/components/training/TrainingCalendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Clock,
  MapPin,
  Zap
} from 'lucide-react'

export default function DashboardPage() {
  // Race countdown calculation
  const raceDate = new Date('2025-10-12')
  const today = new Date()
  const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">{daysToRace}</div>
              <div className="text-gray-400 text-sm">days to race</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">29%</div>
              <div className="text-gray-400 text-sm">week complete</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">25km</div>
              <div className="text-gray-400 text-sm">this week</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-white mb-1">1:54:30</div>
              <div className="text-gray-400 text-sm">predicted time</div>
            </CardContent>
          </Card>
        </div>

        {/* Training Calendar */}
        <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl">
              Weekly Training Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrainingCalendar />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}