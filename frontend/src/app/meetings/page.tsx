"use client";

/**
 * Meetings Page - Main meetings dashboard
 *
 * Displays upcoming meetings, calendar view, and options to schedule new meetings
 */

import dynamic from "next/dynamic";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useMeetings } from "@/hooks/useMeetings";
import { useMeetingStore } from "@/stores/meeting-store";
import {
  MeetingListSkeleton,
  CalendarSkeleton,
  FormSkeleton,
} from "@/components/ui/loading-skeletons";
import { Meeting } from "@/lib/meetings/meeting-types";
import {
  Calendar,
  List,
  Plus,
  Video,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Lazy load heavy meeting components
const MeetingList = dynamic(
  () =>
    import("@/components/meetings").then((mod) => ({
      default: mod.MeetingList,
    })),
  { loading: () => <MeetingListSkeleton />, ssr: false },
);

const MeetingCalendar = dynamic(
  () =>
    import("@/components/meetings").then((mod) => ({
      default: mod.MeetingCalendar,
    })),
  { loading: () => <CalendarSkeleton />, ssr: false },
);

const MeetingScheduler = dynamic(
  () =>
    import("@/components/meetings").then((mod) => ({
      default: mod.MeetingScheduler,
    })),
  { loading: () => <FormSkeleton />, ssr: false },
);

const MeetingDetail = dynamic(
  () =>
    import("@/components/meetings").then((mod) => ({
      default: mod.MeetingDetail,
    })),
  { loading: () => <FormSkeleton />, ssr: false },
);

// ============================================================================
// Component
// ============================================================================

export default function MeetingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"list" | "calendar">("list");
  const [selectedMeeting, setSelectedMeeting] = React.useState<Meeting | null>(
    null,
  );

  const {
    meetings,
    upcomingMeetings,
    isLoading,
    error,
    createMeeting,
    joinMeeting,
    deleteMeeting,
    refetch,
  } = useMeetings({ userId: user?.id, autoLoad: true });

  const { isSchedulerOpen, openScheduler, closeScheduler } = useMeetingStore();

  // Handle meeting click
  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  // Handle join meeting
  const handleJoinMeeting = (meeting: Meeting) => {
    router.push(`/meetings/${meeting.meetingCode}`);
  };

  // Handle edit meeting
  const handleEditMeeting = (meeting: Meeting) => {
    openScheduler(meeting.id);
  };

  // Handle delete meeting
  const handleDeleteMeeting = async (meeting: Meeting) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      await deleteMeeting(meeting.id);
      if (selectedMeeting?.id === meeting.id) {
        setSelectedMeeting(null);
      }
    }
  };

  // Handle schedule click from calendar
  const handleScheduleClick = (date: Date) => {
    // Could pre-fill the date in the scheduler
    openScheduler();
  };

  // Handle create meeting
  const handleCreateMeeting = async (
    input: Parameters<typeof createMeeting>[0],
  ) => {
    const meeting = await createMeeting(input);
    if (meeting) {
      closeScheduler();
      refetch();
    }
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h1 className="text-2xl font-bold">Meetings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule and manage your meetings
            </p>
          </div>
          <Button onClick={() => openScheduler()}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b p-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "list" | "calendar")}
          >
            <TabsList>
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Loading meetings...
              </p>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="mt-2 text-sm text-red-500">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : activeTab === "list" ? (
            <MeetingList
              meetings={meetings}
              onMeetingClick={handleMeetingClick}
              onJoinMeeting={handleJoinMeeting}
              onEditMeeting={handleEditMeeting}
              onDeleteMeeting={handleDeleteMeeting}
              emptyMessage="No meetings scheduled. Click 'Schedule Meeting' to create one."
            />
          ) : (
            <MeetingCalendar
              meetings={meetings}
              onMeetingClick={handleMeetingClick}
              onDateSelect={() => {}}
              onScheduleClick={handleScheduleClick}
            />
          )}
        </div>
      </div>

      {/* Meeting Detail Sidebar */}
      {selectedMeeting && (
        <div className="w-[400px] border-l bg-background">
          <MeetingDetail
            meeting={selectedMeeting}
            currentUserId={user?.id}
            onBack={() => setSelectedMeeting(null)}
            onJoin={() => handleJoinMeeting(selectedMeeting)}
            onEdit={() => handleEditMeeting(selectedMeeting)}
            onDelete={() => handleDeleteMeeting(selectedMeeting)}
            onCancel={() => {
              // Would cancel the meeting
            }}
          />
        </div>
      )}

      {/* Scheduler Modal */}
      <MeetingScheduler
        open={isSchedulerOpen}
        onOpenChange={(open) => !open && closeScheduler()}
        onSubmit={handleCreateMeeting}
      />
    </div>
  );
}
