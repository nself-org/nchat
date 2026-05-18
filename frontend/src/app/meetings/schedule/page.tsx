"use client";

/**
 * Schedule Meeting Page - Dedicated page for scheduling meetings
 *
 * Alternative to the modal for users who prefer a full-page experience
 */

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "@/contexts/auth-context";
import { useMeetings } from "@/hooks/useMeetings";
import {
  MeetingTimePicker,
  MeetingParticipants,
  MeetingReminders,
} from "@/components/meetings";
import {
  CreateMeetingInput,
  RoomType,
  RecurrencePattern,
  ReminderTiming,
} from "@/lib/meetings/meeting-types";
import {
  DEFAULT_MEETING_SETTINGS,
  validateMeetingInput,
  getNextAvailableSlot,
} from "@/lib/meetings";
import {
  ArrowLeft,
  Video,
  Phone,
  Monitor,
  Calendar,
  Users,
  Settings,
  Loader2,
  CheckCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

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
  description: string;
  icon: typeof Video;
}> = [
  {
    value: "video",
    label: "Video Call",
    description: "Face-to-face with video and audio",
    icon: Video,
  },
  {
    value: "audio",
    label: "Audio Call",
    description: "Voice-only conference call",
    icon: Phone,
  },
  {
    value: "screenshare",
    label: "Screen Share",
    description: "Present and share your screen",
    icon: Monitor,
  },
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

function ScheduleMeetingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const channelId = searchParams.get("channel") || undefined;

  const [activeStep, setActiveStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { createMeeting } = useMeetings({ userId: user?.id });

  // Form state
  const [form, setForm] = React.useState<FormState>(() => {
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
  });

  // Update form field
  const updateForm = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Steps
  const steps = [
    { id: "basic", title: "Basic Info", icon: Calendar },
    { id: "participants", title: "Participants", icon: Users },
    { id: "settings", title: "Settings", icon: Settings },
  ];

  // Handle submit
  const handleSubmit = async () => {
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
      channelId,
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
      const meeting = await createMeeting(input);
      if (meeting) {
        setIsSuccess(true);
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/meetings");
        }, 2000);
      }
    } catch (err) {
      setErrors({ submit: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pb-8 pt-10">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-2xl font-bold">Meeting Scheduled!</h2>
            <p className="mb-4 text-muted-foreground">
              Your meeting has been created successfully.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to meetings...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Schedule Meeting</h1>
            <p className="text-sm text-muted-foreground">
              Create a new scheduled meeting
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Steps Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      activeStep === index
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2",
                        activeStep === index
                          ? "text-primary-foreground border-primary bg-primary"
                          : "border-muted-foreground/30",
                      )}
                    >
                      {activeStep > index ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-sm">{index + 1}</span>
                      )}
                    </div>
                    <span className="font-medium">{step.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{steps[activeStep].title}</CardTitle>
                <CardDescription>
                  {activeStep === 0 &&
                    "Enter the basic details for your meeting"}
                  {activeStep === 1 && "Add participants and set up reminders"}
                  {activeStep === 2 && "Configure meeting settings and privacy"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Basic Info */}
                {activeStep === 0 && (
                  <>
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

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Add a description or agenda..."
                        value={form.description}
                        onChange={(e) =>
                          updateForm("description", e.target.value)
                        }
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Meeting Type</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {ROOM_TYPES.map(
                          ({ value, label, description, icon: Icon }) => (
                            <button
                              key={value}
                              type="button"
                              className={cn(
                                "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
                                form.roomType === value
                                  ? "bg-primary/5 border-primary"
                                  : "hover:border-muted-foreground/50 border-muted",
                              )}
                              onClick={() => updateForm("roomType", value)}
                            >
                              <Icon className="h-6 w-6" />
                              <span className="font-medium">{label}</span>
                              <span className="text-xs text-muted-foreground">
                                {description}
                              </span>
                            </button>
                          ),
                        )}
                      </div>
                    </div>

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

                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <Label>Recurring Meeting</Label>
                        <p className="text-sm text-muted-foreground">
                          Schedule this meeting to repeat
                        </p>
                      </div>
                      <Switch
                        checked={form.isRecurring}
                        onCheckedChange={(checked) =>
                          updateForm("isRecurring", checked)
                        }
                      />
                    </div>

                    {form.isRecurring && (
                      <div className="border-l-2 border-muted pl-4">
                        <Label>Repeat</Label>
                        <Select
                          value={form.recurrencePattern}
                          onValueChange={(value: RecurrencePattern) =>
                            updateForm("recurrencePattern", value)
                          }
                        >
                          <SelectTrigger className="mt-1">
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
                    )}
                  </>
                )}

                {/* Step 2: Participants */}
                {activeStep === 1 && (
                  <>
                    <MeetingParticipants
                      selectedIds={form.participantIds}
                      onChange={(ids) => updateForm("participantIds", ids)}
                    />

                    <div className="border-t pt-6">
                      <MeetingReminders
                        selectedTimings={form.reminderTimings}
                        onChange={(timings) =>
                          updateForm("reminderTimings", timings)
                        }
                      />
                    </div>
                  </>
                )}

                {/* Step 3: Settings */}
                {activeStep === 2 && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h3 className="font-medium">Privacy</h3>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Private Meeting</Label>
                          <p className="text-sm text-muted-foreground">
                            Only invited participants can join
                          </p>
                        </div>
                        <Switch
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
                          onChange={(e) =>
                            updateForm("password", e.target.value)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Waiting Room</Label>
                          <p className="text-sm text-muted-foreground">
                            Participants wait until admitted
                          </p>
                        </div>
                        <Switch
                          checked={form.waitingRoom}
                          onCheckedChange={(checked) =>
                            updateForm("waitingRoom", checked)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-medium">Audio & Video</h3>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Mute on Join</Label>
                          <p className="text-sm text-muted-foreground">
                            Participants join muted
                          </p>
                        </div>
                        <Switch
                          checked={form.muteOnJoin}
                          onCheckedChange={(checked) =>
                            updateForm("muteOnJoin", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Video Off on Join</Label>
                          <p className="text-sm text-muted-foreground">
                            Participants join with video off
                          </p>
                        </div>
                        <Switch
                          checked={form.videoOffOnJoin}
                          onCheckedChange={(checked) =>
                            updateForm("videoOffOnJoin", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow Screen Share</Label>
                          <p className="text-sm text-muted-foreground">
                            Participants can share their screen
                          </p>
                        </div>
                        <Switch
                          checked={form.allowScreenShare}
                          onCheckedChange={(checked) =>
                            updateForm("allowScreenShare", checked)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-medium">Features</h3>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Chat</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow in-meeting chat
                          </p>
                        </div>
                        <Switch
                          checked={form.enableChat}
                          onCheckedChange={(checked) =>
                            updateForm("enableChat", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {errors.submit && (
                  <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                    {errors.submit}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                  >
                    Previous
                  </Button>

                  {activeStep < steps.length - 1 ? (
                    <Button
                      onClick={() =>
                        setActiveStep(
                          Math.min(steps.length - 1, activeStep + 1),
                        )
                      }
                    >
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Schedule Meeting
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScheduleMeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ScheduleMeetingPageContent />
    </Suspense>
  );
}
