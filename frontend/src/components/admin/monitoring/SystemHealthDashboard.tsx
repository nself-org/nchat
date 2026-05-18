/**
 * System Health Dashboard
 *
 * Real-time monitoring of system health including:
 * - CPU, Memory, and Disk usage
 * - Service health status
 * - Active connections
 * - Error rates
 * - Database performance
 */

"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  Database,
  Server,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
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
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
  database: {
    connections: number;
    queries: number;
    avgQueryTime: number;
  };
}

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  uptime: number;
  lastCheck: Date;
  responseTime?: number;
}

interface TimeSeriesData {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
  connections: number;
}

// ============================================================================
// Mock Data Generator
// ============================================================================

function generateMockMetrics(): SystemMetrics {
  return {
    cpu: {
      usage: Math.random() * 80 + 10,
      cores: 8,
      loadAverage: [Math.random() * 4, Math.random() * 4, Math.random() * 4],
    },
    memory: {
      total: 16000,
      used: Math.random() * 12000 + 2000,
      free: 0,
      percentage: 0,
    },
    disk: {
      total: 500000,
      used: Math.random() * 350000 + 100000,
      free: 0,
      percentage: 0,
    },
    network: {
      bytesIn: Math.random() * 1000000,
      bytesOut: Math.random() * 1000000,
      connections: Math.floor(Math.random() * 100) + 50,
    },
    database: {
      connections: Math.floor(Math.random() * 50) + 10,
      queries: Math.floor(Math.random() * 1000) + 500,
      avgQueryTime: Math.random() * 50 + 10,
    },
  };
}

function generateMockServices(): ServiceStatus[] {
  return [
    {
      name: "PostgreSQL",
      status: "healthy",
      uptime: Date.now() - Math.random() * 86400000 * 30,
      lastCheck: new Date(),
      responseTime: Math.random() * 10 + 2,
    },
    {
      name: "Hasura GraphQL",
      status: "healthy",
      uptime: Date.now() - Math.random() * 86400000 * 30,
      lastCheck: new Date(),
      responseTime: Math.random() * 20 + 5,
    },
    {
      name: "Auth Service",
      status: "healthy",
      uptime: Date.now() - Math.random() * 86400000 * 30,
      lastCheck: new Date(),
      responseTime: Math.random() * 15 + 3,
    },
    {
      name: "Storage (MinIO)",
      status: "healthy",
      uptime: Date.now() - Math.random() * 86400000 * 30,
      lastCheck: new Date(),
      responseTime: Math.random() * 30 + 10,
    },
    {
      name: "Redis Cache",
      status: Math.random() > 0.1 ? "healthy" : "degraded",
      uptime: Date.now() - Math.random() * 86400000 * 30,
      lastCheck: new Date(),
      responseTime: Math.random() * 5 + 1,
    },
    {
      name: "MeiliSearch",
      status: "healthy",
      uptime: Date.now() - Math.random() * 86400000 * 30,
      lastCheck: new Date(),
      responseTime: Math.random() * 25 + 8,
    },
  ];
}

function generateTimeSeriesData(points: number = 20): TimeSeriesData[] {
  const data: TimeSeriesData[] = [];
  const now = Date.now();

  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now - i * 60000); // 1 minute intervals
    data.push({
      time: time.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cpu: Math.random() * 80 + 10,
      memory: Math.random() * 70 + 20,
      disk: Math.random() * 60 + 30,
      connections: Math.floor(Math.random() * 80) + 40,
    });
  }

  return data;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getStatusColor(status: ServiceStatus["status"]): string {
  switch (status) {
    case "healthy":
      return "text-green-600 dark:text-green-400";
    case "degraded":
      return "text-yellow-600 dark:text-yellow-400";
    case "down":
      return "text-red-600 dark:text-red-400";
  }
}

function getStatusBadgeVariant(
  status: ServiceStatus["status"],
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "healthy":
      return "default";
    case "degraded":
      return "secondary";
    case "down":
      return "destructive";
  }
}

function getUsageColor(percentage: number): string {
  if (percentage >= 90) return "text-red-600 dark:text-red-400";
  if (percentage >= 75) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

// ============================================================================
// Main Component
// ============================================================================

export function SystemHealthDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>(generateMockMetrics());
  const [services, setServices] = useState<ServiceStatus[]>(
    generateMockServices(),
  );
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>(
    generateTimeSeriesData(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Calculate derived values
  metrics.memory.free = metrics.memory.total - metrics.memory.used;
  metrics.memory.percentage =
    (metrics.memory.used / metrics.memory.total) * 100;
  metrics.disk.free = metrics.disk.total - metrics.disk.used;
  metrics.disk.percentage = (metrics.disk.used / metrics.disk.total) * 100;

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setMetrics(generateMockMetrics());
      setServices(generateMockServices());

      // Update time series data
      setTimeSeriesData((prev) => {
        const newData = [...prev];
        newData.shift(); // Remove oldest
        newData.push({
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          cpu: Math.random() * 80 + 10,
          memory: Math.random() * 70 + 20,
          disk: Math.random() * 60 + 30,
          connections: Math.floor(Math.random() * 80) + 40,
        });
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    setMetrics(generateMockMetrics());
    setServices(generateMockServices());
    setIsLoading(false);
  };

  const healthyServices = services.filter((s) => s.status === "healthy").length;
  const degradedServices = services.filter(
    (s) => s.status === "degraded",
  ).length;
  const downServices = services.filter((s) => s.status === "down").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-muted-foreground">
            Real-time system monitoring and diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={autoRefresh ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Services
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground">Backend services</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {healthyServices}
            </div>
            <p className="text-xs text-muted-foreground">Operating normally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Degraded</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {degradedServices}
            </div>
            <p className="text-xs text-muted-foreground">Performance issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Down</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {downServices}
            </div>
            <p className="text-xs text-muted-foreground">Service unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ResourceCard
          title="CPU Usage"
          icon={<Cpu className="h-4 w-4" />}
          value={metrics.cpu.usage.toFixed(1)}
          unit="%"
          percentage={metrics.cpu.usage}
          description={`${metrics.cpu.cores} cores • Load: ${metrics.cpu.loadAverage[0].toFixed(2)}`}
        />

        <ResourceCard
          title="Memory Usage"
          icon={<Activity className="h-4 w-4" />}
          value={formatBytes(metrics.memory.used)}
          unit=""
          percentage={metrics.memory.percentage}
          description={`${formatBytes(metrics.memory.total)} total • ${formatBytes(metrics.memory.free)} free`}
        />

        <ResourceCard
          title="Disk Usage"
          icon={<HardDrive className="h-4 w-4" />}
          value={formatBytes(metrics.disk.used)}
          unit=""
          percentage={metrics.disk.percentage}
          description={`${formatBytes(metrics.disk.total)} total • ${formatBytes(metrics.disk.free)} free`}
        />
      </div>

      {/* Real-time Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resource Usage Over Time
            </CardTitle>
            <CardDescription>
              CPU and Memory usage (last 20 minutes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="CPU %"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                  name="Memory %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Connections</CardTitle>
            <CardDescription>Network connections over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="connections"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Connections"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Status</CardTitle>
          <CardDescription>
            Health status of all backend services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      service.status === "healthy"
                        ? "bg-green-500"
                        : service.status === "degraded"
                          ? "bg-yellow-500"
                          : "bg-red-500",
                    )}
                  />
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uptime: {formatUptime(Date.now() - service.uptime)}
                      {service.responseTime &&
                        ` • Response: ${service.responseTime.toFixed(1)}ms`}
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(service.status)}>
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Database Performance
          </CardTitle>
          <CardDescription>
            PostgreSQL connection and query metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Active Connections
              </p>
              <p className="text-2xl font-bold">
                {metrics.database.connections}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Queries/sec</p>
              <p className="text-2xl font-bold">{metrics.database.queries}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Query Time</p>
              <p className="text-2xl font-bold">
                {metrics.database.avgQueryTime.toFixed(1)}ms
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Resource Card Component
// ============================================================================

interface ResourceCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  unit: string;
  percentage: number;
  description: string;
}

function ResourceCard({
  title,
  icon,
  value,
  unit,
  percentage,
  description,
}: ResourceCardProps) {
  const statusColor = getUsageColor(percentage);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold", statusColor)}>{value}</span>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        <Progress value={percentage} className="mb-2 h-2" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{description}</span>
          <span className={statusColor}>{percentage.toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
