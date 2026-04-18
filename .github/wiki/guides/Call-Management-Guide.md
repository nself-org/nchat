# Call Management System Guide

Complete guide to the call management infrastructure in nself-chat v0.4.0.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [React Hooks](#react-hooks)
5. [UI Components](#ui-components)
6. [Call States](#call-states)
7. [User Status](#user-status)
8. [Quality Monitoring](#quality-monitoring)
9. [Events System](#events-system)
10. [Usage Examples](#usage-examples)
11. [API Reference](#api-reference)

---

## Overview

The call management system provides comprehensive infrastructure for handling voice and video calls, including:

- **State Machine**: Manages call lifecycle with validated state transitions
- **Invitations**: Handles incoming calls with ring tones and notifications
- **Status Management**: Tracks user availability (online, busy, away, DND, offline)
- **Quality Monitoring**: Real-time WebRTC quality metrics and alerts
- **Events System**: Type-safe event handling for all call activities

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Call Management System                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    State     │  │  Invitation  │  │    Status    │      │
│  │   Machine    │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Quality    │  │    Events    │                         │
│  │   Monitor    │  │   Emitter    │                         │
│  └──────────────┘  └──────────────┘                         │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      React Hooks Layer                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  useCallState    useCallInvitation    useUserStatus         │
│  useCallQuality                                              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                     UI Components Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  CallInvitation          CallStateIndicator                  │
│  CallQualityIndicator    UserStatusIndicator                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Call State Machine

Manages call lifecycle with validated state transitions.

**File**: `src/lib/calls/call-state-machine.ts`

**States**:

- `idle` - No active call
- `initiating` - Creating call
- `ringing` - Calling recipient
- `connecting` - WebRTC negotiation
- `connected` - Call is active
- `reconnecting` - Network recovery
- `held` - Call on hold
- `transferring` - Being transferred
- `ending` - Hanging up
- `ended` - Call ended

**Usage**:

```typescript
import { createCallStateMachine } from '@/lib/calls'

const machine = createCallStateMachine({
  initialState: 'idle',
  onTransition: (event) => {
    console.log(`${event.from} -> ${event.to}`)
  },
})

// Transition states
machine.transition('initiating')
machine.transition('ringing')
machine.transition('connected')

// Check state
if (machine.isState('connected')) {
  console.log('Call is active')
}

// Get durations
const totalDuration = machine.getTotalDuration()
const connectedDuration = machine.getConnectedDuration()
```

### 2. Call Invitation Manager

Handles incoming call invitations with ring tones and notifications.

**File**: `src/lib/calls/call-invitation.ts`

**Features**:

- Ring tone playback
- Browser notifications
- Vibration (mobile)
- Auto-timeout (30s default)
- Multiple invitations support

**Usage**:

```typescript
import { createInvitationManager } from '@/lib/calls'

const manager = createInvitationManager({
  ringToneUrl: '/sounds/ringtone.mp3',
  ringVolume: 0.8,
  timeout: 30000, // 30 seconds
  onInvitation: (invitation) => {
    console.log('Incoming call from', invitation.callerName)
  },
})

// Create invitation
const invitation = manager.createInvitation('call-123', 'user-456', 'Alice Smith', 'video', {
  callerAvatarUrl: '/avatars/alice.jpg',
})

// Accept/decline
manager.acceptInvitation(invitation.id)
manager.declineInvitation(invitation.id)

// Cleanup
manager.cleanup()
```

### 3. Call Status Manager

Manages user availability status for calls.

**File**: `src/lib/calls/call-status-manager.ts`

**Statuses**:

- `online` - Available for calls
- `busy` - In a call
- `away` - Idle (auto-set after 5 minutes)
- `dnd` - Do Not Disturb
- `offline` - Not connected

**Features**:

- Auto-away after inactivity
- Call waiting support
- Concurrent call limits
- Activity tracking

**Usage**:

```typescript
import { createStatusManager } from '@/lib/calls'

const manager = createStatusManager({
  awayTimeout: 5 * 60 * 1000, // 5 minutes
  enableCallWaiting: true,
  maxConcurrentCalls: 1,
})

// Initialize user
manager.initializeUser('user-123', 'online')

// Update status
manager.setStatus('user-123', 'dnd', 'In a meeting')

// Check availability
if (manager.isAvailable('user-123')) {
  console.log('User can receive calls')
} else {
  const reason = manager.getUnavailabilityReason('user-123')
  console.log(reason) // "User is in Do Not Disturb mode"
}

// Mark in call
manager.startCall('user-123', 'call-456')
manager.endCall('user-123')

// Update activity (prevents auto-away)
manager.updateActivity('user-123')
```

### 4. Call Quality Monitor

Monitors WebRTC call quality using getStats() API.

**File**: `src/lib/calls/call-quality-monitor.ts`

**Metrics**:

- Audio/video bitrate
- Packet loss
- Jitter
- RTT (Round Trip Time)
- Frame rate (video)
- Resolution (video)

**Quality Levels**:

- `excellent` - < 0.5% packet loss, < 20ms jitter, < 100ms RTT
- `good` - < 2% packet loss, < 50ms jitter, < 200ms RTT
- `fair` - < 5% packet loss, < 100ms jitter, < 400ms RTT
- `poor` - < 10% packet loss, < 200ms jitter, < 800ms RTT
- `critical` - Above poor thresholds

**Usage**:

```typescript
import { createQualityMonitor } from '@/lib/calls'

const monitor = createQualityMonitor({
  interval: 2000, // 2 seconds
  enableAlerts: true,
  onMetrics: (metrics) => {
    console.log('Quality:', metrics.overallQuality)
    console.log('Audio bitrate:', metrics.audioReceiveBitrate)
    console.log('Packet loss:', metrics.audioPacketLoss)
  },
  onAlert: (alert) => {
    console.warn(alert.message)
    alert.suggestions.forEach((s) => console.log('-', s))
  },
})

// Start monitoring
monitor.start(peerConnection)

// Get current quality
const quality = monitor.getQuality() // 'excellent' | 'good' | ...
const metrics = monitor.getMetrics()

// Stop monitoring
monitor.stop()
```

### 5. Events System

Type-safe event handling for all call activities.

**File**: `src/lib/calls/call-events.ts`

**Event Types**:

- Lifecycle: `call:created`, `call:ringing`, `call:connected`, `call:ended`
- Media: `call:mute-changed`, `call:video-changed`, `call:screen-share-started`
- Quality: `call:quality-changed`, `call:quality-alert`
- Invitations: `call:invitation-received`, `call:invitation-accepted`
- Status: `call:status-changed`, `call:user-busy`
- Errors: `call:error`, `call:media-error`

**Usage**:

```typescript
import { getCallEventEmitter, subscribeToCallEvents } from '@/lib/calls'

// Get global emitter
const emitter = getCallEventEmitter()

// Subscribe to specific event
emitter.onCallEvent('call:connected', (event) => {
  console.log('Call connected:', event.callId)
})

// Subscribe to multiple events
const cleanup = subscribeToCallEvents({
  'call:created': (event) => console.log('Created'),
  'call:ended': (event) => console.log('Ended'),
  'call:quality-changed': (event) => {
    console.log(`Quality: ${event.from} -> ${event.to}`)
  },
})

// Cleanup
cleanup()

// Listen to all events
emitter.onAnyEvent((event) => {
  console.log(event.type, event)
})

// Get event history
const history = emitter.getHistory({ callId: 'call-123' })
```

---

## React Hooks

### useCallState

Manages call state machine in React.

```typescript
import { useCallState } from '@/hooks/use-call-state'

function CallComponent() {
  const {
    state,
    isConnected,
    displayName,
    connectedDuration,
    transition,
    canTransitionTo,
  } = useCallState({
    initialState: 'idle',
    autoLog: true
  })

  const handleConnect = () => {
    if (canTransitionTo('connected')) {
      transition('connected')
    }
  }

  return (
    <div>
      <p>State: {displayName}</p>
      {isConnected && <p>Duration: {connectedDuration}ms</p>}
    </div>
  )
}
```

### useCallInvitation

Manages incoming call invitations.

```typescript
import { useCallInvitation } from '@/hooks/use-call-invitation'

function IncomingCallsComponent() {
  const {
    activeInvitations,
    hasInvitations,
    isRinging,
    accept,
    decline,
  } = useCallInvitation({
    ringVolume: 0.8,
    timeout: 30000,
    onInvitationReceived: (invitation) => {
      console.log('Incoming call from', invitation.callerName)
    }
  })

  return (
    <div>
      {isRinging && <p>Ringing...</p>}
      {activeInvitations.map((invitation) => (
        <div key={invitation.id}>
          <p>{invitation.callerName} is calling</p>
          <button onClick={() => accept(invitation.id)}>Accept</button>
          <button onClick={() => decline(invitation.id)}>Decline</button>
        </div>
      ))}
    </div>
  )
}
```

### useCallQuality

Monitors call quality.

```typescript
import { useCallQuality } from '@/hooks/use-call-quality'

function QualityMonitorComponent({ peerConnection }) {
  const {
    quality,
    metrics,
    isExcellent,
    isPoor,
    lastAlert,
    start,
    stop,
  } = useCallQuality({
    interval: 2000,
    showAlerts: true
  })

  useEffect(() => {
    if (peerConnection) {
      start(peerConnection)
      return () => stop()
    }
  }, [peerConnection, start, stop])

  return (
    <div>
      <p>Quality: {quality}</p>
      {metrics && (
        <div>
          <p>Bitrate: {metrics.audioReceiveBitrate.toFixed(0)} kbps</p>
          <p>Packet Loss: {metrics.audioPacketLoss.toFixed(1)}%</p>
          <p>RTT: {metrics.rtt.toFixed(0)}ms</p>
        </div>
      )}
      {lastAlert && isPoor && (
        <div>
          <p>{lastAlert.message}</p>
          {lastAlert.suggestions.map((s, i) => (
            <p key={i}>• {s}</p>
          ))}
        </div>
      )}
    </div>
  )
}
```

### useUserStatus

Manages user availability status.

```typescript
import { useUserStatus } from '@/hooks/use-user-status'

function StatusComponent() {
  const {
    status,
    isAvailable,
    inCall,
    setOnline,
    setBusy,
    setDND,
    isUserAvailable,
    getStatusDisplay,
  } = useUserStatus({
    autoInitialize: true,
    awayTimeout: 5 * 60 * 1000
  })

  return (
    <div>
      <p>Your status: {status}</p>
      <button onClick={setOnline}>Set Online</button>
      <button onClick={setBusy}>Set Busy</button>
      <button onClick={() => setDND('In a meeting')}>Set DND</button>

      {isAvailable && <p>You can receive calls</p>}
      {inCall && <p>You are in a call</p>}
    </div>
  )
}
```

---

## UI Components

### CallInvitation

Full-screen modal for incoming calls.

```typescript
import { CallInvitation } from '@/components/calls/CallInvitation'

function App() {
  const [invitation, setInvitation] = useState(null)

  return invitation && (
    <CallInvitation
      invitation={invitation}
      onAccept={() => acceptCall(invitation.id)}
      onDecline={() => declineCall(invitation.id)}
      open={true}
    />
  )
}
```

### CallStateIndicator

Displays current call state.

```typescript
import { CallStateIndicator } from '@/components/calls/CallStateIndicator'

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

Shows call quality with metrics.

```typescript
import { CallQualityIndicator } from '@/components/calls/CallQualityIndicator'

<CallQualityIndicator
  quality="good"
  metrics={metrics}
  variant="detailed"
  showLabel={true}
  showMetrics={true}
/>
```

### UserStatusIndicator

Displays user availability status.

```typescript
import { UserStatusIndicator } from '@/components/calls/UserStatusIndicator'

<UserStatusIndicator
  status="online"
  variant="badge"
  size="md"
  showTooltip={true}
/>
```

---

## Call States

### State Diagram

```
idle
  └─> initiating
        ├─> ringing
        │     └─> connecting
        │           └─> connected ◄─┐
        │                 ├─> held ─┘
        │                 ├─> transferring ─┘
        │                 ├─> reconnecting ─┘
        │                 └─> ending
        │                       └─> ended
        │                             └─> idle
        ├─> ending
        │     └─> ended
        │           └─> idle
        └─> ended
              └─> idle
```

### Valid Transitions

| From         | To           | Description                    |
| ------------ | ------------ | ------------------------------ |
| idle         | initiating   | Start new call                 |
| initiating   | ringing      | Calling recipient              |
| initiating   | connecting   | Direct connection (group call) |
| initiating   | ending       | Cancel before answered         |
| ringing      | connecting   | Recipient answered             |
| ringing      | ending       | Hang up or timeout             |
| connecting   | connected    | Connection established         |
| connecting   | ending       | Connection failed              |
| connected    | held         | Put call on hold               |
| connected    | transferring | Transfer to another user       |
| connected    | reconnecting | Network issue                  |
| connected    | ending       | Normal hang up                 |
| reconnecting | connected    | Reconnected successfully       |
| reconnecting | ending       | Reconnection failed            |
| held         | connected    | Resume call                    |
| held         | transferring | Transfer while held            |
| held         | ending       | End held call                  |
| transferring | connected    | Transfer completed             |
| transferring | ending       | Transfer cancelled             |
| ending       | ended        | Cleanup complete               |
| ended        | idle         | Ready for next call            |

---

## User Status

### Status Priority

When multiple conditions apply, status is determined by priority:

1. **In Call** (highest priority) - Always shown when `inCall = true`
2. **DND** - Explicit Do Not Disturb
3. **Busy** - Manually set busy
4. **Away** - Auto-set after inactivity
5. **Online** - Available
6. **Offline** (lowest priority) - Not connected

### Status Behavior

#### Online

- Default status for connected users
- Can receive calls
- Automatically set to "Away" after 5 minutes of inactivity
- Activity tracking resets the away timer

#### Busy

- Manually set by user
- Cannot receive calls (unless call waiting enabled)
- Does not auto-revert

#### Away

- Automatically set after inactivity
- Can receive calls
- Reverts to "Online" on any activity

#### DND (Do Not Disturb)

- Blocks all incoming calls
- Manually set by user with optional custom message
- Does not auto-revert

#### Offline

- User disconnected
- Cannot receive calls
- Manually set or auto-set on disconnect

### Call Waiting

If call waiting is enabled:

- Users can receive calls while already in a call
- Incoming call shows "User is in another call (call waiting available)"
- User can switch between calls or merge into conference

---

## Quality Monitoring

### Quality Thresholds

| Level     | Packet Loss | Jitter  | RTT     | Bitrate    |
| --------- | ----------- | ------- | ------- | ---------- |
| Excellent | < 0.5%      | < 20ms  | < 100ms | > 300 kbps |
| Good      | < 2%        | < 50ms  | < 200ms | > 150 kbps |
| Fair      | < 5%        | < 100ms | < 400ms | > 64 kbps  |
| Poor      | < 10%       | < 200ms | < 800ms | > 32 kbps  |
| Critical  | > 10%       | > 200ms | > 800ms | < 32 kbps  |

### Metrics Collection

Quality monitor collects metrics every 2 seconds (configurable):

- **Audio Send/Receive Bitrate**: kbps
- **Video Send/Receive Bitrate**: kbps
- **Audio/Video Packet Loss**: percentage
- **Audio/Video Jitter**: milliseconds
- **RTT (Round Trip Time)**: milliseconds
- **Video Frame Rate**: fps
- **Video Resolution**: width x height

### Quality Alerts

Alerts are generated when:

- Quality degrades to fair, poor, or critical
- Packet loss > 5%
- Jitter > 100ms
- RTT > 400ms
- Bitrate < 64 kbps
- Frame rate < 15 fps

Alert cooldown prevents alert spam (10 seconds default).

### Suggestions

The system provides context-aware suggestions:

**Poor/Critical Quality**:

- Turn off video to improve call quality
- Check your internet connection
- Move closer to your WiFi router
- Close bandwidth-heavy applications

**High Packet Loss**:

- Reduce video quality settings

**High RTT**:

- Check for network congestion
- Use wired connection if possible

---

## Events System

### Event Lifecycle

All call events follow this lifecycle:

1. **Event Created** - Event object constructed
2. **Event Emitted** - Sent to all listeners
3. **Event Logged** - Added to history
4. **Event Processed** - Handlers execute
5. **Event Stored** (optional) - Persisted to database

### Event Structure

```typescript
interface CallEvent {
  type: CallEventType
  callId: string
  timestamp: Date
  userId?: string
  metadata?: Record<string, any>
}
```

### Event History

Events are stored in memory (last 100 by default):

```typescript
// Get all events
const allEvents = emitter.getHistory()

// Filter by call
const callEvents = emitter.getHistory({ callId: 'call-123' })

// Filter by type
const qualityEvents = emitter.getHistory({
  type: ['call:quality-changed', 'call:quality-alert'],
})

// Filter by user
const userEvents = emitter.getHistory({ userId: 'user-456' })

// Filter by time
const recentEvents = emitter.getHistory({
  since: new Date(Date.now() - 60000), // Last minute
})
```

---

## Usage Examples

### Complete Call Flow

```typescript
import {
  createCallStateMachine,
  createInvitationManager,
  createStatusManager,
  createQualityMonitor,
  getCallEventEmitter,
} from '@/lib/calls'

// Initialize managers
const stateMachine = createCallStateMachine()
const invitationManager = createInvitationManager()
const statusManager = createStatusManager()
const qualityMonitor = createQualityMonitor()
const eventEmitter = getCallEventEmitter()

// Subscribe to events
eventEmitter.onCallEvent('call:created', (event) => {
  console.log('Call created:', event.callId)
  stateMachine.transition('initiating')
})

eventEmitter.onCallEvent('call:connected', (event) => {
  console.log('Call connected')
  stateMachine.transition('connected')
  statusManager.startCall(userId, event.callId)
  qualityMonitor.start(peerConnection)
})

eventEmitter.onCallEvent('call:ended', (event) => {
  console.log('Call ended:', event.reason)
  stateMachine.transition('ending')
  stateMachine.transition('ended')
  statusManager.endCall(userId)
  qualityMonitor.stop()
})

// Initiate call
async function initiateCall(targetUserId: string) {
  const callId = generateCallId()

  // Check availability
  if (!statusManager.isAvailable(targetUserId)) {
    const reason = statusManager.getUnavailabilityReason(targetUserId)
    alert(reason)
    return
  }

  // Create call
  eventEmitter.emitCallEvent({
    type: 'call:created',
    callId,
    callType: 'video',
    initiatorId: currentUserId,
    targetUserId,
    timestamp: new Date(),
  })

  // Transition states
  stateMachine.transition('initiating')

  // Get media
  const stream = await getVideoStream()

  // Create peer connection
  const pc = new RTCPeerConnection()
  stream.getTracks().forEach((track) => pc.addTrack(track, stream))

  // Create offer
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  // Send offer to target
  await sendOffer(targetUserId, offer)

  stateMachine.transition('ringing')
}

// Handle incoming call
function handleIncomingCall(callId: string, callerId: string) {
  const invitation = invitationManager.createInvitation(callId, callerId, callerName, 'video')

  // Show UI
  showIncomingCallModal(invitation)
}

// Accept call
async function acceptCall(invitationId: string) {
  invitationManager.acceptInvitation(invitationId)
  stateMachine.transition('connecting')

  // Get media
  const stream = await getVideoStream()

  // Create peer connection
  const pc = new RTCPeerConnection()
  stream.getTracks().forEach((track) => pc.addTrack(track, stream))

  // Create answer
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)

  // Send answer
  await sendAnswer(callerId, answer)

  stateMachine.transition('connected')

  // Start quality monitoring
  qualityMonitor.start(pc)
}

// End call
async function endCall(callId: string) {
  stateMachine.transition('ending')

  // Close peer connection
  pc.close()

  // Stop media streams
  localStream.getTracks().forEach((track) => track.stop())

  // Emit event
  eventEmitter.emitCallEvent({
    type: 'call:ended',
    callId,
    reason: 'completed',
    duration: stateMachine.getConnectedDuration(),
    timestamp: new Date(),
  })

  stateMachine.transition('ended')
  qualityMonitor.stop()
  statusManager.endCall(currentUserId)
}
```

---

## API Reference

### Call State Machine

```typescript
class CallStateMachine {
  getState(): CallState
  getPreviousState(): CallState | null
  canTransitionTo(targetState: CallState): boolean
  transition(targetState: CallState, reason?: string, metadata?: Record<string, any>): boolean
  reset(): void
  isState(state: CallState): boolean
  isAnyState(...states: CallState[]): boolean
  isActive(): boolean
  isInProgress(): boolean
  getStateDisplayName(): string
  getCurrentStateDuration(): number
  getTotalDuration(): number
  getConnectedDuration(): number
  getHistory(): StateTransitionEvent[]
}
```

### Call Invitation Manager

```typescript
class CallInvitationManager {
  createInvitation(id: string, callerId: string, callerName: string, type: 'voice' | 'video', options?: {...}): CallInvitation
  getInvitation(id: string): CallInvitation | undefined
  getActiveInvitations(): CallInvitation[]
  hasActiveInvitations(): boolean
  acceptInvitation(id: string): boolean
  declineInvitation(id: string): boolean
  cancelInvitation(id: string): boolean
  isRinging(): boolean
  updateConfig(config: Partial<InvitationConfig>): void
  cleanup(): void
  getStats(): {...}
}
```

### Call Status Manager

```typescript
class CallStatusManager {
  initializeUser(userId: string, initialStatus?: UserStatus): void
  getStatus(userId: string): UserCallStatus | undefined
  setStatus(userId: string, status: UserStatus, customMessage?: string): boolean
  updateActivity(userId: string): void
  startCall(userId: string, callId: string): boolean
  endCall(userId: string): boolean
  isAvailable(userId: string): boolean
  isBusy(userId: string): boolean
  isDND(userId: string): boolean
  setCallWaiting(userId: string, enabled: boolean): boolean
  getUnavailabilityReason(userId: string): string | null
  getStatusDisplay(userId: string): string
  getAllStatuses(): UserCallStatus[]
  getUsersByStatus(status: UserStatus): UserCallStatus[]
  getAvailableUsers(): UserCallStatus[]
  getBusyUsers(): UserCallStatus[]
  removeUser(userId: string): void
  cleanup(): void
  updateConfig(config: Partial<StatusManagerConfig>): void
  getStats(): {...}
}
```

### Call Quality Monitor

```typescript
class CallQualityMonitor {
  start(peerConnection: RTCPeerConnection): void
  stop(): void
  getMetrics(): QualityMetrics | null
  getQuality(): QualityLevel
  getHistory(): QualityMetrics[]
  getAverageMetrics(count?: number): Partial<QualityMetrics> | null
  cleanup(): void
}
```

### Call Event Emitter

```typescript
class CallEventEmitter {
  emitCallEvent<T extends AnyCallEvent>(event: T): void
  getHistory(filter?: {...}): AnyCallEvent[]
  getCallHistory(callId: string): AnyCallEvent[]
  clearHistory(): void
  setMaxHistory(max: number): void
  onCallEvent<K extends CallEventType>(event: K, handler: CallEventHandlers[K]): void
  onceCallEvent<K extends CallEventType>(event: K, handler: CallEventHandlers[K]): void
  offCallEvent<K extends CallEventType>(event: K, handler: CallEventHandlers[K]): void
  onAnyEvent(handler: CallEventHandler): void
  offAnyEvent(handler: CallEventHandler): void
}
```

---

## Best Practices

1. **Always validate state transitions** - Use `canTransitionTo()` before calling `transition()`
2. **Clean up resources** - Call `cleanup()` on all managers when done
3. **Handle errors** - Wrap async operations in try-catch
4. **Monitor quality** - Start quality monitoring when call connects
5. **Update activity** - Call `updateActivity()` on user interactions to prevent auto-away
6. **Use events** - Subscribe to events instead of polling state
7. **Test edge cases** - Network failures, timeouts, concurrent calls
8. **Provide feedback** - Show state changes and quality alerts to users
9. **Log events** - Use event history for debugging
10. **Respect user status** - Check availability before initiating calls

---

## Troubleshooting

### Common Issues

**State machine rejects transition**:

- Check valid transitions in state diagram
- Verify current state before transitioning
- Use `canTransitionTo()` to validate

**Ring tone not playing**:

- Check audio permissions
- Verify ring tone file exists
- Check audio context state (user gesture required)
- Test volume settings

**Quality always shows "poor"**:

- Verify peer connection is established
- Check WebRTC getStats() is working
- Review threshold configuration
- Test with good network connection

**User status stuck on "away"**:

- Call `updateActivity()` on user interactions
- Check away timeout configuration
- Verify event listeners are attached

**Events not firing**:

- Verify event emitter is initialized
- Check event listener is attached before events occur
- Review event type spelling
- Test with `onAnyEvent()` to catch all events

---

## Migration Guide

### From v0.3.x

The call management system is new in v0.4.0. If you're using the existing `use-call.ts` hook:

**Before**:

```typescript
const { isInCall, callState, initiateVoiceCall, endCall } = useCall()
```

**After**:

```typescript
// Import new hooks
import { useCallState } from '@/hooks/use-call-state'
import { useCallInvitation } from '@/hooks/use-call-invitation'
import { useUserStatus } from '@/hooks/use-user-status'
import { useCallQuality } from '@/hooks/use-call-quality'

// Use separately or together
const { state, isConnected, transition } = useCallState()
const { activeInvitations, accept, decline } = useCallInvitation()
const { isAvailable, setStatus } = useUserStatus()
const { quality, metrics } = useCallQuality()
```

The new system provides more granular control and better separation of concerns.

---

## Performance Considerations

- **State machine**: O(1) state transitions and checks
- **Invitation manager**: Minimal overhead, audio element reused
- **Status manager**: O(1) status lookups, O(n) for user lists
- **Quality monitor**: Collects stats every 2s, maintains 30-measurement history
- **Events**: O(1) emit, O(n) for filtered history queries

Memory usage:

- State machine: ~1 KB per instance
- Invitation manager: ~2 KB + audio element
- Status manager: ~100 bytes per user
- Quality monitor: ~10 KB (30 metric snapshots)
- Event emitter: ~5 KB (100 events)

---

## Related Documentation

- [WebRTC Documentation](./WebRTC-Guide.md)
- [Call System Implementation](./Call-System-Implementation.md)
- [API Documentation](../api/API-DOCUMENTATION.md)
- [Architecture Overview](../reference/Architecture.md)

---

**Version**: 0.4.0
**Last Updated**: January 30, 2026
**Status**: Complete ✅
