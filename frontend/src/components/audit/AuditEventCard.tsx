"use client";

/**
 * AuditEventCard - Summary card for audit events
 */

import {
  User,
  MessageSquare,
  Hash,
  File,
  Shield,
  Lock,
  Puzzle,
  Info,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  Check,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type {
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
} from "@/lib/audit/audit-types";
import {
  formatTimestamp,
  getCategoryBadgeClass,
  getSeverityBadgeClass,
} from "@/lib/audit/audit-formatter";
import { getActionDisplayName } from "@/lib/audit/audit-events";

// ============================================================================
// Icons
// ============================================================================

const categoryIcons: Record<AuditCategory, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  channel: <Hash className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
  attachment: <File className="h-4 w-4" />,
  moderation: <Shield className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
  security: <Lock className="h-4 w-4" />,
  integration: <Puzzle className="h-4 w-4" />,
};

const severityIcons: Record<AuditSeverity, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  critical: <AlertOctagon className="h-4 w-4" />,
};

// ============================================================================
// Types
// ============================================================================

interface AuditEventCardProps {
  entry: AuditLogEntry;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AuditEventCard({
  entry,
  onClick,
  compact = false,
  className,
}: AuditEventCardProps) {
  const actorName =
    entry.actor.displayName ||
    entry.actor.username ||
    entry.actor.email ||
    entry.actor.id;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors",
          className,
        )}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <div
          className={cn("rounded p-1.5", getCategoryBadgeClass(entry.category))}
        >
          {categoryIcons[entry.category]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">
              {getActionDisplayName(entry.action)}
            </span>
            {!entry.success && (
              <X className="h-3 w-3 flex-shrink-0 text-red-500" />
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {actorName} - {formatTimestamp(entry.timestamp, "relative")}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        !entry.success && "border-red-200 dark:border-red-800",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div
            className={cn(
              "flex-shrink-0 rounded-lg p-2",
              getCategoryBadgeClass(entry.category),
            )}
          >
            {categoryIcons[entry.category]}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">
                  {getActionDisplayName(entry.action)}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "flex-shrink-0",
                    getSeverityBadgeClass(entry.severity),
                  )}
                >
                  {severityIcons[entry.severity]}
                </Badge>
              </div>
              {entry.success ? (
                <span className="flex flex-shrink-0 items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <span className="flex flex-shrink-0 items-center gap-1 text-xs text-red-600">
                  <X className="h-3 w-3" />
                  Failed
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
              {entry.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {actorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[150px] truncate">{actorName}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(entry.timestamp, "relative")}
              </div>
            </div>

            {/* Resource Info */}
            {entry.resource && (
              <div className="mt-2 border-t pt-2 text-xs">
                <span className="capitalize text-muted-foreground">
                  {entry.resource.type}:
                </span>{" "}
                <span className="font-mono">
                  {entry.resource.name || entry.resource.id}
                </span>
              </div>
            )}

            {/* Error Message */}
            {entry.errorMessage && (
              <div className="mt-2 line-clamp-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {entry.errorMessage}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Summary Card Component
// ============================================================================

interface AuditSummaryCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function AuditSummaryCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: AuditSummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {trend && (
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs",
                  trend.isPositive ? "text-green-600" : "text-red-600",
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}% from last period
              </p>
            )}
          </div>
          {icon && <div className="rounded-lg bg-muted p-2">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
