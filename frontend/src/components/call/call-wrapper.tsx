/**
 * Call Wrapper Component
 *
 * Manages all call-related UI including modals, incoming call notifications,
 * and active call interface. Should be mounted at the app level.
 */

"use client";

import * as React from "react";
import { useCall } from "@/hooks/use-call";
import { useCallStore } from "@/stores/call-store";
import { CallModal } from "./call-modal";
import { IncomingCallQueue } from "./incoming-call-modal";
import { MinimizedCall } from "./call-modal";
import { useAuth } from "@/contexts/auth-context";

// =============================================================================
// Component
// =============================================================================

export function CallWrapper() {
  const { user } = useAuth();

  // Call hook
  const {
    isInCall,
    callState,
    callType,
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
  } = useCall({
    enableNotifications: true,
  });

  // Store UI state
  const isCallMinimized = useCallStore(
    (state) => state.isCallControlsMinimized,
  );
  const setCallControlsMinimized = useCallStore(
    (state) => state.setCallControlsMinimized,
  );

  // Map participants for display
  const participantList = participants.map((p) => ({
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    isMuted: p.isMuted,
    isVideoEnabled: p.isVideoEnabled,
    isScreenSharing: p.isScreenSharing,
    isSpeaking: p.isSpeaking,
    stream: remoteStreams.get(p.id),
  }));

  // Decline all incoming calls
  const handleDeclineAll = React.useCallback(() => {
    incomingCalls.forEach((call) => declineCall(call.id));
  }, [incomingCalls, declineCall]);

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Active Call Modal */}
      {isInCall && !isCallMinimized && callType && (
        <CallModal
          open={isInCall}
          onOpenChange={(open) => {
            if (!open) {
              endCall();
            }
          }}
          callType={callType}
          callState={callState as any}
          callDuration={callDuration}
          participants={participantList}
          localStream={localStream || undefined}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onEndCall={endCall}
          isMinimized={isCallMinimized}
          onToggleMinimize={() => setCallControlsMinimized(!isCallMinimized)}
        />
      )}

      {/* Minimized Call View */}
      {isInCall && isCallMinimized && participants.length > 0 && (
        <MinimizedCall
          callType={callType || "voice"}
          callDuration={callDuration}
          participantName={participants[0].name}
          participantAvatar={participants[0].avatarUrl}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onEndCall={endCall}
          onExpand={() => setCallControlsMinimized(false)}
        />
      )}

      {/* Incoming Calls Queue */}
      {incomingCalls.length > 0 && !isInCall && (
        <IncomingCallQueue
          open={incomingCalls.length > 0}
          calls={incomingCalls.map((call) => ({
            callId: call.id,
            callerId: call.callerId,
            callerName: call.callerName,
            callerAvatarUrl: call.callerAvatarUrl,
            callType: call.type,
            channelName: undefined,
          }))}
          onAccept={acceptCall}
          onDecline={declineCall}
          onDeclineAll={handleDeclineAll}
        />
      )}
    </>
  );
}

CallWrapper.displayName = "CallWrapper";
