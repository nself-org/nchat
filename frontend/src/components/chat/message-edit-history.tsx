"use client";

import { useState, useMemo, memo } from "react";
import { format } from "date-fns";
import { History, ChevronDown, ChevronUp, Diff, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { MessageEditRecord, MessageUser } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface MessageEditHistoryProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Edit history records */
  history: MessageEditRecord[];
  /** Current message content */
  currentContent: string;
  /** Message author */
  author: MessageUser;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
}

export interface EditHistoryItemProps {
  /** Edit record */
  record: MessageEditRecord;
  /** Previous content for diff comparison */
  previousContent?: string;
  /** Index in the list (0 = most recent) */
  index: number;
  /** Whether to show diff view */
  showDiff: boolean;
  /** Whether this item is expanded */
  isExpanded: boolean;
  /** Toggle expansion */
  onToggleExpand: () => void;
}

// ============================================================================
// Diff Utility Functions
// ============================================================================

interface DiffSegment {
  type: "unchanged" | "added" | "removed";
  text: string;
}

/**
 * Simple word-level diff between two strings
 */
function computeDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  const segments: DiffSegment[] = [];

  // Simple LCS-based diff
  const dp: number[][] = Array(oldWords.length + 1)
    .fill(null)
    .map(() => Array(newWords.length + 1).fill(0));

  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the diff
  let i = oldWords.length;
  let j = newWords.length;
  const result: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: "unchanged", text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: newWords[j - 1] });
      j--;
    } else if (i > 0) {
      result.unshift({ type: "removed", text: oldWords[i - 1] });
      i--;
    }
  }

  // Merge consecutive segments of the same type
  for (const segment of result) {
    const last = segments[segments.length - 1];
    if (last && last.type === segment.type) {
      last.text += segment.text;
    } else {
      segments.push({ ...segment });
    }
  }

  return segments;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Renders a diff view between two versions
 */
const DiffView = memo(function DiffView({
  oldContent,
  newContent,
}: {
  oldContent: string;
  newContent: string;
}) {
  const diff = useMemo(
    () => computeDiff(oldContent, newContent),
    [oldContent, newContent],
  );

  return (
    <div className="bg-muted/30 rounded-md border p-3 font-mono text-sm">
      {diff.map((segment, idx) => (
        <span
          key={idx}
          className={cn(
            segment.type === "added" &&
              "bg-green-500/20 text-green-700 dark:text-green-400",
            segment.type === "removed" &&
              "bg-red-500/20 text-red-700 line-through dark:text-red-400",
          )}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
});

/**
 * Individual edit history item
 */
const EditHistoryItem = memo(function EditHistoryItem({
  record,
  previousContent,
  index,
  showDiff,
  isExpanded,
  onToggleExpand,
}: EditHistoryItemProps) {
  const formattedDate = format(new Date(record.editedAt), "MMM d, yyyy");
  const formattedTime = format(new Date(record.editedAt), "h:mm a");

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggleExpand}
        className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-medium">
              {index === 0 ? "Original version" : `Edit ${index}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          {showDiff && previousContent ? (
            <DiffView
              oldContent={previousContent}
              newContent={record.newContent}
            />
          ) : (
            <div className="bg-muted/30 rounded-md border p-3 text-sm">
              {record.newContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * Message Edit History Modal
 *
 * Shows the complete edit history of a message with options to view
 * each version or compare changes using a diff view.
 */
export const MessageEditHistory = memo(function MessageEditHistory({
  open,
  onOpenChange,
  history,
  currentContent,
  author,
  isLoading = false,
  error = null,
}: MessageEditHistoryProps) {
  const [showDiff, setShowDiff] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  // Create a full history including current version
  const fullHistory = useMemo(() => {
    const items = [...history].sort(
      (a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime(),
    );
    return items;
  }, [history]);

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit History</DialogTitle>
              <DialogDescription>
                View all previous versions of this message
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Author info */}
        <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={author.avatarUrl} alt={author.displayName} />
            <AvatarFallback>
              {author.displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{author.displayName}</p>
            <p className="text-xs text-muted-foreground">
              {fullHistory.length} version{fullHistory.length !== 1 ? "s" : ""}{" "}
              total
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showDiff ? "outline" : "secondary"}
            size="sm"
            onClick={() => setShowDiff(false)}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List View
          </Button>
          <Button
            variant={showDiff ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowDiff(true)}
            className="gap-2"
          >
            <Diff className="h-4 w-4" />
            Diff View
          </Button>
        </div>

        {/* History list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4 text-center text-sm text-destructive">
              {error}
            </div>
          ) : fullHistory.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No edit history available
            </div>
          ) : (
            <div className="rounded-lg border">
              {/* Current version */}
              <div className="bg-primary/5 border-b">
                <button
                  onClick={() => handleToggleExpand(-1)}
                  className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium">
                      C
                    </div>
                    <div>
                      <p className="text-sm font-medium">Current version</p>
                      <p className="text-xs text-muted-foreground">
                        Latest edit
                      </p>
                    </div>
                  </div>
                  {expandedIndex === -1 ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expandedIndex === -1 && (
                  <div className="px-4 pb-4">
                    <div className="bg-muted/30 rounded-md border p-3 text-sm">
                      {currentContent}
                    </div>
                  </div>
                )}
              </div>

              {/* Previous versions */}
              {fullHistory.map((record, index) => (
                <EditHistoryItem
                  key={index}
                  record={record}
                  previousContent={
                    index === 0
                      ? currentContent
                      : fullHistory[index - 1]?.newContent
                  }
                  index={index}
                  showDiff={showDiff}
                  isExpanded={expandedIndex === index}
                  onToggleExpand={() => handleToggleExpand(index)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

export default MessageEditHistory;
