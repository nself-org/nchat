/**
 * Schedule Message Modal Component
 *
 * Production-ready modal for scheduling messages with date/time picker,
 * quick schedules, timezone handling, and complete validation.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Calendar,
  Clock,
  Send,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  format,
  addMinutes,
  addHours,
  addDays,
  startOfTomorrow,
  set,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useScheduledMessagesStore } from "@/lib/messages/scheduled-messages";
import {
  validateScheduledTime,
  validateMessageContent,
  formatScheduledTime,
  getRelativeTime,
  type CreateScheduledMessageOptions,
} from "@/lib/messages/scheduled-messages";
import { logger } from "@/lib/logger";

interface ScheduleMessageModalProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultContent?: string;
  replyToId?: string;
  threadId?: string;
  onMessageScheduled?: (messageId: string) => void;
}

const QUICK_SCHEDULES = [
  { label: "30 minutes", getValue: () => addMinutes(new Date(), 30) },
  { label: "1 hour", getValue: () => addHours(new Date(), 1) },
  { label: "2 hours", getValue: () => addHours(new Date(), 2) },
  { label: "4 hours", getValue: () => addHours(new Date(), 4) },
  {
    label: "Tomorrow 9 AM",
    getValue: () => set(startOfTomorrow(), { hours: 9, minutes: 0 }),
  },
  {
    label: "Tomorrow 2 PM",
    getValue: () => set(startOfTomorrow(), { hours: 14, minutes: 0 }),
  },
  { label: "1 week", getValue: () => addDays(new Date(), 7) },
];

export function ScheduleMessageModal({
  channelId,
  isOpen,
  onClose,
  defaultContent = "",
  replyToId,
  threadId,
  onMessageScheduled,
}: ScheduleMessageModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const addMessage = useScheduledMessagesStore((state) => state.addMessage);

  const [content, setContent] = useState(defaultContent);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [customDateTime, setCustomDateTime] = useState<Date | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<"quick" | "custom">("quick");
  const [selectedQuickSchedule, setSelectedQuickSchedule] = useState<
    number | null
  >(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent(defaultContent);
      setScheduledDate("");
      setScheduledTime("");
      setCustomDateTime(null);
      setErrors([]);
      setSelectedTab("quick");
      setSelectedQuickSchedule(null);
    }
  }, [isOpen, defaultContent]);

  // Calculate minimum date/time (5 minutes from now)
  const minDateTime = addMinutes(new Date(), 5);
  const minDate = format(minDateTime, "yyyy-MM-dd");
  const minTime = format(minDateTime, "HH:mm");

  /**
   * Handle quick schedule selection
   */
  const handleQuickSchedule = useCallback(
    (index: number, getDate: () => Date) => {
      const date = getDate();
      setCustomDateTime(date);
      setScheduledDate(format(date, "yyyy-MM-dd"));
      setScheduledTime(format(date, "HH:mm"));
      setSelectedQuickSchedule(index);
      setErrors([]);

      logger.debug("Quick schedule selected", {
        index,
        scheduledAt: date.toISOString(),
      });
    },
    [],
  );

  /**
   * Handle custom date/time change
   */
  const handleCustomDateTime = useCallback(() => {
    if (!scheduledDate || !scheduledTime) return;

    try {
      const [year, month, day] = scheduledDate.split("-").map(Number);
      const [hours, minutes] = scheduledTime.split(":").map(Number);

      const date = new Date(year, month - 1, day, hours, minutes);
      setCustomDateTime(date);
      setSelectedQuickSchedule(null);
      setErrors([]);

      logger.debug("Custom schedule set", {
        scheduledAt: date.toISOString(),
      });
    } catch (error) {
      logger.error("Invalid date/time format", error as Error);
      setErrors(["Invalid date or time format"]);
    }
  }, [scheduledDate, scheduledTime]);

  useEffect(() => {
    if (scheduledDate && scheduledTime) {
      handleCustomDateTime();
    }
  }, [scheduledDate, scheduledTime, handleCustomDateTime]);

  /**
   * Handle schedule button click
   */
  const handleSchedule = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to schedule messages.",
        variant: "destructive",
      });
      return;
    }

    const validationErrors: string[] = [];

    // Validate content
    const contentValidation = validateMessageContent(content);
    if (!contentValidation.valid) {
      validationErrors.push(contentValidation.error!);
    }

    // Validate scheduled time
    if (!customDateTime) {
      validationErrors.push("Please select a date and time");
    } else {
      const timeValidation = validateScheduledTime(customDateTime);
      if (!timeValidation.valid) {
        validationErrors.push(timeValidation.error!);
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsScheduling(true);

    try {
      const scheduledMessage = addMessage({
        channelId,
        content: content.trim(),
        scheduledAt: customDateTime!,
        userId: user.id,
        replyToId,
        threadId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      logger.info("Message scheduled successfully", {
        id: scheduledMessage.id,
        channelId,
        scheduledAt: scheduledMessage.scheduledAt,
      });

      toast({
        title: "Message scheduled",
        description: (
          <div className="flex flex-col gap-1">
            <p>
              Your message will be sent{" "}
              {getRelativeTime(scheduledMessage.scheduledAt)} from now.
            </p>
            <p className="text-xs text-muted-foreground">
              {formatScheduledTime(scheduledMessage.scheduledAt)}
            </p>
          </div>
        ),
      });

      onMessageScheduled?.(scheduledMessage.id);
      handleClose();
    } catch (error) {
      logger.error("Failed to schedule message", error as Error, {
        channelId,
        userId: user.id,
      });

      setErrors([
        error instanceof Error ? error.message : "Failed to schedule message",
      ]);
      toast({
        title: "Schedule failed",
        description: "Could not schedule your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  }, [
    user?.id,
    content,
    customDateTime,
    channelId,
    replyToId,
    threadId,
    addMessage,
    toast,
    onMessageScheduled,
  ]);

  /**
   * Reset form state
   */
  const handleReset = useCallback(() => {
    setContent(defaultContent);
    setScheduledDate("");
    setScheduledTime("");
    setCustomDateTime(null);
    setErrors([]);
    setSelectedTab("quick");
    setSelectedQuickSchedule(null);
  }, [defaultContent]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Message</DialogTitle>
          <DialogDescription>
            Choose when to send your message
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message Content */}
          <div className="space-y-2">
            <Label htmlFor="message-content">Message *</Label>
            <Textarea
              id="message-content"
              placeholder="Type your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={4000}
              className="resize-none"
              disabled={isScheduling}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{content.length}/4000 characters</span>
              <div className="flex gap-2">
                {replyToId && (
                  <Badge variant="secondary" className="text-xs">
                    Replying to message
                  </Badge>
                )}
                {threadId && (
                  <Badge variant="secondary" className="text-xs">
                    In thread
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule Time Selection */}
          <Tabs
            value={selectedTab}
            onValueChange={(v) => setSelectedTab(v as "quick" | "custom")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Select</TabsTrigger>
              <TabsTrigger value="custom">Custom Date & Time</TabsTrigger>
            </TabsList>

            {/* Quick Schedule */}
            <TabsContent value="quick" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SCHEDULES.map((schedule, index) => {
                  const date = schedule.getValue();
                  const isSelected = selectedQuickSchedule === index;

                  return (
                    <Button
                      key={schedule.label}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() =>
                        handleQuickSchedule(index, schedule.getValue)
                      }
                      disabled={isScheduling}
                      className="flex h-auto flex-col items-start py-3"
                    >
                      <span className="font-semibold">{schedule.label}</span>
                      <span className="text-xs opacity-80">
                        {format(date, "MMM d, h:mm a")}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            {/* Custom Date & Time */}
            <TabsContent value="custom" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-date">
                    <Calendar className="mr-2 inline h-4 w-4" />
                    Date
                  </Label>
                  <Input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={minDate}
                    disabled={isScheduling}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-time">
                    <Clock className="mr-2 inline h-4 w-4" />
                    Time
                  </Label>
                  <Input
                    id="schedule-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={scheduledDate === minDate ? minTime : undefined}
                    disabled={isScheduling}
                  />
                </div>
              </div>

              {customDateTime && (
                <div className="rounded-md bg-muted p-3">
                  <p className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Scheduled for:</span>{" "}
                    <span className="text-muted-foreground">
                      {formatScheduledTime(customDateTime.getTime())}
                    </span>
                  </p>
                  <p className="ml-6 mt-1 text-xs text-muted-foreground">
                    {getRelativeTime(customDateTime.getTime())} from now
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Preview */}
          {customDateTime && content && (
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="mb-2 flex items-start gap-2">
                <Send className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Scheduled for {format(customDateTime, "MMM d, yyyy")} at{" "}
                    {format(customDateTime, "h:mm a")}
                  </p>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                    {content}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="border-destructive/50 bg-destructive/10 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <ul className="flex-1 space-y-1 text-sm text-destructive">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isScheduling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isScheduling || !content.trim() || !customDateTime}
          >
            <Clock className="mr-2 h-4 w-4" />
            {isScheduling ? "Scheduling..." : "Schedule Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
