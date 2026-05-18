"use client";

/**
 * Compliance Dashboard Component
 *
 * Central dashboard for compliance management:
 * - Data retention policy status
 * - Active legal holds
 * - GDPR request tracking
 * - Audit log overview
 * - Terms of Service management
 * - Compliance metrics and reporting
 */

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  FileText,
  Lock,
  Download,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
  Scale,
  FileCheck,
  TrendingUp,
  Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataRetention } from "./DataRetention";
import { AuditExport } from "./AuditExport";

// Import types
import type {
  RetentionPolicy,
  LegalHold,
  DataExportRequest,
  DataDeletionRequest,
  ComplianceReport,
} from "@/lib/compliance/compliance-types";

// ============================================================================
// Interfaces
// ============================================================================

interface ComplianceMetrics {
  activeRetentionPolicies: number;
  scheduledDeletions: number;
  activeLegalHolds: number;
  pendingGDPRRequests: number;
  tosAcceptanceRate: number;
  lastAuditDate?: Date;
  nextScheduledDeletion?: Date;
  dataUnderHold: {
    users: number;
    channels: number;
    messages: number;
    files: number;
  };
}

interface ComplianceAlert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
}

// ============================================================================
// Main Component
// ============================================================================

export function ComplianceDashboard() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      // Mock data for now
      setMetrics({
        activeRetentionPolicies: 5,
        scheduledDeletions: 1247,
        activeLegalHolds: 2,
        pendingGDPRRequests: 3,
        tosAcceptanceRate: 94.8,
        lastAuditDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        nextScheduledDeletion: new Date(Date.now() + 24 * 60 * 60 * 1000),
        dataUnderHold: {
          users: 5,
          channels: 3,
          messages: 1523,
          files: 247,
        },
      });

      // Generate alerts
      generateAlerts();
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = () => {
    const newAlerts: ComplianceAlert[] = [];

    // Check for pending GDPR requests
    newAlerts.push({
      id: "1",
      type: "warning",
      title: "Pending GDPR Requests",
      description:
        "3 data export requests pending review. GDPR requires response within 30 days.",
      action: {
        label: "Review Requests",
        onClick: () => {
          // Navigate to GDPR requests
        },
      },
      timestamp: new Date(),
    });

    // Check for upcoming scheduled deletions
    newAlerts.push({
      id: "2",
      type: "info",
      title: "Scheduled Deletion Tomorrow",
      description: "1,247 items scheduled for deletion tomorrow at 2:00 AM.",
      timestamp: new Date(),
    });

    setAlerts(newAlerts);
  };

  const getAlertIcon = (type: ComplianceAlert["type"]) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Manage data retention, legal holds, and regulatory compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Audit Logs
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={cn(
                "border-l-4",
                alert.type === "error" && "border-l-red-500",
                alert.type === "warning" && "border-l-yellow-500",
                alert.type === "info" && "border-l-blue-500",
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <h4 className="font-semibold">{alert.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  {alert.action && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={alert.action.onClick}
                    >
                      {alert.action.label}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Retention Policies
              </CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.activeRetentionPolicies}
              </div>
              <p className="text-xs text-muted-foreground">Active policies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Scheduled Deletions
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.scheduledDeletions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Items pending deletion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Legal Holds</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.activeLegalHolds}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.dataUnderHold.users} users affected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                GDPR Requests
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.pendingGDPRRequests}
              </div>
              <p className="text-xs text-muted-foreground">Pending review</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="legal-holds">Legal Holds</TabsTrigger>
          <TabsTrigger value="gdpr">GDPR Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit Export</TabsTrigger>
          <TabsTrigger value="terms">Terms of Service</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Data Under Legal Hold */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Data Under Legal Hold
                </CardTitle>
                <CardDescription>
                  Protected data that cannot be deleted
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Users
                      </span>
                      <span className="font-semibold">
                        {metrics.dataUnderHold.users}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Channels
                      </span>
                      <span className="font-semibold">
                        {metrics.dataUnderHold.channels}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Messages
                      </span>
                      <span className="font-semibold">
                        {metrics.dataUnderHold.messages.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Files
                      </span>
                      <span className="font-semibold">
                        {metrics.dataUnderHold.files.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Compliance Status
                </CardTitle>
                <CardDescription>Current compliance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      ToS Acceptance Rate
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {metrics?.tosAcceptanceRate}%
                      </span>
                      <Badge
                        variant={
                          metrics && metrics.tosAcceptanceRate > 90
                            ? "default"
                            : "destructive"
                        }
                      >
                        {metrics && metrics.tosAcceptanceRate > 90
                          ? "Good"
                          : "Action Required"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Last Audit
                    </span>
                    <span className="font-semibold">
                      {metrics?.lastAuditDate?.toLocaleDateString() || "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Next Scheduled Deletion
                    </span>
                    <span className="font-semibold">
                      {metrics?.nextScheduledDeletion
                        ? new Date(
                            metrics.nextScheduledDeletion,
                          ).toLocaleDateString()
                        : "Not scheduled"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Compliance Activity
              </CardTitle>
              <CardDescription>
                Latest compliance-related events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Retention job completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      1,247 items deleted
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    2 hours ago
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      GDPR export request completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      User data exported
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    5 hours ago
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Legal hold created</p>
                    <p className="text-xs text-muted-foreground">
                      Matter: Smith v. Jones
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    1 day ago
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Retention Tab */}
        <TabsContent value="retention">
          <DataRetention />
        </TabsContent>

        {/* Legal Holds Tab */}
        <TabsContent value="legal-holds">
          <Card>
            <CardHeader>
              <CardTitle>Legal Holds</CardTitle>
              <CardDescription>
                Manage legal holds for eDiscovery and litigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Legal holds management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GDPR Tab */}
        <TabsContent value="gdpr">
          <Card>
            <CardHeader>
              <CardTitle>GDPR Requests</CardTitle>
              <CardDescription>
                Data export and deletion requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                GDPR request management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Export Tab */}
        <TabsContent value="audit">
          <AuditExport />
        </TabsContent>

        {/* Terms of Service Tab */}
        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              <CardDescription>
                Manage ToS versions and acceptance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                ToS management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ComplianceDashboard;
