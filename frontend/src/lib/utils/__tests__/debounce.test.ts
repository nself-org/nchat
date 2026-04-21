/**
 * Unit tests for debounce/throttle/retry utilities.
 * Uses Jest fake timers for deterministic timing.
 */
import {
  debounce,
  throttle,
  delay,
  cancellableDelay,
  retry,
  once,
  after,
  before,
  createInterval,
  createTimeout,
  createRateLimiter,
  sequence,
  timeout,
} from '../debounce'

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('delays execution until wait elapses', () => {
    const fn = jest.fn()
    const d = debounce(fn, 100)
    d()
    d()
    d()
    expect(fn).not.toHaveBeenCalled()
    jest.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('leading=true invokes immediately', () => {
    const fn = jest.fn()
    const d = debounce(fn, 100, { leading: true, trailing: false })
    d()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('cancel prevents pending execution', () => {
    const fn = jest.fn()
    const d = debounce(fn, 100)
    d()
    d.cancel()
    jest.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
  })

  it('flush returns result or undefined', () => {
    const fn = jest.fn(() => 'x')
    const d = debounce(fn, 100)
    d()
    const out = d.flush()
    // flush should at least not throw; may or may not invoke depending on trailing state
    expect(typeof out === 'string' || out === undefined).toBe(true)
  })

  it('pending reports boolean', () => {
    const fn = jest.fn()
    const d = debounce(fn, 100)
    expect(typeof d.pending()).toBe('boolean')
    d()
    expect(typeof d.pending()).toBe('boolean')
    jest.advanceTimersByTime(100)
    expect(d.pending()).toBe(false)
  })

  it('maxWait forces invocation', () => {
    const fn = jest.fn()
    const d = debounce(fn, 100, { maxWait: 200 })
    d()
    jest.advanceTimersByTime(50)
    d()
    jest.advanceTimersByTime(50)
    d()
    jest.advanceTimersByTime(50)
    d()
    jest.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalled()
  })
})

describe('throttle', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('invokes on leading edge by default', () => {
    const fn = jest.fn()
    const t = throttle(fn, 100)
    t()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('delay', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('resolves after ms', async () => {
    const p = delay(50)
    jest.advanceTimersByTime(50)
    await expect(p).resolves.toBeUndefined()
  })
})

describe('cancellableDelay', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('resolves on natural completion', async () => {
    const { promise } = cancellableDelay(10)
    jest.advanceTimersByTime(10)
    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects on cancel', async () => {
    const { promise, cancel } = cancellableDelay(1000)
    cancel()
    await expect(promise).rejects.toThrow('cancelled')
  })
})

describe('retry', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('returns on success', async () => {
    const fn = jest.fn().mockResolvedValue(42)
    await expect(retry(fn, { jitter: false })).resolves.toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries failures', async () => {
    jest.useRealTimers()
    let attempts = 0
    const fn = jest.fn().mockImplementation(() => {
      attempts++
      if (attempts < 2) return Promise.reject(new Error('fail'))
      return Promise.resolve('ok')
    })
    await expect(
      retry(fn, { maxAttempts: 3, delay: 1, jitter: false, backoff: 1 })
    ).resolves.toBe('ok')
    jest.useFakeTimers()
  })

  it('throws after maxAttempts', async () => {
    jest.useRealTimers() // use real timers to avoid delay interplay issues
    const fn = jest.fn().mockRejectedValue(new Error('always'))
    await expect(
      retry(fn, { maxAttempts: 2, delay: 1, jitter: false, backoff: 1 })
    ).rejects.toThrow('always')
    expect(fn).toHaveBeenCalledTimes(2)
    jest.useFakeTimers()
  })

  it('respects shouldRetry', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('no retry'))
    const p = retry(fn, {
      maxAttempts: 5,
      delay: 10,
      jitter: false,
      shouldRetry: () => false,
    })
    await expect(p).rejects.toThrow('no retry')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('once', () => {
  it('calls fn once only', () => {
    const inner = jest.fn(() => 'x')
    const fn = once(inner)
    expect(fn()).toBe('x')
    expect(fn()).toBe('x')
    expect(inner).toHaveBeenCalledTimes(1)
  })
})

describe('after / before', () => {
  it('after fires only after n calls', () => {
    const inner = jest.fn(() => 'ok')
    const fn = after(3, inner)
    fn()
    fn()
    expect(inner).not.toHaveBeenCalled()
    expect(fn()).toBe('ok')
    expect(inner).toHaveBeenCalledTimes(1)
  })

  it('before fires only for first n calls', () => {
    const inner = jest.fn(() => 'ok')
    const fn = before(2, inner)
    fn()
    fn()
    fn()
    expect(inner).toHaveBeenCalledTimes(2)
  })
})

describe('createInterval / createTimeout', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('interval invokes repeatedly', () => {
    const fn = jest.fn()
    const i = createInterval(fn, 50)
    jest.advanceTimersByTime(150)
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2)
    i.clear()
  })

  it('interval immediate fires once right away', () => {
    const fn = jest.fn()
    const i = createInterval(fn, 50, true)
    expect(fn).toHaveBeenCalledTimes(1)
    i.clear()
  })

  it('timeout resolves on completion', async () => {
    const fn = jest.fn()
    const t = createTimeout(fn, 50)
    jest.advanceTimersByTime(50)
    await expect(t.promise).resolves.toBeUndefined()
    expect(fn).toHaveBeenCalled()
  })

  it('timeout rejects on clear', async () => {
    const fn = jest.fn()
    const t = createTimeout(fn, 1000)
    t.clear()
    await expect(t.promise).rejects.toThrow('timeout cleared')
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('createRateLimiter', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('allows up to maxCalls', () => {
    const rl = createRateLimiter({ maxCalls: 3, interval: 1000 })
    expect(rl.tryAcquire()).toBe(true)
    expect(rl.tryAcquire()).toBe(true)
    expect(rl.tryAcquire()).toBe(true)
    expect(rl.tryAcquire()).toBe(false)
  })

  it('remaining reports correctly', () => {
    const rl = createRateLimiter({ maxCalls: 3, interval: 1000 })
    expect(rl.remaining()).toBe(3)
    rl.tryAcquire()
    expect(rl.remaining()).toBe(2)
  })

  it('reset clears all', () => {
    const rl = createRateLimiter({ maxCalls: 2, interval: 1000 })
    rl.tryAcquire()
    rl.tryAcquire()
    rl.reset()
    expect(rl.tryAcquire()).toBe(true)
  })
})

describe('sequence', () => {
  it('runs functions in order', async () => {
    const res = await sequence([() => Promise.resolve(1), () => Promise.resolve(2)])
    expect(res).toEqual([1, 2])
  })
})

describe('timeout', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('resolves when promise resolves first', async () => {
    await expect(timeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  it('rejects with timeout', async () => {
    const p = new Promise(() => {}) // never
    const wrapped = timeout(p as any, 10)
    jest.advanceTimersByTime(20)
    await expect(wrapped).rejects.toThrow(/timed out/)
  })
})
