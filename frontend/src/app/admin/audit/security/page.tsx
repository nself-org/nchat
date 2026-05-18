"use client";

/**
 * Admin Audit Security Events Page
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Lock, ArrowLeft, RefreshCw, Download } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useAuditStore } from "@/stores/audit-store";
import type { AuditLogEntry, AuditSeverity } from "@/lib/audit/audit-types";

import { AuditSecurityEvents, AuditLogDetail } from "@/components/audit";

// ============================================================================
// Mock Data Generator
// ============================================================================

function generateMockSecurityData(): AuditLogEntry[] {
  const severities: AuditSeverity[] = ["info", "warning", "error", "critical"];
  const securityActions = [
    "failed_login",
    "suspicious_activity",
    "api_key_create",
    "api_key_revoke",
    "api_key_use",
    "webhook_create",
    "webhook_delete",
    "session_invalidate",
    "mfa_enable",
    "mfa_disable",
    "ip_blocked",
    "rate_limit_exceeded",
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
      displayName: "Unknown User",
      email: "unknown@external.com",
      username: "unknown",
    },
    { id: "system", displayName: "System", email: "", username: "system" },
  ];

  const entries: AuditLogEntry[] = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const action =
      securityActions[Math.floor(Math.random() * securityActions.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const timestamp = new Date(
      now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000,
    );
    const success = action !== "failed_login" ? Math.random() > 0.2 : false;
    const severity = severities[Math.floor(Math.random() * severities.length)];

    entries.push({
      id: `security-${i}`,
      timestamp,
      category: "security",
      action: action as any,
      severity,
      actor: {
        id: user.id,
        type: user.id === "system" ? "system" : "user",
        displayName: user.displayName,
        email: user.email,
        username: user.username,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      },
      description: getSecurityDescription(action, user.displayName, success),
      success,
      errorMessage: success ? undefined : getSecurityError(action),
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
      geoLocation:
        Math.random() > 0.5
          ? {
              country: [
                "United States",
                "Germany",
                "Japan",
                "Brazil",
                "Unknown",
              ][Math.floor(Math.random() * 5)],
              city: ["New York", "Berlin", "Tokyo", "Sao Paulo", "Unknown"][
                Math.floor(Math.random() * 5)
              ],
            }
          : undefined,
    });
  }

  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function getSecurityDescription(
  action: string,
  actor: string,
  success: boolean,
): string {
  const descriptions: Record<string, string> = {
    failed_login: `Failed login attempt for ${actor}`,
    suspicious_activity: `Suspicious activity detected for ${actor}`,
    api_key_create: `${actor} created a new API key`,
    api_key_revoke: `${actor} revoked an API key`,
    api_key_use: `API key used by ${actor}`,
    webhook_create: `${actor} created a webhook`,
    webhook_delete: `${actor} deleted a webhook`,
    session_invalidate: `Session invalidated for ${actor}`,
    mfa_enable: `${actor} enabled MFA`,
    mfa_disable: `${actor} disabled MFA`,
    ip_blocked: `IP address blocked for ${actor}`,
    rate_limit_exceeded: `Rate limit exceeded for ${actor}`,
  };
  return descriptions[action] || `${actor} performed ${action}`;
}

function getSecurityError(action: string): string {
  const errors: Record<string, string> = {
    failed_login: "Invalid credentials provided",
    suspicious_activity: "Unusual behavior pattern detected",
    api_key_create: "API key creation failed",
    session_invalidate: "Session invalidation failed",
    rate_limit_exceeded: "Too many requests from this IP",
    ip_blocked: "IP address has been blocked due to suspicious activity",
  };
  return errors[action] || "Operation failed";
}

// ============================================================================
// Component
// ============================================================================

export default function SecurityEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { setLoading, isLoading } = useAuditStore();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || !["owner", "admin"].includes(user.role))) {
      router.push("/chat");
    }
  }, [user, authLoading, router]);

  // Load mock data on mount
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const mockData = generateMockSecurityData();
      setEntries(mockData);
      setLoading(false);
    }, 500);
  }, [setLoading]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mockData = generateMockSecurityData();
    setEntries(mockData);
    setLoading(false);
  }, [setLoading]);

  const handleEntryClick = useCallback((entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setIsDetailOpen(true);
  }, []);

  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportName = `security-events-${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportName);
    linkElement.click();
  };

  if (authLoading || !user || !["owner", "admin"].includes(user.role)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2"
              onClick={() => router.push("/admin/audit")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Audit Logs
            </Button>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Lock className="h-8 w-8" />
              Security Events
            </h1>
            <p className="mt-1 text-muted-foreground">
              Monitor security-related events and potential threats
            </p>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        {/* Security Events Component */}
        <AuditSecurityEvents
          entries={entries}
          onEntryClick={handleEntryClick}
        />

        {/* Detail Modal */}
        <AuditLogDetail
          entry={selectedEntry}
          open={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedEntry(null);
          }}
        />
      </div>
    </AdminLayout>
  );
}
