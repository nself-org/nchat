/**
 * Moderation Dashboard
 * Analytics and overview of moderation activity
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { logger } from "@/lib/logger";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Activity,
} from "lucide-react";

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

interface ModerationStats {
  metrics: {
    totalFlagged: number;
    pendingReview: number;
    highPriority: number;
    totalActions: number;
    automatedActions: number;
    manualActions: number;
    avgResponseTime: number;
    flaggedRate: number;
  };
  queueStats: any;
  actionStats: any;
  topViolators: any[];
  violationTrends: any;
}

export function ModerationDashboard() {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/moderation/stats?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      logger.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard</p>
      </div>
    );
  }

  const { metrics, queueStats, actionStats } = stats;

  // Prepare chart data
  const queueByStatus = Object.entries(queueStats.byStatus).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }),
  );

  const queueByPriority = Object.entries(queueStats.byPriority).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }),
  );

  const actionsByType = Object.entries(actionStats.byType).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Moderation Dashboard</h2>
          <p className="text-muted-foreground">
            AI-powered content moderation analytics
          </p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="1d">24h</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalFlagged}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingReview} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.highPriority}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalActions}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.automatedActions} automated, {metrics.manualActions}{" "}
              manual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Automation Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalActions > 0
                ? Math.round(
                    (metrics.automatedActions / metrics.totalActions) * 100,
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              AI-powered moderation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Queue Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Queue Status</CardTitle>
            <CardDescription>
              Distribution of queue items by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={queueByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {queueByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === "Approved"
                          ? COLORS.success
                          : entry.name === "Rejected"
                            ? COLORS.danger
                            : entry.name === "Reviewing"
                              ? COLORS.primary
                              : COLORS.warning
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Flagged content by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={queueByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary}>
                  {queueByPriority.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === "Critical"
                          ? COLORS.danger
                          : entry.name === "High"
                            ? COLORS.warning
                            : entry.name === "Medium"
                              ? COLORS.primary
                              : COLORS.success
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Actions by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Actions Taken</CardTitle>
            <CardDescription>Moderation actions breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={actionsByType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.purple} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Violators */}
        <Card>
          <CardHeader>
            <CardTitle>Top Violators</CardTitle>
            <CardDescription>Users with most violations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topViolators && stats.topViolators.length > 0 ? (
                stats.topViolators.slice(0, 5).map((user, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-muted p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                        <span className="text-sm font-bold text-red-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          User {user.user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Trust Score: {user.trust_score}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {user.total_violations}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        violations
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No violations in this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle>AI Moderation Performance</CardTitle>
          <CardDescription>Automated vs Manual Actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <div className="mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium">Automated Actions</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.automatedActions}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                AI-powered decisions
              </p>
            </div>

            <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium">Manual Actions</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {metrics.manualActions}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Human moderator decisions
              </p>
            </div>

            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium">Time Saved</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {Math.round((metrics.automatedActions * 2) / 60)}h
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Estimated hours saved
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
