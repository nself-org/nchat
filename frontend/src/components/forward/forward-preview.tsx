"use client";

import * as React from "react";
import {
  Forward,
  X,
  Hash,
  Lock,
  MessageCircle,
  Users,
  Paperclip,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user/user-avatar";
import type {
  ForwardMessage,
  ForwardDestination,
  ForwardResult,
} from "@/lib/forward/forward-store";

// ============================================================================
// Types
// ============================================================================

export interface ForwardPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The message being forwarded */
  message: ForwardMessage;
  /** Selected destinations */
  selectedDestinations: ForwardDestination[];
  /** Optional comment to add */
  comment: string;
  /** Called when comment changes */
  onCommentChange: (comment: string) => void;
  /** Called when a destination is removed */
  onRemoveDestination: (destinationId: string) => void;
  /** Called when forward is confirmed */
  onConfirm: () => void;
  /** Called when cancelled */
  onCancel: () => void;
  /** Whether forwarding is in progress */
  isForwarding?: boolean;
  /** Results from forwarding */
  forwardResults?: ForwardResult[];
  /** Maximum comment length */
  maxCommentLength?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDestinationIcon(
  type: ForwardDestination["type"],
  isPrivate?: boolean,
) {
  switch (type) {
    case "direct":
      return MessageCircle;
    case "group":
      return Users;
    case "channel":
    default:
      return isPrivate ? Lock : Hash;
  }
}

function truncateContent(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}

// ============================================================================
// Message Preview Component
// ============================================================================

interface MessagePreviewProps {
  message: ForwardMessage;
}

function MessagePreview({ message }: MessagePreviewProps) {
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className="bg-muted/30 rounded-lg border p-3">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <UserAvatar
          user={{
            displayName: message.user.displayName,
            avatarUrl: message.user.avatarUrl,
          }}
          size="xs"
          showPresence={false}
        />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">
            {message.user.displayName}
          </span>
          {message.channelName && (
            <span className="ml-2 text-xs text-muted-foreground">
              in #{message.channelName}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground/90 whitespace-pre-wrap text-sm">
        {truncateContent(message.content)}
      </p>

      {/* Attachments indicator */}
      {hasAttachments && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {message.attachments!.some((a) => a.fileType.startsWith("image/")) ? (
            <ImageIcon className="h-3 w-3" />
          ) : (
            <Paperclip className="h-3 w-3" />
          )}
          <span>
            {message.attachments!.length}{" "}
            {message.attachments!.length === 1 ? "attachment" : "attachments"}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Selected Destination Badge
// ============================================================================

interface DestinationBadgeProps {
  destination: ForwardDestination;
  onRemove: () => void;
  result?: ForwardResult;
  disabled?: boolean;
}

function DestinationBadge({
  destination,
  onRemove,
  result,
  disabled,
}: DestinationBadgeProps) {
  const Icon = getDestinationIcon(destination.type, destination.isPrivate);

  return (
    <Badge
      variant={result?.success === false ? "destructive" : "secondary"}
      className={cn(
        "gap-1 pl-1.5 pr-1",
        result?.success &&
          "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      )}
    >
      {result ? (
        result.success ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <XCircle className="h-3 w-3" />
        )
      ) : (
        <Icon className="h-3 w-3" />
      )}
      <span className="max-w-[100px] truncate">
        {destination.type === "direct" && destination.members?.length === 1
          ? destination.members[0].displayName
          : destination.name}
      </span>
      {!disabled && !result && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={`Remove ${destination.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const ForwardPreview = React.forwardRef<
  HTMLDivElement,
  ForwardPreviewProps
>(
  (
    {
      className,
      message,
      selectedDestinations,
      comment,
      onCommentChange,
      onRemoveDestination,
      onConfirm,
      onCancel,
      isForwarding = false,
      forwardResults = [],
      maxCommentLength = 500,
      ...props
    },
    ref,
  ) => {
    const hasResults = forwardResults.length > 0;
    const allSuccessful = hasResults && forwardResults.every((r) => r.success);
    const hasFailures = hasResults && forwardResults.some((r) => !r.success);

    // Get result for a specific destination
    const getResult = (destinationId: string) =>
      forwardResults.find((r) => r.destinationId === destinationId);

    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-4", className)}
        {...props}
      >
        {/* Message Preview */}
        <div>
          <span className="mb-2 block text-sm font-medium">
            Forwarding message
          </span>
          <MessagePreview message={message} />
        </div>

        {/* Selected Destinations */}
        <div>
          <span className="mb-2 block text-sm font-medium">
            To ({selectedDestinations.length})
          </span>
          <ScrollArea className="max-h-24">
            <div className="flex flex-wrap gap-1.5">
              {selectedDestinations.map((destination) => (
                <DestinationBadge
                  key={destination.id}
                  destination={destination}
                  onRemove={() => onRemoveDestination(destination.id)}
                  result={getResult(destination.id)}
                  disabled={isForwarding || hasResults}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Comment Input */}
        {!hasResults && (
          <div>
            <label
              htmlFor="forward-comment"
              className="mb-2 block text-sm font-medium"
            >
              Add a comment (optional)
            </label>
            <Textarea
              id="forward-comment"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Say something about this message..."
              maxLength={maxCommentLength}
              disabled={isForwarding}
              rows={2}
              className="resize-none"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {comment.length}/{maxCommentLength}
            </div>
          </div>
        )}

        {/* Results Summary */}
        {hasResults && (
          <div
            className={cn(
              "rounded-lg p-3 text-sm",
              allSuccessful
                ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                : hasFailures
                  ? "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                  : "bg-muted",
            )}
          >
            {allSuccessful ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Successfully forwarded to {forwardResults.length}{" "}
                  {forwardResults.length === 1 ? "destination" : "destinations"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                <span>
                  {forwardResults.filter((r) => r.success).length} of{" "}
                  {forwardResults.length} forwards succeeded
                </span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isForwarding}
          >
            {hasResults ? "Close" : "Cancel"}
          </Button>
          {!hasResults && (
            <Button
              type="button"
              onClick={onConfirm}
              disabled={selectedDestinations.length === 0 || isForwarding}
            >
              {isForwarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forwarding...
                </>
              ) : (
                <>
                  <Forward className="mr-2 h-4 w-4" />
                  Forward to {selectedDestinations.length}{" "}
                  {selectedDestinations.length === 1
                    ? "destination"
                    : "destinations"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  },
);

ForwardPreview.displayName = "ForwardPreview";

export default ForwardPreview;
