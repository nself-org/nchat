# Testing Guide for Utilities

Complete guide to testing code that uses the new utility systems.

## Table of Contents

1. [Environment Validation Testing](#environment-validation)
2. [Logger Testing](#logger-testing)
3. [Error Boundary Testing](#error-boundary-testing)
4. [Performance Hooks Testing](#performance-hooks)
5. [API Retry Testing](#api-retry-testing)
6. [Feature Flags Testing](#feature-flags-testing)
7. [Storage Testing](#storage-testing)
8. [Network Hooks Testing](#network-hooks-testing)

---

## Environment Validation Testing

### Mocking Environment Variables

```typescript
// test-utils.ts
export function mockEnv(overrides: Record<string, string>) {
  const original = { ...process.env }

  beforeEach(() => {
    process.env = { ...original, ...overrides }
  })

  afterEach(() => {
    process.env = original
  })
}

// my-component.test.tsx
import { mockEnv } from './test-utils'

describe('Component with env', () => {
  mockEnv({
    NEXT_PUBLIC_APP_NAME: 'Test App',
    NEXT_PUBLIC_ENV: 'test',
  })

  it('uses environment variables', () => {
    const { result } = renderHook(() => usePublicEnv())
    expect(result.current.NEXT_PUBLIC_APP_NAME).toBe('Test App')
  })
})
```

### Testing Environment Validation

```typescript
import { validatePublicEnv, checkEnvHealth } from '@/lib/env'

describe('Environment Validation', () => {
  it('validates required variables', () => {
    process.env.NEXT_PUBLIC_GRAPHQL_URL = 'http://localhost/graphql'

    expect(() => validatePublicEnv()).not.toThrow()
  })

  it('throws on missing required variables in production', () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    delete process.env.NEXT_PUBLIC_GRAPHQL_URL

    expect(() => validateProductionEnv()).toThrow(/Missing required/)
  })

  it('checks environment health', () => {
    const { healthy, issues } = checkEnvHealth()

    if (!healthy) {
      expect(issues).toBeInstanceOf(Array)
      expect(issues.length).toBeGreaterThan(0)
    }
  })
})
```

---

## Logger Testing

### Mocking Logger

```typescript
// __mocks__/@/lib/logger.ts
export const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

export const createLogger = jest.fn(() => logger)
export const timeAsync = jest.fn((label, fn) => fn())
```

### Testing Logging Calls

```typescript
import { logger } from '@/lib/logger'

jest.mock('@/lib/logger')

describe('Component with logging', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('logs user actions', () => {
    const { getByRole } = render(<LoginButton />)
    fireEvent.click(getByRole('button'))

    expect(logger.info).toHaveBeenCalledWith(
      'Login button clicked',
      expect.objectContaining({ timestamp: expect.any(Number) })
    )
  })

  it('logs errors', async () => {
    const error = new Error('Test error')
    fetchMock.mockRejectedValueOnce(error)

    await expect(fetchData()).rejects.toThrow()

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch data',
      error,
      expect.any(Object)
    )
  })
})
```

### Testing timeAsync

```typescript
import { timeAsync } from '@/lib/logger'

describe('Timed operations', () => {
  it('measures execution time', async () => {
    const fn = jest.fn().mockResolvedValue('result')

    const result = await timeAsync('test-operation', fn)

    expect(result).toBe('result')
    expect(fn).toHaveBeenCalled()
  })

  it('logs slow operations', async () => {
    jest.useFakeTimers()

    const slowFn = () => new Promise((resolve) => setTimeout(() => resolve('done'), 2000))

    const promise = timeAsync('slow-op', slowFn)
    jest.advanceTimersByTime(2000)

    await promise

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('slow'), expect.any(Object))

    jest.useRealTimers()
  })
})
```

---

## Error Boundary Testing

### Testing Error Boundary

```typescript
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/error-boundary'

// Component that throws error
function ThrowError() {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  it('catches errors and shows fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('shows custom fallback', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
  })

  it('calls onError callback', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    )
  })

  it('resets on resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={['key1']}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()

    // Rerender with different key
    rerender(
      <ErrorBoundary resetKeys={['key2']}>
        <div>Success</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Success')).toBeInTheDocument()
  })
})
```

### Testing useAsyncError

```typescript
import { renderHook } from '@testing-library/react-hooks'
import { useAsyncError } from '@/components/error-boundary'
import { ErrorBoundary } from '@/components/error-boundary'

describe('useAsyncError', () => {
  it('throws error to boundary', () => {
    const TestComponent = () => {
      const throwError = useAsyncError()

      useEffect(() => {
        throwError(new Error('Async error'))
      }, [])

      return <div>Content</div>
    }

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
})
```

---

## Performance Hooks Testing

### Testing useRenderCount

```typescript
import { renderHook } from '@testing-library/react-hooks'
import { useRenderCount } from '@/hooks/use-performance'

describe('useRenderCount', () => {
  it('tracks render count', () => {
    const { result, rerender } = renderHook(() => useRenderCount())

    expect(result.current).toBe(0)

    rerender()
    expect(result.current).toBe(1)

    rerender()
    expect(result.current).toBe(2)
  })
})
```

### Testing useDebounce

```typescript
import { renderHook, act } from '@testing-library/react-hooks'
import { useDebounce } from '@/hooks/use-performance'

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('debounces value updates', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: 'initial' },
    })

    expect(result.current).toBe('initial')

    rerender({ value: 'updated' })
    expect(result.current).toBe('initial') // Still old value

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated') // Now updated
  })
})
```

---

## API Retry Testing

### Mocking Fetch for Retry Tests

```typescript
import { retryFetch, retryAsync } from '@/lib/api/retry'

describe('API Retry', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('retries on failure', async () => {
    // Fail twice, then succeed
    fetchMock
      .mockResponseOnce('', { status: 500 })
      .mockResponseOnce('', { status: 500 })
      .mockResponseOnce(JSON.stringify({ data: 'success' }))

    const response = await retryFetch('/api/data', {}, { maxRetries: 3 })
    const data = await response.json()

    expect(data).toEqual({ data: 'success' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('throws after max retries', async () => {
    fetchMock.mockResponse('', { status: 500 })

    await expect(retryFetch('/api/data', {}, { maxRetries: 2 })).rejects.toThrow()

    expect(fetchMock).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('does not retry on 4xx errors', async () => {
    fetchMock.mockResponse('', { status: 404 })

    await expect(
      retryFetch(
        '/api/data',
        {},
        {
          shouldRetry: (error) => {
            return error.status >= 500
          },
        }
      )
    ).rejects.toThrow()

    expect(fetchMock).toHaveBeenCalledTimes(1) // No retries
  })
})
```

### Testing Circuit Breaker

```typescript
import { CircuitBreaker } from '@/lib/api/retry'

describe('CircuitBreaker', () => {
  it('opens after threshold failures', async () => {
    const breaker = new CircuitBreaker(3, 60000)
    const failingFn = jest.fn().mockRejectedValue(new Error('Fail'))

    // Fail 3 times to open circuit
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow('Fail')
    }

    // Circuit should be open now
    await expect(breaker.execute(failingFn)).rejects.toThrow('Circuit breaker is OPEN')

    const state = breaker.getState()
    expect(state.state).toBe('open')
    expect(state.failures).toBe(3)
  })

  it('resets on success', async () => {
    const breaker = new CircuitBreaker(3, 60000)

    await breaker.execute(() => Promise.resolve('success'))

    const state = breaker.getState()
    expect(state.failures).toBe(0)
    expect(state.state).toBe('closed')
  })
})
```

---

## Feature Flags Testing

### Mocking Feature Flags

```typescript
import { featureFlags, isFeatureEnabled } from '@/lib/features/flags'

jest.mock('@/lib/features/flags', () => ({
  featureFlags: {
    isEnabled: jest.fn(),
    override: jest.fn(),
    clearAllOverrides: jest.fn(),
  },
  isFeatureEnabled: jest.fn(),
}))

describe('Feature with flags', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows feature when enabled', () => {
    ;(isFeatureEnabled as jest.Mock).mockReturnValue(true)

    const { getByText } = render(<FeatureComponent />)
    expect(getByText('New Feature')).toBeInTheDocument()
  })

  it('hides feature when disabled', () => {
    ;(isFeatureEnabled as jest.Mock).mockReturnValue(false)

    const { queryByText } = render(<FeatureComponent />)
    expect(queryByText('New Feature')).not.toBeInTheDocument()
  })
})
```

### Testing Feature Flag Logic

```typescript
import { FeatureFlagManager } from '@/lib/features/flags'

describe('FeatureFlagManager', () => {
  let manager: FeatureFlagManager

  beforeEach(() => {
    manager = new FeatureFlagManager({
      test_feature: {
        enabled: true,
        requiredRole: 'admin',
      },
    })
  })

  it('checks role requirements', () => {
    expect(manager.isEnabled('test_feature', { role: 'admin' })).toBe(true)
    expect(manager.isEnabled('test_feature', { role: 'member' })).toBe(false)
  })

  it('respects overrides', () => {
    manager.override('test_feature', false)
    expect(manager.isEnabled('test_feature', { role: 'owner' })).toBe(false)
  })
})
```

---

## Storage Testing

### Mocking LocalStorage

```typescript
// test-utils.ts
export function mockLocalStorage() {
  let store: Record<string, string> = {}

  const localStorageMock = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
  }

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })

  return localStorageMock
}

// test.tsx
describe('Storage tests', () => {
  beforeEach(() => {
    mockLocalStorage()
  })

  // tests...
})
```

### Testing Storage Operations

```typescript
import { storage } from '@/lib/storage/local-storage'

describe('LocalStorageManager', () => {
  beforeEach(() => {
    mockLocalStorage()
  })

  it('sets and gets values', () => {
    const data = { name: 'John', age: 30 }
    storage.set('user', data)

    const retrieved = storage.get('user')
    expect(retrieved).toEqual(data)
  })

  it('handles TTL expiration', () => {
    jest.useFakeTimers()

    storage.set('temp', 'data', { ttl: 1000 })
    expect(storage.get('temp')).toBe('data')

    jest.advanceTimersByTime(1001)
    expect(storage.get('temp')).toBeNull()

    jest.useRealTimers()
  })

  it('returns default value for missing keys', () => {
    expect(storage.get('missing', 'default')).toBe('default')
  })
})
```

### Testing useLocalStorage Hook

```typescript
import { renderHook, act } from '@testing-library/react-hooks'
import { useLocalStorage } from '@/lib/storage/local-storage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    mockLocalStorage()
  })

  it('initializes with default value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('updates value', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
    expect(localStorage.getItem).toHaveBeenCalled()
  })
})
```

---

## Network Hooks Testing

### Mocking Network Status

```typescript
import { renderHook, act } from '@testing-library/react-hooks'
import { useOnline } from '@/hooks/use-online'

describe('useOnline', () => {
  it('tracks online status', () => {
    const { result } = renderHook(() => useOnline())

    expect(result.current).toBe(true) // Default online

    // Simulate going offline
    act(() => {
      const event = new Event('offline')
      window.dispatchEvent(event)
    })

    expect(result.current).toBe(false)

    // Simulate going online
    act(() => {
      const event = new Event('online')
      window.dispatchEvent(event)
    })

    expect(result.current).toBe(true)
  })

  it('calls callbacks', () => {
    const onOnline = jest.fn()
    const onOffline = jest.fn()

    renderHook(() => useOnline({ onOnline, onOffline }))

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(onOffline).toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(onOnline).toHaveBeenCalled()
  })
})
```

---

## Integration Testing

### Testing Multiple Utilities Together

```typescript
import { render, waitFor } from '@testing-library/react'
import { storage } from '@/lib/storage/local-storage'
import { logger } from '@/lib/logger'
import { retryFetch } from '@/lib/api/retry'

jest.mock('@/lib/logger')
jest.mock('@/lib/api/retry')

describe('Integration: Cached API with logging', () => {
  beforeEach(() => {
    mockLocalStorage()
    jest.clearAllMocks()
  })

  it('fetches and caches data', async () => {
    const mockData = { users: ['Alice', 'Bob'] }
    ;(retryFetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockData)
    })

    const { getByText } = render(<UserList />)

    await waitFor(() => {
      expect(getByText('Alice')).toBeInTheDocument()
    })

    // Check logging
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('fetched'),
      expect.any(Object)
    )

    // Check caching
    expect(storage.get('users-cache')).toEqual(mockData)
  })
})
```

---

## Testing Best Practices

### 1. Always Clear Mocks

```typescript
beforeEach(() => {
  jest.clearAllMocks()
  storage.clear()
})
```

### 2. Use Fake Timers for Async Tests

```typescript
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})
```

### 3. Suppress Console Errors in Error Tests

```typescript
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  ;(console.error as jest.Mock).mockRestore()
})
```

### 4. Test Error Paths

```typescript
it('handles errors gracefully', async () => {
  fetchMock.mockRejectedValue(new Error('Network error'))

  await expect(fetchData()).rejects.toThrow()
  expect(logger.error).toHaveBeenCalled()
})
```

### 5. Test Edge Cases

```typescript
it('handles empty response', async () => {
  fetchMock.mockResolvedValue({ json: () => Promise.resolve([]) })

  const result = await fetchData()
  expect(result).toEqual([])
})
```

---

## Test Coverage Goals

- **Utilities**: >90% coverage
- **Hooks**: >85% coverage
- **Components**: >80% coverage
- **Integration**: Critical paths covered

---

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific file
pnpm test src/lib/logger/index.test.ts

# Watch mode
pnpm test:watch
```

---

**See Also**:

- [Utilities Documentation](./README.md)
- [Integration Examples](./integration-examples.md)
- [Contributing Guide](../CONTRIBUTING.md)
