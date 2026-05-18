/**
 * useHuddle Hook
 *
 * React hook for managing lightweight audio-first huddles in channels and DMs.
 * Provides quick join, minimal UI overlay, and seamless chat integration.
 */

"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  HuddleService,
  createHuddleService,
  formatHuddleDuration,
  type HuddleStatus,
  type HuddleType,
  type HuddleParticipant,
  type HuddleInfo,
  type HuddleReaction,
} from "@/services/calls/huddle.service";

// =============================================================================
// Types
// =============================================================================

export interface UseHuddleOptions {
  autoJoinOnInvite?: boolean;
  muteOnJoin?: boolean;
  enableNotifications?: boolean;
}

export interface ActiveHuddle {
  id: string;
  channelId: string;
  channelName?: string;
  participantCount: number;
  participants: HuddleParticipant[];
  duration: number;
  hasScreenShare: boolean;
}

export interface UseHuddleReturn {
  // State
  isInHuddle: boolean;
  huddleInfo: HuddleInfo | null;
  huddleStatus: HuddleStatus;
  huddleType: HuddleType | null;
  duration: number;
  formattedDuration: string;

  // Participants
  participants: HuddleParticipant[];
  participantCount: number;
  activeSpeakerId: string | null;
  activeSpeaker: HuddleParticipant | null;

  // Local user state
  isInitiator: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;

  // Screen share
  screenSharerId: string | null;
  screenSharer: HuddleParticipant | null;

  // Reactions
  recentReactions: HuddleReaction[];

  // Message thread
  messageThreadId: string | null;

  // Huddle Actions
  startHuddle: (
    channelId: string,
    options?: {
      channelName?: string;
      isDM?: boolean;
    },
  ) => Promise<string>;
  joinHuddle: (
    huddleId: string,
    channelId: string,
    options?: {
      channelName?: string;
      isDM?: boolean;
    },
  ) => Promise<void>;
  leaveHuddle: (quiet?: boolean) => void;
  endHuddleForAll: () => void;
  inviteToHuddle: (userId: string) => void;

  // Media Controls
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  toggleVideo: () => void;
  setVideoEnabled: (enabled: boolean) => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;

  // Reactions
  sendReaction: (emoji: string) => void;

  // Message Thread
  createMessageThread: () => void;
  setMessageThreadId: (threadId: string) => void;

  // Remote Streams
  getParticipantStream: (participantId: string) => MediaStream | undefined;

  // Active Huddles (for other channels)
  getActiveHuddleForChannel: (channelId: string) => ActiveHuddle | null;
  activeHuddles: Map<string, ActiveHuddle>;

  // Error
  error: string | null;
}

// =============================================================================
// Active Huddles Store (for displaying huddles in other channels)
// =============================================================================

const activeHuddlesStore = new Map<string, ActiveHuddle>();

// =============================================================================
// Hook
// =============================================================================

export function useHuddle(options: UseHuddleOptions = {}): UseHuddleReturn {
  const {
    autoJoinOnInvite = false,
    muteOnJoin = false,
    enableNotifications = true,
  } = options;

  // Auth
  const { user } = useAuth();
  const { toast } = useToast();

  // Service ref
  const serviceRef = useRef<HuddleService | null>(null);

  // State
  const [huddleInfo, setHuddleInfo] = useState<HuddleInfo | null>(null);
  const [participants, setParticipants] = useState<HuddleParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(muteOnJoin);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [screenSharerId, setScreenSharerId] = useState<string | null>(null);
  const [recentReactions, setRecentReactions] = useState<HuddleReaction[]>([]);
  const [messageThreadId, setMessageThreadIdState] = useState<string | null>(
    null,
  );
  const [duration, setDuration] = useState(0);
  const [activeHuddles, setActiveHuddles] = useState<Map<string, ActiveHuddle>>(
    new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const isInHuddle = useMemo(
    () => huddleInfo !== null && !["idle", "ended"].includes(huddleInfo.status),
    [huddleInfo],
  );

  const huddleStatus = useMemo(
    () => huddleInfo?.status ?? "idle",
    [huddleInfo],
  );

  const huddleType = useMemo(() => huddleInfo?.type ?? null, [huddleInfo]);

  const isInitiator = useMemo(
    () => huddleInfo?.initiatorId === user?.id,
    [huddleInfo, user?.id],
  );

  const participantCount = useMemo(() => participants.length, [participants]);

  const activeSpeaker = useMemo(
    () => participants.find((p) => p.id === activeSpeakerId) ?? null,
    [participants, activeSpeakerId],
  );

  const screenSharer = useMemo(
    () => participants.find((p) => p.id === screenSharerId) ?? null,
    [participants, screenSharerId],
  );

  const formattedDuration = useMemo(
    () => formatHuddleDuration(duration),
    [duration],
  );

  // ===========================================================================
  // Initialize Service
  // ===========================================================================

  useEffect(() => {
    if (!user) return;

    const service = createHuddleService({
      userId: user.id,
      userName: user.displayName || user.email || "User",
      userAvatarUrl: user.avatarUrl,
      autoJoinOnInvite,
      muteOnJoin,
      onStatusChange: (status, _previousStatus) => {
        setHuddleInfo((prev) => (prev ? { ...prev, status } : null));
      },
      onParticipantJoined: (participant) => {
        setParticipants((prev) => [...prev, participant]);

        if (enableNotifications) {
          toast({
            title: "Joined huddle",
            description: `${participant.name} joined`,
          });
        }

        // Update active huddles
        updateActiveHuddleParticipants();
      },
      onParticipantLeft: (participant, reason) => {
        setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(participant.id);
          return next;
        });

        if (enableNotifications && reason !== "connection_failed") {
          toast({
            title: "Left huddle",
            description: `${participant.name} left`,
          });
        }

        // Update active huddles
        updateActiveHuddleParticipants();
      },
      onActiveSpeakerChange: (speakerId) => {
        setActiveSpeakerId(speakerId);
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
      onScreenShareStarted: (participantId) => {
        setScreenSharerId(participantId);
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, isScreenSharing: true } : p,
          ),
        );

        // Update active huddles
        updateActiveHuddleParticipants();
      },
      onScreenShareStopped: (participantId) => {
        setScreenSharerId((prev) => (prev === participantId ? null : prev));
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId ? { ...p, isScreenSharing: false } : p,
          ),
        );

        // Update active huddles
        updateActiveHuddleParticipants();
      },
      onReaction: (reaction) => {
        setRecentReactions((prev) => [...prev, reaction]);

        // Auto-remove after display
        setTimeout(() => {
          setRecentReactions((prev) =>
            prev.filter(
              (r) =>
                r.participantId !== reaction.participantId ||
                r.timestamp !== reaction.timestamp,
            ),
          );
        }, 3000);
      },
      onInviteReceived: (huddleId, channelId, inviterId) => {
        if (enableNotifications) {
          toast({
            title: "Huddle invite",
            description: `You've been invited to join a huddle`,
            action: autoJoinOnInvite
              ? undefined
              : ({
                  label: "Join",
                  onClick: () => joinHuddle(huddleId, channelId),
                } as any),
          });
        }

        if (autoJoinOnInvite && !isInHuddle) {
          joinHuddle(huddleId, channelId);
        }
      },
      onError: (err) => {
        setError(err.message);
        toast({
          title: "Huddle error",
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

    service.on(
      "screen-share-started",
      ({ participantId }: { participantId: string }) => {
        if (participantId === user.id) {
          setIsScreenSharing(true);
        }
      },
    );

    service.on(
      "screen-share-stopped",
      ({ participantId }: { participantId: string }) => {
        if (participantId === user.id) {
          setIsScreenSharing(false);
        }
      },
    );

    service.on("duration-update", ({ duration: d }: { duration: number }) => {
      setDuration(d);
    });

    service.on(
      "huddle-started",
      ({ huddleId, channelId }: { huddleId: string; channelId: string }) => {
        setHuddleInfo(service.huddleInfo);
        setParticipants(service.participants);

        // Add to active huddles
        addActiveHuddle(channelId, {
          id: huddleId,
          channelId,
          channelName: service.huddleInfo?.channelName,
          participantCount: 1,
          participants: service.participants,
          duration: 0,
          hasScreenShare: false,
        });
      },
    );

    service.on(
      "huddle-joined",
      ({ huddleId, channelId }: { huddleId: string; channelId: string }) => {
        setHuddleInfo(service.huddleInfo);
        setParticipants(service.participants);
      },
    );

    service.on("huddle-ended", () => {
      const channelId = huddleInfo?.channelId;

      // Reset all state
      setHuddleInfo(null);
      setParticipants([]);
      setRemoteStreams(new Map());
      setLocalStream(null);
      setIsMuted(muteOnJoin);
      setIsVideoEnabled(false);
      setIsScreenSharing(false);
      setActiveSpeakerId(null);
      setScreenSharerId(null);
      setRecentReactions([]);
      setMessageThreadIdState(null);
      setDuration(0);

      // Remove from active huddles
      if (channelId) {
        removeActiveHuddle(channelId);
      }

      if (enableNotifications) {
        toast({
          title: "Huddle ended",
          description: "The huddle has ended",
        });
      }
    });

    service.on(
      "message-thread-created",
      ({ threadId }: { threadId: string }) => {
        setMessageThreadIdState(threadId);
      },
    );

    // Initialize service
    service.initialize();

    serviceRef.current = service;

    return () => {
      service.destroy();
      serviceRef.current = null;
    };
  }, [user, autoJoinOnInvite, muteOnJoin, enableNotifications, toast]);

  // ===========================================================================
  // Active Huddles Management
  // ===========================================================================

  const addActiveHuddle = useCallback(
    (channelId: string, huddle: ActiveHuddle) => {
      activeHuddlesStore.set(channelId, huddle);
      setActiveHuddles(new Map(activeHuddlesStore));
    },
    [],
  );

  const removeActiveHuddle = useCallback((channelId: string) => {
    activeHuddlesStore.delete(channelId);
    setActiveHuddles(new Map(activeHuddlesStore));
  }, []);

  const updateActiveHuddleParticipants = useCallback(() => {
    if (!serviceRef.current?.huddleInfo) return;

    const channelId = serviceRef.current.huddleInfo.channelId;
    const existing = activeHuddlesStore.get(channelId);
    if (existing) {
      existing.participants = serviceRef.current.participants;
      existing.participantCount = serviceRef.current.participantCount;
      existing.hasScreenShare =
        serviceRef.current.huddleInfo.screenSharerId !== undefined;
      existing.duration = serviceRef.current.duration;
      activeHuddlesStore.set(channelId, existing);
      setActiveHuddles(new Map(activeHuddlesStore));
    }
  }, []);

  const getActiveHuddleForChannel = useCallback(
    (channelId: string): ActiveHuddle | null => {
      return activeHuddles.get(channelId) ?? null;
    },
    [activeHuddles],
  );

  // ===========================================================================
  // Huddle Actions
  // ===========================================================================

  const startHuddle = useCallback(
    async (
      channelId: string,
      huddleOptions?: {
        channelName?: string;
        isDM?: boolean;
      },
    ): Promise<string> => {
      if (!serviceRef.current) {
        throw new Error("Service not initialized");
      }

      try {
        setError(null);
        const huddleId = await serviceRef.current.startHuddle(
          channelId,
          huddleOptions,
        );

        toast({
          title: "Huddle started",
          description: huddleOptions?.isDM
            ? "DM huddle started"
            : "Channel huddle started",
        });

        return huddleId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start huddle";
        setError(message);
        toast({
          title: "Failed to start huddle",
          description: message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  const joinHuddle = useCallback(
    async (
      huddleId: string,
      channelId: string,
      huddleOptions?: {
        channelName?: string;
        isDM?: boolean;
      },
    ): Promise<void> => {
      if (!serviceRef.current) {
        throw new Error("Service not initialized");
      }

      try {
        setError(null);
        await serviceRef.current.joinHuddle(huddleId, channelId, huddleOptions);

        toast({
          title: "Joined huddle",
          description: "You have joined the huddle",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to join huddle";
        setError(message);
        toast({
          title: "Failed to join huddle",
          description: message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast],
  );

  const leaveHuddle = useCallback((quiet: boolean = false) => {
    if (!serviceRef.current) return;
    serviceRef.current.leaveHuddle(quiet);
  }, []);

  const endHuddleForAll = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.endHuddleForAll();
  }, []);

  const inviteToHuddle = useCallback((userId: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.inviteToHuddle(userId);
  }, []);

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

  const setVideoEnabled = useCallback(async (enabled: boolean) => {
    if (!serviceRef.current) return;
    await serviceRef.current.setVideoEnabled(enabled);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.toggleScreenShare();
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.startScreenShare();
  }, []);

  const stopScreenShare = useCallback(() => {
    if (!serviceRef.current) return;
    serviceRef.current.stopScreenShare();
  }, []);

  // ===========================================================================
  // Reactions
  // ===========================================================================

  const sendReaction = useCallback((emoji: string) => {
    if (!serviceRef.current) return;
    serviceRef.current.sendReaction(emoji);
  }, []);

  // ===========================================================================
  // Message Thread
  // ===========================================================================

  const createMessageThread = useCallback(() => {
    // This would create a thread in the channel for huddle messages
    // Implementation depends on the message service
    const threadId = `huddle-thread-${Date.now()}`;
    setMessageThreadIdState(threadId);
    serviceRef.current?.setMessageThreadId(threadId);
  }, []);

  const setMessageThreadId = useCallback((threadId: string) => {
    setMessageThreadIdState(threadId);
    serviceRef.current?.setMessageThreadId(threadId);
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
    isInHuddle,
    huddleInfo,
    huddleStatus,
    huddleType,
    duration,
    formattedDuration,

    // Participants
    participants,
    participantCount,
    activeSpeakerId,
    activeSpeaker,

    // Local user state
    isInitiator,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    localStream,

    // Screen share
    screenSharerId,
    screenSharer,

    // Reactions
    recentReactions,

    // Message thread
    messageThreadId,

    // Huddle Actions
    startHuddle,
    joinHuddle,
    leaveHuddle,
    endHuddleForAll,
    inviteToHuddle,

    // Media Controls
    toggleMute,
    setMuted,
    toggleVideo,
    setVideoEnabled,
    toggleScreenShare,
    startScreenShare,
    stopScreenShare,

    // Reactions
    sendReaction,

    // Message Thread
    createMessageThread,
    setMessageThreadId,

    // Remote Streams
    getParticipantStream,

    // Active Huddles
    getActiveHuddleForChannel,
    activeHuddles,

    // Error
    error,
  };
}

// =============================================================================
// Exports
// =============================================================================

export type {
  HuddleStatus,
  HuddleType,
  HuddleParticipant,
  HuddleInfo,
  HuddleReaction,
};

export { formatHuddleDuration };
