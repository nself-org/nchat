"use client";

/**
 * DraftRestore - Restore draft to composer
 *
 * UI component for restoring a saved draft
 */

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { RefreshCw, X, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Draft, DraftContextType } from "@/lib/drafts/draft-types";
import { getDraftPreview, createContextKey } from "@/lib/drafts";
import { useDraftsStore } from "@/stores/drafts-store";

// ============================================================================
// Types
// ============================================================================

export interface DraftRestoreProps {
  /** Context type */
  contextType: DraftContextType;
  /** Context ID */
  contextId: string;
  /** Auto-show when draft exists */
  autoShow?: boolean;
  /** Called when draft is restored */
  onRestore?: (draft: Draft) => void;
  /** Called when restore is dismissed */
  onDismiss?: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DraftRestore({
  contextType,
  contextId,
  autoShow = true,
  onRestore,
  onDismiss,
  className,
}: DraftRestoreProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const contextKey = createContextKey(contextType, contextId);
  const draft = useDraftsStore((state) => state.drafts.get(contextKey));
  const restoreDraft = useDraftsStore((state) => state.restoreDraft);

  // Reset dismissed state when context changes
  useEffect(() => {
    setIsDismissed(false);
  }, [contextKey]);

  // Handle restore
  const handleRestore = useCallback(async () => {
    if (!draft) return;

    setIsRestoring(true);
    try {
      const restoredDraft = await restoreDraft(contextKey);
      if (restoredDraft) {
        onRestore?.(restoredDraft);
      }
    } finally {
      setIsRestoring(false);
    }
  }, [draft, restoreDraft, contextKey, onRestore]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Don't show if no draft or dismissed
  const hasDraft = draft && draft.content.trim().length > 0;
  const shouldShow = autoShow && hasDraft && !isDismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30",
            className,
          )}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              You have a draft
            </p>
            <p className="truncate text-xs text-amber-700 dark:text-amber-300">
              {getDraftPreview(draft!, 60)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              disabled={isRestoring}
              className="gap-1.5 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRestoring && "animate-spin")}
              />
              {isRestoring ? "Restoring..." : "Restore"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Minimal Restore Banner
// ============================================================================

export interface DraftRestoreMinimalProps {
  contextType: DraftContextType;
  contextId: string;
  onRestore?: (draft: Draft) => void;
  className?: string;
}

/**
 * Minimal inline restore prompt
 */
export function DraftRestoreMinimal({
  contextType,
  contextId,
  onRestore,
  className,
}: DraftRestoreMinimalProps) {
  const contextKey = createContextKey(contextType, contextId);
  const draft = useDraftsStore((state) => state.drafts.get(contextKey));
  const restoreDraft = useDraftsStore((state) => state.restoreDraft);

  const handleRestore = useCallback(async () => {
    const restoredDraft = await restoreDraft(contextKey);
    if (restoredDraft) {
      onRestore?.(restoredDraft);
    }
  }, [restoreDraft, contextKey, onRestore]);

  const hasDraft = draft && draft.content.trim().length > 0;

  if (!hasDraft) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400",
        className,
      )}
    >
      <FileText className="h-4 w-4" />
      <span>Draft available</span>
      <button
        onClick={handleRestore}
        className="text-amber-700 underline hover:no-underline dark:text-amber-300"
      >
        Restore
      </button>
    </div>
  );
}

// ============================================================================
// Restore Toast
// ============================================================================

export interface DraftRestoreToastProps {
  draft: Draft;
  onRestore: () => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * Toast notification style restore prompt
 */
export function DraftRestoreToast({
  draft,
  onRestore,
  onDismiss,
  className,
}: DraftRestoreToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg",
        className,
      )}
    >
      <FileText className="h-5 w-5 text-amber-500" />

      <div className="flex-1">
        <p className="text-sm font-medium">Unsaved draft</p>
        <p className="max-w-[200px] truncate text-xs text-muted-foreground">
          {getDraftPreview(draft, 40)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRestore}>
          Restore
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </motion.div>
  );
}

export default DraftRestore;
