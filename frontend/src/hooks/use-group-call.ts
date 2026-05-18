/**
 * useGroupCall Hook
 *
 * React hook for managing group calls with full participant management,
 * host controls, role assignments, lobby, layout options, and large room support.
 */

"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  GroupCallService,
  createGroupCallService,
  type GroupCallType,
  type GroupCallStatus,
  type GroupCallParticipant,
  type GroupCallInfo,
  type GroupCallMetrics,
  type ParticipantRole,
  type LayoutType,
} from "@/services/calls/group-call.service";

// =============================================================================
// Types
// =============================================================================

export interface UseGroupCallOptions {
  maxParticipants?: number;
  enableLobby?: boolean;
  autoAdmitDomains?: string[];
  muteOnEntry?: boolean;
  videoOffOnEntry?: boolean;
  allowParticipantScreenShare?: boolean;
  allowParticipantUnmute?: boolean;
  recordCall?: boolean;
  enableNotifications?: boolean;
}

export interface UseGroupCallReturn {
  // State
  isInCall: boolean;
  callInfo: GroupCallInfo | null;
  callStatus: GroupCallStatus;
  callType: GroupCallType | null;
  callDuration: number;

  // Participants
  participants: GroupCallParticipant[];
  participantCount: number;
  lobbyParticipants: GroupCallParticipant[];
  lobbyCount: number;

  // Local user state
  isHost: boolean;
  isCoHost: boolean;
  canManageParticipants: boolean;
  myRole: ParticipantRole | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  localStream: MediaStream | null;

  // Active speaker
  activeSpeakerId: string | null;
  activeSpeaker: GroupCallParticipant | null;

  // Layout
  layout: LayoutType;
  pinnedParticipantId: string | null;
  spotlightParticipantIds: string[];
  layoutParticipants: GroupCallParticipant[];

  // Large room
  isLargeRoom: boolean;
  currentPage: number;
  totalPages: number;
  pageParticipants: GroupCallParticipant[];

  // Room state
  isLocked: boolean;
  isRecording: boolean;
  joinLink: string | null;

  // Metrics
  metrics: GroupCallMetrics;

  // Call Actions
  createCall: (
    type: GroupCallType,
    options?: {
      channelId?: string;
      title?: string;
      description?: string;
      scheduledStartTime?: Date;
      scheduledEndTime?: Date;
      enableLobby?: boolean;
    },
  ) => Promise<string>;
  joinCall: (
    callId: string,
    type: GroupCallType,
    options?: { channelId?: string },
  ) => Promise<void>;
  leaveCall: () => void;
  endCallForEveryone: () => Promise<void>;

  // Host Controls
  muteAllParticipants: (except?: string[]) => Promise<void>;
  unmuteAllParticipants: () => Promise<void>;
  muteParticipant: (participantId: string) => Promise<void>;
  removeParticipant: (participantId: string, reason?: string) => Promise<void>;
  lockRoom: () => Promise<void>;
  unlockRoom: () => Promise<void>;
  transferHost: (newHostId: string) => Promise<void>;

  // Role Controls
  setParticipantRole: (
    participantId: string,
    role: ParticipantRole,
  ) => Promise<void>;
  promoteToCoHost: (participantId: string) => Promise<void>;
  demoteFromCoHost: (participantId: string) => Promise<void>;
  makeViewer: (participantId: string) => Promise<void>;
  getParticipantRole: (participantId: string) => ParticipantRole | null;

  // Lobby Controls
  admitFromLobby: (participantId: string) => Promise<void>;
  admitAllFromLobby: () => Promise<void>;
  denyFromLobby: (participantId: string, reason?: string) => Promise<void>;
  denyAllFromLobby: (reason?: string) => Promise<void>;
  setAutoAdmit: (enabled: boolean, domains?: string[]) => void;

  // Layout Controls
  setLayout: (layout: LayoutType) => void;
  pinParticipant: (participantId: string) => void;
  unpinParticipant: () => void;
  spotlightParticipant: (participantId: string) => void;
  removeSpotlight: (participantId: string) => void;
  hideNonVideoParticipants: (hide: boolean) => void;

  // Pagination
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;

  // Media Controls
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  toggleVideo: () => void;
  setVideoEnabled: (enabled: boolean) => void;
  toggleScreenShare: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  raiseHand: () => void;
  lowerHand: () => void;
  lowerParticipantHand: (participantId: string) => void;

  // Recording
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;

  // Remote Streams
  getParticipantStream: (participantId: string) => MediaStream | undefined;

  // Error
  error: string | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useGroupCall(
  options: UseGroupCallOptions = {},
): UseGroupCallReturn {
  const {
    maxParticipants = 100,
    enableLobby = false,
    autoAdmitDomains = [],
    muteOnEntry = false,
    videoOffOnEntry = false,
    allowParticipantScreenShare = true,
    allowParticipantUnmute = true,
    recordCall = false,
    enableNotifications = true,
  } = options;

  // Auth
  const { user } = useAuth();
  const { toast } = useToast();

  // Service ref
  const serviceRef = useRef<GroupCallService | null>(null);

  // State
  const [callInfo, setCallInfo] = useState<GroupCallInfo | null>(null);
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([]);
  const [lobbyParticipants, setLobbyParticipants] = useState<
    GroupCallParticipant[]
  >([]);
  const [isMuted, setIsMuted] = useState(muteOnEntry);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!videoOffOnEntry);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [layout, setLayoutState] = useState<LayoutType>("grid");
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(
    null,
  );
  const [spotlightParticipantIds, setSpotlightParticipantIds] = useState<
    string[]
  >([]);
  const [isLocked, setIsLocked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hideNonVideo, setHideNonVideo] = useState(false);
  const [metrics, setMetrics] = useState<GroupCallMetrics>({
    duration: 0,
    participantCount: 0,
    peakParticipantCount: 0,
    totalJoins: 0,
    totalLeaves: 0,
    averageCallQuality: 100,
    networkIssues: 0,
  });
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Duration interval
  const durationIntervalRef = useRef<number | null>(null);

  // Derived state
  const isInCall = useMemo(
    () => callInfo !== null && !["idle", "ended"].includes(callInfo.status),
    [callInfo],
  );

  const callStatus = useMemo(() => callInfo?.status ?? "idle", [callInfo]);

  const callType = useMemo(() => callInfo?.type ?? null, [callInfo]);

  const isHost = useMemo(
    () => callInfo?.hostId === user?.id,
    [callInfo, user?.id],
  );

  const isCoHost = useMemo(() => {
    const participant = participants.find((p) => p.id === user?.id);
    return participant?.role === "co-host";
  }, [participants, user?.id]);

  const canManageParticipants = useMemo(
    () => isHost || isCoHost,
    [isHost, isCoHost],
  );

  const myRole = useMemo(() => {
    const participant = participants.find((p) => p.id === user?.id);
    return participant?.role ?? null;
  }, [participants, user?.id]);

  const participantCount = useMemo(() => participants.length, [participants]);

  const lobbyCount = useMemo(
    () => lobbyParticipants.length,
    [lobbyParticipants],
  );

  const activeSpeaker = useMemo(
    () => participants.find((p) => p.id === activeSpeakerId) ?? null,
    [participants, activeSpeakerId],
  );

  const isLargeRoom = useMemo(() => participantCount >= 50, [participantCount]);

  const PARTICIPANT_PAGE_SIZE = 20;

  const totalPages = useMemo(
    () => Math.ceil(participantCount / PARTICIPANT_PAGE_SIZE),
    [participantCount],
  );

  const layoutParticipants = useMemo(() => {
    let sorted = [...participants];

    // Filter non-video participants if hidden
    if (hideNonVideo) {
      sorted = sorted.filter((p) => p.isVideoEnabled || p.id === user?.id);
    }

    switch (layout) {
      case "speaker":
        return sorted.sort((a, b) => {
          if (a.id === activeSpeakerId) return -1;
          if (b.id === activeSpeakerId) return 1;
          return b.audioLevel - a.audioLevel;
        });

      case "spotlight":
        return sorted.sort((a, b) => {
          if (a.isSpotlight && !b.isSpotlight) return -1;
          if (!a.isSpotlight && b.isSpotlight) return 1;
          return 0;
        });

      case "sidebar":
        return sorted.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.id === activeSpeakerId) return -1;
          if (b.id === activeSpeakerId) return 1;
          return 0;
        });

      case "grid":
      default:
        return sorted.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.joinedAt.getTime() - b.joinedAt.getTime();
        });
    }
  }, [participants, layout, activeSpeakerId, hideNonVideo, user?.id]);

  const pageParticipants = useMemo(() => {
    const start = currentPage * PARTICIPANT_PAGE_SIZE;
    const end = start + PARTICIPANT_PAGE_SIZE;
    return layoutParticipants.slice(start, end);
  }, [layoutParticipants, currentPage]);

  // ===========================================================================
  // Initialize Service
  // ===========================================================================

  useEffect(() => {
    if (!user) return;

    const service = createGroupCallService({
      userId: user.id,
      userName: user.displayName || user.email || "User",
      userAvatarUrl: user.avatarUrl,
      maxParticipants,
      enableLobby,
      autoAdmitDomains,
      muteOnEntry,
      videoOffOnEntry,
      allowParticipantScreenShare,
      allowParticipantUnmute,
      recordCall,
      onCallStateChange: (status, _previousStatus) => {
        setCallInfo((prev) => (prev ? { ...prev, status } : null));

        if (status === "connected") {
          // Start duration timer
          durationIntervalRef.current = window.setInterval(() => {
            setCallDuration((d) => d + 1);
          }, 1000);
        }

        if (status === "ended") {
          // Stop duration timer
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
        }
      },
      onParticipantJoined: (participant) => {
        setParticipants((prev) => [...prev, participant]);

        if (enableNotifications) {
          toast({
            title: "Participant Joined",
            description: `${participant.name} has joined the call`,
          });
        }
      },
      onParticipantLeft: (participant, reason) => {
        setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(participant.id);
          return next;
        });

        if (enableNotifications) {
          toast({
            title: "Participant Left",
            description: `${participant.name} has left the call${reason ? `: ${reason}` : ""}`,
          });
        }
      },
      onLobbyUpdate: (lobbyList) => {
        setLobbyParticipants(lobbyList);

        if (enableNotifications && lobbyList.length > 0) {
          toast({
            title: "Waiting in Lobby",
            description: `${lobbyList.length} participant(s) waiting to join`,
          });
        }
      },
      onRoleChanged: (participantId, newRole, _oldRole) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, role: newRole } : p,
          ),
        );
      },
      onHostTransferred: (newHostId) => {
        setCallInfo((prev) => (prev ? { ...prev, hostId: newHostId } : null));

        if (enableNotifications && newHostId === user.id) {
          toast({
            title: "You are now the host",
            description: "Host controls have been transferred to you",
          });
        }
      },
      onParticipantMediaChange: (participantId, mediaState) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  isMuted: mediaState.isMuted,
                  isVideoEnabled: mediaState.isVideoEnabled,
                }
              : p,
          ),
        );
      },
      onActiveSpeakerChange: (speakerId) => {
        setActiveSpeakerId(speakerId);
      },
      onLayoutChange: (newLayout) => {
        setLayoutState(newLayout);
      },
      onRecordingStatusChange: (recording) => {
        setIsRecording(recording);

        if (enableNotifications) {
          toast({
            title: recording ? "Recording Started" : "Recording Stopped",
            description: recording
              ? "This call is now being recorded"
              : "Call recording has stopped",
          });
        }
      },
      onCallLockChange: (locked) => {
        setIsLocked(locked);
      },
      onHandRaised: (participantId) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, isHandRaised: true } : p,
          ),
        );

        if (enableNotifications && participantId !== user.id) {
          const participant = participants.find((p) => p.id === participantId);
          toast({
            title: "Hand Raised",
            description: `${participant?.name || "A participant"} raised their hand`,
          });
        }
      },
      onError: (err) => {
        setError(err.message);
        toast({
          title: "Call Error",
          description: err.message,
          variant: "destructive",
        });
      },
      onReconnecting: (attempt, maxAttempts) => {
        if (enableNotifications) {
          toast({
            title: "Reconnecting",
            description: `Attempt ${attempt} of ${maxAttempts}`,
          });
        }
      },
    });

    // Set up event listeners
    service.on("local-stream-ready", ({ stream }: { stream: MediaStream }) => {
      setLocalStream(stream);
    });

    service.on(
      "remote-stream",
      ({
        participantId,
        stream,
      }: {
        participantId: string;
        stream: MediaStream;
      }) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(participantId, stream);
          return next;
        });
      },
    );

    service.on(
      "local-mute-change",
      ({ isMuted: muted }: { isMuted: boolean }) => {
        setIsMuted(muted);
      },
    );

    service.on(
      "local-video-change",
      ({ isVideoEnabled: enabled }: { isVideoEnabled: boolean }) => {
        setIsVideoEnabled(enabled);
      },
    );

    service.on("screen-share-started", () => {
      setIsScreenSharing(true);
    });

    service.on("screen-share-stopped", () => {
      setIsScreenSharing(false);
    });

    service.on(
      "hand-raised",
      ({ participantId }: { participantId: string }) => {
        if (participantId === user.id) {
          setIsHandRaised(true);
        }
      },
    );

    service.on(
      "hand-lowered",
      ({ participantId }: { participantId: string }) => {
        if (participantId === user.id) {
          setIsHandRaised(false);
        }
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, isHandRaised: false } : p,
          ),
        );
      },
    );

    service.on(
      "participant-pinned",
      ({ participantId }: { participantId: string }) => {
        setPinnedParticipantId(participantId);
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            isPinned: p.id === participantId,
          })),
        );
      },
    );

    service.on("participant-unpinned", () => {
      setPinnedParticipantId(null);
      setParticipants((prev) => prev.map((p) => ({ ...p, isPinned: false })));
    });

    service.on(
      "participant-spotlighted",
      ({ participantId }: { participantId: string }) => {
        setSpotlightParticipantIds((prev) => [...prev, participantId]);
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, isSpotlight: true } : p,
          ),
        );
      },
    );

    service.on(
      "spotlight-removed",
      ({ participantId }: { participantId: string }) => {
        setSpotlightParticipantIds((prev) =>
          prev.filter((id) => id !== participantId),
        );
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, isSpotlight: false } : p,
          ),
        );
      },
    );

    service.on(
      "call-created",
      ({ callId, joinLink }: { callId: string; joinLink: string }) => {
        setCallInfo((prev) =>
          prev ? { ...prev, id: callId, joinLink } : null,
        );
      },
    );

    service.on("call-ended", () => {
      // Reset all state
      setCallInfo(null);
      setParticipants([]);
      setLobbyParticipants([]);
      setRemoteStreams(new Map());
      setLocalStream(null);
      setIsMuted(muteOnEntry);
      setIsVideoEnabled(!videoOffOnEntry);
      setIsScreenSharing(false);
      setIsHandRaised(false);
      setActiveSpeakerId(null);
      setLayoutState("grid");
      setPinnedParticipantId(null);
      setSpotlightParticipantIds([]);
      setIsLocked(false);
      setIsRecording(false);
      setCurrentPage(0);
      setCallDuration(0);
      setMetrics({
        duration: 0,
        participantCount: 0,
        peakParticipantCount: 0,
        totalJoins: 0,
        totalLeaves: 0,
        averageCallQuality: 100,
        networkIssues: 0,
      });
    });

    // Initialize service
    service.initialize();

    serviceRef.current = service;

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      service.destroy();
      serviceRef.current = null;
    };
  }, [
    user,
    maxParticipants,
    enableLobby,
    autoAdmitDomains,
    muteOnEntry,
    videoOffOnEntry,
    allowParticipantScreenShare,
    allowParticipantUnmute,
    recordCall,
    enableNotifications,
    toast,
    participants,
  ]);

  // Update metrics periodically
  useEffect(() => {
    if (!serviceRef.current) return;

    const interval = setInterval(() => {
      if (serviceRef.current) {
        setMetrics(serviceRef.current.callMetrics);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ===========================================================================
  // Call Actions
  // ===========================================================================

  const createCall = useCallback(
    async (
      type: GroupCallType,
      callOptions?: {
        channelId?: string;
        title?: string;
        description?: string;
        scheduledStartTime?: Date;
        scheduledEndTime?: Date;
        enableLobby?: boolean;
      },
    ): Promise<string> => {
      if (!serviceRef.current) {
        throw new Error("Service not initialized");
      }

      try {
        setError(null);
        const callId = await serviceRef.current.createGroupCall(
          type,
          callOptions,
        );

        // Update call info
        setCallInfo(serviceRef.current.callInfo);
        setParticipants(
          Array.from(serviceRef.current.callInfo?.participants.values() ?? []),
        );

        toast({
          title: "Call Started",
          description: "Your group call is ready",
        });

        return callId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create call";
        setError(message);
        toast({
          title: "Call Failed",
          description: message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  const joinCall = useCallback(
    async (
      callId: string,
      type: GroupCallType,
      callOptions?: { channelId?: string },
    ): Promise<void> => {
      if (!serviceRef.current) {
        throw new Error("Service not initialized");
      }

      try {
        setError(null);
        await serviceRef.current.joinGroupCall(callId, type, callOptions);

        setCallInfo(serviceRef.current.callInfo);
        setParticipants(
          Array.from(serviceRef.current.callInfo?.participants.values() ?? []),
        );
        setLobbyParticipants(
          Array.from(
            serviceRef.current.callInfo?.lobbyParticipants.values() ?? [],
          ),
        );

        toast({
          title: "Joined Call",
          description: "You have joined the group call",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to join call";
        setError(message);
        toast({
          title: "Join Failed",
          description: message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  const leaveCall = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.leaveCall();
  }, []);

  const endCallForEveryone = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.endCallForEveryone();
  }, []);

  // ===========================================================================
  // Host Controls
  // ===========================================================================

  const muteAllParticipants = useCallback(async (except?: string[]) => {
    if (!serviceRef.current) return;
    await serviceRef.current.muteAllParticipants(except);
  }, []);

  const unmuteAllParticipants = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.unmuteAllParticipants();
  }, []);

  const muteParticipant = useCallback(async (participantId: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.muteParticipant(participantId);
  }, []);

  const removeParticipant = useCallback(
    async (participantId: string, reason?: string) => {
      if (!serviceRef.current) return;
      await serviceRef.current.removeParticipant(participantId, reason);
    },
    [],
  );

  const lockRoom = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.lockRoom();
  }, []);

  const unlockRoom = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.unlockRoom();
  }, []);

  const transferHost = useCallback(async (newHostId: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.transferHost(newHostId);
  }, []);

  // ===========================================================================
  // Role Controls
  // ===========================================================================

  const setParticipantRole = useCallback(
    async (participantId: string, role: ParticipantRole) => {
      if (!serviceRef.current) return;
      await serviceRef.current.setParticipantRole(participantId, role);
    },
    [],
  );

  const promoteToCoHost = useCallback(async (participantId: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.promoteToCoHost(participantId);
  }, []);

  const demoteFromCoHost = useCallback(async (participantId: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.demoteFromCoHost(participantId);
  }, []);

  const makeViewer = useCallback(async (participantId: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.makeViewer(participantId);
  }, []);

  const getParticipantRole = useCallback(
    (participantId: string): ParticipantRole | null => {
      if (!serviceRef.current) return null;
      return serviceRef.current.getParticipantRole(participantId);
    },
    [],
  );

  // ===========================================================================
  // Lobby Controls
  // ===========================================================================

  const admitFromLobby = useCallback(async (participantId: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.admitFromLobby(participantId);
  }, []);

  const admitAllFromLobby = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.admitAllFromLobby();
  }, []);

  const denyFromLobby = useCallback(
    async (participantId: string, reason?: string) => {
      if (!serviceRef.current) return;
      await serviceRef.current.denyFromLobby(participantId, reason);
    },
    [],
  );

  const denyAllFromLobby = useCallback(async (reason?: string) => {
    if (!serviceRef.current) return;
    await serviceRef.current.denyAllFromLobby(reason);
  }, []);

  const setAutoAdmit = useCallback((enabled: boolean, domains?: string[]) => {
    if (!serviceRef.current) return;
    serviceRef.current.setAutoAdmit(enabled, domains);
  }, []);

  // ===========================================================================
  // Layout Controls
  // ===========================================================================

  const setLayout = useCallback((newLayout: LayoutType) => {
    if (!serviceRef.current) return;
    serviceRef.current.setLayout(newLayout);
    setLayoutState(newLayout);
  }, []);

  const pinParticipant = useCallback((participantId: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.pinParticipant(participantId);
  }, []);

  const unpinParticipant = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.unpinParticipant();
  }, []);

  const spotlightParticipant = useCallback((participantId: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.spotlightParticipant(participantId);
  }, []);

  const removeSpotlight = useCallback((participantId: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.removeSpotlight(participantId);
  }, []);

  const hideNonVideoParticipants = useCallback((hide: boolean) => {
    setHideNonVideo(hide);
    if (serviceRef.current) {
      serviceRef.current.hideNonVideoParticipants(hide);
    }
  }, []);

  // ===========================================================================
  // Pagination
  // ===========================================================================

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 0 && page < totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // ===========================================================================
  // Media Controls
  // ===========================================================================

  const toggleMute = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.toggleMute();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (!serviceRef.current) return;
    serviceRef.current.setMuted(muted);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.toggleVideo();
  }, []);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    if (!serviceRef.current) return;
    serviceRef.current.setVideoEnabled(enabled);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!serviceRef.current) return;
    if (isScreenSharing) {
      serviceRef.current.stopScreenShare();
    } else {
      await serviceRef.current.startScreenShare();
    }
  }, [isScreenSharing]);

  const startScreenShare = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.startScreenShare();
  }, []);

  const stopScreenShare = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.stopScreenShare();
  }, []);

  const raiseHand = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.raiseHand();
  }, []);

  const lowerHand = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.lowerHand();
  }, []);

  const lowerParticipantHand = useCallback((participantId: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.lowerParticipantHand(participantId);
  }, []);

  // ===========================================================================
  // Recording
  // ===========================================================================

  const startRecording = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.startRecording();
  }, []);

  const stopRecording = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.stopRecording();
  }, []);

  // ===========================================================================
  // Remote Streams
  // ===========================================================================

  const getParticipantStream = useCallback(
    (participantId: string): MediaStream | undefined => {
      return remoteStreams.get(participantId);
    },
    [remoteStreams],
  );

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    // State
    isInCall,
    callInfo,
    callStatus,
    callType,
    callDuration,

    // Participants
    participants,
    participantCount,
    lobbyParticipants,
    lobbyCount,

    // Local user state
    isHost,
    isCoHost,
    canManageParticipants,
    myRole,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    isHandRaised,
    localStream,

    // Active speaker
    activeSpeakerId,
    activeSpeaker,

    // Layout
    layout,
    pinnedParticipantId,
    spotlightParticipantIds,
    layoutParticipants,

    // Large room
    isLargeRoom,
    currentPage,
    totalPages,
    pageParticipants,

    // Room state
    isLocked,
    isRecording,
    joinLink: callInfo?.joinLink ?? null,

    // Metrics
    metrics,

    // Call Actions
    createCall,
    joinCall,
    leaveCall,
    endCallForEveryone,

    // Host Controls
    muteAllParticipants,
    unmuteAllParticipants,
    muteParticipant,
    removeParticipant,
    lockRoom,
    unlockRoom,
    transferHost,

    // Role Controls
    setParticipantRole,
    promoteToCoHost,
    demoteFromCoHost,
    makeViewer,
    getParticipantRole,

    // Lobby Controls
    admitFromLobby,
    admitAllFromLobby,
    denyFromLobby,
    denyAllFromLobby,
    setAutoAdmit,

    // Layout Controls
    setLayout,
    pinParticipant,
    unpinParticipant,
    spotlightParticipant,
    removeSpotlight,
    hideNonVideoParticipants,

    // Pagination
    goToPage,
    nextPage,
    previousPage,

    // Media Controls
    toggleMute,
    setMuted,
    toggleVideo,
    setVideoEnabled,
    toggleScreenShare,
    startScreenShare,
    stopScreenShare,
    raiseHand,
    lowerHand,
    lowerParticipantHand,

    // Recording
    startRecording,
    stopRecording,

    // Remote Streams
    getParticipantStream,

    // Error
    error,
  };
}

export type {
  GroupCallType,
  GroupCallStatus,
  GroupCallParticipant,
  ParticipantRole,
  LayoutType,
};
