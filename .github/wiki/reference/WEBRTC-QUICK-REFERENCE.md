# WebRTC & Streaming Quick Reference

**Version**: 0.9.1
**Last Updated**: February 3, 2026

Quick reference for implementing voice/video calls and live streaming in nself-chat.

---

## Table of Contents

1. [Voice/Video Calls](#voicevideo-calls)
2. [Screen Sharing](#screen-sharing)
3. [Live Streaming](#live-streaming)
4. [Call Recording](#call-recording)
5. [Quality Management](#quality-management)
6. [Troubleshooting](#troubleshooting)

---

## Voice/Video Calls

### Start a Call

```typescript
import { CallManager } from '@/lib/webrtc/call-manager'

// Initialize
const callManager = new CallManager({
  userId: 'user-123',
  userName: 'John Doe',
  iceServers: getIceServers(),
})

// Start voice call
await callManager.initiateCall('target-user-id', 'Jane Doe', 'voice')

// Start video call
await callManager.initiateCall('target-user-id', 'Jane Doe', 'video')
```

### Accept/Decline Calls

```typescript
// Accept with video
await callManager.acceptCall(callId, true)

// Accept audio-only
await callManager.acceptCall(callId, false)

// Decline
callManager.declineCall(callId, 'busy')
```

### Call Controls

```typescript
// Mute/unmute microphone
const isMuted = callManager.toggleMute()

// Toggle video
const isVideoOn = callManager.toggleVideo()

// End call
await callManager.endCall('completed')
```

### Group Calls (LiveKit)

```typescript
import { LiveKitClient } from '@/lib/webrtc/livekit-client'

// Join group call
const livekit = new LiveKitClient(config)
await livekit.joinRoom(roomName, {
  token: await getLiveKitToken(roomName, userName),
  audio: true,
  video: true,
})

// Leave room
await livekit.leaveRoom()
```

---

## Screen Sharing

### Start Screen Share

```typescript
// In active call
await callManager.startScreenShare()

// Stop screen share
callManager.stopScreenShare()
```

### Screen Recording

```typescript
import { ScreenRecorder } from '@/lib/webrtc/screen-recorder'

const recorder = new ScreenRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000,
})

await recorder.start()

// Stop and get recording
const blob = await recorder.stop()
const url = URL.createObjectURL(blob)
```

### Screen Annotations

```typescript
import { ScreenAnnotator } from '@/lib/webrtc/screen-annotator'

const annotator = new ScreenAnnotator(canvasElement, {
  color: '#FF0000',
  lineWidth: 3,
})

// Start drawing
annotator.startDrawing('pen')

// Add shapes
annotator.addShape('rectangle', { x: 100, y: 100, width: 200, height: 150 })

// Clear annotations
annotator.clear()
```

---

## Live Streaming

### Create Stream

```typescript
import { StreamManager } from '@/lib/streaming/stream-manager'

const streamManager = new StreamManager()

const stream = await streamManager.createStream({
  channelId: 'my-channel',
  title: 'Live Stream Title',
  description: 'Stream description',
  scheduledAt: '2026-02-03T20:00:00Z', // Optional
  maxResolution: '1080p',
  enableChat: true,
  enableReactions: true,
})
```

### Go Live

```typescript
// Start streaming
await streamManager.startStream(stream.id)

// End stream
await streamManager.endStream(stream.id)
```

### Watch Stream

```typescript
import { StreamClient } from '@/lib/streaming/stream-client'

const client = new StreamClient({
  onChatMessage: (msg) => console.log(msg),
  onReaction: (reaction) => showReaction(reaction),
  onViewerCount: (count) => updateCount(count),
})

// Connect to stream
await client.connect(streamId)

// Get HLS manifest URL
const hlsUrl = await streamManager.getHlsManifestUrl(streamId)

// Disconnect
await client.disconnect()
```

### Stream Chat

```typescript
// Send chat message
await client.sendChatMessage({
  streamId: stream.id,
  content: 'Hello everyone!',
})

// Listen to messages
client.on('chat:message', (message) => {
  console.log(`${message.user.name}: ${message.content}`)
})
```

### Stream Reactions

```typescript
// Send reaction
await client.sendReaction({
  streamId: stream.id,
  emoji: '❤️',
  positionX: 100, // Optional
  positionY: 200, // Optional
})

// Listen to reactions
client.on('stream:reaction', (reaction) => {
  showAnimatedReaction(reaction.emoji)
})
```

---

## Call Recording

### Start Recording

```typescript
// Enable recording when creating call
const stream = await streamManager.createStream({
  isRecorded: true,
  // ... other options
})

// Or start during call
await callManager.startRecording({
  participantConsent: ['user1', 'user2'],
  format: 'mp4',
  resolution: '720p',
})
```

### Stop Recording

```typescript
const recording = await callManager.stopRecording()

// Recording saved to S3
console.log(recording.url) // https://cdn.example.com/recordings/call-123.mp4
```

### Get Recording

```typescript
// Get call recording
const call = await fetch(`/api/calls/${callId}`)
const { recordingUrl } = await call.json()

// Get stream recording
const stream = await streamManager.getStream(streamId)
const recordingUrl = stream.recordingUrl
```

---

## Quality Management

### Video Quality Presets

```typescript
import { QUALITY_PRESETS } from '@/types/calls'

// Available presets
QUALITY_PRESETS.low // 320x240 @ 15fps, 250 kbps
QUALITY_PRESETS.medium // 640x480 @ 24fps, 500 kbps
QUALITY_PRESETS.high // 1280x720 @ 30fps, 1500 kbps
QUALITY_PRESETS.hd // 1920x1080 @ 30fps, 3000 kbps
```

### Monitor Call Quality

```typescript
import { CallQualityMonitor } from '@/lib/calls/call-quality-monitor'

const monitor = new CallQualityMonitor(peerConnection, {
  onQualityChange: (metrics) => {
    console.log('Quality:', metrics.qualityScore)
    console.log('Bitrate:', metrics.bitrate)
    console.log('Packet Loss:', metrics.packetsLost)
    console.log('RTT:', metrics.roundTripTime)
  },
})

monitor.start()
```

### Adaptive Bitrate

```typescript
// LiveKit handles this automatically
// Manual control:
await livekit.publishLocalTracks({
  video: true,
  videoQuality: 'high', // 'low' | 'medium' | 'high' | 'ultra'
  simulcast: true, // Enable multiple quality layers
})
```

---

## API Endpoints

### Call Endpoints

```bash
# Initiate call
POST /api/calls/initiate
{
  "targetUserId": "user-123",
  "callType": "video",
  "channelId": "optional"
}

# Accept call
POST /api/calls/accept
{
  "callId": "call-123",
  "withVideo": true
}

# Decline call
POST /api/calls/decline
{
  "callId": "call-123",
  "reason": "busy"
}

# End call
POST /api/calls/end
{
  "callId": "call-123",
  "reason": "completed"
}
```

### LiveKit Token

```bash
# Get room token
POST /api/livekit/token
{
  "roomName": "group-call-123",
  "participantName": "John Doe",
  "participantMetadata": "{\"userId\":\"user-123\"}"
}

# Response
{
  "token": "eyJhbGc...",
  "url": "wss://livekit.example.com"
}
```

### Streaming Endpoints

```bash
# Create stream
POST /api/streams/create
{
  "channelId": "channel-123",
  "title": "My Stream",
  "enableChat": true
}

# Start stream
POST /api/streams/{id}/start

# End stream
POST /api/streams/{id}/end

# Send chat message
POST /api/streams/{id}/chat
{
  "content": "Hello!"
}

# Send reaction
POST /api/streams/{id}/reactions
{
  "emoji": "❤️"
}

# Get analytics
GET /api/streams/{id}/analytics
```

---

## Environment Variables

```bash
# LiveKit Configuration
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.example.com

# TURN Servers
NEXT_PUBLIC_TURN_SERVER_URL=turn:turn.example.com:3478
NEXT_PUBLIC_TURN_USERNAME=username
NEXT_PUBLIC_TURN_CREDENTIAL=password

# STUN Servers (fallback)
NEXT_PUBLIC_STUN_SERVER_URL=stun:stun.l.google.com:19302

# Recording
RECORDING_S3_BUCKET=call-recordings
RECORDING_S3_REGION=us-east-1
RECORDING_RETENTION_DAYS=30

# Streaming
RTMP_INGEST_URL=rtmp://ingest.example.com/live
HLS_CDN_URL=https://cdn.example.com/hls
STREAM_MAX_BITRATE=5000
STREAM_MAX_RESOLUTION=1080p
```

---

## Component Usage

### Call Modal

```tsx
import { CallModal } from '@/components/call/call-modal'
;<CallModal
  isOpen={isCallActive}
  onClose={() => endCall()}
  callType="video"
  participants={participants}
  localStream={localStream}
  remoteStreams={remoteStreams}
/>
```

### Stream Player

```tsx
import { StreamPlayer } from '@/components/streaming/stream-player'
;<StreamPlayer
  streamId={streamId}
  hlsUrl={hlsUrl}
  autoplay={true}
  controls={true}
  onEnded={() => console.log('Stream ended')}
/>
```

### Stream Chat

```tsx
import { StreamChat } from '@/components/streaming/stream-chat'
;<StreamChat streamId={streamId} onMessageSend={(content) => sendMessage(content)} />
```

---

## Store Usage

### Call Store

```typescript
import { useCallStore } from '@/stores/call-store'

// In component
const {
  activeCall,
  initiateCall,
  acceptCall,
  endCall,
  toggleLocalMute,
  toggleLocalVideo,
  isLocalMuted,
  isLocalVideoEnabled,
} = useCallStore()

// Start call
initiateCall(callId, userId, userName, 'video')

// During call
toggleLocalMute() // Mute/unmute
toggleLocalVideo() // Video on/off

// End call
endCall('completed')
```

---

## Hooks

### useCall

```typescript
import { useCall } from '@/hooks/use-call'

const {
  call,
  initiateCall,
  acceptCall,
  declineCall,
  endCall,
  toggleMute,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
} = useCall()
```

### useStream

```typescript
import { useStream } from '@/hooks/use-stream'

const {
  stream,
  isLive,
  viewerCount,
  chatMessages,
  sendChatMessage,
  sendReaction,
  startStream,
  endStream,
} = useStream(streamId)
```

---

## Troubleshooting

### Call Won't Connect

```typescript
// 1. Check ICE servers
const iceServers = getIceServers()
console.log('ICE Servers:', iceServers)

// 2. Check TURN credentials
if (!process.env.NEXT_PUBLIC_TURN_USERNAME) {
  console.error('TURN server not configured')
}

// 3. Test connectivity
await testWebRTCConnectivity()
```

### No Video/Audio

```typescript
// 1. Check permissions
const permissions = await navigator.permissions.query({ name: 'camera' })
console.log('Camera permission:', permissions.state)

// 2. Check devices
const devices = await navigator.mediaDevices.enumerateDevices()
console.log('Available devices:', devices)

// 3. Test media stream
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
console.log('Stream tracks:', stream.getTracks())
```

### Poor Quality

```typescript
// 1. Check network stats
const stats = await peerConnection.getStats()
stats.forEach((report) => {
  if (report.type === 'inbound-rtp') {
    console.log('Packets lost:', report.packetsLost)
    console.log('Jitter:', report.jitter)
  }
})

// 2. Lower quality preset
await livekit.publishLocalTracks({
  video: true,
  videoQuality: 'medium', // or 'low'
})

// 3. Disable video
await livekit.toggleCamera() // Audio-only
```

### Stream Not Playing

```typescript
// 1. Check HLS URL
const hlsUrl = await streamManager.getHlsManifestUrl(streamId)
console.log('HLS URL:', hlsUrl)

// 2. Test manifest
const response = await fetch(hlsUrl)
console.log('Manifest status:', response.status)

// 3. Check browser support
if (Hls.isSupported()) {
  console.log('HLS.js supported')
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  console.log('Native HLS supported')
} else {
  console.error('HLS not supported')
}
```

---

## Performance Tips

### Optimize Calls

1. **Use audio-only when possible**: Saves 80% bandwidth
2. **Enable simulcast**: Automatic quality adaptation
3. **Limit participants**: Max 8-12 for grid view
4. **Use spotlight mode**: For large groups (13-50 participants)
5. **Disable video backgrounds**: Reduces CPU usage

### Optimize Streaming

1. **Use CDN**: For > 100 concurrent viewers
2. **Enable adaptive bitrate**: Automatic quality switching
3. **Limit chat rate**: Prevent spam (e.g., 1 msg/second)
4. **Throttle reactions**: Batch updates (e.g., every 100ms)
5. **Use quality presets**: Match network conditions

---

## Security Best Practices

1. **Always use HTTPS/WSS**: Required for WebRTC
2. **Validate JWT tokens**: On every request
3. **Rotate stream keys**: After each stream
4. **Moderate chat**: Auto-filter profanity
5. **Get recording consent**: Before starting
6. **Implement rate limits**: Prevent abuse
7. **Use TURN over TLS**: Secure relay traffic

---

## Resources

- [WebRTC Guide](../guides/Video-Calling-Guide.md)
- [Streaming Guide](/docs/guides/Live-Streaming-Guide.md)
- [Implementation Summary](/.claude/implementation/PHASE-8-WEBRTC-STREAMING-COMPLETE.md)
- [LiveKit Docs](https://docs.livekit.io/)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

**Last Updated**: February 3, 2026
**Version**: 0.9.1
