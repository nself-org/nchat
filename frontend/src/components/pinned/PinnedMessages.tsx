"use client";

import * as React from "react";
import { X, Pin, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { usePinnedStore } from "@/stores/pinned-store";
import type { PinnedMessage, PinFilters } from "@/lib/pinned";
import { PinnedMessageList } from "./PinnedMessageList";
import { PinnedFilters } from "./PinnedFilters";
import { UnpinConfirm } from "./UnpinConfirm";

export interface PinnedMessagesProps {
  /** Channel ID */
  channelId: string;
  /** Channel name for display */
  channelName?: string;
  /** Callback to navigate to message */
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  /** Whether user can manage pins */
  canManagePins?: boolean;
  /** Callback when settings is clicked */
  onOpenSettings?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * Panel for viewing and managing pinned messages.
 */
export function PinnedMessages({
  channelId,
  channelName = "Channel",
  onJumpToMessage,
  canManagePins = true,
  onOpenSettings,
  className,
}: PinnedMessagesProps) {
  const {
    isPanelOpen,
    closePanel,
    getFilteredPinnedMessages,
    getChannelPinStats,
    isLoading,
    filters,
    sortBy,
    sortOrder,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    openUnpinConfirm,
    closeUnpinConfirm,
    isConfirmUnpinOpen,
    pinToUnpin,
    removePinnedMessage,
    isUnpinning,
  } = usePinnedStore();

  const pins = getFilteredPinnedMessages(channelId);
  const stats = getChannelPinStats(channelId);

  const handleUnpin = (pin: PinnedMessage) => {
    openUnpinConfirm(pin);
  };

  const confirmUnpin = async (pin: PinnedMessage) => {
    // In real app, would call GraphQL mutation here
    removePinnedMessage(channelId, pin.messageId);
    closeUnpinConfirm();
  };

  const handleSortChange = (
    newSortBy: typeof sortBy,
    newSortOrder: typeof sortOrder,
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  return (
    <>
      <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
        <SheetContent
          side="right"
          className={cn("w-full p-0 sm:w-[440px] sm:max-w-md", className)}
        >
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="h-5 w-5 text-amber-500" />
                <SheetTitle className="text-base">Pinned Messages</SheetTitle>
              </div>
              <div className="flex items-center gap-1">
                {canManagePins && onOpenSettings && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onOpenSettings}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Pin settings</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={closePanel}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>
            <SheetDescription className="text-xs">
              {stats.totalPins} pinned in #{channelName}
              {stats.remainingSlots > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({stats.remainingSlots} slots remaining)
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="border-b px-4 py-3">
            <PinnedFilters
              filters={filters}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onFiltersChange={setFilters}
              onSortChange={handleSortChange}
              onClearFilters={clearFilters}
            />
          </div>

          <ScrollArea className="h-[calc(100vh-180px)]">
            <PinnedMessageList
              pins={pins}
              onJumpToMessage={(messageId, cId) => {
                onJumpToMessage?.(messageId, cId);
                closePanel();
              }}
              onUnpin={handleUnpin}
              canUnpin={canManagePins}
              isLoading={isLoading}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <UnpinConfirm
        open={isConfirmUnpinOpen}
        onOpenChange={(open) => !open && closeUnpinConfirm()}
        pin={pinToUnpin}
        onConfirm={confirmUnpin}
        isLoading={isUnpinning}
      />
    </>
  );
}
