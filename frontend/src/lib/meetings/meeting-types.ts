/**
 * Meeting Types - Type definitions for the meetings/calls feature
 *
 * Supports scheduled meetings, instant huddles, and audio/video rooms
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type MeetingType = "scheduled" | "instant" | "huddle" | "recurring";

export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";

export type ParticipantRole = "host" | "co-host" | "presenter" | "participant";

export type ParticipantStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "tentative"
  | "joined"
  | "left";

export type RoomType = "video" | "audio" | "screenshare";

export type RecurrencePattern =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";

export type ReminderTiming =
  | "5min"
  | "10min"
  | "15min"
  | "30min"
  | "1hour"
  | "1day";

// ============================================================================
// Core Types
// ============================================================================

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  invitedAt: string;
  respondedAt: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  // User info (populated from join)
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

export interface MeetingReminder {
  id: string;
  meetingId: string;
  userId: string;
  timing: ReminderTiming;
  sentAt: string | null;
  isEnabled: boolean;
}

export interface RecurrenceRule {
  pattern: RecurrencePattern;
  interval: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0-6, Sunday-Saturday
  dayOfMonth?: number; // 1-31
  endDate?: string;
  occurrences?: number; // Max number of occurrences
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  type: MeetingType;
  status: MeetingStatus;
  roomType: RoomType;

  // Scheduling
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
  duration: number; // minutes

  // Recurrence
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  parentMeetingId: string | null; // For recurring instances

  // Access
  hostId: string;
  channelId: string | null; // If tied to a channel
  isPrivate: boolean;
  requiresApproval: boolean;
  password: string | null;

  // Meeting link
  meetingLink: string;
  meetingCode: string;

  // Settings
  settings: MeetingSettings;

  // Participants
  participants: MeetingParticipant[];
  participantCount: number;
  maxParticipants: number | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MeetingSettings {
  // Audio/Video
  muteOnJoin: boolean;
  videoOffOnJoin: boolean;
  allowScreenShare: boolean;
  allowRecording: boolean;

  // Access control
  waitingRoom: boolean;
  allowGuests: boolean;
  requiresSignIn: boolean;

  // Features
  enableChat: boolean;
  enableReactions: boolean;
  enableHandRaise: boolean;
  enableBreakoutRooms: boolean;

  // Recording
  autoRecord: boolean;
  recordingConsent: boolean;
}

// ============================================================================
// Huddle Types (Quick Audio/Video Calls)
// ============================================================================

export interface Huddle {
  id: string;
  channelId: string;
  roomType: RoomType;
  status: "active" | "ended";

  // Host
  hostId: string;
  hostName: string;
  hostAvatarUrl: string | null;

  // Participants
  participants: HuddleParticipant[];
  participantCount: number;
  maxParticipants: number;

  // Timestamps
  startedAt: string;
  endedAt: string | null;
}

export interface HuddleParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
}

// ============================================================================
// Room State Types
// ============================================================================

export interface RoomState {
  meetingId: string;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Local user state
  localUser: LocalUserState;

  // Remote participants
  remoteParticipants: RemoteParticipant[];

  // Room info
  activeSpeakerId: string | null;
  screenShareUserId: string | null;
  recordingStatus: "none" | "starting" | "recording" | "paused" | "stopping";

  // Chat
  chatMessages: RoomChatMessage[];
  unreadChatCount: number;
}

export interface LocalUserState {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  selectedAudioInput: string | null;
  selectedAudioOutput: string | null;
  selectedVideoInput: string | null;
}

export interface RemoteParticipant {
  id: string;
  peerId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: ParticipantRole;

  // Media state
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isHandRaised: boolean;

  // Connection quality
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "unknown";

  // Timestamps
  joinedAt: string;
}

export interface RoomChatMessage {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  timestamp: string;
  type: "message" | "system";
}

// ============================================================================
// Calendar Types
// ============================================================================

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  meetings: Meeting[];
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  weeks: CalendarWeek[];
}

export interface CalendarEvent {
  id: string;
  meetingId: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  isAllDay: boolean;
}

// ============================================================================
// Form Types
// ============================================================================

export interface CreateMeetingInput {
  title: string;
  description?: string;
  roomType: RoomType;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  channelId?: string;
  isPrivate?: boolean;
  password?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  participantIds?: string[];
  settings?: Partial<MeetingSettings>;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  timezone?: string;
  isPrivate?: boolean;
  password?: string;
  settings?: Partial<MeetingSettings>;
}

export interface InviteParticipantsInput {
  meetingId: string;
  userIds: string[];
  role?: ParticipantRole;
  sendEmail?: boolean;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export interface MeetingFilters {
  status?: MeetingStatus[];
  type?: MeetingType[];
  dateRange?: {
    start: string;
    end: string;
  };
  channelId?: string;
  hostId?: string;
  participantId?: string;
  search?: string;
}

export type MeetingSortBy =
  | "scheduledStartAt"
  | "createdAt"
  | "title"
  | "participantCount";
export type SortOrder = "asc" | "desc";
