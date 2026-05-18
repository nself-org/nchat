"use client";

/**
 * AuditSecurityEvents - Security-focused audit log view
 */

import { useState, useMemo } from "react";
import {
  Shield,
  Lock,
  AlertTriangle,
  AlertOctagon,
  XCircle,
  Key,
  Globe,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  AuditLogEntry,
  AuditSeverity,
  SecurityAction,
} from "@/lib/audit/audit-types";
import {
  formatTimestamp,
  getSeverityBadgeClass,
} from "@/lib/audit/audit-formatter";
import {
  getActionDisplayName,
  getSecurityActions,
} from "@/lib/audit/audit-events";
import { AuditTimeline } from "./AuditTimeline";
import { AuditEventCard } from "./AuditEventCard";

// ============================================================================
// Types
// ============================================================================

interface AuditSecurityEventsProps {
  entries: AuditLogEntry[];
  onEntryClick?: (entry: AuditLogEntry) => void;
  className?: string;
}

interface SecuritySummary {
  totalEvents: number;
  failedLogins: number;
  suspiciousActivities: number;
  apiKeyOperations: number;
  mfaChanges: number;
  ipBlocks: number;
  rateLimitExceeded: number;
  criticalEvents: number;
  errorEvents: number;
  warningEvents: number;
  threatsByIP: { ip: string; count: number }[];
  eventTrend: "up" | "down" | "stable";
}

// ============================================================================
// Helpers
// ============================================================================

function calculateSecuritySummary(entries: AuditLogEntry[]): SecuritySummary {
  let failedLogins = 0;
  let suspiciousActivities = 0;
  let apiKeyOperations = 0;
  let mfaChanges = 0;
  let ipBlocks = 0;
  let rateLimitExceeded = 0;
  let criticalEvents = 0;
  let errorEvents = 0;
  let warningEvents = 0;

  const ipCounts = new Map<string, number>();

  entries.forEach((entry) => {
    // Count by severity
    switch (entry.severity) {
      case "critical":
        criticalEvents++;
        break;
      case "error":
        errorEvents++;
        break;
      case "warning":
        warningEvents++;
        break;
    }

    // Count by action
    switch (entry.action) {
      case "failed_login":
        failedLogins++;
        break;
      case "suspicious_activity":
        suspiciousActivities++;
        break;
      case "api_key_create":
      case "api_key_revoke":
      case "api_key_use":
        apiKeyOperations++;
        break;
      case "mfa_enable":
      case "mfa_disable":
        mfaChanges++;
        break;
      case "ip_blocked":
        ipBlocks++;
        break;
      case "rate_limit_exceeded":
        rateLimitExceeded++;
        break;
    }

    // Count by IP
    if (entry.ipAddress) {
      ipCounts.set(entry.ipAddress, (ipCounts.get(entry.ipAddress) || 0) + 1);
    }
  });

  const threatsByIP = Array.from(ipCounts.entries())
    .map(([ip, count]) => ({ ip, count }))
    .filter((item) => item.count > 1) // Only show IPs with multiple events
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate trend (simplified - compare last 24h to previous 24h)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const recentCount = entries.filter(
    (e) => new Date(e.timestamp) >= oneDayAgo,
  ).length;
  const previousCount = entries.filter((e) => {
    const d = new Date(e.timestamp);
    return d >= twoDaysAgo && d < oneDayAgo;
  }).length;

  let eventTrend: "up" | "down" | "stable" = "stable";
  if (recentCount > previousCount * 1.2) eventTrend = "up";
  else if (recentCount < previousCount * 0.8) eventTrend = "down";

  return {
    totalEvents: entries.length,
    failedLogins,
    suspiciousActivities,
    apiKeyOperations,
    mfaChanges,
    ipBlocks,
    rateLimitExceeded,
    criticalEvents,
    errorEvents,
    warningEvents,
    threatsByIP,
    eventTrend,
  };
}

// ============================================================================
// Component
// ============================================================================

export function AuditSecurityEvents({
  entries,
  onEntryClick,
  className,
}: AuditSecurityEventsProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "cards">("timeline");
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | "all">(
    "all",
  );
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<
    "today" | "week" | "month" | "all"
  >("week");

  // Filter to security events only
  const securityEntries = useMemo(
    () => entries.filter((e) => e.category === "security"),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    let result = securityEntries;

    // Severity filter
    if (severityFilter !== "all") {
      result = result.filter((e) => e.severity === severityFilter);
    }

    // Action filter
    if (actionFilter !== "all") {
      result = result.filter((e) => e.action === actionFilter);
    }

    // Time range filter
    if (timeRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter((e) => new Date(e.timestamp) >= startDate);
    }

    return result;
  }, [securityEntries, severityFilter, actionFilter, timeRange]);

  const summary = useMemo(
    () => calculateSecuritySummary(securityEntries),
    [securityEntries],
  );

  const TrendIcon = summary.eventTrend === "up" ? TrendingUp : TrendingDown;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
          <CardDescription>
            Monitor security-related events and potential threats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{summary.totalEvents}</p>
              <p className="text-sm text-muted-foreground">Total Events</p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <TrendIcon
                  className={cn(
                    "h-4 w-4",
                    summary.eventTrend === "up"
                      ? "text-red-500"
                      : "text-green-500",
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {summary.eventTrend === "up"
                    ? "Increasing"
                    : summary.eventTrend === "down"
                      ? "Decreasing"
                      : "Stable"}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {summary.criticalEvents}
              </p>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4 text-center dark:bg-orange-900/20">
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {summary.errorEvents}
              </p>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center dark:bg-yellow-900/20">
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {summary.warningEvents}
              </p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threat Indicators */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">
                Failed Logins
              </span>
            </div>
            <p className="text-2xl font-bold">{summary.failedLogins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Suspicious</span>
            </div>
            <p className="text-2xl font-bold">{summary.suspiciousActivities}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">API Key Ops</span>
            </div>
            <p className="text-2xl font-bold">{summary.apiKeyOperations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">MFA Changes</span>
            </div>
            <p className="text-2xl font-bold">{summary.mfaChanges}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">IP Blocks</span>
            </div>
            <p className="text-2xl font-bold">{summary.ipBlocks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">
                Rate Limited
              </span>
            </div>
            <p className="text-2xl font-bold">{summary.rateLimitExceeded}</p>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious IPs */}
      {summary.threatsByIP.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              IPs with Multiple Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.threatsByIP.map((item) => (
                <Badge
                  key={item.ip}
                  variant="outline"
                  className="px-3 py-1 font-mono text-sm"
                >
                  {item.ip}
                  <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                    {item.count}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={severityFilter}
            onValueChange={(v) => setSeverityFilter(v as AuditSeverity | "all")}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="failed_login">Failed Login</SelectItem>
              <SelectItem value="suspicious_activity">
                Suspicious Activity
              </SelectItem>
              <SelectItem value="api_key_create">API Key Create</SelectItem>
              <SelectItem value="api_key_revoke">API Key Revoke</SelectItem>
              <SelectItem value="mfa_enable">MFA Enable</SelectItem>
              <SelectItem value="mfa_disable">MFA Disable</SelectItem>
              <SelectItem value="ip_blocked">IP Blocked</SelectItem>
              <SelectItem value="rate_limit_exceeded">Rate Limited</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as typeof timeRange)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "timeline" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("timeline")}
          >
            Timeline
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Cards
          </Button>
        </div>
      </div>

      {/* Events List */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No security events found for the selected filters</p>
          </CardContent>
        </Card>
      ) : viewMode === "timeline" ? (
        <AuditTimeline
          entries={filteredEntries}
          onEntryClick={onEntryClick}
          groupByDate
          maxHeight="500px"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredEntries.map((entry) => (
            <AuditEventCard
              key={entry.id}
              entry={entry}
              onClick={() => onEntryClick?.(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
