"use client";

import { useState, useCallback } from "react";
import { History, X, Maximize2, Minimize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MessageEditHistory, MessageVersion } from "@/lib/message-history";
import { EditHistoryList, HistoryStats } from "./EditHistoryList";
import { VersionComparison } from "./VersionComparison";
import { OriginalVsCurrent } from "./OriginalMessage";
import { RestoreVersion } from "./RestoreVersion";
import { DeleteHistory } from "./DeleteHistory";

export interface EditHistoryProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The edit history to display */
  history: MessageEditHistory | null;
  /** Whether loading */
  isLoading?: boolean;
  /** Whether user can restore versions */
  canRestore?: boolean;
  /** Whether user can clear history */
  canClear?: boolean;
  /** Callback to restore a version */
  onRestore?: (version: MessageVersion, reason?: string) => Promise<void>;
  /** Callback to clear history */
  onClear?: (keepOriginal: boolean, reason?: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main edit history modal/dialog.
 * Shows all edit history with tabs for different views.
 */
export function EditHistory({
  isOpen,
  onClose,
  history,
  isLoading = false,
  canRestore = false,
  canClear = false,
  onRestore,
  onClear,
  className,
}: EditHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<MessageVersion | null>(
    null,
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRestore = useCallback(
    async (version: MessageVersion, reason?: string) => {
      if (!onRestore) return;
      setIsRestoring(true);
      try {
        await onRestore(version, reason);
      } finally {
        setIsRestoring(false);
      }
    },
    [onRestore],
  );

  const handleClear = useCallback(
    async (keepOriginal: boolean, reason?: string) => {
      if (!onClear) return;
      setIsDeleting(true);
      try {
        await onClear(keepOriginal, reason);
      } finally {
        setIsDeleting(false);
      }
    },
    [onClear],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          isFullscreen
            ? "max-w-screen h-screen max-h-screen w-screen rounded-none"
            : "max-h-[85vh] max-w-4xl",
          className,
        )}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5" />
            <DialogTitle>Edit History</DialogTitle>
            {history && (
              <span className="text-sm text-muted-foreground">
                {history.editCount} edit{history.editCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 p-6">
            <EditHistoryLoading />
          </div>
        ) : !history ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12">
            <History className="text-muted-foreground/50 h-12 w-12" />
            <h3 className="mt-4 text-lg font-medium">No Edit History</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This message has not been edited yet.
            </p>
          </div>
        ) : (
          <Tabs
            defaultValue="history"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="mx-6 mt-4 grid w-fit grid-cols-3">
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="original">Original</TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent
              value="history"
              className="flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-6">
                  <HistoryStats history={history} />
                  <EditHistoryList
                    history={history}
                    selectedVersionIds={
                      selectedVersion ? [selectedVersion.id] : []
                    }
                    onSelectVersion={setSelectedVersion}
                    onRestore={handleRestore}
                    canRestore={canRestore}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Compare Tab */}
            <TabsContent
              value="compare"
              className="flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ScrollArea className="flex-1 px-6 py-4">
                <VersionComparison
                  versions={history.versions}
                  initialLeft={history.versions[0]}
                  initialRight={history.versions[history.versions.length - 1]}
                />
              </ScrollArea>
            </TabsContent>

            {/* Original Tab */}
            <TabsContent
              value="original"
              className="flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ScrollArea className="flex-1 px-6 py-4">
                <OriginalVsCurrent
                  original={history.versions[0]}
                  currentContent={history.currentContent}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer with admin actions */}
        {history && (canRestore || canClear) && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <div className="flex items-center gap-2">
              {selectedVersion && canRestore && onRestore && (
                <RestoreVersion
                  version={selectedVersion}
                  history={history}
                  onRestore={handleRestore}
                  isRestoring={isRestoring}
                  canRestore={canRestore}
                />
              )}
            </div>
            <div>
              {canClear && onClear && (
                <DeleteHistory
                  history={history}
                  onDelete={handleClear}
                  isDeleting={isDeleting}
                  canDelete={canClear}
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Loading state for edit history.
 */
function EditHistoryLoading() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-4 gap-4 rounded-md border p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* List skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Inline panel version (for embedding in message view).
 */
export interface EditHistoryPanelProps {
  /** The edit history to display */
  history: MessageEditHistory | null;
  /** Whether loading */
  isLoading?: boolean;
  /** Maximum height */
  maxHeight?: string | number;
  /** Callback when close is requested */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function EditHistoryPanel({
  history,
  isLoading = false,
  maxHeight = 300,
  onClose,
  className,
}: EditHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className={cn("rounded-md border bg-card p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-24" />
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!history || history.versions.length === 0) {
    return (
      <div className={cn("rounded-md border bg-card p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="h-4 w-4" />
            <span className="text-sm">No edit history</span>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-md border bg-card", className)}>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Edit History ({history.editCount} edit
            {history.editCount !== 1 ? "s" : ""})
          </span>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <EditHistoryList
        history={history}
        mode="compact"
        maxHeight={maxHeight}
        className="p-2"
      />
    </div>
  );
}
