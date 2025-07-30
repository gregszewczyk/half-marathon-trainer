import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the UI components to avoid module resolution issues
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}))

import TrainingCalendar from '@/components/training/TrainingCalendar'

// Mock the AI service
jest.mock('@/lib/ai/perplexity_service', () => ({
  PerplexityAIService: jest.fn().mockImplementation(() => ({
    shouldTriggerAI: jest.fn(),
    generateAdaptations: jest.fn(),
  })),
}))

// Mock the hooks
jest.mock('@/hooks/useTrainingData', () => ({
  useTrainingData: jest.fn(() => ({
    trainingData: mockTrainingData,
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}))

// Mock training data
const mockTrainingData = {
  currentWeek: 1,
  totalWeeks: 12,
  sessions: [
    {
      id: 'session-1',
      date: '2025-07-31',
      type: 'easy',
      duration: 30,
      distance: 5,
      targetPace: '5:30',
      description: 'Easy run',
      completed: false,
    },
    {
      id: 'session-2',
      date: '2025-08-02',
      type: 'tempo',
      duration: 45,
      distance: 8,
      targetPace: '4:50',
      description: 'Tempo run',
      completed: false,
    },
  ],
  weekProgress: {
    completedSessions: 0,
    totalSessions: 5,
    weeklyDistance: 0,
    targetWeeklyDistance: 25,
  },
}

describe('TrainingCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render training calendar with sessions', () => {
    render(<TrainingCalendar />)
    
    expect(screen.getByText('Easy run')).toBeInTheDocument()
    expect(screen.getByText('Tempo run')).toBeInTheDocument()
    expect(screen.getByText('5:30')).toBeInTheDocument()
    expect(screen.getByText('4:50')).toBeInTheDocument()
  })

  it('should show session feedback modal when clicking feedback button', async () => {
    render(<TrainingCalendar />)
    
    // Click on a session to open feedback
    const sessionCard = screen.getByText('Easy run').closest('[data-testid="session-card"]')
    expect(sessionCard).toBeInTheDocument()
    
    if (sessionCard) {
      fireEvent.click(sessionCard)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Session Feedback')).toBeInTheDocument()
    })
  })

  it('should handle session feedback submission', async () => {
    const mockGenerateAdaptations = jest.fn().mockResolvedValue({
      recommendations: ['Test recommendation'],
      adaptations: { intensityChange: 'decrease' },
      reasoning: 'Test reasoning',
      severity: 'medium',
      source: 'ai',
      userMessage: 'Test message',
    })

    // Mock the AI service
    require('@/lib/ai/perplexity_service').PerplexityAIService.mockImplementation(() => ({
      shouldTriggerAI: jest.fn().mockReturnValue(true),
      generateAdaptations: mockGenerateAdaptations,
    }))

    render(<TrainingCalendar />)
    
    // Open session feedback
    const sessionCard = screen.getByText('Easy run').closest('[data-testid="session-card"]')
    if (sessionCard) {
      fireEvent.click(sessionCard)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Session Feedback')).toBeInTheDocument()
    })

    // Fill in feedback form
    const rpeInput = screen.getByLabelText(/RPE/i)
    const difficultyInput = screen.getByLabelText(/Difficulty/i)
    const paceInput = screen.getByLabelText(/Actual Pace/i)
    const submitButton = screen.getByText('Submit Feedback')

    fireEvent.change(rpeInput, { target: { value: '8' } })
    fireEvent.change(difficultyInput, { target: { value: '7' } })
    fireEvent.change(paceInput, { target: { value: '5:45' } })
    
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockGenerateAdaptations).toHaveBeenCalled()
    })
  })

  it('should display AI predictions when available', () => {
    const mockDataWithPrediction = {
      ...mockTrainingData,
      aiPrediction: {
        predictedTime: '1:35:00',
        confidence: 85,
        lastUpdated: '2025-07-30',
      },
    }

    // Mock the hook to return data with prediction
    require('@/hooks/useTrainingData').useTrainingData.mockReturnValue({
      trainingData: mockDataWithPrediction,
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<TrainingCalendar />)
    
    expect(screen.getByText('1:35:00')).toBeInTheDocument()
    expect(screen.getByText(/85%/)).toBeInTheDocument()
  })

  it('should handle session drag and drop', async () => {
    render(<TrainingCalendar />)
    
    const sessionCard = screen.getByText('Easy run').closest('[data-testid="session-card"]')
    expect(sessionCard).toBeInTheDocument()

    // Simulate drag start
    if (sessionCard) {
      fireEvent.dragStart(sessionCard)
      
      // Simulate drop on different day
      const dropTarget = screen.getByTestId('day-2025-08-01')
      fireEvent.dragOver(dropTarget)
      fireEvent.drop(dropTarget)
    }

    // Should show confirmation modal for permanent move
    await waitFor(() => {
      expect(screen.getByText(/Apply this change to future weeks/)).toBeInTheDocument()
    })
  })

  it('should show cross-week modifications modal when triggered', async () => {
    const mockCrossWeekData = {
      ...mockTrainingData,
      crossWeekModifications: {
        count: 2,
        modifications: [
          {
            week: 2,
            changes: ['Reduce intensity'],
            reasoning: 'High RPE pattern detected',
          },
        ],
      },
    }

    require('@/hooks/useTrainingData').useTrainingData.mockReturnValue({
      trainingData: mockCrossWeekData,
      loading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<TrainingCalendar />)
    
    // Click on cross-week modifications button
    const modificationsButton = screen.getByText(/2 AI Modifications/)
    fireEvent.click(modificationsButton)

    await waitFor(() => {
      expect(screen.getByText('Cross-Week Modifications')).toBeInTheDocument()
      expect(screen.getByText('High RPE pattern detected')).toBeInTheDocument()
    })
  })

  it('should handle loading states properly', () => {
    require('@/hooks/useTrainingData').useTrainingData.mockReturnValue({
      trainingData: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    })

    render(<TrainingCalendar />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should handle error states properly', () => {
    require('@/hooks/useTrainingData').useTrainingData.mockReturnValue({
      trainingData: null,
      loading: false,
      error: 'Failed to load training data',
      refetch: jest.fn(),
    })

    render(<TrainingCalendar />)
    
    expect(screen.getByText('Failed to load training data')).toBeInTheDocument()
  })

  it('should prevent multiple feedback submissions', async () => {
    const mockGenerateAdaptations = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        recommendations: ['Test'],
        adaptations: {},
        reasoning: 'Test',
        severity: 'low',
        source: 'ai',
        userMessage: 'Test',
      }), 1000))
    )

    require('@/lib/ai/perplexity_service').PerplexityAIService.mockImplementation(() => ({
      shouldTriggerAI: jest.fn().mockReturnValue(true),
      generateAdaptations: mockGenerateAdaptations,
    }))

    render(<TrainingCalendar />)
    
    // Open feedback modal
    const sessionCard = screen.getByText('Easy run').closest('[data-testid="session-card"]')
    if (sessionCard) {
      fireEvent.click(sessionCard)
    }
    
    await waitFor(() => {
      expect(screen.getByText('Session Feedback')).toBeInTheDocument()
    })

    // Fill form and submit
    const submitButton = screen.getByText('Submit Feedback')
    fireEvent.click(submitButton)
    
    // Button should be disabled during processing
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })
})
