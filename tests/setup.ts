import '@testing-library/jest-dom'

// Mock the cn utility function
jest.mock('@/utils/cn', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock localStorage
const createMockStorage = (): Storage => {
  const store: { [key: string]: string } = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: jest.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    })
  }
}

global.localStorage = createMockStorage()
global.sessionStorage = createMockStorage()

// Mock fetch globally
global.fetch = jest.fn()

// Mock environment variables
process.env.PERPLEXITY_API_KEY = 'test-api-key'
process.env.DATABASE_URL = 'test-database-url'

// Setup for each test
beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
})
