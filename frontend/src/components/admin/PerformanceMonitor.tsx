/**
 * Performance Monitor Component
 *
 * Admin dashboard for monitoring application performance in real-time
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Trash2,
  Clock,
  Zap,
  Cpu,
  Database,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  usePerformance,
  usePerformanceWarnings,
} from "@/hooks/use-performance";
import {
  formatMetricValue,
  formatDuration,
  getRatingColor,
  getScoreColor,
  getScoreGrade,
  exportToCSV,
  exportToJSON,
} from "@/lib/performance/metrics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ============================================================================
// Main Component
// ============================================================================

export default function PerformanceMonitor() {
  const {
    snapshot,
    score,
    metrics,
    customMetrics,
    stats,
    trends,
    refresh,
    reset,
  } = usePerformance();

  const {
    warnings,
    criticalWarnings,
    activeWarnings,
    clearWarning,
    clearAllWarnings,
  } = usePerformanceWarnings();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview", "vitals"]),
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleExport = (format: "csv" | "json") => {
    const data =
      format === "csv" ? exportToCSV(metrics) : exportToJSON(metrics);
    const blob = new Blob([data], {
      type: format === "csv" ? "text/csv" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground">
            Real-time performance metrics and Web Vitals tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={reset}>
            <Trash2 className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {activeWarnings.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <CardTitle>
                  {criticalWarnings.length > 0
                    ? "Critical Issues"
                    : "Performance Warnings"}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={clearAllWarnings}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeWarnings.map((warning) => (
                <div
                  key={warning.id}
                  className="flex items-start justify-between rounded-lg bg-white p-3 dark:bg-gray-900"
                >
                  <div className="flex items-start gap-3">
                    {warning.severity === "critical" ? (
                      <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium">{warning.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(warning.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearWarning(warning.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Score */}
      <CollapsibleSection
        title="Performance Score"
        icon={Activity}
        expanded={expandedSections.has("overview")}
        onToggle={() => toggleSection("overview")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Overall Score</CardTitle>
              <CardDescription>Weighted performance average</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <svg className="h-32 w-32 -rotate-90 transform">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - score.overall / 100)}`}
                      className={cn(
                        "transition-all duration-500",
                        getScoreColor(score.overall),
                      )}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={cn(
                        "text-4xl font-bold",
                        getScoreColor(score.overall),
                      )}
                    >
                      {score.overall}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {getScoreGrade(score.overall)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScoreCard title="Web Vitals" score={score.webVitals} icon={Zap} />
          <ScoreCard title="API" score={score.api} icon={Database} />
          <ScoreCard title="Rendering" score={score.rendering} icon={Cpu} />
          <ScoreCard title="Memory" score={score.memory} icon={Activity} />
        </div>
      </CollapsibleSection>

      {/* Web Vitals */}
      <CollapsibleSection
        title="Web Vitals"
        icon={Zap}
        expanded={expandedSections.has("vitals")}
        onToggle={() => toggleSection("vitals")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <VitalCard
            name="LCP"
            label="Largest Contentful Paint"
            value={snapshot.webVitals.lcp}
            unit="ms"
            thresholds={{ good: 2500, poor: 4000 }}
            score={score.breakdown.lcp}
          />
          <VitalCard
            name="CLS"
            label="Cumulative Layout Shift"
            value={snapshot.webVitals.cls}
            unit=""
            thresholds={{ good: 0.1, poor: 0.25 }}
            score={score.breakdown.cls}
          />
          <VitalCard
            name="TTFB"
            label="Time to First Byte"
            value={snapshot.webVitals.ttfb}
            unit="ms"
            thresholds={{ good: 800, poor: 1800 }}
            score={score.breakdown.ttfb}
          />
          <VitalCard
            name="FCP"
            label="First Contentful Paint"
            value={snapshot.webVitals.fcp}
            unit="ms"
            thresholds={{ good: 1800, poor: 3000 }}
            score={score.breakdown.fcp}
          />
          <VitalCard
            name="INP"
            label="Interaction to Next Paint"
            value={snapshot.webVitals.inp}
            unit="ms"
            thresholds={{ good: 200, poor: 500 }}
            score={score.breakdown.inp}
          />
        </div>
      </CollapsibleSection>

      {/* Custom Metrics */}
      <CollapsibleSection
        title="Custom Metrics"
        icon={Activity}
        expanded={expandedSections.has("custom")}
        onToggle={() => toggleSection("custom")}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <MetricCard
            title="API Response Time"
            stats={stats.apiResponseTime}
            trend={trends.apiResponseTime}
            unit="ms"
            icon={Database}
          />
          <MetricCard
            title="Render Time"
            stats={stats.renderTime}
            trend={trends.renderTime}
            unit="ms"
            icon={Cpu}
          />
          <MetricCard
            title="Memory Usage"
            stats={stats.memoryUsage}
            trend={trends.memoryUsage}
            unit="percent"
            icon={Activity}
          />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <CardTitle>Errors</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Count
                  </span>
                  <span className="text-2xl font-bold">
                    {snapshot.errors.count}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Error Rate
                  </span>
                  <span className="text-2xl font-bold">
                    {(snapshot.errors.rate * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>

      {/* Recent Metrics */}
      <CollapsibleSection
        title="Recent Activity"
        icon={Clock}
        expanded={expandedSections.has("recent")}
        onToggle={() => toggleSection("recent")}
      >
        <Tabs defaultValue="vitals">
          <TabsList>
            <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
            <TabsTrigger value="custom">Custom Metrics</TabsTrigger>
          </TabsList>
          <TabsContent value="vitals">
            <MetricsTable metrics={metrics.slice(-20).reverse()} />
          </TabsContent>
          <TabsContent value="custom">
            <CustomMetricsTable metrics={customMetrics.slice(-50).reverse()} />
          </TabsContent>
        </Tabs>
      </CollapsibleSection>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle>{title}</CardTitle>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </CardHeader>
      {expanded && <CardContent className="pt-6">{children}</CardContent>}
    </Card>
  );
}

interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ComponentType<{ className?: string }>;
}

function ScoreCard({ title, score, icon: Icon }: ScoreCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={cn("text-3xl font-bold", getScoreColor(score))}>
            {score}
          </div>
          <Progress value={score} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface VitalCardProps {
  name: string;
  label: string;
  value: number | undefined;
  unit: string;
  thresholds: { good: number; poor: number };
  score: number;
}

function VitalCard({
  name,
  label,
  value,
  unit,
  thresholds,
  score,
}: VitalCardProps) {
  const getRating = (): "good" | "needs-improvement" | "poor" => {
    if (!value) return "good";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.poor) return "needs-improvement";
    return "poor";
  };

  const rating = getRating();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold", getRatingColor(rating))}>
              {value !== undefined ? value.toFixed(value < 1 ? 3 : 0) : "N/A"}
            </span>
            {unit && (
              <span className="text-sm text-muted-foreground">{unit}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Badge
              variant={
                rating === "good"
                  ? "default"
                  : rating === "poor"
                    ? "destructive"
                    : "secondary"
              }
            >
              {rating.replace("-", " ")}
            </Badge>
            <span className={cn("text-sm font-medium", getScoreColor(score))}>
              Score: {score}
            </span>
          </div>
          <Progress value={score} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  stats: any;
  trend: any;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
}

function MetricCard({
  title,
  stats,
  trend,
  unit,
  icon: Icon,
}: MetricCardProps) {
  const TrendIcon =
    trend.direction === "improving"
      ? TrendingDown
      : trend.direction === "degrading"
        ? TrendingUp
        : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Average</p>
              <p className="text-2xl font-bold">
                {formatMetricValue(
                  stats.avg,
                  unit as "ms" | "bytes" | "count" | "percent",
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">P95</p>
              <p className="text-2xl font-bold">
                {formatMetricValue(
                  stats.p95,
                  unit as "ms" | "bytes" | "count" | "percent",
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Min</p>
              <p className="font-medium">
                {formatMetricValue(
                  stats.min,
                  unit as "ms" | "bytes" | "count" | "percent",
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Median</p>
              <p className="font-medium">
                {formatMetricValue(
                  stats.median,
                  unit as "ms" | "bytes" | "count" | "percent",
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Max</p>
              <p className="font-medium">
                {formatMetricValue(
                  stats.max,
                  unit as "ms" | "bytes" | "count" | "percent",
                )}
              </p>
            </div>
          </div>
          {TrendIcon && (
            <div className="flex items-center gap-2 border-t pt-2">
              <TrendIcon
                className={cn(
                  "h-4 w-4",
                  trend.direction === "improving"
                    ? "text-green-600"
                    : "text-red-600",
                )}
              />
              <span className="text-sm">
                {Math.abs(trend.change).toFixed(1)}% vs previous hour
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricsTable({ metrics }: { metrics: any[] }) {
  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Metric</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Value</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {metrics.map((metric) => (
            <tr
              key={metric.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td className="px-4 py-3 text-sm font-medium">{metric.name}</td>
              <td className="px-4 py-3 text-sm">{metric.value.toFixed(2)}</td>
              <td className="px-4 py-3">
                <Badge
                  variant={
                    metric.rating === "good"
                      ? "default"
                      : metric.rating === "poor"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {metric.rating}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(metric.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomMetricsTable({ metrics }: { metrics: any[] }) {
  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Metric</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Value</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Tags</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {metrics.map((metric, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="px-4 py-3 text-sm font-medium">{metric.name}</td>
              <td className="px-4 py-3 text-sm">
                {formatMetricValue(metric.value, metric.unit)}
              </td>
              <td className="px-4 py-3">
                {metric.tags && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(metric.tags).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {new Date(metric.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
