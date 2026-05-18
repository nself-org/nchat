"use client";

/**
 * MeetingList - Display list of meetings with filters
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Calendar, Clock, Video, Loader2 } from "lucide-react";
import { Meeting, MeetingStatus } from "@/lib/meetings/meeting-types";
import { MeetingCard } from "./MeetingCard";

// ============================================================================
// Types
// ============================================================================

interface MeetingListProps {
  meetings: Meeting[];
  isLoading?: boolean;
  showFilters?: boolean;
  showTabs?: boolean;
  emptyMessage?: string;
  onMeetingClick?: (meeting: Meeting) => void;
  onJoinMeeting?: (meeting: Meeting) => void;
  onEditMeeting?: (meeting: Meeting) => void;
  onDeleteMeeting?: (meeting: Meeting) => void;
}

type TabValue = "all" | "upcoming" | "past" | "live";

// ============================================================================
// Component
// ============================================================================

export function MeetingList({
  meetings,
  isLoading = false,
  showFilters = true,
  showTabs = true,
  emptyMessage = "No meetings found",
  onMeetingClick,
  onJoinMeeting,
  onEditMeeting,
  onDeleteMeeting,
}: MeetingListProps) {
  const [activeTab, setActiveTab] = React.useState<TabValue>("upcoming");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"date" | "title">("date");

  // Filter meetings based on tab
  const filteredMeetings = React.useMemo(() => {
    let filtered = [...meetings];

    // Apply tab filter
    const now = new Date();
    switch (activeTab) {
      case "upcoming":
        filtered = filtered.filter(
          (m) => m.status === "scheduled" && new Date(m.scheduledStartAt) > now,
        );
        break;
      case "past":
        filtered = filtered.filter(
          (m) => m.status === "ended" || new Date(m.scheduledEndAt) < now,
        );
        break;
      case "live":
        filtered = filtered.filter((m) => m.status === "live");
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.scheduledStartAt).getTime();
        const dateB = new Date(b.scheduledStartAt).getTime();
        return activeTab === "past" ? dateB - dateA : dateA - dateB;
      }
      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [meetings, activeTab, searchQuery, sortBy]);

  // Group meetings by date for upcoming tab
  const groupedMeetings = React.useMemo(() => {
    if (activeTab !== "upcoming") return null;

    const groups: Record<string, Meeting[]> = {};
    filteredMeetings.forEach((meeting) => {
      const date = new Date(meeting.scheduledStartAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(meeting);
    });

    return groups;
  }, [filteredMeetings, activeTab]);

  // Tab counts
  const now = new Date();
  const upcomingCount = meetings.filter(
    (m) => m.status === "scheduled" && new Date(m.scheduledStartAt) > now,
  ).length;
  const liveCount = meetings.filter((m) => m.status === "live").length;
  const pastCount = meetings.filter(
    (m) => m.status === "ended" || new Date(m.scheduledEndAt) < now,
  ).length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      {showTabs && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
        >
          <TabsList>
            <TabsTrigger value="upcoming" className="relative">
              <Clock className="mr-2 h-4 w-4" />
              Upcoming
              {upcomingCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({upcomingCount})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="live" className="relative">
              <Video className="mr-2 h-4 w-4" />
              Live
              {liveCount > 0 && (
                <span className="ml-1 rounded-full bg-green-500 px-1.5 py-0.5 text-xs text-white">
                  {liveCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">
              <Calendar className="mr-2 h-4 w-4" />
              Past
              {pastCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({pastCount})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as "date" | "title")}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="title">By Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Meeting List */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-4">
                <Skeleton className="mb-2 h-5 w-1/3" />
                <Skeleton className="mb-4 h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMeetings.length > 0 ? (
          groupedMeetings ? (
            // Grouped by date (for upcoming)
            <div className="space-y-6">
              {Object.entries(groupedMeetings).map(
                ([dateStr, dateMeetings]) => {
                  const date = new Date(dateStr);
                  const isToday =
                    date.toDateString() === new Date().toDateString();
                  const isTomorrow =
                    date.toDateString() ===
                    new Date(Date.now() + 86400000).toDateString();

                  return (
                    <div key={dateStr}>
                      <h3 className="sticky top-0 mb-2 bg-background py-1 text-sm font-medium text-muted-foreground">
                        {isToday
                          ? "Today"
                          : isTomorrow
                            ? "Tomorrow"
                            : date.toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                              })}
                      </h3>
                      <div className="space-y-2">
                        {dateMeetings.map((meeting) => (
                          <MeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            onClick={() => onMeetingClick?.(meeting)}
                            onJoin={() => onJoinMeeting?.(meeting)}
                            onEdit={() => onEditMeeting?.(meeting)}
                            onDelete={() => onDeleteMeeting?.(meeting)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            // Flat list
            <div className="space-y-2">
              {filteredMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => onMeetingClick?.(meeting)}
                  onJoin={() => onJoinMeeting?.(meeting)}
                  onEdit={() => onEditMeeting?.(meeting)}
                  onDelete={() => onDeleteMeeting?.(meeting)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
