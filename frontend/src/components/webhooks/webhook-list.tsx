"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  SortAsc,
  Plus,
  RefreshCw,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WebhookItem, WebhookItemSkeleton } from "./webhook-item";
import {
  Webhook as WebhookType,
  WebhookStatus,
  WebhookFilterOptions,
} from "@/lib/webhooks";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookListProps {
  webhooks: WebhookType[];
  isLoading?: boolean;
  error?: string | null;
  selectedWebhook?: WebhookType | null;
  channels?: Array<{ id: string; name: string }>;
  onCreateNew?: () => void;
  onEdit?: (webhook: WebhookType) => void;
  onDelete?: (webhook: WebhookType) => void;
  onTest?: (webhook: WebhookType) => void;
  onToggleStatus?: (webhook: WebhookType) => void;
  onSelect?: (webhook: WebhookType) => void;
  onRefresh?: () => void;
  showFilters?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WebhookList({
  webhooks,
  isLoading = false,
  error = null,
  selectedWebhook = null,
  channels = [],
  onCreateNew,
  onEdit,
  onDelete,
  onTest,
  onToggleStatus,
  onSelect,
  onRefresh,
  showFilters = true,
  showHeader = true,
  maxHeight = "600px",
  emptyMessage = "No webhooks found",
}: WebhookListProps) {
  const [filters, setFilters] = useState<WebhookFilterOptions>({
    status: "all",
    channelId: "all",
    search: "",
    sortBy: "created_at",
    sortOrder: "desc",
  });

  // Filter and sort webhooks
  const filteredWebhooks = useMemo(() => {
    let result = [...webhooks];

    // Filter by status
    if (filters.status && filters.status !== "all") {
      result = result.filter((w) => w.status === filters.status);
    }

    // Filter by channel
    if (filters.channelId && filters.channelId !== "all") {
      result = result.filter((w) => w.channel_id === filters.channelId);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.channel?.name?.toLowerCase().includes(searchLower),
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "last_used_at":
          comparison =
            new Date(a.last_used_at || 0).getTime() -
            new Date(b.last_used_at || 0).getTime();
          break;
        case "created_at":
        default:
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [webhooks, filters]);

  const handleFilterChange = (
    key: keyof WebhookFilterOptions,
    value: string,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Stats
  const activeCount = webhooks.filter((w) => w.status === "active").length;
  const pausedCount = webhooks.filter((w) => w.status === "paused").length;
  const totalCount = webhooks.length;

  return (
    <Card className="flex h-full flex-col">
      {showHeader && (
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Webhooks</CardTitle>
              <span className="text-sm text-muted-foreground">
                ({activeCount} active, {pausedCount} paused)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isLoading && "animate-spin")}
                  />
                </Button>
              )}
              {onCreateNew && (
                <Button size="sm" onClick={onCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Webhook
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search webhooks..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>

            {/* Channel Filter */}
            {channels.length > 0 && (
              <Select
                value={filters.channelId || "all"}
                onValueChange={(value) =>
                  handleFilterChange("channelId", value)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split("-") as [
                  WebhookFilterOptions["sortBy"],
                  WebhookFilterOptions["sortOrder"],
                ];
                setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SortAsc className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest first</SelectItem>
                <SelectItem value="created_at-asc">Oldest first</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="last_used_at-desc">Recently used</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 rounded-lg border border-destructive p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Webhook List */}
        <ScrollArea className="flex-1" style={{ maxHeight }}>
          <div className="space-y-3 pr-4">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <WebhookItemSkeleton key={i} />
              ))
            ) : filteredWebhooks.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Webhook className="text-muted-foreground/50 h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">
                  {filters.search || filters.status !== "all"
                    ? "No matching webhooks"
                    : emptyMessage}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {filters.search || filters.status !== "all"
                    ? "Try adjusting your filters"
                    : "Create a webhook to get started"}
                </p>
                {onCreateNew && !filters.search && filters.status === "all" && (
                  <Button className="mt-4" onClick={onCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Webhook
                  </Button>
                )}
              </div>
            ) : (
              // Webhook items
              filteredWebhooks.map((webhook) => (
                <WebhookItem
                  key={webhook.id}
                  webhook={webhook}
                  isSelected={selectedWebhook?.id === webhook.id}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onTest={onTest}
                  onToggleStatus={onToggleStatus}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Results count */}
        {!isLoading && filteredWebhooks.length > 0 && (
          <div className="flex-shrink-0 border-t pt-2 text-xs text-muted-foreground">
            Showing {filteredWebhooks.length} of {totalCount} webhooks
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SIMPLE LIST (no filters, for modals)
// ============================================================================

export interface SimpleWebhookListProps {
  webhooks: WebhookType[];
  isLoading?: boolean;
  selectedId?: string;
  onSelect: (webhook: WebhookType) => void;
}

export function SimpleWebhookList({
  webhooks,
  isLoading = false,
  selectedId,
  onSelect,
}: SimpleWebhookListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <WebhookItemSkeleton key={i} compact />
        ))}
      </div>
    );
  }

  if (webhooks.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No webhooks available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {webhooks.map((webhook) => (
        <WebhookItem
          key={webhook.id}
          webhook={webhook}
          compact
          isSelected={webhook.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default WebhookList;
