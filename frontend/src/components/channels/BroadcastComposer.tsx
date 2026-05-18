/**
 * BroadcastComposer - Send broadcast message
 *
 * Compose and send messages to broadcast list with:
 * - Rich text editor
 * - Media attachments
 * - Schedule sending
 * - Silent mode (no notifications)
 * - Preview recipients
 * - Delivery tracking
 */

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Calendar,
  BellOff,
  X,
  Users,
  Eye,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  BroadcastList,
  SendBroadcastInput,
} from "@/types/advanced-channels";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BroadcastComposerProps {
  broadcastList: BroadcastList;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSend?: (data: BroadcastMessageData) => Promise<void>;
  className?: string;
}

export interface BroadcastMessageData extends SendBroadcastInput {
  silentMode?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function BroadcastComposer({
  broadcastList,
  open = false,
  onOpenChange,
  onSend,
  className,
}: BroadcastComposerProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [silentMode, setSilentMode] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<Date | undefined>();
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return;
    if (!onSend) return;

    setIsSending(true);
    try {
      await onSend({
        broadcastListId: broadcastList.id,
        content: content.trim(),
        attachments,
        scheduledFor: scheduledFor?.toISOString(),
        silentMode,
      });
      // Reset form
      setContent("");
      setAttachments([]);
      setSilentMode(false);
      setScheduledFor(undefined);
      onOpenChange?.(false);
    } catch (error) {
      logger.error("Failed to send broadcast:", error);
    } finally {
      setIsSending(false);
    }
  };

  const canSend = (content.trim() || attachments.length > 0) && !isSending;
  const estimatedDeliveryTime = Math.ceil(broadcastList.subscriberCount / 100); // ~100 msgs/sec

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-3xl", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Broadcast to {broadcastList.name}
          </DialogTitle>
          <DialogDescription>
            This message will be sent to {broadcastList.subscriberCount}{" "}
            {broadcastList.subscriberCount === 1 ? "subscriber" : "subscribers"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* List info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Broadcast Settings</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {showPreview ? "Hide" : "Show"} Details
                </Button>
              </div>
            </CardHeader>
            {showPreview && (
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subscribers</span>
                  <span className="font-medium">
                    {broadcastList.subscriberCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Delivery tracking
                  </span>
                  <Badge
                    variant={
                      broadcastList.trackDelivery ? "default" : "secondary"
                    }
                  >
                    {broadcastList.trackDelivery ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Read receipts</span>
                  <Badge
                    variant={broadcastList.trackReads ? "default" : "secondary"}
                  >
                    {broadcastList.trackReads ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Est. delivery time
                  </span>
                  <span className="font-medium">~{estimatedDeliveryTime}s</span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Message composer */}
          <div className="space-y-3">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your broadcast message..."
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">
                {content.length} / 4096 characters
              </span>
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments ({attachments.length})</Label>
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
            </div>
          )}

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <Label>Broadcast Options</Label>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Silent mode (no notifications)</span>
              </div>
              <Switch checked={silentMode} onCheckedChange={setSilentMode} />
            </div>

            {scheduledFor && (
              <div className="border-primary/50 bg-primary/10 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Scheduled for: {scheduledFor.toLocaleString()}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScheduledFor(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Attach file */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach media</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Schedule */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      // In production, open date/time picker
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setScheduledFor(tomorrow);
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Schedule broadcast</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Warning */}
          {broadcastList.subscriberCount > 100 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex gap-2">
                <Clock className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    Large broadcast
                  </p>
                  <p className="text-muted-foreground">
                    This broadcast will be sent to{" "}
                    {broadcastList.subscriberCount} subscribers and may take up
                    to {estimatedDeliveryTime} seconds to complete.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : scheduledFor ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Schedule Broadcast
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BroadcastComposer;
