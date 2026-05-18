"use client";

/**
 * MeetingReminders - Reminder settings for meetings
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, BellOff } from "lucide-react";
import { ReminderTiming } from "@/lib/meetings/meeting-types";
import {
  REMINDER_TIMINGS,
  REMINDER_LABELS,
} from "@/lib/meetings/meeting-reminders";

// ============================================================================
// Types
// ============================================================================

interface MeetingRemindersProps {
  selectedTimings: ReminderTiming[];
  onChange: (timings: ReminderTiming[]) => void;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function MeetingReminders({
  selectedTimings,
  onChange,
  disabled = false,
}: MeetingRemindersProps) {
  const [remindersEnabled, setRemindersEnabled] = React.useState(
    selectedTimings.length > 0,
  );

  const toggleReminder = (timing: ReminderTiming) => {
    if (selectedTimings.includes(timing)) {
      onChange(selectedTimings.filter((t) => t !== timing));
    } else {
      onChange([...selectedTimings, timing]);
    }
  };

  const toggleAllReminders = (enabled: boolean) => {
    setRemindersEnabled(enabled);
    if (!enabled) {
      onChange([]);
    } else if (selectedTimings.length === 0) {
      onChange(["15min"]); // Default reminder
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {remindersEnabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label className="text-base font-medium">Reminders</Label>
        </div>
        <Switch
          checked={remindersEnabled}
          onCheckedChange={toggleAllReminders}
          disabled={disabled}
        />
      </div>

      {remindersEnabled && (
        <div className="space-y-3 pl-6">
          <p className="text-sm text-muted-foreground">
            Get notified before the meeting starts
          </p>
          <div className="space-y-2">
            {REMINDER_TIMINGS.map((timing) => (
              <label
                key={timing}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg p-2",
                  "transition-colors hover:bg-accent",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <Checkbox
                  checked={selectedTimings.includes(timing)}
                  onCheckedChange={() => !disabled && toggleReminder(timing)}
                  disabled={disabled}
                />
                <span className="text-sm">{REMINDER_LABELS[timing]}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
