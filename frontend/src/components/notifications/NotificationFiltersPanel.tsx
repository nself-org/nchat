"use client";

/**
 * NotificationFiltersPanel - Filter notifications by type, channel, date, priority, and mute state
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AtSign,
  MessageSquare,
  MessageCircleReply,
  Heart,
  Settings,
  Filter,
  CalendarDays,
  BellOff,
  AlertTriangle,
  RotateCcw,
  Hash,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

export type NotificationType =
  | "mention"
  | "dm"
  | "thread_reply"
  | "reaction"
  | "system";
export type PriorityLevel = "high" | "medium" | "low";
export type DateRange = "today" | "week" | "month" | "all";

export interface NotificationFilters {
  types: NotificationType[];
  channelId: string | "all";
  dateRange: DateRange;
  isMuted: boolean;
  priorities: PriorityLevel[];
}

export interface NotificationFiltersPanelProps {
  className?: string;
  /** Current filters (controlled mode) */
  filters?: NotificationFilters;
  /** Callback when filters change */
  onFiltersChange?: (filters: NotificationFilters) => void;
  /** List of channels available for filtering */
  channels?: Array<{ id: string; name: string }>;
}

// ── Constants ───────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES: Array<{
  value: NotificationType;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: "mention",
    label: "Mentions",
    description: "When someone @mentions you",
    icon: AtSign,
  },
  {
    value: "dm",
    label: "Direct Messages",
    description: "New direct messages",
    icon: MessageSquare,
  },
  {
    value: "thread_reply",
    label: "Thread Replies",
    description: "Replies to threads you follow",
    icon: MessageCircleReply,
  },
  {
    value: "reaction",
    label: "Reactions",
    description: "Reactions to your messages",
    icon: Heart,
  },
  {
    value: "system",
    label: "System",
    description: "System and admin notifications",
    icon: Settings,
  },
];

const PRIORITY_LEVELS: Array<{
  value: PriorityLevel;
  label: string;
  color: string;
}> = [
  { value: "high", label: "High", color: "text-destructive" },
  {
    value: "medium",
    label: "Medium",
    color: "text-yellow-600 dark:text-yellow-400",
  },
  { value: "low", label: "Low", color: "text-muted-foreground" },
];

const DATE_RANGES: Array<{ value: DateRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "Past 7 days" },
  { value: "month", label: "Past 30 days" },
  { value: "all", label: "All time" },
];

const DEFAULT_FILTERS: NotificationFilters = {
  types: ["mention", "dm", "thread_reply", "reaction", "system"],
  channelId: "all",
  dateRange: "all",
  isMuted: false,
  priorities: ["high", "medium", "low"],
};

const DEFAULT_CHANNELS: Array<{ id: string; name: string }> = [
  { id: "general", name: "general" },
  { id: "random", name: "random" },
  { id: "announcements", name: "announcements" },
];

// ── Component ───────────────────────────────────────────────────────────────

export function NotificationFiltersPanel({
  className,
  filters: controlledFilters,
  onFiltersChange,
  channels = DEFAULT_CHANNELS,
}: NotificationFiltersPanelProps) {
  const [internalFilters, setInternalFilters] =
    React.useState<NotificationFilters>(DEFAULT_FILTERS);

  const filters = controlledFilters ?? internalFilters;

  const updateFilters = React.useCallback(
    (patch: Partial<NotificationFilters>) => {
      const next = { ...filters, ...patch };
      if (onFiltersChange) {
        onFiltersChange(next);
      } else {
        setInternalFilters(next);
      }
    },
    [filters, onFiltersChange],
  );

  // Toggle a notification type in the set
  const toggleType = React.useCallback(
    (type: NotificationType) => {
      const current = filters.types;
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      // Ensure at least one type is selected
      if (next.length > 0) {
        updateFilters({ types: next });
      }
    },
    [filters.types, updateFilters],
  );

  // Toggle a priority level in the set
  const togglePriority = React.useCallback(
    (priority: PriorityLevel) => {
      const current = filters.priorities;
      const next = current.includes(priority)
        ? current.filter((p) => p !== priority)
        : [...current, priority];
      if (next.length > 0) {
        updateFilters({ priorities: next });
      }
    },
    [filters.priorities, updateFilters],
  );

  const handleReset = React.useCallback(() => {
    if (onFiltersChange) {
      onFiltersChange(DEFAULT_FILTERS);
    } else {
      setInternalFilters(DEFAULT_FILTERS);
    }
  }, [onFiltersChange]);

  const isDefault =
    filters.types.length === DEFAULT_FILTERS.types.length &&
    filters.priorities.length === DEFAULT_FILTERS.priorities.length &&
    filters.channelId === DEFAULT_FILTERS.channelId &&
    filters.dateRange === DEFAULT_FILTERS.dateRange &&
    filters.isMuted === DEFAULT_FILTERS.isMuted;

  const activeFilterCount =
    (filters.types.length < NOTIFICATION_TYPES.length ? 1 : 0) +
    (filters.channelId !== "all" ? 1 : 0) +
    (filters.dateRange !== "all" ? 1 : 0) +
    (filters.isMuted ? 1 : 0) +
    (filters.priorities.length < PRIORITY_LEVELS.length ? 1 : 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-lg font-medium">Notification Filters</h3>
          {activeFilterCount > 0 && (
            <span className="text-primary-foreground inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </div>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Choose which types of notifications to display.
      </p>

      {/* Notification Type Filter */}
      <Card className="p-4">
        <h4 className="mb-3 text-sm font-medium">Notification Type</h4>
        <div className="space-y-2">
          {NOTIFICATION_TYPES.map((type) => {
            const Icon = type.icon;
            const checked = filters.types.includes(type.value);
            return (
              <label
                key={type.value}
                htmlFor={`notification-type-${type.value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors",
                  checked
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-accent/50 border-transparent",
                )}
              >
                <Checkbox
                  id={`notification-type-${type.value}`}
                  checked={checked}
                  onCheckedChange={() => toggleType(type.value)}
                />
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="text-sm font-medium">{type.label}</span>
                  <p className="text-xs text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </Card>

      {/* Channel Filter */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Channel</h4>
        </div>
        <Select
          value={filters.channelId}
          onValueChange={(value) => updateFilters({ channelId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                #{channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Date Range Filter */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Date Range</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={
                filters.dateRange === range.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => updateFilters({ dateRange: range.value })}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Priority Level Filter */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Priority Level</h4>
        </div>
        <div className="space-y-2">
          {PRIORITY_LEVELS.map((priority) => {
            const checked = filters.priorities.includes(priority.value);
            return (
              <label
                key={priority.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors",
                  checked
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-accent/50 border-transparent",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => togglePriority(priority.value)}
                />
                <span className={cn("text-sm font-medium", priority.color)}>
                  {priority.label}
                </span>
              </label>
            );
          })}
        </div>
      </Card>

      {/* Mute Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="show-muted">Include muted</Label>
              <p className="text-xs text-muted-foreground">
                Show notifications from muted channels
              </p>
            </div>
          </div>
          <Switch
            id="show-muted"
            checked={filters.isMuted}
            onCheckedChange={(checked) => updateFilters({ isMuted: checked })}
          />
        </div>
      </Card>
    </div>
  );
}

NotificationFiltersPanel.displayName = "NotificationFiltersPanel";

export default NotificationFiltersPanel;
