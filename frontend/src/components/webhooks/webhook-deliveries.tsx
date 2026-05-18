"use client";

import { useState } from "react";
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  FileJson,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  WebhookDelivery,
  DeliveryStatus,
  DeliveryFilterOptions,
  formatDeliveryTime,
  getDeliveryStatusColor,
} from "@/lib/webhooks";

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookDeliveriesProps {
  deliveries: WebhookDelivery[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: (deliveryId: string) => Promise<void>;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  showHeader?: boolean;
  maxHeight?: string;
  compact?: boolean;
}

// ============================================================================
// STATUS ICON COMPONENT
// ============================================================================

function DeliveryStatusIcon({ status }: { status: DeliveryStatus }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "pending":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case "retrying":
      return <Loader2 className="h-4 w-4 animate-spin text-orange-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

// ============================================================================
// DELIVERY ITEM COMPONENT
// ============================================================================

interface DeliveryItemProps {
  delivery: WebhookDelivery;
  onRetry?: (deliveryId: string) => Promise<void>;
  compact?: boolean;
}

function DeliveryItem({
  delivery,
  onRetry,
  compact = false,
}: DeliveryItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    await onRetry(delivery.id);
    setIsRetrying(false);
  };

  const statusVariant = getDeliveryStatusColor(delivery.status);
  const canRetry = delivery.status === "failed" && onRetry;

  // Parse request body for preview
  let requestPreview = delivery.request_body;
  try {
    const parsed = JSON.parse(delivery.request_body);
    requestPreview = parsed.content || JSON.stringify(parsed, null, 2);
  } catch {
    // Keep original string
  }

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-lg border p-3",
          "hover:bg-accent/50 transition-colors",
        )}
      >
        <div className="flex items-center gap-3">
          <DeliveryStatusIcon status={delivery.status} />
          <div>
            <p className="line-clamp-1 text-sm font-medium">
              {requestPreview.slice(0, 50)}
              {requestPreview.length > 50 && "..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDeliveryTime(delivery.created_at)}
            </p>
          </div>
        </div>
        <Badge variant={statusVariant}>{delivery.status}</Badge>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border transition-colors",
          isOpen && "border-primary",
        )}
      >
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "flex cursor-pointer items-center gap-4 p-4",
              "hover:bg-accent/50 transition-colors",
            )}
          >
            {/* Expand Icon */}
            <div className="shrink-0">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Status Icon */}
            <DeliveryStatusIcon status={delivery.status} />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{requestPreview}</p>
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{formatDeliveryTime(delivery.created_at)}</span>
                {delivery.response_status && (
                  <span>HTTP {delivery.response_status}</span>
                )}
                {delivery.attempt_count > 1 && (
                  <span>Attempt {delivery.attempt_count}</span>
                )}
              </div>
            </div>

            {/* Badge & Actions */}
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant}>{delivery.status}</Badge>
              {canRetry && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry();
                        }}
                        disabled={isRetrying}
                      >
                        {isRetrying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Retry delivery</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="space-y-4 border-t px-4 py-3">
            {/* Request Body */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <FileJson className="h-4 w-4" />
                Request Body
              </div>
              <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                {(() => {
                  try {
                    return JSON.stringify(
                      JSON.parse(delivery.request_body),
                      null,
                      2,
                    );
                  } catch {
                    return delivery.request_body;
                  }
                })()}
              </pre>
            </div>

            {/* Response (if available) */}
            {(delivery.response_body || delivery.error_message) && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <FileJson className="h-4 w-4" />
                  {delivery.error_message ? "Error" : "Response"}
                  {delivery.response_status && (
                    <Badge
                      variant={
                        delivery.response_status >= 200 &&
                        delivery.response_status < 300
                          ? "default"
                          : "destructive"
                      }
                      className="ml-2"
                    >
                      HTTP {delivery.response_status}
                    </Badge>
                  )}
                </div>
                <pre
                  className={cn(
                    "max-h-32 overflow-auto rounded-lg p-3 font-mono text-xs",
                    delivery.error_message
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted",
                  )}
                >
                  {delivery.error_message ||
                    (() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(delivery.response_body || ""),
                          null,
                          2,
                        );
                      } catch {
                        return delivery.response_body;
                      }
                    })()}
                </pre>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Created: </span>
                {new Date(delivery.created_at).toLocaleString()}
              </div>
              {delivery.delivered_at && (
                <div>
                  <span className="font-medium">Delivered: </span>
                  {new Date(delivery.delivered_at).toLocaleString()}
                </div>
              )}
              {delivery.next_retry_at && (
                <div>
                  <span className="font-medium">Next Retry: </span>
                  {new Date(delivery.next_retry_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WebhookDeliveries({
  deliveries,
  isLoading = false,
  error = null,
  onRetry,
  onRefresh,
  onLoadMore,
  hasMore = false,
  showHeader = true,
  maxHeight = "500px",
  compact = false,
}: WebhookDeliveriesProps) {
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">(
    "all",
  );

  const filteredDeliveries =
    statusFilter === "all"
      ? deliveries
      : deliveries.filter((d) => d.status === statusFilter);

  // Stats
  const successCount = deliveries.filter((d) => d.status === "success").length;
  const failedCount = deliveries.filter((d) => d.status === "failed").length;
  const pendingCount = deliveries.filter(
    (d) => d.status === "pending" || d.status === "retrying",
  ).length;

  return (
    <Card className="flex h-full flex-col">
      {showHeader && (
        <CardHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Recent Deliveries</CardTitle>
              <span className="text-sm text-muted-foreground">
                ({successCount} success, {failedCount} failed, {pendingCount}{" "}
                pending)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as DeliveryStatus | "all")
                }
              >
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="retrying">Retrying</SelectItem>
                </SelectContent>
              </Select>
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isLoading && "animate-spin")}
                  />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="flex flex-1 flex-col overflow-hidden">
        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 mb-4 rounded-lg border border-destructive p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Delivery List */}
        <ScrollArea className="flex-1" style={{ maxHeight }}>
          <div className="space-y-2 pr-4">
            {isLoading && deliveries.length === 0 ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-4 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/4 rounded bg-muted" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-muted" />
                  </div>
                </div>
              ))
            ) : filteredDeliveries.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileJson className="text-muted-foreground/50 h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">No deliveries</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {statusFilter !== "all"
                    ? `No ${statusFilter} deliveries found`
                    : "Deliveries will appear here when the webhook is used"}
                </p>
              </div>
            ) : (
              // Delivery items
              filteredDeliveries.map((delivery) => (
                <DeliveryItem
                  key={delivery.id}
                  delivery={delivery}
                  onRetry={onRetry}
                  compact={compact}
                />
              ))
            )}

            {/* Load More */}
            {hasMore && onLoadMore && (
              <div className="pt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Results count */}
        {!isLoading && filteredDeliveries.length > 0 && (
          <div className="flex-shrink-0 border-t pt-2 text-xs text-muted-foreground">
            Showing {filteredDeliveries.length} of {deliveries.length}{" "}
            deliveries
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPACT DELIVERIES (for sidebar/summary)
// ============================================================================

export interface RecentDeliveriesProps {
  deliveries: WebhookDelivery[];
  isLoading?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
}

export function RecentDeliveries({
  deliveries,
  isLoading = false,
  maxItems = 5,
  onViewAll,
}: RecentDeliveriesProps) {
  const displayDeliveries = deliveries.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-3 w-3/4 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No recent deliveries
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayDeliveries.map((delivery) => (
        <DeliveryItem key={delivery.id} delivery={delivery} compact />
      ))}
      {deliveries.length > maxItems && onViewAll && (
        <Button variant="ghost" className="w-full text-sm" onClick={onViewAll}>
          View all {deliveries.length} deliveries
        </Button>
      )}
    </div>
  );
}

export default WebhookDeliveries;
