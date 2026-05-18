"use client";

/**
 * Video Call Hook
 *
 * Extends voice call functionality with video capabilities including
 * camera toggle, screen sharing, and picture-in-picture mode.
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
  type VideoConstraints,
  DEFAULT_VIDEO_CONSTRAINTS,
  HD_VIDEO_CONSTRAINTS,
  LOW_BANDWIDTH_VIDEO_CONSTRAINTS,
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

export type VideoQuality = "low" | "medium" | "high";

export interface UseVideoCallOptions {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  defaultVideoQuality?: VideoQuality;
  onCallStarted?: (callId: string) => void;
  onCallEnded?: (callId: string, reason: string) => void;
  onError?: (error: Error) => void;
}

export interface UseVideoCallReturn {
  // State
  isInCall: boolean;
  isCallConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRinging: boolean;
  callDuration: number;
  hasIncomingCall: boolean;
  isPictureInPicture: boolean;

  // Streams
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];

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

  // Video Controls
  toggleVideo: () => void;
  setVideoEnabled: (enabled: boolean) => void;
  setVideoQuality: (quality: VideoQuality) => void;

  // Screen Sharing
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;

  // Picture-in-Picture
  enterPictureInPicture: (videoElement: HTMLVideoElement) => Promise<void>;
  exitPictureInPicture: () => Promise<void>;

  // Device Selection
  selectCamera: (deviceId: string) => Promise<void>;
  selectMicrophone: (deviceId: string) => Promise<void>;
  selectSpeaker: (deviceId: string) => Promise<void>;

  // Available Devices
  availableCameras: Array<{ deviceId: string; label: string }>;
  availableMicrophones: Array<{ deviceId: string; label: string }>;
  availableSpeakers: Array<{ deviceId: string; label: string }>;

  // Audio Level
  audioLevel: number;

  // Error
  error: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const VIDEO_QUALITY_CONSTRAINTS: Record<VideoQuality, VideoConstraints> = {
  low: LOW_BANDWIDTH_VIDEO_CONSTRAINTS,
  medium: DEFAULT_VIDEO_CONSTRAINTS,
  high: HD_VIDEO_CONSTRAINTS,
};

// =============================================================================
// Hook
// =============================================================================

export function useVideoCall(options: UseVideoCallOptions): UseVideoCallReturn {
  const {
    userId,
    userName,
    userAvatarUrl,
    defaultVideoQuality = "medium",
    onCallStarted,
    onCallEnded,
    onError,
  } = options;

  // Store state
  const activeCall = useCallStore((state) => state.activeCall);
  const incomingCalls = useCallStore((state) => state.incomingCalls);
  const isPictureInPictureStore = useCallStore(
    (state) => state.isPictureInPicture,
  );
  const initiateCall = useCallStore((state) => state.initiateCall);
  const acceptCallAction = useCallStore((state) => state.acceptCall);
  const declineCallAction = useCallStore((state) => state.declineCall);
  const endCallAction = useCallStore((state) => state.endCall);
  const setCallState = useCallStore((state) => state.setCallState);
  const setCallConnected = useCallStore((state) => state.setCallConnected);
  const setLocalMuted = useCallStore((state) => state.setLocalMuted);
  const setLocalVideoEnabled = useCallStore(
    (state) => state.setLocalVideoEnabled,
  );
  const setLocalScreenSharing = useCallStore(
    (state) => state.setLocalScreenSharing,
  );
  const setLocalStream = useCallStore((state) => state.setLocalStream);
  const addRemoteStream = useCallStore((state) => state.addRemoteStream);
  const receiveIncomingCall = useCallStore(
    (state) => state.receiveIncomingCall,
  );
  const updateParticipant = useCallStore((state) => state.updateParticipant);
  const setPictureInPicture = useCallStore(
    (state) => state.setPictureInPicture,
  );
  const storeError = useCallStore((state) => state.error);

  // Local state
  const [audioLevel, setAudioLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [videoQuality, setVideoQualityState] =
    useState<VideoQuality>(defaultVideoQuality);
  const [availableCameras, setAvailableCameras] = useState<
    Array<{ deviceId: string; label: string }>
  >([]);
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
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // Derived state
  const isInCall = activeCall !== null && activeCall.state !== "ended";
  const isCallConnected = activeCall?.state === "connected";
  const isMuted = activeCall?.isLocalMuted ?? false;
  const isVideoEnabled = activeCall?.isLocalVideoEnabled ?? false;
  const isScreenSharing = activeCall?.isLocalScreenSharing ?? false;
  const isRinging = activeCall?.state === "ringing" || incomingCalls.length > 0;
  const hasIncomingCall = incomingCalls.length > 0;
  const localStream = activeCall?.localStream ?? null;
  const remoteStreams = activeCall
    ? Array.from(activeCall.remoteStreams.values())
    : [];

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

    // Exit PiP if active
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    // Reset state
    setAudioLevel(0);
    setCallDuration(0);
    setPictureInPicture(false);
  }, [setPictureInPicture]);

  // ==========================================================================
  // Initialize Managers
  // ==========================================================================

  const initializeManagers = useCallback(() => {
    // Media Manager
    const mediaCallbacks: MediaManagerCallbacks = {
      onDeviceChange: (devices) => {
        setAvailableCameras(
          devices
            .filter((d) => d.kind === "videoinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label })),
        );
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
      onTrackEnded: (track) => {
        // Handle screen share track ending
        if (track.kind === "video" && isScreenSharing) {
          setLocalScreenSharing(false);
          signalingRef.current?.notifyScreenShareStopped(
            activeCall?.id ?? "",
            userId,
          );
        }
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

            // Handle audio playback
            if (event.track.kind === "audio") {
              if (!audioElementRef.current) {
                audioElementRef.current = new Audio();
                audioElementRef.current.autoplay = true;
              }
              audioElementRef.current.srcObject = event.streams[0];
            }
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
          type: "video",
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
      onVideoChanged: (payload) => {
        if (activeCall?.id === payload.callId) {
          updateParticipant(payload.userId, {
            isVideoEnabled: payload.enabled,
          });
        }
      },
      onScreenShareStarted: (payload) => {
        if (activeCall?.id === payload.callId) {
          updateParticipant(payload.userId, { isScreenSharing: true });
        }
      },
      onScreenShareStopped: (payload) => {
        if (activeCall?.id === payload.callId) {
          updateParticipant(payload.userId, { isScreenSharing: false });
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
    isScreenSharing,
    setCallState,
    setCallConnected,
    setLocalScreenSharing,
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

      // Get local video stream
      const videoConstraints = VIDEO_QUALITY_CONSTRAINTS[videoQuality];
      const stream = await media.getVideoStream(undefined, videoConstraints);
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
    [userId, activeCall, videoQuality, setLocalStream],
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
      initiateCall(callId, targetUserId, targetUserName, "video", channelId);

      // Send call initiate signal
      signalingRef.current?.initiateCall({
        callId,
        targetUserId,
        callType: "video",
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

  // Audio controls
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

  // Video controls
  const toggleVideo = useCallback((): void => {
    if (!activeCall || !mediaManagerRef.current) return;

    const newEnabled = !activeCall.isLocalVideoEnabled;
    setLocalVideoEnabled(newEnabled);
    mediaManagerRef.current.enableVideo(newEnabled);
    signalingRef.current?.notifyVideoChange(activeCall.id, userId, newEnabled);
  }, [activeCall, userId, setLocalVideoEnabled]);

  const setVideoEnabled = useCallback(
    (enabled: boolean): void => {
      if (!activeCall || !mediaManagerRef.current) return;

      setLocalVideoEnabled(enabled);
      mediaManagerRef.current.enableVideo(enabled);
      signalingRef.current?.notifyVideoChange(activeCall.id, userId, enabled);
    },
    [activeCall, userId, setLocalVideoEnabled],
  );

  const setVideoQuality = useCallback(
    async (quality: VideoQuality): Promise<void> => {
      if (!mediaManagerRef.current) return;

      setVideoQualityState(quality);
      const constraints = VIDEO_QUALITY_CONSTRAINTS[quality];
      await mediaManagerRef.current.applyVideoConstraints(constraints);
    },
    [],
  );

  // Screen sharing
  const startScreenShare = useCallback(async (): Promise<void> => {
    if (!activeCall || !mediaManagerRef.current || !peerConnectionRef.current)
      return;

    const screenStream = await mediaManagerRef.current.getDisplayMedia();
    setLocalScreenSharing(true);

    // Replace video track with screen share track
    const screenTrack = screenStream.getVideoTracks()[0];
    const videoTracks = peerConnectionRef.current.getLocalVideoTracks();

    if (videoTracks.length > 0 && screenTrack) {
      peerConnectionRef.current.replaceTrack(
        videoTracks[0].track.id,
        screenTrack,
      );
    }

    signalingRef.current?.notifyScreenShareStarted(activeCall.id, userId);

    // Handle screen share stop
    screenTrack.onended = () => {
      stopScreenShare();
    };
  }, [activeCall, userId, setLocalScreenSharing]);

  const stopScreenShare = useCallback((): void => {
    if (!activeCall || !mediaManagerRef.current) return;

    mediaManagerRef.current.stopScreenShare();
    setLocalScreenSharing(false);
    signalingRef.current?.notifyScreenShareStopped(activeCall.id, userId);

    // Restore camera video track
    if (mediaManagerRef.current.stream) {
      const videoTrack = mediaManagerRef.current.videoTracks[0];
      if (videoTrack && peerConnectionRef.current) {
        const screenTracks = peerConnectionRef.current.getLocalVideoTracks();
        if (screenTracks.length > 0) {
          peerConnectionRef.current.replaceTrack(
            screenTracks[0].track.id,
            videoTrack,
          );
        }
      }
    }
  }, [activeCall, userId, setLocalScreenSharing]);

  // Picture-in-Picture
  const enterPictureInPicture = useCallback(
    async (videoElement: HTMLVideoElement): Promise<void> => {
      if (!document.pictureInPictureEnabled) {
        throw new Error("Picture-in-Picture not supported");
      }

      pipVideoRef.current = videoElement;
      await videoElement.requestPictureInPicture();
      setPictureInPicture(true);
    },
    [setPictureInPicture],
  );

  const exitPictureInPicture = useCallback(async (): Promise<void> => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setPictureInPicture(false);
      pipVideoRef.current = null;
    }
  }, [setPictureInPicture]);

  // Device selection
  const selectCamera = useCallback(async (deviceId: string): Promise<void> => {
    if (!mediaManagerRef.current) return;

    await mediaManagerRef.current.switchVideoDevice(deviceId);
  }, []);

  const selectMicrophone = useCallback(
    async (deviceId: string): Promise<void> => {
      if (!mediaManagerRef.current) return;

      await mediaManagerRef.current.switchAudioDevice(deviceId);
    },
    [],
  );

  const selectSpeaker = useCallback(async (deviceId: string): Promise<void> => {
    if (!audioElementRef.current) return;

    await mediaManagerRef.current?.setAudioOutput(
      deviceId,
      audioElementRef.current,
    );
  }, []);

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

  // Listen for PiP leave event
  useEffect(() => {
    const handleLeavePiP = () => {
      setPictureInPicture(false);
    };

    document.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      document.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, [setPictureInPicture]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    isInCall,
    isCallConnected,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    isRinging,
    callDuration,
    hasIncomingCall,
    isPictureInPicture: isPictureInPictureStore,

    // Streams
    localStream,
    remoteStreams,

    // Actions
    startCall,
    acceptCall,
    declineCall,
    endCall,

    // Audio Controls
    toggleMute,
    setMuted,

    // Video Controls
    toggleVideo,
    setVideoEnabled,
    setVideoQuality,

    // Screen Sharing
    startScreenShare,
    stopScreenShare,

    // Picture-in-Picture
    enterPictureInPicture,
    exitPictureInPicture,

    // Device Selection
    selectCamera,
    selectMicrophone,
    selectSpeaker,

    // Available Devices
    availableCameras,
    availableMicrophones,
    availableSpeakers,

    // Audio Level
    audioLevel,

    // Error
    error: storeError,
  };
}
