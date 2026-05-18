"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Image,
  Video,
  Mic,
  File,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  DisappearingMessageData,
  ViewOnceMediaInfo,
  ViewOnceState,
  getViewOnceState,
  getPlaceholderText,
  getViewOnceStatusText,
  getViewOnceWarning,
  formatOpenedText,
  getBlurredPlaceholderStyles,
} from "@/lib/disappearing";

interface ViewOnceMessageProps {
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Sender user ID */
  senderId: string;
  /** Current user ID */
  currentUserId: string;
  /** Disappearing data */
  disappearing: DisappearingMessageData;
  /** Media info */
  media?: ViewOnceMediaInfo;
  /** Actual content (only available when viewing) */
  content?: string | null;
  /** Callback when user wants to view */
  onView: () => Promise<{ content?: string; error?: string }>;
  /** Callback after viewing completes */
  onViewed?: () => void;
  /** Whether viewing is in progress */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * View-once message component.
 * Shows a blurred/locked preview until viewed, then displays content briefly.
 */
export function ViewOnceMessage({
  messageId,
  channelId,
  senderId,
  currentUserId,
  disappearing,
  media,
  content,
  onView,
  onViewed,
  isLoading = false,
  className,
}: ViewOnceMessageProps) {
  const [state, setState] = useState<ViewOnceState>(() =>
    getViewOnceState({ disappearing, userId: senderId }, currentUserId),
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwnMessage = currentUserId === senderId;
  const mediaType = media?.type || "default";
  const MediaIcon = getMediaIcon(mediaType);

  // Handle view confirmation
  const handleViewClick = useCallback(() => {
    if (state.hasBeenViewed && !isOwnMessage) {
      return; // Already viewed by someone else
    }

    if (isOwnMessage) {
      // Owner can view without confirmation
      handleView();
    } else {
      // Show confirmation dialog
      setShowConfirm(true);
    }
  }, [state.hasBeenViewed, isOwnMessage]);

  // Handle actual view
  const handleView = useCallback(async () => {
    setShowConfirm(false);
    setState((prev) => ({ ...prev, isViewing: true }));
    setError(null);

    try {
      const result = await onView();

      if (result.error) {
        setError(result.error);
        setState((prev) => ({ ...prev, isViewing: false }));
        return;
      }

      if (result.content) {
        setViewContent(result.content);
        setShowContent(true);

        // Auto-close after viewing
        viewTimerRef.current = setTimeout(() => {
          setShowContent(false);
          setViewContent(null);
          setState((prev) => ({
            ...prev,
            isViewing: false,
            hasBeenViewed: true,
            viewedBy: currentUserId,
            viewedAt: new Date().toISOString(),
          }));
          onViewed?.();
        }, 10000); // 10 seconds viewing time
      }
    } catch (err) {
      setError("Failed to view message");
      setState((prev) => ({ ...prev, isViewing: false }));
    }
  }, [onView, onViewed, currentUserId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }
    };
  }, []);

  // Close content viewer
  const handleCloseViewer = useCallback(() => {
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
    }
    setShowContent(false);
    setViewContent(null);
    setState((prev) => ({
      ...prev,
      isViewing: false,
      hasBeenViewed: true,
    }));
    onViewed?.();
  }, [onViewed]);

  const statusText = getViewOnceStatusText(state, isOwnMessage);

  return (
    <>
      {/* Message Preview */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-lg",
          "border border-amber-500/30 bg-amber-500/5",
          "transition-all hover:border-amber-500/50",
          state.hasBeenViewed && "cursor-default opacity-60",
          className,
        )}
        onClick={
          state.hasBeenViewed && !isOwnMessage ? undefined : handleViewClick
        }
      >
        {/* Blurred background for media */}
        {media?.thumbnailUrl && (
          <div
            className="absolute inset-0 opacity-30"
            style={getBlurredPlaceholderStyles(media.thumbnailUrl)}
          />
        )}

        {/* Content */}
        <div className="relative flex items-center gap-3 p-4">
          {/* Icon */}
          <div
            className={cn(
              "flex-shrink-0 rounded-full p-3",
              state.hasBeenViewed
                ? "bg-muted text-muted-foreground"
                : "bg-amber-500/10 text-amber-500",
            )}
          >
            {state.hasBeenViewed ? (
              <EyeOff size={24} />
            ) : state.isViewing ? (
              <Eye size={24} className="animate-pulse" />
            ) : (
              <MediaIcon size={24} />
            )}
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-medium",
                state.hasBeenViewed
                  ? "text-muted-foreground"
                  : "text-amber-600",
              )}
            >
              {getPlaceholderText(mediaType)}
            </p>
            <p className="text-xs text-muted-foreground">
              {state.hasBeenViewed && state.viewedAt
                ? formatOpenedText(state.viewedBy || "Unknown", state.viewedAt)
                : statusText}
            </p>
          </div>

          {/* Lock icon for unviewed */}
          {!state.hasBeenViewed && !isOwnMessage && (
            <Lock size={16} className="text-amber-500/50" />
          )}
        </div>

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-background/80 absolute inset-0 flex items-center justify-center"
            >
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error overlay */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-red-500/10"
            >
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Eye className="text-amber-500" />
              View once message
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getViewOnceWarning()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleView}>
              View message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content Viewer Dialog */}
      <Dialog open={showContent} onOpenChange={handleCloseViewer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="text-amber-500" />
              View once message
            </DialogTitle>
            <DialogDescription>
              This content will not be available after you close this dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {media?.type === "image" && viewContent && (
              <img
                src={viewContent}
                alt="View once content"
                className="mx-auto max-h-[60vh] max-w-full rounded-lg"
              />
            )}
            {media?.type === "video" && viewContent && (
              <video
                src={viewContent}
                controls
                autoPlay
                className="mx-auto max-h-[60vh] max-w-full rounded-lg"
              >
                <track kind="captions" />
              </video>
            )}
            {(!media || media.type === "file") && viewContent && (
              <p className="p-4 text-center">{viewContent}</p>
            )}
          </div>

          <div className="flex justify-center">
            <Button onClick={handleCloseViewer}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Get icon component for media type.
 */
function getMediaIcon(type: string) {
  switch (type) {
    case "image":
      return Image;
    case "video":
      return Video;
    case "audio":
      return Mic;
    case "file":
      return File;
    default:
      return Eye;
  }
}

/**
 * Compact view-once indicator for message list.
 */
export function ViewOnceIndicator({
  hasBeenViewed,
  className,
}: {
  hasBeenViewed: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        hasBeenViewed
          ? "bg-muted text-muted-foreground"
          : "bg-amber-500/10 text-amber-500",
        className,
      )}
    >
      {hasBeenViewed ? <EyeOff size={10} /> : <Eye size={10} />}
      <span>{hasBeenViewed ? "Opened" : "View once"}</span>
    </div>
  );
}

export default ViewOnceMessage;
