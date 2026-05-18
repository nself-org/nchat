"use client";

/**
 * Message Actions Component
 *
 * Hover actions bar that appears on message hover with:
 * - Quick reactions (emoji picker)
 * - Reply
 * - Thread
 * - Share
 * - More menu (pin, bookmark, forward, delete, etc.)
 * - Mobile floating action sheet
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  MessageSquare,
  Reply,
  MoreHorizontal,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  Forward,
  Link2,
  Flag,
  Share2,
  Copy,
  Clock,
  MailOpen,
  Info,
  History,
  Users,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  Message,
  MessageActionPermissions,
  MessageAction,
} from "@/types/message";

// ============================================================================
// Types
// ============================================================================

interface MessageActionsProps {
  message: Message;
  permissions: MessageActionPermissions;
  onAction: (action: MessageAction, data?: unknown) => void;
  className?: string;
  position?: "left" | "right";
  variant?: "default" | "compact" | "mobile";
}

// ============================================================================
// Quick Reactions
// ============================================================================

const QUICK_REACTIONS = [
  { emoji: "👍", name: "thumbs_up", label: "Thumbs up" },
  { emoji: "❤️", name: "heart", label: "Heart" },
  { emoji: "😂", name: "joy", label: "Joy" },
  { emoji: "🎉", name: "tada", label: "Celebrate" },
  { emoji: "👀", name: "eyes", label: "Eyes" },
  { emoji: "🔥", name: "fire", label: "Fire" },
  { emoji: "✅", name: "check", label: "Check" },
  { emoji: "🚀", name: "rocket", label: "Rocket" },
];

// ============================================================================
// Main Component
// ============================================================================

export function MessageActions({
  message,
  permissions,
  onAction,
  className,
  position = "right",
  variant = "default",
}: MessageActionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  if (variant === "mobile") {
    return (
      <MobileMessageActions
        message={message}
        permissions={permissions}
        onAction={onAction}
        className={className}
      />
    );
  }

  if (variant === "compact") {
    return (
      <CompactMessageActions
        message={message}
        permissions={permissions}
        onAction={onAction}
        className={className}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "absolute -top-4 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 shadow-lg",
        position === "right" ? "right-2" : "left-12",
        className,
      )}
    >
      {/* Quick reactions */}
      {permissions.canReact && (
        <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted"
              title="Add reaction"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="bg-popover/95 w-auto border-0 p-2 shadow-xl backdrop-blur-sm"
          >
            <QuickReactionPicker
              onReact={(emoji) => {
                onAction("react", { emoji });
                setShowReactionPicker(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Reply */}
      {permissions.canReply && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction("reply")}
          className="h-7 w-7 p-0 hover:bg-muted"
          title="Reply"
        >
          <Reply className="h-4 w-4" />
        </Button>
      )}

      {/* Thread */}
      {permissions.canThread && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction("thread")}
          className="h-7 w-7 p-0 hover:bg-muted"
          title="Reply in thread"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}

      {/* Share */}
      {permissions.canForward && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction("forward")}
          className="h-7 w-7 p-0 hover:bg-muted"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}

      {/* More menu */}
      <MoreActionsMenu
        message={message}
        permissions={permissions}
        onAction={onAction}
      />
    </motion.div>
  );
}

// ============================================================================
// Quick Reaction Picker
// ============================================================================

function QuickReactionPicker({
  onReact,
}: {
  onReact: (emoji: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {QUICK_REACTIONS.map((reaction) => (
          <button
            key={reaction.name}
            onClick={() => onReact(reaction.emoji)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition-colors hover:bg-muted"
            title={reaction.label}
          >
            {reaction.emoji}
          </button>
        ))}
      </div>
      <div className="text-center text-xs text-muted-foreground">
        Click to react
      </div>
    </div>
  );
}

// ============================================================================
// More Actions Menu
// ============================================================================

function MoreActionsMenu({
  message,
  permissions,
  onAction,
}: {
  message: Message;
  permissions: MessageActionPermissions;
  onAction: (action: MessageAction, data?: unknown) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-muted"
          title="More actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Edit */}
        {permissions.canEdit && (
          <DropdownMenuItem onClick={() => onAction("edit")}>
            <Edit className="mr-2 h-4 w-4" />
            Edit message
            <DropdownMenuShortcut>E</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}

        {/* Pin/Unpin */}
        {permissions.canPin && (
          <DropdownMenuItem
            onClick={() => onAction(message.isPinned ? "unpin" : "pin")}
          >
            {message.isPinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" />
                Unpin message
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Pin message
              </>
            )}
            <DropdownMenuShortcut>P</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}

        {/* Bookmark */}
        {permissions.canBookmark && (
          <DropdownMenuItem
            onClick={() =>
              onAction(message.isBookmarked ? "unbookmark" : "bookmark")
            }
          >
            {message.isBookmarked ? (
              <>
                <BookmarkCheck className="mr-2 h-4 w-4" />
                Remove bookmark
              </>
            ) : (
              <>
                <Bookmark className="mr-2 h-4 w-4" />
                Bookmark
              </>
            )}
            <DropdownMenuShortcut>S</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Forward */}
        {permissions.canForward && (
          <DropdownMenuItem onClick={() => onAction("forward")}>
            <Forward className="mr-2 h-4 w-4" />
            Forward message
          </DropdownMenuItem>
        )}

        {/* Copy submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                onAction("copy");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy text
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const url = `${window.location.origin}/chat/${message.channelId}?message=${message.id}`;
                navigator.clipboard.writeText(url);
                onAction("copy-link");
              }}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Mark as unread */}
        {permissions.canMarkUnread && (
          <DropdownMenuItem onClick={() => onAction("mark-unread")}>
            <MailOpen className="mr-2 h-4 w-4" />
            Mark as unread
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Message info submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Info className="mr-2 h-4 w-4" />
            Message info
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel className="text-xs">
              Message Details
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {message.isEdited && (
              <DropdownMenuItem>
                <History className="mr-2 h-4 w-4" />
                View edit history
              </DropdownMenuItem>
            )}
            {message.reactions && message.reactions.length > 0 && (
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                View reactions ({message.reactions.length})
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-muted-foreground">
              <div>
                <strong>Sent:</strong>{" "}
                {new Date(message.createdAt).toLocaleString()}
              </div>
              {message.isEdited && message.editedAt && (
                <div className="mt-1">
                  <strong>Edited:</strong>{" "}
                  {new Date(message.editedAt).toLocaleString()}
                </div>
              )}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Separator before destructive actions */}
        {(permissions.canReport || permissions.canDelete) && (
          <DropdownMenuSeparator />
        )}

        {/* Report */}
        {permissions.canReport && (
          <DropdownMenuItem
            onClick={() => onAction("report")}
            className="text-amber-600 focus:text-amber-600 dark:text-amber-500"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report message
          </DropdownMenuItem>
        )}

        {/* Delete */}
        {permissions.canDelete && (
          <DropdownMenuItem
            onClick={() => onAction("delete")}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete message
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Compact Message Actions (for inline view)
// ============================================================================

export function CompactMessageActions({
  message,
  permissions,
  onAction,
  className,
}: Omit<MessageActionsProps, "position" | "variant">) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {permissions.canReact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction("react")}
          className="h-6 w-6 p-0"
          title="React"
        >
          <Smile className="h-3.5 w-3.5" />
        </Button>
      )}
      {permissions.canReply && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction("reply")}
          className="h-6 w-6 p-0"
          title="Reply"
        >
          <Reply className="h-3.5 w-3.5" />
        </Button>
      )}
      {permissions.canThread && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction("thread")}
          className="h-6 w-6 p-0"
          title="Thread"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      )}
      <MoreActionsMenu
        message={message}
        permissions={permissions}
        onAction={onAction}
      />
    </div>
  );
}

// ============================================================================
// Mobile Floating Action Sheet
// ============================================================================

export function MobileMessageActions({
  message,
  permissions,
  onAction,
  onClose,
  className,
}: MessageActionsProps & { onClose?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t bg-background p-4 shadow-2xl",
        className,
      )}
    >
      {/* Handle bar */}
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" />

      {/* Quick reactions */}
      {permissions.canReact && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            React
          </div>
          <div className="flex justify-center gap-2">
            {QUICK_REACTIONS.map((reaction) => (
              <button
                key={reaction.name}
                onClick={() => {
                  onAction("react", { emoji: reaction.emoji });
                  onClose?.();
                }}
                className="hover:bg-muted/80 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl"
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-3">
        {permissions.canReply && (
          <ActionButton
            icon={Reply}
            label="Reply"
            onClick={() => {
              onAction("reply");
              onClose?.();
            }}
          />
        )}
        {permissions.canThread && (
          <ActionButton
            icon={MessageSquare}
            label="Thread"
            onClick={() => {
              onAction("thread");
              onClose?.();
            }}
          />
        )}
        {permissions.canEdit && (
          <ActionButton
            icon={Edit}
            label="Edit"
            onClick={() => {
              onAction("edit");
              onClose?.();
            }}
          />
        )}
        {permissions.canPin && (
          <ActionButton
            icon={message.isPinned ? PinOff : Pin}
            label={message.isPinned ? "Unpin" : "Pin"}
            onClick={() => {
              onAction(message.isPinned ? "unpin" : "pin");
              onClose?.();
            }}
          />
        )}
        {permissions.canBookmark && (
          <ActionButton
            icon={message.isBookmarked ? BookmarkCheck : Bookmark}
            label={message.isBookmarked ? "Saved" : "Save"}
            onClick={() => {
              onAction(message.isBookmarked ? "unbookmark" : "bookmark");
              onClose?.();
            }}
          />
        )}
        {permissions.canForward && (
          <ActionButton
            icon={Forward}
            label="Forward"
            onClick={() => {
              onAction("forward");
              onClose?.();
            }}
          />
        )}
        <ActionButton
          icon={Copy}
          label="Copy"
          onClick={() => {
            navigator.clipboard.writeText(message.content);
            onAction("copy");
            onClose?.();
          }}
        />
        {permissions.canDelete && (
          <ActionButton
            icon={Trash2}
            label="Delete"
            variant="destructive"
            onClick={() => {
              onAction("delete");
              onClose?.();
            }}
          />
        )}
      </div>

      {/* Close button */}
      <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
        Cancel
      </Button>
    </motion.div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ActionButton({
  icon: Icon,
  label,
  variant = "default",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "default" | "destructive";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl p-3 transition-colors",
        variant === "default" && "hover:bg-muted",
        variant === "destructive" && "hover:bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// ============================================================================
// Bulk Selection Actions
// ============================================================================

export function BulkMessageActions({
  selectedCount,
  onDelete,
  onForward,
  onCopy,
  onClearSelection,
  className,
}: {
  selectedCount: number;
  onDelete: () => void;
  onForward: () => void;
  onCopy: () => void;
  onClearSelection: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-2">
        <Check className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{selectedCount} selected</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </Button>
        <Button variant="ghost" size="sm" onClick={onForward}>
          <Forward className="mr-2 h-4 w-4" />
          Forward
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="ml-auto"
      >
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
