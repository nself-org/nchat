# Integration Examples

Real-world examples showing how to use multiple utilities together for common patterns.

## Table of Contents

1. [API Integration with Retry & Logging](#api-integration)
2. [Feature Flag with Error Handling](#feature-flags-with-errors)
3. [Cached API Calls](#cached-api-calls)
4. [Offline-Aware Components](#offline-aware-components)
5. [Performance-Monitored Components](#performance-monitored-components)
6. [Progressive Feature Rollout](#progressive-rollout)

---

## API Integration with Retry & Logging

Combine retry logic, logging, and error handling for robust API calls.

```typescript
import { retryFetch } from '@/lib/api/retry'
import { logger } from '@/lib/logger'
import { useAsyncError } from '@/components/error-boundary'

async function fetchUserData(userId: string) {
  logger.info('Fetching user data', { userId })

  try {
    const response = await retryFetch(`/api/users/${userId}`, {}, {
      maxRetries: 3,
      initialDelay: 1000,
      onRetry: (error, attempt) => {
        logger.warn('Retrying user fetch', { userId, attempt, error: error.message })
      }
    })

    const data = await response.json()
    logger.info('User data fetched successfully', { userId, dataSize: JSON.stringify(data).length })
    return data
  } catch (error) {
    logger.error('Failed to fetch user data', error as Error, { userId })
    throw error
  }
}

// In component
function UserProfile({ userId }: { userId: string }) {
  const throwError = useAsyncError()
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetchUserData(userId)
      .then(setUser)
      .catch(throwError) // Will be caught by ErrorBoundary
  }, [userId])

  return <div>{user?.name}</div>
}
```

---

## Feature Flags with Error Handling

Progressive feature rollout with proper error boundaries.

```typescript
import { isFeatureEnabled } from '@/lib/features/flags'
import { ErrorBoundary } from '@/components/error-boundary'
import { logger } from '@/lib/logger'

function ExperimentalFeature() {
  const { userId, role } = useAuth()

  // Check if user has access to feature
  if (!isFeatureEnabled('ai_assistant', { userId, role })) {
    return null // Feature not available
  }

  logger.info('AI Assistant feature accessed', { userId, role })

  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p>AI Assistant is temporarily unavailable.</p>
          <p className="text-sm text-muted-foreground">We're working on it!</p>
        </div>
      }
      onError={(error) => {
        logger.error('AI Assistant error', error, { userId, feature: 'ai_assistant' })
      }}
    >
      <AIAssistant />
    </ErrorBoundary>
  )
}
```

---

## Cached API Calls

Combine storage with retry for cached, resilient API calls.

```typescript
import { storage } from '@/lib/storage/local-storage'
import { retryFetch } from '@/lib/api/retry'
import { logger } from '@/lib/logger'
import { timeAsync } from '@/lib/logger'

async function fetchWithCache<T>(
  key: string,
  url: string,
  ttl: number = 300000 // 5 minutes
): Promise<T> {
  // Check cache first
  const cached = storage.get<T>(key)
  if (cached) {
    logger.debug('Cache hit', { key })
    return cached
  }

  // Cache miss - fetch with retry
  logger.debug('Cache miss', { key })
  const data = await timeAsync(
    `fetch-${key}`,
    async () => {
      const response = await retryFetch(url)
      return await response.json()
    },
    { cacheKey: key }
  )

  // Store in cache
  storage.set(key, data, { ttl })
  logger.info('Data cached', { key, ttl })

  return data
}

// Usage
function UserList() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchWithCache<User[]>('users-list', '/api/users', 60000)
      .then(setUsers)
      .catch(error => {
        logger.error('Failed to load users', error)
      })
  }, [])

  return <div>{users.map(u => <div key={u.id}>{u.name}</div>)}</div>
}
```

---

## Offline-Aware Components

Handle offline state with proper UX and caching.

```typescript
import { useOnline, useIsSlowConnection } from '@/hooks/use-online'
import { storage } from '@/lib/storage/local-storage'
import { logger } from '@/lib/logger'
import { useEffect, useState } from 'react'

function MessagesView() {
  const isOnline = useOnline({
    onOffline: () => {
      logger.warn('User went offline')
      toast.warning('You are offline. Showing cached messages.')
    },
    onOnline: () => {
      logger.info('User back online')
      toast.success('Back online. Syncing...')
      syncMessages()
    }
  })

  const isSlowConnection = useIsSlowConnection()
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (isOnline) {
      // Fetch from API
      fetchMessages().then(data => {
        setMessages(data)
        storage.set('messages-cache', data, { ttl: 3600000 }) // Cache for 1 hour
      })
    } else {
      // Load from cache
      const cached = storage.get('messages-cache', [])
      setMessages(cached)
    }
  }, [isOnline])

  return (
    <div>
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mb-4">
          <span>🔴 Offline - Showing cached messages</span>
        </div>
      )}

      {isSlowConnection && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded mb-4">
          <span>🐌 Slow connection detected - Limited functionality</span>
        </div>
      )}

      {messages.map(msg => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  )
}
```

---

## Performance-Monitored Components

Track and optimize component performance.

```typescript
import {
  usePerformanceMetrics,
  useWhyDidYouUpdate,
  useDebounce
} from '@/hooks/use-performance'
import { logger } from '@/lib/logger'
import { isDevelopment } from '@/lib/env'

function ExpensiveComponent({ data, filters, onUpdate }: Props) {
  const metrics = usePerformanceMetrics('ExpensiveComponent')

  // Debug re-renders in development
  if (isDevelopment()) {
    useWhyDidYouUpdate('ExpensiveComponent', { data, filters, onUpdate })
  }

  // Debounce expensive operations
  const debouncedFilters = useDebounce(filters, 300)

  // Log slow renders
  useEffect(() => {
    if (metrics.lastRenderTime > 16) { // Slower than 60fps
      logger.warn('Slow render detected', {
        component: 'ExpensiveComponent',
        renderTime: metrics.lastRenderTime,
        renderCount: metrics.renderCount
      })
    }
  }, [metrics])

  // Use debounced filters for expensive operations
  const filteredData = useMemo(() => {
    return expensiveFilter(data, debouncedFilters)
  }, [data, debouncedFilters])

  return (
    <div>
      {isDevelopment() && (
        <div className="text-xs text-gray-500">
          Renders: {metrics.renderCount} |
          Avg: {metrics.averageRenderTime.toFixed(2)}ms |
          Slowest: {metrics.slowestRenderTime.toFixed(2)}ms
        </div>
      )}

      {filteredData.map(item => <Item key={item.id} {...item} />)}
    </div>
  )
}
```

---

## Progressive Feature Rollout

Gradually roll out features with monitoring and fallback.

```typescript
import { isFeatureEnabled, featureFlags } from '@/lib/features/flags'
import { logger } from '@/lib/logger'
import { ErrorBoundary } from '@/components/error-boundary'
import { useEffect } from 'react'

function NewSearchExperience() {
  const { userId, role } = useAuth()

  // Check if user is in the rollout
  const canUseNewSearch = isFeatureEnabled('advanced_search', { userId, role })

  // Track feature usage
  useEffect(() => {
    if (canUseNewSearch) {
      logger.info('Advanced search accessed', {
        userId,
        role,
        experiment: 'advanced_search',
        cohort: hashUserId(userId) % 100 // Track which percentage cohort
      })
    }
  }, [canUseNewSearch, userId, role])

  if (!canUseNewSearch) {
    // Fallback to old search
    return <LegacySearch />
  }

  // New search with error boundary
  return (
    <ErrorBoundary
      fallback={<LegacySearch />}
      onError={(error) => {
        logger.error('Advanced search error', error, {
          userId,
          feature: 'advanced_search',
          action: 'falling_back_to_legacy'
        })

        // Disable feature for this user if it keeps failing
        const errorCount = storage.get<number>(`search-errors-${userId}`, 0)
        if (errorCount > 3) {
          featureFlags.override('advanced_search', false)
          logger.warn('Advanced search disabled for user due to errors', { userId, errorCount })
        }
        storage.set(`search-errors-${userId}`, errorCount + 1, { ttl: 86400000 }) // 24 hours
      }}
    >
      <AdvancedSearch />
    </ErrorBoundary>
  )
}
```

---

## Environment-Aware Configuration

Different behavior based on environment with type safety.

```typescript
import { getPublicEnv, isDevelopment, isProduction } from '@/lib/env'
import { logger } from '@/lib/logger'
import { featureFlags } from '@/lib/features/flags'

function AppInitializer() {
  const env = getPublicEnv()

  useEffect(() => {
    // Log startup info
    logger.info('App initializing', {
      environment: env.NEXT_PUBLIC_ENV,
      appName: env.NEXT_PUBLIC_APP_NAME,
      hasGraphQL: !!env.NEXT_PUBLIC_GRAPHQL_URL,
      isDevAuth: env.NEXT_PUBLIC_USE_DEV_AUTH
    })

    // Enable debug features in development
    if (isDevelopment()) {
      featureFlags.override('debug_mode', true)
      featureFlags.override('performance_monitoring', true)
      logger.debug('Development mode enabled')
    }

    // Production-specific initialization
    if (isProduction()) {
      // Initialize error tracking
      if (env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING) {
        initializeSentry(env.NEXT_PUBLIC_SENTRY_DSN)
      }

      // Initialize analytics
      if (env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
        initializeAnalytics(env.NEXT_PUBLIC_ANALYTICS_ID)
      }

      logger.info('Production services initialized')
    }
  }, [])

  return <App />
}
```

---

## Circuit Breaker Pattern

Prevent cascading failures with circuit breaker + retry.

```typescript
import { CircuitBreaker } from '@/lib/api/retry'
import { logger } from '@/lib/logger'
import { storage } from '@/lib/storage/local-storage'

// Create circuit breaker for external service
const paymentServiceBreaker = new CircuitBreaker(5, 60000) // 5 failures, 60s timeout

async function processPayment(amount: number, userId: string) {
  try {
    const result = await paymentServiceBreaker.execute(async () => {
      logger.info('Processing payment', { amount, userId })

      const response = await fetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ amount, userId }),
      })

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.status}`)
      }

      return await response.json()
    })

    logger.info('Payment successful', { amount, userId })
    return result
  } catch (error) {
    const breakerState = paymentServiceBreaker.getState()

    if (breakerState.state === 'open') {
      logger.error('Payment service circuit breaker open', error, {
        failures: breakerState.failures,
        userId,
        amount,
      })

      // Store failed payment for retry later
      const failedPayments = storage.get<any[]>('failed-payments', [])
      failedPayments.push({ amount, userId, timestamp: Date.now() })
      storage.set('failed-payments', failedPayments)

      throw new Error('Payment service temporarily unavailable. Your payment will be retried.')
    }

    logger.error('Payment failed', error, { userId, amount })
    throw error
  }
}
```

---

## Best Practices

### 1. Always Combine Error Handling with Logging

```typescript
try {
  await operation()
} catch (error) {
  logger.error('Operation failed', error, context)
  throw error // Re-throw after logging
}
```

### 2. Use Feature Flags for Risky Features

```typescript
if (isFeatureEnabled('risky_feature')) {
  return (
    <ErrorBoundary fallback={<SafeFallback />}>
      <RiskyFeature />
    </ErrorBoundary>
  )
}
```

### 3. Cache with Appropriate TTLs

```typescript
// Short-lived: User session data
storage.set('session', data, { ttl: 3600000 }) // 1 hour

// Medium-lived: API responses
storage.set('api-cache', data, { ttl: 300000 }) // 5 minutes

// Long-lived: App configuration
storage.set('config', data, { ttl: 86400000 }) // 24 hours
```

### 4. Monitor Performance in Development

```typescript
if (isDevelopment()) {
  usePerformanceMetrics('Component')
  useWhyDidYouUpdate('Component', props)
  useMemoryLeakDetector('Component')
}
```

### 5. Graceful Degradation for Network Issues

```typescript
const isOnline = useOnline()
const isSlowConnection = useIsSlowConnection()

// Load lower quality images on slow connection
const imageQuality = isSlowConnection ? 'low' : 'high'

// Use cached data when offline
const data = isOnline ? await fetchFresh() : storage.get('cache')
```

---

## Testing Integration Examples

```typescript
// Mock utilities in tests
jest.mock('@/lib/logger')
jest.mock('@/lib/features/flags')
jest.mock('@/hooks/use-online')

describe('Feature with utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    featureFlags.override('my_feature', true)
    ;(useOnline as jest.Mock).mockReturnValue(true)
  })

  it('works with all utilities', async () => {
    // Test implementation
  })
})
```

---

## Performance Tips

1. **Debounce user input** before expensive operations
2. **Cache API responses** with appropriate TTLs
3. **Use circuit breakers** for external services
4. **Monitor render times** in development
5. **Feature flag risky code** for safe rollouts
6. **Handle offline gracefully** with cached data
7. **Log at appropriate levels** (debug in dev, error in prod)
8. **Retry transient failures** with exponential backoff

---

**See Also**:

- [Utilities Documentation](./README.md)
- [API Documentation](../api/API.md)
- [Performance Guide](performance/performance-summary.md)
