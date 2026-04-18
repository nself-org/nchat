# Mobile Calls - Complete Implementation Guide

**Version**: 0.4.0
**Status**: ✅ Complete
**Platform Support**: iOS, Android, Web
**Last Updated**: January 30, 2026

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Native Integration](#native-integration)
5. [Battery Optimization](#battery-optimization)
6. [Picture-in-Picture](#picture-in-picture)
7. [Usage Guide](#usage-guide)
8. [API Reference](#api-reference)
9. [Platform-Specific Notes](#platform-specific-notes)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Mobile Calls system provides native-quality voice and video calling on mobile devices with deep OS integration, battery optimization, and enhanced UX for small screens.

### Key Highlights

- **Native Call UI**: iOS CallKit and Android Telecom integration
- **VoIP Push Notifications**: Wake app from background for incoming calls
- **Battery Optimization**: Automatic quality adjustment based on battery level
- **Picture-in-Picture**: Floating call window for multitasking
- **Touch-Optimized UI**: Gestures, haptics, and mobile-friendly controls
- **Orientation Lock**: Automatic screen rotation management

### Demo

```typescript
import { useMobileCallOptimization } from '@/hooks/use-mobile-call-optimization'

function CallComponent() {
  const { initialize, enableBatterySavingMode, optimizationStatus } = useMobileCallOptimization({
    autoBatteryOptimization: true,
    autoEnablePiP: true,
    enableNativeCallUI: true,
    enableVoIPPush: true,
  })

  useEffect(() => {
    initialize()
  }, [])

  return (
    <div>
      {optimizationStatus.batteryOptimized && <BatteryWarning />}
      {optimizationStatus.pipEnabled && <PiPIndicator />}
      <MobileCallScreen />
    </div>
  )
}
```

---

## Features

### ✅ Implemented

#### Native OS Integration

- [x] **iOS CallKit Integration**
  - System-level call UI
  - Lock screen controls
  - Call history integration
  - Siri integration
  - CarPlay support
  - Bluetooth headset controls

- [x] **Android Telecom Integration**
  - Native call UI
  - System notifications
  - Call log integration
  - Bluetooth support
  - Auto support

#### VoIP Push Notifications

- [x] **APNs Integration (iOS)**
  - VoIP push certificates
  - Background wake
  - PushKit framework

- [x] **FCM Integration (Android)**
  - High-priority push
  - Background wake
  - Data-only messages

#### Battery Optimization

- [x] **Adaptive Quality**
  - Auto frame rate adjustment (15-30 fps)
  - Dynamic resolution (240p-720p)
  - Audio-only mode suggestion

- [x] **Battery Monitoring**
  - Real-time battery level tracking
  - Charging state detection
  - Low battery warnings
  - Critical battery alerts

- [x] **Battery Saving Mode**
  - Manual enable/disable
  - Auto-enable on critical battery
  - Auto-disable when charging
  - Video disable with audio optimization

#### Picture-in-Picture (PiP)

- [x] **Native PiP (iOS/Android)**
  - System-level PiP window
  - Draggable and resizable
  - Auto-enter on background

- [x] **Web PiP API**
  - Fallback for web browsers
  - Manual control

- [x] **PiP Controls**
  - Mute/unmute toggle
  - Video on/off toggle
  - End call button
  - Expand to full screen

#### Mobile UI

- [x] **Touch Controls**
  - Large touch targets (48x48dp)
  - Long-press actions
  - Haptic feedback
  - Gesture support

- [x] **Orientation Management**
  - Auto-lock for voice calls
  - Auto-rotate for video calls
  - Portrait/landscape support
  - Safe area insets

- [x] **Mobile Call Screen**
  - Full-screen interface
  - Drag-to-minimize
  - Auto-hide controls
  - Battery indicator
  - Connection quality indicator

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Call System                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │   Call Store    │  │  Mobile UI Layer │  │  Platform   │ │
│  │   (Zustand)     │  │                  │  │   Native    │ │
│  └────────┬────────┘  └────────┬─────────┘  └──────┬──────┘ │
│           │                    │                    │        │
│           └────────────────────┼────────────────────┘        │
│                                │                             │
│  ┌─────────────────────────────┼──────────────────────────┐ │
│  │       Mobile Call Optimization Hook                     │ │
│  │  ┌───────────────┐ ┌────────────┐ ┌─────────────────┐  │ │
│  │  │    Battery    │ │    PiP     │ │   Orientation   │  │ │
│  │  │ Optimization  │ │  Manager   │ │     Manager     │  │ │
│  │  └───────────────┘ └────────────┘ └─────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Native Platform Layer                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │   CallKit    │  │   Telecom    │  │  VoIP Push   │  │ │
│  │  │    (iOS)     │  │  (Android)   │  │  (APNs/FCM)  │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── components/calls/mobile/
│   ├── MobileCallScreen.tsx        # Full-screen mobile call UI
│   └── MobilePiPOverlay.tsx        # Floating PiP window
├── hooks/
│   ├── use-mobile-call-optimization.ts  # Main integration hook
│   ├── use-battery-status.ts       # Battery monitoring
│   ├── use-mobile-pip.ts           # PiP management
│   └── use-mobile-orientation.ts   # Orientation control
├── lib/
│   └── voip-push.ts                # VoIP push handler
├── stores/
│   └── call-store.ts               # Call state management
└── platforms/capacitor/src/native/
    ├── call-kit.ts                 # CallKit wrapper
    ├── call-kit-web.ts             # Web fallback
    ├── ios/Plugin/
    │   └── CallKitPlugin.swift     # iOS native implementation
    └── android/.../
        └── CallKitPlugin.kt        # Android native implementation
```

---

## Native Integration

### iOS CallKit

#### Setup

**1. Configure Capabilities**

In Xcode, enable:

- Background Modes → Voice over IP
- Push Notifications

**2. Add Permissions to Info.plist**

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access required for voice calls</string>
<key>NSCameraUsageDescription</key>
<string>Camera access required for video calls</string>
<key>UIBackgroundModes</key>
<array>
    <string>voip</string>
    <string>audio</string>
</array>
```

**3. Initialize CallKit**

```typescript
import { callKitManager } from '@/platforms/capacitor/src/native/call-kit'

await callKitManager.initialize('nChat')
```

#### Features

**Incoming Calls**

```typescript
// Report incoming call (shows system UI)
const uuid = await callKitManager.reportIncomingCall({
  uuid: 'call-123',
  handle: 'user@example.com',
  handleType: 'email',
  hasVideo: true,
  callerDisplayName: 'John Doe',
  callerImageUrl: 'https://example.com/avatar.jpg',
})
```

**Outgoing Calls**

```typescript
// Start outgoing call
const uuid = await callKitManager.startOutgoingCall({
  uuid: 'call-456',
  handle: 'user@example.com',
  hasVideo: false,
})

// Report connected
await callKitManager.reportCallConnected(uuid)
```

**Call Control**

```typescript
// Mute/unmute
await callKitManager.setMuted(true, uuid)

// Hold/unhold
await callKitManager.setOnHold(true, uuid)

// End call
await callKitManager.endCall('completed', uuid)
```

#### Events

CallKit emits events for user actions:

```typescript
// Listen for events
window.addEventListener('callkit:callAnswered', (event) => {
  const { uuid } = event.detail
  // Accept the call in your app
  acceptCall(uuid)
})

window.addEventListener('callkit:callEnded', (event) => {
  const { uuid } = event.detail
  // End the call in your app
  endCall(uuid)
})
```

### Android Telecom

#### Setup

**1. Add Permissions to AndroidManifest.xml**

```xml
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
```

**2. Register ConnectionService**

```xml
<service
    android:name=".plugins.CallConnectionService"
    android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.telecom.ConnectionService" />
    </intent-filter>
</service>
```

**3. Request Permissions**

```typescript
import { CallKit } from '@/platforms/capacitor/src/native/call-kit'

const { granted } = await CallKit.requestPermissions()
if (!granted) {
  // Handle permission denied
}
```

#### Usage

Same API as iOS CallKit - the platform-specific implementation is handled automatically.

---

## Battery Optimization

### Automatic Quality Adjustment

The system automatically adjusts video quality based on battery level:

| Battery Level | Frame Rate | Resolution | Action               |
| ------------- | ---------- | ---------- | -------------------- |
| 100% - 30%    | 30 fps     | 720p       | High quality         |
| 30% - 20%     | 24 fps     | 480p       | Medium quality       |
| 20% - 10%     | 20 fps     | 360p       | Low quality          |
| Below 10%     | 15 fps     | 240p       | Audio-only suggested |

### Manual Battery Saving

```typescript
import { useMobileCallOptimization } from '@/hooks/use-mobile-call-optimization'

function CallComponent() {
  const {
    enableBatterySavingMode,
    disableBatterySavingMode,
    isBatterySavingActive,
  } = useMobileCallOptimization()

  return (
    <div>
      <button onClick={enableBatterySavingMode}>
        Enable Battery Saving
      </button>
      {isBatterySavingActive && <span>Battery saving active</span>}
    </div>
  )
}
```

### Battery Status Hook

```typescript
import { useBatteryStatus } from '@/hooks/use-battery-status'

function BatteryIndicator() {
  const {
    batteryLevel,
    isCharging,
    isLowBattery,
    isCriticalBattery,
    suggestedVideoQuality,
  } = useBatteryStatus()

  return (
    <div>
      <span>Battery: {batteryLevel}%</span>
      {isCharging && <span>⚡ Charging</span>}
      {isLowBattery && <span>⚠️ Low Battery</span>}
      {isCriticalBattery && <span>🔴 Critical Battery</span>}
      <span>Suggested Quality: {suggestedVideoQuality}</span>
    </div>
  )
}
```

### Optimization Utilities

```typescript
import {
  getRecommendedFrameRate,
  getRecommendedResolution,
  shouldDisableVideo,
  getBatteryWarningMessage,
} from '@/hooks/use-battery-status'

// Get recommended settings
const frameRate = getRecommendedFrameRate(batteryLevel, isCharging)
const resolution = getRecommendedResolution(batteryLevel, isCharging)

// Check if video should be disabled
if (shouldDisableVideo(batteryLevel, isCharging)) {
  // Disable video
  setLocalVideoEnabled(false)
}

// Get warning message
const message = getBatteryWarningMessage(batteryLevel)
toast({ title: message })
```

---

## Picture-in-Picture

### Auto-Enable PiP

PiP automatically activates when:

- App goes to background during a call
- User navigates away from call screen
- User swipes down on call screen

### Manual PiP Control

```typescript
import { useMobilePiP } from '@/hooks/use-mobile-pip'

function CallControls() {
  const {
    isPiPActive,
    isPiPSupported,
    enablePiP,
    disablePiP,
    togglePiP,
    error,
  } = useMobilePiP()

  if (!isPiPSupported) {
    return <span>PiP not supported on this device</span>
  }

  return (
    <div>
      <button onClick={togglePiP}>
        {isPiPActive ? 'Exit PiP' : 'Enter PiP'}
      </button>
      {error && <span>Error: {error}</span>}
    </div>
  )
}
```

### PiP Overlay Component

```typescript
import { MobilePiPOverlay } from '@/components/calls/mobile/MobilePiPOverlay'

function App() {
  const [isPiPActive, setIsPiPActive] = useState(false)

  return (
    <>
      <MobilePiPOverlay
        isActive={isPiPActive}
        onExpand={() => setIsPiPActive(false)}
        onEndCall={() => endCall()}
      />
    </>
  )
}
```

### PiP Features

- **Draggable**: Drag to any screen corner
- **Snap to Edges**: Auto-snaps to left/right edge
- **Touch Controls**: Tap to show/hide controls
- **Double Tap**: Expand to full screen
- **Haptic Feedback**: Vibration on interactions

---

## Usage Guide

### Complete Integration Example

```typescript
import { useMobileCallOptimization } from '@/hooks/use-mobile-call-optimization'
import { MobileCallScreen } from '@/components/calls/mobile/MobileCallScreen'
import { MobilePiPOverlay } from '@/components/calls/mobile/MobilePiPOverlay'
import { useCallStore } from '@/stores/call-store'

function MobileCallInterface() {
  const activeCall = useCallStore((state) => state.activeCall)
  const [showCallScreen, setShowCallScreen] = useState(true)

  // Initialize mobile call optimizations
  const {
    initialize,
    cleanup,
    optimizeCallQuality,
    enableBatterySavingMode,
    optimizationStatus,
  } = useMobileCallOptimization({
    autoBatteryOptimization: true,
    autoEnablePiP: true,
    lockOrientation: true,
    enableNativeCallUI: true,
    enableVoIPPush: true,
  })

  // Initialize on mount
  useEffect(() => {
    initialize()
    return () => {
      cleanup()
    }
  }, [initialize, cleanup])

  // Optimize quality when call starts
  useEffect(() => {
    if (activeCall) {
      optimizeCallQuality()
    }
  }, [activeCall, optimizeCallQuality])

  if (!activeCall) {
    return null
  }

  return (
    <>
      {/* Full-screen call interface */}
      <MobileCallScreen
        isVisible={showCallScreen}
        onMinimize={() => setShowCallScreen(false)}
        onOpenMore={() => {
          // Show call settings
        }}
      />

      {/* Floating PiP overlay */}
      <MobilePiPOverlay
        isActive={!showCallScreen}
        onExpand={() => setShowCallScreen(true)}
        onEndCall={() => {
          // End call
        }}
      />

      {/* Battery warning */}
      {optimizationStatus.batteryOptimized && (
        <div className="battery-warning">
          Battery optimization active
          <button onClick={enableBatterySavingMode}>
            Enable Battery Saving
          </button>
        </div>
      )}
    </>
  )
}
```

### Handling VoIP Push Notifications

```typescript
import { voipPushManager } from '@/lib/voip-push'

// Initialize VoIP push
await voipPushManager.initialize()

// Get push token (send this to your server)
const token = voipPushManager.getToken()

// Server-side: Send VoIP push when call initiated
import { sendVoIPPush } from '@/lib/voip-push'

await sendVoIPPush(userToken, 'ios', {
  type: 'incoming_call',
  callId: 'call-123',
  callerId: 'user-456',
  callerName: 'John Doe',
  callerAvatarUrl: 'https://example.com/avatar.jpg',
  callType: 'video',
})
```

---

## API Reference

### useMobileCallOptimization

**Options**

```typescript
interface MobileCallOptimizationOptions {
  autoBatteryOptimization?: boolean // Default: true
  autoEnablePiP?: boolean // Default: true
  lockOrientation?: boolean // Default: true
  enableNativeCallUI?: boolean // Default: true
  enableVoIPPush?: boolean // Default: true
}
```

**Returns**

```typescript
interface UseMobileCallOptimizationReturn {
  initialize: () => Promise<void>
  cleanup: () => Promise<void>
  optimizeCallQuality: () => Promise<void>
  enableBatterySavingMode: () => Promise<void>
  disableBatterySavingMode: () => Promise<void>
  isBatterySavingActive: boolean
  optimizationStatus: {
    batteryOptimized: boolean
    pipEnabled: boolean
    callKitEnabled: boolean
    voipPushEnabled: boolean
  }
}
```

### useBatteryStatus

**Returns**

```typescript
interface UseBatteryStatusReturn {
  batteryLevel: number // 0-100
  isCharging: boolean
  chargingTime: number | null // seconds
  dischargingTime: number | null // seconds
  isLowBattery: boolean // <20%
  isCriticalBattery: boolean // <10%
  isSupported: boolean
  suggestedVideoQuality: 'high' | 'medium' | 'low' | 'audio-only'
}
```

### useMobilePiP

**Returns**

```typescript
interface UseMobilePiPReturn {
  isPiPActive: boolean
  isPiPSupported: boolean
  enablePiP: () => Promise<void>
  disablePiP: () => Promise<void>
  togglePiP: () => Promise<void>
  error: string | null
}
```

### useMobileOrientation

**Returns**

```typescript
interface UseMobileOrientationReturn {
  orientation: 'portrait' | 'landscape'
  isPortrait: boolean
  isLandscape: boolean
  lockPortrait: () => Promise<void>
  lockLandscape: () => Promise<void>
  unlockOrientation: () => Promise<void>
  isOrientationLockSupported: boolean
}
```

---

## Platform-Specific Notes

### iOS

**Minimum Version**: iOS 10.0+ (CallKit)

**Known Issues**:

- CallKit requires physical device for testing (not simulator)
- VoIP push requires Apple Developer account and certificates
- Background audio requires proper audio session configuration

**Best Practices**:

- Always handle CallKit delegate methods
- Configure audio session before starting call
- Test on multiple iOS versions

### Android

**Minimum Version**: Android 6.0+ (API 23) for Telecom API

**Known Issues**:

- Telecom permissions must be requested at runtime
- Some manufacturers have aggressive battery optimization
- Connection service must be declared in manifest

**Best Practices**:

- Request all required permissions before initiating call
- Add to battery optimization whitelist
- Test on multiple Android versions and manufacturers

### Web

**PiP Support**: Chrome 70+, Safari 13.1+, Edge 79+

**Limitations**:

- No native call UI
- No VoIP push notifications
- Limited battery API support
- No orientation lock on most browsers

**Fallbacks**:

- Browser notifications for incoming calls
- Manual PiP activation
- Estimated battery level (100% if API unavailable)

---

## Troubleshooting

### iOS CallKit Not Working

**Problem**: CallKit not showing system UI

**Solution**:

1. Check Info.plist has VoIP background mode
2. Ensure running on physical device (not simulator)
3. Verify CallKit is initialized before reporting call
4. Check system call history settings

```typescript
// Debug CallKit
const { supported } = await CallKit.isSupported()
console.log('CallKit supported:', supported)
```

### Android Permissions Denied

**Problem**: Missing required permissions

**Solution**:

1. Request permissions before configuring Telecom
2. Check AndroidManifest.xml has all required permissions
3. Handle permission denial gracefully

```typescript
const { granted } = await CallKit.requestPermissions()
if (!granted) {
  toast({
    title: 'Permissions Required',
    description: 'Call permissions are required for native call UI.',
  })
}
```

### Battery Optimization Not Working

**Problem**: Video quality not adjusting

**Solution**:

1. Check Battery API support
2. Verify media stream has video track
3. Check constraints are being applied

```typescript
const { isSupported } = useBatteryStatus()
if (!isSupported) {
  console.warn('Battery API not supported on this device')
}
```

### PiP Not Activating

**Problem**: PiP not entering when backgrounded

**Solution**:

1. Check PiP support on device/browser
2. Verify video element exists
3. Check document visibility API

```typescript
const { isPiPSupported, error } = useMobilePiP()
if (!isPiPSupported) {
  console.log('PiP not supported')
}
if (error) {
  console.error('PiP error:', error)
}
```

### VoIP Push Not Received

**Problem**: App not waking on incoming call

**Solution**:

1. Verify push token is sent to server
2. Check APNs/FCM credentials
3. Ensure payload format is correct
4. Check app is not force-quit (some platforms don't wake from force-quit)

```typescript
// Debug push token
const token = voipPushManager.getToken()
console.log('Push token:', token)
```

---

## Performance Metrics

### Battery Impact

| Scenario                 | Battery Drain Rate |
| ------------------------ | ------------------ |
| Audio-only call          | ~1-2% per 10 min   |
| Video call (720p, 30fps) | ~5-8% per 10 min   |
| Video call (480p, 24fps) | ~3-5% per 10 min   |
| Video call (360p, 20fps) | ~2-4% per 10 min   |
| Battery saving mode      | ~1-2% per 10 min   |

### Network Usage

| Quality              | Bandwidth (Video) | Bandwidth (Audio) |
| -------------------- | ----------------- | ----------------- |
| High (720p, 30fps)   | ~1.5 Mbps         | ~50 Kbps          |
| Medium (480p, 24fps) | ~800 Kbps         | ~50 Kbps          |
| Low (360p, 20fps)    | ~400 Kbps         | ~50 Kbps          |
| Audio-only           | -                 | ~50 Kbps          |

---

## Future Enhancements

- [ ] **Smart Quality Adjustment**: ML-based quality optimization based on network and battery
- [ ] ] **Group Calls**: Multi-party call support with CallKit/Telecom
- [ ] **Screen Sharing**: Mobile screen sharing with PiP support
- [ ] **Call Recording**: Native call recording with permissions
- [ ] **Noise Cancellation**: Advanced audio processing
- [ ] **Call Analytics**: Battery usage, quality metrics, and optimization insights

---

## Related Documentation

- [Call System Implementation](/docs/features/Calls-Implementation.md)
- [WebRTC Setup](/docs/features/WebRTC-Complete.md)
- [Capacitor Native Plugins](README.md)
- [Push Notifications](/docs/features/Push-Notifications.md)

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section above
2. Review [Common Issues](/docs/troubleshooting/Common-Issues.md)
3. Open GitHub issue with:
   - Platform (iOS/Android/Web)
   - Device model and OS version
   - Call scenario (incoming/outgoing, audio/video)
   - Error messages or unexpected behavior
   - Steps to reproduce

---

**Last Updated**: January 30, 2026
**Contributors**: Development Team
**License**: MIT
