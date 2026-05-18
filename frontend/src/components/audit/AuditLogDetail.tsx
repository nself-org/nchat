"use client";

/**
 * AuditLogDetail - Modal component for viewing audit log entry details
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
  Globe,
  Server,
  Copy,
  ExternalLink,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

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
  user: <User className="h-5 w-5" />,
  message: <MessageSquare className="h-5 w-5" />,
  channel: <Hash className="h-5 w-5" />,
  file: <File className="h-5 w-5" />,
  attachment: <File className="h-5 w-5" />,
  moderation: <Shield className="h-5 w-5" />,
  admin: <Shield className="h-5 w-5" />,
  security: <Lock className="h-5 w-5" />,
  integration: <Puzzle className="h-5 w-5" />,
};

const severityIcons: Record<AuditSeverity, React.ReactNode> = {
  info: <Info className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  critical: <AlertOctagon className="h-5 w-5" />,
};

// ============================================================================
// Types
// ============================================================================

interface AuditLogDetailProps {
  entry: AuditLogEntry | null;
  open: boolean;
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AuditLogDetail({ entry, open, onClose }: AuditLogDetailProps) {
  if (!entry) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-lg p-2",
                getCategoryBadgeClass(entry.category),
              )}
            >
              {categoryIcons[entry.category]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {getActionDisplayName(entry.action)}
                {entry.success ? (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    <X className="mr-1 h-3 w-3" />
                    Failed
                  </Badge>
                )}
              </div>
              <p className="text-sm font-normal text-muted-foreground">
                {formatTimestamp(entry.timestamp, "long")}
              </p>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Description
            </h4>
            <p className="text-sm">{entry.description}</p>
            {entry.errorMessage && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Error:</strong> {entry.errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* Actor */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Actor
            </h4>
            <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {(
                    entry.actor.displayName ||
                    entry.actor.username ||
                    entry.actor.id
                  )
                    .charAt(0)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {entry.actor.displayName ||
                      entry.actor.username ||
                      "Unknown"}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {entry.actor.type}
                  </Badge>
                </div>
                {entry.actor.email && (
                  <p className="text-sm text-muted-foreground">
                    {entry.actor.email}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{entry.actor.id}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => copyToClipboard(entry.actor.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Resource */}
          {entry.resource && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                Resource
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 capitalize">
                      {entry.resource.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <span className="ml-2 font-mono text-xs">
                      {entry.resource.id}
                    </span>
                  </div>
                  {entry.resource.name && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2">{entry.resource.name}</span>
                    </div>
                  )}
                </div>
                {entry.resource.previousValue !== undefined && (
                  <div className="mt-3 border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      Previous Value:
                    </span>
                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(entry.resource.previousValue, null, 2)}
                    </pre>
                  </div>
                )}
                {entry.resource.newValue !== undefined && (
                  <div className="mt-3">
                    <span className="text-xs text-muted-foreground">
                      New Value:
                    </span>
                    <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(entry.resource.newValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Target */}
          {entry.target && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                Target
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 capitalize">{entry.target.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <span className="ml-2 font-mono text-xs">
                      {entry.target.id}
                    </span>
                  </div>
                  {entry.target.name && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2">{entry.target.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category & Severity */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                Category
              </h4>
              <Badge
                className={cn("gap-1", getCategoryBadgeClass(entry.category))}
              >
                {categoryIcons[entry.category]}
                {entry.category}
              </Badge>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                Severity
              </h4>
              <Badge
                className={cn("gap-1", getSeverityBadgeClass(entry.severity))}
              >
                {severityIcons[entry.severity]}
                {entry.severity}
              </Badge>
            </div>

            {/* IP & Location */}
            {entry.ipAddress && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  IP Address
                </h4>
                <p className="font-mono text-sm">{entry.ipAddress}</p>
              </div>
            )}
            {entry.geoLocation && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Location
                </h4>
                <p className="text-sm">
                  {[
                    entry.geoLocation.city,
                    entry.geoLocation.region,
                    entry.geoLocation.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            )}

            {/* Request ID */}
            {entry.requestId && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Server className="h-4 w-4" />
                  Request ID
                </h4>
                <div className="flex items-center gap-1">
                  <p className="truncate font-mono text-xs">
                    {entry.requestId}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0"
                    onClick={() => copyToClipboard(entry.requestId!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Correlation ID */}
            {entry.correlationId && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Server className="h-4 w-4" />
                  Correlation ID
                </h4>
                <div className="flex items-center gap-1">
                  <p className="truncate font-mono text-xs">
                    {entry.correlationId}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0"
                    onClick={() => copyToClipboard(entry.correlationId!)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                Additional Metadata
              </h4>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Entry ID */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Entry ID:</span>
                <code className="rounded bg-muted px-1.5 py-0.5">
                  {entry.id}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(entry.id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(entry.timestamp, "relative")}
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => copyToClipboard(JSON.stringify(entry, null, 2))}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy JSON
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
