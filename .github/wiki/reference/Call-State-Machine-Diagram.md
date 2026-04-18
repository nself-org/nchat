# Call State Machine Diagram

Visual representation of the call state machine and valid transitions.

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Call State Machine                            │
└─────────────────────────────────────────────────────────────────────┘

                           ┌──────────┐
                           │   idle   │
                           └─────┬────┘
                                 │ initiateCall()
                                 ▼
                          ┌─────────────┐
                          │ initiating  │─────► ending ─► ended ─► idle
                          └──────┬──────┘         (cancel)
                                 │
                    ┌────────────┼────────────┐
                    │                         │
                    ▼                         ▼
             ┌─────────────┐          ┌─────────────┐
             │   ringing   │          │ connecting  │ (group call)
             └──────┬──────┘          └──────┬──────┘
                    │                        │
                    │ answered()             │
                    ▼                        │
             ┌─────────────┐                │
             │ connecting  │◄───────────────┘
             └──────┬──────┘
                    │ connected()
                    ▼
             ┌─────────────┐
        ┌───►│  connected  │◄───┐
        │    └──────┬──────┘    │
        │           │            │
        │    ┌──────┼──────┐    │
        │    │      │      │    │
        │    ▼      ▼      ▼    │
        │  ┌────┐ ┌────┐ ┌────┐│
        └──│held│ │tran│ │reco││
           └────┘ │sfer│ │nnec││
                  └────┘ │ting││
                         └────┘│
                                │
                                ▼
                          ┌─────────┐
                          │  ending │
                          └────┬────┘
                               │
                               ▼
                          ┌────────┐
                          │ ended  │
                          └────┬───┘
                               │
                               ▼
                          ┌────────┐
                          │  idle  │
                          └────────┘
```

## State Descriptions

### idle

**Description**: No active call
**Can Transition To**: initiating
**Typical Duration**: N/A (waiting state)
**Actions**: None

### initiating

**Description**: Creating call, getting media, initializing connection
**Can Transition To**: ringing, connecting, ending, ended
**Typical Duration**: 1-2 seconds
**Actions**:

- Request microphone/camera permissions
- Get local media stream
- Create RTCPeerConnection
- Generate call ID

### ringing

**Description**: Calling recipient, waiting for answer
**Can Transition To**: connecting, ending, ended
**Typical Duration**: Up to 30 seconds (timeout)
**Actions**:

- Send call invitation
- Play ring back tone
- Wait for acceptance

### connecting

**Description**: WebRTC negotiation in progress (offer/answer exchange)
**Can Transition To**: connected, ending, ended
**Typical Duration**: 2-5 seconds
**Actions**:

- Exchange SDP offers/answers
- Gather ICE candidates
- Establish peer connection

### connected

**Description**: Call is active, media flowing
**Can Transition To**: held, transferring, reconnecting, ending, ended
**Typical Duration**: Varies (minutes to hours)
**Actions**:

- Stream audio/video
- Monitor quality
- Handle media controls (mute, video toggle)

### held

**Description**: Call on hold, media paused
**Can Transition To**: connected, transferring, ending, ended
**Typical Duration**: Varies
**Actions**:

- Mute audio
- Pause video
- Show "on hold" status

### transferring

**Description**: Call being transferred to another user
**Can Transition To**: connected, ending, ended
**Typical Duration**: 2-5 seconds
**Actions**:

- Coordinate with transfer target
- Hand off media streams
- Notify participants

### reconnecting

**Description**: Network issue, attempting to reconnect
**Can Transition To**: connected, ending, ended
**Typical Duration**: Up to 10 seconds
**Actions**:

- Monitor ICE connection state
- Attempt to reestablish connection
- Show reconnecting UI

### ending

**Description**: Hanging up, cleaning up resources
**Can Transition To**: ended
**Typical Duration**: <1 second
**Actions**:

- Close peer connection
- Stop media streams
- Send end call signal

### ended

**Description**: Call has ended, showing summary
**Can Transition To**: idle
**Typical Duration**: Brief (UI shows call ended)
**Actions**:

- Display call duration
- Save call history
- Release resources

## Transition Rules

### Valid Transitions

| From State   | Valid Next States | Triggers                  |
| ------------ | ----------------- | ------------------------- |
| idle         | initiating        | User initiates call       |
| initiating   | ringing           | Invitation sent (1-on-1)  |
| initiating   | connecting        | Direct connection (group) |
| initiating   | ending            | User cancels              |
| initiating   | ended             | Error during setup        |
| ringing      | connecting        | Recipient answered        |
| ringing      | ending            | User hangs up or timeout  |
| ringing      | ended             | Recipient declined        |
| connecting   | connected         | WebRTC established        |
| connecting   | ending            | Connection failed         |
| connecting   | ended             | Fatal error               |
| connected    | held              | User puts on hold         |
| connected    | transferring      | User transfers call       |
| connected    | reconnecting      | Network issue             |
| connected    | ending            | User hangs up             |
| held         | connected         | User resumes              |
| held         | transferring      | Transfer while held       |
| held         | ending            | User ends held call       |
| transferring | connected         | Transfer complete         |
| transferring | ending            | Transfer cancelled        |
| reconnecting | connected         | Reconnected               |
| reconnecting | ending            | Reconnection failed       |
| ending       | ended             | Cleanup complete          |
| ended        | idle              | Reset to idle             |

### Invalid Transitions

These transitions are **not allowed**:

- idle → connected (must go through initiating)
- ringing → held (can't hold unanswered call)
- ended → connected (can't revive ended call)
- Any state → ringing (except from initiating)

## State Duration Tracking

The state machine tracks three types of duration:

### 1. Current State Duration

Time spent in the current state (since last transition).

```typescript
const stateDuration = machine.getCurrentStateDuration() // milliseconds
```

### 2. Total Call Duration

Total time from idle → initiating until now.

```typescript
const totalDuration = machine.getTotalDuration() // milliseconds
```

### 3. Connected Duration

Total time spent in "connected" state (excludes held, reconnecting).

```typescript
const connectedDuration = machine.getConnectedDuration() // milliseconds
```

## Example State Flows

### Successful 1-on-1 Call

```
idle
  → initiating (getting media)
  → ringing (calling recipient)
  → connecting (WebRTC negotiation)
  → connected (talking)
  → ending (hanging up)
  → ended (call summary)
  → idle (ready for next call)
```

**Total Time**: ~2 minutes
**Connected Time**: ~1 minute 50 seconds

### Call with Hold

```
idle
  → initiating
  → ringing
  → connecting
  → connected (talking)
  → held (on hold for 30s)
  → connected (resumed)
  → ending
  → ended
  → idle
```

**Total Time**: ~3 minutes
**Connected Time**: ~2 minutes 30 seconds (excludes held time)

### Call with Network Issue

```
idle
  → initiating
  → ringing
  → connecting
  → connected (talking)
  → reconnecting (network issue for 5s)
  → connected (reconnected)
  → ending
  → ended
  → idle
```

**Total Time**: ~2 minutes
**Connected Time**: ~1 minute 55 seconds

### Cancelled Call

```
idle
  → initiating (getting media)
  → ringing (calling recipient)
  → ending (user cancelled)
  → ended
  → idle
```

**Total Time**: ~10 seconds
**Connected Time**: 0 seconds

### Declined Call

```
idle
  → initiating
  → ringing
  → ended (recipient declined)
  → idle
```

**Total Time**: ~5 seconds
**Connected Time**: 0 seconds

### Connection Failure

```
idle
  → initiating
  → ringing
  → connecting (WebRTC negotiation)
  → ending (connection failed)
  → ended
  → idle
```

**Total Time**: ~15 seconds
**Connected Time**: 0 seconds

### Group Call (No Ringing)

```
idle
  → initiating
  → connecting (direct connection)
  → connected (all participants join)
  → ending
  → ended
  → idle
```

**Total Time**: ~5 minutes
**Connected Time**: ~4 minutes 55 seconds

## State Machine Events

The state machine emits events for each transition:

### Transition Event

```typescript
{
  from: 'ringing',
  to: 'connected',
  timestamp: Date,
  reason?: 'answered',
  metadata?: {
    answeredBy: 'user-123',
    delay: 5000
  }
}
```

### Event Listeners

```typescript
// Listen to all transitions
machine.on('transition', (event) => {
  console.log(`${event.from} -> ${event.to}`)
})

// Listen to specific state entry
machine.on('enter:connected', (event) => {
  console.log('Call connected!')
  startQualityMonitoring()
})

// Listen to specific state exit
machine.on('exit:connected', (event) => {
  console.log('Call no longer connected')
  stopQualityMonitoring()
})

// Listen to invalid transitions
machine.on('invalid-transition', ({ from, to }) => {
  console.warn(`Cannot transition from ${from} to ${to}`)
})
```

## State History

The state machine maintains a history of all transitions:

```typescript
const history = machine.getHistory()

// Example history:
[
  { from: 'idle', to: 'initiating', timestamp: Date, reason: 'user-initiated' },
  { from: 'initiating', to: 'ringing', timestamp: Date },
  { from: 'ringing', to: 'connecting', timestamp: Date, reason: 'answered' },
  { from: 'connecting', to: 'connected', timestamp: Date },
  { from: 'connected', to: 'ending', timestamp: Date, reason: 'user-hangup' },
  { from: 'ending', to: 'ended', timestamp: Date },
]
```

This history is useful for:

- Debugging state issues
- Analyzing call flows
- Calculating durations
- Audit trails

## Best Practices

### 1. Always Validate Transitions

```typescript
if (machine.canTransitionTo('connected')) {
  machine.transition('connected')
} else {
  console.error('Invalid transition to connected')
}
```

### 2. Provide Transition Reasons

```typescript
machine.transition('ending', 'user-hangup')
machine.transition('ended', 'network-error', { error: err })
```

### 3. Handle Invalid Transitions

```typescript
machine.on('invalid-transition', ({ from, to }) => {
  showError(`Cannot ${to} call while ${from}`)
})
```

### 4. Track Durations

```typescript
// Show live duration
setInterval(() => {
  if (machine.isState('connected')) {
    const duration = machine.getConnectedDuration()
    updateCallTimer(duration)
  }
}, 1000)
```

### 5. Clean Up on End

```typescript
machine.on('enter:ended', () => {
  const connectedDuration = machine.getConnectedDuration()
  const totalDuration = machine.getTotalDuration()

  // Save to history
  saveCallHistory({
    connectedDuration,
    totalDuration,
    history: machine.getHistory(),
  })

  // Reset for next call
  setTimeout(() => {
    machine.transition('idle')
    machine.reset()
  }, 2000)
})
```

## Debugging

### Log All Transitions

```typescript
const machine = createCallStateMachine({
  onTransition: (event) => {
    console.log('[State]', event.from, '->', event.to, event.reason)
  },
  onInvalidTransition: (from, to) => {
    console.error('[State] Invalid:', from, '->', to)
  },
})
```

### Visualize Current State

```typescript
console.log('Current State:', machine.getState())
console.log('Display Name:', machine.getStateDisplayName())
console.log('Is Active?', machine.isActive())
console.log('Valid Next States:', getValidTransitions(machine.getState()))
```

### Analyze Call Flow

```typescript
const history = machine.getHistory()
console.log('Call Flow:')
history.forEach((event, i) => {
  console.log(`${i + 1}. ${event.from} -> ${event.to} (${event.reason || 'no reason'})`)
})
```

## Related Documentation

- [Call Management Guide](../guides/Call-Management-Guide.md)
- [Call System Implementation](./Call-System-Implementation.md)
- [WebRTC Guide](./WebRTC-Guide.md)

---

**Version**: 0.4.0
**Last Updated**: January 30, 2026
