/**
 * Usage Tracker Component
 * Display current usage and limits for the plan
 */

"use client";

import { AlertTriangle, TrendingUp, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UsageLimits, UsageWarning, PlanTier } from "@/types/billing";
import { UsageTracker as UsageTrackerLib } from "@/lib/usage-tracker";
import { PLANS } from "@/config/billing-plans";
import { cn } from "@/lib/utils";

interface UsageTrackerProps {
  limits: UsageLimits;
  onUpgrade?: () => void;
  className?: string;
}

export function UsageTracker({
  limits,
  onUpgrade,
  className,
}: UsageTrackerProps) {
  const { current, limits: planLimits, warnings, exceeded, plan } = limits;

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return "text-red-600";
    if (percentage >= 90) return "text-orange-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-600";
    if (percentage >= 90) return "bg-orange-600";
    if (percentage >= 75) return "bg-yellow-600";
    return "bg-green-600";
  };

  const UsageItem = ({
    label,
    current,
    limit,
    unit = "",
  }: {
    label: string;
    current: number;
    limit: number | null;
    unit?: string;
  }) => {
    const percentage = UsageTrackerLib.getUsagePercentage(current, limit);
    const formatted = UsageTrackerLib.formatUsage(current, limit, unit);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className={getUsageColor(percentage)}>{formatted}</span>
        </div>
        <Progress
          value={percentage}
          className={cn("h-2", getProgressColor(percentage))}
        />
        {percentage >= 90 && (
          <p className="text-xs text-muted-foreground">
            {percentage >= 100 ? "Limit reached" : "Approaching limit"}
          </p>
        )}
      </div>
    );
  };

  const WarningCard = ({ warning }: { warning: UsageWarning }) => {
    const Icon = warning.severity === "critical" ? AlertTriangle : TrendingUp;

    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-3",
          warning.severity === "critical" && "border-red-500 bg-red-50",
          warning.severity === "warning" && "border-orange-500 bg-orange-50",
          warning.severity === "info" && "border-blue-500 bg-blue-50",
        )}
      >
        <Icon
          className={cn(
            "mt-0.5 h-5 w-5",
            warning.severity === "critical" && "text-red-600",
            warning.severity === "warning" && "text-orange-600",
            warning.severity === "info" && "text-blue-600",
          )}
        />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{warning.feature}</p>
          <p className="text-xs text-muted-foreground">
            Using {warning.current.toLocaleString()} of{" "}
            {warning.limit.toLocaleString()} ({warning.percentage.toFixed(1)}%)
          </p>
        </div>
        <Badge
          variant={
            warning.severity === "critical"
              ? "destructive"
              : warning.severity === "warning"
                ? "default"
                : "secondary"
          }
        >
          {warning.severity}
        </Badge>
      </div>
    );
  };

  const suggestedPlan = exceeded
    ? UsageTrackerLib.suggestUpgrade(plan, current)
    : null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan: {PLANS[plan].name}</CardTitle>
              <CardDescription>{PLANS[plan].description}</CardDescription>
            </div>
            <Badge variant="outline" className="px-4 py-2 text-lg">
              {plan === "free" ? "Free" : `$${PLANS[plan].price.monthly}/mo`}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant={exceeded ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {exceeded ? "Usage Limits Exceeded" : "Approaching Usage Limits"}
          </AlertTitle>
          <AlertDescription>
            {exceeded
              ? "You have exceeded your plan limits. Some features may be restricted."
              : "You are approaching your plan limits. Consider upgrading to avoid interruption."}
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>
            Current usage for the billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageItem
            label="Users"
            current={current.users}
            limit={planLimits.maxUsers}
          />
          <UsageItem
            label="Channels"
            current={current.channels}
            limit={planLimits.maxChannels}
          />
          <UsageItem
            label="Messages"
            current={current.messages}
            limit={planLimits.maxMessagesPerMonth}
          />
          <UsageItem
            label="Storage"
            current={current.storageGB}
            limit={planLimits.maxStorageGB}
            unit="GB"
          />
          <UsageItem
            label="Integrations"
            current={current.integrations}
            limit={planLimits.maxIntegrations}
          />
          <UsageItem
            label="Bots"
            current={current.bots}
            limit={planLimits.maxBots}
          />
          {planLimits.aiModerationMinutes !== null && (
            <UsageItem
              label="AI Minutes"
              current={current.aiMinutes}
              limit={planLimits.aiModerationMinutes}
              unit=" min"
            />
          )}
          {planLimits.aiSearchQueries !== null && (
            <UsageItem
              label="AI Search Queries"
              current={current.aiQueries}
              limit={planLimits.aiSearchQueries}
            />
          )}
        </CardContent>
      </Card>

      {/* Detailed Warnings */}
      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Alerts</CardTitle>
            <CardDescription>Features requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.map((warning, index) => (
              <WarningCard key={index} warning={warning} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upgrade Suggestion */}
      {suggestedPlan && onUpgrade && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Upgrade Recommended
            </CardTitle>
            <CardDescription>
              The {PLANS[suggestedPlan].name} plan would accommodate your
              current usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>
                  {PLANS[suggestedPlan].features.maxUsers === null
                    ? "Unlimited users"
                    : `Up to ${PLANS[suggestedPlan].features.maxUsers} users`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>
                  {PLANS[suggestedPlan].features.maxStorageGB === null
                    ? "Unlimited storage"
                    : `${PLANS[suggestedPlan].features.maxStorageGB}GB storage`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>
                  {PLANS[suggestedPlan].features.maxMessagesPerMonth === null
                    ? "Unlimited messages"
                    : `${PLANS[suggestedPlan].features.maxMessagesPerMonth.toLocaleString()} messages/month`}
                </span>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={onUpgrade}>
              Upgrade to {PLANS[suggestedPlan].name} - $
              {PLANS[suggestedPlan].price.monthly}/month
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
