"use client";

/**
 * Usage Tracking Dashboard
 *
 * Displays current usage metrics vs plan limits with warnings
 */

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Users,
  Hash,
  HardDrive,
  Zap,
  Video,
  TrendingUp,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface PlanLimits {
  plan: "free" | "starter" | "pro" | "enterprise";
  members: { current: number; limit: number };
  channels: { current: number; limit: number };
  storage: { current: number; limit: number }; // in MB
  apiCalls: { current: number; limit: number }; // per month
  videoMinutes: { current: number; limit: number }; // per month
}

interface UsageMetric {
  name: string;
  icon: React.ReactNode;
  current: number;
  limit: number;
  unit: string;
  percentage: number;
  status: "safe" | "warning" | "critical";
  recommendation?: string;
}

interface UsageTrackingDashboardProps {
  limits?: PlanLimits;
  onUpgrade?: () => void;
  onExport?: (format: "csv" | "json") => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function UsageTrackingDashboard({
  limits,
  onUpgrade,
  onExport,
  className,
}: UsageTrackingDashboardProps) {
  // Default limits (free plan)
  const defaultLimits: PlanLimits = {
    plan: "free",
    members: { current: 45, limit: 50 },
    channels: { current: 12, limit: 15 },
    storage: { current: 8500, limit: 10240 }, // 8.5GB / 10GB
    apiCalls: { current: 95000, limit: 100000 },
    videoMinutes: { current: 280, limit: 300 },
  };

  const planLimits = limits || defaultLimits;

  // Calculate metrics
  const metrics: UsageMetric[] = [
    {
      name: "Team Members",
      icon: <Users className="h-5 w-5" />,
      current: planLimits.members.current,
      limit: planLimits.members.limit,
      unit: "members",
      percentage: (planLimits.members.current / planLimits.members.limit) * 100,
      status: getStatus(planLimits.members.current, planLimits.members.limit),
      recommendation:
        planLimits.members.current / planLimits.members.limit > 0.9
          ? "Consider upgrading your plan or removing inactive members"
          : undefined,
    },
    {
      name: "Channels",
      icon: <Hash className="h-5 w-5" />,
      current: planLimits.channels.current,
      limit: planLimits.channels.limit,
      unit: "channels",
      percentage:
        (planLimits.channels.current / planLimits.channels.limit) * 100,
      status: getStatus(planLimits.channels.current, planLimits.channels.limit),
      recommendation:
        planLimits.channels.current / planLimits.channels.limit > 0.9
          ? "Archive unused channels or upgrade to create more"
          : undefined,
    },
    {
      name: "Storage",
      icon: <HardDrive className="h-5 w-5" />,
      current: planLimits.storage.current,
      limit: planLimits.storage.limit,
      unit: "MB",
      percentage: (planLimits.storage.current / planLimits.storage.limit) * 100,
      status: getStatus(planLimits.storage.current, planLimits.storage.limit),
      recommendation:
        planLimits.storage.current / planLimits.storage.limit > 0.9
          ? "Clean up old files or upgrade for more storage"
          : undefined,
    },
    {
      name: "API Calls",
      icon: <Zap className="h-5 w-5" />,
      current: planLimits.apiCalls.current,
      limit: planLimits.apiCalls.limit,
      unit: "calls",
      percentage:
        (planLimits.apiCalls.current / planLimits.apiCalls.limit) * 100,
      status: getStatus(planLimits.apiCalls.current, planLimits.apiCalls.limit),
      recommendation:
        planLimits.apiCalls.current / planLimits.apiCalls.limit > 0.9
          ? "Optimize integrations or upgrade for higher API limits"
          : undefined,
    },
    {
      name: "Video Minutes",
      icon: <Video className="h-5 w-5" />,
      current: planLimits.videoMinutes.current,
      limit: planLimits.videoMinutes.limit,
      unit: "minutes",
      percentage:
        (planLimits.videoMinutes.current / planLimits.videoMinutes.limit) * 100,
      status: getStatus(
        planLimits.videoMinutes.current,
        planLimits.videoMinutes.limit,
      ),
      recommendation:
        planLimits.videoMinutes.current / planLimits.videoMinutes.limit > 0.9
          ? "Upgrade for unlimited video calls"
          : undefined,
    },
  ];

  const criticalMetrics = metrics.filter((m) => m.status === "critical");
  const warningMetrics = metrics.filter((m) => m.status === "warning");

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usage Tracking</h2>
          <p className="text-muted-foreground">
            Monitor your {planLimits.plan} plan usage and limits
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport?.("csv")}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.("json")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          {onUpgrade &&
            (criticalMetrics.length > 0 || warningMetrics.length > 0) && (
              <Button onClick={onUpgrade}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            )}
        </div>
      </div>

      {/* Alerts */}
      {criticalMetrics.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical: Limit Reached</AlertTitle>
          <AlertDescription>
            You have reached or exceeded {criticalMetrics.length} plan limit(s).
            Please upgrade your plan or reduce usage to avoid service
            interruptions.
          </AlertDescription>
        </Alert>
      )}

      {warningMetrics.length > 0 && criticalMetrics.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: Approaching Limit</AlertTitle>
          <AlertDescription>
            You are approaching {warningMetrics.length} plan limit(s). Consider
            upgrading soon to avoid hitting limits.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.name} className={cn(getCardBorder(metric.status))}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                {metric.icon}
                <Badge variant={getBadgeVariant(metric.status)}>
                  {metric.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">
                    {metric.unit === "MB"
                      ? `${(metric.current / 1024).toFixed(1)} GB`
                      : metric.current.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    of{" "}
                    {metric.unit === "MB"
                      ? `${(metric.limit / 1024).toFixed(1)} GB`
                      : metric.limit.toLocaleString()}
                  </div>
                </div>

                <Progress
                  value={metric.percentage}
                  className={getProgressClass(metric.status)}
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{metric.percentage.toFixed(1)}% used</span>
                  {metric.status === "safe" && (
                    <span className="flex items-center text-green-600">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Healthy
                    </span>
                  )}
                  {metric.status === "warning" && (
                    <span className="flex items-center text-amber-600">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {Math.round(100 - metric.percentage)}% remaining
                    </span>
                  )}
                  {metric.status === "critical" && (
                    <span className="flex items-center text-red-600">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Limit reached
                    </span>
                  )}
                </div>

                {metric.recommendation && (
                  <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                    {metric.recommendation}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>
            You are currently on the{" "}
            <strong className="capitalize">{planLimits.plan}</strong> plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly reset date:</span>
              <span className="font-medium">
                {new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000,
                ).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">API calls reset in:</span>
              <span className="font-medium">7 days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Video minutes reset in:
              </span>
              <span className="font-medium">7 days</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatus(
  current: number,
  limit: number,
): "safe" | "warning" | "critical" {
  const percentage = (current / limit) * 100;
  if (percentage >= 100) return "critical";
  if (percentage >= 75) return "warning";
  return "safe";
}

function getBadgeVariant(
  status: "safe" | "warning" | "critical",
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "safe":
      return "secondary";
    case "warning":
      return "default";
    case "critical":
      return "destructive";
  }
}

function getCardBorder(status: "safe" | "warning" | "critical"): string {
  switch (status) {
    case "safe":
      return "";
    case "warning":
      return "border-amber-500/50";
    case "critical":
      return "border-red-500/50";
  }
}

function getProgressClass(status: "safe" | "warning" | "critical"): string {
  switch (status) {
    case "safe":
      return "[&>div]:bg-green-500";
    case "warning":
      return "[&>div]:bg-amber-500";
    case "critical":
      return "[&>div]:bg-red-500";
  }
}

export default UsageTrackingDashboard;
