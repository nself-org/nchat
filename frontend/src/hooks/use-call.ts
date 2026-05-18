/**
 * Call Hook
 *
 * Main hook that orchestrates the entire call lifecycle including
 * signaling, peer connections, media streams, and UI state.
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useSubscription } from "@apollo/client";
import { useCallStore, type CallEndReason } from "@/stores/call-store";
import { useAuth } from "@/contexts/auth-context";
import {
  PeerConnectionManager,
  createPeerConnection,
} from "@/lib/webrtc/peer-connection";
import { MediaManager, createMediaManager } from "@/lib/webrtc/media-manager";
import {
  SignalingManager,
  createSignalingManager,
  generateCallId,
} from "@/lib/webrtc/signaling";
import {
  INITIATE_CALL,
  END_CALL,
  UPDATE_PARTICIPANT_MUTE,
  UPDATE_PARTICIPANT_VIDEO,
  UPDATE_PARTICIPANT_SCREEN_SHARE,
  SUBSCRIBE_TO_INCOMING_CALLS,
  SUBSCRIBE_TO_CALL,
} from "@/graphql/calls";
import { useToast } from "@/hooks/use-toast";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UseCallOptions {
  autoAcceptCalls?: boolean;
  enableNotifications?: boolean;
}

export interface UseCallReturn {
  // State
  isInCall: boolean;
  callState:
    | "idle"
    | "initiating"
    | "ringing"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "ended";
  callType: "voice" | "video" | null;
  callDuration: number;
  participants: any[];

  // Incoming calls
  incomingCalls: any[];
  hasIncomingCall: boolean;

  // Media state
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;

  // Actions
  initiateVoiceCall: (
    targetUserId: string,
    targetUserName: string,
    channelId?: string,
  ) => Promise<void>;
  initiateVideoCall: (
    targetUserId: string,
    targetUserName: string,
    channelId?: string,
  ) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => void;
  endCall: () => Promise<void>;

  // Media controls
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;

  // Error
  error: string | null;
}

// =============================================================================
// Hook
// =============================================================================

export function useCall(options: UseCallOptions = {}): UseCallReturn {
  const { autoAcceptCalls = false, enableNotifications = true } = options;

  // Auth
  const { user } = useAuth();
  const { toast } = useToast();

  // Store
  const activeCall = useCallStore((state) => state.activeCall);
  const incomingCalls = useCallStore((state) => state.incomingCalls);
  const initiateCallStore = useCallStore((state) => state.initiateCall);
  const acceptCallStore = useCallStore((state) => state.acceptCall);
  const declineCallStore = useCallStore((state) => state.declineCall);
  const endCallStore = useCallStore((state) => state.endCall);
  const setCallState = useCallStore((state) => state.setCallState);
  const setCallConnected = useCallStore((state) => state.setCallConnected);
  const toggleLocalMute = useCallStore((state) => state.toggleLocalMute);
  const toggleLocalVideo = useCallStore((state) => state.toggleLocalVideo);
  const setLocalScreenSharing = useCallStore(
    (state) => state.setLocalScreenSharing,
  );
  const setLocalStream = useCallStore((state) => state.setLocalStream);
  const addRemoteStream = useCallStore((state) => state.addRemoteStream);
  const receiveIncomingCall = useCallStore(
    (state) => state.receiveIncomingCall,
  );
  const removeIncomingCall = useCallStore((state) => state.removeIncomingCall);

  // Local state
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const peerConnectionRef = useRef<PeerConnectionManager | null>(null);
  const mediaManagerRef = useRef<MediaManager | null>(null);
  const signalingRef = useRef<SignalingManager | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  // GraphQL
  const [initiateCallMutation] = useMutation(INITIATE_CALL);
  const [endCallMutation] = useMutation(END_CALL);
  const [updateMuteMutation] = useMutation(UPDATE_PARTICIPANT_MUTE);
  const [updateVideoMutation] = useMutation(UPDATE_PARTICIPANT_VIDEO);
  const [updateScreenShareMutation] = useMutation(
    UPDATE_PARTICIPANT_SCREEN_SHARE,
  );

  // Subscribe to incoming calls
  useSubscription(SUBSCRIBE_TO_INCOMING_CALLS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onData: ({ data }) => {
      const calls = data.data?.nchat_calls || [];
      calls.forEach((call: any) => {
        const caller = call.caller || {};
        receiveIncomingCall({
          id: call.call_id,
          callerId: caller.id,
          callerName: caller.display_name || caller.username,
          callerAvatarUrl: caller.avatar_url,
          type: call.type,
          channelId: call.channel_id,
          receivedAt: call.started_at,
        });

        // Show notification
        if (enableNotifications) {
          toast({
            title: `Incoming ${call.type} call`,
            description: `${caller.display_name || caller.username} is calling you`,
          });
        }

        // Auto-accept if enabled
        if (autoAcceptCalls && !activeCall) {
          acceptCall(call.call_id);
        }
      });
    },
  });

  // Derived state
  const isInCall = activeCall !== null && activeCall.state !== "ended";
  const callState = activeCall?.state || "idle";
  const callType = activeCall?.type || null;
  const participants = activeCall
    ? Array.from(activeCall.participants.values())
    : [];
  const hasIncomingCall = incomingCalls.length > 0;
  const isMuted = activeCall?.isLocalMuted || false;
  const isVideoEnabled = activeCall?.isLocalVideoEnabled || false;
  const isScreenSharing = activeCall?.isLocalScreenSharing || false;
  const localStream = activeCall?.localStream || null;
  const remoteStreams = activeCall?.remoteStreams || new Map();

  // ==========================================================================
  // Initialize Managers
  // ==========================================================================

  const initializeManagers = useCallback(() => {
    // Media Manager
    if (!mediaManagerRef.current) {
      mediaManagerRef.current = createMediaManager({
        onStreamError: (err) => {
          setError(err.message);
          toast({
            title: "Media Error",
            description: err.message,
            variant: "destructive",
          });
        },
      });
    }

    // Peer Connection
    if (!peerConnectionRef.current) {
      peerConnectionRef.current = createPeerConnection(undefined, {
        onTrack: (event) => {
          if (event.streams[0] && activeCall) {
            // Find the participant for this stream
            const participant = Array.from(activeCall.participants.values())[0];
            if (participant) {
              addRemoteStream(participant.id, event.streams[0]);
            }
          }
        },
        onConnectionStateChange: (state) => {
          if (state === "connected") {
            setCallConnected();
          } else if (state === "disconnected" || state === "failed") {
            setCallState("reconnecting");
          }
        },
      });
    }

    // Signaling
    if (!signalingRef.current) {
      signalingRef.current = createSignalingManager({
        onCallRing: (payload) => {
          // Call is ringing on the other end
          setCallState("ringing");
        },
        onCallAccepted: async (payload) => {
          // Other user accepted, establish connection
          setCallState("connecting");
        },
        onCallDeclined: (payload) => {
          toast({
            title: "Call Declined",
            description: "The other user declined your call",
          });
          endCallStore("declined");
        },
        onCallEnded: (payload) => {
          endCallStore(payload.reason as CallEndReason);
          cleanup();
        },
        onOffer: async (payload) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(payload.sdp);
            const answer = await peerConnectionRef.current.createAnswer();
            signalingRef.current?.sendAnswer({
              callId: payload.callId,
              fromUserId: user?.id || "",
              toUserId: payload.fromUserId,
              sdp: answer,
            });
          }
        },
        onAnswer: async (payload) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(payload.sdp);
          }
        },
        onIceCandidate: async (payload) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(payload.candidate);
          }
        },
      });
      signalingRef.current.connect();
    }
  }, [
    activeCall,
    addRemoteStream,
    endCallStore,
    setCallConnected,
    setCallState,
    toast,
    user?.id,
  ]);

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (mediaManagerRef.current) {
      mediaManagerRef.current.cleanup();
      mediaManagerRef.current = null;
    }

    setCallDuration(0);
  }, []);

  // ==========================================================================
  // Initiate Call
  // ==========================================================================

  const initiateCall = useCallback(
    async (
      targetUserId: string,
      targetUserName: string,
      type: "voice" | "video",
      channelId?: string,
    ) => {
      if (!user) {
        setError("Not authenticated");
        return;
      }

      try {
        initializeManagers();

        const callId = generateCallId();

        // Start local media
        if (mediaManagerRef.current) {
          const stream =
            type === "video"
              ? await mediaManagerRef.current.getVideoStream()
              : await mediaManagerRef.current.getAudioOnlyStream();

          setLocalStream(stream);

          // Add tracks to peer connection
          if (peerConnectionRef.current) {
            stream.getTracks().forEach((track) => {
              peerConnectionRef.current!.addTrack(track, stream);
            });
          }
        }

        // Initiate call in store
        initiateCallStore(
          callId,
          targetUserId,
          targetUserName,
          type,
          channelId,
        );

        // Create database record
        await initiateCallMutation({
          variables: {
            callId,
            type,
            callerId: user.id,
            targetUserId,
            channelId,
          },
        });

        // Send signaling
        if (peerConnectionRef.current && signalingRef.current) {
          const offer = await peerConnectionRef.current.createOffer();
          signalingRef.current.sendOffer({
            callId,
            fromUserId: user.id,
            toUserId: targetUserId,
            sdp: offer,
          });
        }

        // Start duration timer
        durationIntervalRef.current = window.setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);

        toast({ title: `Calling ${targetUserName}...` });
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to initiate call";
        setError(error);
        toast({
          title: "Call Failed",
          description: error,
          variant: "destructive",
        });
        cleanup();
      }
    },
    [
      user,
      initializeManagers,
      initiateCallStore,
      initiateCallMutation,
      setLocalStream,
      toast,
      cleanup,
    ],
  );

  const initiateVoiceCall = useCallback(
    async (
      targetUserId: string,
      targetUserName: string,
      channelId?: string,
    ) => {
      await initiateCall(targetUserId, targetUserName, "voice", channelId);
    },
    [initiateCall],
  );

  const initiateVideoCall = useCallback(
    async (
      targetUserId: string,
      targetUserName: string,
      channelId?: string,
    ) => {
      await initiateCall(targetUserId, targetUserName, "video", channelId);
    },
    [initiateCall],
  );

  // ==========================================================================
  // Accept Call
  // ==========================================================================

  const acceptCall = useCallback(
    async (callId: string) => {
      if (!user) return;

      try {
        initializeManagers();

        const call = incomingCalls.find((c) => c.id === callId);
        if (!call) return;

        // Start local media
        if (mediaManagerRef.current) {
          const stream =
            call.type === "video"
              ? await mediaManagerRef.current.getVideoStream()
              : await mediaManagerRef.current.getAudioOnlyStream();

          setLocalStream(stream);

          // Add tracks
          if (peerConnectionRef.current) {
            stream.getTracks().forEach((track) => {
              peerConnectionRef.current!.addTrack(track, stream);
            });
          }
        }

        // Accept in store
        acceptCallStore(callId);

        // Notify via signaling
        if (signalingRef.current) {
          signalingRef.current.acceptCall(callId, user.id);
        }

        // Remove from incoming calls
        removeIncomingCall(callId);

        // Start duration timer
        durationIntervalRef.current = window.setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to accept call";
        setError(error);
        toast({
          title: "Call Failed",
          description: error,
          variant: "destructive",
        });
        cleanup();
      }
    },
    [
      user,
      incomingCalls,
      initializeManagers,
      acceptCallStore,
      setLocalStream,
      removeIncomingCall,
      toast,
      cleanup,
    ],
  );

  // ==========================================================================
  // Decline Call
  // ==========================================================================

  const declineCall = useCallback(
    (callId: string) => {
      declineCallStore(callId);
      removeIncomingCall(callId);

      if (signalingRef.current && user) {
        signalingRef.current.declineCall(callId, user.id);
      }
    },
    [declineCallStore, removeIncomingCall, user],
  );

  // ==========================================================================
  // End Call
  // ==========================================================================

  const endCall = useCallback(async () => {
    if (!activeCall || !user) return;

    try {
      const duration = callDuration;

      // End in database
      await endCallMutation({
        variables: {
          callId: activeCall.id,
          duration,
        },
      });

      // Notify via signaling
      if (signalingRef.current) {
        signalingRef.current.endCall(
          activeCall.id,
          user.id,
          "completed",
          duration,
        );
      }

      // End in store
      endCallStore("completed");

      cleanup();
    } catch (err) {
      logger.error("Error ending call:", err);
      // Still cleanup even if there's an error
      cleanup();
    }
  }, [activeCall, user, callDuration, endCallMutation, endCallStore, cleanup]);

  // ==========================================================================
  // Media Controls
  // ==========================================================================

  const toggleMute = useCallback(async () => {
    if (!activeCall || !user) return;

    toggleLocalMute();

    if (mediaManagerRef.current) {
      mediaManagerRef.current.enableAudio(!isMuted);
    }

    await updateMuteMutation({
      variables: {
        callId: activeCall.id,
        userId: user.id,
        isMuted: !isMuted,
      },
    });

    if (signalingRef.current) {
      signalingRef.current.notifyMuteChange(activeCall.id, user.id, !isMuted);
    }
  }, [activeCall, user, isMuted, toggleLocalMute, updateMuteMutation]);

  const toggleVideo = useCallback(async () => {
    if (!activeCall || !user) return;

    toggleLocalVideo();

    if (mediaManagerRef.current) {
      mediaManagerRef.current.enableVideo(!isVideoEnabled);
    }

    await updateVideoMutation({
      variables: {
        callId: activeCall.id,
        userId: user.id,
        isVideoEnabled: !isVideoEnabled,
      },
    });

    if (signalingRef.current) {
      signalingRef.current.notifyVideoChange(
        activeCall.id,
        user.id,
        !isVideoEnabled,
      );
    }
  }, [activeCall, user, isVideoEnabled, toggleLocalVideo, updateVideoMutation]);

  const toggleScreenShare = useCallback(async () => {
    if (!activeCall || !user) return;

    if (!isScreenSharing) {
      // Start screen share
      if (mediaManagerRef.current) {
        const stream = await mediaManagerRef.current.getDisplayMedia();
        setLocalScreenSharing(true);

        // Replace video track in peer connection
        if (peerConnectionRef.current) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const videoSenders =
              peerConnectionRef.current.getLocalVideoTracks();
            if (videoSenders.length > 0) {
              peerConnectionRef.current.replaceTrack(
                videoSenders[0].track.id,
                videoTrack,
              );
            }
          }
        }

        await updateScreenShareMutation({
          variables: {
            callId: activeCall.id,
            userId: user.id,
            isScreenSharing: true,
          },
        });

        if (signalingRef.current) {
          signalingRef.current.notifyScreenShareStarted(activeCall.id, user.id);
        }
      }
    } else {
      // Stop screen share
      if (mediaManagerRef.current) {
        mediaManagerRef.current.stopScreenShare();
        setLocalScreenSharing(false);

        await updateScreenShareMutation({
          variables: {
            callId: activeCall.id,
            userId: user.id,
            isScreenSharing: false,
          },
        });

        if (signalingRef.current) {
          signalingRef.current.notifyScreenShareStopped(activeCall.id, user.id);
        }
      }
    }
  }, [
    activeCall,
    user,
    isScreenSharing,
    setLocalScreenSharing,
    updateScreenShareMutation,
  ]);

  // ==========================================================================
  // Cleanup on unmount
  // ==========================================================================

  useEffect(() => {
    return () => {
      cleanup();
      if (signalingRef.current) {
        signalingRef.current.disconnect();
      }
    };
  }, [cleanup]);

  return {
    isInCall,
    callState,
    callType,
    callDuration,
    participants,
    incomingCalls,
    hasIncomingCall,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    localStream,
    remoteStreams,
    initiateVoiceCall,
    initiateVideoCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    error,
  };
}
