/**
 * Timing utilities for nself-chat
 * @module utils/debounce
 */

/**
 * Debounce options
 */
export interface DebounceOptions {
  /** Call on the leading edge (default: false) */
  leading?: boolean;
  /** Call on the trailing edge (default: true) */
  trailing?: boolean;
  /** Maximum wait time before forced execution */
  maxWait?: number;
}

/**
 * Debounced function interface
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  /** Call the debounced function */
  (...args: Parameters<T>): ReturnType<T> | undefined;
  /** Cancel pending execution */
  cancel(): void;
  /** Execute immediately */
  flush(): ReturnType<T> | undefined;
  /** Check if there's a pending execution */
  pending(): boolean;
}

/**
 * Create a debounced function that delays execution until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * @param fn - Function to debounce
 * @param wait - Wait time in milliseconds
 * @param options - Debounce options
 * @returns Debounced function
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   // console.log('Searching:', query);
 * }, 300);
 *
 * debouncedSearch('hello'); // Will execute after 300ms of no calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
  options: DebounceOptions = {},
): DebouncedFunction<T> {
  const { leading = false, trailing = true, maxWait } = options;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: unknown;
  let result: ReturnType<T> | undefined;

  const useMaxWait = maxWait !== undefined;
  const maxWaitMs = useMaxWait ? Math.max(maxWait, wait) : 0;

  function invokeFunc(time: number): ReturnType<T> | undefined {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;
    result = fn.apply(thisArg, args!) as ReturnType<T>;
    return result;
  }

  function startTimer(
    pendingFunc: () => void,
    remainingWait: number,
  ): ReturnType<typeof setTimeout> {
    return setTimeout(pendingFunc, remainingWait);
  }

  function cancelTimer(id: ReturnType<typeof setTimeout> | null): void {
    if (id !== null) {
      clearTimeout(id);
    }
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;

    if (useMaxWait) {
      maxTimeoutId = startTimer(maxWaitExpired, maxWaitMs);
    }

    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return useMaxWait
      ? Math.min(timeWaiting, maxWaitMs - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (useMaxWait && timeSinceLastInvoke >= maxWaitMs)
    );
  }

  function timerExpired(): void {
    const time = Date.now();

    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }

    timeoutId = startTimer(timerExpired, remainingWait(time));
  }

  function maxWaitExpired(): void {
    const time = Date.now();

    if (shouldInvoke(time)) {
      trailingEdge(time);
    }
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeoutId = null;
    cancelTimer(maxTimeoutId);
    maxTimeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }

    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function cancel(): void {
    cancelTimer(timeoutId);
    cancelTimer(maxTimeoutId);
    timeoutId = null;
    maxTimeoutId = null;
    lastInvokeTime = 0;
    lastCallTime = undefined;
    lastArgs = undefined;
    lastThis = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    if (timeoutId === null) {
      return result;
    }
    return trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(
    this: unknown,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(time);
      }
      if (useMaxWait) {
        cancelTimer(timeoutId);
        timeoutId = startTimer(timerExpired, wait);
        return invokeFunc(time);
      }
    }

    if (timeoutId === null) {
      timeoutId = startTimer(timerExpired, wait);
    }

    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced as DebouncedFunction<T>;
}

/**
 * Throttle options
 */
export interface ThrottleOptions {
  /** Call on the leading edge (default: true) */
  leading?: boolean;
  /** Call on the trailing edge (default: true) */
  trailing?: boolean;
}

/**
 * Throttled function interface
 */
export interface ThrottledFunction<T extends (...args: unknown[]) => unknown> {
  /** Call the throttled function */
  (...args: Parameters<T>): ReturnType<T> | undefined;
  /** Cancel pending execution */
  cancel(): void;
  /** Execute immediately */
  flush(): ReturnType<T> | undefined;
}

/**
 * Create a throttled function that only executes at most once per wait period.
 * @param fn - Function to throttle
 * @param wait - Wait time in milliseconds
 * @param options - Throttle options
 * @returns Throttled function
 * @example
 * const throttledScroll = throttle(() => {
 *   // console.log('Scroll event');
 * }, 100);
 *
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {},
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;

  return debounce(fn, wait, {
    leading,
    trailing,
    maxWait: wait,
  }) as ThrottledFunction<T>;
}

/**
 * Create a Promise-based delay
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 * @example
 * await delay(1000); // Wait 1 second
 * // console.log('Done!');
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a cancellable delay
 * @param ms - Delay in milliseconds
 * @returns Object with promise and cancel function
 * @example
 * const { promise, cancel } = cancellableDelay(5000);
 * setTimeout(cancel, 1000); // Cancel after 1 second
 * await promise; // Rejects with 'cancelled'
 */
export function cancellableDelay(ms: number): {
  promise: Promise<void>;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout>;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<void>((resolve, rej) => {
    reject = rej;
    timeoutId = setTimeout(resolve, ms);
  });

  const cancel = () => {
    clearTimeout(timeoutId);
    reject(new Error("cancelled"));
  };

  return { promise, cancel };
}

/**
 * Retry options
 */
export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  delay?: number;
  /** Backoff multiplier (default: 2) */
  backoff?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Add jitter to delay (default: true) */
  jitter?: boolean;
  /** Function to determine if retry should happen */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback on each retry */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Promise resolving to the function result
 * @example
 * const result = await retry(
 *   () => fetchData(),
 *   { maxAttempts: 5, delay: 1000, backoff: 2 }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: initialDelay = 1000,
    backoff = 2,
    maxDelay = 30000,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error;
  let currentDelay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate delay with optional jitter
      let waitTime = Math.min(currentDelay, maxDelay);
      if (jitter) {
        waitTime = waitTime * (0.5 + Math.random());
      }

      if (onRetry) {
        onRetry(lastError, attempt, waitTime);
      }

      await delay(waitTime);
      currentDelay *= backoff;
    }
  }

  throw lastError!;
}

/**
 * Create a function that executes at most once
 * @param fn - Function to execute once
 * @returns Function that only executes once
 * @example
 * const init = once(() => // console.log('Initialized'));
 * init(); // Logs 'Initialized'
 * init(); // Does nothing
 */
export function once<T extends (...args: unknown[]) => unknown>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let called = false;
  let result: ReturnType<T>;

  return function (
    this: unknown,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    if (!called) {
      called = true;
      result = fn.apply(this, args) as ReturnType<T>;
    }
    return result;
  };
}

/**
 * Execute a function after a certain number of calls
 * @param n - Number of calls before execution
 * @param fn - Function to execute
 * @returns Wrapped function
 * @example
 * const afterThree = after(3, () => // console.log('Called!'));
 * afterThree(); // Nothing
 * afterThree(); // Nothing
 * afterThree(); // Logs 'Called!'
 */
export function after<T extends (...args: unknown[]) => unknown>(
  n: number,
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let count = 0;

  return function (
    this: unknown,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    count++;
    if (count >= n) {
      return fn.apply(this, args) as ReturnType<T>;
    }
    return undefined;
  };
}

/**
 * Execute a function only for the first n calls
 * @param n - Maximum number of calls
 * @param fn - Function to execute
 * @returns Wrapped function
 * @example
 * const onlyThree = before(3, () => // console.log('Called!'));
 * onlyThree(); // Logs 'Called!'
 * onlyThree(); // Logs 'Called!'
 * onlyThree(); // Logs 'Called!'
 * onlyThree(); // Nothing
 */
export function before<T extends (...args: unknown[]) => unknown>(
  n: number,
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let count = 0;
  let result: ReturnType<T>;

  return function (
    this: unknown,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    if (count < n) {
      count++;
      result = fn.apply(this, args) as ReturnType<T>;
    }
    return result;
  };
}

/**
 * Create an interval that can be easily cleaned up
 * @param fn - Function to execute
 * @param ms - Interval in milliseconds
 * @param immediate - Execute immediately (default: false)
 * @returns Object with clear function
 */
export function createInterval(
  fn: () => void,
  ms: number,
  immediate: boolean = false,
): { clear: () => void } {
  if (immediate) {
    fn();
  }

  const id = setInterval(fn, ms);

  return {
    clear: () => clearInterval(id),
  };
}

/**
 * Create a timeout that can be easily cleaned up
 * @param fn - Function to execute
 * @param ms - Timeout in milliseconds
 * @returns Object with clear function and promise
 */
export function createTimeout(
  fn: () => void,
  ms: number,
): { clear: () => void; promise: Promise<void> } {
  let timeoutId: ReturnType<typeof setTimeout>;
  let resolve: () => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
    timeoutId = setTimeout(() => {
      fn();
      resolve();
    }, ms);
  });

  return {
    clear: () => {
      clearTimeout(timeoutId);
      reject(new Error("timeout cleared"));
    },
    promise,
  };
}

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Maximum number of calls per interval */
  maxCalls: number;
  /** Interval in milliseconds */
  interval: number;
}

/**
 * Create a rate limiter
 * @param options - Rate limiter options
 * @returns Rate limiter object
 * @example
 * const limiter = createRateLimiter({ maxCalls: 5, interval: 1000 });
 * if (limiter.tryAcquire()) {
 *   // console.log('Allowed');
 * } else {
 *   // console.log('Rate limited');
 * }
 */
export function createRateLimiter(options: RateLimiterOptions): {
  tryAcquire: () => boolean;
  reset: () => void;
  remaining: () => number;
} {
  const { maxCalls, interval } = options;
  const calls: number[] = [];

  return {
    tryAcquire(): boolean {
      const now = Date.now();

      // Remove old calls outside the interval
      while (calls.length > 0 && calls[0] <= now - interval) {
        calls.shift();
      }

      if (calls.length < maxCalls) {
        calls.push(now);
        return true;
      }

      return false;
    },

    reset(): void {
      calls.length = 0;
    },

    remaining(): number {
      const now = Date.now();

      // Remove old calls
      while (calls.length > 0 && calls[0] <= now - interval) {
        calls.shift();
      }

      return Math.max(0, maxCalls - calls.length);
    },
  };
}

/**
 * Execute functions in sequence with delay between each
 * @param fns - Array of functions to execute
 * @param delayMs - Delay between each function
 * @returns Promise that resolves when all functions complete
 */
export async function sequence<T>(
  fns: (() => Promise<T>)[],
  delayMs: number = 0,
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < fns.length; i++) {
    if (i > 0 && delayMs > 0) {
      await delay(delayMs);
    }
    results.push(await fns[i]());
  }

  return results;
}

/**
 * Timeout a promise
 * @param promise - Promise to timeout
 * @param ms - Timeout in milliseconds
 * @param message - Error message on timeout
 * @returns Promise that rejects on timeout
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string = "Operation timed out",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
