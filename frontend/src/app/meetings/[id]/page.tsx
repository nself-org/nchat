"use client";

/**
 * Meeting Room Page - Active meeting page
 *
 * Displays the meeting room for video/audio calls
 */

import * as React from "react";
import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useMeetings } from "@/hooks/useMeetings";
import { useMeetingStore } from "@/stores/meeting-store";
import { MeetingRoom, AudioRoom, VideoRoom } from "@/components/meetings";
import { Meeting } from "@/lib/meetings/meeting-types";
import { parseMeetingCode, decodePassword } from "@/lib/meetings/meeting-links";
import {
  Video,
  Phone,
  Monitor,
  Mic,
  MicOff,
  VideoOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type PageState =
  | "loading"
  | "preview"
  | "joining"
  | "in-meeting"
  | "error"
  | "ended";

// ============================================================================
// Component
// ============================================================================

function MeetingRoomPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const meetingCode = params.id as string;
  const passwordParam = searchParams.get("pwd");
  const directJoin = searchParams.get("directJoin") === "1";

  const [pageState, setPageState] = React.useState<PageState>("loading");
  const [meeting, setMeeting] = React.useState<Meeting | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState(
    passwordParam ? decodePassword(passwordParam) : "",
  );

  // Preview settings
  const [previewMuted, setPreviewMuted] = React.useState(true);
  const [previewVideoOn, setPreviewVideoOn] = React.useState(false);

  const {
    getMeetingByCode,
    joinMeeting,
    leaveMeeting,
    startMeeting,
    endMeeting,
  } = useMeetings({
    userId: user?.id,
  });

  const store = useMeetingStore();

  // Load meeting on mount
  React.useEffect(() => {
    const loadMeeting = async () => {
      setPageState("loading");

      // Parse and validate meeting code
      const parsedCode = parseMeetingCode(meetingCode);
      if (!parsedCode) {
        setError("Invalid meeting code");
        setPageState("error");
        return;
      }

      // Get meeting from store or fetch
      const foundMeeting = getMeetingByCode(parsedCode);

      if (!foundMeeting) {
        // In a real app, we'd fetch from the server here
        // For now, simulate not found
        setError("Meeting not found or has ended");
        setPageState("error");
        return;
      }

      // Check if meeting is cancelled
      if (foundMeeting.status === "cancelled") {
        setError("This meeting has been cancelled");
        setPageState("error");
        return;
      }

      // Check if meeting has ended
      if (foundMeeting.status === "ended") {
        setPageState("ended");
        setMeeting(foundMeeting);
        return;
      }

      setMeeting(foundMeeting);

      // Direct join or show preview
      if (
        directJoin &&
        (!foundMeeting.password || password === foundMeeting.password)
      ) {
        handleJoin(foundMeeting);
      } else {
        setPageState("preview");
      }
    };

    loadMeeting();
  }, [meetingCode, directJoin, password, getMeetingByCode]);

  // Handle join
  const handleJoin = async (m: Meeting = meeting!) => {
    if (!m) return;

    // Check password if required
    if (m.password && password !== m.password) {
      setError("Incorrect password");
      return;
    }

    setPageState("joining");
    setError(null);

    // Start meeting if not already live
    if (m.status === "scheduled" && m.hostId === user?.id) {
      await startMeeting(m.id);
    }

    // Join the meeting
    joinMeeting(m.id);
    setPageState("in-meeting");
  };

  // Handle leave
  const handleLeave = () => {
    leaveMeeting();
    router.push("/meetings");
  };

  // Handle end meeting
  const handleEndMeeting = async () => {
    if (meeting) {
      await endMeeting(meeting.id);
    }
    router.push("/meetings");
  };

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Loading state
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="mb-4 h-12 w-12 animate-spin" />
        <p>Loading meeting...</p>
      </div>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h1 className="mb-2 text-2xl font-bold">Unable to Join</h1>
        <p className="mb-6 text-gray-400">{error}</p>
        <Button onClick={() => router.push("/meetings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Meetings
        </Button>
      </div>
    );
  }

  // Meeting ended state
  if (pageState === "ended") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
        <Video className="mb-4 h-16 w-16 text-gray-500" />
        <h1 className="mb-2 text-2xl font-bold">Meeting Ended</h1>
        <p className="mb-6 text-gray-400">This meeting has ended.</p>
        <Button onClick={() => router.push("/meetings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Meetings
        </Button>
      </div>
    );
  }

  // Preview / Lobby state (including 'joining' transition)
  if ((pageState === "preview" || pageState === "joining") && meeting) {
    return (
      <div className="flex min-h-screen bg-gray-900 text-white">
        {/* Preview Video */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-gray-800">
            {previewVideoOn ? (
              <div className="from-primary/30 to-primary/10 absolute inset-0 bg-gradient-to-br" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="h-32 w-32 border-4 border-gray-600">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="bg-gray-700 text-4xl">
                    {getInitials(user?.displayName || "User")}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Preview Controls */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
              <Button
                variant={previewMuted ? "destructive" : "secondary"}
                size="lg"
                className="h-12 w-12 rounded-full"
                onClick={() => setPreviewMuted(!previewMuted)}
              >
                {previewMuted ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>

              {meeting.roomType !== "audio" && (
                <Button
                  variant={!previewVideoOn ? "destructive" : "secondary"}
                  size="lg"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setPreviewVideoOn(!previewVideoOn)}
                >
                  {previewVideoOn ? (
                    <Video className="h-5 w-5" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Join Panel */}
        <div className="flex w-96 flex-col border-l border-gray-700 p-8">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold">{meeting.title}</h1>
            <p className="mb-6 text-sm text-gray-400">
              {new Date(meeting.scheduledStartAt).toLocaleString()}
            </p>

            {/* Meeting Info */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-3">
                {meeting.roomType === "video" && (
                  <Video className="h-5 w-5 text-blue-400" />
                )}
                {meeting.roomType === "audio" && (
                  <Phone className="h-5 w-5 text-green-400" />
                )}
                {meeting.roomType === "screenshare" && (
                  <Monitor className="h-5 w-5 text-purple-400" />
                )}
                <span className="capitalize">{meeting.roomType} Meeting</span>
              </div>

              <div className="text-sm text-gray-400">
                {meeting.participantCount} participant
                {meeting.participantCount !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Password Input */}
            {meeting.password && (
              <div className="mb-6 space-y-2">
                <Label htmlFor="password">Meeting Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-700 bg-gray-800"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>
            )}
          </div>

          {/* Join Button */}
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleJoin()}
              disabled={pageState === "joining"}
            >
              {pageState === "joining" ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Video className="mr-2 h-5 w-5" />
              )}
              Join Meeting
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/meetings")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // In meeting state
  if (pageState === "in-meeting" && meeting) {
    if (meeting.roomType === "audio") {
      return (
        <AudioRoom
          meeting={meeting}
          onLeave={handleLeave}
          onEnd={handleEndMeeting}
        />
      );
    }

    return (
      <VideoRoom
        meeting={meeting}
        onLeave={handleLeave}
        onEnd={handleEndMeeting}
      />
    );
  }

  return null;
}

export default function MeetingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
          <Loader2 className="mb-4 h-12 w-12 animate-spin" />
          <p>Loading meeting...</p>
        </div>
      }
    >
      <MeetingRoomPageContent />
    </Suspense>
  );
}
