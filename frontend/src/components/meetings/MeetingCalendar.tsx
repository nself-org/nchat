"use client";

/**
 * MeetingCalendar - Calendar view for meetings
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { Meeting, CalendarMonth } from "@/lib/meetings/meeting-types";
import { generateCalendarMonth, formatTime } from "@/lib/meetings";
import { useMeetingStore } from "@/stores/meeting-store";
import { MeetingCard } from "./MeetingCard";

// ============================================================================
// Types
// ============================================================================

interface MeetingCalendarProps {
  meetings: Meeting[];
  onDateSelect?: (date: Date) => void;
  onMeetingClick?: (meeting: Meeting) => void;
  onScheduleClick?: (date: Date) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ============================================================================
// Component
// ============================================================================

export function MeetingCalendar({
  meetings,
  onDateSelect,
  onMeetingClick,
  onScheduleClick,
}: MeetingCalendarProps) {
  const {
    calendarViewDate,
    calendarViewMode,
    setCalendarViewDate,
    setCalendarViewMode,
    navigateCalendar,
    goToToday,
  } = useMeetingStore();

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  // Generate calendar data
  const calendarMonth = React.useMemo(
    () =>
      generateCalendarMonth(
        calendarViewDate.getFullYear(),
        calendarViewDate.getMonth(),
        meetings,
      ),
    [calendarViewDate, meetings],
  );

  // Handle date click
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(new Date(date));
    }
  };

  // Get meetings for selected date
  const selectedDateMeetings = selectedDate
    ? meetings.filter((m) => {
        const meetingDate = new Date(m.scheduledStartAt)
          .toISOString()
          .split("T")[0];
        return meetingDate === selectedDate;
      })
    : [];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Calendar Grid */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateCalendar("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateCalendar("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              className="flex h-10 items-center justify-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarMonth.weeks.flatMap((week) =>
            week.days.map((day) => {
              const hasMeetings = day.meetings.length > 0;
              const isSelected = selectedDate === day.date;

              return (
                <button
                  key={day.date}
                  onClick={() => handleDateClick(day.date)}
                  className={cn(
                    "min-h-24 rounded-lg border p-1 text-left transition-colors",
                    day.isCurrentMonth
                      ? "bg-card"
                      : "bg-muted/30 text-muted-foreground",
                    day.isWeekend && "bg-muted/50",
                    day.isToday && "ring-2 ring-primary",
                    isSelected && "bg-primary/5 ring-2 ring-primary",
                    "hover:bg-accent/50",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                        day.isToday &&
                          "text-primary-foreground bg-primary font-medium",
                      )}
                    >
                      {new Date(day.date).getDate()}
                    </span>
                    {hasMeetings && (
                      <Badge variant="secondary" className="text-xs">
                        {day.meetings.length}
                      </Badge>
                    )}
                  </div>

                  {/* Meeting Previews */}
                  <div className="mt-1 space-y-0.5">
                    {day.meetings.slice(0, 2).map((meeting) => (
                      <div
                        key={meeting.id}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-xs",
                          meeting.status === "live"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-primary/10 text-primary",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMeetingClick?.(meeting);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onMeetingClick?.(meeting);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {formatTime(meeting.scheduledStartAt)} {meeting.title}
                      </div>
                    ))}
                    {day.meetings.length > 2 && (
                      <div className="px-1 text-xs text-muted-foreground">
                        +{day.meetings.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            }),
          )}
        </div>
      </div>

      {/* Selected Date Panel */}
      {selectedDate && (
        <div className="w-full rounded-lg border p-4 lg:w-80">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>
            <Button
              size="sm"
              onClick={() => onScheduleClick?.(new Date(selectedDate))}
            >
              <Plus className="mr-1 h-4 w-4" />
              Schedule
            </Button>
          </div>

          {selectedDateMeetings.length > 0 ? (
            <div className="space-y-3">
              {selectedDateMeetings
                .sort(
                  (a, b) =>
                    new Date(a.scheduledStartAt).getTime() -
                    new Date(b.scheduledStartAt).getTime(),
                )
                .map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    variant="compact"
                    onClick={() => onMeetingClick?.(meeting)}
                  />
                ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">No meetings scheduled</p>
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={() => onScheduleClick?.(new Date(selectedDate))}
              >
                Schedule a meeting
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
