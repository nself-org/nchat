"use client";

/**
 * AuditLogViewer - Main audit log viewer component
 */

import { useState, useCallback, useEffect } from "react";
import {
  Activity,
  Download,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
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

import { useAuditStore } from "@/stores/audit-store";
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogSortOptions,
} from "@/lib/audit/audit-types";
import { formatTimestamp } from "@/lib/audit/audit-formatter";

import { AuditLogTable } from "./AuditLogTable";
import { AuditLogFilters as AuditLogFiltersComponent } from "./AuditLogFilters";
import { AuditLogSearch } from "./AuditLogSearch";
import { AuditLogDetail } from "./AuditLogDetail";
import { AuditLogExport } from "./AuditLogExport";

// ============================================================================
// Types
// ============================================================================

interface AuditLogViewerProps {
  entries?: AuditLogEntry[];
  title?: string;
  description?: string;
  onRefresh?: () => Promise<void>;
  onExport?: () => void;
  onSettingsClick?: () => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  showSettings?: boolean;
  selectable?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AuditLogViewer({
  entries: externalEntries,
  title = "Audit Logs",
  description = "View and search audit log events",
  onRefresh,
  onExport,
  onSettingsClick,
  showSearch = true,
  showFilters = true,
  showExport = true,
  showSettings = true,
  selectable = false,
  className,
}: AuditLogViewerProps) {
  // Store state
  const {
    entries: storeEntries,
    filteredEntries,
    filters,
    sort,
    pagination,
    searchQuery,
    isLoading,
    lastRefresh,
    selectedEntry,
    selectedEntryIds,
    setFilters,
    clearFilters,
    setSearchQuery,
    setSort,
    setPage,
    setPageSize,
    selectEntry,
    toggleEntrySelection,
    selectAllEntries,
    clearSelection,
    applyFiltersAndSort,
    setLoading,
    setLastRefresh,
  } = useAuditStore();

  // Use external entries if provided, otherwise use store entries
  const entries = externalEntries ?? storeEntries;

  // Local state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Apply filters when entries or filters change
  useEffect(() => {
    if (!externalEntries) {
      applyFiltersAndSort();
    }
  }, [
    entries,
    filters,
    sort,
    pagination.page,
    pagination.pageSize,
    applyFiltersAndSort,
    externalEntries,
  ]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setLastRefresh(new Date());
    setIsRefreshing(false);
  }, [onRefresh, setLastRefresh]);

  const handleFiltersChange = useCallback(
    (newFilters: Partial<AuditLogFilters>) => {
      setFilters(newFilters);
    },
    [setFilters],
  );

  const handleSortChange = useCallback(
    (newSort: AuditLogSortOptions) => {
      setSort(newSort);
    },
    [setSort],
  );

  const handleRowClick = useCallback(
    (entry: AuditLogEntry) => {
      selectEntry(entry);
      setIsDetailOpen(true);
    },
    [selectEntry],
  );

  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false);
    selectEntry(null);
  }, [selectEntry]);

  const handleExportComplete = useCallback(
    (filename: string, recordCount: number) => {},
    [],
  );

  // Displayed entries (with local filtering if using external entries)
  const displayedEntries = externalEntries ?? filteredEntries;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {lastRefresh && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatTimestamp(lastRefresh, "relative")}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
              >
                <RefreshCw
                  className={cn("mr-1 h-4 w-4", isRefreshing && "animate-spin")}
                />
                Refresh
              </Button>
              {showExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportOpen(true)}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Export
                </Button>
              )}
              {showSettings && onSettingsClick && (
                <Button variant="outline" size="sm" onClick={onSettingsClick}>
                  <Settings className="mr-1 h-4 w-4" />
                  Settings
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Search */}
          {showSearch && (
            <AuditLogSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search audit logs..."
            />
          )}

          {/* Filters */}
          {showFilters && (
            <AuditLogFiltersComponent
              filters={filters}
              onChange={handleFiltersChange}
              onClear={clearFilters}
            />
          )}

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {displayedEntries.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {externalEntries?.length ?? pagination.totalCount}
                </span>{" "}
                entries
              </span>
              {selectedEntryIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedEntryIds.length} selected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Per page:</span>
              <Select
                value={pagination.pageSize.toString()}
                onValueChange={(v) => setPageSize(parseInt(v))}
              >
                <SelectTrigger className="h-8 w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <AuditLogTable
        entries={displayedEntries}
        selectedIds={selectedEntryIds}
        sort={sort}
        onSort={handleSortChange}
        onSelect={toggleEntrySelection}
        onSelectAll={selectAllEntries}
        onClearSelection={clearSelection}
        onRowClick={handleRowClick}
        selectable={selectable}
        loading={isLoading}
      />

      {/* Pagination */}
      {!externalEntries && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AuditLogDetail
        entry={selectedEntry}
        open={isDetailOpen}
        onClose={handleDetailClose}
      />

      {/* Export Modal */}
      <AuditLogExport
        entries={displayedEntries}
        filters={filters}
        open={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExportComplete={handleExportComplete}
      />
    </div>
  );
}
