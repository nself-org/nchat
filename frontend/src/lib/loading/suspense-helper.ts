/**
 * Suspense Helper Utilities
 * Provides type-safe utilities for React Suspense and lazy loading
 */

import { ComponentType, LazyExoticComponent, lazy } from "react";

/** LazyExoticComponent with optional displayName for debugging */
type LazyComponentWithDisplayName<T extends ComponentType<any>> =
  LazyExoticComponent<T> & {
    displayName?: string;
  };

/**
 * Type-safe lazy loading with better error messages
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  displayName?: string,
): LazyExoticComponent<T> {
  const LazyComponent = lazy(importFn);

  if (displayName) {
    (LazyComponent as LazyComponentWithDisplayName<T>).displayName =
      displayName;
  }

  return LazyComponent;
}

/**
 * Named export lazy loading
 * For components that aren't default exports
 */
export function lazyLoadNamed<T extends ComponentType<any>>(
  importFn: () => Promise<any>,
  exportName: string,
  displayName?: string,
): LazyExoticComponent<T> {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    return { default: module[exportName] as T };
  });

  if (displayName) {
    (LazyComponent as LazyComponentWithDisplayName<T>).displayName =
      displayName;
  }

  return LazyComponent;
}

/**
 * Retry lazy loading with exponential backoff
 * Useful for handling network failures
 */
export function lazyLoadWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    displayName?: string;
  } = {},
): LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000, displayName } = options;

  const LazyComponent = lazy(async () => {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on last attempt
        if (i < maxRetries - 1) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Failed to load component");
  });

  if (displayName) {
    (LazyComponent as LazyComponentWithDisplayName<T>).displayName =
      displayName;
  }

  return LazyComponent;
}

/**
 * Preload a lazy component
 * Call this to start loading before the component is needed
 */
export function preloadComponent<T extends ComponentType<any>>(
  LazyComponent: LazyExoticComponent<T>,
): void {
  // Accessing _payload triggers the load
  // This is an internal React implementation detail but widely used
  const payload = (LazyComponent as any)._payload;
  if (payload && payload._status === -1) {
    payload._result();
  }
}

/**
 * Create a resource for data fetching with Suspense
 * Implements the Suspense pattern for async data
 */
export function createResource<T>(promise: Promise<T>): { read: () => T } {
  let status: "pending" | "success" | "error" = "pending";
  let result: T;
  let error: Error;

  const suspender = promise.then(
    (data) => {
      status = "success";
      result = data;
    },
    (err) => {
      status = "error";
      error = err;
    },
  );

  return {
    read() {
      switch (status) {
        case "pending":
          throw suspender;
        case "error":
          throw error;
        case "success":
          return result;
      }
    },
  };
}

/**
 * Cache for resources to prevent duplicate fetches
 */
class ResourceCache<T> {
  private cache = new Map<string, { read: () => T }>();

  get(key: string, fetcher: () => Promise<T>): { read: () => T } {
    if (!this.cache.has(key)) {
      this.cache.set(key, createResource(fetcher()));
    }
    return this.cache.get(key)!;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Create a resource cache for data fetching
 */
export function createResourceCache<T>(): ResourceCache<T> {
  return new ResourceCache<T>();
}

/**
 * Wrapper for fetch API that works with Suspense
 */
export function suspenseFetch<T>(
  url: string,
  options?: RequestInit,
): { read: () => T } {
  const promise = fetch(url, options).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json() as Promise<T>;
  });

  return createResource(promise);
}

/**
 * Create a suspense-friendly data fetcher
 */
export function createSuspenseFetcher<TArgs extends any[], TData>(
  fetchFn: (...args: TArgs) => Promise<TData>,
) {
  const cache = new Map<string, { read: () => TData }>();

  return {
    fetch: (...args: TArgs) => {
      const key = JSON.stringify(args);

      if (!cache.has(key)) {
        cache.set(key, createResource(fetchFn(...args)));
      }

      return cache.get(key)!;
    },
    invalidate: (...args: TArgs) => {
      const key = JSON.stringify(args);
      cache.delete(key);
    },
    clear: () => {
      cache.clear();
    },
  };
}

/**
 * Wait for multiple resources in parallel
 */
export function waitForAll<T extends any[]>(resources: {
  [K in keyof T]: { read: () => T[K] };
}): {
  read: () => T;
} {
  return {
    read() {
      return resources.map((resource) => resource.read()) as T;
    },
  };
}

/**
 * Race multiple resources (return first to resolve)
 */
export function raceResources<T>(resources: Array<{ read: () => T }>): {
  read: () => T;
} {
  let firstResult: T | undefined;
  let hasResult = false;

  // Try to read from each resource
  for (const resource of resources) {
    try {
      const result = resource.read();
      if (!hasResult) {
        firstResult = result;
        hasResult = true;
      }
      break;
    } catch (error) {
      // If it's a promise, it will be thrown again
      if (error instanceof Promise) {
        throw error;
      }
      // Otherwise it's an actual error, continue to next
      continue;
    }
  }

  return {
    read() {
      if (hasResult) {
        return firstResult!;
      }
      throw new Error("No resource resolved successfully");
    },
  };
}

/**
 * Utility to check if a value is a promise
 */
export function isPromise(value: any): value is Promise<any> {
  return value && typeof value.then === "function";
}

/**
 * Utility to check if an error is a Suspense promise
 */
export function isSuspensePromise(error: any): error is Promise<any> {
  return isPromise(error);
}

/**
 * Create a deferred resource that can be manually resolved
 */
export function createDeferredResource<T>(): {
  resource: { read: () => T };
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolvePromise: (value: T) => void;
  let rejectPromise: (error: Error) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const resource = createResource(promise);

  return {
    resource,
    resolve: (value: T) => resolvePromise(value),
    reject: (error: Error) => rejectPromise(error),
  };
}

/**
 * Type guard for lazy components
 */
export function isLazyComponent(
  component: any,
): component is LazyExoticComponent<any> {
  return (
    component &&
    typeof component === "object" &&
    "$$typeof" in component &&
    "_payload" in component
  );
}

/**
 * Get loading state from a resource
 */
export function getResourceState<T>(resource: {
  read: () => T;
}): "loading" | "success" | "error" {
  try {
    resource.read();
    return "success";
  } catch (error) {
    if (isSuspensePromise(error)) {
      return "loading";
    }
    return "error";
  }
}

/**
 * Batch multiple lazy loads together
 * Useful for preloading routes
 */
export function batchPreload(
  components: Array<LazyExoticComponent<any>>,
): Promise<void[]> {
  return Promise.all(
    components.map((component) => {
      const payload = (component as any)._payload;
      if (payload && payload._status === -1) {
        return payload._result();
      }
      return Promise.resolve();
    }),
  );
}

/**
 * Create a lazy component with automatic retries and timeout
 */
export function lazyLoadWithTimeout<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    timeout?: number;
    maxRetries?: number;
    displayName?: string;
  } = {},
): LazyExoticComponent<T> {
  const { timeout = 10000, maxRetries = 3, displayName } = options;

  const importWithTimeout = async () => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Component load timeout")), timeout),
    );

    return Promise.race([importFn(), timeoutPromise]);
  };

  return lazyLoadWithRetry(importWithTimeout, {
    maxRetries,
    displayName,
  });
}
