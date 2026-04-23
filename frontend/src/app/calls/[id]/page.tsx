/**
 * Call Page
 *
 * Full-screen call interface using LiveKit for voice/video calls.
 * Supports 1-on-1 and group calls with screen sharing.
 *
 * Requires the livekit plugin from the nChat bundle. When the plugin is absent
 * (NEXT_PUBLIC_LIVEKIT_URL is not set) the page renders an upsell CTA instead
 * of attempting a connection.
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CallWindow } from '@/components/voice-video/CallWindow'
import { CallNotification } from '@/components/voice-video/CallNotification'
import { useCallStore } from '@/stores/call-store'
import { useAuth } from '@/contexts/auth-context'
import { getLiveKitClient, getLiveKitToken } from '@/lib/webrtc/livekit-client'
import { nchatBundle } from '@/lib/features/bundle-detect'
import { logger } from '@/lib/logger'
import { Loader2, Video, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { CallParticipant } from '@/components/voice-video/CallWindow'

// =============================================================================
// Bundle upsell — shown when livekit plugin is not installed
// =============================================================================

function LiveKitBundleUpsell() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="rounded-full bg-white/10 p-4">
          <Video className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white">Voice &amp; video calls</h2>
        <p className="text-sm text-gray-400">
          Voice and video calls require the nChat bundle (livekit plugin). Install it with a Basic
          license ($0.99/mo) to unlock calls, screen sharing, and recording.
        </p>
        <a
          href="https://nself.org/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Get nChat Bundle
          <ExternalLink className="h-4 w-4" />
        </a>
        <p className="text-xs text-gray-500">
          Already have a key?{' '}
          <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">
            nself license set nself_pro_...
          </code>
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function CallPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const callId = params.id as string

  // Store
  const {
    activeCall,
    incomingCalls,
    toggleLocalMute,
    toggleLocalVideo,
    setLocalScreenSharing,
    endCall,
    acceptCall,
    declineCall,
  } = useCallStore()

  // Get local media states from active call
  const isLocalMuted = activeCall?.isLocalMuted || false
  const isLocalVideoEnabled = activeCall?.isLocalVideoEnabled || false
  const isScreenSharing = activeCall?.isLocalScreenSharing || false

  // Local state
  const [isConnecting, setIsConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [participants, setParticipants] = useState<CallParticipant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())

  // LiveKit client
  const liveKitClient = getLiveKitClient()

  // Initialize call connection
  useEffect(() => {
    if (!user || !callId) return

    const initializeCall = async () => {
      try {
        setIsConnecting(true)
        logger.info('[Call Page] Initializing call', { callId })

        // Get LiveKit token from backend
        const token = await getLiveKitToken(callId, user.displayName || user.email)

        // Connect to room
        const room = await liveKitClient.connect(
          {
            url: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880',
            token,
            roomName: callId,
            identity: user.id,
            name: user.displayName || user.email,
          },
          {
            onConnectionStateChange: (state) => {
              logger.info('[Call Page] Connection state changed', { state })
              if (state === 'connected') {
                setIsConnecting(false)
              } else if (state === 'disconnected') {
                handleEndCall()
              }
            },
            onParticipantConnected: (participantId) => {
              logger.info('[Call Page] Participant connected', { participantId })
              toast.success('Participant joined the call')
            },
            onParticipantDisconnected: (participantId) => {
              logger.info('[Call Page] Participant disconnected', { participantId })
              toast.info('Participant left the call')
            },
            onError: (error) => {
              logger.error('[Call Page] LiveKit error', error)
              setConnectionError(error.message)
              toast.error('Call connection error')
            },
          }
        )

        // Publish local tracks
        const isVideoCall = activeCall?.type === 'video'
        await liveKitClient.publishTracks(true, isVideoCall)

        logger.info('[Call Page] Call initialized successfully')
      } catch (error) {
        logger.error('[Call Page] Failed to initialize call', error)
        setConnectionError('Failed to connect to call')
        toast.error('Failed to join call')
      }
    }

    initializeCall()

    return () => {
      // Cleanup on unmount
      liveKitClient.disconnect()
    }
  }, [user, callId])

  // Call duration timer
  useEffect(() => {
    if (!activeCall || activeCall.state !== 'connected') return

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeCall])

  // Handle toggle mute
  const handleToggleMute = useCallback(async () => {
    try {
      await liveKitClient.toggleMicrophone()
      toggleLocalMute()
    } catch (error) {
      logger.error('[Call Page] Failed to toggle mute', error)
      toast.error('Failed to toggle microphone')
    }
  }, [toggleLocalMute])

  // Handle toggle video
  const handleToggleVideo = useCallback(async () => {
    try {
      await liveKitClient.toggleCamera()
      toggleLocalVideo()
    } catch (error) {
      logger.error('[Call Page] Failed to toggle video', error)
      toast.error('Failed to toggle camera')
    }
  }, [toggleLocalVideo])

  // Handle toggle screen share
  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        await liveKitClient.stopScreenShare()
        setLocalScreenSharing(false)
      } else {
        await liveKitClient.startScreenShare()
        setLocalScreenSharing(true)
      }
    } catch (error) {
      logger.error('[Call Page] Failed to toggle screen share', error)
      toast.error('Failed to toggle screen sharing')
    }
  }, [isScreenSharing, setLocalScreenSharing])

  // Handle end call
  const handleEndCall = useCallback(() => {
    logger.info('[Call Page] Ending call')
    endCall()
    liveKitClient.disconnect()
    router.push('/chat')
  }, [endCall, router])

  // Handle switch camera (mobile)
  const handleSwitchCamera = useCallback(async () => {
    try {
      await liveKitClient.switchCamera()
      toast.success('Camera switched')
    } catch (error) {
      logger.error('[Call Page] Failed to switch camera', error)
      toast.error('Failed to switch camera')
    }
  }, [])

  // Handle accept incoming call
  const handleAcceptIncoming = useCallback(
    (callId: string, withVideo: boolean) => {
      acceptCall(callId)
      if (withVideo) {
        handleToggleVideo()
      }
    },
    [acceptCall, handleToggleVideo]
  )

  // Handle decline incoming call
  const handleDeclineIncoming = useCallback(
    (callId: string) => {
      declineCall(callId)
    },
    [declineCall]
  )

  // Guard: livekit plugin must be installed (checked after all hooks)
  if (!nchatBundle.livekit) {
    return <LiveKitBundleUpsell />
  }

  // Show loading state
  if (isConnecting) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
          <p className="text-lg text-white">Connecting to call...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (connectionError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg text-red-500">Failed to connect to call</p>
          <p className="text-sm text-gray-400">{connectionError}</p>
          <button
            onClick={() => router.push('/chat')}
            className="rounded-lg bg-white px-6 py-2 text-gray-900 hover:bg-gray-100"
          >
            Return to Chat
          </button>
        </div>
      </div>
    )
  }

  // Show call window
  if (!activeCall || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg text-white">No active call</p>
          <button
            onClick={() => router.push('/chat')}
            className="rounded-lg bg-white px-6 py-2 text-gray-900 hover:bg-gray-100"
          >
            Return to Chat
          </button>
        </div>
      </div>
    )
  }

  const callWindowProps: any = {
    callId: activeCall.id,
    callType: activeCall.type,
    duration: callDuration,
    currentUserId: user.id,
    participants,
    isAudioCall: activeCall.type === 'voice',
    onToggleMute: handleToggleMute,
    onToggleVideo: handleToggleVideo,
    onToggleScreenShare: handleToggleScreenShare,
    onEndCall: handleEndCall,
  }

  return (
    <>
      {/* Main call window */}
      <CallWindow {...callWindowProps} />

      {/* Incoming call notifications */}
      {incomingCalls.length > 0 && (
        <CallNotification
          call={
            incomingCalls[0]
              ? {
                  id: incomingCalls[0].id,
                  callerId: incomingCalls[0].callerId,
                  callerName: incomingCalls[0].callerName,
                  callerAvatarUrl: incomingCalls[0].callerAvatarUrl,
                  type: incomingCalls[0].type,
                  receivedAt: new Date(incomingCalls[0].receivedAt),
                }
              : null
          }
          onAccept={handleAcceptIncoming}
          onDecline={handleDeclineIncoming}
        />
      )}
    </>
  )
}
