"use client";

/**
 * Offline Queue Viewer Component
 *
 * Displays and manages queued messages and uploads while offline.
 * Allows users to:
 * - View pending operations
 * - Retry failed items
 * - Cancel/delete queued items
 * - Monitor sync progress
 *
 * @module components/offline/offline-queue-viewer
 * @version 1.0.0
 */

import { useState, useEffect } from "react";
import {
  Clock,
  Upload,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getSyncQueue } from "@/lib/offline";
import type { SyncQueueItem } from "@/lib/offline";

// =============================================================================
// Types
// =============================================================================

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  completed: number;
}

// =============================================================================
// Component
// =============================================================================

export interface OfflineQueueViewerProps {
  /** Show in dialog mode */
  asDialog?: boolean;
  /** Dialog open state */
  open?: boolean;
  /** Dialog close handler */
  onClose?: () => void;
  /** Custom class name */
  className?: string;
}

export function OfflineQueueViewer({
  asDialog = false,
  open = false,
  onClose,
  className,
}: OfflineQueueViewerProps) {
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
  });
  const [selectedItem, setSelectedItem] = useState<SyncQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load queue items
  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 2000); // Refresh every 2s
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const syncQueue = getSyncQueue();
      const queueItems = await syncQueue.getAll();

      setItems(queueItems);

      // Calculate stats
      const newStats: QueueStats = {
        total: queueItems.length,
        pending: queueItems.filter((i) => i.status === "pending").length,
        processing: queueItems.filter((i) => i.status === "syncing").length,
        failed: queueItems.filter((i) => i.status === "failed").length,
        completed: queueItems.filter((i) => i.status === "completed").length,
      };

      setStats(newStats);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load queue:", error);
      setIsLoading(false);
    }
  };

  const handleRetry = async (itemId: string) => {
    try {
      const syncQueue = getSyncQueue();
      // Reset the item to pending status so it will be retried
      await syncQueue.updateStatus(itemId, "pending");
      await loadQueue();
    } catch (error) {
      console.error("Failed to retry item:", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const syncQueue = getSyncQueue();
      await syncQueue.remove(itemId);
      await loadQueue();
      setSelectedItem(null);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handleRetryAll = async () => {
    try {
      const syncQueue = getSyncQueue();
      await syncQueue.retryFailed();
      await loadQueue();
    } catch (error) {
      console.error("Failed to retry all:", error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      const syncQueue = getSyncQueue();
      const completedItems = items.filter((i) => i.status === "completed");
      await Promise.all(completedItems.map((i) => syncQueue.remove(i.id)));
      await loadQueue();
    } catch (error) {
      console.error("Failed to clear completed:", error);
    }
  };

  const content = (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pending
              </p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Processing
              </p>
              <p className="text-2xl font-bold">{stats.processing}</p>
            </div>
            <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completed
              </p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <Button
          variant="outline"
          onClick={handleRetryAll}
          disabled={stats.failed === 0}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry All Failed
        </Button>
        <Button
          variant="outline"
          onClick={handleClearCompleted}
          disabled={stats.completed === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Completed
        </Button>
      </div>

      {/* Queue Items */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">
              Loading queue...
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No queued items
            </div>
          ) : (
            items.map((item) => (
              <QueueItem key={item.id} item={item} onSelect={setSelectedItem} />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Item Detail Dialog */}
      {selectedItem && (
        <Dialog
          open={!!selectedItem}
          onOpenChange={() => setSelectedItem(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Queue Item Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                <p className="font-medium capitalize">
                  {selectedItem.type.replace("_", " ")}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Operation
                </p>
                <p className="font-medium capitalize">
                  {selectedItem.operation.replace("_", " ")}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Status
                </p>
                <Badge variant={getStatusVariant(selectedItem.status)}>
                  {selectedItem.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Attempts
                </p>
                <p className="font-medium">
                  {selectedItem.retryCount} / {selectedItem.maxRetries}
                </p>
              </div>

              {selectedItem.error && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Error
                  </p>
                  <p className="rounded bg-red-50 p-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                    {selectedItem.error}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Created
                </p>
                <p className="font-medium">
                  {formatDate(selectedItem.createdAt)}
                </p>
              </div>

              {selectedItem.updatedAt && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Last Updated
                  </p>
                  <p className="font-medium">
                    {formatDate(selectedItem.updatedAt)}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              {selectedItem.status === "failed" && (
                <Button
                  onClick={() => {
                    handleRetry(selectedItem.id);
                    setSelectedItem(null);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => handleDelete(selectedItem.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  if (asDialog) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Offline Queue</DialogTitle>
          </DialogHeader>
          <div className="h-[600px]">{content}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}

// =============================================================================
// Queue Item Component
// =============================================================================

interface QueueItemProps {
  item: SyncQueueItem;
  onSelect: (item: SyncQueueItem) => void;
}

function QueueItem({ item, onSelect }: QueueItemProps) {
  const getIcon = () => {
    switch (item.type) {
      case "message":
        return <MessageSquare className="h-5 w-5" />;
      case "reaction":
        return <Upload className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusIcon = () => {
    switch (item.status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "syncing":
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Card
      className="cursor-pointer p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
            {getIcon()}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium capitalize">
                {item.operation.replace("_", " ")} {item.type}
              </p>
              <Badge variant={getStatusVariant(item.status)}>
                {item.status}
              </Badge>
            </div>

            {item.error && (
              <div className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{item.error}</span>
              </div>
            )}

            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{formatTimeAgo(item.createdAt)}</span>
              {item.retryCount > 0 && <span>{item.retryCount} attempts</span>}
            </div>
          </div>
        </div>

        <div>{getStatusIcon()}</div>
      </div>
    </Card>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function getStatusVariant(
  status: SyncQueueItem["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "secondary";
    case "failed":
      return "destructive";
    case "syncing":
      return "default";
    default:
      return "outline";
  }
}

function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleString();
}

function formatTimeAgo(date: Date | string | number): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default OfflineQueueViewer;
