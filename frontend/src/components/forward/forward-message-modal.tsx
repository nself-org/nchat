"use client";

import * as React from "react";
import { Forward, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";
import { ForwardDestinationList } from "./forward-destination-list";
import { ForwardPreview } from "./forward-preview";
import type {
  ForwardMessage,
  ForwardDestination,
  ForwardResult,
} from "@/lib/forward/forward-store";

// ============================================================================
// Types
// ============================================================================

type ModalStep = "select" | "preview";

export interface ForwardMessageModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close */
  onOpenChange: (open: boolean) => void;
  /** The message to forward */
  message: ForwardMessage | null;
  /** Recent forward destinations */
  recentDestinations?: ForwardDestination[];
  /** Available channels */
  channels?: ForwardDestination[];
  /** Available direct messages */
  directMessages?: ForwardDestination[];
  /** Selected destinations */
  selectedDestinations: ForwardDestination[];
  /** Called when a destination is toggled */
  onToggleDestination: (destination: ForwardDestination) => void;
  /** Called when a destination is removed */
  onRemoveDestination: (destinationId: string) => void;
  /** Comment to include */
  comment: string;
  /** Called when comment changes */
  onCommentChange: (comment: string) => void;
  /** Search query */
  searchQuery: string;
  /** Called when search query changes */
  onSearchChange: (query: string) => void;
  /** Called to load destinations */
  onLoadDestinations?: (query?: string) => void;
  /** Called when forward is confirmed */
  onConfirm: () => Promise<ForwardResult[]>;
  /** Whether destinations are loading */
  isLoadingDestinations?: boolean;
  /** Whether forward is in progress */
  isForwarding?: boolean;
  /** Results from forwarding */
  forwardResults?: ForwardResult[];
  /** Called when modal closes after successful forward */
  onComplete?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ForwardMessageModal({
  open,
  onOpenChange,
  message,
  recentDestinations = [],
  channels = [],
  directMessages = [],
  selectedDestinations,
  onToggleDestination,
  onRemoveDestination,
  comment,
  onCommentChange,
  searchQuery,
  onSearchChange,
  onLoadDestinations,
  onConfirm,
  isLoadingDestinations = false,
  isForwarding = false,
  forwardResults = [],
  onComplete,
}: ForwardMessageModalProps) {
  const isForwardEnabled = useFeatureEnabled(FEATURES.MESSAGES_FORWARD);
  const [step, setStep] = React.useState<ModalStep>("select");

  // Load destinations when modal opens
  React.useEffect(() => {
    if (open && onLoadDestinations) {
      onLoadDestinations();
    }
  }, [open, onLoadDestinations]);

  // Reset step when modal closes
  React.useEffect(() => {
    if (!open) {
      setStep("select");
    }
  }, [open]);

  // Handle search submit
  const handleSearchSubmit = () => {
    if (onLoadDestinations) {
      onLoadDestinations(searchQuery);
    }
  };

  // Handle continuing to preview
  const handleContinue = () => {
    if (selectedDestinations.length > 0) {
      setStep("preview");
    }
  };

  // Handle going back to selection
  const handleBack = () => {
    setStep("select");
  };

  // Handle forward confirmation
  const handleConfirm = async () => {
    const results = await onConfirm();

    // If all successful, we can close after a short delay
    if (results.every((r) => r.success)) {
      setTimeout(() => {
        onOpenChange(false);
        onComplete?.();
      }, 1500);
    }
  };

  // Handle cancel/close
  const handleCancel = () => {
    if (forwardResults.length > 0) {
      // After forwarding, just close
      onOpenChange(false);
      onComplete?.();
    } else if (step === "preview") {
      handleBack();
    } else {
      onOpenChange(false);
    }
  };

  // Don't render if feature is disabled
  if (!isForwardEnabled) {
    return null;
  }

  // Don't render if no message
  if (!message) {
    return null;
  }

  const hasResults = forwardResults.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {step === "preview" && !hasResults && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="-ml-1 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Forward className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base">
                {step === "select" ? "Forward Message" : "Confirm Forward"}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="sr-only">
            {step === "select"
              ? "Select channels or conversations to forward this message to"
              : "Review and confirm your forward"}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === "select" ? (
            <>
              <ForwardDestinationList
                recentDestinations={recentDestinations}
                channels={channels}
                directMessages={directMessages}
                selectedDestinations={selectedDestinations}
                onToggleDestination={onToggleDestination}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                onSearchSubmit={handleSearchSubmit}
                isLoading={isLoadingDestinations}
                maxHeight="350px"
                className="pt-3"
              />

              {/* Continue Button */}
              {selectedDestinations.length > 0 && (
                <div className="border-t p-3">
                  <Button
                    type="button"
                    onClick={handleContinue}
                    className="w-full"
                  >
                    Continue with {selectedDestinations.length}{" "}
                    {selectedDestinations.length === 1
                      ? "destination"
                      : "destinations"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="p-4">
              <ForwardPreview
                message={message}
                selectedDestinations={selectedDestinations}
                comment={comment}
                onCommentChange={onCommentChange}
                onRemoveDestination={onRemoveDestination}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                isForwarding={isForwarding}
                forwardResults={forwardResults}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Connected Modal (uses hooks internally)
// ============================================================================

import { useForward } from "@/lib/forward/use-forward";

export interface ConnectedForwardModalProps {
  /** Called when modal closes */
  onClose?: () => void;
  /** Called after successful forward */
  onSuccess?: (results: ForwardResult[]) => void;
}

/**
 * A fully connected forward modal that manages its own state
 *
 * @example
 * ```tsx
 * import { ConnectedForwardModal } from '@/components/forward'
 *
 * function ChatView() {
 *   return (
 *     <>
 *       <Messages />
 *       <ConnectedForwardModal />
 *     </>
 *   )
 * }
 * ```
 */
export function ConnectedForwardModal({
  onClose,
  onSuccess,
}: ConnectedForwardModalProps) {
  const {
    isOpen,
    closeForwardModal,
    messageToForward,
    selectedDestinations,
    toggleDestination,
    deselectDestination,
    comment,
    setComment,
    searchQuery,
    setSearchQuery,
    recentDestinations,
    loadDestinations,
    destinations,
    isLoadingDestinations,
    isForwarding,
    forwardResults,
    executeForward,
  } = useForward({
    onSuccess: (results) => {
      onSuccess?.(results);
    },
    onClose: () => {
      onClose?.();
    },
  });

  // Separate channels and DMs from destinations
  const channels = React.useMemo(
    () => destinations.filter((d) => d.type === "channel"),
    [destinations],
  );

  const directMessages = React.useMemo(
    () => destinations.filter((d) => d.type === "direct" || d.type === "group"),
    [destinations],
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeForwardModal();
      onClose?.();
    }
  };

  return (
    <ForwardMessageModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      message={messageToForward}
      recentDestinations={recentDestinations}
      channels={channels}
      directMessages={directMessages}
      selectedDestinations={selectedDestinations}
      onToggleDestination={toggleDestination}
      onRemoveDestination={deselectDestination}
      comment={comment}
      onCommentChange={setComment}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onLoadDestinations={loadDestinations}
      onConfirm={executeForward}
      isLoadingDestinations={isLoadingDestinations}
      isForwarding={isForwarding}
      forwardResults={forwardResults}
    />
  );
}

export default ForwardMessageModal;
