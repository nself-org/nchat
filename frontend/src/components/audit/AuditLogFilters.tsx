"use client";

/**
 * AuditLogFilters - Filter controls for audit log viewer
 */

import { useState } from "react";
import {
  Filter,
  X,
  Calendar,
  User,
  Tag,
  AlertCircle,
  Activity,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  AuditCategory,
  AuditSeverity,
  AuditLogFilters as AuditLogFiltersType,
  ActorType,
} from "@/lib/audit/audit-types";
import {
  categoryDisplayNames,
  severityDisplayNames,
} from "@/lib/audit/audit-types";

// ============================================================================
// Types
// ============================================================================

interface AuditLogFiltersProps {
  filters: AuditLogFiltersType;
  onChange: (filters: Partial<AuditLogFiltersType>) => void;
  onClear: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

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

const actorTypes: ActorType[] = [
  "user",
  "system",
  "bot",
  "integration",
  "anonymous",
];

// ============================================================================
// Component
// ============================================================================

export function AuditLogFilters({
  filters,
  onChange,
  onClear,
  className,
}: AuditLogFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    (filters.category && filters.category.length > 0) ||
    (filters.severity && filters.severity.length > 0) ||
    (filters.action && filters.action.length > 0) ||
    filters.actorId ||
    filters.actorType ||
    filters.resourceId ||
    filters.startDate ||
    filters.endDate ||
    filters.success !== undefined ||
    filters.ipAddress;

  const toggleCategory = (category: AuditCategory) => {
    const current = filters.category || [];
    if (current.includes(category)) {
      onChange({ category: current.filter((c) => c !== category) });
    } else {
      onChange({ category: [...current, category] });
    }
  };

  const toggleSeverity = (severity: AuditSeverity) => {
    const current = filters.severity || [];
    if (current.includes(severity)) {
      onChange({ severity: current.filter((s) => s !== severity) });
    } else {
      onChange({ severity: [...current, severity] });
    }
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const parseDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    return new Date(dateString);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isExpanded ? "secondary" : "outline"}
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              Active
            </Badge>
          )}
        </Button>

        {/* Quick category toggles */}
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant={
                filters.category?.includes(category) ? "default" : "outline"
              }
              size="sm"
              onClick={() => toggleCategory(category)}
              className="h-8 capitalize"
            >
              {categoryDisplayNames[category]}
            </Button>
          ))}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Severity Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Severity
              </Label>
              <div className="flex flex-wrap gap-1">
                {severities.map((severity) => (
                  <Button
                    key={severity}
                    variant={
                      filters.severity?.includes(severity)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => toggleSeverity(severity)}
                    className="h-7 text-xs capitalize"
                  >
                    {severityDisplayNames[severity]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actor Type Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Actor Type
              </Label>
              <Select
                value={filters.actorType || ""}
                onValueChange={(value) =>
                  onChange({
                    actorType: value ? (value as ActorType) : undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actor types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {actorTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status
              </Label>
              <Select
                value={
                  filters.success === undefined
                    ? ""
                    : filters.success.toString()
                }
                onValueChange={(value) =>
                  onChange({
                    success: value === "" ? undefined : value === "true",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                type="date"
                value={formatDate(filters.startDate)}
                onChange={(e) =>
                  onChange({ startDate: parseDate(e.target.value) })
                }
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                End Date
              </Label>
              <Input
                type="date"
                value={formatDate(filters.endDate)}
                onChange={(e) =>
                  onChange({ endDate: parseDate(e.target.value) })
                }
              />
            </div>

            {/* IP Address Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                IP Address
              </Label>
              <Input
                placeholder="Filter by IP..."
                value={filters.ipAddress || ""}
                onChange={(e) =>
                  onChange({ ipAddress: e.target.value || undefined })
                }
              />
            </div>

            {/* Actor ID Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Actor ID
              </Label>
              <Input
                placeholder="Filter by actor ID..."
                value={filters.actorId || ""}
                onChange={(e) =>
                  onChange({ actorId: e.target.value || undefined })
                }
              />
            </div>

            {/* Resource ID Filter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Resource ID
              </Label>
              <Input
                placeholder="Filter by resource ID..."
                value={filters.resourceId || ""}
                onChange={(e) =>
                  onChange({ resourceId: e.target.value || undefined })
                }
              />
            </div>
          </div>

          {/* Active Filter Summary */}
          {hasActiveFilters && (
            <div className="border-t pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Active filters:
                </span>
                {filters.category?.map((cat) => (
                  <Badge
                    key={cat}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => toggleCategory(cat)}
                  >
                    {categoryDisplayNames[cat]}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
                {filters.severity?.map((sev) => (
                  <Badge
                    key={sev}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => toggleSeverity(sev)}
                  >
                    {severityDisplayNames[sev]}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
                {filters.actorType && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => onChange({ actorType: undefined })}
                  >
                    Actor: {filters.actorType}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {filters.success !== undefined && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => onChange({ success: undefined })}
                  >
                    Status: {filters.success ? "Success" : "Failed"}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {filters.startDate && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => onChange({ startDate: undefined })}
                  >
                    From: {formatDate(filters.startDate)}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                {filters.endDate && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => onChange({ endDate: undefined })}
                  >
                    To: {formatDate(filters.endDate)}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
