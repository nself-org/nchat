/**
 * Meeting Store - Manages meeting state for the nself-chat application
 *
 * Handles scheduled meetings, huddles, room state, and participant management
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  Meeting,
  MeetingType,
  MeetingStatus,
  MeetingParticipant,
  MeetingReminder,
  MeetingFilters,
  MeetingSortBy,
  SortOrder,
  Huddle,
  HuddleParticipant,
  RoomState,
  LocalUserState,
  RemoteParticipant,
  RoomChatMessage,
  CreateMeetingInput,
  UpdateMeetingInput,
} from "@/lib/meetings/meeting-types";
import {
  DEFAULT_MEETING_SETTINGS,
  generateMeetingCode,
  generateMeetingLink,
} from "@/lib/meetings";

// ============================================================================
// Types
// ============================================================================

export interface MeetingState {
  // Meetings
  meetings: Map<string, Meeting>;
  meetingsByCode: Map<string, string>; // code -> id mapping

  // Active state
  activeMeetingId: string | null;
  activeHuddleId: string | null;

  // Huddles (quick channel calls)
  huddles: Map<string, Huddle>;
  channelHuddles: Map<string, string>; // channelId -> huddleId

  // Room state (when in a meeting)
  roomState: RoomState | null;

  // Filters and sorting
  filters: MeetingFilters;
  sortBy: MeetingSortBy;
  sortOrder: SortOrder;

  // Selected meetings (for bulk actions)
  selectedMeetingIds: Set<string>;

  // Calendar view
  calendarViewDate: Date;
  calendarViewMode: "day" | "week" | "month";

  // Modal states
  isSchedulerOpen: boolean;
  editingMeetingId: string | null;
  isJoinModalOpen: boolean;
  joinMeetingCode: string;

  // Loading states
  isLoading: boolean;
  isLoadingMeeting: string | null;
  isJoining: boolean;
  isCreating: boolean;

  // Error state
  error: string | null;

  // Pagination
  hasMore: boolean;
  cursor: string | null;
}

export interface MeetingActions {
  // Meeting CRUD
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void;
  removeMeeting: (meetingId: string) => void;
  getMeetingById: (meetingId: string) => Meeting | undefined;
  getMeetingByCode: (code: string) => Meeting | undefined;

  // Active meeting
  setActiveMeeting: (meetingId: string | null) => void;
  joinMeeting: (meetingId: string) => void;
  leaveMeeting: () => void;
  endMeeting: (meetingId: string) => void;

  // Huddles
  setHuddles: (huddles: Huddle[]) => void;
  startHuddle: (channelId: string, roomType: "video" | "audio") => void;
  joinHuddle: (huddleId: string) => void;
  leaveHuddle: () => void;
  endHuddle: (huddleId: string) => void;
  getChannelHuddle: (channelId: string) => Huddle | undefined;

  // Room state
  initRoomState: (meetingId: string) => void;
  clearRoomState: () => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;

  // Local user controls
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  toggleHandRaise: () => void;
  setAudioInput: (deviceId: string) => void;
  setAudioOutput: (deviceId: string) => void;
  setVideoInput: (deviceId: string) => void;

  // Remote participants
  addParticipant: (participant: RemoteParticipant) => void;
  removeParticipant: (peerId: string) => void;
  updateParticipant: (
    peerId: string,
    updates: Partial<RemoteParticipant>,
  ) => void;
  setActiveSpeaker: (peerId: string | null) => void;
  setScreenSharer: (peerId: string | null) => void;

  // Room chat
  addChatMessage: (message: RoomChatMessage) => void;
  markChatRead: () => void;

  // Participants management
  updateMeetingParticipants: (
    meetingId: string,
    participants: MeetingParticipant[],
  ) => void;
  addMeetingParticipant: (
    meetingId: string,
    participant: MeetingParticipant,
  ) => void;
  removeMeetingParticipant: (meetingId: string, participantId: string) => void;
  updateMeetingParticipant: (
    meetingId: string,
    participantId: string,
    updates: Partial<MeetingParticipant>,
  ) => void;

  // Filters and sorting
  setFilters: (filters: MeetingFilters) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: MeetingSortBy) => void;
  setSortOrder: (order: SortOrder) => void;

  // Selection
  selectMeeting: (meetingId: string) => void;
  deselectMeeting: (meetingId: string) => void;
  selectAllMeetings: () => void;
  deselectAllMeetings: () => void;
  toggleMeetingSelection: (meetingId: string) => void;

  // Calendar
  setCalendarViewDate: (date: Date) => void;
  setCalendarViewMode: (mode: "day" | "week" | "month") => void;
  navigateCalendar: (direction: "prev" | "next") => void;
  goToToday: () => void;

  // Modals
  openScheduler: (editingId?: string) => void;
  closeScheduler: () => void;
  openJoinModal: () => void;
  closeJoinModal: () => void;
  setJoinMeetingCode: (code: string) => void;

  // Loading and error
  setLoading: (loading: boolean) => void;
  setLoadingMeeting: (meetingId: string | null) => void;
  setJoining: (joining: boolean) => void;
  setCreating: (creating: boolean) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: string | null) => void;

  // Utility
  reset: () => void;
}

export type MeetingStore = MeetingState & MeetingActions;

// ============================================================================
// Initial State
// ============================================================================

const initialLocalUserState: LocalUserState = {
  isMuted: true,
  isVideoOn: false,
  isScreenSharing: false,
  isHandRaised: false,
  selectedAudioInput: null,
  selectedAudioOutput: null,
  selectedVideoInput: null,
};

const initialState: MeetingState = {
  meetings: new Map(),
  meetingsByCode: new Map(),
  activeMeetingId: null,
  activeHuddleId: null,
  huddles: new Map(),
  channelHuddles: new Map(),
  roomState: null,
  filters: {},
  sortBy: "scheduledStartAt",
  sortOrder: "asc",
  selectedMeetingIds: new Set(),
  calendarViewDate: new Date(),
  calendarViewMode: "month",
  isSchedulerOpen: false,
  editingMeetingId: null,
  isJoinModalOpen: false,
  joinMeetingCode: "",
  isLoading: false,
  isLoadingMeeting: null,
  isJoining: false,
  isCreating: false,
  error: null,
  hasMore: false,
  cursor: null,
};

// ============================================================================
// Store
// ============================================================================

export const useMeetingStore = create<MeetingStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Meeting CRUD
        setMeetings: (meetings) =>
          set(
            (state) => {
              state.meetings = new Map(meetings.map((m) => [m.id, m]));
              state.meetingsByCode = new Map(
                meetings.map((m) => [m.meetingCode, m.id]),
              );
            },
            false,
            "meeting/setMeetings",
          ),

        addMeeting: (meeting) =>
          set(
            (state) => {
              state.meetings.set(meeting.id, meeting);
              state.meetingsByCode.set(meeting.meetingCode, meeting.id);
            },
            false,
            "meeting/addMeeting",
          ),

        updateMeeting: (meetingId, updates) =>
          set(
            (state) => {
              const meeting = state.meetings.get(meetingId);
              if (meeting) {
                const oldCode = meeting.meetingCode;
                const updatedMeeting = {
                  ...meeting,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                state.meetings.set(meetingId, updatedMeeting);

                if (updates.meetingCode && updates.meetingCode !== oldCode) {
                  state.meetingsByCode.delete(oldCode);
                  state.meetingsByCode.set(updates.meetingCode, meetingId);
                }
              }
            },
            false,
            "meeting/updateMeeting",
          ),

        removeMeeting: (meetingId) =>
          set(
            (state) => {
              const meeting = state.meetings.get(meetingId);
              if (meeting) {
                state.meetings.delete(meetingId);
                state.meetingsByCode.delete(meeting.meetingCode);
                state.selectedMeetingIds.delete(meetingId);

                if (state.activeMeetingId === meetingId) {
                  state.activeMeetingId = null;
                  state.roomState = null;
                }
              }
            },
            false,
            "meeting/removeMeeting",
          ),

        getMeetingById: (meetingId) => get().meetings.get(meetingId),

        getMeetingByCode: (code) => {
          const meetingId = get().meetingsByCode.get(code);
          return meetingId ? get().meetings.get(meetingId) : undefined;
        },

        // Active meeting
        setActiveMeeting: (meetingId) =>
          set(
            (state) => {
              state.activeMeetingId = meetingId;
            },
            false,
            "meeting/setActiveMeeting",
          ),

        joinMeeting: (meetingId) =>
          set(
            (state) => {
              state.activeMeetingId = meetingId;
              state.isJoining = false;

              // Initialize room state
              state.roomState = {
                meetingId,
                isConnected: false,
                isConnecting: true,
                connectionError: null,
                localUser: { ...initialLocalUserState },
                remoteParticipants: [],
                activeSpeakerId: null,
                screenShareUserId: null,
                recordingStatus: "none",
                chatMessages: [],
                unreadChatCount: 0,
              };
            },
            false,
            "meeting/joinMeeting",
          ),

        leaveMeeting: () =>
          set(
            (state) => {
              state.activeMeetingId = null;
              state.roomState = null;
            },
            false,
            "meeting/leaveMeeting",
          ),

        endMeeting: (meetingId) =>
          set(
            (state) => {
              const meeting = state.meetings.get(meetingId);
              if (meeting) {
                meeting.status = "ended";
                meeting.actualEndAt = new Date().toISOString();
              }

              if (state.activeMeetingId === meetingId) {
                state.activeMeetingId = null;
                state.roomState = null;
              }
            },
            false,
            "meeting/endMeeting",
          ),

        // Huddles
        setHuddles: (huddles) =>
          set(
            (state) => {
              state.huddles = new Map(huddles.map((h) => [h.id, h]));
              state.channelHuddles = new Map(
                huddles
                  .filter((h) => h.status === "active")
                  .map((h) => [h.channelId, h.id]),
              );
            },
            false,
            "meeting/setHuddles",
          ),

        startHuddle: (channelId, roomType) =>
          set(
            (state) => {
              const huddleId = `huddle-${Date.now()}`;
              const huddle: Huddle = {
                id: huddleId,
                channelId,
                roomType,
                status: "active",
                hostId: "", // Will be set by server
                hostName: "",
                hostAvatarUrl: null,
                participants: [],
                participantCount: 0,
                maxParticipants: 15,
                startedAt: new Date().toISOString(),
                endedAt: null,
              };

              state.huddles.set(huddleId, huddle);
              state.channelHuddles.set(channelId, huddleId);
              state.activeHuddleId = huddleId;
            },
            false,
            "meeting/startHuddle",
          ),

        joinHuddle: (huddleId) =>
          set(
            (state) => {
              state.activeHuddleId = huddleId;
            },
            false,
            "meeting/joinHuddle",
          ),

        leaveHuddle: () =>
          set(
            (state) => {
              state.activeHuddleId = null;
            },
            false,
            "meeting/leaveHuddle",
          ),

        endHuddle: (huddleId) =>
          set(
            (state) => {
              const huddle = state.huddles.get(huddleId);
              if (huddle) {
                huddle.status = "ended";
                huddle.endedAt = new Date().toISOString();
                state.channelHuddles.delete(huddle.channelId);
              }

              if (state.activeHuddleId === huddleId) {
                state.activeHuddleId = null;
              }
            },
            false,
            "meeting/endHuddle",
          ),

        getChannelHuddle: (channelId) => {
          const huddleId = get().channelHuddles.get(channelId);
          return huddleId ? get().huddles.get(huddleId) : undefined;
        },

        // Room state
        initRoomState: (meetingId) =>
          set(
            (state) => {
              state.roomState = {
                meetingId,
                isConnected: false,
                isConnecting: true,
                connectionError: null,
                localUser: { ...initialLocalUserState },
                remoteParticipants: [],
                activeSpeakerId: null,
                screenShareUserId: null,
                recordingStatus: "none",
                chatMessages: [],
                unreadChatCount: 0,
              };
            },
            false,
            "meeting/initRoomState",
          ),

        clearRoomState: () =>
          set(
            (state) => {
              state.roomState = null;
            },
            false,
            "meeting/clearRoomState",
          ),

        setConnected: (connected) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.isConnected = connected;
                state.roomState.isConnecting = false;
              }
            },
            false,
            "meeting/setConnected",
          ),

        setConnectionError: (error) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.connectionError = error;
                state.roomState.isConnecting = false;
              }
            },
            false,
            "meeting/setConnectionError",
          ),

        // Local user controls
        toggleMute: () =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.localUser.isMuted =
                  !state.roomState.localUser.isMuted;
              }
            },
            false,
            "meeting/toggleMute",
          ),

        toggleVideo: () =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.localUser.isVideoOn =
                  !state.roomState.localUser.isVideoOn;
              }
            },
            false,
            "meeting/toggleVideo",
          ),

        toggleScreenShare: () =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.localUser.isScreenSharing =
                  !state.roomState.localUser.isScreenSharing;
              }
            },
            false,
            "meeting/toggleScreenShare",
          ),

        toggleHandRaise: () =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.localUser.isHandRaised =
                  !state.roomState.localUser.isHandRaised;
              }
            },
            false,
            "meeting/toggleHandRaise",
          ),

        setAudioInput: (deviceId) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.localUser.selectedAudioInput = deviceId;
              }
            },
            false,
            "meeting/setAudioInput",
          ),

        setAudioOutput: (deviceId) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.localUser.selectedAudioOutput = deviceId;
              }
            },
            false,
            "meeting/setAudioOutput",
          ),

        setVideoInput: (deviceId) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.localUser.selectedVideoInput = deviceId;
              }
            },
            false,
            "meeting/setVideoInput",
          ),

        // Remote participants
        addParticipant: (participant) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.remoteParticipants.push(participant);
              }
            },
            false,
            "meeting/addParticipant",
          ),

        removeParticipant: (peerId) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.remoteParticipants =
                  state.roomState.remoteParticipants.filter(
                    (p) => p.peerId !== peerId,
                  );
                if (state.roomState.activeSpeakerId === peerId) {
                  state.roomState.activeSpeakerId = null;
                }
                if (state.roomState.screenShareUserId === peerId) {
                  state.roomState.screenShareUserId = null;
                }
              }
            },
            false,
            "meeting/removeParticipant",
          ),

        updateParticipant: (peerId, updates) =>
          set(
            (state) => {
              if (state.roomState) {
                const participant = state.roomState.remoteParticipants.find(
                  (p) => p.peerId === peerId,
                );
                if (participant) {
                  Object.assign(participant, updates);
                }
              }
            },
            false,
            "meeting/updateParticipant",
          ),

        setActiveSpeaker: (peerId) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.activeSpeakerId = peerId;
              }
            },
            false,
            "meeting/setActiveSpeaker",
          ),

        setScreenSharer: (peerId) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.screenShareUserId = peerId;
              }
            },
            false,
            "meeting/setScreenSharer",
          ),

        // Room chat
        addChatMessage: (message) =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.chatMessages.push(message);
                state.roomState.unreadChatCount++;
              }
            },
            false,
            "meeting/addChatMessage",
          ),

        markChatRead: () =>
          set(
            (state) => {
              if (state.roomState) {
                state.roomState.unreadChatCount = 0;
              }
            },
            false,
            "meeting/markChatRead",
          ),

        // Participants management
        updateMeetingParticipants: (meetingId, participants) =>
          set(
            (state) => {
              const meeting = state.meetings.get(meetingId);
              if (meeting) {
                meeting.participants = participants;
                meeting.participantCount = participants.length;
              }
            },
            false,
            "meeting/updateMeetingParticipants",
          ),

        addMeetingParticipant: (meetingId, participant) =>
          set(
            (state) => {
              const meeting = state.meetings.get(meetingId);
              if (meeting) {
                meeting.participants.push(participant);
                meeting.participantCount++;
              }
            },
            false,
            "meeting/addMeetingParticipant",
          ),

        removeMeetingParticipant: (meetingId, participantId) =>
          set(
            (state) => {
              const meeting = state.meetings.get(meetingId);
              if (meeting) {
                meeting.participants = meeting.participants.filter(
                  (p) => p.id !== participantId,
                );
                meeting.participantCount = meeting.participants.length;
              }
            },
            false,
            "meeting/removeMeetingParticipant",
          ),

        updateMeetingParticipant: (meetingId, participantId, updates) =>
          set(
            (state) => {
              const meeting = state.meetings.get(meetingId);
              if (meeting) {
                const participant = meeting.participants.find(
                  (p) => p.id === participantId,
                );
                if (participant) {
                  Object.assign(participant, updates);
                }
              }
            },
            false,
            "meeting/updateMeetingParticipant",
          ),

        // Filters and sorting
        setFilters: (filters) =>
          set(
            (state) => {
              state.filters = filters;
            },
            false,
            "meeting/setFilters",
          ),

        clearFilters: () =>
          set(
            (state) => {
              state.filters = {};
            },
            false,
            "meeting/clearFilters",
          ),

        setSortBy: (sortBy) =>
          set(
            (state) => {
              state.sortBy = sortBy;
            },
            false,
            "meeting/setSortBy",
          ),

        setSortOrder: (order) =>
          set(
            (state) => {
              state.sortOrder = order;
            },
            false,
            "meeting/setSortOrder",
          ),

        // Selection
        selectMeeting: (meetingId) =>
          set(
            (state) => {
              state.selectedMeetingIds.add(meetingId);
            },
            false,
            "meeting/selectMeeting",
          ),

        deselectMeeting: (meetingId) =>
          set(
            (state) => {
              state.selectedMeetingIds.delete(meetingId);
            },
            false,
            "meeting/deselectMeeting",
          ),

        selectAllMeetings: () =>
          set(
            (state) => {
              state.selectedMeetingIds = new Set(state.meetings.keys());
            },
            false,
            "meeting/selectAllMeetings",
          ),

        deselectAllMeetings: () =>
          set(
            (state) => {
              state.selectedMeetingIds = new Set();
            },
            false,
            "meeting/deselectAllMeetings",
          ),

        toggleMeetingSelection: (meetingId) =>
          set(
            (state) => {
              if (state.selectedMeetingIds.has(meetingId)) {
                state.selectedMeetingIds.delete(meetingId);
              } else {
                state.selectedMeetingIds.add(meetingId);
              }
            },
            false,
            "meeting/toggleMeetingSelection",
          ),

        // Calendar
        setCalendarViewDate: (date) =>
          set(
            (state) => {
              state.calendarViewDate = date;
            },
            false,
            "meeting/setCalendarViewDate",
          ),

        setCalendarViewMode: (mode) =>
          set(
            (state) => {
              state.calendarViewMode = mode;
            },
            false,
            "meeting/setCalendarViewMode",
          ),

        navigateCalendar: (direction) =>
          set(
            (state) => {
              const current = new Date(state.calendarViewDate);
              const delta = direction === "prev" ? -1 : 1;

              switch (state.calendarViewMode) {
                case "day":
                  current.setDate(current.getDate() + delta);
                  break;
                case "week":
                  current.setDate(current.getDate() + delta * 7);
                  break;
                case "month":
                  current.setMonth(current.getMonth() + delta);
                  break;
              }

              state.calendarViewDate = current;
            },
            false,
            "meeting/navigateCalendar",
          ),

        goToToday: () =>
          set(
            (state) => {
              state.calendarViewDate = new Date();
            },
            false,
            "meeting/goToToday",
          ),

        // Modals
        openScheduler: (editingId) =>
          set(
            (state) => {
              state.isSchedulerOpen = true;
              state.editingMeetingId = editingId || null;
            },
            false,
            "meeting/openScheduler",
          ),

        closeScheduler: () =>
          set(
            (state) => {
              state.isSchedulerOpen = false;
              state.editingMeetingId = null;
            },
            false,
            "meeting/closeScheduler",
          ),

        openJoinModal: () =>
          set(
            (state) => {
              state.isJoinModalOpen = true;
            },
            false,
            "meeting/openJoinModal",
          ),

        closeJoinModal: () =>
          set(
            (state) => {
              state.isJoinModalOpen = false;
              state.joinMeetingCode = "";
            },
            false,
            "meeting/closeJoinModal",
          ),

        setJoinMeetingCode: (code) =>
          set(
            (state) => {
              state.joinMeetingCode = code;
            },
            false,
            "meeting/setJoinMeetingCode",
          ),

        // Loading and error
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "meeting/setLoading",
          ),

        setLoadingMeeting: (meetingId) =>
          set(
            (state) => {
              state.isLoadingMeeting = meetingId;
            },
            false,
            "meeting/setLoadingMeeting",
          ),

        setJoining: (joining) =>
          set(
            (state) => {
              state.isJoining = joining;
            },
            false,
            "meeting/setJoining",
          ),

        setCreating: (creating) =>
          set(
            (state) => {
              state.isCreating = creating;
            },
            false,
            "meeting/setCreating",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "meeting/setError",
          ),

        // Pagination
        setHasMore: (hasMore) =>
          set(
            (state) => {
              state.hasMore = hasMore;
            },
            false,
            "meeting/setHasMore",
          ),

        setCursor: (cursor) =>
          set(
            (state) => {
              state.cursor = cursor;
            },
            false,
            "meeting/setCursor",
          ),

        // Utility
        reset: () =>
          set(
            () => ({
              ...initialState,
              meetings: new Map(),
              meetingsByCode: new Map(),
              huddles: new Map(),
              channelHuddles: new Map(),
              selectedMeetingIds: new Set(),
              calendarViewDate: new Date(),
            }),
            false,
            "meeting/reset",
          ),
      })),
    ),
    { name: "meeting-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectActiveMeeting = (state: MeetingStore) =>
  state.activeMeetingId ? state.meetings.get(state.activeMeetingId) : undefined;

export const selectActiveHuddle = (state: MeetingStore) =>
  state.activeHuddleId ? state.huddles.get(state.activeHuddleId) : undefined;

export const selectMeetingList = (state: MeetingStore) =>
  Array.from(state.meetings.values());

export const selectUpcomingMeetings = (state: MeetingStore) =>
  Array.from(state.meetings.values())
    .filter(
      (m) =>
        m.status === "scheduled" && new Date(m.scheduledStartAt) > new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledStartAt).getTime() -
        new Date(b.scheduledStartAt).getTime(),
    );

export const selectPastMeetings = (state: MeetingStore) =>
  Array.from(state.meetings.values())
    .filter(
      (m) => m.status === "ended" || new Date(m.scheduledEndAt) < new Date(),
    )
    .sort(
      (a, b) =>
        new Date(b.scheduledStartAt).getTime() -
        new Date(a.scheduledStartAt).getTime(),
    );

export const selectLiveMeetings = (state: MeetingStore) =>
  Array.from(state.meetings.values()).filter((m) => m.status === "live");

export const selectMeetingsByDate = (date: string) => (state: MeetingStore) => {
  const targetDate = new Date(date).toDateString();
  return Array.from(state.meetings.values()).filter(
    (m) => new Date(m.scheduledStartAt).toDateString() === targetDate,
  );
};

export const selectMeetingsForChannel =
  (channelId: string) => (state: MeetingStore) =>
    Array.from(state.meetings.values()).filter(
      (m) => m.channelId === channelId,
    );

export const selectActiveHuddles = (state: MeetingStore) =>
  Array.from(state.huddles.values()).filter((h) => h.status === "active");

export const selectRoomState = (state: MeetingStore) => state.roomState;

export const selectLocalUser = (state: MeetingStore) =>
  state.roomState?.localUser;

export const selectRemoteParticipants = (state: MeetingStore) =>
  state.roomState?.remoteParticipants ?? [];

export const selectIsInMeeting = (state: MeetingStore) =>
  state.activeMeetingId !== null || state.activeHuddleId !== null;

export const selectSelectedMeetingCount = (state: MeetingStore) =>
  state.selectedMeetingIds.size;

export const selectHasFilters = (state: MeetingStore) =>
  Object.keys(state.filters).some((key) => {
    const value = state.filters[key as keyof MeetingFilters];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  });

export const selectFilteredMeetings = (state: MeetingStore) => {
  let meetings = Array.from(state.meetings.values());

  // Apply filters
  if (state.filters.status?.length) {
    meetings = meetings.filter((m) => state.filters.status!.includes(m.status));
  }
  if (state.filters.type?.length) {
    meetings = meetings.filter((m) => state.filters.type!.includes(m.type));
  }
  if (state.filters.channelId) {
    meetings = meetings.filter((m) => m.channelId === state.filters.channelId);
  }
  if (state.filters.hostId) {
    meetings = meetings.filter((m) => m.hostId === state.filters.hostId);
  }
  if (state.filters.search) {
    const search = state.filters.search.toLowerCase();
    meetings = meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search),
    );
  }
  if (state.filters.dateRange) {
    const start = new Date(state.filters.dateRange.start);
    const end = new Date(state.filters.dateRange.end);
    meetings = meetings.filter((m) => {
      const date = new Date(m.scheduledStartAt);
      return date >= start && date <= end;
    });
  }

  // Apply sorting
  meetings.sort((a, b) => {
    let comparison = 0;
    switch (state.sortBy) {
      case "scheduledStartAt":
        comparison =
          new Date(a.scheduledStartAt).getTime() -
          new Date(b.scheduledStartAt).getTime();
        break;
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "participantCount":
        comparison = a.participantCount - b.participantCount;
        break;
    }
    return state.sortOrder === "desc" ? -comparison : comparison;
  });

  return meetings;
};
