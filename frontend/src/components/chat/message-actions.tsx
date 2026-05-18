"use client";

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
  Link,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { QuickReactions } from "./message-reactions";
import type { MessageActionPermissions, MessageAction } from "@/types/message";

interface MessageActionsProps {
  messageId: string;
  permissions: MessageActionPermissions;
  isPinned?: boolean;
  isBookmarked?: boolean;
  onAction: (action: MessageAction) => void;
  className?: string;
  position?: "left" | "right";
}

/**
 * Message hover actions bar
 * Shows action buttons on message hover
 */
export function MessageActions({
  messageId,
  permissions,
  isPinned = false,
  isBookmarked = false,
  onAction,
  className,
  position = "right",
}: MessageActionsProps) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "absolute -top-4 z-10 flex items-center gap-0.5 rounded-lg border bg-popover p-0.5 shadow-md",
        position === "right" ? "right-2" : "left-12",
        className,
      )}
    >
      {/* Quick reactions */}
      {permissions.canReact && (
        <Popover open={showReactions} onOpenChange={setShowReactions}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            className="w-auto border-0 bg-transparent p-0 shadow-none"
          >
            <QuickReactions
              onReact={(emoji) => {
                onAction("react");
                setShowReactions(false);
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
          title="Start thread"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      )}

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Edit */}
          {permissions.canEdit && (
            <DropdownMenuItem onClick={() => onAction("edit")}>
              <Edit className="mr-2 h-4 w-4" />
              Edit message
            </DropdownMenuItem>
          )}

          {/* Pin/Unpin */}
          {permissions.canPin && (
            <DropdownMenuItem
              onClick={() => onAction(isPinned ? "unpin" : "pin")}
            >
              {isPinned ? (
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
            </DropdownMenuItem>
          )}

          {/* Bookmark */}
          {permissions.canBookmark && (
            <DropdownMenuItem
              onClick={() => onAction(isBookmarked ? "unbookmark" : "bookmark")}
            >
              {isBookmarked ? (
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
            </DropdownMenuItem>
          )}

          {/* Forward */}
          {permissions.canForward && (
            <DropdownMenuItem onClick={() => onAction("forward")}>
              <Forward className="mr-2 h-4 w-4" />
              Forward
            </DropdownMenuItem>
          )}

          {/* Copy link */}
          <DropdownMenuItem onClick={() => onAction("copy-link")}>
            <Link className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>

          {/* Separator */}
          {(permissions.canDelete || permissions.canReport) && (
            <DropdownMenuSeparator />
          )}

          {/* Report */}
          {permissions.canReport && (
            <DropdownMenuItem
              onClick={() => onAction("report")}
              className="text-amber-500 focus:text-amber-500"
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
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

/**
 * Inline message actions for mobile/compact view
 */
export function InlineMessageActions({
  messageId,
  permissions,
  isPinned = false,
  isBookmarked = false,
  onAction,
  className,
}: Omit<MessageActionsProps, "position">) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {permissions.canReact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction("react")}
          className="h-6 w-6 p-0"
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
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/**
 * Floating action button for mobile
 */
export function FloatingMessageActions({
  messageId,
  permissions,
  isPinned = false,
  isBookmarked = false,
  onAction,
  onClose,
  className,
}: MessageActionsProps & { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "fixed inset-x-4 bottom-4 z-50 rounded-xl border bg-popover p-4 shadow-xl",
        className,
      )}
    >
      {/* Quick reactions row */}
      <div className="mb-4 flex justify-center">
        <QuickReactions
          onReact={(emoji) => {
            onAction("react");
            onClose();
          }}
        />
      </div>

      {/* Action buttons grid */}
      <div className="grid grid-cols-4 gap-2">
        {permissions.canReply && (
          <ActionButton
            icon={Reply}
            label="Reply"
            onClick={() => {
              onAction("reply");
              onClose();
            }}
          />
        )}
        {permissions.canThread && (
          <ActionButton
            icon={MessageSquare}
            label="Thread"
            onClick={() => {
              onAction("thread");
              onClose();
            }}
          />
        )}
        {permissions.canEdit && (
          <ActionButton
            icon={Edit}
            label="Edit"
            onClick={() => {
              onAction("edit");
              onClose();
            }}
          />
        )}
        {permissions.canPin && (
          <ActionButton
            icon={isPinned ? PinOff : Pin}
            label={isPinned ? "Unpin" : "Pin"}
            onClick={() => {
              onAction(isPinned ? "unpin" : "pin");
              onClose();
            }}
          />
        )}
        {permissions.canBookmark && (
          <ActionButton
            icon={isBookmarked ? BookmarkCheck : Bookmark}
            label={isBookmarked ? "Saved" : "Save"}
            onClick={() => {
              onAction(isBookmarked ? "unbookmark" : "bookmark");
              onClose();
            }}
          />
        )}
        {permissions.canForward && (
          <ActionButton
            icon={Forward}
            label="Forward"
            onClick={() => {
              onAction("forward");
              onClose();
            }}
          />
        )}
        <ActionButton
          icon={Link}
          label="Copy link"
          onClick={() => {
            onAction("copy-link");
            onClose();
          }}
        />
        {permissions.canDelete && (
          <ActionButton
            icon={Trash2}
            label="Delete"
            variant="destructive"
            onClick={() => {
              onAction("delete");
              onClose();
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
        "flex flex-col items-center gap-1 rounded-lg p-2 transition-colors",
        variant === "default" && "hover:bg-muted",
        variant === "destructive" && "hover:bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </button>
  );
}

/**
 * Get default permissions based on message ownership and user role
 */
export function getMessagePermissions(
  isOwnMessage: boolean,
  userRole: "owner" | "admin" | "moderator" | "member" | "guest" = "member",
): MessageActionPermissions {
  const isModerator = ["owner", "admin", "moderator"].includes(userRole);

  return {
    canEdit: isOwnMessage,
    canDelete: isOwnMessage || isModerator,
    canPin: isModerator,
    canReact: userRole !== "guest",
    canReply: userRole !== "guest",
    canThread: userRole !== "guest",
    canBookmark: userRole !== "guest",
    canForward: userRole !== "guest",
    canReport: !isOwnMessage && userRole !== "guest",
    canCopy: true,
    canMarkUnread: userRole !== "guest",
  };
}
