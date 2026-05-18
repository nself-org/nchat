"use client";

/**
 * AuditAdminActions - Admin actions audit log view
 */

import { useState, useMemo } from "react";
import {
  Shield,
  UserCog,
  Settings,
  Ban,
  UserCheck,
  Sliders,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

import type { AuditLogEntry, AdminAction } from "@/lib/audit/audit-types";
import { formatTimestamp } from "@/lib/audit/audit-formatter";
import { getActionDisplayName } from "@/lib/audit/audit-events";
import { AuditTimeline } from "./AuditTimeline";
import { AuditEventCard } from "./AuditEventCard";

// ============================================================================
// Types
// ============================================================================

interface AuditAdminActionsProps {
  entries: AuditLogEntry[];
  onEntryClick?: (entry: AuditLogEntry) => void;
  className?: string;
}

interface AdminSummary {
  totalActions: number;
  roleChanges: number;
  permissionChanges: number;
  settingsChanges: number;
  userBans: number;
  userUnbans: number;
  configUpdates: number;
  featureToggles: number;
  topAdmins: { id: string; name: string; count: number }[];
  recentActions: AuditLogEntry[];
}

// ============================================================================
// Helpers
// ============================================================================

function calculateAdminSummary(entries: AuditLogEntry[]): AdminSummary {
  let roleChanges = 0;
  let permissionChanges = 0;
  let settingsChanges = 0;
  let userBans = 0;
  let userUnbans = 0;
  let configUpdates = 0;
  let featureToggles = 0;

  const adminCounts = new Map<string, { name: string; count: number }>();

  entries.forEach((entry) => {
    // Count by action
    switch (entry.action) {
      case "role_change":
        roleChanges++;
        break;
      case "permission_change":
        permissionChanges++;
        break;
      case "settings_change":
        settingsChanges++;
        break;
      case "user_ban":
        userBans++;
        break;
      case "user_unban":
        userUnbans++;
        break;
      case "config_update":
        configUpdates++;
        break;
      case "feature_toggle":
        featureToggles++;
        break;
    }

    // Count admins
    const actorId = entry.actor.id;
    const actorName =
      entry.actor.displayName || entry.actor.username || entry.actor.id;
    const existing = adminCounts.get(actorId);
    if (existing) {
      existing.count++;
    } else {
      adminCounts.set(actorId, { name: actorName, count: 1 });
    }
  });

  const topAdmins = Array.from(adminCounts.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalActions: entries.length,
    roleChanges,
    permissionChanges,
    settingsChanges,
    userBans,
    userUnbans,
    configUpdates,
    featureToggles,
    topAdmins,
    recentActions: entries.slice(0, 5),
  };
}

// ============================================================================
// Component
// ============================================================================

export function AuditAdminActions({
  entries,
  onEntryClick,
  className,
}: AuditAdminActionsProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "cards">("timeline");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<
    "today" | "week" | "month" | "all"
  >("week");

  // Filter to admin events only
  const adminEntries = useMemo(
    () => entries.filter((e) => e.category === "admin"),
    [entries],
  );

  // Get unique admins for filter
  const uniqueAdmins = useMemo(() => {
    const admins = new Map<string, string>();
    adminEntries.forEach((entry) => {
      const name =
        entry.actor.displayName || entry.actor.username || entry.actor.id;
      admins.set(entry.actor.id, name);
    });
    return Array.from(admins.entries()).map(([id, name]) => ({ id, name }));
  }, [adminEntries]);

  const filteredEntries = useMemo(() => {
    let result = adminEntries;

    // Action filter
    if (actionFilter !== "all") {
      result = result.filter((e) => e.action === actionFilter);
    }

    // Admin filter
    if (adminFilter !== "all") {
      result = result.filter((e) => e.actor.id === adminFilter);
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
  }, [adminEntries, actionFilter, adminFilter, timeRange]);

  const summary = useMemo(
    () => calculateAdminSummary(adminEntries),
    [adminEntries],
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Admin Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Actions Overview
          </CardTitle>
          <CardDescription>
            Track administrative changes and moderation actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold">{summary.totalActions}</p>
              <p className="text-sm text-muted-foreground">Total Actions</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/20">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {summary.roleChanges}
              </p>
              <p className="text-sm text-muted-foreground">Role Changes</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {summary.settingsChanges}
              </p>
              <p className="text-sm text-muted-foreground">Settings Changed</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {summary.userBans}
              </p>
              <p className="text-sm text-muted-foreground">Users Banned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Breakdown */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">
                Role Changes
              </span>
            </div>
            <p className="text-2xl font-bold">{summary.roleChanges}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Permissions</span>
            </div>
            <p className="text-2xl font-bold">{summary.permissionChanges}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">
                Config Updates
              </span>
            </div>
            <p className="text-2xl font-bold">{summary.configUpdates}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">
                Feature Toggles
              </span>
            </div>
            <p className="text-2xl font-bold">{summary.featureToggles}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Admins */}
      {summary.topAdmins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Most Active Administrators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {summary.topAdmins.map((admin, index) => (
                <div
                  key={admin.id}
                  className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {admin.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{admin.name}</span>
                  <Badge variant="secondary">{admin.count} actions</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="role_change">Role Change</SelectItem>
              <SelectItem value="permission_change">
                Permission Change
              </SelectItem>
              <SelectItem value="settings_change">Settings Change</SelectItem>
              <SelectItem value="user_ban">User Ban</SelectItem>
              <SelectItem value="user_unban">User Unban</SelectItem>
              <SelectItem value="user_kick">User Kick</SelectItem>
              <SelectItem value="user_mute">User Mute</SelectItem>
              <SelectItem value="config_update">Config Update</SelectItem>
              <SelectItem value="feature_toggle">Feature Toggle</SelectItem>
            </SelectContent>
          </Select>

          {uniqueAdmins.length > 0 && (
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Admins</SelectItem>
                {uniqueAdmins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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

      {/* Actions List */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No admin actions found for the selected filters</p>
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
