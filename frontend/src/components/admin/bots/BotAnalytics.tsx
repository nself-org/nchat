/**
 * Bot Analytics Component
 *
 * Displays comprehensive analytics for bot performance, usage, and engagement.
 */

"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  MessageSquare,
  AlertTriangle,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface BotAnalytics {
  eventsHandled: number;
  commandsExecuted: number;
  responseTime: number; // in ms
  errorRate: number; // percentage
  uniqueUsers: number;
  activeChannels: number;
  uptime: number; // percentage
  usageOverTime: { date: string; count: number }[];
  topCommands: { command: string; count: number }[];
  errorTypes: { type: string; count: number }[];
}

interface BotAnalyticsProps {
  botId: string;
  botName: string;
  analytics?: BotAnalytics;
  loading?: boolean;
  period?: "day" | "week" | "month";
  onPeriodChange?: (period: "day" | "week" | "month") => void;
}

// Mock data for demo
const MOCK_ANALYTICS: BotAnalytics = {
  eventsHandled: 12453,
  commandsExecuted: 3421,
  responseTime: 145,
  errorRate: 2.3,
  uniqueUsers: 234,
  activeChannels: 12,
  uptime: 99.8,
  usageOverTime: [
    { date: "2024-01-24", count: 120 },
    { date: "2024-01-25", count: 145 },
    { date: "2024-01-26", count: 178 },
    { date: "2024-01-27", count: 156 },
    { date: "2024-01-28", count: 189 },
    { date: "2024-01-29", count: 201 },
    { date: "2024-01-30", count: 223 },
  ],
  topCommands: [
    { command: "/help", count: 1234 },
    { command: "/status", count: 876 },
    { command: "/info", count: 543 },
    { command: "/poll", count: 432 },
    { command: "/reminder", count: 336 },
  ],
  errorTypes: [
    { type: "Permission denied", count: 45 },
    { type: "Timeout", count: 23 },
    { type: "Invalid input", count: 18 },
    { type: "Rate limit", count: 12 },
  ],
};

export function BotAnalytics({
  botId,
  botName,
  analytics = MOCK_ANALYTICS,
  loading = false,
  period = "week",
  onPeriodChange,
}: BotAnalyticsProps) {
  // Calculate trends
  const trends = useMemo(() => {
    const { usageOverTime } = analytics;
    if (usageOverTime.length < 2) return null;

    const recent = usageOverTime.slice(-3).reduce((sum, d) => sum + d.count, 0);
    const previous = usageOverTime
      .slice(-6, -3)
      .reduce((sum, d) => sum + d.count, 0);
    const change = previous > 0 ? ((recent - previous) / previous) * 100 : 0;

    return {
      trend: change > 0 ? "up" : change < 0 ? "down" : "stable",
      percentage: Math.abs(change).toFixed(1),
    };
  }, [analytics]);

  // Calculate max usage for charts
  const maxUsage = Math.max(...analytics.usageOverTime.map((d) => d.count));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse" />
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{botName} Analytics</h2>
          <p className="text-muted-foreground">
            Performance metrics and usage statistics
          </p>
        </div>
        <Select value={period} onValueChange={onPeriodChange as any}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 Hours</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Events Handled */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Events Handled
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.eventsHandled.toLocaleString()}
            </div>
            {trends && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {trends.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span>{trends.percentage}% from last period</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commands Executed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commands</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.commandsExecuted.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (analytics.commandsExecuted / analytics.eventsHandled) *
                100
              ).toFixed(1)}
              % of events
            </p>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              {analytics.responseTime < 200
                ? "Excellent"
                : analytics.responseTime < 500
                  ? "Good"
                  : "Needs improvement"}
            </p>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.errorRate < 1
                ? "Excellent"
                : analytics.errorRate < 5
                  ? "Good"
                  : "High"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>Daily event processing volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.usageOverTime.map((data, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-20 text-sm text-muted-foreground">
                  {new Date(data.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Progress
                        value={(data.count / maxUsage) * 100}
                        className="h-2"
                      />
                    </div>
                    <div className="w-16 text-right text-sm font-medium">
                      {data.count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Commands */}
        <Card>
          <CardHeader>
            <CardTitle>Top Commands</CardTitle>
            <CardDescription>Most frequently used commands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topCommands.map((cmd, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-medium">{cmd.command}</code>
                      <span className="text-sm text-muted-foreground">
                        {cmd.count.toLocaleString()}
                      </span>
                    </div>
                    <Progress
                      value={(cmd.count / analytics.topCommands[0].count) * 100}
                      className="mt-1 h-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
            <CardDescription>Common error types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.errorTypes.map((error, i) => (
                <div key={i} className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{error.type}</span>
                      <span className="text-sm text-muted-foreground">
                        {error.count}
                      </span>
                    </div>
                    <Progress
                      value={
                        (error.count / analytics.errorTypes[0].count) * 100
                      }
                      className="mt-1 h-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.uniqueUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Engaged with the bot
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Channels
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeChannels}</div>
            <p className="text-xs text-muted-foreground">Channels using bot</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uptime}%</div>
            <div className="mt-2">
              <Progress value={analytics.uptime} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
