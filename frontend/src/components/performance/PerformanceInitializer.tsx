/**
 * Performance Initializer
 *
 * Client-side component that initializes performance monitoring
 * Should be included in the root layout
 */

"use client";

import { useEffect } from "react";
import { performanceMonitor } from "@/lib/performance/monitor";

export default function PerformanceInitializer() {
  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.initialize();

    // Cleanup on unmount (though this rarely happens for root layout)
    return () => {
      performanceMonitor.cleanup();
    };
  }, []);

  // This component renders nothing
  return null;
}
