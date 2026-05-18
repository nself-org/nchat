/**
 * Message Input with Drafts Component
 *
 * Production-ready message input with auto-save drafts and scheduling support.
 * This is an example implementation showing how to integrate drafts and scheduling.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Clock, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDrafts } from "@/hooks/use-drafts";
import { useMessageMutations } from "@/hooks/use-messages";
import { ScheduleMessageModal } from "./ScheduleMessageModal";
import { logger } from "@/lib/logger";

interface MessageInputWithDraftsProps {
  channelId: string;
  replyToId?: string;
  threadId?: string;
  placeholder?: string;
  onMessageSent?: () => void;
  className?: string;
}

export function MessageInputWithDrafts({
  channelId,
  replyToId,
  threadId,
  placeholder = "Type a message...",
  onMessageSent,
  className,
}: MessageInputWithDraftsProps) {
  const {
    draftContent,
    hasDraft,
    draftUpdatedAt,
    updateDraft,
    clearDraft,
    restoreDraft,
  } = useDrafts({
    channelId,
    replyToId,
    threadId,
    onDraftRestored: (draft) => {
      logger.debug("Draft restored in MessageInput", { draftId: draft.id });
    },
  });

  const { sendMessage, sendingMessage } = useMessageMutations();

  const [content, setContent] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [showDraftIndicator, setShowDraftIndicator] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore draft on mount
  useEffect(() => {
    if (hasDraft && draftContent) {
      setContent(draftContent);
      setShowDraftIndicator(true);
    }
  }, [hasDraft, draftContent]);

  // Auto-save draft as user types
  useEffect(() => {
    if (content !== draftContent) {
      updateDraft(content);
    }
  }, [content, draftContent, updateDraft]);

  /**
   * Handle send message
   */
  const handleSend = async () => {
    if (!content.trim() || sendingMessage) return;

    try {
      await sendMessage({
        channelId,
        content: content.trim(),
        replyToId,
        threadId,
      });

      // Clear input and draft
      setContent("");
      clearDraft();
      setShowDraftIndicator(false);

      // Callback
      onMessageSent?.();

      logger.info("Message sent successfully", { channelId });
    } catch (error) {
      logger.error("Failed to send message", error as Error, { channelId });
    }
  };

  /**
   * Handle schedule message
   */
  const handleSchedule = () => {
    setIsScheduleModalOpen(true);
  };

  /**
   * Handle scheduled message created
   */
  const handleMessageScheduled = () => {
    // Clear input and draft after scheduling
    setContent("");
    clearDraft();
    setShowDraftIndicator(false);
  };

  /**
   * Handle clear draft
   */
  const handleClearDraft = () => {
    setContent("");
    clearDraft();
    setShowDraftIndicator(false);
  };

  /**
   * Handle key press
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Auto-resize textarea
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [content]);

  return (
    <div className={cn("relative", className)}>
      {/* Draft Indicator */}
      {showDraftIndicator && hasDraft && (
        <div className="bg-muted/50 absolute -top-8 left-0 right-0 flex items-center justify-between rounded-t-lg px-2 py-1 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              Draft saved{" "}
              {draftUpdatedAt && (
                <span className="text-xs">
                  {new Date(draftUpdatedAt).toLocaleTimeString()}
                </span>
              )}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClearDraft}
            className="h-5 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2 rounded-lg border bg-background p-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="max-h-[200px] min-h-[40px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={sendingMessage}
        />

        <div className="flex items-center gap-1 pb-1">
          {/* Schedule Button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleSchedule}
            disabled={!content.trim() || sendingMessage}
            title="Schedule message"
          >
            <Clock className="h-4 w-4" />
          </Button>

          {/* Send Button */}
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!content.trim() || sendingMessage}
            title="Send message (Enter)"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Character Count */}
      <div className="mt-1 flex items-center justify-between px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {replyToId && (
            <Badge variant="secondary" className="text-xs">
              Replying
            </Badge>
          )}
          {threadId && (
            <Badge variant="secondary" className="text-xs">
              Thread
            </Badge>
          )}
        </div>
        <span className={cn(content.length > 3800 && "text-orange-600")}>
          {content.length}/4000
        </span>
      </div>

      {/* Schedule Modal */}
      <ScheduleMessageModal
        channelId={channelId}
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        defaultContent={content}
        replyToId={replyToId}
        threadId={threadId}
        onMessageScheduled={handleMessageScheduled}
      />
    </div>
  );
}
