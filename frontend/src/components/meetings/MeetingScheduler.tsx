"use client";

/**
 * MeetingScheduler - Modal for scheduling new meetings
 *
 * Provides a form to create or edit scheduled meetings with all options
 */

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeetingTimePicker } from "./MeetingTimePicker";
import { MeetingParticipants } from "./MeetingParticipants";
import { MeetingReminders } from "./MeetingReminders";
import {
  CreateMeetingInput,
  RoomType,
  RecurrencePattern,
  ReminderTiming,
} from "@/lib/meetings/meeting-types";
import {
  DEFAULT_MEETING_SETTINGS,
  getDurationOptions,
  validateMeetingInput,
  getNextAvailableSlot,
} from "@/lib/meetings";
import { useMeetingStore } from "@/stores/meeting-store";
import {
  Video,
  Phone,
  Monitor,
  Calendar,
  Users,
  Bell,
  Settings,
  Loader2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface MeetingSchedulerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editingMeetingId?: string | null;
  channelId?: string;
  onSubmit?: (input: CreateMeetingInput) => Promise<void>;
}

interface FormState {
  title: string;
  description: string;
  roomType: RoomType;
  date: Date;
  startTime: string;
  duration: number;
  timezone: string;
  isPrivate: boolean;
  password: string;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number;
  participantIds: string[];
  reminderTimings: ReminderTiming[];
  muteOnJoin: boolean;
  videoOffOnJoin: boolean;
  allowScreenShare: boolean;
  waitingRoom: boolean;
  enableChat: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ROOM_TYPES: Array<{
  value: RoomType;
  label: string;
  icon: typeof Video;
}> = [
  { value: "video", label: "Video Call", icon: Video },
  { value: "audio", label: "Audio Call", icon: Phone },
  { value: "screenshare", label: "Screen Share", icon: Monitor },
];

const RECURRENCE_OPTIONS: Array<{ value: RecurrencePattern; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

// ============================================================================
// Component
// ============================================================================

export function MeetingScheduler({
  open,
  onOpenChange,
  editingMeetingId,
  channelId,
  onSubmit,
}: MeetingSchedulerProps) {
  const store = useMeetingStore();
  const isOpen = open ?? store.isSchedulerOpen;
  const editingId = editingMeetingId ?? store.editingMeetingId;
  const editingMeeting = editingId
    ? store.getMeetingById(editingId)
    : undefined;

  const [activeTab, setActiveTab] = useState<
    "basic" | "participants" | "settings"
  >("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [form, setForm] = useState<FormState>(() => getInitialFormState());

  function getInitialFormState(): FormState {
    const nextSlot = getNextAvailableSlot();
    return {
      title: "",
      description: "",
      roomType: "video",
      date: nextSlot,
      startTime: `${String(nextSlot.getHours()).padStart(2, "0")}:${String(nextSlot.getMinutes()).padStart(2, "0")}`,
      duration: 60,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isPrivate: false,
      password: "",
      isRecurring: false,
      recurrencePattern: "weekly",
      recurrenceInterval: 1,
      participantIds: [],
      reminderTimings: ["15min"],
      muteOnJoin: true,
      videoOffOnJoin: false,
      allowScreenShare: true,
      waitingRoom: false,
      enableChat: true,
    };
  }

  // Populate form when editing
  useEffect(() => {
    if (editingMeeting) {
      const startDate = new Date(editingMeeting.scheduledStartAt);
      setForm({
        title: editingMeeting.title,
        description: editingMeeting.description || "",
        roomType: editingMeeting.roomType,
        date: startDate,
        startTime: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
        duration: editingMeeting.duration,
        timezone: editingMeeting.timezone,
        isPrivate: editingMeeting.isPrivate,
        password: editingMeeting.password || "",
        isRecurring: editingMeeting.isRecurring,
        recurrencePattern: editingMeeting.recurrenceRule?.pattern || "weekly",
        recurrenceInterval: editingMeeting.recurrenceRule?.interval || 1,
        participantIds: editingMeeting.participants.map((p) => p.userId),
        reminderTimings: ["15min"],
        muteOnJoin: editingMeeting.settings.muteOnJoin,
        videoOffOnJoin: editingMeeting.settings.videoOffOnJoin,
        allowScreenShare: editingMeeting.settings.allowScreenShare,
        waitingRoom: editingMeeting.settings.waitingRoom,
        enableChat: editingMeeting.settings.enableChat,
      });
    } else {
      setForm(getInitialFormState());
    }
  }, [editingMeeting]);

  // Handle close
  const handleClose = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      store.closeScheduler();
    }
    setActiveTab("basic");
    setErrors({});
  }, [onOpenChange, store]);

  // Update form field
  const updateForm = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  // Handle submit
  const handleSubmit = useCallback(async () => {
    // Build input
    const [hours, minutes] = form.startTime.split(":").map(Number);
    const startDate = new Date(form.date);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + form.duration * 60 * 1000);

    const input: CreateMeetingInput = {
      title: form.title,
      description: form.description || undefined,
      roomType: form.roomType,
      scheduledStartAt: startDate.toISOString(),
      scheduledEndAt: endDate.toISOString(),
      timezone: form.timezone,
      channelId: channelId,
      isPrivate: form.isPrivate,
      password: form.password || undefined,
      isRecurring: form.isRecurring,
      recurrenceRule: form.isRecurring
        ? {
            pattern: form.recurrencePattern,
            interval: form.recurrenceInterval,
          }
        : undefined,
      participantIds: form.participantIds,
      settings: {
        ...DEFAULT_MEETING_SETTINGS,
        muteOnJoin: form.muteOnJoin,
        videoOffOnJoin: form.videoOffOnJoin,
        allowScreenShare: form.allowScreenShare,
        waitingRoom: form.waitingRoom,
        enableChat: form.enableChat,
      },
    };

    // Validate
    const validation = validateMeetingInput(input);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(input);
      }
      handleClose();
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, channelId, onSubmit, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit Meeting" : "Schedule Meeting"}
          </DialogTitle>
          <DialogDescription>
            {editingId
              ? "Update meeting details and settings"
              : "Create a new scheduled meeting"}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "basic"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("basic")}
          >
            <Calendar className="h-4 w-4" />
            Basic Info
          </button>
          <button
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "participants"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("participants")}
          >
            <Users className="h-4 w-4" />
            Participants
          </button>
          <button
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "settings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === "basic" && (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="Weekly Team Sync"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  className={cn(errors.title && "border-red-500")}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description or agenda..."
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Room Type */}
              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ROOM_TYPES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                        form.roomType === value
                          ? "bg-primary/5 border-primary"
                          : "hover:border-muted-foreground/50 border-muted",
                      )}
                      onClick={() => updateForm("roomType", value)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date and Time */}
              <MeetingTimePicker
                date={form.date}
                time={form.startTime}
                duration={form.duration}
                timezone={form.timezone}
                onDateChange={(date) => updateForm("date", date)}
                onTimeChange={(time) => updateForm("startTime", time)}
                onDurationChange={(duration) =>
                  updateForm("duration", duration)
                }
                onTimezoneChange={(tz) => updateForm("timezone", tz)}
                errors={errors}
              />

              {/* Recurring */}
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="recurring">Recurring Meeting</Label>
                  <p className="text-sm text-muted-foreground">
                    Schedule this meeting to repeat
                  </p>
                </div>
                <Switch
                  id="recurring"
                  checked={form.isRecurring}
                  onCheckedChange={(checked) =>
                    updateForm("isRecurring", checked)
                  }
                />
              </div>

              {form.isRecurring && (
                <div className="flex gap-4 border-l-2 border-muted pl-4">
                  <div className="flex-1 space-y-2">
                    <Label>Repeat</Label>
                    <Select
                      value={form.recurrencePattern}
                      onValueChange={(value: RecurrencePattern) =>
                        updateForm("recurrencePattern", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-4">
              <MeetingParticipants
                selectedIds={form.participantIds}
                onChange={(ids) => updateForm("participantIds", ids)}
              />

              <MeetingReminders
                selectedTimings={form.reminderTimings}
                onChange={(timings) => updateForm("reminderTimings", timings)}
              />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Privacy Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Privacy</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="private">Private Meeting</Label>
                    <p className="text-sm text-muted-foreground">
                      Only invited participants can join
                    </p>
                  </div>
                  <Switch
                    id="private"
                    checked={form.isPrivate}
                    onCheckedChange={(checked) =>
                      updateForm("isPrivate", checked)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password (optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Set a meeting password"
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="waitingRoom">Waiting Room</Label>
                    <p className="text-sm text-muted-foreground">
                      Participants wait until admitted
                    </p>
                  </div>
                  <Switch
                    id="waitingRoom"
                    checked={form.waitingRoom}
                    onCheckedChange={(checked) =>
                      updateForm("waitingRoom", checked)
                    }
                  />
                </div>
              </div>

              {/* Audio/Video Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Audio & Video</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="muteOnJoin">Mute on Join</Label>
                    <p className="text-sm text-muted-foreground">
                      Participants join muted
                    </p>
                  </div>
                  <Switch
                    id="muteOnJoin"
                    checked={form.muteOnJoin}
                    onCheckedChange={(checked) =>
                      updateForm("muteOnJoin", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="videoOffOnJoin">Video Off on Join</Label>
                    <p className="text-sm text-muted-foreground">
                      Participants join with video off
                    </p>
                  </div>
                  <Switch
                    id="videoOffOnJoin"
                    checked={form.videoOffOnJoin}
                    onCheckedChange={(checked) =>
                      updateForm("videoOffOnJoin", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowScreenShare">Allow Screen Share</Label>
                    <p className="text-sm text-muted-foreground">
                      Participants can share their screen
                    </p>
                  </div>
                  <Switch
                    id="allowScreenShare"
                    checked={form.allowScreenShare}
                    onCheckedChange={(checked) =>
                      updateForm("allowScreenShare", checked)
                    }
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="font-medium">Features</h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableChat">Enable Chat</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow in-meeting chat
                    </p>
                  </div>
                  <Switch
                    id="enableChat"
                    checked={form.enableChat}
                    onCheckedChange={(checked) =>
                      updateForm("enableChat", checked)
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
            {errors.submit}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingId ? "Update Meeting" : "Schedule Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
