/**
 * Call Provider
 *
 * Global provider that manages call state and renders call UI.
 * Integrates with the call hook and displays IncomingCallModal and CallInterface.
 *
 * Usage:
 * Wrap your app with <CallProvider> to enable calls throughout.
 */

"use client";

import React from "react";
import { useCall } from "@/hooks/use-call";
import { CallInterface } from "./CallInterface";
import { useCallStore } from "@/stores/call-store";

// =============================================================================
// Types
// =============================================================================

export interface CallProviderProps {
  children: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function CallProvider({ children }: CallProviderProps) {
  // Get call state from hook
  const {
    isInCall,
    callType,
    callState,
    callDuration,
    participants,
    incomingCalls,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    localStream,
    remoteStreams,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useCall();

  // Get connection quality from store
  const _activeCall = useCallStore((state) => state.activeCall);

  // Get remote participant (first one for 1:1 calls)
  const remoteUser =
    participants.length > 0
      ? {
          id: participants[0].id,
          name: participants[0].name,
          avatarUrl: participants[0].avatarUrl,
        }
      : null;

  // Get remote stream (first one for 1:1 calls)
  const remoteStream =
    remoteStreams.size > 0 ? Array.from(remoteStreams.values())[0] : null;

  // Determine connection quality based on call state
  const connectionQuality: "excellent" | "good" | "fair" | "poor" =
    callState === "connected" ? "good" : "fair";

  const isReconnecting = callState === "reconnecting";

  // Get first incoming call
  const incomingCall =
    incomingCalls.length > 0
      ? {
          id: incomingCalls[0].id,
          callerId: incomingCalls[0].callerId,
          callerName: incomingCalls[0].callerName,
          callerAvatarUrl: incomingCalls[0].callerAvatarUrl,
          type: incomingCalls[0].type,
        }
      : null;

  return (
    <>
      {children}

      {/* Global Call Interface */}
      <CallInterface
        isInCall={isInCall}
        callType={callType}
        callState={callState}
        callDuration={callDuration}
        remoteUser={remoteUser}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        localStream={localStream}
        remoteStream={remoteStream}
        connectionQuality={connectionQuality}
        isReconnecting={isReconnecting}
        incomingCall={incomingCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onEndCall={endCall}
        onAcceptIncoming={(callId, _withVideo) => acceptCall(callId)}
        onDeclineIncoming={(callId) => declineCall(callId)}
      />
    </>
  );
}

/**
 * Usage Example:
 *
 * // In your root layout or app component:
 * import { CallProvider } from '@/components/calls/CallProvider'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <CallProvider>
 *           {children}
 *         </CallProvider>
 *       </body>
 *     </html>
 *   )
 * }
 *
 * // In any component, initiate a call:
 * import { useCall } from '@/hooks/use-call'
 *
 * function ChatHeader() {
 *   const { initiateVoiceCall, initiateVideoCall } = useCall()
 *
 *   return (
 *     <div>
 *       <button onClick={() => initiateVoiceCall('user-id', 'John Doe')}>
 *         Voice Call
 *       </button>
 *       <button onClick={() => initiateVideoCall('user-id', 'John Doe')}>
 *         Video Call
 *       </button>
 *     </div>
 *   )
 * }
 */
