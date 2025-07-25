// 🎨 FIXED: src/app/page.tsx - Landing page with proper authentication detection
'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { 
  PlayIcon, 
  ChartBarIcon, 
  CpuChipIcon, 
  DevicePhoneMobileIcon,
  ClockIcon,
  TrophyIcon 
} from '@heroicons/react/24/outline'

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication state
  useEffect(() => {
    const checkAuth = () => {
      const storedUserId = localStorage.getItem('userId')
      setIsAuthenticated(!!storedUserId)
    }
    
    checkAuth()
    
    // Listen for storage changes (in case user logs in/out in another tab)
    window.addEventListener('storage', checkAuth)
    
    return () => window.removeEventListener('storage', checkAuth)
  }, [])

  const raceDate = new Date('2025-10-12')
  const today = new Date()
  const daysUntilRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          <span className="gradient-text">AI-Powered</span>
          <br />
          Half Marathon Training
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Intelligent training plans that adapt to your performance. 
          Get ready for Manchester Half Marathon with personalized coaching.
        </p>
        
        {/* Race Countdown */}
        <div className="mb-8">
          <Card className="inline-block p-6">
            <div className="flex items-center space-x-4">
              <TrophyIcon className="h-8 w-8 text-primary-500" />
              <div>
                <div className="text-2xl font-bold text-primary-400">
                  {daysUntilRace} days
                </div>
                <div className="text-sm text-gray-400">until Manchester Half Marathon</div>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA Buttons - Fixed to check authentication instead of date */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Continue Training
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  View Calendar
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button className="bg-[#00d4ff] text-black hover:bg-[#00d4ff]/80 text-lg px-8 py-3">
                  Start Training
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Create Account
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <CpuChipIcon className="h-6 w-6 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">AI Adaptations</h3>
          <p className="text-gray-400 mb-4">
            Training plans that automatically adjust based on your feedback and performance data.
          </p>
          <Badge variant="primary">Perplexity AI</Badge>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <DevicePhoneMobileIcon className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Garmin Integration</h3>
          <p className="text-gray-400 mb-4">
            Seamless sync with your Garmin watch for automatic activity tracking and analysis.
          </p>
          <Badge variant="success">Auto Sync</Badge>
        </Card>

        <Card className="p-6 text-center">
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="h-6 w-6 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
          <p className="text-gray-400 mb-4">
            Detailed insights into your training progress with predictive race time modeling.
          </p>
          <Badge variant="info">Real-time</Badge>
        </Card>
      </div>

      {/* Training Plan Overview */}
      <Card className="p-8 mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">12-Week Training Plan</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-400 mb-2">Weeks 1-4</div>
            <div className="text-lg font-semibold mb-2">Base Phase</div>
            <div className="text-sm text-gray-400">
              Build aerobic foundation with easy runs and tempo work
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400 mb-2">Weeks 5-8</div>
            <div className="text-lg font-semibold mb-2">Build Phase</div>
            <div className="text-sm text-gray-400">
              Increase volume and introduce interval training
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400 mb-2">Weeks 9-10</div>
            <div className="text-lg font-semibold mb-2">Peak Phase</div>
            <div className="text-sm text-gray-400">
              Maximum volume with race-specific workouts
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">Weeks 11-12</div>
            <div className="text-lg font-semibold mb-2">Taper Phase</div>
            <div className="text-sm text-gray-400">
              Reduce volume while maintaining intensity
            </div>
          </div>
        </div>
      </Card>

      {/* Training Schedule */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Weekly Schedule</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-primary-400">Running (4 days/week)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Monday 5PM</span>
                <Badge variant="success">Easy Run + MadeRunning</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Wednesday 5AM</span>
                <Badge variant="warning">Tempo/Intervals + MadeRunning</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Thursday 6PM</span>
                <Badge variant="success">Easy Run</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Saturday 9AM</span>
                <Badge variant="info">Long Run + MadeRunning</Badge>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-cyan-400">Gym (6 days/week)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Mon/Thu 4:30AM</span>
                <Badge variant="primary">Push Day</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Tue/Fri 4:30AM</span>
                <Badge variant="info">Pull Day</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Wed/Sat 6AM</span>
                <Badge variant="warning">Legs Day</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-gray-800/50">
                <span>Sunday</span>
                <Badge variant="secondary">Rest Day (15K steps)</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}