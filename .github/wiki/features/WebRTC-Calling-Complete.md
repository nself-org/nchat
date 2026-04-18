# WebRTC Voice and Video Calling - Complete Implementation Guide

**Version:** 0.4.0
**Status:** Production Ready
**Last Updated:** January 30, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation & Setup](#installation--setup)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Client Components](#client-components)
8. [Usage Examples](#usage-examples)
9. [Configuration](#configuration)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Performance Optimization](#performance-optimization)

---

## Overview

The nself-chat WebRTC calling system provides enterprise-grade voice and video communication capabilities with support for:

- **1-on-1 Calls**: Direct voice or video calls between two users
- **Group Calls**: Multi-participant calls with up to 50 participants
- **Screen Sharing**: Share your screen with call participants
- **Call Recording**: Record calls for later playback (optional)
- **Quality Monitoring**: Real-time call quality metrics and adaptive bitrate
- **Network Resilience**: Automatic reconnection and quality adjustment

### Key Technologies

- **WebRTC**: Peer-to-peer real-time communication
- **MediaSoup Client**: Production-grade SFU support for group calls
- **Simple Peer**: Simplified WebRTC peer connections for 1-on-1 calls
- **Socket.io**: Real-time signaling and presence
- **GraphQL**: Database operations via Hasura
- **Zustand**: Client-side state management

---

## Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Client A      │◄───────►│  Signaling       │◄───────►│   Client B      │
│   (Browser)     │         │  Server          │         │   (Browser)     │
│                 │         │  (Socket.io)     │         │                 │
│ ┌─────────────┐ │         └──────────────────┘         │ ┌─────────────┐ │
│ │  WebRTC     │ │                                       │ │  WebRTC     │ │
│ │  Peer       │ │◄──────────────────────────────────────►│ │  Peer       │ │
│ │  Connection │ │         Media Stream (P2P)           │ │  Connection │ │
│ └─────────────┘ │                                       │ └─────────────┘ │
└─────────────────┘                                       └─────────────────┘
         │                                                         │
         ├─────────────────────────────────────────────────────────┤
         │                                                         │
         ▼                                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database (Hasura)                     │
│                                                                       │
│  - nchat_calls                                                       │
│  - nchat_call_participants                                           │
│  - nchat_call_events                                                 │
│  - nchat_call_recordings                                             │
│  - nchat_call_quality_reports                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
src/
├── app/api/calls/
│   ├── initiate/route.ts       # POST /api/calls/initiate
│   ├── accept/route.ts         # POST /api/calls/accept
│   ├── decline/route.ts        # POST /api/calls/decline
│   └── end/route.ts            # POST /api/calls/end
│
├── components/calls/
│   ├── CallInvitation.tsx      # Incoming call notification overlay
│   ├── VideoCallModal.tsx      # Full-screen video call interface
│   ├── VideoGrid.tsx           # Grid layout for multiple participants
│   ├── SpeakerView.tsx         # Focused view on active speaker
│   ├── VideoControls.tsx       # Mute, video, screen share, end call
│   ├── CallStateIndicator.tsx  # Call status indicator
│   └── CallQualityIndicator.tsx # Network quality indicator
│
├── hooks/
│   ├── use-video-call.ts       # Main video call hook
│   ├── use-call-state.ts       # Call state machine
│   ├── use-call-invitation.ts  # Incoming call handling
│   ├── use-call-quality.ts     # Quality monitoring
│   └── use-video-layout.ts     # Video layout management
│
├── lib/
│   ├── calls/
│   │   ├── call-state-machine.ts    # Call lifecycle state management
│   │   ├── call-invitation.ts       # Call invitation management
│   │   ├── call-quality-monitor.ts  # Quality metrics and monitoring
│   │   ├── call-events.ts           # Event logging and tracking
│   │   └── group-call-manager.ts    # Multi-participant call management
│   │
│   └── webrtc/
│       ├── peer-connection.ts       # WebRTC peer connection wrapper
│       ├── media-manager.ts         # Media device management
│       ├── signaling.ts             # Signaling protocol
│       └── screen-capture.ts        # Screen sharing utilities
│
├── stores/
│   └── call-store.ts           # Zustand store for call state
│
└── graphql/
    └── calls.ts                # GraphQL queries and mutations
```

---

## Features

### 1. Voice Calls

- High-quality audio using Opus codec (48kHz)
- Noise suppression and echo cancellation
- Automatic gain control
- Audio level detection for visual feedback
- Mute/unmute controls

### 2. Video Calls

- Multiple quality levels (180p, 360p, 720p, 1080p)
- Adaptive bitrate based on network conditions
- Camera on/off controls
- Video tile layouts (grid, speaker view)
- Picture-in-picture mode

### 3. Screen Sharing

- Share entire screen or specific window
- High-quality screen capture
- Audio streaming from shared application
- Annotation tools (cursor highlighting, drawing)
- Screen recording

### 4. Group Calls

- Up to 50 participants (configurable)
- Automatic layout management
- Active speaker detection
- Participant video tiles
- Bandwidth optimization with simulcast

### 5. Call Management

- Call history and logs
- Call duration tracking
- Participant management
- Call quality reporting
- Event logging

---

## Installation & Setup

### 1. Dependencies

All required dependencies are already installed in package.json:

```json
{
  "dependencies": {
    "mediasoup-client": "^3.18.5",
    "simple-peer": "^9.11.1",
    "webrtc-adapter": "^9.0.3",
    "socket.io-client": "^4.8.1"
  }
}
```

### 2. Database Migrations

Run the database migrations to create call tables:

```bash
# Navigate to backend directory
cd .backend

# Run migrations
nself db migrate up
```

This creates the following tables:

- `nchat_calls`
- `nchat_call_participants`
- `nchat_call_events`
- `nchat_call_recordings`
- `nchat_ice_servers`
- `nchat_call_quality_reports`

### 3. Environment Variables

Configure ICE servers for WebRTC connectivity:

```bash
# .env.local

# STUN/TURN Servers (optional - defaults to Google STUN)
NEXT_PUBLIC_STUN_SERVER=stun:stun.l.google.com:19302
NEXT_PUBLIC_TURN_SERVER=turn:turn.example.com:3478
NEXT_PUBLIC_TURN_USERNAME=username
NEXT_PUBLIC_TURN_CREDENTIAL=credential

# WebRTC Configuration
NEXT_PUBLIC_ENABLE_VIDEO_CALLS=true
NEXT_PUBLIC_ENABLE_SCREEN_SHARING=true
NEXT_PUBLIC_ENABLE_CALL_RECORDING=false
NEXT_PUBLIC_MAX_CALL_PARTICIPANTS=50
```

### 4. AppConfig Setup

The calling features are configured in `src/config/app-config.ts`:

```typescript
features: {
  // ... other features
  voiceCalls: true,
  videoCalls: true,
  groupCalls: true,
  screenSharing: true,
  callRecording: false,
  maxCallParticipants: 50,
}
```

---

## Database Schema

### nchat_calls Table

```sql
CREATE TABLE nchat_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type nchat_call_type NOT NULL,              -- '1-on-1' or 'group'
  status nchat_call_status NOT NULL,          -- Current call status
  channel_id UUID REFERENCES nchat_channels,
  initiator_id UUID NOT NULL REFERENCES users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,                           -- Duration in seconds
  avg_packet_loss DECIMAL(5,2),
  avg_jitter DECIMAL(8,2),
  avg_round_trip_time DECIMAL(8,2),
  audio_codec VARCHAR(50) DEFAULT 'opus',
  sample_rate INTEGER DEFAULT 48000,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_recorded BOOLEAN DEFAULT false,
  recording_consent_given BOOLEAN DEFAULT false
);
```

### nchat_call_participants Table

```sql
CREATE TABLE nchat_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES nchat_calls,
  user_id UUID NOT NULL REFERENCES users,
  status nchat_call_participant_status NOT NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration INTEGER,
  is_muted BOOLEAN DEFAULT false,
  is_video_enabled BOOLEAN DEFAULT false,
  video_quality VARCHAR(10) DEFAULT '720p',
  is_screen_sharing BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  avg_packet_loss DECIMAL(5,2),
  avg_jitter DECIMAL(8,2),
  avg_round_trip_time DECIMAL(8,2),
  connection_quality VARCHAR(20) DEFAULT 'good',
  peer_connection_id VARCHAR(255),
  ice_connection_state VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(call_id, user_id)
);
```

### Call Status Enums

```sql
-- Call status
CREATE TYPE nchat_call_status AS ENUM (
  'initiating',
  'ringing',
  'connecting',
  'connected',
  'ended',
  'failed',
  'cancelled',
  'declined',
  'busy',
  'timeout',
  'no_answer'
);

-- Participant status
CREATE TYPE nchat_call_participant_status AS ENUM (
  'invited',
  'ringing',
  'connecting',
  'connected',
  'disconnected',
  'left',
  'declined',
  'busy'
);
```

---

## API Routes

### POST /api/calls/initiate

Initiates a new voice or video call.

**Request Body:**

```json
{
  "callId": "call-uuid",
  "type": "voice" | "video",
  "targetUserId": "user-uuid",  // For 1-on-1 calls
  "channelId": "channel-uuid",  // For group calls
  "metadata": {}
}
```

**Response:**

```json
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "type": "video",
    "status": "initiating",
    ...
  }
}
```

### POST /api/calls/accept

Accepts an incoming call.

**Request Body:**

```json
{
  "callId": "call-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "participant": {
    "id": "participant-uuid",
    "call_id": "call-uuid",
    "user_id": "user-uuid",
    "status": "connecting",
    ...
  }
}
```

### POST /api/calls/decline

Declines an incoming call.

**Request Body:**

```json
{
  "callId": "call-uuid",
  "reason": "busy" | "declined"
}
```

### POST /api/calls/end

Ends an active call.

**Request Body:**

```json
{
  "callId": "call-uuid",
  "duration": 120, // seconds
  "reason": "completed"
}
```

---

## Client Components

### CallInvitation Component

Displays incoming call notifications with accept/decline options.

```typescript
import { CallInvitation } from '@/components/calls/CallInvitation'

<CallInvitation
  userId={currentUser.id}
  userName={currentUser.name}
  userAvatarUrl={currentUser.avatar}
/>
```

**Features:**

- Full-screen overlay for incoming calls
- Caller information display
- Accept/Decline buttons
- Call type indicator (voice/video)
- Ring notification sound

### VideoCallModal Component

Full-screen video call interface with controls.

```typescript
import { VideoCallModal } from '@/components/calls/VideoCallModal'

<VideoCallModal
  userId={currentUser.id}
  userName={currentUser.name}
  userAvatarUrl={currentUser.avatar}
  onClose={() => {}}
/>
```

**Features:**

- Full-screen video interface
- Grid and speaker view layouts
- Video controls (mute, camera, screen share, end)
- Participant list
- Call duration timer
- Picture-in-picture mode

### Video Layout Components

```typescript
import { VideoGrid } from '@/components/calls/VideoGrid'
import { SpeakerView } from '@/components/calls/SpeakerView'

// Grid layout for equal-sized video tiles
<VideoGrid
  tiles={videoTiles}
  localStream={localStream}
  remoteStreams={remoteStreams}
  participants={participants}
/>

// Speaker view with main video and thumbnails
<SpeakerView
  mainTile={activeSpeakerTile}
  thumbnails={otherParticipantTiles}
  localStream={localStream}
  remoteStreams={remoteStreams}
  participants={participants}
/>
```

---

## Usage Examples

### Initiating a Call

```typescript
import { useVideoCall } from '@/hooks/use-video-call'

function ChannelPage() {
  const { startCall } = useVideoCall({
    userId: currentUser.id,
    userName: currentUser.name,
    userAvatarUrl: currentUser.avatar,
    onCallStarted: (callId) => {
      console.log('Call started:', callId)
    },
    onCallEnded: (callId, reason) => {
      console.log('Call ended:', callId, reason)
    },
  })

  const handleStartVideoCall = async () => {
    try {
      const callId = await startCall(
        targetUserId,
        targetUserName,
        channelId // optional for group calls
      )
      console.log('Call initiated:', callId)
    } catch (error) {
      console.error('Failed to start call:', error)
    }
  }

  return (
    <button onClick={handleStartVideoCall}>
      Start Video Call
    </button>
  )
}
```

### Accepting a Call

```typescript
import { useVideoCall } from '@/hooks/use-video-call'
import { useCallStore } from '@/stores/call-store'

function CallInvitationComponent() {
  const incomingCalls = useCallStore(state => state.incomingCalls)
  const { acceptCall } = useVideoCall({ /* ... */ })

  const handleAccept = async (callId: string) => {
    try {
      await acceptCall(callId)
    } catch (error) {
      console.error('Failed to accept call:', error)
    }
  }

  return (
    <div>
      {incomingCalls.map(call => (
        <div key={call.id}>
          <p>{call.callerName} is calling...</p>
          <button onClick={() => handleAccept(call.id)}>Accept</button>
        </div>
      ))}
    </div>
  )
}
```

### Managing Call State

```typescript
import { useCallStore } from '@/stores/call-store'

function CallControls() {
  const activeCall = useCallStore(state => state.activeCall)
  const toggleLocalMute = useCallStore(state => state.toggleLocalMute)
  const toggleLocalVideo = useCallStore(state => state.toggleLocalVideo)
  const endCall = useCallStore(state => state.endCall)

  if (!activeCall) return null

  return (
    <div className="call-controls">
      <button
        onClick={toggleLocalMute}
        className={activeCall.isLocalMuted ? 'active' : ''}
      >
        {activeCall.isLocalMuted ? 'Unmute' : 'Mute'}
      </button>

      <button
        onClick={toggleLocalVideo}
        className={activeCall.isLocalVideoEnabled ? 'active' : ''}
      >
        {activeCall.isLocalVideoEnabled ? 'Stop Video' : 'Start Video'}
      </button>

      <button onClick={() => endCall('completed')} className="danger">
        End Call
      </button>
    </div>
  )
}
```

---

## Configuration

### AppConfig

Configure calling features in `src/config/app-config.ts`:

```typescript
export const defaultAppConfig: AppConfig = {
  // ... other config
  features: {
    // Enable/disable calling features
    voiceCalls: true,
    videoCalls: true,
    groupCalls: true,
    screenSharing: true,
    callRecording: false,
    maxCallParticipants: 50,
  },
}
```

### ICE Servers

Configure STUN/TURN servers in the database:

```sql
-- Add custom TURN server
INSERT INTO nchat_ice_servers (
  urls,
  username,
  credential,
  server_type,
  region,
  priority,
  is_public
) VALUES (
  ARRAY['turn:turn.example.com:3478'],
  'your-username',
  'your-credential',
  'turn',
  'us-east',
  100,
  false
);
```

Default STUN servers are automatically seeded:

- stun:stun.l.google.com:19302
- stun:stun1.l.google.com:19302
- stun:stun2.l.google.com:19302

### Video Quality Presets

Configure video quality in `src/lib/webrtc/media-manager.ts`:

```typescript
export const VIDEO_QUALITY_PRESETS = {
  low: { width: 320, height: 180, frameRate: 15 },
  medium: { width: 1280, height: 720, frameRate: 30 },
  high: { width: 1920, height: 1080, frameRate: 30 },
}
```

---

## Testing

### Manual Testing

1. **1-on-1 Voice Call**
   - Open two browser windows
   - Log in as different users
   - Initiate a voice call from one user
   - Accept the call from the other user
   - Test mute/unmute functionality
   - End the call

2. **1-on-1 Video Call**
   - Same as voice call, but with video enabled
   - Test camera on/off
   - Test video quality switching
   - Test picture-in-picture mode

3. **Screen Sharing**
   - Start a video call
   - Click screen share button
   - Select window/screen to share
   - Verify remote user sees shared screen
   - Stop screen sharing

4. **Group Call**
   - Open 3-5 browser windows
   - Start a group call in a channel
   - Have each user join the call
   - Test grid and speaker layouts
   - Verify audio/video from all participants

### Automated Testing

```bash
# Run unit tests
pnpm test src/hooks/use-video-call.test.ts
pnpm test src/lib/webrtc/peer-connection.test.ts

# Run E2E tests
pnpm test:e2e tests/e2e/calls.spec.ts
```

---

## Troubleshooting

### Common Issues

#### 1. No Audio/Video

**Problem:** Camera or microphone not working.

**Solution:**

- Check browser permissions
- Ensure HTTPS or localhost
- Verify device availability with `navigator.mediaDevices.enumerateDevices()`
- Check browser console for errors

#### 2. Connection Failed

**Problem:** WebRTC connection fails to establish.

**Solution:**

- Verify STUN/TURN server configuration
- Check firewall settings (UDP ports)
- Test with different network conditions
- Review ICE candidate generation logs

#### 3. Poor Call Quality

**Problem:** Low video quality or choppy audio.

**Solution:**

- Check network bandwidth
- Enable adaptive bitrate
- Reduce video quality preset
- Monitor packet loss and jitter metrics

#### 4. Echo or Feedback

**Problem:** Audio echo during calls.

**Solution:**

- Use headphones
- Enable echo cancellation
- Check for multiple audio sources
- Verify microphone settings

### Debug Logs

Enable debug logging:

```typescript
// In src/lib/webrtc/peer-connection.ts
const DEBUG = true

if (DEBUG) {
  console.log('[WebRTC] ICE Candidate:', candidate)
  console.log('[WebRTC] Connection State:', connectionState)
}
```

---

## Performance Optimization

### Bandwidth Management

```typescript
// Adjust video bitrate based on network conditions
const constraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
    bitrate: { target: 1000000, max: 2500000 }, // bps
  },
}
```

### Simulcast for Group Calls

Enable simulcast to send multiple quality streams:

```typescript
// In group-call-manager.ts
const simulcastConfig = {
  encodings: [
    { rid: 'high', maxBitrate: 2500000, scaleResolutionDownBy: 1 },
    { rid: 'medium', maxBitrate: 800000, scaleResolutionDownBy: 2 },
    { rid: 'low', maxBitrate: 200000, scaleResolutionDownBy: 4 },
  ],
}
```

### Connection Pooling

Reuse peer connections for multiple participants:

```typescript
const peerConnectionPool = new Map<string, RTCPeerConnection>()

function getOrCreatePeerConnection(userId: string): RTCPeerConnection {
  if (!peerConnectionPool.has(userId)) {
    peerConnectionPool.set(userId, createPeerConnection())
  }
  return peerConnectionPool.get(userId)!
}
```

---

## Security Considerations

### End-to-End Encryption

WebRTC provides encryption by default using DTLS-SRTP. All media streams are encrypted between peers.

### Authentication

All API routes require authentication via `getServerSession()`.

### Permission Checks

Verify user permissions before allowing calls:

```typescript
const canStartCall = user.hasPermission('calls:create')
const canJoinCall = user.hasPermission('calls:join')
```

### Recording Consent

Always obtain consent before recording:

```sql
UPDATE nchat_calls
SET recording_consent_given = true
WHERE id = call_id
  AND ALL(participants_agreed);
```

---

## Roadmap

### v0.4.1 (Q1 2026)

- [ ] Call transfer support
- [ ] Call hold/resume
- [ ] Conference bridge numbers
- [ ] Voicemail system

### v0.4.2 (Q2 2026)

- [ ] Advanced call analytics
- [ ] AI-powered noise suppression
- [ ] Virtual backgrounds
- [ ] Live transcription/captions

### v0.5.0 (Q3 2026)

- [ ] SIP gateway integration
- [ ] PSTN calling support
- [ ] Advanced call routing
- [ ] IVR system

---

## Support and Resources

### Documentation

- [Voice Calling Quick Start](../reference/Voice-Calling-Quick-Start.md)
- [Media Server Setup](./Media-Server-Setup.md)
- [WebRTC Best Practices](../guides/WebRTC-Best-Practices.md)

### Community

- GitHub Issues: https://github.com/your-org/nself-chat/issues
- Discord: https://discord.gg/nself-chat
- Email: support@nself.chat

### Credits

- Built with [MediaSoup](https://mediasoup.org/)
- WebRTC implementation based on [Simple Peer](https://github.com/feross/simple-peer)
- UI components from [Radix UI](https://www.radix-ui.com/)

---

**Last Updated:** January 30, 2026
**Version:** 0.4.0
**Status:** ✅ Production Ready
