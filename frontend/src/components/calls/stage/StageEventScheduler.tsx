/**
 * Stage Event Scheduler Component
 *
 * Component for scheduling future stage events with reminders,
 * recurrence patterns, and speaker invitations.
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Calendar,
  Clock,
  Users,
  Bell,
  Repeat,
  Image,
  Plus,
  Trash2,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  CreateStageEventInput,
  StageEvent,
  StageRecurrencePattern,
} from "@/types/stage";
import type { UserBasicInfo } from "@/types/user";

// =============================================================================
// Types
// =============================================================================

export interface StageEventSchedulerProps {
  stageId: string;
  stageName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (input: CreateStageEventInput) => Promise<StageEvent>;
  availableSpeakers?: UserBasicInfo[];
  className?: string;
}

interface FormState {
  name: string;
  description: string;
  coverImageUrl: string;
  scheduledStart: string;
  scheduledStartTime: string;
  scheduledEnd: string;
  scheduledEndTime: string;
  coHostIds: string[];
  invitedSpeakerIds: string[];
  sendReminders: boolean;
  reminderMinutesBefore: number[];
  isRecurring: boolean;
  recurrenceType: "daily" | "weekly" | "biweekly" | "monthly";
  recurrenceDaysOfWeek: number[];
  recurrenceEndDate: string;
}

// =============================================================================
// Constants
// =============================================================================

const REMINDER_OPTIONS = [
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getDefaultDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function getDefaultTime(): string {
  return "18:00";
}

// =============================================================================
// Main Component
// =============================================================================

export function StageEventScheduler({
  stageId,
  stageName,
  open,
  onOpenChange,
  onSchedule,
  availableSpeakers = [],
  className,
}: StageEventSchedulerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    coverImageUrl: "",
    scheduledStart: getDefaultDate(),
    scheduledStartTime: getDefaultTime(),
    scheduledEnd: "",
    scheduledEndTime: "",
    coHostIds: [],
    invitedSpeakerIds: [],
    sendReminders: true,
    reminderMinutesBefore: [15, 60],
    isRecurring: false,
    recurrenceType: "weekly",
    recurrenceDaysOfWeek: [],
    recurrenceEndDate: "",
  });

  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleReminder = useCallback((minutes: number) => {
    setForm((prev) => ({
      ...prev,
      reminderMinutesBefore: prev.reminderMinutesBefore.includes(minutes)
        ? prev.reminderMinutesBefore.filter((m) => m !== minutes)
        : [...prev.reminderMinutesBefore, minutes],
    }));
  }, []);

  const toggleDayOfWeek = useCallback((day: number) => {
    setForm((prev) => ({
      ...prev,
      recurrenceDaysOfWeek: prev.recurrenceDaysOfWeek.includes(day)
        ? prev.recurrenceDaysOfWeek.filter((d) => d !== day)
        : [...prev.recurrenceDaysOfWeek, day],
    }));
  }, []);

  const addSpeaker = useCallback(
    (userId: string) => {
      if (!form.invitedSpeakerIds.includes(userId)) {
        updateForm({ invitedSpeakerIds: [...form.invitedSpeakerIds, userId] });
      }
    },
    [form.invitedSpeakerIds, updateForm],
  );

  const removeSpeaker = useCallback(
    (userId: string) => {
      updateForm({
        invitedSpeakerIds: form.invitedSpeakerIds.filter((id) => id !== userId),
      });
    },
    [form.invitedSpeakerIds, updateForm],
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Event name is required");
      return;
    }

    if (!form.scheduledStart || !form.scheduledStartTime) {
      setError("Start date and time are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledStart = new Date(
        `${form.scheduledStart}T${form.scheduledStartTime}`,
      );
      let scheduledEnd: Date | undefined;
      if (form.scheduledEnd && form.scheduledEndTime) {
        scheduledEnd = new Date(
          `${form.scheduledEnd}T${form.scheduledEndTime}`,
        );
      }

      let recurrencePattern: StageRecurrencePattern | undefined;
      if (form.isRecurring) {
        recurrencePattern = {
          type: form.recurrenceType,
          daysOfWeek:
            form.recurrenceType === "weekly" ||
            form.recurrenceType === "biweekly"
              ? form.recurrenceDaysOfWeek
              : undefined,
          timeOfDay: form.scheduledStartTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          endDate: form.recurrenceEndDate
            ? new Date(form.recurrenceEndDate)
            : undefined,
        };
      }

      const input: CreateStageEventInput = {
        stageId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        scheduledStart,
        scheduledEnd,
        invitedSpeakerIds:
          form.invitedSpeakerIds.length > 0
            ? form.invitedSpeakerIds
            : undefined,
        coHostIds: form.coHostIds.length > 0 ? form.coHostIds : undefined,
        sendReminders: form.sendReminders,
        reminderMinutesBefore: form.reminderMinutesBefore,
        isRecurring: form.isRecurring,
        recurrencePattern,
      };

      await onSchedule(input);
      onOpenChange(false);

      // Reset form
      setForm({
        name: "",
        description: "",
        coverImageUrl: "",
        scheduledStart: getDefaultDate(),
        scheduledStartTime: getDefaultTime(),
        scheduledEnd: "",
        scheduledEndTime: "",
        coHostIds: [],
        invitedSpeakerIds: [],
        sendReminders: true,
        reminderMinutesBefore: [15, 60],
        isRecurring: false,
        recurrenceType: "weekly",
        recurrenceDaysOfWeek: [],
        recurrenceEndDate: "",
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSpeakers = availableSpeakers.filter((s) =>
    form.invitedSpeakerIds.includes(s.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle>Schedule Stage Event</DialogTitle>
          <DialogDescription>
            Schedule a future event for "{stageName}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="event-name">Event Name *</Label>
              <Input
                id="event-name"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="Weekly Community Hangout"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="What will this event be about?"
                rows={3}
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label htmlFor="cover-image">Cover Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="cover-image"
                  value={form.coverImageUrl}
                  onChange={(e) =>
                    updateForm({ coverImageUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
                <Button variant="outline" size="icon">
                  <Image className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.scheduledStart}
                    onChange={(e) =>
                      updateForm({ scheduledStart: e.target.value })
                    }
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <Input
                    type="time"
                    value={form.scheduledStartTime}
                    onChange={(e) =>
                      updateForm({ scheduledStartTime: e.target.value })
                    }
                    className="w-28"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.scheduledEnd}
                    onChange={(e) =>
                      updateForm({ scheduledEnd: e.target.value })
                    }
                    min={form.scheduledStart}
                  />
                  <Input
                    type="time"
                    value={form.scheduledEndTime}
                    onChange={(e) =>
                      updateForm({ scheduledEndTime: e.target.value })
                    }
                    className="w-28"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Invited Speakers */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Invite Speakers
              </Label>

              {selectedSpeakers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedSpeakers.map((speaker) => (
                    <Badge
                      key={speaker.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={speaker.avatarUrl} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(speaker.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{speaker.displayName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 ml-1 hover:bg-destructive/20"
                        onClick={() => removeSpeaker(speaker.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add Speaker
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found</CommandEmpty>
                      <CommandGroup>
                        {availableSpeakers
                          .filter((s) => !form.invitedSpeakerIds.includes(s.id))
                          .map((speaker) => (
                            <CommandItem
                              key={speaker.id}
                              value={speaker.displayName}
                              onSelect={() => addSpeaker(speaker.id)}
                              className="gap-2"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={speaker.avatarUrl} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(speaker.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              {speaker.displayName}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            {/* Reminders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Send Reminders
                </Label>
                <Switch
                  checked={form.sendReminders}
                  onCheckedChange={(checked) =>
                    updateForm({ sendReminders: checked })
                  }
                />
              </div>

              {form.sendReminders && (
                <div className="flex flex-wrap gap-2">
                  {REMINDER_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={
                        form.reminderMinutesBefore.includes(option.value)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleReminder(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Recurrence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Recurring Event
                </Label>
                <Switch
                  checked={form.isRecurring}
                  onCheckedChange={(checked) =>
                    updateForm({ isRecurring: checked })
                  }
                />
              </div>

              {form.isRecurring && (
                <div className="space-y-3">
                  <Select
                    value={form.recurrenceType}
                    onValueChange={(
                      value: "daily" | "weekly" | "biweekly" | "monthly",
                    ) => updateForm({ recurrenceType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>

                  {(form.recurrenceType === "weekly" ||
                    form.recurrenceType === "biweekly") && (
                    <div className="flex flex-wrap gap-1">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          variant={
                            form.recurrenceDaysOfWeek.includes(day.value)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className="w-10"
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>End Recurrence (Optional)</Label>
                    <Input
                      type="date"
                      value={form.recurrenceEndDate}
                      onChange={(e) =>
                        updateForm({ recurrenceEndDate: e.target.value })
                      }
                      min={form.scheduledStart}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <CalendarDays className="mr-2 h-4 w-4 animate-pulse" />
                Scheduling...
              </>
            ) : (
              <>
                <CalendarDays className="mr-2 h-4 w-4" />
                Schedule Event
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StageEventScheduler;
