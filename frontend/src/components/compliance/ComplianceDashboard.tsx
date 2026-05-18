"use client";

import { useState } from "react";
import {
  Shield,
  Clock,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  Lock,
  Download,
  Trash2,
  BarChart3,
  Settings,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useComplianceStore,
  selectComplianceStats,
} from "@/stores/compliance-store";
import type { ComplianceStandard } from "@/lib/compliance/compliance-types";
import { getComplianceStandardInfo } from "@/lib/compliance/compliance-types";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && trendValue && (
          <p
            className={`text-xs ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                  ? "text-red-600"
                  : "text-muted-foreground"
            }`}
          >
            {trendValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ComplianceBadgeDisplayProps {
  standard: ComplianceStandard;
  certified: boolean;
  expirationDate?: Date;
}

function ComplianceBadgeDisplay({
  standard,
  certified,
  expirationDate,
}: ComplianceBadgeDisplayProps) {
  const info = getComplianceStandardInfo(standard);

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full p-2 ${
            certified
              ? "bg-green-100 text-green-600"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {certified ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <Shield className="h-5 w-5" />
          )}
        </div>
        <div>
          <p className="font-medium">{info.name}</p>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={certified ? "default" : "secondary"}>
          {certified ? "Certified" : "Not Certified"}
        </Badge>
        {certified && expirationDate && (
          <p className="mt-1 text-xs text-muted-foreground">
            Expires: {expirationDate.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

export function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const stats = useComplianceStore(selectComplianceStats);
  const { legalHolds, exportRequests, deletionRequests } = useComplianceStore();

  const activeLegalHolds = legalHolds.filter((h) => h.status === "active");
  const pendingExports = exportRequests.filter((r) => r.status === "pending");
  const pendingDeletions = deletionRequests.filter(
    (r) => r.status === "pending",
  );

  const complianceStandards: ComplianceStandard[] = [
    "gdpr",
    "ccpa",
    "hipaa",
    "soc2",
    "iso27001",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Shield className="h-8 w-8" />
            Compliance Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage data retention, privacy, and regulatory compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {(pendingExports.length > 0 || pendingDeletions.length > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Action Required</p>
              <p className="text-sm text-yellow-700">
                You have {pendingExports.length} pending export request(s) and{" "}
                {pendingDeletions.length} pending deletion request(s).
              </p>
            </div>
            <Button variant="outline" size="sm">
              Review Requests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Retention Policies"
          value={stats.activePolicies}
          description={`${stats.totalPolicies} total policies`}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          title="Active Legal Holds"
          value={activeLegalHolds.length}
          description="Data preservation in effect"
          icon={<Lock className="h-4 w-4" />}
        />
        <StatCard
          title="Export Requests"
          value={pendingExports.length}
          description="Pending GDPR requests"
          icon={<Download className="h-4 w-4" />}
        />
        <StatCard
          title="Deletion Requests"
          value={pendingDeletions.length}
          description="Right to be forgotten"
          icon={<Trash2 className="h-4 w-4" />}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Compliance Status
                </CardTitle>
                <CardDescription>
                  Current compliance posture across regulations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>GDPR Compliance</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: "85%" }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CCPA Compliance</span>
                    <span className="font-medium">90%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: "90%" }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Data Retention</span>
                    <span className="font-medium">100%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest compliance events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-100 p-1 text-blue-600">
                      <Download className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Data export requested
                      </p>
                      <p className="text-xs text-muted-foreground">
                        user@example.com - 2 hours ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-green-100 p-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Retention policy updated
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Messages policy - 5 hours ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-yellow-100 p-1 text-yellow-600">
                      <Lock className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Legal hold created</p>
                      <p className="text-xs text-muted-foreground">
                        Matter #12345 - 1 day ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-red-100 p-1 text-red-600">
                      <Trash2 className="h-3 w-3" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Deletion request completed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        former@example.com - 2 days ago
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common compliance tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button variant="outline" className="h-auto flex-col py-4">
                  <Clock className="mb-2 h-6 w-6" />
                  <span>Manage Retention</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col py-4">
                  <Lock className="mb-2 h-6 w-6" />
                  <span>Legal Holds</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col py-4">
                  <Users className="mb-2 h-6 w-6" />
                  <span>User Requests</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col py-4">
                  <FileText className="mb-2 h-6 w-6" />
                  <span>Generate Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Certifications</CardTitle>
              <CardDescription>
                Your organization's compliance certifications and badges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {complianceStandards.map((standard) => (
                <ComplianceBadgeDisplay
                  key={standard}
                  standard={standard}
                  certified={standard === "gdpr" || standard === "ccpa"}
                  expirationDate={
                    standard === "gdpr"
                      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                      : undefined
                  }
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>
                Data subject requests requiring action
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingExports.length === 0 && pendingDeletions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingExports.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">Data Export Request</p>
                          <p className="text-sm text-muted-foreground">
                            {request.userEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>Pending</Badge>
                        <Button size="sm">Process</Button>
                      </div>
                    </div>
                  ))}
                  {pendingDeletions.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">Deletion Request</p>
                          <p className="text-sm text-muted-foreground">
                            {request.userEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Pending</Badge>
                        <Button size="sm">Review</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Complete history of compliance-related actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12" />
                <p>Audit log integration coming soon</p>
                <Button variant="outline" className="mt-4">
                  Export Audit Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
