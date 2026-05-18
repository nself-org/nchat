"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationSettingsStore } from "@/stores/notification-settings-store";
import type {
  EmailDigestFrequency,
  NotificationType,
  DayOfWeek,
} from "@/lib/notifications/notification-types";

const EMAIL_FREQUENCIES: Array<{
  value: EmailDigestFrequency;
  label: string;
  description: string;
}> = [
  { value: "instant", label: "Instant", description: "As they happen" },
  { value: "hourly", label: "Hourly", description: "Every hour" },
  { value: "daily", label: "Daily digest", description: "Once per day" },
  { value: "weekly", label: "Weekly digest", description: "Once per week" },
  { value: "never", label: "Never", description: "Disable email" },
];

const NOTIFICATION_TYPES: Array<{ value: NotificationType; label: string }> = [
  { value: "mention", label: "Mentions" },
  { value: "direct_message", label: "Direct messages" },
  { value: "thread_reply", label: "Thread replies" },
  { value: "channel_invite", label: "Channel invites" },
  { value: "announcement", label: "Announcements" },
];

const DAYS_OF_WEEK: Array<{ value: DayOfWeek; label: string }> = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export interface EmailNotificationSettingsPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * EmailNotificationSettingsPanel - Email notification settings
 */
export function EmailNotificationSettingsPanel({
  className,
  ...props
}: EmailNotificationSettingsPanelProps) {
  const emailSettings = useNotificationSettingsStore(
    (state) => state.preferences.email,
  );
  const setEmailEnabled = useNotificationSettingsStore(
    (state) => state.setEmailEnabled,
  );
  const setEmailFrequency = useNotificationSettingsStore(
    (state) => state.setEmailFrequency,
  );
  const setEmailDigestTime = useNotificationSettingsStore(
    (state) => state.setEmailDigestTime,
  );
  const setEmailDigestDay = useNotificationSettingsStore(
    (state) => state.setEmailDigestDay,
  );
  const toggleEmailType = useNotificationSettingsStore(
    (state) => state.toggleEmailType,
  );
  const updateEmailSettings = useNotificationSettingsStore(
    (state) => state.updateEmailSettings,
  );

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Master Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-enabled" className="text-base font-medium">
              Email Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notification emails
            </p>
          </div>
          <Switch
            id="email-enabled"
            checked={emailSettings.enabled}
            onCheckedChange={setEmailEnabled}
          />
        </div>
      </Card>

      {/* Frequency */}
      <Card
        className={cn(
          "p-4",
          !emailSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Email Frequency</h3>
        <div className="space-y-2">
          {EMAIL_FREQUENCIES.map((freq) => (
            <label
              key={freq.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                emailSettings.digestFrequency === freq.value
                  ? "bg-primary/5 border-primary"
                  : "hover:bg-accent/50 border-border",
              )}
            >
              <input
                type="radio"
                name="email-frequency"
                value={freq.value}
                checked={emailSettings.digestFrequency === freq.value}
                onChange={() => setEmailFrequency(freq.value)}
                className="mt-1"
                aria-label={freq.label}
              />
              <div>
                <span className="text-sm font-medium">{freq.label}</span>
                <p className="text-xs text-muted-foreground">
                  {freq.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Digest Schedule */}
      {(emailSettings.digestFrequency === "daily" ||
        emailSettings.digestFrequency === "weekly") && (
        <Card
          className={cn(
            "p-4",
            !emailSettings.enabled && "pointer-events-none opacity-50",
          )}
        >
          <h3 className="mb-4 text-sm font-medium">Digest Schedule</h3>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="digest-time"
                className="text-xs text-muted-foreground"
              >
                Time to send digest
              </Label>
              <Input
                id="digest-time"
                type="time"
                value={emailSettings.digestTime}
                onChange={(e) => setEmailDigestTime(e.target.value)}
                className="mt-1 w-32"
              />
            </div>

            {emailSettings.digestFrequency === "weekly" && (
              <div>
                <Label
                  htmlFor="digest-day"
                  className="text-xs text-muted-foreground"
                >
                  Day to send weekly digest
                </Label>
                <Select
                  value={String(emailSettings.weeklyDigestDay)}
                  onValueChange={(value) =>
                    setEmailDigestDay(parseInt(value, 10) as DayOfWeek)
                  }
                >
                  <SelectTrigger className="mt-1 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Notification Types */}
      <Card
        className={cn(
          "p-4",
          !emailSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Include in Emails</h3>
        <div className="space-y-3">
          {NOTIFICATION_TYPES.map((type) => (
            <div key={type.value} className="flex items-center justify-between">
              <Label
                htmlFor={`email-type-${type.value}`}
                className="cursor-pointer"
              >
                {type.label}
              </Label>
              <Switch
                id={`email-type-${type.value}`}
                checked={emailSettings.enabledTypes.includes(type.value)}
                onCheckedChange={() => toggleEmailType(type.value)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Display Options */}
      <Card
        className={cn(
          "p-4",
          !emailSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <h3 className="mb-4 text-sm font-medium">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-preview">Include message preview</Label>
              <p className="text-xs text-muted-foreground">
                Show message content in emails
              </p>
            </div>
            <Switch
              id="email-preview"
              checked={emailSettings.includePreview}
              onCheckedChange={(includePreview) =>
                updateEmailSettings({ includePreview })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-summary">Include activity summary</Label>
              <p className="text-xs text-muted-foreground">
                Add channel activity stats to digest
              </p>
            </div>
            <Switch
              id="email-summary"
              checked={emailSettings.includeActivitySummary}
              onCheckedChange={(includeActivitySummary) =>
                updateEmailSettings({ includeActivitySummary })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-unread">Include unread count</Label>
              <p className="text-xs text-muted-foreground">
                Show total unread count in emails
              </p>
            </div>
            <Switch
              id="email-unread"
              checked={emailSettings.includeUnreadCount}
              onCheckedChange={(includeUnreadCount) =>
                updateEmailSettings({ includeUnreadCount })
              }
            />
          </div>
        </div>
      </Card>

      {/* Urgent Override */}
      <Card
        className={cn(
          "p-4",
          !emailSettings.enabled && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-urgent" className="font-medium">
              Urgent notifications immediately
            </Label>
            <p className="text-sm text-muted-foreground">
              Send urgent notifications immediately regardless of digest
              schedule
            </p>
          </div>
          <Switch
            id="email-urgent"
            checked={emailSettings.urgentImmediate}
            onCheckedChange={(urgentImmediate) =>
              updateEmailSettings({ urgentImmediate })
            }
          />
        </div>
      </Card>
    </div>
  );
}

EmailNotificationSettingsPanel.displayName = "EmailNotificationSettingsPanel";

export default EmailNotificationSettingsPanel;
