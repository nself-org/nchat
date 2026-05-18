"use client";

/**
 * Reminders List Component
 *
 * Displays a list of reminders with filtering, grouping, and management capabilities.
 * Shows upcoming and past reminders with options to mark complete, edit, or delete.
 *
 * @example
 * ```tsx
 * <RemindersList
 *   userId={currentUser.id}
 *   onEdit={(reminder) => openEditModal(reminder)}
 * />
 * ```
 */

import * as React from "react";
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Filter,
  Hash,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ReminderItem } from "./reminder-item";
import { useReminders } from "@/lib/reminders/use-reminders";
import {
  useReminderStore,
  type ReminderFilter,
} from "@/lib/reminders/reminder-store";
import { isToday, isThisWeek } from "@/lib/date";
import type { Reminder } from "@/graphql/reminders";

// ============================================================================
// Types
// ============================================================================

export interface RemindersListProps {
  userId: string;
  channelId?: string;
  onEdit?: (reminder: Reminder) => void;
  onCreateNew?: () => void;
  showFilters?: boolean;
  showSearch?: boolean;
  showTabs?: boolean;
  maxHeight?: string | number;
  emptyMessage?: string;
  className?: string;
}

interface ReminderGroup {
  id: string;
  label: string;
  reminders: Reminder[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function groupRemindersByDate(reminders: Reminder[]): ReminderGroup[] {
  const today: Reminder[] = [];
  const thisWeek: Reminder[] = [];
  const later: Reminder[] = [];
  const overdue: Reminder[] = [];

  const now = new Date();

  for (const reminder of reminders) {
    const remindAt = new Date(reminder.remind_at);

    if (remindAt < now && reminder.status === "pending") {
      overdue.push(reminder);
    } else if (isToday(remindAt)) {
      today.push(reminder);
    } else if (isThisWeek(remindAt)) {
      thisWeek.push(reminder);
    } else {
      later.push(reminder);
    }
  }

  const groups: ReminderGroup[] = [];

  if (overdue.length > 0) {
    groups.push({ id: "overdue", label: "Overdue", reminders: overdue });
  }
  if (today.length > 0) {
    groups.push({ id: "today", label: "Today", reminders: today });
  }
  if (thisWeek.length > 0) {
    groups.push({ id: "this-week", label: "This Week", reminders: thisWeek });
  }
  if (later.length > 0) {
    groups.push({ id: "later", label: "Later", reminders: later });
  }

  return groups;
}

function groupRemindersByChannel(reminders: Reminder[]): ReminderGroup[] {
  const channelMap = new Map<string, Reminder[]>();
  const noChannel: Reminder[] = [];

  for (const reminder of reminders) {
    const channelName =
      reminder.channel?.name || reminder.message?.channel?.name;

    if (channelName) {
      const existing = channelMap.get(channelName) || [];
      channelMap.set(channelName, [...existing, reminder]);
    } else {
      noChannel.push(reminder);
    }
  }

  const groups: ReminderGroup[] = [];

  for (const [channelName, channelReminders] of channelMap) {
    groups.push({
      id: `channel-${channelName}`,
      label: `#${channelName}`,
      reminders: channelReminders,
    });
  }

  if (noChannel.length > 0) {
    groups.push({ id: "no-channel", label: "General", reminders: noChannel });
  }

  return groups;
}

// ============================================================================
// Sub-components
// ============================================================================

interface RemindersFilterBarProps {
  filter: ReminderFilter;
  onFilterChange: (filter: Partial<ReminderFilter>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearch: boolean;
}

function RemindersFilterBar({
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  showSearch,
}: RemindersFilterBarProps) {
  return (
    <div className="flex items-center gap-2 border-b p-2">
      {showSearch && (
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-9"
          />
        </div>
      )}

      <Select
        value={filter.type || "all"}
        onValueChange={(value) =>
          onFilterChange({
            type:
              value === "all" ? undefined : (value as ReminderFilter["type"]),
          })
        }
      >
        <SelectTrigger className="h-8 w-[130px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="message">Message</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
          <SelectItem value="followup">Follow-up</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filter
            <ChevronDown className="ml-2 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={!filter.status || filter.status === "all"}
            onCheckedChange={() => onFilterChange({ status: "all" })}
          >
            All
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filter.status === "pending"}
            onCheckedChange={() => onFilterChange({ status: "pending" })}
          >
            Pending
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filter.status === "completed"}
            onCheckedChange={() => onFilterChange({ status: "completed" })}
          >
            Completed
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filter.status === "snoozed"}
            onCheckedChange={() => onFilterChange({ status: "snoozed" })}
          >
            Snoozed
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface ReminderGroupHeaderProps {
  group: ReminderGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

function ReminderGroupHeader({
  group,
  isExpanded,
  onToggle,
}: ReminderGroupHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="hover:bg-accent/50 flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground"
    >
      <ChevronDown
        className={cn(
          "h-4 w-4 transition-transform",
          !isExpanded && "-rotate-90",
        )}
      />
      <span>{group.label}</span>
      <Badge variant="secondary" className="ml-auto text-xs">
        {group.reminders.length}
      </Badge>
    </button>
  );
}

interface EmptyStateProps {
  message: string;
  onCreateNew?: () => void;
}

function EmptyState({ message, onCreateNew }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-sm font-medium">No reminders</h3>
      <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      {onCreateNew && (
        <Button onClick={onCreateNew} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create reminder
        </Button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RemindersList({
  userId,
  channelId,
  onEdit,
  onCreateNew,
  showFilters = true,
  showSearch = true,
  showTabs = true,
  maxHeight = "600px",
  emptyMessage = "No reminders yet. Create one to get started.",
  className,
}: RemindersListProps) {
  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedReminders, setSelectedReminders] = React.useState<Set<string>>(
    new Set(),
  );
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(["overdue", "today", "this-week", "later"]),
  );
  const [groupBy, setGroupBy] = React.useState<"date" | "channel">("date");
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = React.useState("upcoming");

  // Hooks
  const {
    reminders,
    upcomingReminders,
    completedReminders,
    isLoading,
    error,
    completeReminder,
    deleteReminder,
    snoozeReminder,
    bulkComplete,
    bulkDelete,
    isCompleting,
    isDeleting,
    openReminderModal,
  } = useReminders({ userId, channelId });

  const { filter, setFilter } = useReminderStore();

  // Filtered reminders
  const filteredReminders = React.useMemo(() => {
    let result =
      activeTab === "upcoming" ? upcomingReminders : completedReminders;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.content.toLowerCase().includes(query) ||
          r.note?.toLowerCase().includes(query),
      );
    }

    // Apply type filter
    if (filter.type && filter.type !== "all") {
      result = result.filter((r) => r.type === filter.type);
    }

    // Apply channel filter
    if (filter.channelId) {
      result = result.filter(
        (r) =>
          r.channel_id === filter.channelId ||
          r.message?.channel?.id === filter.channelId,
      );
    }

    return result;
  }, [activeTab, upcomingReminders, completedReminders, searchQuery, filter]);

  // Grouped reminders
  const groupedReminders = React.useMemo(() => {
    if (groupBy === "channel") {
      return groupRemindersByChannel(filteredReminders);
    }
    return groupRemindersByDate(filteredReminders);
  }, [filteredReminders, groupBy]);

  // Handlers
  const handleToggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSelectReminder = (id: string) => {
    setSelectedReminders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkComplete = async () => {
    await bulkComplete(Array.from(selectedReminders));
    setSelectedReminders(new Set());
  };

  const handleBulkDelete = async () => {
    await bulkDelete(Array.from(selectedReminders));
    setSelectedReminders(new Set());
  };

  const handleSnooze = (id: string) => {
    // Snooze for 1 hour by default
    snoozeReminder(id, 60 * 60 * 1000);
  };

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    setDeleteConfirmId(null);
  };

  // Render
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-4 py-12 text-center">
        <div className="text-destructive">
          <p className="font-medium">Error loading reminders</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="font-semibold">Reminders</h2>
          {upcomingReminders.length > 0 && (
            <Badge variant="secondary">{upcomingReminders.length}</Badge>
          )}
        </div>
        {onCreateNew && (
          <Button
            size="sm"
            onClick={onCreateNew || (() => openReminderModal())}
          >
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        )}
      </div>

      {/* Tabs */}
      {showTabs && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="upcoming"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Clock className="mr-2 h-4 w-4" />
              Upcoming
              {upcomingReminders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {upcomingReminders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Check className="mr-2 h-4 w-4" />
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Filters */}
      {showFilters && (
        <RemindersFilterBar
          filter={filter}
          onFilterChange={setFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch={showSearch}
        />
      )}

      {/* Bulk Actions */}
      {selectedReminders.size > 0 && (
        <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedReminders.size} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkComplete}
            disabled={isCompleting}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Complete all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete all
          </Button>
        </div>
      )}

      {/* Group By Toggle */}
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="text-xs text-muted-foreground">Group by:</span>
        <Button
          variant={groupBy === "date" ? "secondary" : "ghost"}
          size="sm"
          className="h-6 text-xs"
          onClick={() => setGroupBy("date")}
        >
          <Calendar className="mr-1 h-3 w-3" />
          Date
        </Button>
        <Button
          variant={groupBy === "channel" ? "secondary" : "ghost"}
          size="sm"
          className="h-6 text-xs"
          onClick={() => setGroupBy("channel")}
        >
          <Hash className="mr-1 h-3 w-3" />
          Channel
        </Button>
      </div>

      {/* Reminders List */}
      <ScrollArea style={{ maxHeight }} className="flex-1">
        {filteredReminders.length === 0 ? (
          <EmptyState
            message={
              activeTab === "upcoming"
                ? emptyMessage
                : "No completed reminders yet."
            }
            onCreateNew={activeTab === "upcoming" ? onCreateNew : undefined}
          />
        ) : (
          <div className="divide-y">
            {groupedReminders.map((group) => (
              <div key={group.id}>
                <ReminderGroupHeader
                  group={group}
                  isExpanded={expandedGroups.has(group.id)}
                  onToggle={() => handleToggleGroup(group.id)}
                />
                {expandedGroups.has(group.id) && (
                  <div className="space-y-2 p-2">
                    {group.reminders.map((reminder) => (
                      <ReminderItem
                        key={reminder.id}
                        reminder={reminder}
                        onComplete={completeReminder}
                        onEdit={onEdit}
                        onDelete={(id) => setDeleteConfirmId(id)}
                        onSnooze={handleSnooze}
                        isLoading={isCompleting || isDeleting}
                        showChannel={groupBy !== "channel"}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The reminder will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RemindersList;
