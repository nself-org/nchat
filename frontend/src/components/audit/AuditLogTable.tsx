"use client";

/**
 * AuditLogTable - Table component for displaying audit log entries
 */

import { useState } from "react";
import {
  User,
  MessageSquare,
  Hash,
  File,
  Shield,
  Lock,
  Puzzle,
  Activity,
  Info,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import type {
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
  AuditLogSortOptions,
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

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  selectedIds?: string[];
  sort?: AuditLogSortOptions;
  onSort?: (sort: AuditLogSortOptions) => void;
  onSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onRowClick?: (entry: AuditLogEntry) => void;
  selectable?: boolean;
  loading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AuditLogTable({
  entries,
  selectedIds = [],
  sort,
  onSort,
  onSelect,
  onSelectAll,
  onClearSelection,
  onRowClick,
  selectable = false,
  loading = false,
}: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: AuditLogSortOptions["field"]) => {
    if (!onSort) return;
    if (sort?.field === field) {
      onSort({ field, direction: sort.direction === "asc" ? "desc" : "asc" });
    } else {
      onSort({ field, direction: "desc" });
    }
  };

  const SortIcon = ({ field }: { field: AuditLogSortOptions["field"] }) => {
    if (sort?.field !== field) return null;
    return sort.direction === "asc" ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  const allSelected =
    entries.length > 0 && selectedIds.length === entries.length;

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        onClearSelection?.();
                      } else {
                        onSelectAll?.();
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              <th
                className="cursor-pointer px-4 py-3 text-left font-medium hover:bg-muted"
                onClick={() => handleSort("timestamp")}
              >
                Timestamp <SortIcon field="timestamp" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left font-medium hover:bg-muted"
                onClick={() => handleSort("category")}
              >
                Category <SortIcon field="category" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left font-medium hover:bg-muted"
                onClick={() => handleSort("action")}
              >
                Action <SortIcon field="action" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left font-medium hover:bg-muted"
                onClick={() => handleSort("actor")}
              >
                Actor <SortIcon field="actor" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left font-medium hover:bg-muted"
                onClick={() => handleSort("severity")}
              >
                Severity <SortIcon field="severity" />
              </th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td
                  colSpan={selectable ? 8 : 7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  <Activity className="mx-auto mb-2 h-6 w-6 animate-spin" />
                  Loading audit logs...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={selectable ? 8 : 7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No audit log entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <>
                  <tr
                    key={entry.id}
                    className={cn(
                      "hover:bg-muted/30 cursor-pointer transition-colors",
                      selectedIds.includes(entry.id) && "bg-primary/5",
                    )}
                    onClick={() => onRowClick?.(entry)}
                  >
                    {selectable && (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => onSelect?.(entry.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatTimestamp(entry.timestamp, "short")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1",
                          getCategoryBadgeClass(entry.category),
                        )}
                      >
                        {categoryIcons[entry.category]}
                        {entry.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {getActionDisplayName(entry.action)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {(
                              entry.actor.displayName ||
                              entry.actor.username ||
                              entry.actor.id
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[150px] truncate">
                          {entry.actor.displayName ||
                            entry.actor.username ||
                            entry.actor.email ||
                            entry.actor.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1",
                          getSeverityBadgeClass(entry.severity),
                        )}
                      >
                        {severityIcons[entry.severity]}
                        {entry.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {entry.success ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="h-4 w-4" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <X className="h-4 w-4" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRowExpansion(entry.id)}
                      >
                        {expandedRows.has(entry.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  {expandedRows.has(entry.id) && (
                    <tr key={`${entry.id}-expanded`} className="bg-muted/20">
                      <td colSpan={selectable ? 8 : 7} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                          <div>
                            <span className="text-muted-foreground">
                              Description:
                            </span>
                            <p className="mt-1">{entry.description}</p>
                          </div>
                          {entry.resource && (
                            <div>
                              <span className="text-muted-foreground">
                                Resource:
                              </span>
                              <p className="mt-1">
                                {entry.resource.type}:{" "}
                                {entry.resource.name || entry.resource.id}
                              </p>
                            </div>
                          )}
                          {entry.ipAddress && (
                            <div>
                              <span className="text-muted-foreground">
                                IP Address:
                              </span>
                              <p className="mt-1">{entry.ipAddress}</p>
                            </div>
                          )}
                          {entry.errorMessage && (
                            <div className="col-span-full">
                              <span className="text-muted-foreground">
                                Error:
                              </span>
                              <p className="mt-1 text-red-600">
                                {entry.errorMessage}
                              </p>
                            </div>
                          )}
                          {entry.requestId && (
                            <div>
                              <span className="text-muted-foreground">
                                Request ID:
                              </span>
                              <p className="mt-1 font-mono text-xs">
                                {entry.requestId}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
