"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Flame, Clock, Eye, AlertTriangle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  DisappearingMessageData,
  getBurnAnimationStyles,
} from "@/lib/disappearing";
import { BurnCountdown, CircularCountdown } from "./DisappearingCountdown";

interface BurnAfterReadingProps {
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Message content */
  content: string;
  /** Sender user ID */
  senderId: string;
  /** Current user ID */
  currentUserId: string;
  /** Disappearing data */
  disappearing: DisappearingMessageData;
  /** Callback when user starts reading */
  onStartReading: () => void;
  /** Callback when burn timer completes */
  onBurnComplete: () => void;
  /** Whether the content is revealed */
  isRevealed?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Burn-after-reading message component.
 * Content is hidden until user clicks to read, then burns after countdown.
 */
export function BurnAfterReading({
  messageId,
  channelId,
  content,
  senderId,
  currentUserId,
  disappearing,
  onStartReading,
  onBurnComplete,
  isRevealed = false,
  className,
}: BurnAfterReadingProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isReading, setIsReading] = useState(
    isRevealed || disappearing.isReading,
  );
  const [isBurning, setIsBurning] = useState(false);
  const [burnProgress, setBurnProgress] = useState(0);
  const burnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(
    null,
  );

  const burnTimer = disappearing.burnTimer || 10;
  const isOwnMessage = currentUserId === senderId;
  const alreadyStarted =
    disappearing.isReading && disappearing.readingStartedAt;

  // Calculate remaining time if already started
  const remainingTime =
    alreadyStarted && disappearing.expiresAt
      ? Math.max(
          0,
          (new Date(disappearing.expiresAt).getTime() - Date.now()) / 1000,
        )
      : burnTimer;

  // Handle click to read
  const handleReadClick = useCallback(() => {
    if (isReading || isBurning) return;

    if (isOwnMessage) {
      // Owner can read without confirmation
      startReading();
    } else {
      // Show confirmation
      setShowConfirm(true);
    }
  }, [isReading, isBurning, isOwnMessage]);

  // Start reading
  const startReading = useCallback(() => {
    setShowConfirm(false);
    setIsReading(true);
    onStartReading();
  }, [onStartReading]);

  // Start burn animation
  const startBurnAnimation = useCallback(
    (duration: number) => {
      setIsBurning(true);
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / (duration * 1000));
        setBurnProgress(progress);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          onBurnComplete();
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [onBurnComplete],
  );

  // Handle timer complete
  const handleTimerComplete = useCallback(() => {
    startBurnAnimation(0.8); // 800ms burn animation
  }, [startBurnAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (burnTimerRef.current) {
        clearInterval(burnTimerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // If not yet revealed, show locked state
  if (!isReading) {
    return (
      <>
        <button
          onClick={handleReadClick}
          className={cn(
            "relative w-full cursor-pointer overflow-hidden rounded-lg",
            "border border-red-500/30 bg-red-500/5",
            "transition-all hover:border-red-500/50 hover:bg-red-500/10",
            "p-4",
            className,
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 rounded-full bg-red-500/10 p-3 text-red-500">
              <Flame size={24} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-red-600 dark:text-red-400">
                Burn after reading
              </p>
              <p className="text-xs text-muted-foreground">
                Tap to reveal ({burnTimer}s countdown)
              </p>
            </div>
            <Lock size={16} className="text-red-500/50" />
          </div>
        </button>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Flame className="text-red-500" />
                Burn after reading
              </AlertDialogTitle>
              <AlertDialogDescription>
                This message will disappear {burnTimer} seconds after you read
                it. Are you ready to view it?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <AlertDialogAction
                onClick={startReading}
                className="bg-red-500 hover:bg-red-600"
              >
                Reveal message
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Content revealed - show with countdown
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isBurning ? "burning" : "reading"}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={isBurning ? getBurnAnimationStyles(burnProgress) : undefined}
        className={cn(
          "relative overflow-hidden rounded-lg",
          "border border-red-500/30 bg-red-500/5",
          className,
        )}
      >
        {/* Countdown timer */}
        <div className="absolute right-2 top-2 z-10">
          {!isBurning && (
            <CircularCountdown
              seconds={Math.ceil(remainingTime)}
              onComplete={handleTimerComplete}
              size="sm"
            />
          )}
        </div>

        {/* Message content */}
        <div className="p-4 pr-16">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex-shrink-0 rounded-full p-2",
                isBurning
                  ? "animate-pulse bg-red-500 text-white"
                  : "bg-red-500/10 text-red-500",
              )}
            >
              <Flame size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", isBurning && "blur-sm")}>{content}</p>
            </div>
          </div>
        </div>

        {/* Burn progress bar */}
        {isReading && !isBurning && (
          <div className="absolute bottom-0 left-0 right-0">
            <BurnProgressBar
              seconds={Math.ceil(remainingTime)}
              onComplete={handleTimerComplete}
            />
          </div>
        )}

        {/* Burning overlay */}
        <AnimatePresence>
          {isBurning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-red-500/50 to-orange-500/50"
            >
              <div className="text-center text-white">
                <Flame size={32} className="mx-auto mb-2 animate-bounce" />
                <p className="text-sm font-medium">Burning...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Progress bar that fills as burn time runs out.
 */
function BurnProgressBar({
  seconds,
  onComplete,
}: {
  seconds: number;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());
  const totalTimeRef = useRef(seconds * 1000);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(100, (elapsed / totalTimeRef.current) * 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        onComplete();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <Progress
      value={progress}
      className={cn(
        "h-1 rounded-none",
        "[&>div]:bg-gradient-to-r [&>div]:from-red-500 [&>div]:to-orange-500",
      )}
    />
  );
}

/**
 * Compact burn indicator for message list.
 */
export function BurnIndicator({
  burnTimer,
  isReading,
  className,
}: {
  burnTimer: number;
  isReading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        isReading
          ? "animate-pulse bg-red-500 text-white"
          : "bg-red-500/10 text-red-500",
        className,
      )}
    >
      <Flame size={10} />
      <span>{isReading ? "Burning..." : `${burnTimer}s`}</span>
    </div>
  );
}

export default BurnAfterReading;
