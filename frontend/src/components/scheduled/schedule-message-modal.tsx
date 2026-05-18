"use client";

/**
 * Schedule Message Modal Component
 *
 * A dialog for scheduling messages with date/time picker,
 * quick options, timezone display, and message preview.
 *
 * @example
 * ```tsx
 * <ScheduleMessageModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   channelId="channel-123"
 *   channelName="general"
 *   initialContent="Hello!"
 *   onSchedule={handleSchedule}
 * />
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Send,
  Loader2,
  Hash,
  Lock,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SchedulePicker } from "./schedule-picker";
import { ScheduleQuickOptions } from "./schedule-quick-options";
import {
  getUserTimezone,
  getDefaultScheduledTime,
  isScheduledInPast,
} from "@/lib/scheduled/scheduled-store";
import type { ScheduledMessage } from "@/graphql/scheduled";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface ScheduleMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
  isPrivate?: boolean;
  initialContent?: string;
  editingMessage?: ScheduledMessage | null;
  onSchedule: (data: {
    content: string;
    scheduledAt: Date;
    timezone: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ScheduleMessageModal({
  open,
  onOpenChange,
  channelId,
  channelName,
  isPrivate = false,
  initialContent = "",
  editingMessage,
  onSchedule,
  isLoading = false,
}: ScheduleMessageModalProps) {
  // Form state
  const [content, setContent] = useState(initialContent);
  const [scheduledAt, setScheduledAt] = useState<Date>(() =>
    editingMessage
      ? new Date(editingMessage.scheduled_at)
      : getDefaultScheduledTime(),
  );
  const [timezone, setTimezone] = useState<string>(
    () => editingMessage?.timezone || getUserTimezone(),
  );
  const [activeTab, setActiveTab] = useState<"quick" | "custom">("quick");
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (editingMessage) {
        setContent(editingMessage.content);
        setScheduledAt(new Date(editingMessage.scheduled_at));
        setTimezone(editingMessage.timezone);
        setActiveTab("custom");
        setSelectedQuickOption(null);
      } else {
        setContent(initialContent);
        setScheduledAt(getDefaultScheduledTime());
        setTimezone(getUserTimezone());
        setActiveTab("quick");
        setSelectedQuickOption(null);
      }
    }
  }, [open, editingMessage, initialContent]);

  // Validation
  const isContentValid = content.trim().length > 0;
  const isTimeValid = !isScheduledInPast(scheduledAt);
  const isValid = isContentValid && isTimeValid;

  // Error messages
  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!isContentValid && content.length > 0) {
      errs.push("Message cannot be empty");
    }
    if (!isTimeValid) {
      errs.push("Scheduled time must be in the future");
    }
    return errs;
  }, [isContentValid, isTimeValid, content]);

  // Handlers
  const handleQuickOptionSelect = useCallback(
    (date: Date, optionId: string) => {
      setScheduledAt(date);
      setSelectedQuickOption(optionId);
    },
    [],
  );

  const handleCustomClick = useCallback(() => {
    setActiveTab("custom");
    setSelectedQuickOption("custom");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      await onSchedule({
        content: content.trim(),
        scheduledAt,
        timezone,
      });
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to schedule message:", error);
    } finally {
      setSubmitting(false);
    }
  }, [
    isValid,
    submitting,
    content,
    scheduledAt,
    timezone,
    onSchedule,
    onOpenChange,
  ]);

  // Preview formatted time
  const previewTime = useMemo(() => {
    return scheduledAt.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });
  }, [scheduledAt, timezone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            {editingMessage ? "Edit Scheduled Message" : "Schedule Message"}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            Schedule a message to{" "}
            <Badge variant="secondary" className="gap-1">
              {isPrivate ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
              {channelName}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="-mx-6 flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Message Content */}
            <div className="space-y-2">
              <Label htmlFor="message-content">Message</Label>
              <Textarea
                id="message-content"
                placeholder="Type your message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                disabled={isLoading || submitting}
                className={cn(
                  "resize-none",
                  !isContentValid && content.length > 0 && "border-destructive",
                )}
              />
              <p className="text-xs text-muted-foreground">
                {content.length} characters
              </p>
            </div>

            {/* Schedule Time Selection */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "quick" | "custom")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Quick Options
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Custom
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="mt-4">
                <ScheduleQuickOptions
                  onSelect={handleQuickOptionSelect}
                  timezone={timezone}
                  onCustomClick={handleCustomClick}
                  selectedOption={selectedQuickOption}
                  disabled={isLoading || submitting}
                />
              </TabsContent>

              <TabsContent value="custom" className="mt-4">
                <SchedulePicker
                  value={scheduledAt}
                  onChange={setScheduledAt}
                  timezone={timezone}
                  onTimezoneChange={setTimezone}
                  minDate={new Date()}
                  disabled={isLoading || submitting}
                />
              </TabsContent>
            </Tabs>

            {/* Preview Section */}
            <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
              <h4 className="text-sm font-medium">Preview</h4>
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Scheduled for:</p>
                  <p className="text-sm text-muted-foreground">{previewTime}</p>
                </div>
              </div>
              {content && (
                <div className="mt-3 rounded-md border bg-background p-3">
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {content}
                  </p>
                </div>
              )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div className="flex-1">
                    {errors.map((error, index) => (
                      <p key={index} className="text-sm text-destructive">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {editingMessage ? "Update Schedule" : "Schedule Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleMessageModal;
