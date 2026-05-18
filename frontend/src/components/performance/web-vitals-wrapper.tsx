"use client";

/**
 * Suspense wrapper for WebVitalsTracker
 * Required because useSearchParams needs Suspense boundary
 */

import { Suspense } from "react";
import {
  WebVitalsTracker,
  type WebVitalsConfig,
} from "@/lib/performance/web-vitals";

export function WebVitalsWrapper(props: Partial<WebVitalsConfig> = {}) {
  return (
    <Suspense fallback={null}>
      <WebVitalsTracker {...props} />
    </Suspense>
  );
}
