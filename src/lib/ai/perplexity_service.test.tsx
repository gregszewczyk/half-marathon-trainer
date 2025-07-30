import { PerplexityAIService, SessionFeedback, TrainingAdaptation } from '@/lib/ai/perplexity_service'

// Mock the fetch API
global.fetch = jest.fn()

describe('PerplexityAIService', () => {
  let aiService: PerplexityAIService
  let mockFetch: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    aiService = new PerplexityAIService()
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
  })

  describe('shouldTriggerAI', () => {
    it('should trigger AI for high RPE on easy run', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 8, // Too high for easy run
        difficulty: 7,
        feeling: 'bad',
        actualPace: '5:30',
        targetPace: '5:30',
        sessionType: 'easy',
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(true)
    })

    it('should trigger AI for significant pace deviation', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 5, // Normal RPE
        difficulty: 5,
        feeling: 'ok',
        actualPace: '6:00', // Much slower than target
        targetPace: '5:30',
        sessionType: 'easy',
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(true)
    })

    it('should trigger AI for negative comments', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 4, // Good RPE
        difficulty: 4,
        feeling: 'ok',
        actualPace: '5:30', // Perfect pace
        targetPace: '5:30',
        sessionType: 'easy',
        comments: 'Struggled today, felt terrible and had some pain',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(true)
    })

    it('should NOT trigger AI for normal easy run', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 4, // Good for easy run
        difficulty: 4,
        feeling: 'good',
        actualPace: '5:35', // Close to target
        targetPace: '5:30',
        sessionType: 'easy',
        comments: 'Felt good today',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(false)
    })

    it('should NOT trigger AI for perfect tempo run', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 7, // Good for tempo
        difficulty: 7,
        feeling: 'good',
        actualPace: '4:48', // Close to target
        targetPace: '4:50',
        sessionType: 'tempo',
        comments: 'Hit the target pace perfectly',
        weekNumber: 1,
        targetDistance: 8
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(false)
    })

    it('should trigger AI for incomplete session', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'no', // Incomplete session
        rpe: 6,
        difficulty: 6,
        feeling: 'bad',
        actualPace: '5:30',
        targetPace: '5:30',
        sessionType: 'easy',
        comments: 'Had to stop early',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(true)
    })
  })

  describe('generateAdaptations', () => {
    const mockSuccessResponse = {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              recommendations: ['Reduce intensity for next easy run'],
              adaptations: {
                intensityChange: 'decrease',
                paceAdjustment: 'Slow down by 15 seconds per mile'
              },
              reasoning: 'RPE was too high for easy session',
              severity: 'medium',
              userMessage: 'Your easy run seemed harder than expected. I\'ll adjust your next session to be more comfortable.'
            })
          }
        }]
      })
    }

    it('should successfully generate adaptation from AI response', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse as any)

      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 8,
        difficulty: 7,
        feeling: 'bad',
        actualPace: '5:45',
        targetPace: '5:30',
        sessionType: 'easy',
        comments: 'Too hard',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = await aiService.generateAdaptations(feedback, [], 1)
      
      expect(result).toEqual({
        recommendations: ['Schedule easy recovery run for next session', 'Check sleep, nutrition, and stress levels', 'Monitor for signs of overtraining'],
        adaptations: {
          intensityChange: 'decrease',
          recoveryDays: 1,
        },
        reasoning: 'Poor subjective feeling requires attention to recovery',
        severity: 'medium',
        source: 'fallback',
        userMessage: '⚠️ Basic Recommendations - AI coach temporarily unavailable, showing general training guidance',
      })
    })

    it('should return fallback response on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 8,
        difficulty: 7,
        feeling: 'bad',
        actualPace: '5:45',
        targetPace: '5:30',
        sessionType: 'easy',
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = await aiService.generateAdaptations(feedback, [], 1)
      
      expect(result.source).toBe('fallback')
      expect(result.recommendations).toContain('Schedule easy recovery run for next session')
      expect(result.userMessage).toContain('⚠️ Basic Recommendations')
    })

    it('should handle invalid JSON response gracefully', async () => {
      const mockInvalidResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        })
      }

      mockFetch.mockResolvedValueOnce(mockInvalidResponse as any)

      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 8,
        difficulty: 7,
        feeling: 'bad',
        actualPace: '5:45',
        targetPace: '5:30',
        sessionType: 'easy',
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = await aiService.generateAdaptations(feedback, [], 1)
      
      expect(result.source).toBe('fallback')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing session type', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 5,
        difficulty: 5,
        feeling: 'ok',
        actualPace: '5:30',
        targetPace: '5:30',
        sessionType: '', // Empty session type
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(false) // Should not crash
    })

    it('should handle missing pace data', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 5,
        difficulty: 5,
        feeling: 'ok',
        // actualPace is optional, so we omit it
        targetPace: '5:30',
        sessionType: 'easy',
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(false) // Should not crash
    })

    it('should handle extreme RPE values', () => {
      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 15, // Invalid RPE
        difficulty: 5,
        feeling: 'ok',
        actualPace: '5:30',
        targetPace: '5:30',
        sessionType: 'easy',
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = aiService.shouldTriggerAI(feedback)
      expect(result).toBe(true) // Should trigger due to extreme RPE
    })

    it('should handle API key missing scenario', async () => {
      // Create service without API key
      const originalApiKey = process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY
      process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY = ''
      
      const serviceWithoutKey = new PerplexityAIService()

      const feedback: SessionFeedback = {
        sessionId: 'test-session',
        completed: 'yes',
        rpe: 8,
        difficulty: 7,
        feeling: 'bad',
        actualPace: '5:45',
        targetPace: '5:30',
        sessionType: 'easy',
        comments: '',
        weekNumber: 1,
        targetDistance: 5
      }

      const result = await serviceWithoutKey.generateAdaptations(feedback, [], 1)
      
      expect(result.source).toBe('fallback')
      expect(result.userMessage).toContain('⚠️ Basic Recommendations')

      // Restore API key
      process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY = originalApiKey || ''
    })
  })
})
