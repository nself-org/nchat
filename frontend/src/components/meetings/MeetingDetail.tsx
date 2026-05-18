"use client";

/**
 * MeetingDetail - Full meeting details view
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Video,
  Phone,
  Monitor,
  Clock,
  Calendar,
  Users,
  Link as LinkIcon,
  Copy,
  Edit,
  Trash2,
  MapPin,
  Bell,
  Settings,
  ExternalLink,
  Share2,
  Check,
  X,
  HelpCircle,
  ChevronLeft,
} from "lucide-react";
import {
  Meeting,
  MeetingParticipant,
  ParticipantStatus,
} from "@/lib/meetings/meeting-types";
import {
  formatTime,
  formatDate,
  formatDateTime,
  formatDuration,
  formatRecurrence,
  getRelativeTime,
} from "@/lib/meetings";
import {
  copyMeetingLink,
  generateGoogleCalendarLink,
  generateOutlookCalendarLink,
  meetingToCalendarEvent,
} from "@/lib/meetings/meeting-links";
import {
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/meetings/meeting-invites";

// ============================================================================
// Types
// ============================================================================

interface MeetingDetailProps {
  meeting: Meeting;
  currentUserId?: string;
  onBack?: () => void;
  onJoin?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function MeetingDetail({
  meeting,
  currentUserId,
  onBack,
  onJoin,
  onEdit,
  onDelete,
  onCancel,
}: MeetingDetailProps) {
  const [copied, setCopied] = React.useState(false);

  const startDate = new Date(meeting.scheduledStartAt);
  const endDate = new Date(meeting.scheduledEndAt);
  const isHost = meeting.hostId === currentUserId;
  const isLive = meeting.status === "live";
  const isUpcoming = meeting.status === "scheduled" && startDate > new Date();
  const canJoin =
    isLive || (isUpcoming && startDate.getTime() - Date.now() < 15 * 60 * 1000);

  // Room type icon
  const getRoomIcon = () => {
    switch (meeting.roomType) {
      case "video":
        return <Video className="h-5 w-5" />;
      case "audio":
        return <Phone className="h-5 w-5" />;
      case "screenshare":
        return <Monitor className="h-5 w-5" />;
    }
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

  // Copy link
  const handleCopyLink = async () => {
    const success = await copyMeetingLink(meeting);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Status badge
  const getStatusBadge = () => {
    switch (meeting.status) {
      case "live":
        return (
          <Badge className="animate-pulse bg-green-500 text-white">
            Live Now
          </Badge>
        );
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "ended":
        return <Badge variant="outline">Ended</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  // Participant status icon
  const getStatusIcon = (status: ParticipantStatus) => {
    switch (status) {
      case "accepted":
        return <Check className="h-4 w-4 text-green-500" />;
      case "declined":
        return <X className="h-4 w-4 text-red-500" />;
      case "tentative":
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  // Calendar event
  const calendarEvent = meetingToCalendarEvent(meeting);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}
        <div className="flex items-center gap-2">
          {isHost && meeting.status === "scheduled" && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel Meeting
              </Button>
            </>
          )}
          {canJoin && (
            <Button
              onClick={onJoin}
              className={cn(isLive && "bg-green-600 hover:bg-green-700")}
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              {isLive ? "Join Now" : "Join Meeting"}
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {/* Title and Status */}
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div
                className={cn(
                  "rounded-lg p-2",
                  isLive ? "bg-green-500/20" : "bg-primary/10",
                )}
              >
                {getRoomIcon()}
              </div>
              {getStatusBadge()}
              {meeting.isRecurring && (
                <Badge variant="outline">Recurring</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            {meeting.description && (
              <p className="mt-2 text-muted-foreground">
                {meeting.description}
              </p>
            )}
          </div>

          {/* Time Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-lg">
                {formatDate(startDate, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatTime(startDate)} - {formatTime(endDate)}
                </span>
                <span className="text-muted-foreground">
                  ({formatDuration(meeting.duration)})
                </span>
              </div>
              {isUpcoming && (
                <div className="font-medium text-primary">
                  Starts {getRelativeTime(startDate)}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Timezone: {meeting.timezone}
              </div>
              {meeting.isRecurring && meeting.recurrenceRule && (
                <div className="text-sm text-muted-foreground">
                  {formatRecurrence(meeting.recurrenceRule)}
                </div>
              )}

              {/* Add to Calendar */}
              <div className="flex items-center gap-2 pt-2">
                <a
                  href={generateGoogleCalendarLink(calendarEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Add to Google Calendar
                </a>
                <span className="text-muted-foreground">|</span>
                <a
                  href={generateOutlookCalendarLink(calendarEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Add to Outlook
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Link */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <LinkIcon className="h-4 w-4" />
                Meeting Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted p-2 text-sm">
                  {meeting.meetingLink}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Meeting Code:{" "}
                <code className="font-mono">{meeting.meetingCode}</code>
              </p>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Participants ({meeting.participantCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meeting.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {participant.displayName
                            ? getInitials(participant.displayName)
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {participant.displayName || participant.email}
                          </span>
                          {participant.userId === meeting.hostId && (
                            <Badge variant="outline" className="text-xs">
                              Host
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_LABELS[participant.role]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(participant.status)}
                      <span
                        className={cn(
                          "text-sm",
                          STATUS_COLORS[participant.status],
                        )}
                      >
                        {STATUS_LABELS[participant.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Settings className="h-4 w-4" />
                Meeting Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      meeting.settings.waitingRoom
                        ? "bg-green-500"
                        : "bg-gray-300",
                    )}
                  />
                  Waiting Room
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      meeting.settings.muteOnJoin
                        ? "bg-green-500"
                        : "bg-gray-300",
                    )}
                  />
                  Mute on Join
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      meeting.settings.allowScreenShare
                        ? "bg-green-500"
                        : "bg-gray-300",
                    )}
                  />
                  Screen Sharing
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      meeting.settings.enableChat
                        ? "bg-green-500"
                        : "bg-gray-300",
                    )}
                  />
                  In-meeting Chat
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      meeting.settings.allowRecording
                        ? "bg-green-500"
                        : "bg-gray-300",
                    )}
                  />
                  Recording Allowed
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      meeting.isPrivate ? "bg-green-500" : "bg-gray-300",
                    )}
                  />
                  Private Meeting
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Host Actions */}
          {isHost &&
            meeting.status !== "ended" &&
            meeting.status !== "cancelled" && (
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button variant="destructive" onClick={onDelete}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete Meeting
                </Button>
              </div>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}
