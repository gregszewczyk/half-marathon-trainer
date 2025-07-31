// 🚀 CLEAN: src/app/onboarding/page.tsx
// Enhanced onboarding with flexible target time selection
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  TrophyIcon,
  ClockIcon,
  UserGroupIcon,
  CpuChipIcon,
  DocumentArrowUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

// Clean TypeScript interfaces
interface OnboardingFormData {
  // Plan Type
  planType: 'AI_GENERATED' | 'CUSTOM_IMPORT' // 🚀 NEW: Let users choose plan type
  
  // Race Goals
  raceType: 'FIVE_K' | 'TEN_K' | 'HALF_MARATHON' | 'FULL_MARATHON' | 'CUSTOM'
  customDistance: string
  targetTime: string
  raceDate: string
  
  // Experience & PBs
  fitnessLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' // 🚀 NEW
  pb5k: string
  pb10k: string
  pbHalfMarathon: string
  pbMarathon: string
  pbCustom: string
  pbCustomDistance: string
  
  // Training Preferences
  trainingDaysPerWeek: number
  timePreferences: string[]
  workoutTypes: string[]
  
  // Other Activities - Enhanced
  otherWorkouts: string[]
  
  // Gym Details
  gymDaysPerWeek: string
  gymType: string
  gymSchedule: string
  
  // Cycling Details
  cyclingDaysPerWeek: string
  cyclingType: string
  cyclingSchedule: string
  
  // Swimming Details
  swimmingDaysPerWeek: string
  swimmingType: string
  swimmingSchedule: string
  
  // Yoga Details
  yogaDaysPerWeek: string
  yogaType: string
  yogaSchedule: string
  
  // CrossFit Details
  crossfitDaysPerWeek: string
  crossfitType: string
  crossfitSchedule: string
  
  // Hiking Details
  hikingDaysPerWeek: string
  hikingType: string
  hikingSchedule: string
  
  // Running Club
  runningClub: string
  clubSchedule: string[]
  keepClubRuns: boolean
  
  // Personal & Location
  age: string
  gender: string
  location: string
  
  // Advanced Preferences
  injuryHistory: string[]
  restDayPrefs: string[]
  maxWeeklyMiles: string
}

const INITIAL_FORM_DATA: OnboardingFormData = {
  planType: 'AI_GENERATED', // 🚀 NEW: Default to AI-generated plan
  raceType: 'HALF_MARATHON',
  customDistance: '',
  targetTime: 'FINISH',
  raceDate: '',
  fitnessLevel: 'INTERMEDIATE', // 🚀 NEW: Default, will be overridden by smart inference
  pb5k: '',
  pb10k: '',
  pbHalfMarathon: '',
  pbMarathon: '',
  pbCustom: '',
  pbCustomDistance: '',
  trainingDaysPerWeek: 4,
  timePreferences: [],
  workoutTypes: ['outdoor'],
  otherWorkouts: [],
  
  // Enhanced activity details
  gymDaysPerWeek: '',
  gymType: '',
  gymSchedule: '',
  cyclingDaysPerWeek: '',
  cyclingType: '',
  cyclingSchedule: '',
  swimmingDaysPerWeek: '',
  swimmingType: '',
  swimmingSchedule: '',
  yogaDaysPerWeek: '',
  yogaType: '',
  yogaSchedule: '',
  crossfitDaysPerWeek: '',
  crossfitType: '',
  crossfitSchedule: '',
  hikingDaysPerWeek: '',
  hikingType: '',
  hikingSchedule: '',
  
  runningClub: '',
  clubSchedule: [],
  keepClubRuns: true,
  age: '',
  gender: '',
  location: '',
  injuryHistory: [],
  restDayPrefs: ['sunday'],
  maxWeeklyMiles: ''
}

const RACE_TYPES = [
  { value: 'FIVE_K' as const, label: '5K', description: 'Perfect for beginners or speed work' },
  { value: 'TEN_K' as const, label: '10K', description: 'Great balance of speed and endurance' },
  { value: 'HALF_MARATHON' as const, label: 'Half Marathon', description: 'Popular distance, manageable training' },
  { value: 'FULL_MARATHON' as const, label: 'Marathon', description: 'Ultimate endurance challenge' },
  { value: 'CUSTOM' as const, label: 'Custom Distance', description: 'Your own race distance' }
]

// Enhanced target time options
const TIME_OPTIONS = {
  FIVE_K: [
    { value: '0:18:00', label: 'Sub-18 minutes (3:36/km)', level: 'Elite level' },
    { value: '0:20:00', label: 'Sub-20 minutes (4:00/km)', level: 'Competitive' },
    { value: '0:22:00', label: 'Sub-22 minutes (4:24/km)', level: 'Advanced' },
    { value: '0:25:00', label: 'Sub-25 minutes (5:00/km)', level: 'Good club runner' },
    { value: '0:30:00', label: 'Sub-30 minutes (6:00/km)', level: 'Great recreational time' }
  ],
  TEN_K: [
    { value: '0:35:00', label: 'Sub-35 minutes (3:30/km)', level: 'Elite level' },
    { value: '0:40:00', label: 'Sub-40 minutes (4:00/km)', level: 'Competitive' },
    { value: '0:45:00', label: 'Sub-45 minutes (4:30/km)', level: 'Advanced' },
    { value: '0:50:00', label: 'Sub-50 minutes (5:00/km)', level: 'Good club runner' },
    { value: '1:00:00', label: 'Sub-60 minutes (6:00/km)', level: 'Great recreational time' }
  ],
  HALF_MARATHON: [
    { value: '1:15:00', label: 'Sub-1:15 (3:33/km)', level: 'Elite level' },
    { value: '1:30:00', label: 'Sub-1:30 (4:16/km)', level: 'Competitive' },
    { value: '1:45:00', label: 'Sub-1:45 (4:59/km)', level: 'Advanced' },
    { value: '2:00:00', label: 'Sub-2:00 (5:41/km)', level: 'Good club runner' },
    { value: '2:15:00', label: 'Sub-2:15 (6:24/km)', level: 'Great recreational time' }
  ],
  FULL_MARATHON: [
    { value: '2:30:00', label: 'Sub-2:30 (3:33/km)', level: 'Elite level' },
    { value: '3:00:00', label: 'Sub-3:00 (4:16/km)', level: 'Competitive' },
    { value: '3:30:00', label: 'Sub-3:30 (4:59/km)', level: 'Advanced' },
    { value: '4:00:00', label: 'Sub-4:00 (5:41/km)', level: 'Good club runner' },
    { value: '4:30:00', label: 'Sub-4:30 (6:24/km)', level: 'Great recreational time' }
  ]
}

const TIME_PREFERENCES = [
  { value: 'early_morning', label: 'Early Morning (5-7 AM)', icon: '🌅' },
  { value: 'morning', label: 'Morning (7-10 AM)', icon: '☀️' },
  { value: 'lunch', label: 'Lunch Time (11 AM-2 PM)', icon: '🕐' },
  { value: 'evening', label: 'Evening (5-8 PM)', icon: '🌆' },
  { value: 'night', label: 'Night (8-10 PM)', icon: '🌙' },
  { value: 'flexible', label: 'Flexible', icon: '⏰' }
]

const WORKOUT_TYPES = [
  { value: 'outdoor', label: 'Outdoor Running', icon: '🌳' },
  { value: 'treadmill', label: 'Treadmill', icon: '🏃‍♂️' },
  { value: 'track', label: 'Track', icon: '🏟️' },
  { value: 'trail', label: 'Trail Running', icon: '⛰️' }
]

const OTHER_WORKOUTS = [
  { value: 'gym', label: 'Gym/Strength Training', icon: '💪' },
  { value: 'cycling', label: 'Cycling', icon: '🚴‍♂️' },
  { value: 'swimming', label: 'Swimming', icon: '🏊‍♂️' },
  { value: 'yoga', label: 'Yoga', icon: '🧘‍♀️' },
  { value: 'crossfit', label: 'CrossFit', icon: '🏋️‍♂️' },
  { value: 'hiking', label: 'Hiking', icon: '🥾' }
]

const CLUB_SCHEDULE_OPTIONS = [
  'Monday 6:00 AM', 'Monday 7:00 AM', 'Monday 5:00 PM', 'Monday 6:00 PM', 'Monday 7:00 PM',
  'Tuesday 6:00 AM', 'Tuesday 7:00 AM', 'Tuesday 5:00 PM', 'Tuesday 6:00 PM', 'Tuesday 7:00 PM',
  'Wednesday 6:00 AM', 'Wednesday 7:00 AM', 'Wednesday 5:00 PM', 'Wednesday 6:00 PM', 'Wednesday 7:00 PM',
  'Thursday 6:00 AM', 'Thursday 7:00 AM', 'Thursday 5:00 PM', 'Thursday 6:00 PM', 'Thursday 7:00 PM',
  'Friday 6:00 AM', 'Friday 7:00 AM', 'Friday 5:00 PM', 'Friday 6:00 PM', 'Friday 7:00 PM',
  'Saturday 7:00 AM', 'Saturday 8:00 AM', 'Saturday 9:00 AM', 'Saturday 5:00 PM', 'Saturday 6:00 PM',
  'Sunday 7:00 AM', 'Sunday 8:00 AM', 'Sunday 9:00 AM', 'Sunday 5:00 PM', 'Sunday 6:00 PM'
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_FORM_DATA)
  const [showCustomSchedule, setShowCustomSchedule] = useState(false)
  const [customDay, setCustomDay] = useState('Monday')
  const [customTime, setCustomTime] = useState('7:00 AM')

  // Check authentication
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (!storedUserId) {
      router.push('/auth/signup')
      return
    }
    setUserId(storedUserId)
  }, [router])

  const updateFormData = (updates: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const addCustomSchedule = () => {
    const customSchedule = `${customDay} ${customTime}`
    const current = formData.clubSchedule
    if (!current.includes(customSchedule)) {
      updateFormData({ clubSchedule: [...current, customSchedule] })
    }
    setShowCustomSchedule(false)
    setCustomDay('Monday')
    setCustomTime('7:00 AM')
  }

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      // Convert form data to API format
      const apiData = {
        userId,
        raceType: formData.raceType,
        customDistance: formData.customDistance || undefined,
        targetTime: formData.targetTime,
        raceDate: formData.raceDate || undefined,
        
        // Convert string PBs to proper format
        pb5k: formData.pb5k || undefined,
        pb10k: formData.pb10k || undefined,
        pbHalfMarathon: formData.pbHalfMarathon || undefined,
        pbMarathon: formData.pbMarathon || undefined,
        pbCustom: formData.pbCustom || undefined,
        pbCustomDistance: formData.pbCustomDistance || undefined,
        
        trainingDaysPerWeek: formData.trainingDaysPerWeek,
        timePreferences: formData.timePreferences,
        workoutTypes: formData.workoutTypes,
        otherWorkouts: formData.otherWorkouts,
        gymDaysPerWeek: formData.gymDaysPerWeek ? parseInt(formData.gymDaysPerWeek, 10) : undefined,
        gymType: formData.gymType || undefined,
        runningClub: formData.runningClub || undefined,
        clubSchedule: formData.clubSchedule,
        keepClubRuns: formData.keepClubRuns,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        gender: formData.gender || undefined,
        location: formData.location || undefined,
        injuryHistory: formData.injuryHistory,
        restDayPrefs: formData.restDayPrefs,
        maxWeeklyMiles: formData.maxWeeklyMiles ? parseFloat(formData.maxWeeklyMiles) : undefined
      }

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      })

      if (response.ok) {
        router.push('/dashboard?onboarding=complete')
      } else {
        const error = await response.json()
        console.error('Onboarding error:', error)
        alert('Error saving your preferences. Please try again.')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Onboarding submission error:', errorMessage)
      alert('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to check if target time is custom
  const isCustomTime = () => {
    const presetTimes = ['FINISH', ...Object.values(TIME_OPTIONS).flat().map(t => t.value)]
    return !presetTimes.includes(formData.targetTime)
  }

  // 🚀 NEW: Step 1: Plan Type Selection
  const renderPlanTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-8 w-8 text-primary-400" />
            <DocumentArrowUpIcon className="h-8 w-8 text-primary-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Choose Your Training Approach</h2>
        <p className="text-gray-400">How would you like to create your training plan?</p>
      </div>

      <div className="grid gap-4">
        {/* AI Generated Plan */}
        <Card 
          className={`p-6 cursor-pointer transition-all ${
            formData.planType === 'AI_GENERATED' 
              ? 'ring-2 ring-primary-400 bg-primary-400/10' 
              : 'hover:bg-gray-800/50'
          }`}
          onClick={() => updateFormData({ planType: 'AI_GENERATED' })}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <SparklesIcon className="h-8 w-8 text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg mb-2">🤖 AI-Generated Plan</h3>
                  <p className="text-gray-400 mb-3">
                    Let our AI create a personalized training plan based on your goals, experience, and preferences.
                  </p>
                  <div className="text-sm text-primary-300">
                    <div className="mb-1">✨ Automatically adapts to your feedback</div>
                    <div className="mb-1">📊 Integrates with your other activities</div>
                    <div className="mb-1">🎯 Optimized for your target time</div>
                    <div>🌤️ Weather-aware training adjustments</div>
                  </div>
                </div>
                {formData.planType === 'AI_GENERATED' && (
                  <Badge className="bg-primary-400 text-primary-900">Selected</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Custom Import Plan */}
        <Card 
          className={`p-6 cursor-pointer transition-all ${
            formData.planType === 'CUSTOM_IMPORT' 
              ? 'ring-2 ring-primary-400 bg-primary-400/10' 
              : 'hover:bg-gray-800/50'
          }`}
          onClick={() => updateFormData({ planType: 'CUSTOM_IMPORT' })}
        >
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <DocumentArrowUpIcon className="h-8 w-8 text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg mb-2">📋 Import Your Own Plan</h3>
                  <p className="text-gray-400 mb-3">
                    Already have a training plan? Import it and still benefit from AI feedback and analysis.
                  </p>
                  <div className="text-sm text-primary-300">
                    <div className="mb-1">📈 AI feedback on your sessions</div>
                    <div className="mb-1">🔍 Performance analysis & insights</div>
                    <div className="mb-1">⚡ Smart modification suggestions</div>
                    <div>📱 All tracking & social features</div>
                  </div>
                </div>
                {formData.planType === 'CUSTOM_IMPORT' && (
                  <Badge className="bg-primary-400 text-primary-900">Selected</Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {formData.planType === 'CUSTOM_IMPORT' && (
        <Card className="p-4 bg-amber-900/20 border-amber-700">
          <div className="flex items-start space-x-3">
            <div className="text-amber-400 text-lg">💡</div>
            <div>
              <h4 className="font-medium text-amber-200 mb-1">Coming up next:</h4>
              <p className="text-sm text-amber-300">
                After setting your race goals, you'll be able to upload your training plan as a CSV file or enter sessions manually.
                Our AI will still provide feedback and suggestions while respecting your existing structure.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )

  // Step 2: Race Goals with Enhanced Target Time Selection (formerly Step 1)
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <TrophyIcon className="h-12 w-12 text-primary-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">What's Your Race Goal?</h2>
        <p className="text-gray-400">Tell us about your target race so we can create the perfect training plan</p>
      </div>

      {/* Race Type Selection */}
      <div className="grid gap-4">
        {RACE_TYPES.map((race) => (
          <Card 
            key={race.value}
            className={`p-4 cursor-pointer transition-all ${
              formData.raceType === race.value 
                ? 'ring-2 ring-primary-400 bg-primary-400/10' 
                : 'hover:bg-gray-800/50'
            }`}
            onClick={() => updateFormData({ raceType: race.value, targetTime: 'FINISH' })}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{race.label}</div>
                <div className="text-sm text-gray-400">{race.description}</div>
              </div>
              {formData.raceType === race.value && (
                <Badge className="bg-primary-400 text-primary-900">Selected</Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Custom Distance Input */}
      {formData.raceType === 'CUSTOM' && (
        <div>
          <label className="block text-sm font-medium mb-2">Custom Distance</label>
          <input
            type="text"
            placeholder="e.g., 15K, 8 miles"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.customDistance}
            onChange={(e) => updateFormData({ customDistance: e.target.value })}
          />
        </div>
      )}

      {/* Simplified Target Time Selection - 3 Options */}
      <div>
        <label className="block text-sm font-medium mb-4">Target Time</label>
        
        {/* Option 1: Just want to finish */}
        <div 
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all mb-3 ${
            formData.targetTime === 'FINISH' 
              ? 'border-primary-400 bg-primary-400/10' 
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onClick={() => updateFormData({ targetTime: 'FINISH' })}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-lg">Just want to finish! 🎯</span>
              <p className="text-sm text-gray-400">Complete the distance, time doesn't matter</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 ${
              formData.targetTime === 'FINISH' 
                ? 'border-primary-400 bg-primary-400' 
                : 'border-gray-400'
            }`}>
              {formData.targetTime === 'FINISH' && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
          </div>
        </div>

        {/* Option 2: Popular goal times dropdown */}
        <div 
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all mb-3 ${
            formData.targetTime !== 'FINISH' && !isCustomTime() 
              ? 'border-primary-400 bg-primary-400/10' 
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onClick={() => {
            if (formData.targetTime === 'FINISH' || isCustomTime()) {
              // Set to first preset option for the race type
              const firstOption = formData.raceType === 'CUSTOM'
                ? '2:00:00'
                : TIME_OPTIONS[formData.raceType as keyof typeof TIME_OPTIONS]?.[0]?.value || '2:00:00'
              updateFormData({ targetTime: firstOption })
            }
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-semibold">Popular goal times</span>
              <p className="text-sm text-gray-400">Choose from common race targets</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 ${
              formData.targetTime !== 'FINISH' && !isCustomTime() 
                ? 'border-primary-400 bg-primary-400' 
                : 'border-gray-400'
            }`}>
              {formData.targetTime !== 'FINISH' && !isCustomTime() && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
          </div>
          
          {/* Dropdown for preset times - only show when this option is selected */}
          {formData.targetTime !== 'FINISH' && !isCustomTime() && formData.raceType !== 'CUSTOM' && (
            <div onClick={(e) => e.stopPropagation()}>
              <select
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                value={formData.targetTime}
                onChange={(e) => updateFormData({ targetTime: e.target.value })}
              >
                {TIME_OPTIONS[formData.raceType]?.map((timeOption) => (
                  <option key={timeOption.value} value={timeOption.value}>
                    {timeOption.label} - {timeOption.level}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Option 3: Custom target time */}
        <div 
          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
            isCustomTime() 
              ? 'border-primary-400 bg-primary-400/10' 
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onClick={() => !isCustomTime() && updateFormData({ targetTime: '' })}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-semibold">Custom target time</span>
              <p className="text-sm text-gray-400">Enter your specific goal time</p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 ${
              isCustomTime() 
                ? 'border-primary-400 bg-primary-400' 
                : 'border-gray-400'
            }`}>
              {isCustomTime() && (
                <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
              )}
            </div>
          </div>
          
          {/* Custom input field - only show when this option is selected */}
          {isCustomTime() && (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="e.g., 1:37:42, 23:15, 3:05:30"
                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                value={formData.targetTime}
                onChange={(e) => updateFormData({ targetTime: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: H:MM:SS or MM:SS
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Race Date */}
      <div>
        <label className="block text-sm font-medium mb-2">Race Date (optional)</label>
        <input
          type="date"
          className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
          value={formData.raceDate}
          onChange={(e) => updateFormData({ raceDate: e.target.value })}
        />
      </div>
    </div>
  )

  // Step 2: Experience & Personal Bests
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <ClockIcon className="h-12 w-12 text-primary-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your Running Experience</h2>
        <p className="text-gray-400">Recent race times help us create a much smarter training plan than generic fitness levels</p>
      </div>

      {/* 🚀 NEW: Fitness Level Question */}
      <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Current Running Experience</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { value: 'BEGINNER', label: 'Beginner', desc: 'New to running or just starting' },
            { value: 'INTERMEDIATE', label: 'Intermediate', desc: 'Regular runner, some race experience' },
            { value: 'ADVANCED', label: 'Advanced', desc: 'Experienced racer, consistent training' },
            { value: 'ELITE', label: 'Elite', desc: 'Competitive runner, high performance' }
          ].map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => updateFormData({ fitnessLevel: level.value as any })}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.fitnessLevel === level.value
                  ? 'border-primary-400 bg-primary-400/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="font-medium">{level.label}</div>
              <div className="text-sm text-gray-400 mt-1">{level.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          💡 Don't worry if you're unsure - we'll automatically adjust based on your race times below
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Recent 5K Time</label>
          <input
            type="text"
            placeholder="e.g., 23:45 (leave blank if never raced)"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.pb5k}
            onChange={(e) => updateFormData({ pb5k: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Recent 10K Time</label>
          <input
            type="text"
            placeholder="e.g., 48:30"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.pb10k}
            onChange={(e) => updateFormData({ pb10k: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Recent Half Marathon Time</label>
          <input
            type="text"
            placeholder="e.g., 1:45:20"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.pbHalfMarathon}
            onChange={(e) => updateFormData({ pbHalfMarathon: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Recent Marathon Time</label>
          <input
            type="text"
            placeholder="e.g., 3:30:15"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.pbMarathon}
            onChange={(e) => updateFormData({ pbMarathon: e.target.value })}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Age (optional)</label>
          <input
            type="text"
            placeholder="25"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.age}
            onChange={(e) => updateFormData({ age: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Gender (optional)</label>
          <select
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.gender}
            onChange={(e) => updateFormData({ gender: e.target.value })}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Location (optional)</label>
          <input
            type="text"
            placeholder="e.g., Manchester, UK"
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
            value={formData.location}
            onChange={(e) => updateFormData({ location: e.target.value })}
          />
        </div>
      </div>
    </div>
  )

  // Step 3: Training Preferences
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CpuChipIcon className="h-12 w-12 text-primary-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Training Preferences</h2>
        <p className="text-gray-400">When and how do you prefer to train?</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Training Days Per Week</label>
        <div className="grid grid-cols-4 gap-2">
          {[3, 4, 5, 6].map((days) => (
            <button
              key={days}
              type="button"
              className={`p-3 rounded border transition-all ${
                formData.trainingDaysPerWeek === days
                  ? 'bg-primary-400 text-primary-900 border-primary-400'
                  : 'bg-gray-800 text-white border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => updateFormData({ trainingDaysPerWeek: days })}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Preferred Training Times</label>
        <div className="grid md:grid-cols-2 gap-3">
          {TIME_PREFERENCES.map((time) => (
            <Card
              key={time.value}
              className={`p-3 cursor-pointer transition-all ${
                formData.timePreferences.includes(time.value)
                  ? 'ring-2 ring-primary-400 bg-primary-400/10'
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => {
                const current = formData.timePreferences
                const updated = current.includes(time.value)
                  ? current.filter(t => t !== time.value)
                  : [...current, time.value]
                updateFormData({ timePreferences: updated })
              }}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{time.icon}</span>
                <span className="font-medium">{time.label}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Workout Types</label>
        <div className="grid md:grid-cols-2 gap-3">
          {WORKOUT_TYPES.map((type) => (
            <Card
              key={type.value}
              className={`p-3 cursor-pointer transition-all ${
                formData.workoutTypes.includes(type.value)
                  ? 'ring-2 ring-primary-400 bg-primary-400/10'
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => {
                const current = formData.workoutTypes
                const updated = current.includes(type.value)
                  ? current.filter(t => t !== type.value)
                  : [...current, type.value]
                updateFormData({ workoutTypes: updated })
              }}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{type.icon}</span>
                <span className="font-medium">{type.label}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )

  // Step 4: Other Activities with Enhanced Scheduling
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">💪</div>
        <h2 className="text-2xl font-bold mb-2">Other Training Activities</h2>
        <p className="text-gray-400">Tell us about your other workouts so we can integrate them into your training plan</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">What other activities do you do?</label>
        <div className="grid md:grid-cols-3 gap-3">
          {OTHER_WORKOUTS.map((workout) => (
            <Card
              key={workout.value}
              className={`p-3 cursor-pointer transition-all ${
                formData.otherWorkouts.includes(workout.value)
                  ? 'ring-2 ring-primary-400 bg-primary-400/10'
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => {
                const current = formData.otherWorkouts
                const updated = current.includes(workout.value)
                  ? current.filter(w => w !== workout.value)
                  : [...current, workout.value]
                updateFormData({ otherWorkouts: updated })
              }}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{workout.icon}</div>
                <div className="font-medium text-sm">{workout.label}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Enhanced scheduling for each selected activity */}
      {formData.otherWorkouts.length > 0 && (
        <div className="space-y-6">
          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-lg font-semibold mb-4">Activity Schedule Details</h3>
            <p className="text-sm text-gray-400 mb-4">
              Help us understand when you do these activities so we can plan your running sessions around them
            </p>
          </div>

          {/* Gym Details */}
          {formData.otherWorkouts.includes('gym') && (
            <Card className="p-4 bg-gray-800/50">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">💪</span>
                <h4 className="font-semibold">Gym/Strength Training</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Days per week</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.gymDaysPerWeek}
                    onChange={(e) => updateFormData({ gymDaysPerWeek: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="4">4 days</option>
                    <option value="5">5 days</option>
                    <option value="6">6 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.gymType}
                    onChange={(e) => updateFormData({ gymType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="strength">Strength Training</option>
                    <option value="crossfit">CrossFit</option>
                    <option value="functional">Functional Fitness</option>
                    <option value="bodybuilding">Bodybuilding</option>
                    <option value="powerlifting">Powerlifting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred days</label>
                  <input
                    type="text"
                    placeholder="e.g., Mon, Wed, Fri"
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.gymSchedule || ''}
                    onChange={(e) => updateFormData({ gymSchedule: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Cycling Details */}
          {formData.otherWorkouts.includes('cycling') && (
            <Card className="p-4 bg-gray-800/50">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🚴‍♂️</span>
                <h4 className="font-semibold">Cycling</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Days per week</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.cyclingDaysPerWeek || ''}
                    onChange={(e) => updateFormData({ cyclingDaysPerWeek: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="4">4 days</option>
                    <option value="5">5 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.cyclingType || ''}
                    onChange={(e) => updateFormData({ cyclingType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="road">Road Cycling</option>
                    <option value="mountain">Mountain Biking</option>
                    <option value="indoor">Indoor/Spin</option>
                    <option value="commuting">Commuting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred days</label>
                  <input
                    type="text"
                    placeholder="e.g., Sat, Sun"
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.cyclingSchedule || ''}
                    onChange={(e) => updateFormData({ cyclingSchedule: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Swimming Details */}
          {formData.otherWorkouts.includes('swimming') && (
            <Card className="p-4 bg-gray-800/50">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🏊‍♂️</span>
                <h4 className="font-semibold">Swimming</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Days per week</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.swimmingDaysPerWeek || ''}
                    onChange={(e) => updateFormData({ swimmingDaysPerWeek: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="4">4 days</option>
                    <option value="5">5 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.swimmingType || ''}
                    onChange={(e) => updateFormData({ swimmingType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="lap">Lap Swimming</option>
                    <option value="open_water">Open Water</option>
                    <option value="water_aerobics">Water Aerobics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred days</label>
                  <input
                    type="text"
                    placeholder="e.g., Tue, Thu"
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.swimmingSchedule || ''}
                    onChange={(e) => updateFormData({ swimmingSchedule: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Yoga Details */}
          {formData.otherWorkouts.includes('yoga') && (
            <Card className="p-4 bg-gray-800/50">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🧘‍♀️</span>
                <h4 className="font-semibold">Yoga</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Days per week</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.yogaDaysPerWeek || ''}
                    onChange={(e) => updateFormData({ yogaDaysPerWeek: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="4">4 days</option>
                    <option value="5">5 days</option>
                    <option value="6">6 days</option>
                    <option value="7">7 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.yogaType || ''}
                    onChange={(e) => updateFormData({ yogaType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="hatha">Hatha Yoga</option>
                    <option value="vinyasa">Vinyasa Flow</option>
                    <option value="yin">Yin Yoga</option>
                    <option value="hot">Hot Yoga</option>
                    <option value="restorative">Restorative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred days</label>
                  <input
                    type="text"
                    placeholder="e.g., Mon, Wed, Fri"
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.yogaSchedule || ''}
                    onChange={(e) => updateFormData({ yogaSchedule: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* CrossFit Details */}
          {formData.otherWorkouts.includes('crossfit') && (
            <Card className="p-4 bg-gray-800/50">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🏋️‍♂️</span>
                <h4 className="font-semibold">CrossFit</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Days per week</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.crossfitDaysPerWeek || ''}
                    onChange={(e) => updateFormData({ crossfitDaysPerWeek: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="4">4 days</option>
                    <option value="5">5 days</option>
                    <option value="6">6 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Intensity</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.crossfitType || ''}
                    onChange={(e) => updateFormData({ crossfitType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="beginner">Beginner Classes</option>
                    <option value="regular">Regular WODs</option>
                    <option value="competitive">Competitive Training</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred days</label>
                  <input
                    type="text"
                    placeholder="e.g., Mon, Wed, Fri"
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.crossfitSchedule || ''}
                    onChange={(e) => updateFormData({ crossfitSchedule: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Hiking Details */}
          {formData.otherWorkouts.includes('hiking') && (
            <Card className="p-4 bg-gray-800/50">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🥾</span>
                <h4 className="font-semibold">Hiking</h4>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Days per week</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.hikingDaysPerWeek || ''}
                    onChange={(e) => updateFormData({ hikingDaysPerWeek: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.hikingType || ''}
                    onChange={(e) => updateFormData({ hikingType: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="casual">Casual Walks</option>
                    <option value="moderate">Moderate Hikes</option>
                    <option value="challenging">Challenging Trails</option>
                    <option value="backpacking">Backpacking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Preferred days</label>
                  <input
                    type="text"
                    placeholder="e.g., Sat, Sun"
                    className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:border-primary-400 text-sm"
                    value={formData.hikingSchedule || ''}
                    onChange={(e) => updateFormData({ hikingSchedule: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Summary card if activities are selected */}
      {formData.otherWorkouts.length > 0 && (
        <Card className="p-4 bg-green-400/10 border-green-400/30">
          <div className="text-center">
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-semibold text-green-400 mb-2">Great!</h3>
            <p className="text-sm text-gray-300">
              We'll integrate your {formData.otherWorkouts.length} other activit{formData.otherWorkouts.length === 1 ? 'y' : 'ies'} into your training calendar 
              and schedule running sessions around them.
            </p>
          </div>
        </Card>
      )}
    </div>
  )

  // Step 5: Running Club
  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <UserGroupIcon className="h-12 w-12 text-primary-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Running Club Integration</h2>
        <p className="text-gray-400">Do you run with a club? We'll preserve the social aspect in your training plan</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Running Club Name (optional)</label>
        <input
          type="text"
          placeholder="e.g., MadeRunning, Local Running Club"
          className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
          value={formData.runningClub}
          onChange={(e) => updateFormData({ runningClub: e.target.value })}
        />
      </div>

      {formData.runningClub && (
        <>
          <div>
            <label className="block text-sm font-medium mb-4">Club Training Schedule</label>
            <div className="grid md:grid-cols-2 gap-3">
              {CLUB_SCHEDULE_OPTIONS.map((schedule) => (
                <Card
                  key={schedule}
                  className={`p-3 cursor-pointer transition-all ${
                    formData.clubSchedule.includes(schedule)
                      ? 'ring-2 ring-primary-400 bg-primary-400/10'
                      : 'hover:bg-gray-800/50'
                  }`}
                  onClick={() => {
                    const current = formData.clubSchedule
                    const updated = current.includes(schedule)
                      ? current.filter(s => s !== schedule)
                      : [...current, schedule]
                    updateFormData({ clubSchedule: updated })
                  }}
                >
                  <div className="text-center font-medium">{schedule}</div>
                </Card>
              ))}
              
              {/* Custom Time Option */}
              <Card
                className={`p-3 cursor-pointer transition-all border-2 border-dashed border-gray-600 hover:border-primary-400 ${
                  showCustomSchedule ? 'ring-2 ring-primary-400 bg-primary-400/10' : 'hover:bg-gray-800/50'
                }`}
                onClick={() => setShowCustomSchedule(true)}
              >
                <div className="text-center font-medium text-gray-400">+ Add Custom Time</div>
              </Card>
            </div>
          </div>

          {/* Custom Schedule Input */}
          {showCustomSchedule && (
            <Card className="p-4 bg-gray-800/50">
              <h4 className="font-medium mb-3">Add Custom Club Time</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Day</label>
                  <select 
                    value={customDay}
                    onChange={(e) => setCustomDay(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Time</label>
                  <input
                    type="text"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    placeholder="e.g., 7:30 AM"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={addCustomSchedule}
                  className="flex-1 py-1 text-sm"
                >
                  Add Time
                </Button>
                <Button 
                  onClick={() => setShowCustomSchedule(false)}
                  variant="outline"
                  className="flex-1 py-1 text-sm"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {/* Selected Club Times Display */}
          {formData.clubSchedule.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-3">Selected Club Times:</label>
              <div className="flex flex-wrap gap-2">
                {formData.clubSchedule.map((schedule) => (
                  <div 
                    key={schedule}
                    className="flex items-center gap-2 bg-primary-400/20 text-primary-300 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{schedule}</span>
                    <button
                      onClick={() => {
                        const updated = formData.clubSchedule.filter(s => s !== schedule)
                        updateFormData({ clubSchedule: updated })
                      }}
                      className="text-primary-200 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="keepClubRuns"
                checked={formData.keepClubRuns}
                onChange={(e) => updateFormData({ keepClubRuns: e.target.checked })}
                className="w-4 h-4 text-primary-400"
              />
              <label htmlFor="keepClubRuns" className="font-medium">
                Keep club runs in my training plan
              </label>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              We'll schedule your other training around club sessions to preserve the social aspect
            </p>
          </Card>
        </>
      )}
    </div>
  )

  // Step 6: Final Details
  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold mb-2">Final Details</h2>
        <p className="text-gray-400">A few more details to perfect your training plan</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Preferred Rest Days</label>
        <div className="grid grid-cols-7 gap-2">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
            <button
              key={day}
              type="button"
              className={`text-xs p-2 rounded border transition-all ${
                formData.restDayPrefs.includes(day.toLowerCase())
                  ? 'bg-primary-400 text-primary-900 border-primary-400'
                  : 'bg-gray-800 text-white border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => {
                const current = formData.restDayPrefs
                const dayLower = day.toLowerCase()
                const updated = current.includes(dayLower)
                  ? current.filter(d => d !== dayLower)
                  : [...current, dayLower]
                updateFormData({ restDayPrefs: updated })
              }}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Maximum Weekly Mileage (optional)</label>
        <input
          type="text"
          placeholder="e.g., 50 (miles per week)"
          className="w-full p-3 bg-gray-800 rounded border border-gray-700 focus:border-primary-400"
          value={formData.maxWeeklyMiles}
          onChange={(e) => updateFormData({ maxWeeklyMiles: e.target.value })}
        />
        <p className="text-sm text-gray-400 mt-1">
          Leave blank if you want AI to determine optimal volume
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-4">Injury History (optional)</label>
        <div className="grid md:grid-cols-3 gap-3">
          {['hamstring', 'knee', 'ankle', 'calf', 'shin', 'it_band', 'plantar_fasciitis', 'back'].map((injury) => (
            <Card
              key={injury}
              className={`p-3 cursor-pointer transition-all ${
                formData.injuryHistory.includes(injury)
                  ? 'ring-2 ring-yellow-400 bg-yellow-400/10'
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => {
                const current = formData.injuryHistory
                const updated = current.includes(injury)
                  ? current.filter(i => i !== injury)
                  : [...current, injury]
                updateFormData({ injuryHistory: updated })
              }}
            >
              <div className="text-center font-medium capitalize">
                {injury.replace('_', ' ')}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-4 bg-green-400/10 border-green-400/30">
        <div className="text-center">
          <div className="text-2xl mb-2">🤖</div>
          <h3 className="font-semibold text-green-400 mb-2">Ready to Generate Your Plan!</h3>
          <p className="text-sm text-gray-300">
            Our AI will create a personalized {RACE_TYPES.find(r => r.value === formData.raceType)?.label} training plan
            based on your experience, preferences, and goals.
          </p>
        </div>
      </Card>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderPlanTypeStep() // 🚀 NEW: Plan type selection
      case 2: return renderStep1() // Goal setting (shifted from step 1)
      case 3: return renderStep2() // PBs & Experience (shifted from step 2)
      case 4: return renderStep3() // Training preferences (shifted from step 3)
      case 5: return renderStep4() // Other activities (shifted from step 4)
      case 6: return renderStep5() // Running club (shifted from step 5)
      case 7: return renderStep6() // Final review (shifted from step 6) 
      default: return renderPlanTypeStep()
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Redirecting to signup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Setup Your Training Plan</h1>
            <span className="text-sm text-gray-400">Step {currentStep} of 7</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-primary-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-8 mb-8">
          {renderCurrentStep()}
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
            type="button"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          {currentStep < 7 ? (
            <Button
              onClick={nextStep}
              className="flex items-center space-x-2"
              type="button"
            >
              <span>Next</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
              type="button"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Creating Your Plan...</span>
                </>
              ) : (
                <>
                  <CpuChipIcon className="h-4 w-4" />
                  <span>Generate My Training Plan</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}