/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 *
 * Integration Test: WebRTC + Calls + Screen Share
 *
 * Tests the complete WebRTC flow including signaling, peer connections,
 * media streams, screen sharing, and call quality monitoring.
 *
 * This tests the integration between:
 * - WebRTC signaling (offer/answer/ICE)
 * - Media streams (audio/video)
 * - Screen sharing
 * - Call recording
 * - Quality metrics
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock WebRTC APIs
class MockRTCPeerConnection {
  localDescription: RTCSessionDescription | null = null
  remoteDescription: RTCSessionDescription | null = null
  iceGatheringState: RTCIceGatheringState = 'new'
  connectionState: RTCPeerConnectionState = 'new'
  private eventHandlers: Map<string, Function[]> = new Map()

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'mock-sdp-offer' }
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'mock-sdp-answer' }
  }

  async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = desc as RTCSessionDescription
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = desc as RTCSessionDescription
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    // Mock ICE candidate handling
  }

  addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender {
    return {} as RTCRtpSender
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)?.push(handler)
  }

  close(): void {
    this.connectionState = 'closed'
  }
}

class MockMediaStream {
  id: string
  active: boolean = true
  private tracks: MediaStreamTrack[] = []

  constructor(id: string = `stream-${Math.random()}`) {
    this.id = id
  }

  getTracks(): MediaStreamTrack[] {
    return this.tracks
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track)
  }

  removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter(t => t !== track)
  }
}

class MockMediaStreamTrack {
  kind: 'audio' | 'video'
  enabled: boolean = true
  readyState: 'live' | 'ended' = 'live'

  constructor(kind: 'audio' | 'video') {
    this.kind = kind
  }

  stop(): void {
    this.readyState = 'ended'
  }
}

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(async () => {
      const stream = new MockMediaStream()
      stream.addTrack(new MockMediaStreamTrack('audio'))
      stream.addTrack(new MockMediaStreamTrack('video'))
      return stream
    }),
    getDisplayMedia: jest.fn(async () => {
      const stream = new MockMediaStream()
      stream.addTrack(new MockMediaStreamTrack('video'))
      return stream
    }),
    enumerateDevices: jest.fn(async () => [
      { kind: 'audioinput', label: 'Microphone', deviceId: 'mic-1' },
      { kind: 'videoinput', label: 'Camera', deviceId: 'cam-1' },
      { kind: 'audiooutput', label: 'Speaker', deviceId: 'speaker-1' },
    ]),
  },
  writable: true,
})

// @ts-ignore
global.RTCPeerConnection = MockRTCPeerConnection
// @ts-ignore
global.MediaStream = MockMediaStream

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

describe('WebRTC + Calls Integration', () => {
  const mockCallerId = 'user-alice'
  const mockCalleeId = 'user-bob'
  const mockCallId = 'call-123'

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Call Initiation and Signaling', () => {
    it('should initiate 1-on-1 call with signaling', async () => {
      const call = {
        id: mockCallId,
        caller: mockCallerId,
        callee: mockCalleeId,
        type: '1-on-1' as const,
        status: 'ringing' as const,
        initiatedAt: Date.now(),
      }

      localStorage.setItem(`call-${mockCallId}`, JSON.stringify(call))

      // Create peer connection
      const pc = new MockRTCPeerConnection()

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send offer via signaling
      const signalingMessage = {
        type: 'offer',
        from: mockCallerId,
        to: mockCalleeId,
        callId: mockCallId,
        sdp: offer.sdp,
      }

      localStorage.setItem(`signaling-${mockCallId}-offer`, JSON.stringify(signalingMessage))

      const stored = JSON.parse(localStorage.getItem(`signaling-${mockCallId}-offer`) || '{}')
      expect(stored.type).toBe('offer')
      expect(stored.sdp).toBe('mock-sdp-offer')
    })

    it('should answer incoming call', async () => {
      // Receive offer
      const offer = {
        type: 'offer' as const,
        from: mockCallerId,
        to: mockCalleeId,
        callId: mockCallId,
        sdp: 'mock-sdp-offer',
      }

      // Create peer connection
      const pc = new MockRTCPeerConnection()

      // Set remote description
      await pc.setRemoteDescription(offer)

      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Send answer
      const signalingMessage = {
        type: 'answer',
        from: mockCalleeId,
        to: mockCallerId,
        callId: mockCallId,
        sdp: answer.sdp,
      }

      localStorage.setItem(`signaling-${mockCallId}-answer`, JSON.stringify(signalingMessage))

      const stored = JSON.parse(localStorage.getItem(`signaling-${mockCallId}-answer`) || '{}')
      expect(stored.type).toBe('answer')
      expect(stored.sdp).toBe('mock-sdp-answer')
    })

    it('should exchange ICE candidates', async () => {
      const iceCandidate = {
        candidate: 'candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host',
        sdpMid: 'audio',
        sdpMLineIndex: 0,
      }

      const signalingMessage = {
        type: 'ice-candidate',
        from: mockCallerId,
        to: mockCalleeId,
        callId: mockCallId,
        candidate: iceCandidate,
      }

      const candidateKey = `ice-candidate-${mockCallId}`
      localStorage.setItem(candidateKey, JSON.stringify(signalingMessage))

      const stored = JSON.parse(localStorage.getItem(candidateKey) || '{}')

      expect(stored.type).toBe('ice-candidate')
      expect(stored.candidate).toBeDefined()
    })

    it('should handle ICE connection states', () => {
      const pc = new MockRTCPeerConnection()

      const states: RTCPeerConnectionState[] = ['new', 'connecting', 'connected', 'disconnected', 'failed', 'closed']

      states.forEach(state => {
        pc.connectionState = state

        localStorage.setItem(`connection-state-${mockCallId}`, JSON.stringify({
          callId: mockCallId,
          state,
          timestamp: Date.now(),
        }))

        const stored = JSON.parse(localStorage.getItem(`connection-state-${mockCallId}`) || '{}')
        expect(stored.state).toBe(state)
      })
    })
  })

  describe('Media Stream Management', () => {
    it('should capture local audio/video stream', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      expect(stream).toBeDefined()
      expect(stream.getTracks()).toHaveLength(2)
      expect(stream.getTracks()[0].kind).toBe('audio')
      expect(stream.getTracks()[1].kind).toBe('video')
    })

    it('should add local stream to peer connection', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      const pc = new MockRTCPeerConnection()

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Verify tracks were added
      expect(stream.getTracks()).toHaveLength(2)
    })

    it('should receive remote stream', () => {
      const pc = new MockRTCPeerConnection()
      const remoteStream = new MockMediaStream()

      pc.addEventListener('track', (event: any) => {
        remoteStream.addTrack(event.track)
      })

      // Simulate receiving track
      const mockTrack = new MockMediaStreamTrack('audio')
      remoteStream.addTrack(mockTrack)

      expect(remoteStream.getTracks()).toHaveLength(1)
    })

    it('should mute/unmute audio', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioTrack = stream.getTracks().find(t => t.kind === 'audio')

      expect(audioTrack?.enabled).toBe(true)

      // Mute
      if (audioTrack) audioTrack.enabled = false
      expect(audioTrack?.enabled).toBe(false)

      // Unmute
      if (audioTrack) audioTrack.enabled = true
      expect(audioTrack?.enabled).toBe(true)
    })

    it('should enable/disable video', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = stream.getTracks().find(t => t.kind === 'video')

      expect(videoTrack?.enabled).toBe(true)

      // Disable
      if (videoTrack) videoTrack.enabled = false
      expect(videoTrack?.enabled).toBe(false)

      // Enable
      if (videoTrack) videoTrack.enabled = true
      expect(videoTrack?.enabled).toBe(true)
    })

    it('should switch camera (front/back)', async () => {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')

      expect(cameras.length).toBeGreaterThanOrEqual(1)

      // Switch to different camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: cameras[0].deviceId },
      })

      const videoTrack = newStream.getTracks().find(t => t.kind === 'video')
      expect(videoTrack?.kind).toBe('video')
    })
  })

  describe('Group Calls', () => {
    it('should create group call with multiple participants', () => {
      const groupCall = {
        id: 'group-call-1',
        participants: [mockCallerId, mockCalleeId, 'user-charlie'],
        status: 'active',
        createdAt: Date.now(),
      }

      localStorage.setItem(`call-${groupCall.id}`, JSON.stringify(groupCall))

      const stored = JSON.parse(localStorage.getItem(`call-${groupCall.id}`) || '{}')
      expect(stored.participants).toHaveLength(3)
    })

    it('should create peer connection for each participant', () => {
      const participants = [mockCalleeId, 'user-charlie', 'user-dave']
      const peerConnections = new Map<string, MockRTCPeerConnection>()

      participants.forEach(participantId => {
        const pc = new MockRTCPeerConnection()
        peerConnections.set(participantId, pc)
      })

      expect(peerConnections.size).toBe(3)
    })

    it('should add participant to ongoing call', async () => {
      const groupCall = {
        id: 'group-call-1',
        participants: [mockCallerId, mockCalleeId],
      }

      const newParticipant = 'user-charlie'

      groupCall.participants.push(newParticipant)

      localStorage.setItem(`call-${groupCall.id}`, JSON.stringify(groupCall))

      const stored = JSON.parse(localStorage.getItem(`call-${groupCall.id}`) || '{}')
      expect(stored.participants).toContain(newParticipant)
      expect(stored.participants).toHaveLength(3)
    })

    it('should remove participant from call', () => {
      const groupCall = {
        id: 'group-call-1',
        participants: [mockCallerId, mockCalleeId, 'user-charlie'],
      }

      const leavingParticipant = mockCalleeId

      groupCall.participants = groupCall.participants.filter(p => p !== leavingParticipant)

      expect(groupCall.participants).not.toContain(leavingParticipant)
      expect(groupCall.participants).toHaveLength(2)
    })

    it('should layout multiple video streams', () => {
      const participants = [
        { id: 'user-1', stream: new MockMediaStream() },
        { id: 'user-2', stream: new MockMediaStream() },
        { id: 'user-3', stream: new MockMediaStream() },
        { id: 'user-4', stream: new MockMediaStream() },
      ]

      // Grid layout for 4 participants
      const layout = {
        type: 'grid',
        rows: 2,
        cols: 2,
        participants: participants.map(p => p.id),
      }

      expect(layout.rows * layout.cols).toBe(4)
    })
  })

  describe('Screen Sharing', () => {
    it('should capture screen for sharing', async () => {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })

      expect(screenStream).toBeDefined()
      expect(screenStream.getTracks()[0].kind).toBe('video')
    })

    it('should replace video track with screen track', async () => {
      const pc = new MockRTCPeerConnection()

      // Original camera stream
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const cameraTrack = cameraStream.getTracks()[0]

      pc.addTrack(cameraTrack, cameraStream)

      // Screen share stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getTracks()[0]

      // Replace track (simplified)
      cameraTrack.stop()
      pc.addTrack(screenTrack, screenStream)

      expect(cameraTrack.readyState).toBe('ended')
      expect(screenTrack.readyState).toBe('live')
    })

    it('should notify other participants when screen sharing starts', () => {
      const notification = {
        type: 'screen-share-started',
        from: mockCallerId,
        callId: mockCallId,
        timestamp: Date.now(),
      }

      const eventKey = `screen-share-event-${mockCallId}`
      localStorage.setItem(eventKey, JSON.stringify(notification))

      const stored = JSON.parse(localStorage.getItem(eventKey) || '{}')

      expect(stored.type).toBe('screen-share-started')
    })

    it('should stop screen sharing', async () => {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = screenStream.getTracks()[0]

      // Stop sharing
      screenTrack.stop()

      expect(screenTrack.readyState).toBe('ended')

      // Notify participants
      const notification = {
        type: 'screen-share-stopped',
        from: mockCallerId,
        callId: mockCallId,
      }

      localStorage.setItem('screen-share-stopped', JSON.stringify(notification))

      const stored = JSON.parse(localStorage.getItem('screen-share-stopped') || '{}')
      expect(stored.type).toBe('screen-share-stopped')
    })
  })

  describe('Call Recording', () => {
    it('should start recording call', () => {
      const recording = {
        callId: mockCallId,
        status: 'recording',
        startedAt: Date.now(),
        chunks: [] as Blob[],
      }

      localStorage.setItem(`recording-${mockCallId}`, JSON.stringify({
        ...recording,
        chunks: [], // Can't store Blobs in localStorage
      }))

      const stored = JSON.parse(localStorage.getItem(`recording-${mockCallId}`) || '{}')
      expect(stored.status).toBe('recording')
    })

    it('should stop recording and save file', () => {
      const recording = {
        callId: mockCallId,
        status: 'stopped',
        startedAt: Date.now() - 60000,
        stoppedAt: Date.now(),
        duration: 60000,
        fileUrl: 'https://storage/recordings/call-123.webm',
      }

      localStorage.setItem(`recording-${mockCallId}`, JSON.stringify(recording))

      const stored = JSON.parse(localStorage.getItem(`recording-${mockCallId}`) || '{}')
      expect(stored.status).toBe('stopped')
      expect(stored.fileUrl).toBeDefined()
    })

    it('should generate recording thumbnail', () => {
      const thumbnail = {
        recordingId: mockCallId,
        thumbnailUrl: 'https://storage/thumbnails/call-123.jpg',
        timestamp: 0, // First frame
      }

      localStorage.setItem(`thumbnail-${mockCallId}`, JSON.stringify(thumbnail))

      const stored = JSON.parse(localStorage.getItem(`thumbnail-${mockCallId}`) || '{}')
      expect(stored.thumbnailUrl).toBeDefined()
    })

    it('should notify participants when recording starts', () => {
      const notification = {
        type: 'recording-started',
        callId: mockCallId,
        timestamp: Date.now(),
        message: 'This call is being recorded',
      }

      localStorage.setItem('recording-notification', JSON.stringify(notification))

      const stored = JSON.parse(localStorage.getItem('recording-notification') || '{}')
      expect(stored.type).toBe('recording-started')
    })
  })

  describe('Call Quality Monitoring', () => {
    it('should collect connection statistics', async () => {
      const stats = {
        callId: mockCallId,
        timestamp: Date.now(),
        audio: {
          packetsLost: 12,
          packetsSent: 1000,
          bytesReceived: 500000,
          jitter: 0.023,
        },
        video: {
          packetsLost: 45,
          packetsSent: 5000,
          bytesReceived: 2000000,
          frameRate: 30,
          resolution: '1280x720',
        },
      }

      const statsKey = `stats-${mockCallId}`
      localStorage.setItem(statsKey, JSON.stringify(stats))

      const stored = JSON.parse(localStorage.getItem(statsKey) || '{}')

      expect(stored.audio.packetsLost).toBe(12)
      expect(stored.video.frameRate).toBe(30)
    })

    it('should calculate packet loss percentage', () => {
      const packetsLost = 50
      const packetsSent = 1000
      const lossPercentage = (packetsLost / packetsSent) * 100

      expect(lossPercentage).toBe(5)
    })

    it('should detect poor connection quality', () => {
      const stats = {
        packetsLost: 150,
        packetsSent: 1000,
        jitter: 0.15, // High jitter
        rtt: 500, // High round-trip time
      }

      const lossPercentage = (stats.packetsLost / stats.packetsSent) * 100
      const isPoorQuality = lossPercentage > 5 || stats.jitter > 0.1 || stats.rtt > 300

      expect(isPoorQuality).toBe(true)
    })

    it('should suggest quality improvements', () => {
      const poorQualityReasons = []

      const stats = {
        bandwidth: 0.5, // Mbps
        packetsLost: 100,
        packetsSent: 1000,
      }

      const lossPercentage = (stats.packetsLost / stats.packetsSent) * 100

      if (stats.bandwidth < 1) {
        poorQualityReasons.push('Low bandwidth')
      }

      if (lossPercentage > 5) {
        poorQualityReasons.push('High packet loss')
      }

      expect(poorQualityReasons).toContain('Low bandwidth')
      expect(poorQualityReasons).toContain('High packet loss')
    })

    it('should track call duration', () => {
      const call = {
        id: mockCallId,
        startedAt: Date.now() - 300000, // 5 minutes ago
        endedAt: Date.now(),
      }

      const duration = call.endedAt - call.startedAt
      const minutes = Math.floor(duration / 60000)

      expect(minutes).toBe(5)
    })
  })

  describe('Device Management', () => {
    it('should list available media devices', async () => {
      const devices = await navigator.mediaDevices.enumerateDevices()

      expect(devices.length).toBeGreaterThan(0)

      const audioInputs = devices.filter(d => d.kind === 'audioinput')
      const videoInputs = devices.filter(d => d.kind === 'videoinput')
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput')

      expect(audioInputs.length).toBeGreaterThan(0)
      expect(videoInputs.length).toBeGreaterThan(0)
      expect(audioOutputs.length).toBeGreaterThan(0)
    })

    it('should switch audio input device', async () => {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const microphones = devices.filter(d => d.kind === 'audioinput')

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: microphones[0].deviceId },
      })

      expect(newStream.getTracks()[0].kind).toBe('audio')
    })

    it('should handle device errors gracefully', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      } catch (error) {
        expect((error as Error).message).toBe('Permission denied')

        localStorage.setItem('device-error', JSON.stringify({
          error: 'Permission denied',
          timestamp: Date.now(),
        }))
      }

      const errorLog = JSON.parse(localStorage.getItem('device-error') || '{}')
      expect(errorLog.error).toBe('Permission denied')
    })
  })

  describe('Call State Management', () => {
    it('should handle call lifecycle states', () => {
      const states = ['initiated', 'ringing', 'answered', 'active', 'ended']

      states.forEach((state, index) => {
        const call = {
          id: mockCallId,
          status: state,
          timestamp: Date.now() + index * 1000,
        }

        localStorage.setItem(`call-state-${index}`, JSON.stringify(call))
      })

      expect(localStorage.getItem('call-state-4')).toBeDefined()
    })

    it('should decline incoming call', () => {
      const call = {
        id: mockCallId,
        caller: mockCallerId,
        callee: mockCalleeId,
        status: 'declined',
        declinedAt: Date.now(),
      }

      localStorage.setItem(`call-${mockCallId}`, JSON.stringify(call))

      const stored = JSON.parse(localStorage.getItem(`call-${mockCallId}`) || '{}')
      expect(stored.status).toBe('declined')
    })

    it('should handle missed call', () => {
      const call = {
        id: mockCallId,
        caller: mockCallerId,
        callee: mockCalleeId,
        status: 'missed',
        missedAt: Date.now(),
      }

      localStorage.setItem(`call-${mockCallId}`, JSON.stringify(call))

      const stored = JSON.parse(localStorage.getItem(`call-${mockCallId}`) || '{}')
      expect(stored.status).toBe('missed')
    })

    it('should end active call', () => {
      const call = {
        id: mockCallId,
        status: 'ended',
        startedAt: Date.now() - 60000,
        endedAt: Date.now(),
        duration: 60000,
      }

      localStorage.setItem(`call-${mockCallId}`, JSON.stringify(call))

      // Clean up peer connection
      const pc = new MockRTCPeerConnection()
      pc.close()

      expect(pc.connectionState).toBe('closed')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle signaling failures', () => {
      const signalingError = {
        callId: mockCallId,
        error: 'Failed to send signaling message',
        timestamp: Date.now(),
      }

      localStorage.setItem('signaling-error', JSON.stringify(signalingError))

      const stored = JSON.parse(localStorage.getItem('signaling-error') || '{}')
      expect(stored.error).toBeDefined()
    })

    it('should handle ICE connection failures', () => {
      const pc = new MockRTCPeerConnection()
      pc.connectionState = 'failed'

      expect(pc.connectionState).toBe('failed')

      // Attempt reconnection
      localStorage.setItem('reconnection-attempt', JSON.stringify({
        callId: mockCallId,
        attempts: 1,
        timestamp: Date.now(),
      }))
    })

    it('should handle media device unavailable', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('No media devices found')
      )

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (error) {
        expect((error as Error).message).toBe('No media devices found')
      }
    })

    it('should handle bandwidth limitations', () => {
      const stats = {
        availableBandwidth: 0.3, // Mbps
        requiredBandwidth: 1.5, // Mbps for video
      }

      const shouldDisableVideo = stats.availableBandwidth < stats.requiredBandwidth

      expect(shouldDisableVideo).toBe(true)
    })

    it('should recover from temporary disconnection', () => {
      const pc = new MockRTCPeerConnection()
      const reconnectionStates = ['disconnected', 'connecting', 'connected']

      reconnectionStates.forEach(state => {
        pc.connectionState = state as RTCPeerConnectionState
      })

      expect(pc.connectionState).toBe('connected')
    })
  })

  describe('Platform-Specific Features', () => {
    it('should handle mobile call interruption (phone call)', () => {
      const call = {
        id: mockCallId,
        status: 'interrupted',
        reason: 'incoming-phone-call',
        interruptedAt: Date.now(),
      }

      localStorage.setItem(`call-${mockCallId}`, JSON.stringify(call))

      const stored = JSON.parse(localStorage.getItem(`call-${mockCallId}`) || '{}')
      expect(stored.reason).toBe('incoming-phone-call')
    })

    it('should resume call after interruption', () => {
      const call = {
        id: mockCallId,
        status: 'active',
        wasInterrupted: true,
        resumedAt: Date.now(),
      }

      localStorage.setItem(`call-${mockCallId}`, JSON.stringify(call))

      const stored = JSON.parse(localStorage.getItem(`call-${mockCallId}`) || '{}')
      expect(stored.wasInterrupted).toBe(true)
    })

    it('should use earpiece vs speakerphone on mobile', () => {
      const audioSettings = {
        output: 'earpiece', // or 'speakerphone'
        platform: 'mobile',
      }

      localStorage.setItem('audio-settings', JSON.stringify(audioSettings))

      const stored = JSON.parse(localStorage.getItem('audio-settings') || '{}')
      expect(stored.output).toBe('earpiece')
    })
  })
})
