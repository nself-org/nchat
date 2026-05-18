"use client";

/**
 * Admin Audit Log Page - Main audit log viewer
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  Activity,
  Shield,
  Lock,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Calendar,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useAuditStore } from "@/stores/audit-store";
import type {
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
} from "@/lib/audit/audit-types";

import {
  AuditLogViewer,
  AuditSecurityEvents,
  AuditAdminActions,
  AuditSummaryCard,
} from "@/components/audit";

// ============================================================================
// Mock Data (for demo purposes)
// ============================================================================

function generateMockAuditData(): AuditLogEntry[] {
  const categories: AuditCategory[] = [
    "user",
    "message",
    "channel",
    "file",
    "admin",
    "security",
    "integration",
  ];
  const severities: AuditSeverity[] = ["info", "warning", "error", "critical"];
  const userActions = [
    "login",
    "logout",
    "signup",
    "password_change",
    "profile_update",
  ];
  const securityActions = [
    "failed_login",
    "api_key_create",
    "mfa_enable",
    "suspicious_activity",
  ];
  const adminActions = [
    "role_change",
    "settings_change",
    "user_ban",
    "config_update",
  ];
  const messageActions = ["create", "edit", "delete", "pin"];
  const channelActions = [
    "create",
    "update",
    "archive",
    "member_add",
    "member_remove",
  ];

  const users = [
    {
      id: "1",
      displayName: "Workspace Owner",
      email: "owner@nself.org",
      username: "owner",
    },
    {
      id: "2",
      displayName: "Admin User",
      email: "admin@nself.org",
      username: "admin",
    },
    {
      id: "3",
      displayName: "Moderator User",
      email: "mod@nself.org",
      username: "moderator",
    },
    {
      id: "4",
      displayName: "Regular Member",
      email: "member@nself.org",
      username: "member",
    },
    { id: "system", displayName: "System", email: "", username: "system" },
  ];

  const entries: AuditLogEntry[] = [];
  const now = new Date();

  for (let i = 0; i < 100; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    let action: string;

    switch (category) {
      case "security":
        action =
          securityActions[Math.floor(Math.random() * securityActions.length)];
        break;
      case "admin":
        action = adminActions[Math.floor(Math.random() * adminActions.length)];
        break;
      case "message":
        action =
          messageActions[Math.floor(Math.random() * messageActions.length)];
        break;
      case "channel":
        action =
          channelActions[Math.floor(Math.random() * channelActions.length)];
        break;
      default:
        action = userActions[Math.floor(Math.random() * userActions.length)];
    }

    const user = users[Math.floor(Math.random() * users.length)];
    const timestamp = new Date(
      now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    );
    const success = Math.random() > 0.1;
    const severity =
      category === "security"
        ? severities[Math.floor(Math.random() * severities.length)]
        : success
          ? "info"
          : "warning";

    entries.push({
      id: `entry-${i}`,
      timestamp,
      category,
      action: action as any,
      severity,
      actor: {
        id: user.id,
        type: user.id === "system" ? "system" : "user",
        displayName: user.displayName,
        email: user.email,
        username: user.username,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      },
      description: `${user.displayName} performed ${action.replace(/_/g, " ")}`,
      success,
      errorMessage: success
        ? undefined
        : "Action failed due to permission denied",
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
      resource:
        category === "channel"
          ? {
              type: "channel",
              id: `channel-${Math.floor(Math.random() * 10)}`,
              name: ["general", "random", "engineering", "design", "marketing"][
                Math.floor(Math.random() * 5)
              ],
            }
          : undefined,
    });
  }

  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

// ============================================================================
// Component
// ============================================================================

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    entries,
    statistics,
    isLoading,
    setEntries,
    refreshStatistics,
    setLoading,
  } = useAuditStore();

  // Prefix with underscore as it's unused
  const _statistics = statistics;

  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState("7d");

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, authLoading, router]);

  // Load mock data on mount
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const mockData = generateMockAuditData();
      setEntries(mockData);
      refreshStatistics();
      setLoading(false);
    }, 500);
  }, [setEntries, refreshStatistics, setLoading]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mockData = generateMockAuditData();
    setEntries(mockData);
    refreshStatistics();
    setLoading(false);
  }, [setEntries, refreshStatistics, setLoading]);

  const handleSettingsClick = useCallback(() => {
    router.push("/admin/audit/settings");
  }, [router]);

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportName = `audit-log-${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportName);
    linkElement.click();
  };

  if (authLoading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  // Calculate summary stats
  const securityCount = entries.filter((e) => e.category === "security").length;
  const adminCount = entries.filter((e) => e.category === "admin").length;
  const _failedCount = entries.filter((e) => !e.success).length;
  const last24h = entries.filter(
    (e) => new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000,
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Activity className="h-8 w-8" />
              Audit Logs
            </h1>
            <p className="mt-1 text-muted-foreground">
              Monitor and review all system activities and security events
            </p>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange === "7d"
                    ? "Last 7 days"
                    : dateRange === "30d"
                      ? "Last 30 days"
                      : "Last 90 days"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40">
                <div className="space-y-1">
                  {["7d", "30d", "90d"].map((range) => (
                    <Button
                      key={range}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setDateRange(range)}
                    >
                      {range === "7d"
                        ? "Last 7 days"
                        : range === "30d"
                          ? "Last 30 days"
                          : "Last 90 days"}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
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
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <AuditSummaryCard
            title="Total Events"
            value={entries.length}
            description="In selected period"
            icon={<Activity className="h-5 w-5 text-blue-500" />}
          />
          <AuditSummaryCard
            title="Last 24 Hours"
            value={last24h}
            description="Actions performed"
            icon={<BarChart3 className="h-5 w-5 text-green-500" />}
          />
          <AuditSummaryCard
            title="Security Events"
            value={securityCount}
            description="Security-related"
            icon={<Lock className="h-5 w-5 text-red-500" />}
          />
          <AuditSummaryCard
            title="Admin Actions"
            value={adminCount}
            description="Administrative actions"
            icon={<Shield className="h-5 w-5 text-purple-500" />}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="gap-2">
              <Activity className="h-4 w-4" />
              All Events
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              Admin Actions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <AuditLogViewer
              title="All Audit Events"
              description="View and search all audit log events across the system"
              onRefresh={handleRefresh}
              onSettingsClick={handleSettingsClick}
              showSearch
              showFilters
              showExport
              showSettings={false}
            />
          </TabsContent>

          <TabsContent value="security">
            <AuditSecurityEvents
              entries={entries}
              onEntryClick={(entry) => {}}
            />
          </TabsContent>

          <TabsContent value="admin">
            <AuditAdminActions entries={entries} onEntryClick={(entry) => {}} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
