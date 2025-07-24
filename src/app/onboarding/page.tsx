// 🆕 NEW FILE: src/app/onboarding/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState({
    raceType: 'HALF_MARATHON',
    targetTime: '2:00:00',
    raceDate: '',
    fitnessLevel: 'INTERMEDIATE',
    trainingDaysPerWeek: 4,
    age: '',
    weight: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/auth/login');
      return;
    }
    setUserId(storedUserId);
  }, []);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData
        }),
      });

      if (response.ok) {
        console.log('✅ Profile created successfully');
        router.push('/dashboard');
      } else {
        console.error('❌ Profile creation failed');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    } finally {
      setLoading(false);
    }
  };

  const raceTypes = [
    { value: 'FIVE_K', label: '5K', time: '25:00' },
    { value: 'TEN_K', label: '10K', time: '50:00' },
    { value: 'HALF_MARATHON', label: 'Half Marathon', time: '2:00:00' },
    { value: 'FULL_MARATHON', label: 'Full Marathon', time: '4:00:00' },
  ];

  const fitnessLevels = [
    { value: 'BEGINNER', label: 'Beginner', desc: 'New to running or returning after a break' },
    { value: 'INTERMEDIATE', label: 'Intermediate', desc: 'Regular runner with some race experience' },
    { value: 'ADVANCED', label: 'Advanced', desc: 'Experienced racer with consistent training' },
    { value: 'ELITE', label: 'Elite', desc: 'Competitive runner seeking performance' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Step {step} of 4</span>
            <span>{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Race Goal */}
        {step === 1 && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              🎯 What's Your Race Goal?
            </h2>
            <p className="text-gray-400 mb-8">
              Choose the race distance you're training for
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              {raceTypes.map((race) => (
                <button
                  key={race.value}
                  onClick={() => {
                    handleChange('raceType', race.value);
                    handleChange('targetTime', race.time);
                  }}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    formData.raceType === race.value
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl font-bold">{race.label}</div>
                  <div className="text-sm text-gray-400">Target: {race.time}</div>
                </button>
              ))}
            </div>

            <div className="mt-8">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Target Time (optional)
              </label>
              <input
                type="text"
                value={formData.targetTime}
                onChange={(e) => handleChange('targetTime', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="2:00:00"
              />
            </div>
          </div>
        )}

        {/* Step 2: Fitness Level */}
        {step === 2 && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              💪 What's Your Fitness Level?
            </h2>
            <p className="text-gray-400 mb-8">
              This helps us create the perfect training plan for you
            </p>
            
            <div className="space-y-4">
              {fitnessLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => handleChange('fitnessLevel', level.value)}
                  className={`w-full p-6 rounded-lg border-2 text-left transition-all ${
                    formData.fitnessLevel === level.value
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-lg">{level.label}</div>
                  <div className="text-sm text-gray-400">{level.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Training Schedule */}
        {step === 3 && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              📅 Training Schedule
            </h2>
            <p className="text-gray-400 mb-8">
              Set your training preferences and race date
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Training Days Per Week
                </label>
                <div className="flex justify-center space-x-4">
                  {[3, 4, 5, 6].map((days) => (
                    <button
                      key={days}
                      onClick={() => handleChange('trainingDaysPerWeek', days)}
                      className={`px-6 py-3 rounded-lg border-2 transition-all ${
                        formData.trainingDaysPerWeek === days
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Race Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.raceDate}
                  onChange={(e) => handleChange('raceDate', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Personal Info */}
        {step === 4 && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              👤 Personal Details
            </h2>
            <p className="text-gray-400 mb-8">
              Optional information to personalize your training (skip if you prefer)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="70"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Gender
                </label>
                <div className="flex justify-center space-x-4">
                  {['Male', 'Female', 'Other'].map((gender) => (
                    <button
                      key={gender}
                      onClick={() => handleChange('gender', gender)}
                      className={`px-6 py-3 rounded-lg border-2 transition-all ${
                        formData.gender === gender
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
          >
            Previous
          </button>

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors"
            >
              {loading ? 'Creating Plan...' : 'Start Training! 🚀'}
            </button>
          )}
        </div>

        {/* Skip Option */}
        {step === 4 && (
          <div className="text-center mt-4">
            <button
              onClick={handleSubmit}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Skip personal details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}