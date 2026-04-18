# Video Calling Guide

**Version**: 0.4.0
**Last Updated**: January 30, 2026

---

## Overview

nself-chat v0.4.0 introduces comprehensive HD video calling with support for up to 50 participants, including advanced features like background blur, virtual backgrounds, screen sharing, and adaptive bitrate streaming.

---

## Features

### Core Features

- **HD Video Calling**: Support for 180p, 360p, 720p, and 1080p resolutions
- **Multi-Participant**: Up to 50 participants in a single call
- **Grid View**: Automatic grid layout for all participants
- **Speaker View**: Main speaker with thumbnails
- **Screen Sharing**: Share your screen with all participants
- **Picture-in-Picture**: Continue working while in a call

### Video Quality

- **Adaptive Bitrate**: Automatically adjusts quality based on network conditions
- **Simulcast**: Sends multiple quality layers for SFU selection
- **Quality Profiles**:
  - **180p**: Low (320x180, 15fps, 150kbps) - for poor connections
  - **360p**: Medium (640x360, 24fps, 400kbps) - balanced quality
  - **720p**: HD (1280x720, 30fps, 1.5Mbps) - default, high quality
  - **1080p**: Full HD (1920x1080, 30fps, 3Mbps) - best quality

### Background Effects

- **Background Blur**: Light, medium, or strong blur
- **Virtual Backgrounds**: Replace background with images or colors
- **8 Preset Backgrounds**: Office, library, beach, mountains, space, etc.
- **Custom Images**: Upload your own background images
- **Edge Smoothing**: Adjustable edge detection for natural-looking effects

---

## Getting Started

### Starting a Video Call

**From Channel**:

```tsx
import { VideoCallButton } from '@/components/calls/VideoCallButton'
;<VideoCallButton channelId="channel-id" type="video" />
```

**From Direct Message**:

```tsx
import { useVideoCall } from '@/hooks/use-video-call'

const { startCall } = useVideoCall({
  userId: currentUser.id,
  userName: currentUser.name,
})

// Start 1-on-1 video call
await startCall(targetUserId, targetUserName)
```

### Joining a Call

When you receive an incoming video call:

1. **Accept**: Click "Accept" to join with video enabled
2. **Decline**: Click "Decline" to reject the call
3. **Audio Only**: Toggle video off before accepting

---

## Using Video Calls

### Basic Controls

**Mute/Unmute Audio**:

- Click the microphone button
- Keyboard shortcut: `M`
- Status: Red icon when muted

**Toggle Video**:

- Click the camera button
- Keyboard shortcut: `V`
- Shows avatar when video is off

**End Call**:

- Click the red phone button
- Keyboard shortcut: `Esc`

### Advanced Features

**Screen Sharing**:

```tsx
const { startScreenShare, stopScreenShare, isScreenSharing } = useVideoCall(options)

// Start sharing
await startScreenShare()

// Stop sharing
stopScreenShare()
```

**Picture-in-Picture**:

```tsx
const { enterPictureInPicture, exitPictureInPicture } = useVideoCall(options)

// Enter PiP mode
await enterPictureInPicture(videoElement)

// Exit PiP mode
await exitPictureInPicture()
```

### Layout Modes

**Grid View**:

- All participants in equal-sized tiles
- Automatic grid calculation
- Up to 4 tiles per row

**Speaker View**:

- Active speaker in main view
- Other participants in thumbnails
- Automatically switches on voice detection

**Pinned View**:

- Pin a specific participant to main view
- Other participants in thumbnails
- Click pin icon on any tile

---

## Background Effects

### Using Background Blur

```tsx
import { useBackgroundEffects } from '@/hooks/use-background-effects'

const { setEffectType, setBlurStrength, applyToStream } = useBackgroundEffects()

// Enable blur
setEffectType('blur')
setBlurStrength('medium') // 'light', 'medium', or 'strong'

// Apply to video stream
const processedStream = await applyToStream(originalStream)
```

### Using Virtual Backgrounds

```tsx
const { setVirtualBackground, selectPresetBackground } = useBackgroundEffects()

// Use preset background
await selectPresetBackground('office-1')

// Use custom image
await setVirtualBackground('image', 'https://example.com/background.jpg')

// Use solid color
await setVirtualBackground('color', '#3b82f6')
```

### Available Presets

**Professional**:

- Modern Office
- Conference Room
- Library

**Scenic**:

- Beach
- Mountains
- City Skyline

**Fun**:

- Space
- Abstract patterns

---

## Performance Optimization

### Adaptive Quality

The system automatically adjusts video quality based on:

- **Network Bandwidth**: Available upload/download speed
- **Packet Loss**: Reduces quality if >5% packet loss
- **RTT (Round-Trip Time)**: Latency to other participants
- **CPU Usage**: Performance on your device

### Manual Quality Control

```tsx
const { setVideoQuality } = useVideoCall(options)

// Set quality manually
await setVideoQuality('720p') // '180p', '360p', '720p', '1080p'
```

### Simulcast

Simulcast automatically sends 3 quality layers:

- **High**: Full resolution (e.g., 720p)
- **Medium**: Half resolution (e.g., 360p)
- **Low**: Quarter resolution (e.g., 180p)

The SFU server selects the appropriate layer for each participant based on their network conditions.

---

## Troubleshooting

### Camera Not Working

1. **Check Permissions**:
   - Browser settings > Camera access
   - Allow camera permission for the site

2. **Device Selection**:

   ```tsx
   const { selectCamera, availableCameras } = useVideoCall(options)

   // List cameras
   console.log(availableCameras)

   // Select specific camera
   await selectCamera(deviceId)
   ```

3. **Browser Support**:
   - Chrome 74+
   - Firefox 66+
   - Safari 12.1+
   - Edge 79+

### Poor Video Quality

1. **Check Network**:
   - Minimum: 500kbps upload/download
   - Recommended: 2Mbps+ for HD quality
   - Use [speedtest.net](https://speedtest.net)

2. **Reduce Quality**:

   ```tsx
   setVideoQuality('360p') // Lower quality for poor connections
   ```

3. **Close Other Apps**:
   - Close bandwidth-heavy applications
   - Limit number of participants
   - Disable background effects

### Audio Echo/Feedback

1. **Use Headphones**: Prevents microphone from picking up speaker audio
2. **Enable Echo Cancellation**: Automatic (enabled by default)
3. **Mute When Not Speaking**: Reduces ambient noise

### Background Effects Not Working

1. **Browser Compatibility**:
   - Requires WebGL support
   - Check: Visit [get.webgl.org](https://get.webgl.org)

2. **Performance**:
   - Background effects require additional CPU
   - May reduce frame rate on slower devices
   - Disable effects if experiencing lag

---

## API Reference

### useVideoCall Hook

```tsx
const {
  // State
  isInCall,
  isCallConnected,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  callDuration,
  localStream,
  remoteStreams,

  // Actions
  startCall,
  acceptCall,
  declineCall,
  endCall,
  toggleMute,
  toggleVideo,
  startScreenShare,
  stopScreenShare,
  enterPictureInPicture,
  exitPictureInPicture,

  // Device Selection
  selectCamera,
  selectMicrophone,
  selectSpeaker,
  availableCameras,
  availableMicrophones,
  availableSpeakers,
} = useVideoCall({
  userId: 'user-id',
  userName: 'User Name',
  userAvatarUrl: 'https://...',
  defaultVideoQuality: '720p',
  onCallStarted: (callId) => {},
  onCallEnded: (callId, reason) => {},
  onError: (error) => {},
})
```

### useBackgroundEffects Hook

```tsx
const {
  effectType,
  blurStrength,
  setEffectType,
  setBlurStrength,
  setVirtualBackground,
  applyToStream,
  stopProcessing,
  presetBackgrounds,
  selectPresetBackground,
} = useBackgroundEffects({
  onError: (error) => {},
})
```

### useVideoLayout Hook

```tsx
const { mode, tiles, mainTile, thumbnails, setMode, pinParticipant, setSpeakingParticipant } =
  useVideoLayout({
    containerRef,
    participantIds,
    initialMode: 'speaker',
  })
```

---

## Best Practices

### For Best Quality

1. **Use Wired Connection**: Ethernet is more stable than WiFi
2. **Close Unnecessary Tabs**: Reduces CPU and memory usage
3. **Good Lighting**: Helps with video compression
4. **Stable Position**: Reduces motion blur and bandwidth usage

### For Privacy

1. **Check Background**: Use background blur/virtual background
2. **Mute When Not Speaking**: Prevents accidental audio leaks
3. **Turn Off Video**: When not needed to save bandwidth

### For Performance

1. **Limit Participants**: Fewer participants = better performance
2. **Lower Quality**: Use 360p or 480p for large calls
3. **Disable Effects**: Turn off background blur for slower devices
4. **Close Other Apps**: Especially video streaming services

---

## Keyboard Shortcuts

| Shortcut | Action                  |
| -------- | ----------------------- |
| `M`      | Toggle mute             |
| `V`      | Toggle video            |
| `S`      | Start/stop screen share |
| `Esc`    | End call                |
| `G`      | Switch to grid view     |
| `P`      | Switch to speaker view  |
| `F`      | Toggle fullscreen       |

---

## Supported Platforms

### Desktop Browsers

- Chrome 74+ (Windows, macOS, Linux)
- Firefox 66+ (Windows, macOS, Linux)
- Safari 12.1+ (macOS)
- Edge 79+ (Windows, macOS)

### Mobile Browsers

- Chrome Mobile 74+ (Android)
- Safari iOS 12.1+ (iOS)

### Native Apps

- Electron (Windows, macOS, Linux)
- Capacitor (iOS, Android)
- Tauri (Windows, macOS, Linux)

---

## Technical Details

### WebRTC Implementation

- **Signaling**: WebSocket (Socket.io)
- **Media**: WebRTC PeerConnection
- **Codec**: VP8/VP9 or H.264
- **Audio Codec**: Opus

### Network Requirements

- **Minimum**: 500kbps upload/download
- **Recommended**: 2Mbps+ for HD
- **Ports**: UDP 49152-65535 (STUN/TURN)

### Privacy & Security

- **End-to-End Encryption**: Via DTLS-SRTP (WebRTC default)
- **Signaling Encryption**: WSS (WebSocket Secure)
- **No Recording**: Calls are not recorded by default

---

## Related Documentation

- [Voice Calling Guide](./Voice-Calling-Guide.md)
- [Background Effects](./Background-Effects-Guide.md)
- [Performance Optimization](../Performance-Optimization.md)
- [Troubleshooting](./Troubleshooting.md)
