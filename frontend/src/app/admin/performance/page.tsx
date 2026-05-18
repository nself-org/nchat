/**
 * Admin Performance Monitoring Page
 *
 * Real-time performance monitoring dashboard
 */

import { Metadata } from "next";
import PerformanceMonitor from "@/components/admin/PerformanceMonitor";

export const metadata: Metadata = {
  title: "Performance Monitor | Admin",
  description:
    "Monitor application performance, Web Vitals, and system metrics",
};

export default function PerformancePage() {
  return <PerformanceMonitor />;
}
