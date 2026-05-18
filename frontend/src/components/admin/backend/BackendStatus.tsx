"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Terminal,
  Database,
  Server,
  Shield,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";

import { logger } from "@/lib/logger";

interface ServiceStatus {
  name: string;
  status: "healthy" | "unhealthy" | "starting" | "stopped";
  uptime: string;
  cpu: string;
  memory: string;
  url?: string;
}

export function BackendStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchServiceStatus();
    const interval = setInterval(fetchServiceStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchServiceStatus = async () => {
    try {
      // In production, this would call an API that executes `nself status --json`
      // For now, using mock data
      const mockData: ServiceStatus[] = [
        {
          name: "PostgreSQL",
          status: "healthy",
          uptime: "5d 3h",
          cpu: "12%",
          memory: "1.2GB",
          url: "postgres://localhost:5432",
        },
        {
          name: "Hasura GraphQL",
          status: "healthy",
          uptime: "5d 3h",
          cpu: "8%",
          memory: "512MB",
          url: "https://api.local.nself.org",
        },
        {
          name: "Auth Service",
          status: "healthy",
          uptime: "5d 3h",
          cpu: "3%",
          memory: "256MB",
          url: "https://auth.local.nself.org",
        },
        {
          name: "Nginx",
          status: "healthy",
          uptime: "5d 3h",
          cpu: "1%",
          memory: "64MB",
          url: "https://local.nself.org",
        },
        {
          name: "Redis",
          status: "healthy",
          uptime: "5d 3h",
          cpu: "2%",
          memory: "128MB",
        },
      ];

      setServices(mockData);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      logger.error("Failed to fetch service status:", error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "starting":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "stopped":
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus["status"]) => {
    const variants = {
      healthy: "default" as const,
      unhealthy: "destructive" as const,
      starting: "secondary" as const,
      stopped: "outline" as const,
    };

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getServiceIcon = (name: string) => {
    if (name.includes("PostgreSQL")) return <Database className="h-5 w-5" />;
    if (name.includes("Hasura")) return <Zap className="h-5 w-5" />;
    if (name.includes("Auth")) return <Shield className="h-5 w-5" />;
    return <Server className="h-5 w-5" />;
  };

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const totalCount = services.length;
  const healthPercentage =
    totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Backend Services</h2>
          <p className="text-sm text-muted-foreground">
            {healthyCount}/{totalCount} services healthy ({healthPercentage}%)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchServiceStatus}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://admin.local.nself.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Terminal className="mr-2 h-4 w-4" />
              Open Admin UI
            </a>
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getServiceIcon(service.name)}
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                </div>
                {getStatusIcon(service.status)}
              </div>
              <CardDescription className="flex items-center gap-2">
                {getStatusBadge(service.status)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span className="font-medium">{service.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU:</span>
                  <span className="font-medium">{service.cpu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memory:</span>
                  <span className="font-medium">{service.memory}</span>
                </div>
                {service.url && (
                  <div className="border-t pt-2">
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-xs text-blue-600 hover:underline"
                    >
                      {service.url}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button size="sm" variant="outline">
            View Logs
          </Button>
          <Button size="sm" variant="outline">
            Database Console
          </Button>
          <Button size="sm" variant="outline">
            GraphQL Console
          </Button>
          <Button size="sm" variant="outline">
            Monitoring
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
