"use client";

/**
 * Set Reminder Modal Component
 *
 * A comprehensive modal for creating and editing reminders.
 * Supports message reminders, custom reminders, recurring reminders,
 * and provides preset time options along with custom time selection.
 *
 * @example
 * ```tsx
 * <SetReminderModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   userId={currentUser.id}
 *   messageId={selectedMessage?.id}
 *   channelId={channelId}
 * />
 * ```
 */

import * as React from "react";
import {
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Hash,
  Loader2,
  MessageSquare,
  Repeat,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReminderTimePicker } from "./reminder-time-picker";
import { QuickRemindMenu } from "./quick-remind";
import {
  useReminderStore,
  type ReminderDraft,
  getUserTimezone,
  getDefaultReminderTime,
  formatFutureTime,
  getCommonTimezones,
} from "@/lib/reminders/reminder-store";
import { useReminders } from "@/lib/reminders/use-reminders";
import { formatMessageTime } from "@/lib/date";
import type { Reminder, RecurrenceRule } from "@/graphql/reminders";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface SetReminderModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userId: string;
  messageId?: string;
  channelId?: string;
  initialContent?: string;
  editingReminder?: Reminder | null;
  onSuccess?: (reminder: Reminder) => void;
  onCancel?: () => void;
}

type ReminderType = "message" | "custom" | "followup";

interface RecurrenceOption {
  value: RecurrenceRule["frequency"];
  label: string;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { value: "daily", label: "Daily", description: "Repeat every day" },
  { value: "weekly", label: "Weekly", description: "Repeat every week" },
  { value: "monthly", label: "Monthly", description: "Repeat every month" },
  { value: "yearly", label: "Yearly", description: "Repeat every year" },
];

// ============================================================================
// Sub-components
// ============================================================================

interface MessagePreviewProps {
  messageId: string;
  content?: string;
  author?: {
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  timestamp?: string;
}

function MessagePreview({ content, author, timestamp }: MessagePreviewProps) {
  if (!content) return null;

  return (
    <div className="bg-muted/50 rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Remind me about this message
        </span>
      </div>
      <div className="flex items-start gap-2">
        {author && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={author.avatar_url} />
            <AvatarFallback className="text-xs">
              {author.display_name?.[0] || author.username[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {author && (
              <span className="text-sm font-medium">
                {author.display_name || author.username}
              </span>
            )}
            {timestamp && (
              <span className="text-xs text-muted-foreground">
                {formatMessageTime(timestamp)}
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ReminderPreviewProps {
  draft: ReminderDraft;
  type: ReminderType;
}

function ReminderPreview({ draft, type }: ReminderPreviewProps) {
  const isPast = draft.remindAt < new Date();

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isPast ? "bg-destructive/5 border-destructive" : "bg-muted/50",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isPast ? "bg-destructive/10" : "bg-primary/10",
          )}
        >
          <Bell
            className={cn(
              "h-5 w-5",
              isPast ? "text-destructive" : "text-primary",
            )}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 font-medium">
            {draft.content || "No content"}
          </p>
          {draft.note && (
            <p className="line-clamp-1 text-sm text-muted-foreground">
              Note: {draft.note}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge
              variant={isPast ? "destructive" : "secondary"}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              {formatFutureTime(draft.remindAt)}
            </Badge>
            {draft.isRecurring && (
              <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                Recurring
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              {type === "message" ? (
                <MessageSquare className="h-3 w-3" />
              ) : (
                <Bell className="h-3 w-3" />
              )}
              {type === "message" ? "Message" : "Custom"}
            </Badge>
          </div>
        </div>
      </div>
      {isPast && (
        <p className="mt-3 text-sm text-destructive">
          The selected time is in the past. Please choose a future time.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SetReminderModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  userId,
  messageId,
  channelId,
  initialContent,
  editingReminder,
  onSuccess,
  onCancel,
}: SetReminderModalProps) {
  // Store state (for uncontrolled usage)
  const {
    isModalOpen,
    draft,
    editingReminder: storeEditingReminder,
    closeModal,
    setDraft,
    updateDraft,
  } = useReminderStore();

  // Determine if controlled or uncontrolled
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : isModalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange : closeModal;
  const editing = editingReminder ?? storeEditingReminder;

  // API hooks
  const { createReminder, updateReminder, isCreating, isUpdating } =
    useReminders({ userId });

  // Local state
  const [activeTab, setActiveTab] = React.useState<"quick" | "custom">("quick");
  const [reminderType, setReminderType] = React.useState<ReminderType>(
    messageId ? "message" : "custom",
  );
  const [showRecurrence, setShowRecurrence] = React.useState(false);

  // Initialize draft when modal opens
  React.useEffect(() => {
    if (open && !draft) {
      const initialDraft: ReminderDraft = {
        messageId: messageId,
        channelId: channelId,
        content: initialContent || (messageId ? "Reminder for message" : ""),
        remindAt: getDefaultReminderTime(),
        timezone: getUserTimezone(),
        type: messageId ? "message" : "custom",
        isRecurring: false,
      };
      setDraft(initialDraft);
    }
  }, [open, draft, messageId, channelId, initialContent, setDraft]);

  // Initialize from editing reminder
  React.useEffect(() => {
    if (editing) {
      setDraft({
        messageId: editing.message_id,
        channelId: editing.channel_id,
        content: editing.content,
        note: editing.note,
        remindAt: new Date(editing.remind_at),
        timezone: editing.timezone,
        type: editing.type as ReminderType,
        isRecurring: editing.is_recurring,
        recurrenceRule: editing.recurrence_rule,
      });
      setReminderType(editing.type as ReminderType);
      setShowRecurrence(editing.is_recurring);
      setActiveTab("custom");
    }
  }, [editing, setDraft]);

  // Handle quick time selection
  const handleQuickSelect = React.useCallback(
    (date: Date) => {
      updateDraft({ remindAt: date });
      setActiveTab("custom"); // Show preview
    },
    [updateDraft],
  );

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!draft) return;

      // Validate
      if (!draft.content.trim()) {
        return;
      }

      if (draft.remindAt < new Date()) {
        return;
      }

      try {
        let result: Reminder | null = null;

        if (editing) {
          result = await updateReminder(editing.id, draft);
        } else {
          result = await createReminder(draft);
        }

        if (result) {
          onSuccess?.(result);
          onOpenChange?.(false);
        }
      } catch (error) {
        // Error is handled by the hook
        logger.error("Failed to save reminder:", error);
      }
    },
    [draft, editing, createReminder, updateReminder, onSuccess, onOpenChange],
  );

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    onCancel?.();
    onOpenChange?.(false);
  }, [onCancel, onOpenChange]);

  // Current draft or default
  const currentDraft = draft || {
    content: "",
    remindAt: getDefaultReminderTime(),
    timezone: getUserTimezone(),
    type: "custom" as ReminderType,
    isRecurring: false,
  };

  const isValid =
    currentDraft.content.trim() && currentDraft.remindAt > new Date();
  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {editing ? "Edit Reminder" : "Set Reminder"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update your reminder details"
              : "Choose when you want to be reminded"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Message Preview (for message reminders) */}
          {messageId && (
            <MessagePreview messageId={messageId} content={initialContent} />
          )}

          {/* Reminder Type Selection */}
          {!messageId && (
            <div className="space-y-2">
              <Label>Reminder Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={reminderType === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setReminderType("custom");
                    updateDraft({ type: "custom" });
                  }}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Custom
                </Button>
                <Button
                  type="button"
                  variant={reminderType === "followup" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setReminderType("followup");
                    updateDraft({ type: "followup" });
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Follow-up
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="reminder-content">
              {messageId
                ? "Reminder Note (optional)"
                : "What do you want to remember?"}
            </Label>
            <Textarea
              id="reminder-content"
              placeholder={
                messageId
                  ? "Add a note to this reminder..."
                  : "Enter your reminder..."
              }
              value={currentDraft.content}
              onChange={(e) => updateDraft({ content: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Note (additional) */}
          {messageId && (
            <div className="space-y-2">
              <Label htmlFor="reminder-note">Additional Note</Label>
              <Input
                id="reminder-note"
                placeholder="Add context or details..."
                value={currentDraft.note || ""}
                onChange={(e) => updateDraft({ note: e.target.value })}
              />
            </div>
          )}

          {/* Time Selection */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "quick" | "custom")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Select</TabsTrigger>
              <TabsTrigger value="custom">Custom Time</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="mt-4">
              <QuickRemindMenu
                onSelect={handleQuickSelect}
                onCustom={() => setActiveTab("custom")}
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-4 space-y-4">
              <ReminderTimePicker
                value={currentDraft.remindAt}
                onChange={(date) => updateDraft({ remindAt: date })}
                timezone={currentDraft.timezone}
                onTimezoneChange={(tz) => updateDraft({ timezone: tz })}
              />
            </TabsContent>
          </Tabs>

          {/* Recurring Option */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recurring-switch" className="cursor-pointer">
                  Recurring Reminder
                </Label>
                <p className="text-xs text-muted-foreground">
                  Repeat this reminder on a schedule
                </p>
              </div>
              <Switch
                id="recurring-switch"
                checked={showRecurrence}
                onCheckedChange={(checked) => {
                  setShowRecurrence(checked);
                  updateDraft({ isRecurring: checked });
                }}
              />
            </div>

            {showRecurrence && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <Select
                    value={currentDraft.recurrenceRule?.frequency || "daily"}
                    onValueChange={(value) =>
                      updateDraft({
                        recurrenceRule: {
                          ...currentDraft.recurrenceRule,
                          frequency: value as RecurrenceRule["frequency"],
                          interval: currentDraft.recurrenceRule?.interval || 1,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <span>{option.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Every</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="interval"
                      type="number"
                      min={1}
                      max={99}
                      value={currentDraft.recurrenceRule?.interval || 1}
                      onChange={(e) =>
                        updateDraft({
                          recurrenceRule: {
                            ...currentDraft.recurrenceRule,
                            frequency:
                              currentDraft.recurrenceRule?.frequency || "daily",
                            interval: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      {currentDraft.recurrenceRule?.frequency === "daily"
                        ? "day(s)"
                        : currentDraft.recurrenceRule?.frequency === "weekly"
                          ? "week(s)"
                          : currentDraft.recurrenceRule?.frequency === "monthly"
                            ? "month(s)"
                            : "year(s)"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <ReminderPreview draft={currentDraft} type={reminderType} />
          </div>

          {/* Actions */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editing ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editing ? "Save Changes" : "Set Reminder"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SetReminderModal;
