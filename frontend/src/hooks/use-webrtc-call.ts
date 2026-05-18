/**
 * WebRTC Call Hook
 *
 * Manages voice/video calls using LiveKit
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  Track,
  ConnectionState,
  Participant,
  RemoteTrackPublication,
  LocalTrack,
  createLocalTracks,
} from "livekit-client";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

export interface CallParticipant {
  identity: string;
  name: string;
  isLocal: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  isSpeaking: boolean;
  connectionQuality: "excellent" | "good" | "poor" | "unknown";
}

export interface UseWebRTCCallOptions {
  onParticipantJoined?: (participant: CallParticipant) => void;
  onParticipantLeft?: (participant: CallParticipant) => void;
  onError?: (error: Error) => void;
  onDisconnected?: () => void;
}

export interface UseWebRTCCallReturn {
  // Room state
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connectionState: ConnectionState;

  // Participants
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  participants: CallParticipant[];

  // Actions
  joinCall: (callId: string) => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;

  // State
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
}

export function useWebRTCCall(
  options: UseWebRTCCallOptions = {},
): UseWebRTCCallReturn {
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const roomRef = useRef<Room | null>(null);

  /**
   * Join a call
   */
  const joinCall = useCallback(
    async (callId: string) => {
      if (roomRef.current) {
        logger.warn("Already in a call");
        return;
      }

      try {
        setIsConnecting(true);
        setError(null);

        // Get call details and token from API
        const response = await fetch(`/api/calls/${callId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callId }),
        });

        if (!response.ok) {
          throw new Error("Failed to join call");
        }

        const {
          roomName,
          token,
          livekitUrl,
          iceServers,
        }: {
          roomName: string;
          token: string;
          livekitUrl: string;
          iceServers: RTCIceServer[];
        } = await response.json();

        // Create room
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
        });

        roomRef.current = newRoom;

        // Set up event listeners
        newRoom.on(RoomEvent.Connected, () => {
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionState(ConnectionState.Connected);
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          setIsConnected(false);
          setConnectionState(ConnectionState.Disconnected);
          options.onDisconnected?.();
        });

        newRoom.on(
          RoomEvent.ConnectionStateChanged,
          (state: ConnectionState) => {
            setConnectionState(state);
          },
        );

        newRoom.on(
          RoomEvent.ParticipantConnected,
          (participant: RemoteParticipant) => {
            setRemoteParticipants((prev) => [...prev, participant]);
            options.onParticipantJoined?.({
              identity: participant.identity,
              name: participant.name || participant.identity,
              isLocal: false,
              audioEnabled: participant.isMicrophoneEnabled,
              videoEnabled: participant.isCameraEnabled,
              screenShareEnabled: participant.isScreenShareEnabled,
              isSpeaking: false,
              connectionQuality: "unknown",
            });
          },
        );

        newRoom.on(
          RoomEvent.ParticipantDisconnected,
          (participant: RemoteParticipant) => {
            setRemoteParticipants((prev) =>
              prev.filter((p) => p.identity !== participant.identity),
            );
            options.onParticipantLeft?.({
              identity: participant.identity,
              name: participant.name || participant.identity,
              isLocal: false,
              audioEnabled: false,
              videoEnabled: false,
              screenShareEnabled: false,
              isSpeaking: false,
              connectionQuality: "unknown",
            });
          },
        );

        newRoom.on(
          RoomEvent.TrackSubscribed,
          (track, publication, participant) => {
            // Track subscribed - UI can attach to video/audio elements
          },
        );

        // Connect to room
        await newRoom.connect(livekitUrl, token);
        setRoom(newRoom);
      } catch (err) {
        logger.error("Failed to join call:", err);
        const error =
          err instanceof Error ? err : new Error("Failed to join call");
        setError(error);
        setIsConnecting(false);
        options.onError?.(error);
        throw error;
      }
    },
    [options],
  );

  /**
   * Leave call
   */
  const leaveCall = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setRemoteParticipants([]);
    }
  }, []);

  /**
   * Toggle audio
   */
  const toggleAudio = useCallback(async () => {
    if (!roomRef.current) return;

    const enabled = !isAudioEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    setIsAudioEnabled(enabled);
  }, [isAudioEnabled]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(async () => {
    if (!roomRef.current) return;

    const enabled = !isVideoEnabled;
    await roomRef.current.localParticipant.setCameraEnabled(enabled);
    setIsVideoEnabled(enabled);
  }, [isVideoEnabled]);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return;

    const enabled = !isScreenSharing;
    await roomRef.current.localParticipant.setScreenShareEnabled(enabled);
    setIsScreenSharing(enabled);
  }, [isScreenSharing]);

  /**
   * Convert participants to CallParticipant format
   */
  const participants: CallParticipant[] = [
    // Local participant
    ...(room?.localParticipant
      ? [
          {
            identity: room.localParticipant.identity,
            name: room.localParticipant.name || room.localParticipant.identity,
            isLocal: true,
            audioEnabled: isAudioEnabled,
            videoEnabled: isVideoEnabled,
            screenShareEnabled: isScreenSharing,
            isSpeaking: false,
            connectionQuality: "excellent" as const,
          },
        ]
      : []),
    // Remote participants
    ...remoteParticipants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      isLocal: false,
      audioEnabled: p.isMicrophoneEnabled,
      videoEnabled: p.isCameraEnabled,
      screenShareEnabled: p.isScreenShareEnabled,
      isSpeaking: false,
      connectionQuality: "unknown" as const,
    })),
  ];

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    connectionState,
    localParticipant: room?.localParticipant || null,
    remoteParticipants,
    participants,
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
  };
}
