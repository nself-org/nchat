"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Server,
  Database,
  Shield,
  HardDrive,
  Globe,
  Activity,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "checking";
  message?: string;
  url?: string;
  icon: React.ReactNode;
}

interface DeploymentInfo {
  environment: string;
  region: string;
  deployedAt: string;
  version: string;
  commitSha?: string;
  buildTime?: string;
}

export default function DeploymentStatusChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(
    null,
  );

  useEffect(() => {
    performHealthCheck();
    loadDeploymentInfo();
  }, []);

  const performHealthCheck = async () => {
    setIsChecking(true);

    const checks: HealthCheck[] = [
      {
        name: "Frontend",
        status: "checking",
        icon: <Globe className="h-4 w-4" />,
      },
      {
        name: "GraphQL API",
        status: "checking",
        url: process.env.NEXT_PUBLIC_GRAPHQL_URL,
        icon: <Server className="h-4 w-4" />,
      },
      {
        name: "Authentication",
        status: "checking",
        url: process.env.NEXT_PUBLIC_AUTH_URL,
        icon: <Shield className="h-4 w-4" />,
      },
      {
        name: "Storage",
        status: "checking",
        url: process.env.NEXT_PUBLIC_STORAGE_URL,
        icon: <HardDrive className="h-4 w-4" />,
      },
      {
        name: "Database",
        status: "checking",
        icon: <Database className="h-4 w-4" />,
      },
    ];

    setHealthChecks(checks);

    // Check Frontend (always healthy if we're running)
    checks[0].status = "healthy";
    checks[0].message = "Frontend is running";

    // Check GraphQL API
    try {
      const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
      if (graphqlUrl) {
        const response = await fetch(graphqlUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "{ __typename }",
          }),
        });
        checks[1].status = response.ok ? "healthy" : "degraded";
        checks[1].message = response.ok
          ? "GraphQL API is responsive"
          : `HTTP ${response.status}`;
      } else {
        checks[1].status = "unhealthy";
        checks[1].message = "GraphQL URL not configured";
      }
    } catch (error) {
      checks[1].status = "unhealthy";
      checks[1].message = "Cannot connect to GraphQL API";
    }

    // Check Authentication
    try {
      const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
      if (authUrl) {
        const response = await fetch(`${authUrl}/healthz`, {
          method: "GET",
        });
        checks[2].status = response.ok ? "healthy" : "degraded";
        checks[2].message = response.ok
          ? "Auth service is responsive"
          : `HTTP ${response.status}`;
      } else {
        checks[2].status = "unhealthy";
        checks[2].message = "Auth URL not configured";
      }
    } catch (error) {
      checks[2].status = "unhealthy";
      checks[2].message = "Cannot connect to Auth service";
    }

    // Check Storage
    try {
      const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL;
      if (storageUrl) {
        const response = await fetch(`${storageUrl}/healthz`, {
          method: "GET",
        });
        checks[3].status = response.ok ? "healthy" : "degraded";
        checks[3].message = response.ok
          ? "Storage service is responsive"
          : `HTTP ${response.status}`;
      } else {
        checks[3].status = "unhealthy";
        checks[3].message = "Storage URL not configured";
      }
    } catch (error) {
      checks[3].status = "unhealthy";
      checks[3].message = "Cannot connect to Storage service";
    }

    // Check Database (via GraphQL)
    try {
      const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL;
      if (graphqlUrl && checks[1].status === "healthy") {
        // Database is healthy if GraphQL is healthy
        checks[4].status = "healthy";
        checks[4].message = "Database is accessible via GraphQL";
      } else {
        checks[4].status = "degraded";
        checks[4].message = "Database status depends on GraphQL";
      }
    } catch (error) {
      checks[4].status = "unhealthy";
      checks[4].message = "Cannot verify database status";
    }

    setHealthChecks(checks);
    setLastChecked(new Date());
    setIsChecking(false);
  };

  const loadDeploymentInfo = () => {
    const info: DeploymentInfo = {
      environment: process.env.NEXT_PUBLIC_ENV || "production",
      region: process.env.VERCEL_REGION || "Unknown",
      deployedAt:
        process.env.VERCEL_GIT_COMMIT_AUTHORED_DATE || new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_RELEASE_VERSION || "0.9.1",
      commitSha:
        process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "Unknown",
      buildTime: process.env.BUILD_TIME,
    };
    setDeploymentInfo(info);
  };

  const getStatusIcon = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "unhealthy":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "checking":
        return (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        );
    }
  };

  const getStatusBadge = (status: HealthCheck["status"]) => {
    switch (status) {
      case "healthy":
        return <Badge variant="default">Healthy</Badge>;
      case "degraded":
        return <Badge variant="secondary">Degraded</Badge>;
      case "unhealthy":
        return <Badge variant="destructive">Unhealthy</Badge>;
      case "checking":
        return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const overallHealth = healthChecks.length
    ? healthChecks.every((check) => check.status === "healthy")
      ? "healthy"
      : healthChecks.some((check) => check.status === "unhealthy")
        ? "unhealthy"
        : "degraded"
    : "checking";

  const healthyCount = healthChecks.filter(
    (check) => check.status === "healthy",
  ).length;
  const healthPercentage = healthChecks.length
    ? (healthyCount / healthChecks.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Deployment Status
              </CardTitle>
              <CardDescription>
                Monitor the health of your deployment and services
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(overallHealth)}
              <Button
                variant="outline"
                size="sm"
                onClick={performHealthCheck}
                disabled={isChecking}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Health</span>
              <span className="font-medium">
                {healthyCount}/{healthChecks.length} services healthy
              </span>
            </div>
            <Progress value={healthPercentage} className="h-2" />
          </div>

          {lastChecked && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last checked: {lastChecked.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Service Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthChecks.map((check, index) => (
              <div key={check.name}>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{check.icon}</div>
                    <div>
                      <div className="text-sm font-medium">{check.name}</div>
                      {check.message && (
                        <div className="text-xs text-muted-foreground">
                          {check.message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(check.url, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {getStatusIcon(check.status)}
                  </div>
                </div>
                {index < healthChecks.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Information */}
      {deploymentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deployment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Environment</div>
                <div className="font-medium capitalize">
                  {deploymentInfo.environment}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Region</div>
                <div className="font-medium">{deploymentInfo.region}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Version</div>
                <div className="font-medium">{deploymentInfo.version}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Commit</div>
                <div className="font-mono text-xs">
                  {deploymentInfo.commitSha}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">Deployed At</div>
                <div className="font-medium">
                  {new Date(deploymentInfo.deployedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings and Alerts */}
      {overallHealth === "unhealthy" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Service Issues Detected</AlertTitle>
          <AlertDescription>
            One or more services are experiencing issues. Please check the
            service health above and verify your environment configuration.
          </AlertDescription>
        </Alert>
      )}

      {overallHealth === "degraded" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Degraded Performance</AlertTitle>
          <AlertDescription>
            Some services are experiencing degraded performance. This may affect
            functionality. Monitor the situation and check logs for more
            details.
          </AlertDescription>
        </Alert>
      )}

      {process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Development Mode Active</AlertTitle>
          <AlertDescription>
            Development authentication is enabled. This is NOT secure for
            production. Set NEXT_PUBLIC_USE_DEV_AUTH=false before deploying.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
