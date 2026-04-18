# Call Management Quick Reference

Quick reference guide for the call management system.

## Import Paths

```typescript
// Core Library
import {
  createCallStateMachine,
  createInvitationManager,
  createStatusManager,
  createQualityMonitor,
  getCallEventEmitter,
  type CallState,
  type UserStatus,
  type QualityLevel,
} from '@/lib/calls'

// React Hooks
import { useCallState } from '@/hooks/use-call-state'
import { useCallInvitation } from '@/hooks/use-call-invitation'
import { useUserStatus } from '@/hooks/use-user-status'
import { useCallQuality } from '@/hooks/use-call-quality'

// UI Components
import { CallInvitation } from '@/components/calls/CallInvitation'
import { CallStateIndicator } from '@/components/calls/CallStateIndicator'
import { CallQualityIndicator } from '@/components/calls/CallQualityIndicator'
import { UserStatusIndicator } from '@/components/calls/UserStatusIndicator'
```

## Common Patterns

### 1. Initialize Call State

```typescript
const machine = createCallStateMachine({
  initialState: 'idle',
  onTransition: (event) => console.log(event.from, '->', event.to),
})
```

### 2. Handle Incoming Call

```typescript
const manager = createInvitationManager({
  timeout: 30000,
  onInvitation: (inv) => showIncomingCallModal(inv),
})

const invitation = manager.createInvitation(callId, callerId, callerName, 'video')
```

### 3. Check User Availability

```typescript
const statusManager = createStatusManager()
statusManager.initializeUser(userId, 'online')

if (statusManager.isAvailable(userId)) {
  initiateCall(userId)
} else {
  alert(statusManager.getUnavailabilityReason(userId))
}
```

### 4. Monitor Call Quality

```typescript
const monitor = createQualityMonitor({
  interval: 2000,
  onAlert: (alert) => showQualityWarning(alert),
})

monitor.start(peerConnection)
const quality = monitor.getQuality() // 'excellent' | 'good' | ...
```

### 5. Subscribe to Events

```typescript
const emitter = getCallEventEmitter()

emitter.onCallEvent('call:connected', (event) => {
  console.log('Call connected:', event.callId)
})

emitter.onCallEvent('call:quality-changed', (event) => {
  console.log('Quality:', event.from, '->', event.to)
})
```

## React Hook Examples

### useCallState

```typescript
const {
  state, // Current state
  isConnected, // Boolean checks
  displayName, // Human-readable state
  connectedDuration, // Time connected (ms)
  transition, // Transition to new state
  canTransitionTo, // Check if valid
} = useCallState()
```

### useCallInvitation

```typescript
const {
  activeInvitations, // Array of pending invitations
  isRinging, // Is ring tone playing
  accept, // Accept invitation
  decline, // Decline invitation
} = useCallInvitation({
  ringVolume: 0.8,
  timeout: 30000,
})
```

### useUserStatus

```typescript
const {
  status, // Current status
  isAvailable, // Can receive calls
  inCall, // Currently in call
  setOnline, // Set to online
  setBusy, // Set to busy
  setDND, // Set to DND
  updateActivity, // Prevent auto-away
} = useUserStatus()
```

### useCallQuality

```typescript
const {
  quality, // 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  metrics, // Full metrics object
  lastAlert, // Last quality alert
  start, // Start monitoring
  stop, // Stop monitoring
} = useCallQuality({ interval: 2000 })
```

## State Machine States

| State        | Description        | Duration  |
| ------------ | ------------------ | --------- |
| idle         | No call            | N/A       |
| initiating   | Starting call      | 1-2s      |
| ringing      | Waiting for answer | Up to 30s |
| connecting   | WebRTC setup       | 2-5s      |
| connected    | Active call        | Varies    |
| reconnecting | Network recovery   | Up to 10s |
| held         | On hold            | Varies    |
| transferring | Being transferred  | 2-5s      |
| ending       | Cleaning up        | <1s       |
| ended        | Call finished      | Brief     |

## User Status Types

| Status  | Description    | Auto-Set      | Can Receive Calls |
| ------- | -------------- | ------------- | ----------------- |
| online  | Available      | On connect    | Yes               |
| busy    | In a call      | On call start | No\*              |
| away    | Idle           | After 5 min   | Yes               |
| dnd     | Do Not Disturb | Manual only   | No                |
| offline | Disconnected   | On disconnect | No                |

\*Can receive if call waiting enabled

## Quality Levels

| Level     | Packet Loss | Jitter  | RTT     | Bitrate    |
| --------- | ----------- | ------- | ------- | ---------- |
| excellent | < 0.5%      | < 20ms  | < 100ms | > 300 kbps |
| good      | < 2%        | < 50ms  | < 200ms | > 150 kbps |
| fair      | < 5%        | < 100ms | < 400ms | > 64 kbps  |
| poor      | < 10%       | < 200ms | < 800ms | > 32 kbps  |
| critical  | > 10%       | > 200ms | > 800ms | < 32 kbps  |

## Event Types

### Lifecycle Events

- `call:created`
- `call:ringing`
- `call:answered`
- `call:connected`
- `call:ended`

### Media Events

- `call:mute-changed`
- `call:video-changed`
- `call:screen-share-started`
- `call:screen-share-stopped`

### Quality Events

- `call:quality-changed`
- `call:quality-alert`
- `call:quality-critical`

### Invitation Events

- `call:invitation-received`
- `call:invitation-accepted`
- `call:invitation-declined`
- `call:invitation-missed`

### Status Events

- `call:status-changed`
- `call:user-busy`
- `call:user-available`

### Error Events

- `call:error`
- `call:media-error`
- `call:connection-error`

## Component Props

### CallStateIndicator

```typescript
<CallStateIndicator
  state="connected"
  duration={45000}
  displayName="Connected"
  showIcon={true}
  showDuration={true}
  size="md"
/>
```

### CallQualityIndicator

```typescript
<CallQualityIndicator
  quality="good"
  metrics={metrics}
  variant="detailed" // 'simple' | 'detailed' | 'minimal'
  showLabel={true}
  showMetrics={true}
/>
```

### UserStatusIndicator

```typescript
<UserStatusIndicator
  status="online"
  customMessage="In a meeting"
  inCall={false}
  variant="badge" // 'dot' | 'badge' | 'full'
  size="md"
  showTooltip={true}
/>
```

### CallInvitation

```typescript
<CallInvitation
  invitation={invitation}
  onAccept={() => acceptCall(invitation.id)}
  onDecline={() => declineCall(invitation.id)}
  open={true}
/>
```

## Configuration Options

### State Machine Config

```typescript
{
  initialState: 'idle',
  onTransition: (event) => void,
  onInvalidTransition: (from, to) => void,
}
```

### Invitation Manager Config

```typescript
{
  ringToneUrl: '/sounds/ringtone.mp3',
  ringVolume: 0.8,
  ringDuration: 30000,
  timeout: 30000,
  vibrate: true,
  vibratePattern: [500, 500, 500],
  enableNotifications: true,
  notificationSound: true,
  onInvitation: (invitation) => void,
  onTimeout: (invitation) => void,
  onAccepted: (invitation) => void,
  onDeclined: (invitation) => void,
}
```

### Status Manager Config

```typescript
{
  awayTimeout: 5 * 60 * 1000, // 5 minutes
  enableCallWaiting: true,
  maxConcurrentCalls: 1,
  onStatusChange: (status) => void,
}
```

### Quality Monitor Config

```typescript
{
  interval: 2000, // 2 seconds
  enableAlerts: true,
  alertCooldown: 10000, // 10 seconds
  thresholds: {
    excellent: { maxPacketLoss: 0.5, maxJitter: 20, maxRtt: 100, minBitrate: 300 },
    good: { maxPacketLoss: 2, maxJitter: 50, maxRtt: 200, minBitrate: 150 },
    fair: { maxPacketLoss: 5, maxJitter: 100, maxRtt: 400, minBitrate: 64 },
    poor: { maxPacketLoss: 10, maxJitter: 200, maxRtt: 800, minBitrate: 32 },
  },
  onMetrics: (metrics) => void,
  onAlert: (alert) => void,
  onQualityChange: (quality, previous) => void,
}
```

## Utility Functions

### Format Duration

```typescript
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
```

### Generate Call ID

```typescript
function generateCallId(): string {
  return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
```

### Check Valid Transition

```typescript
import { isValidTransition } from '@/lib/calls'

if (isValidTransition('ringing', 'connected')) {
  // Valid transition
}
```

### Get Valid Next States

```typescript
import { getValidTransitions } from '@/lib/calls'

const validStates = getValidTransitions('connected')
// ['held', 'transferring', 'reconnecting', 'ending', 'ended']
```

## Common Workflows

### Initiate Call

```typescript
// 1. Check availability
if (!statusManager.isAvailable(targetUserId)) {
  alert(statusManager.getUnavailabilityReason(targetUserId))
  return
}

// 2. Transition to initiating
machine.transition('initiating')

// 3. Get media
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

// 4. Create peer connection
const pc = new RTCPeerConnection()
stream.getTracks().forEach((track) => pc.addTrack(track, stream))

// 5. Transition to ringing
machine.transition('ringing')

// 6. Send offer
const offer = await pc.createOffer()
await pc.setLocalDescription(offer)
await sendOffer(targetUserId, offer)
```

### Accept Call

```typescript
// 1. Accept invitation
invitationManager.acceptInvitation(invitationId)

// 2. Transition to connecting
machine.transition('connecting')

// 3. Get media
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

// 4. Create peer connection
const pc = new RTCPeerConnection()
stream.getTracks().forEach((track) => pc.addTrack(track, stream))

// 5. Create answer
const answer = await pc.createAnswer()
await pc.setLocalDescription(answer)
await sendAnswer(callerId, answer)

// 6. Transition to connected
machine.transition('connected')

// 7. Start quality monitoring
qualityMonitor.start(pc)

// 8. Update status
statusManager.startCall(userId, callId)
```

### End Call

```typescript
// 1. Transition to ending
machine.transition('ending')

// 2. Close peer connection
peerConnection.close()

// 3. Stop media streams
localStream.getTracks().forEach((track) => track.stop())

// 4. Stop quality monitoring
qualityMonitor.stop()

// 5. Update status
statusManager.endCall(userId)

// 6. Emit event
emitter.emitCallEvent({
  type: 'call:ended',
  callId,
  reason: 'completed',
  duration: machine.getConnectedDuration(),
  timestamp: new Date(),
})

// 7. Transition to ended
machine.transition('ended')

// 8. Clean up and reset
setTimeout(() => {
  machine.transition('idle')
  machine.reset()
}, 2000)
```

## Error Handling

### Handle State Transition Errors

```typescript
if (!machine.transition('connected')) {
  console.error('Failed to transition to connected')
  machine.transition('ending')
  machine.transition('ended')
  cleanupCall()
}
```

### Handle Media Errors

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
} catch (error) {
  if (error.name === 'NotAllowedError') {
    alert('Microphone/camera access denied')
  } else if (error.name === 'NotFoundError') {
    alert('No microphone/camera found')
  } else {
    alert('Failed to access media devices')
  }
  machine.transition('ending')
  machine.transition('ended')
}
```

### Handle Connection Errors

```typescript
peerConnection.oniceconnectionstatechange = () => {
  if (peerConnection.iceConnectionState === 'failed') {
    machine.transition('reconnecting')

    // Attempt reconnect
    setTimeout(() => {
      if (machine.isState('reconnecting')) {
        // Reconnect failed
        machine.transition('ending')
        machine.transition('ended')
        alert('Call disconnected')
      }
    }, 10000)
  }
}
```

## Performance Tips

1. **Reuse managers**: Create once, use for entire session
2. **Cleanup**: Always call `cleanup()` when done
3. **Throttle updates**: Don't update UI on every metric (use intervals)
4. **Batch events**: Process multiple events together
5. **Lazy load**: Only create managers when needed

## Debugging Commands

```typescript
// Log all state transitions
machine.on('transition', console.log)

// Get state history
console.log(machine.getHistory())

// Get event history
console.log(emitter.getHistory())

// Get quality metrics
console.log(monitor.getMetrics())

// Get all user statuses
console.log(statusManager.getAllStatuses())

// Get active invitations
console.log(invitationManager.getActiveInvitations())

// Get statistics
console.log(invitationManager.getStats())
console.log(statusManager.getStats())
```

## Related Documentation

- [Call Management Guide](../guides/Call-Management-Guide.md) - Complete guide
- [State Machine Diagram](./Call-State-Machine-Diagram.md) - Visual reference
- [WebRTC Guide](./WebRTC-Guide.md) - WebRTC integration

---

**Version**: 0.4.0
**Last Updated**: January 30, 2026
