/**
 * Conflict History Component
 *
 * Displays history of resolved conflicts with details.
 * Allows users to review past conflict resolutions.
 *
 * @module components/sync/ConflictHistory
 * @version 1.0.0
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  GitMerge,
  Clock,
  Check,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  getConflictResolutionService,
  type ConflictHistoryEntry,
  type ConflictType,
  type ResolutionStrategy,
} from "@/services/realtime/conflict-resolution.service";

// ============================================================================
// Types
// ============================================================================

export interface ConflictHistoryProps {
  /** Filter by conflict type */
  filterType?: ConflictType;
  /** Maximum entries to show */
  limit?: number;
  /** Show clear history button */
  showClearButton?: boolean;
}

// ============================================================================
// Strategy Labels
// ============================================================================

const STRATEGY_LABELS: Record<ResolutionStrategy, string> = {
  "last-write-wins": "Last Write Wins",
  "server-wins": "Server Wins",
  "client-wins": "Client Wins",
  merge: "Merged",
  manual: "Manual",
};

const STRATEGY_ICONS: Record<ResolutionStrategy, typeof Check> = {
  "last-write-wins": Clock,
  "server-wins": Check,
  "client-wins": Check,
  merge: GitMerge,
  manual: AlertTriangle,
};

// ============================================================================
// Component
// ============================================================================

export function ConflictHistory({
  filterType,
  limit = 50,
  showClearButton = true,
}: ConflictHistoryProps) {
  const [history, setHistory] = useState<ConflictHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] =
    useState<ConflictHistoryEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  /**
   * Load history
   */
  useEffect(() => {
    const service = getConflictResolutionService();
    if (!service.initialized) {
      service.initialize();
    }

    const entries = service.getHistory({ type: filterType, limit });
    setHistory(entries);

    // Subscribe to history updates
    const unsubscribe = service.subscribe((event, data) => {
      if (event === "conflict:history-updated") {
        const entries = service.getHistory({ type: filterType, limit });
        setHistory(entries);
      }
    });

    return () => unsubscribe();
  }, [filterType, limit]);

  /**
   * Get conflict type label
   */
  const getTypeLabel = (type: ConflictType): string => {
    switch (type) {
      case "message:edit":
        return "Message Edit";
      case "message:delete":
        return "Message Delete";
      case "channel:settings":
        return "Channel Settings";
      case "user:settings":
        return "User Settings";
      case "file:upload":
        return "File Upload";
      case "thread:reply":
        return "Thread Reply";
      default:
        return "Unknown";
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // Less than 1 minute
    if (diff < 60000) {
      return "Just now";
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }

    // More than 1 day
    return date.toLocaleDateString();
  };

  /**
   * Handle entry click
   */
  const handleEntryClick = (entry: ConflictHistoryEntry) => {
    setSelectedEntry(entry);
    setDetailsOpen(true);
  };

  /**
   * Handle clear history
   */
  const handleClearHistory = () => {
    const service = getConflictResolutionService();
    service.clearHistory();
    setHistory([]);
  };

  /**
   * Get strategy icon
   */
  const getStrategyIcon = (strategy: ResolutionStrategy) => {
    const Icon = STRATEGY_ICONS[strategy];
    return <Icon className="h-4 w-4" />;
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Conflict History
          </CardTitle>
          <CardDescription>No conflicts have been resolved yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Conflict History
              </CardTitle>
              <CardDescription>
                {history.length} resolved conflicts
              </CardDescription>
            </div>
            {showClearButton && (
              <Button variant="outline" size="sm" onClick={handleClearHistory}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  onClick={() => handleEntryClick(entry)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleEntryClick(entry);
                    }
                  }}
                >
                  <div className="mt-0.5">
                    {getStrategyIcon(entry.strategy)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getTypeLabel(entry.type)}
                      </Badge>
                      <Badge variant="secondary">
                        {STRATEGY_LABELS[entry.strategy]}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {entry.resolvedAt ? (
                        <>Resolved {formatTimestamp(entry.resolvedAt)}</>
                      ) : (
                        <>Detected {formatTimestamp(entry.detectedAt)}</>
                      )}
                    </div>

                    {entry.userAction && (
                      <div className="text-xs text-muted-foreground">
                        Manual resolution: {entry.userAction.choice}
                      </div>
                    )}
                  </div>

                  {entry.resolution?.requiresUserAction && (
                    <Badge variant="destructive">Requires Action</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedEntry && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-h-[90vh] max-w-3xl">
            <DialogHeader>
              <DialogTitle>Conflict Details</DialogTitle>
              <DialogDescription>
                {getTypeLabel(selectedEntry.type)} resolved using{" "}
                {STRATEGY_LABELS[selectedEntry.strategy]} strategy
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Detected</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedEntry.detectedAt).toLocaleString()}
                  </div>
                </div>
                {selectedEntry.resolvedAt && (
                  <div>
                    <div className="text-sm font-medium">Resolved</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(selectedEntry.resolvedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Local Data */}
              <div>
                <div className="mb-2 text-sm font-medium">Local Data</div>
                <ScrollArea className="h-[150px] rounded-md border p-3">
                  <pre className="text-xs">
                    {JSON.stringify(selectedEntry.entity.localData, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              {/* Remote Data */}
              <div>
                <div className="mb-2 text-sm font-medium">Remote Data</div>
                <ScrollArea className="h-[150px] rounded-md border p-3">
                  <pre className="text-xs">
                    {JSON.stringify(selectedEntry.entity.remoteData, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              {/* Resolution Result */}
              {selectedEntry.resolution && (
                <div>
                  <div className="mb-2 text-sm font-medium">Resolved Data</div>
                  <ScrollArea className="h-[150px] rounded-md border p-3">
                    <pre className="text-xs">
                      {JSON.stringify(
                        selectedEntry.resolution.resolvedData,
                        null,
                        2,
                      )}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Conflicted Fields */}
              {selectedEntry.resolution?.conflictedFields &&
                selectedEntry.resolution.conflictedFields.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-medium">
                      Conflicted Fields
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntry.resolution.conflictedFields.map(
                        (field) => (
                          <Badge key={field} variant="secondary">
                            {field}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default ConflictHistory;
