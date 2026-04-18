# Mobile Calls Quick Reference

Quick reference for implementing mobile call features in nself-chat v0.4.0.

## Installation

```bash
# Install Capacitor plugins
pnpm add @capacitor/push-notifications @capacitor/app @capacitor/network
pnpm add @capacitor/haptics @capacitor/preferences

# Update Capacitor
cd platforms/capacitor
pnpm install
pnpm run sync
```

## Quick Setup (5 Minutes)

### 1. Initialize CallKit

```typescript
import { callKitManager } from '@/platforms/capacitor/src/native/call-kit'

// In your app initialization
await callKitManager.initialize('nChat')
```

### 2. Initialize VoIP Push

```typescript
import { voipPushManager } from '@/lib/voip-push'

// In your app initialization
await voipPushManager.initialize()
```

### 3. Add Mobile Call Screen

```typescript
import { MobileCallScreen } from '@/components/calls/mobile/MobileCallScreen'

function App() {
  const { activeCall } = useCallStore()

  return (
    <MobileCallScreen
      isVisible={!!activeCall}
      onMinimize={() => setMinimized(true)}
    />
  )
}
```

## Common Tasks

### Report Incoming Call

```typescript
// When receiving VoIP push
await callKitManager.reportIncomingCall({
  uuid: callId,
  handle: callerId,
  callerDisplayName: callerName,
  hasVideo: true,
})
```

### Start Outgoing Call

```typescript
await callKitManager.startOutgoingCall({
  uuid: callId,
  handle: targetUserId,
  hasVideo: true,
})
```

### Enable Picture-in-Picture

```typescript
import { useMobilePiP } from '@/hooks/use-mobile-pip'

const { enablePiP } = useMobilePiP()
await enablePiP()
```

### Monitor Battery

```typescript
import { useBatteryStatus } from '@/hooks/use-battery-status'

const { batteryLevel, isLowBattery, suggestedVideoQuality } = useBatteryStatus()

if (isLowBattery) {
  // Switch to audio-only
}
```

### Lock Orientation

```typescript
import { useMobileOrientation } from '@/hooks/use-mobile-orientation'

const { lockPortrait, unlockOrientation } = useMobileOrientation()

// Lock to portrait during call
await lockPortrait()

// Unlock when call ends
await unlockOrientation()
```

## iOS Configuration

### Info.plist

```xml
<key>UIBackgroundModes</key>
<array>
    <string>voip</string>
    <string>audio</string>
</array>

<key>NSMicrophoneUsageDescription</key>
<string>Required for voice calls</string>

<key>NSCameraUsageDescription</key>
<string>Required for video calls</string>
```

### Push Certificate

1. Developer Portal → Certificates → VoIP Services
2. Download certificate
3. Convert to .p8 for server

## Android Configuration

### AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />

<service
    android:name="io.nself.chat.plugins.CallConnectionService"
    android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.telecom.ConnectionService" />
    </intent-filter>
</service>
```

### Request Permissions

```typescript
const { granted } = await CallKit.requestPermissions()
```

## Server-Side Push

### iOS (APNs)

```typescript
// Node.js
import apn from 'apn'

const notification = new apn.Notification({
  topic: 'com.yourapp.voip',
  payload: {
    type: 'incoming_call',
    callId: 'call-123',
    callerId: 'user-456',
    callerName: 'John Doe',
  },
  pushType: 'voip',
})

await provider.send(notification, deviceToken)
```

### Android (FCM)

```typescript
// Node.js
import admin from 'firebase-admin'

await admin.messaging().send({
  token: deviceToken,
  data: {
    type: 'incoming_call',
    callId: 'call-123',
    callerId: 'user-456',
    callerName: 'John Doe',
  },
  android: {
    priority: 'high',
  },
})
```

## Component Props

### MobileCallScreen

```typescript
interface MobileCallScreenProps {
  isVisible: boolean
  onMinimize?: () => void
  onOpenMore?: () => void
  className?: string
}
```

### MobilePiPOverlay

```typescript
interface MobilePiPOverlayProps {
  isActive: boolean
  onExpand: () => void
  onEndCall?: () => void
  className?: string
}
```

## Hook Returns

### useMobilePiP

```typescript
{
  isPiPActive: boolean
  isPiPSupported: boolean
  enablePiP: () => Promise<void>
  disablePiP: () => Promise<void>
  error: string | null
}
```

### useBatteryStatus

```typescript
{
  batteryLevel: number
  isCharging: boolean
  isLowBattery: boolean
  isCriticalBattery: boolean
  suggestedVideoQuality: 'high' | 'medium' | 'low' | 'audio-only'
}
```

### useMobileOrientation

```typescript
{
  orientation: 'portrait' | 'landscape'
  isPortrait: boolean
  isLandscape: boolean
  lockPortrait: () => Promise<void>
  lockLandscape: () => Promise<void>
  unlockOrientation: () => Promise<void>
}
```

## Event Listeners

### CallKit Events

```typescript
CallKit.addListener('callAnswered', (data) => {
  // Handle call answered
})

CallKit.addListener('callEnded', (data) => {
  // Handle call ended
})

CallKit.addListener('callMuteChanged', (data) => {
  // Handle mute changed
})
```

## Testing Checklist

- [ ] Incoming call shows native UI
- [ ] Outgoing call connects
- [ ] Mute/unmute works
- [ ] Video on/off works
- [ ] Picture-in-Picture works
- [ ] Background call continues
- [ ] VoIP push wakes app
- [ ] Battery optimization active
- [ ] Network switching handled
- [ ] Call quality adapts
- [ ] Orientation locks
- [ ] Touch controls responsive
- [ ] Haptic feedback works

## Common Issues

### CallKit Not Showing

```typescript
// Verify initialization
const { isConfigured } = useCallKit()
console.log('CallKit configured:', isConfigured)

// Check permissions
const status = await Permissions.query({ name: 'microphone' })
```

### PiP Not Working

```typescript
// Check support
const { isPiPSupported } = useMobilePiP()
if (!isPiPSupported) {
  console.warn('PiP not supported')
}
```

### Push Not Waking App

```typescript
// Verify token sent to server
const { pushToken } = useVoIPPush()
console.log('Push token:', pushToken)

// Check push payload format
// Must include all required fields
```

## Platform Differences

| Feature          | iOS          | Android       | Web         |
| ---------------- | ------------ | ------------- | ----------- |
| CallKit          | ✅ Native    | ✅ Native     | ❌          |
| PiP              | ✅ Native    | ✅ Native     | ⚠️ Limited  |
| VoIP Push        | ✅ APNs      | ✅ FCM        | ⚠️ Web Push |
| Background       | ✅ Unlimited | ✅ Foreground | ❌          |
| Orientation Lock | ✅           | ✅            | ⚠️ Limited  |

## Performance Targets

- Call setup: < 2s
- Video start: < 1s
- Audio latency: < 150ms
- Frame rate: 24-30 fps
- Battery life: > 2 hours
- Data usage: ~500 MB/hr (video)

## Resources

- [Full Documentation](../guides/Mobile-Call-Optimizations.md)
- [CallKit API Reference](../platforms/capacitor/src/native/call-kit.ts)
- [Apple CallKit Docs](https://developer.apple.com/documentation/callkit)
- [Android Telecom Docs](https://developer.android.com/guide/topics/connectivity/telecom)
