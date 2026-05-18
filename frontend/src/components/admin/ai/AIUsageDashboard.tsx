/**
 * AI Usage Dashboard
 * Real-time metrics, cost tracking, and usage analytics for AI features
 */

"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  RefreshCw,
  Settings,
  Download,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerRequest: number;
  byModel: Record<string, { requests: number; cost: number }>;
  byEndpoint: Record<string, { requests: number; cost: number }>;
}

interface QueueMetrics {
  name: string;
  metrics: {
    totalQueued: number;
    processing: number;
    completed: number;
    failed: number;
    averageProcessingTime: number;
    queuedByPriority: Record<number, number>;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
}

interface BudgetStatus {
  limit: number;
  current: number;
  percentUsed: number;
  remaining: number;
  exceeded: boolean;
}

// ============================================================================
// Component
// ============================================================================

export default function AIUsageDashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [usageData, setUsageData] = useState<UsageStats | null>(null);
  const [queueData, setQueueData] = useState<QueueMetrics[]>([]);
  const [cacheData, setCacheData] = useState<Record<string, CacheStats>>({});
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch usage stats
      const usageRes = await fetch(`/api/admin/ai/usage?period=${period}`);
      const usageJson = await usageRes.json();

      if (usageJson.success) {
        setUsageData(usageJson.data.usage);
        setQueueData(usageJson.data.queues);
        setCacheData(usageJson.data.cache);
      }

      // Fetch config
      const configRes = await fetch("/api/admin/ai/config");
      const configJson = await configRes.json();

      if (configJson.success) {
        setConfig(configJson.data);
      }

      // Calculate budget status
      if (configJson.success && usageJson.success) {
        const limit =
          period === "daily"
            ? configJson.data.budgets.dailyLimit
            : configJson.data.budgets.monthlyLimit;
        const current = usageJson.data.usage.totalCost;

        setBudgetStatus({
          limit: limit || 0,
          current,
          percentUsed: limit ? (current / limit) * 100 : 0,
          remaining: limit ? limit - current : 0,
          exceeded: limit ? current >= limit : false,
        });
      }
    } catch (error) {
      logger.error("Error fetching AI usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Prepare chart data
  const modelChartData = usageData
    ? Object.entries(usageData.byModel).map(([model, data]) => ({
        name: model,
        requests: data.requests,
        cost: data.cost,
      }))
    : [];

  const endpointChartData = usageData
    ? Object.entries(usageData.byEndpoint).map(([endpoint, data]) => ({
        name: endpoint,
        requests: data.requests,
        cost: data.cost,
      }))
    : [];

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  if (loading && !usageData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Usage Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor AI usage, costs, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Tabs
        value={period}
        onValueChange={(v) => setPeriod(v as "daily" | "monthly")}
      >
        <TabsList>
          <TabsTrigger value="daily">Today</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Budget Alert */}
      {budgetStatus && budgetStatus.exceeded && (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <h4 className="font-semibold text-destructive">
                  Budget Limit Exceeded
                </h4>
                <p className="text-sm text-muted-foreground">
                  Current spending ({formatCurrency(budgetStatus.current)})
                  exceeds the {period} budget limit (
                  {formatCurrency(budgetStatus.limit)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData ? formatCurrency(usageData.totalCost) : "$0.00"}
            </div>
            {budgetStatus && (
              <div className="mt-2">
                <Progress value={budgetStatus.percentUsed} className="h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {budgetStatus.percentUsed.toFixed(1)}% of {period} budget
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usageData ? formatNumber(usageData.totalRequests) : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg:{" "}
              {usageData
                ? formatCurrency(usageData.averageCostPerRequest)
                : "$0.00"}{" "}
              per request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cacheData?.summarization
                ? (cacheData.summarization.hitRate * 100).toFixed(1)
                : "0"}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {cacheData?.summarization
                ? `${formatNumber(cacheData.summarization.hits)} hits`
                : "0 hits"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {queueData.reduce((sum, q) => sum + q.metrics.totalQueued, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {queueData.reduce((sum, q) => sum + q.metrics.processing, 0)}{" "}
              processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="endpoints">By Endpoint</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="queues">Queue Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Requests by Model</CardTitle>
                <CardDescription>
                  Distribution of requests across AI models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={modelChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="requests"
                    >
                      {modelChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost by Model</CardTitle>
                <CardDescription>
                  Cost breakdown across different models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={modelChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Bar dataKey="cost" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Endpoint</CardTitle>
              <CardDescription>
                Requests and costs per API endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={endpointChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="requests"
                    fill="#6366f1"
                    name="Requests"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="cost"
                    fill="#8b5cf6"
                    name="Cost ($)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(cacheData).map(([name, stats]) => (
              <Card key={name}>
                <CardHeader>
                  <CardTitle className="capitalize">{name} Cache</CardTitle>
                  <CardDescription>
                    {stats.totalRequests} total requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">Hit Rate</span>
                      <span className="text-sm font-bold">
                        {(stats.hitRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={stats.hitRate * 100} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Hits</div>
                      <div className="font-medium">
                        {formatNumber(stats.hits)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Misses</div>
                      <div className="font-medium">
                        {formatNumber(stats.misses)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cache Size</div>
                      <div className="font-medium">
                        {formatNumber(stats.cacheSize)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queues" className="space-y-4">
          <div className="grid gap-4">
            {queueData.map((queue) => (
              <Card key={queue.name}>
                <CardHeader>
                  <CardTitle className="capitalize">
                    {queue.name} Queue
                  </CardTitle>
                  <CardDescription>
                    Average processing time:{" "}
                    {queue.metrics.averageProcessingTime.toFixed(0)}ms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Queued
                      </div>
                      <div className="text-2xl font-bold">
                        {formatNumber(queue.metrics.totalQueued)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Processing
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(queue.metrics.processing)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Completed
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(queue.metrics.completed)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Failed
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatNumber(queue.metrics.failed)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Overview */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Current AI system configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-semibold">Providers</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">OpenAI</span>
                    <Badge
                      variant={config.openai.enabled ? "default" : "secondary"}
                    >
                      {config.openai.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Anthropic</span>
                    <Badge
                      variant={
                        config.anthropic.enabled ? "default" : "secondary"
                      }
                    >
                      {config.anthropic.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">Caching</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Enabled</span>
                    <Badge
                      variant={config.cache.enabled ? "default" : "secondary"}
                    >
                      {config.cache.enabled ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
