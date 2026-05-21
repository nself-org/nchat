/**
 * Deterministic Test Helpers
 *
 * Utilities for creating reproducible, non-flaky E2E tests
 * - Deterministic ID generation (no Date.now())
 * - Seeded random values (no Math.random())
 * - Smart wait conditions (no setTimeout)
 * - Test context isolation
 */

/**
 * Deterministic test ID generator
 * Uses incrementing counter instead of Date.now()
 *
 * @example
 * const gen = new TestIdGenerator()
 * gen.generate('message') // 'message-1'
 * gen.generate('message') // 'message-2'
 * gen.generate('channel') // 'channel-1'
 */
export class TestIdGenerator {
  private counters: Map<string, number> = new Map()

  /**
   * Generate a unique ID with the given prefix
   * @param prefix - Prefix for the ID (default: 'test')
   * @returns Unique ID like 'prefix-1', 'prefix-2', etc.
   */
  generate(prefix: string = 'test'): string {
    const current = this.counters.get(prefix) || 0
    const next = current + 1
    this.counters.set(prefix, next)
    return `${prefix}-${next}`
  }

  /**
   * Reset counter for a prefix (or all counters)
   * @param prefix - Prefix to reset, or undefined to reset all
   */
  reset(prefix?: string): void {
    if (prefix) {
      this.counters.delete(prefix)
    } else {
      this.counters.clear()
    }
  }

  /**
   * Get current count for a prefix
   */
  getCount(prefix: string): number {
    return this.counters.get(prefix) || 0
  }
}

// Global instance for convenience
export const testIdGenerator = new TestIdGenerator()

/**
 * Convenience function to generate deterministic test IDs
 *
 * @example
 * const msg1 = generateTestId('message') // 'message-1'
 * const msg2 = generateTestId('message') // 'message-2'
 * const ch1 = generateTestId('channel') // 'channel-1'
 */
export function generateTestId(prefix: string = 'test'): string {
  return testIdGenerator.generate(prefix)
}

/**
 * Seeded random number generator for deterministic "random" values
 * Uses Linear Congruential Generator (LCG) algorithm
 *
 * @example
 * const rng = new SeededRandom('my-test-seed')
 * rng.next() // Always returns same sequence
 * rng.nextInt(1, 10) // Random int between 1-10
 * rng.choose(['a', 'b', 'c']) // Random element
 */
export class SeededRandom {
  private seed: number

  constructor(seedString: string) {
    this.seed = this.hashString(seedString)
  }

  /**
   * Hash a string to a number for seeding
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
  }

  /**
   * Get next random number between 0 and 1
   */
  next(): number {
    // Linear Congruential Generator (LCG)
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }

  /**
   * Get random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * Choose random element from array
   */
  choose<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array')
    }
    return array[this.nextInt(0, array.length - 1)]
  }

  /**
   * Shuffle array deterministically
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /**
   * Generate random string of given length
   */
  string(length: number, chars: string = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
    return Array.from({ length }, () => this.choose(chars.split(''))).join('')
  }
}

/**
 * Smart wait helper - waits for condition with exponential backoff
 * Replacement for waitForTimeout() with proper condition checking
 *
 * @example
 * await waitForCondition(
 *   async () => await element.isVisible(),
 *   { timeout: 10000, description: 'element to be visible' }
 * )
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  options: {
    timeout?: number
    interval?: number
    description?: string
  } = {}
): Promise<void> {
  const { timeout = 10000, interval = 100, description = 'condition' } = options

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) {
        return
      }
    } catch (error) {
      // Condition evaluation failed, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Timeout waiting for ${description} after ${timeout}ms`)
}

/**
 * Retry helper for flaky operations (use sparingly!)
 * Should only be used for network operations, not as a band-aid for timing issues
 *
 * @example
 * const result = await retry(
 *   async () => await fetchData(),
 *   { attempts: 3, delay: 1000 }
 * )
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number
    delay?: number
    exponentialBackoff?: boolean
    description?: string
  } = {}
): Promise<T> {
  const { attempts = 3, delay = 1000, exponentialBackoff = false, description = 'operation' } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (attempt < attempts) {
        const waitTime = exponentialBackoff ? delay * Math.pow(2, attempt - 1) : delay
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw new Error(`Failed ${description} after ${attempts} attempts: ${lastError?.message}`)
}

/**
 * Test context with unique IDs per test
 * Automatically resets between tests
 *
 * @example
 * const ctx = new TestContext('my-test')
 * ctx.uniqueId('message') // 'my-test-message-1'
 * ctx.uniqueId('message') // 'my-test-message-2'
 */
export class TestContext {
  private testName: string
  private generator: TestIdGenerator
  private rng: SeededRandom

  constructor(testName: string) {
    this.testName = this.sanitizeTestName(testName)
    this.generator = new TestIdGenerator()
    this.rng = new SeededRandom(this.testName)
  }

  /**
   * Sanitize test name for use in IDs
   */
  private sanitizeTestName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  /**
   * Generate unique ID with test name prefix
   */
  uniqueId(prefix: string = 'test'): string {
    return this.generator.generate(`${this.testName}-${prefix}`)
  }

  /**
   * Get seeded random number generator
   */
  random(): SeededRandom {
    return this.rng
  }

  /**
   * Cleanup (reset counters)
   */
  cleanup(): void {
    this.generator.reset()
  }
}

/**
 * Create isolated test data that won't conflict with other tests
 *
 * @example
 * const data = createTestData('my-test', {
 *   users: 3,
 *   channels: 2,
 *   messages: 10
 * })
 */
export function createTestData(
  testName: string,
  config: {
    users?: number
    channels?: number
    messages?: number
  }
): {
  users: Array<{ id: string; email: string; name: string }>
  channels: Array<{ id: string; name: string }>
  messages: Array<{ id: string; content: string }>
} {
  const ctx = new TestContext(testName)
  const rng = ctx.random()

  const users = Array.from({ length: config.users || 0 }, () => ({
    id: ctx.uniqueId('user'),
    email: `${ctx.uniqueId('email')}@example.com`,
    name: `User ${rng.string(8)}`,
  }))

  const channels = Array.from({ length: config.channels || 0 }, () => ({
    id: ctx.uniqueId('channel'),
    name: ctx.uniqueId('channel'),
  }))

  const messages = Array.from({ length: config.messages || 0 }, () => ({
    id: ctx.uniqueId('message'),
    content: `Test message ${ctx.uniqueId('msg')}`,
  }))

  return { users, channels, messages }
}

/**
 * Wait for network idle (all pending requests complete)
 *
 * @example
 * await waitForNetworkIdle(page, { timeout: 5000 })
 */
export async function waitForNetworkIdle(
  page: any,
  options: {
    timeout?: number
    idleTime?: number
  } = {}
): Promise<void> {
  const { timeout = 30000, idleTime = 500 } = options

  await page.waitForLoadState('load', { timeout })

  // Extra safety: wait for no new requests for idleTime
  let lastRequestTime = Date.now()
  const checkIdle = () => Date.now() - lastRequestTime > idleTime

  page.on('request', () => {
    lastRequestTime = Date.now()
  })

  await waitForCondition(checkIdle, {
    timeout,
    description: 'network idle',
  })
}

/**
 * Create deterministic timestamp for testing
 * Returns fixed timestamp instead of Date.now()
 *
 * @example
 * const timestamp = createTestTimestamp('2024-01-01T00:00:00Z')
 */
export function createTestTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

/**
 * Create sequence of deterministic timestamps
 *
 * @example
 * const timestamps = createTimestampSequence('2024-01-01T00:00:00Z', 5, 1000)
 * // Returns 5 timestamps, 1 second apart
 */
export function createTimestampSequence(
  startIso: string,
  count: number,
  intervalMs: number
): number[] {
  const start = createTestTimestamp(startIso)
  return Array.from({ length: count }, (_, i) => start + i * intervalMs)
}

/**
 * Performance measurement helper
 * Uses performance.now() which is monotonic (not affected by system time changes)
 *
 * @example
 * const perf = measurePerformance('my operation')
 * await doWork()
 * const duration = perf.end()
 * expect(duration).toBeLessThan(1000)
 */
export class PerformanceMeasurement {
  private startTime: number
  private name: string

  constructor(name: string) {
    this.name = name
    this.startTime = performance.now()
  }

  /**
   * End measurement and return duration in ms
   */
  end(): number {
    const duration = performance.now() - this.startTime
    return duration
  }

  /**
   * End and log measurement
   */
  endAndLog(): number {
    const duration = this.end()
    console.log(`[PERF] ${this.name}: ${duration.toFixed(2)}ms`)
    return duration
  }
}

export function measurePerformance(name: string): PerformanceMeasurement {
  return new PerformanceMeasurement(name)
}

/**
 * Create mock data with deterministic values
 *
 * @example
 * const mock = createMockData('test-seed')
 * const user = mock.user()
 * const message = mock.message()
 */
export class MockDataGenerator {
  private rng: SeededRandom

  constructor(seed: string) {
    this.rng = new SeededRandom(seed)
  }

  user() {
    return {
      id: `user-${this.rng.string(8)}`,
      email: `user-${this.rng.string(8)}@example.com`,
      name: this.rng.choose(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']),
      avatar: `https://i.pravatar.cc/150?u=${this.rng.string(8)}`,
    }
  }

  channel() {
    return {
      id: `channel-${this.rng.string(8)}`,
      name: this.rng.choose(['general', 'random', 'dev', 'support', 'announcements']),
      type: this.rng.choose(['public', 'private'] as const),
    }
  }

  message() {
    const templates = [
      'Hello everyone!',
      'How are you doing?',
      'Check out this link',
      'Great work team!',
      'Let me know if you need help',
    ]
    return {
      id: `message-${this.rng.string(8)}`,
      content: this.rng.choose(templates),
      timestamp: Date.now() + this.rng.nextInt(-100000, 100000),
    }
  }
}

export function createMockData(seed: string): MockDataGenerator {
  return new MockDataGenerator(seed)
}

/**
 * Snapshot comparison helper for visual regression
 * Creates deterministic filenames for screenshots
 *
 * @example
 * const snapshot = createSnapshot('login-page', { platform: 'web', theme: 'dark' })
 * await page.screenshot({ path: snapshot.path })
 */
export function createSnapshot(
  name: string,
  metadata: Record<string, string> = {}
): {
  name: string
  path: string
  metadata: Record<string, string>
} {
  const parts = [name, ...Object.entries(metadata).map(([k, v]) => `${k}-${v}`)]
  const filename = parts.join('_') + '.png'

  return {
    name,
    path: `test-results/snapshots/${filename}`,
    metadata,
  }
}
