/**
 * ChannelPostComposer - Telegram-style channel post composer
 *
 * Admin-only post composer for channels and gigagroups with:
 * - Rich text editor
 * - Media attachments
 * - Schedule posting
 * - Sign message with author name
 * - Disable comments
 * - Silent post (no notification)
 */

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Calendar,
  User,
  MessageSquareOff,
  BellOff,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Channel } from "@/types/advanced-channels";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface ChannelPostComposerProps {
  channel: Channel;
  onPost?: (post: PostData) => Promise<void>;
  onSchedulePost?: (post: PostData, scheduledFor: Date) => Promise<void>;
  className?: string;
}

export interface PostData {
  content: string;
  attachments: File[];
  signMessage: boolean;
  disableComments: boolean;
  silentPost: boolean;
  scheduledFor?: Date;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelPostComposer({
  channel,
  onPost,
  onSchedulePost,
  className,
}: ChannelPostComposerProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [signMessage, setSignMessage] = useState(true);
  const [disableComments, setDisableComments] = useState(false);
  const [silentPost, setSilentPost] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!content.trim() && attachments.length === 0) return;
    if (!onPost) return;

    setIsPosting(true);
    try {
      await onPost({
        content: content.trim(),
        attachments,
        signMessage,
        disableComments,
        silentPost,
      });
      // Reset form
      setContent("");
      setAttachments([]);
      setSignMessage(true);
      setDisableComments(false);
      setSilentPost(false);
    } catch (error) {
      logger.error("Failed to post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const canPost = (content.trim() || attachments.length > 0) && !isPosting;

  return (
    <div className={cn("border-t bg-background", className)}>
      <div className="p-4">
        {/* Post type indicator */}
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            Posting as Admin
          </Badge>
          {channel.subtype === "gigagroup" && (
            <Badge variant="secondary">Admin-only post</Badge>
          )}
        </div>

        {/* Text editor */}
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              channel.isReadonly
                ? "Write a channel post..."
                : "Write an announcement..."
            }
            rows={4}
            className="resize-none"
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Options */}
          <div className="bg-muted/30 space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sign-message" className="text-sm font-normal">
                  Sign message with author name
                </Label>
              </div>
              <Switch
                id="sign-message"
                checked={signMessage}
                onCheckedChange={setSignMessage}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareOff className="h-4 w-4 text-muted-foreground" />
                <Label
                  htmlFor="disable-comments"
                  className="text-sm font-normal"
                >
                  Disable comments
                </Label>
              </div>
              <Switch
                id="disable-comments"
                checked={disableComments}
                onCheckedChange={setDisableComments}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="silent-post" className="text-sm font-normal">
                  Send without notification (silent)
                </Label>
              </div>
              <Switch
                id="silent-post"
                checked={silentPost}
                onCheckedChange={setSilentPost}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Attach image */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach image</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Attach file */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach file</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Schedule post */}
              {onSchedulePost && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowScheduler(!showScheduler)}
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Schedule post</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Post button */}
            <Button onClick={handlePost} disabled={!canPost} className="gap-2">
              {isPosting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post
                </>
              )}
            </Button>
          </div>

          {/* Character count */}
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {content.length} / 4096 characters
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChannelPostComposer;
