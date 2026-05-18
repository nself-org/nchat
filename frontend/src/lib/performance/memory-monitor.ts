/**
 * Memory Monitor
 *
 * Detects and helps prevent memory leaks in React applications.
 * Monitors memory usage, detects patterns, and provides debugging tools.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface MemorySnapshot {
  timestamp: number;
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

export interface MemoryLeak {
  type: "event-listener" | "timer" | "subscription" | "cache" | "component";
  description: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

export interface MemoryStats {
  current: MemorySnapshot;
  history: MemorySnapshot[];
  trend: "stable" | "increasing" | "decreasing";
  leaks: MemoryLeak[];
}

// =============================================================================
// Memory Monitor
// =============================================================================

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 100;
  private interval?: NodeJS.Timeout;
  private enabled = false;
  private thresholdMB = 100; // Alert if memory exceeds this

  // Track potential leak sources
  private eventListeners = new Map<string, Set<Function>>();
  private timers = new Set<number>();
  private intervals = new Set<number>();
  private subscriptions = new Set<{ unsubscribe: () => void }>();

  /**
   * Start monitoring memory
   */
  start(intervalMs = 5000): void {
    if (this.enabled) return;
    if (typeof window === "undefined") return;

    this.enabled = true;
    this.interval = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.enabled = false;
  }

  /**
   * Take memory snapshot
   */
  takeSnapshot(): MemorySnapshot | null {
    if (typeof window === "undefined" || !("performance" in window)) {
      return null;
    }

    const memory = (
      performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }
    ).memory;

    if (!memory) {
      logger.warn("[MemoryMonitor] Memory API not available");
      return null;
    }

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      used: memory.usedJSHeapSize / (1024 * 1024), // Convert to MB
      total: memory.totalJSHeapSize / (1024 * 1024),
      limit: memory.jsHeapSizeLimit / (1024 * 1024),
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Check threshold
    if (snapshot.used > this.thresholdMB) {
      console.warn(
        `[MemoryMonitor] High memory usage: ${snapshot.used.toFixed(2)}MB (${snapshot.percentage.toFixed(1)}%)`,
      );
    }

    return snapshot;
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats | null {
    if (this.snapshots.length === 0) {
      this.takeSnapshot();
    }

    const current = this.snapshots[this.snapshots.length - 1];
    if (!current) return null;

    const trend = this.detectTrend();
    const leaks = this.detectLeaks();

    return {
      current,
      history: [...this.snapshots],
      trend,
      leaks,
    };
  }

  /**
   * Detect memory trend
   */
  private detectTrend(): "stable" | "increasing" | "decreasing" {
    if (this.snapshots.length < 5) return "stable";

    const recent = this.snapshots.slice(-10);
    const first = recent[0].used;
    const last = recent[recent.length - 1].used;

    const change = ((last - first) / first) * 100;

    if (change > 10) return "increasing";
    if (change < -10) return "decreasing";
    return "stable";
  }

  /**
   * Detect potential memory leaks
   */
  private detectLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];

    // Check for too many event listeners
    for (const [event, listeners] of this.eventListeners.entries()) {
      if (listeners.size > 50) {
        leaks.push({
          type: "event-listener",
          description: `Too many listeners for "${event}": ${listeners.size}`,
          severity: "high",
          recommendation: "Remove listeners in cleanup/useEffect return",
        });
      }
    }

    // Check for active timers
    if (this.timers.size > 20) {
      leaks.push({
        type: "timer",
        description: `${this.timers.size} active timers detected`,
        severity: "medium",
        recommendation: "Clear timers in cleanup/useEffect return",
      });
    }

    // Check for active intervals
    if (this.intervals.size > 10) {
      leaks.push({
        type: "timer",
        description: `${this.intervals.size} active intervals detected`,
        severity: "high",
        recommendation: "Clear intervals in cleanup/useEffect return",
      });
    }

    // Check for memory trend
    if (this.detectTrend() === "increasing" && this.snapshots.length > 20) {
      leaks.push({
        type: "component",
        description: "Memory continuously increasing over time",
        severity: "high",
        recommendation:
          "Check for unmounted components with active subscriptions",
      });
    }

    return leaks;
  }

  // -------------------------------------------------------------------------
  // Tracking Helpers
  // -------------------------------------------------------------------------

  /**
   * Track event listener (call in addEventListener)
   */
  trackEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Untrack event listener (call in removeEventListener)
   */
  untrackEventListener(event: string, listener: Function): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * Track timer (call when creating setTimeout)
   */
  trackTimer(id: number | NodeJS.Timeout): void {
    this.timers.add(id as unknown as number);
  }

  /**
   * Untrack timer (call when clearing setTimeout)
   */
  untrackTimer(id: number | NodeJS.Timeout): void {
    this.timers.delete(id as unknown as number);
  }

  /**
   * Track interval (call when creating setInterval)
   */
  trackInterval(id: number | NodeJS.Timeout): void {
    this.intervals.add(id as unknown as number);
  }

  /**
   * Untrack interval (call when clearing setInterval)
   */
  untrackInterval(id: number | NodeJS.Timeout): void {
    this.intervals.delete(id as unknown as number);
  }

  /**
   * Track subscription (call when subscribing)
   */
  trackSubscription(subscription: { unsubscribe: () => void }): void {
    this.subscriptions.add(subscription);
  }

  /**
   * Untrack subscription (call when unsubscribing)
   */
  untrackSubscription(subscription: { unsubscribe: () => void }): void {
    this.subscriptions.delete(subscription);
  }

  /**
   * Clear all tracking
   */
  clearTracking(): void {
    this.eventListeners.clear();
    this.timers.clear();
    this.intervals.clear();
    this.subscriptions.clear();
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if ("gc" in global && typeof (global as any).gc === "function") {
      (global as any).gc();
    } else {
      logger.warn("[MemoryMonitor] GC not available (run with --expose-gc)");
    }
  }
}

// =============================================================================
// React Hooks for Memory Monitoring
// =============================================================================

/**
 * Create tracked setTimeout that automatically cleans up
 */
export function useTrackedTimeout(
  callback: () => void,
  delay: number,
  monitor: MemoryMonitor,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const id = setTimeout(() => {
    callback();
    monitor.untrackTimer(id);
  }, delay);

  monitor.trackTimer(id);

  // Cleanup
  return () => {
    clearTimeout(id);
    monitor.untrackTimer(id);
  };
}

/**
 * Create tracked setInterval that automatically cleans up
 */
export function useTrackedInterval(
  callback: () => void,
  delay: number,
  monitor: MemoryMonitor,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const id = setInterval(callback, delay);
  monitor.trackInterval(id);

  // Cleanup
  return () => {
    clearInterval(id);
    monitor.untrackInterval(id);
  };
}

/**
 * Create tracked event listener that automatically cleans up
 */
export function useTrackedEventListener(
  event: string,
  handler: EventListener,
  target: EventTarget,
  monitor: MemoryMonitor,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  target.addEventListener(event, handler);
  monitor.trackEventListener(event, handler);

  // Cleanup
  return () => {
    target.removeEventListener(event, handler);
    monitor.untrackEventListener(event, handler);
  };
}

// =============================================================================
// Memory Leak Patterns to Avoid
// =============================================================================

/**
 * Common memory leak patterns and how to fix them
 */
export const MEMORY_LEAK_PATTERNS = {
  FORGOTTEN_TIMER: {
    bad: `
      useEffect(() => {
        setInterval(() => {
          // This will leak
        }, 1000)
      }, [])
    `,
    good: `
      useEffect(() => {
        const id = setInterval(() => {
          // Properly cleaned up
        }, 1000)
        return () => clearInterval(id)
      }, [])
    `,
  },

  FORGOTTEN_LISTENER: {
    bad: `
      useEffect(() => {
        window.addEventListener('resize', handler)
        // Forgot to remove
      }, [])
    `,
    good: `
      useEffect(() => {
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
      }, [])
    `,
  },

  FORGOTTEN_SUBSCRIPTION: {
    bad: `
      useEffect(() => {
        const sub = observable.subscribe(handler)
        // Forgot to unsubscribe
      }, [])
    `,
    good: `
      useEffect(() => {
        const sub = observable.subscribe(handler)
        return () => sub.unsubscribe()
      }, [])
    `,
  },

  CLOSURE_OVER_LARGE_DATA: {
    bad: `
      const handler = () => {
        // Holds reference to entire largeArray
      }
    `,
    good: `
      const length = largeArray.length
      const handler = () => {
        // Only holds reference to length
      }
    `,
  },
};

// =============================================================================
// Singleton Instance
// =============================================================================

export const memoryMonitor = new MemoryMonitor();

// Auto-start in development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  memoryMonitor.start(10000); // Check every 10 seconds
}

// =============================================================================
// Exports
// =============================================================================

export default memoryMonitor;
