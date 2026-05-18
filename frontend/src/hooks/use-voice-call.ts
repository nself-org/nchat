"use client";

/**
 * Voice Call Hook
 *
 * Provides voice call functionality including starting/ending calls,
 * mute/unmute, and speaker selection.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useCallStore, type CallEndReason } from "@/stores/call-store";
import {
  PeerConnectionManager,
  createPeerConnection,
  type PeerConnectionCallbacks,
} from "@/lib/webrtc/peer-connection";
import {
  MediaManager,
  createMediaManager,
  type MediaManagerCallbacks,
  type AudioConstraints,
} from "@/lib/webrtc/media-manager";
import {
  SignalingManager,
  createSignalingManager,
  generateCallId,
  type SignalingCallbacks,
} from "@/lib/webrtc/signaling";

// =============================================================================
// Types
// =============================================================================

export interface UseVoiceCallOptions {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  onCallStarted?: (callId: string) => void;
  onCallEnded?: (callId: string, reason: string) => void;
  onError?: (error: Error) => void;
}

export interface UseVoiceCallReturn {
  // State
  isInCall: boolean;
  isCallConnected: boolean;
  isMuted: boolean;
  isRinging: boolean;
  callDuration: number;
  hasIncomingCall: boolean;

  // Actions
  startCall: (
    targetUserId: string,
    targetUserName: string,
    channelId?: string,
  ) => Promise<string>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => void;
  endCall: () => void;

  // Audio Controls
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;

  // Speaker Selection
  selectSpeaker: (deviceId: string) => Promise<void>;
  availableSpeakers: Array<{ deviceId: string; label: string }>;

  // Audio Input Selection
  selectMicrophone: (deviceId: string) => Promise<void>;
  availableMicrophones: Array<{ deviceId: string; label: string }>;

  // Audio Level
  audioLevel: number;

  // Error
  error: string | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useVoiceCall(options: UseVoiceCallOptions): UseVoiceCallReturn {
  const {
    userId,
    userName,
    userAvatarUrl,
    onCallStarted,
    onCallEnded,
    onError,
  } = options;

  // Store state
  const activeCall = useCallStore((state) => state.activeCall);
  const incomingCalls = useCallStore((state) => state.incomingCalls);
  const initiateCall = useCallStore((state) => state.initiateCall);
  const acceptCallAction = useCallStore((state) => state.acceptCall);
  const declineCallAction = useCallStore((state) => state.declineCall);
  const endCallAction = useCallStore((state) => state.endCall);
  const setCallState = useCallStore((state) => state.setCallState);
  const setCallConnected = useCallStore((state) => state.setCallConnected);
  const setLocalMuted = useCallStore((state) => state.setLocalMuted);
  const setLocalStream = useCallStore((state) => state.setLocalStream);
  const addRemoteStream = useCallStore((state) => state.addRemoteStream);
  const receiveIncomingCall = useCallStore(
    (state) => state.receiveIncomingCall,
  );
  const updateParticipant = useCallStore((state) => state.updateParticipant);
  const storeError = useCallStore((state) => state.error);

  // Local state
  const [audioLevel, setAudioLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [availableMicrophones, setAvailableMicrophones] = useState<
    Array<{ deviceId: string; label: string }>
  >([]);
  const [availableSpeakers, setAvailableSpeakers] = useState<
    Array<{ deviceId: string; label: string }>
  >([]);

  // Refs
  const peerConnectionRef = useRef<PeerConnectionManager | null>(null);
  const mediaManagerRef = useRef<MediaManager | null>(null);
  const signalingRef = useRef<SignalingManager | null>(null);
  const audioAnalyzerRef = useRef<{
    getLevel: () => number;
    cleanup: () => void;
  } | null>(null);
  const audioLevelIntervalRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Derived state
  const isInCall = activeCall !== null && activeCall.state !== "ended";
  const isCallConnected = activeCall?.state === "connected";
  const isMuted = activeCall?.isLocalMuted ?? false;
  const isRinging = activeCall?.state === "ringing" || incomingCalls.length > 0;
  const hasIncomingCall = incomingCalls.length > 0;

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  const cleanup = useCallback(() => {
    // Stop audio level monitoring
    if (audioLevelIntervalRef.current) {
      window.clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Cleanup audio analyzer
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.cleanup();
      audioAnalyzerRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop media
    if (mediaManagerRef.current) {
      mediaManagerRef.current.cleanup();
      mediaManagerRef.current = null;
    }

    // Disconnect signaling
    if (signalingRef.current) {
      signalingRef.current.disconnect();
      signalingRef.current = null;
    }

    // Reset state
    setAudioLevel(0);
    setCallDuration(0);
  }, []);

  // ==========================================================================
  // Initialize Managers
  // ==========================================================================

  const initializeManagers = useCallback(() => {
    // Media Manager
    const mediaCallbacks: MediaManagerCallbacks = {
      onDeviceChange: (devices) => {
        setAvailableMicrophones(
          devices
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label })),
        );
        setAvailableSpeakers(
          devices
            .filter((d) => d.kind === "audiooutput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label })),
        );
      },
      onTrackEnded: () => {
        // Handle track ended
      },
      onStreamError: (error) => {
        onError?.(error);
      },
    };
    mediaManagerRef.current = createMediaManager(mediaCallbacks);

    // Peer Connection Manager
    const peerCallbacks: PeerConnectionCallbacks = {
      onIceCandidate: (candidate) => {
        if (activeCall && signalingRef.current) {
          const participants = Array.from(activeCall.participants.keys());
          const targetUserId = participants.find((id) => id !== userId);
          if (targetUserId) {
            signalingRef.current.sendIceCandidate({
              callId: activeCall.id,
              fromUserId: userId,
              toUserId: targetUserId,
              candidate: candidate.toJSON(),
            });
          }
        }
      },
      onConnectionStateChange: (state) => {
        if (state === "connected") {
          setCallConnected();
        } else if (state === "failed" || state === "disconnected") {
          onError?.(new Error(`Connection ${state}`));
        }
      },
      onTrack: (event) => {
        if (event.streams[0]) {
          const participants = Array.from(
            activeCall?.participants.keys() ?? [],
          );
          const remoteUserId = participants.find((id) => id !== userId);
          if (remoteUserId) {
            addRemoteStream(remoteUserId, event.streams[0]);

            // Play remote audio
            if (!audioElementRef.current) {
              audioElementRef.current = new Audio();
              audioElementRef.current.autoplay = true;
            }
            audioElementRef.current.srcObject = event.streams[0];
          }
        }
      },
    };
    peerConnectionRef.current = createPeerConnection(undefined, peerCallbacks);

    // Signaling Manager
    const signalingCallbacks: SignalingCallbacks = {
      onCallRing: (payload) => {
        receiveIncomingCall({
          id: payload.callId,
          callerId: payload.callerId,
          callerName: payload.callerName,
          callerAvatarUrl: payload.callerAvatarUrl,
          type: "voice",
          channelId: payload.channelId,
          receivedAt: new Date().toISOString(),
        });
      },
      onCallAccepted: async (payload) => {
        if (activeCall?.id === payload.callId) {
          setCallState("connecting");
          await setupPeerConnection(true);
        }
      },
      onCallDeclined: (payload) => {
        if (activeCall?.id === payload.callId) {
          endCallAction("declined");
          onCallEnded?.(payload.callId, "declined");
          cleanup();
        }
      },
      onCallEnded: (payload) => {
        if (activeCall?.id === payload.callId) {
          endCallAction(payload.reason as CallEndReason);
          onCallEnded?.(payload.callId, payload.reason);
          cleanup();
        }
      },
      onOffer: async (payload) => {
        if (peerConnectionRef.current && activeCall?.id === payload.callId) {
          const pc = peerConnectionRef.current;
          await pc.setRemoteDescription(payload.sdp);
          const answer = await pc.createAnswer();
          signalingRef.current?.sendAnswer({
            callId: payload.callId,
            fromUserId: userId,
            toUserId: payload.fromUserId,
            sdp: answer,
          });
        }
      },
      onAnswer: async (payload) => {
        if (peerConnectionRef.current && activeCall?.id === payload.callId) {
          await peerConnectionRef.current.setRemoteDescription(payload.sdp);
        }
      },
      onIceCandidate: async (payload) => {
        if (peerConnectionRef.current && activeCall?.id === payload.callId) {
          await peerConnectionRef.current.addIceCandidate(payload.candidate);
        }
      },
      onMuteChanged: (payload) => {
        if (activeCall?.id === payload.callId) {
          updateParticipant(payload.userId, { isMuted: !payload.enabled });
        }
      },
      onError: (payload) => {
        onError?.(new Error(payload.message));
      },
    };
    signalingRef.current = createSignalingManager(signalingCallbacks);
    signalingRef.current.connect();

    // Enumerate devices
    mediaManagerRef.current.enumerateDevices();
    mediaManagerRef.current.startDeviceChangeListener();
  }, [
    userId,
    activeCall,
    setCallState,
    setCallConnected,
    endCallAction,
    addRemoteStream,
    receiveIncomingCall,
    updateParticipant,
    onCallEnded,
    onError,
    cleanup,
  ]);

  // ==========================================================================
  // Setup Peer Connection
  // ==========================================================================

  const setupPeerConnection = useCallback(
    async (isInitiator: boolean) => {
      if (
        !peerConnectionRef.current ||
        !mediaManagerRef.current ||
        !activeCall
      ) {
        return;
      }

      const pc = peerConnectionRef.current;
      const media = mediaManagerRef.current;

      pc.create();

      // Get local audio stream
      const stream = await media.getAudioOnlyStream();
      setLocalStream(stream);

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Setup audio level monitoring
      const analyzer = media.createAudioAnalyzer();
      if (analyzer) {
        audioAnalyzerRef.current = analyzer;
        audioLevelIntervalRef.current = window.setInterval(() => {
          setAudioLevel(analyzer.getLevel());
        }, 100);
      }

      if (isInitiator) {
        // Create and send offer
        const offer = await pc.createOffer();
        const participants = Array.from(activeCall.participants.keys());
        const targetUserId = participants.find((id) => id !== userId);
        if (targetUserId && signalingRef.current) {
          signalingRef.current.sendOffer({
            callId: activeCall.id,
            fromUserId: userId,
            toUserId: targetUserId,
            sdp: offer,
          });
        }
      }
    },
    [userId, activeCall, setLocalStream],
  );

  // ==========================================================================
  // Start Duration Timer
  // ==========================================================================

  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
    }

    const startTime = Date.now();
    durationIntervalRef.current = window.setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, []);

  // ==========================================================================
  // Actions
  // ==========================================================================

  const startCall = useCallback(
    async (
      targetUserId: string,
      targetUserName: string,
      channelId?: string,
    ): Promise<string> => {
      if (isInCall) {
        throw new Error("Already in a call");
      }

      const callId = generateCallId();

      // Initialize managers if needed
      if (!signalingRef.current) {
        initializeManagers();
      }

      // Create call in store
      initiateCall(callId, targetUserId, targetUserName, "voice", channelId);

      // Send call initiate signal
      signalingRef.current?.initiateCall({
        callId,
        targetUserId,
        callType: "voice",
        channelId,
      });

      setCallState("ringing");
      onCallStarted?.(callId);

      return callId;
    },
    [isInCall, initiateCall, setCallState, initializeManagers, onCallStarted],
  );

  const acceptCall = useCallback(
    async (callId: string): Promise<void> => {
      const incomingCall = incomingCalls.find((c) => c.id === callId);
      if (!incomingCall) {
        throw new Error("Call not found");
      }

      // Initialize managers if needed
      if (!signalingRef.current) {
        initializeManagers();
      }

      // Accept call in store
      acceptCallAction(callId);

      // Send accept signal
      signalingRef.current?.acceptCall(callId, userId);

      // Setup peer connection as answerer
      await setupPeerConnection(false);

      onCallStarted?.(callId);
    },
    [
      incomingCalls,
      acceptCallAction,
      userId,
      initializeManagers,
      setupPeerConnection,
      onCallStarted,
    ],
  );

  const declineCall = useCallback(
    (callId: string): void => {
      signalingRef.current?.declineCall(callId, userId);
      declineCallAction(callId);
    },
    [userId, declineCallAction],
  );

  const endCall = useCallback((): void => {
    if (activeCall && signalingRef.current) {
      signalingRef.current.endCall(
        activeCall.id,
        userId,
        "completed",
        callDuration,
      );
    }
    endCallAction("completed");
    onCallEnded?.(activeCall?.id ?? "", "completed");
    cleanup();
  }, [activeCall, userId, callDuration, endCallAction, onCallEnded, cleanup]);

  const toggleMute = useCallback((): void => {
    if (!activeCall || !mediaManagerRef.current) return;

    const newMuted = !activeCall.isLocalMuted;
    setLocalMuted(newMuted);
    mediaManagerRef.current.enableAudio(!newMuted);
    signalingRef.current?.notifyMuteChange(activeCall.id, userId, newMuted);
  }, [activeCall, userId, setLocalMuted]);

  const setMuted = useCallback(
    (muted: boolean): void => {
      if (!activeCall || !mediaManagerRef.current) return;

      setLocalMuted(muted);
      mediaManagerRef.current.enableAudio(!muted);
      signalingRef.current?.notifyMuteChange(activeCall.id, userId, muted);
    },
    [activeCall, userId, setLocalMuted],
  );

  const selectSpeaker = useCallback(async (deviceId: string): Promise<void> => {
    if (!audioElementRef.current) return;

    await mediaManagerRef.current?.setAudioOutput(
      deviceId,
      audioElementRef.current,
    );
  }, []);

  const selectMicrophone = useCallback(
    async (deviceId: string): Promise<void> => {
      if (!mediaManagerRef.current) return;

      await mediaManagerRef.current.switchAudioDevice(deviceId);
    },
    [],
  );

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Initialize on mount
  useEffect(() => {
    initializeManagers();

    return () => {
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start duration timer when connected
  useEffect(() => {
    if (isCallConnected) {
      startDurationTimer();
    }

    return () => {
      if (durationIntervalRef.current) {
        window.clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [isCallConnected, startDurationTimer]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    isInCall,
    isCallConnected,
    isMuted,
    isRinging,
    callDuration,
    hasIncomingCall,

    // Actions
    startCall,
    acceptCall,
    declineCall,
    endCall,

    // Audio Controls
    toggleMute,
    setMuted,

    // Speaker Selection
    selectSpeaker,
    availableSpeakers,

    // Audio Input Selection
    selectMicrophone,
    availableMicrophones,

    // Audio Level
    audioLevel,

    // Error
    error: storeError,
  };
}
