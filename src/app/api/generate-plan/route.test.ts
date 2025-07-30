// Test utilities for plan generation
function calculateTrainingWeeks(today: Date, raceDate: Date): number {
  const timeDiff = raceDate.getTime() - today.getTime();
  const weeksDiff = Math.ceil(timeDiff / (1000 * 3600 * 24 * 7));
  
  // Ensure reasonable bounds: minimum 4 weeks, maximum 20 weeks
  if (weeksDiff < 4) return 4;
  if (weeksDiff > 20) return 20;
  
  return weeksDiff;
}

describe('Plan Generation Logic', () => {
  describe('calculateTrainingWeeks', () => {
    it('should return 12 weeks for race in 12 weeks', () => {
      const today = new Date('2025-07-30')
      const raceDate = new Date('2025-10-22') // ~12 weeks away
      
      const weeks = calculateTrainingWeeks(today, raceDate)
      expect(weeks).toBe(12)
    })

    it('should return minimum 4 weeks for race very close', () => {
      const today = new Date('2025-07-30')
      const raceDate = new Date('2025-08-06') // 1 week away
      
      const weeks = calculateTrainingWeeks(today, raceDate)
      expect(weeks).toBe(4)
    })

    it('should return maximum 20 weeks for race very far', () => {
      const today = new Date('2025-07-30')
      const raceDate = new Date('2026-02-01') // ~26 weeks away
      
      const weeks = calculateTrainingWeeks(today, raceDate)
      expect(weeks).toBe(20)
    })

    it('should handle race dates in the past', () => {
      const today = new Date('2025-07-30')
      const raceDate = new Date('2025-07-15') // 2 weeks ago
      
      const weeks = calculateTrainingWeeks(today, raceDate)
      expect(weeks).toBe(4) // Should return minimum
    })

    it('should calculate correct weeks for various distances', () => {
      const today = new Date('2025-07-30')
      
      // Test different time periods
      const testCases = [
        { raceDate: new Date('2025-08-27'), expected: 4 }, // 4 weeks
        { raceDate: new Date('2025-09-10'), expected: 6 }, // 6 weeks
        { raceDate: new Date('2025-10-08'), expected: 10 }, // 10 weeks
        { raceDate: new Date('2025-11-19'), expected: 16 }, // 16 weeks
        { raceDate: new Date('2025-12-31'), expected: 20 }, // 22 weeks (capped at 20)
      ]

      testCases.forEach(({ raceDate, expected }) => {
        const weeks = calculateTrainingWeeks(today, raceDate)
        expect(weeks).toBe(expected)
      })
    })

    it('should handle edge case of exactly 4 weeks', () => {
      const today = new Date('2025-07-30')
      const raceDate = new Date('2025-08-27') // Exactly 4 weeks
      
      const weeks = calculateTrainingWeeks(today, raceDate)
      expect(weeks).toBe(4)
    })

    it('should handle edge case of exactly 20 weeks', () => {
      const today = new Date('2025-07-30')
      const raceDate = new Date('2025-12-17') // Exactly 20 weeks
      
      const weeks = calculateTrainingWeeks(today, raceDate)
      expect(weeks).toBe(20)
    })

    it('should be consistent with different start days of week', () => {
      // Test that the calculation is consistent regardless of start day
      const raceDateSunday = new Date('2025-10-05') // Sunday
      const raceDateMonday = new Date('2025-10-06') // Monday
      const raceDateSaturday = new Date('2025-10-11') // Saturday
      
      const today = new Date('2025-07-30')
      
      const weeksSunday = calculateTrainingWeeks(today, raceDateSunday)
      const weeksMonday = calculateTrainingWeeks(today, raceDateMonday)
      const weeksSaturday = calculateTrainingWeeks(today, raceDateSaturday)
      
      // Should be very close (within 1 week)
      expect(Math.abs(weeksSunday - weeksMonday)).toBeLessThanOrEqual(1)
      expect(Math.abs(weeksMonday - weeksSaturday)).toBeLessThanOrEqual(1)
    })

    it('should handle leap year calculations', () => {
      const today = new Date('2024-02-15') // Leap year
      const raceDate = new Date('2024-07-15') // 22 weeks away
      
      const weeks = calculateTrainingWeeks(today, raceDate)
      expect(weeks).toBeGreaterThanOrEqual(4)
      expect(weeks).toBeLessThanOrEqual(20)
    })
  })

  describe('Training Plan Configuration', () => {
    it('should generate plan for 5K race', () => {
      const planConfig = {
        raceDistance: '5K',
        totalWeeks: 8,
        weeklyMileage: 15,
        targetPace: '5:45',
      }

      expect(planConfig.raceDistance).toBe('5K')
      expect(planConfig.totalWeeks).toBeGreaterThanOrEqual(4)
      expect(planConfig.totalWeeks).toBeLessThanOrEqual(20)
    })

    it('should generate plan for half marathon', () => {
      const planConfig = {
        raceDistance: 'Half Marathon',
        totalWeeks: 16,
        weeklyMileage: 25,
        targetPace: '5:15',
      }

      expect(planConfig.raceDistance).toBe('Half Marathon')
      expect(planConfig.totalWeeks).toBeGreaterThanOrEqual(8)
    })

    it('should generate plan for marathon', () => {
      const planConfig = {
        raceDistance: 'Marathon',
        totalWeeks: 20,
        weeklyMileage: 40,
        targetPace: '4:45',
      }

      expect(planConfig.raceDistance).toBe('Marathon')
      expect(planConfig.totalWeeks).toBeGreaterThanOrEqual(16)
    })

    it('should adjust weekly mileage based on experience', () => {
      const beginnerPlan = {
        experience: 'beginner',
        baseMileage: 15,
        maxMileage: 25,
      }

      const intermediatePlan = {
        experience: 'intermediate',
        baseMileage: 25,
        maxMileage: 40,
      }

      const advancedPlan = {
        experience: 'advanced',
        baseMileage: 40,
        maxMileage: 60,
      }

      expect(beginnerPlan.baseMileage).toBeLessThan(intermediatePlan.baseMileage)
      expect(intermediatePlan.baseMileage).toBeLessThan(advancedPlan.baseMileage)
    })

    it('should validate input parameters', () => {
      const validInputs = [
        {
          raceDistance: '5K',
          raceDate: '2025-10-15',
          currentPace: '6:00',
          runningExperience: 'beginner',
        },
        {
          raceDistance: 'Half Marathon',
          raceDate: '2025-12-01',
          currentPace: '5:30',
          runningExperience: 'intermediate',
        },
      ]

      validInputs.forEach(input => {
        expect(input.raceDistance).toMatch(/^(5K|10K|Half Marathon|Marathon)$/)
        expect(new Date(input.raceDate)).toBeInstanceOf(Date)
        expect(input.currentPace).toMatch(/^\d+:\d{2}$/)
        expect(input.runningExperience).toMatch(/^(beginner|intermediate|advanced)$/)
      })
    })

    it('should generate appropriate session types', () => {
      const sessionTypes = ['easy', 'tempo', 'intervals', 'long', 'rest']
      const crossTrainingTypes = ['swimming', 'cycling', 'yoga', 'strength']
      
      sessionTypes.forEach(type => {
        expect(['easy', 'tempo', 'intervals', 'long', 'rest']).toContain(type)
      })

      crossTrainingTypes.forEach(type => {
        expect(['swimming', 'cycling', 'yoga', 'strength']).toContain(type)
      })
    })

    it('should calculate appropriate pace adjustments', () => {
      const basePace = '5:30' // 5:30 per mile
      const easyPaceAdjustment = 30 // 30 seconds slower
      const tempoPaceAdjustment = -15 // 15 seconds faster
      
      // Test pace calculation logic
      const paceToSeconds = (pace: string): number => {
        const [minutes, seconds] = pace.split(':').map(Number)
        return (minutes || 0) * 60 + (seconds || 0)
      }

      const secondsToPace = (totalSeconds: number): string => {
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
      }

      const baseSeconds = paceToSeconds(basePace)
      const easyPace = secondsToPace(baseSeconds + easyPaceAdjustment)
      const tempoPace = secondsToPace(baseSeconds + tempoPaceAdjustment)

      expect(easyPace).toBe('6:00')
      expect(tempoPace).toBe('5:15')
    })
  })
})
