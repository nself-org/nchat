/**
 * @fileoverview Tests for WebRTC Peer Connection Manager
 */

import {
  PeerConnectionManager,
  createPeerConnection,
  DEFAULT_ICE_SERVERS,
  DEFAULT_CONFIG,
  type PeerConnectionCallbacks,
  type PeerConnectionConfig,
} from "../peer-connection";

// =============================================================================
// Mocks
// =============================================================================

const createMockMediaStreamTrack = (
  kind: "audio" | "video" = "audio",
): MediaStreamTrack => {
  const track = {
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    kind,
    enabled: true,
    muted: false,
    readyState: "live" as MediaStreamTrackState,
    label: `Mock ${kind} track`,
    onended: null as (() => void) | null,
    stop: jest.fn(),
    clone: jest.fn(),
    getSettings: jest.fn(() => ({})),
    getCapabilities: jest.fn(() => ({})),
    getConstraints: jest.fn(() => ({})),
    applyConstraints: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true),
  };
  return track as unknown as MediaStreamTrack;
};

const createMockMediaStream = (
  tracks: MediaStreamTrack[] = [],
): MediaStream => {
  return {
    id: `stream-${Date.now()}`,
    active: true,
    getTracks: jest.fn(() => tracks),
    getAudioTracks: jest.fn(() => tracks.filter((t) => t.kind === "audio")),
    getVideoTracks: jest.fn(() => tracks.filter((t) => t.kind === "video")),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    clone: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true),
    onaddtrack: null,
    onremovetrack: null,
  } as unknown as MediaStream;
};

const createMockRTCRtpSender = (): RTCRtpSender =>
  ({
    track: null,
    transport: null,
    dtmf: null,
    replaceTrack: jest.fn().mockResolvedValue(undefined),
    getParameters: jest.fn(() => ({
      transactionId: "",
      codecs: [],
      headerExtensions: [],
      rtcp: { cname: "", reducedSize: false },
      encodings: [],
    })),
    setParameters: jest.fn().mockResolvedValue(undefined),
    getStats: jest.fn().mockResolvedValue(new Map()),
    setStreams: jest.fn(),
    transform: null,
  }) as unknown as RTCRtpSender;

const createMockPeerConnection = () => {
  const mockSender = createMockRTCRtpSender();

  const pc = {
    connectionState: "new" as RTCPeerConnectionState,
    iceConnectionState: "new" as RTCIceConnectionState,
    iceGatheringState: "new" as RTCIceGatheringState,
    signalingState: "stable" as RTCSignalingState,
    localDescription: null as RTCSessionDescription | null,
    remoteDescription: null as RTCSessionDescription | null,
    currentLocalDescription: null as RTCSessionDescription | null,
    currentRemoteDescription: null as RTCSessionDescription | null,
    pendingLocalDescription: null as RTCSessionDescription | null,
    pendingRemoteDescription: null as RTCSessionDescription | null,
    sctp: null,
    canTrickleIceCandidates: null,

    onicecandidate: null as ((event: RTCPeerConnectionIceEvent) => void) | null,
    onicecandidateerror: null as ((event: Event) => void) | null,
    oniceconnectionstatechange: null as (() => void) | null,
    onconnectionstatechange: null as (() => void) | null,
    ontrack: null as ((event: RTCTrackEvent) => void) | null,
    onnegotiationneeded: null as (() => void) | null,
    ondatachannel: null as ((event: RTCDataChannelEvent) => void) | null,
    onsignalingstatechange: null as (() => void) | null,
    onicegatheringstatechange: null as (() => void) | null,

    createOffer: jest.fn().mockResolvedValue({
      type: "offer",
      sdp: "mock-offer-sdp",
    }),
    createAnswer: jest.fn().mockResolvedValue({
      type: "answer",
      sdp: "mock-answer-sdp",
    }),
    setLocalDescription: jest.fn().mockImplementation(function (
      this: typeof pc,
      desc?: RTCSessionDescriptionInit,
    ) {
      this.localDescription = desc ? new RTCSessionDescription(desc) : null;
      return Promise.resolve();
    }),
    setRemoteDescription: jest.fn().mockImplementation(function (
      this: typeof pc,
      desc: RTCSessionDescriptionInit,
    ) {
      this.remoteDescription = new RTCSessionDescription(desc);
      return Promise.resolve();
    }),
    addIceCandidate: jest.fn().mockResolvedValue(undefined),
    addTrack: jest.fn(() => mockSender),
    removeTrack: jest.fn(),
    close: jest.fn().mockImplementation(function (this: typeof pc) {
      this.connectionState = "closed";
      this.iceConnectionState = "closed";
    }),
    getStats: jest.fn().mockResolvedValue(new Map()),
    createDataChannel: jest.fn().mockReturnValue({
      label: "test",
      readyState: "open",
      send: jest.fn(),
      close: jest.fn(),
    }),
    restartIce: jest.fn(),
    getSenders: jest.fn(() => [mockSender]),
    getReceivers: jest.fn(() => []),
    getTransceivers: jest.fn(() => []),
    addTransceiver: jest.fn(),
    getConfiguration: jest.fn(() => ({})),
    setConfiguration: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true),
  };

  return pc;
};

// Mock RTCPeerConnection globally
let mockPeerConnection: ReturnType<typeof createMockPeerConnection>;

beforeEach(() => {
  mockPeerConnection = createMockPeerConnection();
  global.RTCPeerConnection = jest.fn(
    () => mockPeerConnection,
  ) as unknown as typeof RTCPeerConnection;
  global.RTCSessionDescription = jest.fn(
    (init) => init,
  ) as unknown as typeof RTCSessionDescription;
  global.RTCIceCandidate = jest.fn(
    (init) => init,
  ) as unknown as typeof RTCIceCandidate;
});

afterEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Tests
// =============================================================================

describe("PeerConnectionManager", () => {
  describe("Constructor and Configuration", () => {
    it("should create with default config", () => {
      const manager = new PeerConnectionManager();
      expect(manager.connectionState).toBe("new");
      expect(manager.isClosed).toBe(true);
    });

    it("should create with custom config", () => {
      const customConfig: PeerConnectionConfig = {
        iceServers: [{ urls: "stun:custom.stun.server:19302" }],
        iceTransportPolicy: "relay",
      };
      const manager = new PeerConnectionManager(customConfig);
      manager.create();
      expect(RTCPeerConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          iceServers: customConfig.iceServers,
          iceTransportPolicy: "relay",
        }),
      );
    });

    it("should create with callbacks", () => {
      const callbacks: PeerConnectionCallbacks = {
        onIceCandidate: jest.fn(),
        onConnectionStateChange: jest.fn(),
      };
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, callbacks);
      expect(manager).toBeDefined();
    });
  });

  describe("DEFAULT_ICE_SERVERS", () => {
    it("should contain Google STUN servers", () => {
      expect(DEFAULT_ICE_SERVERS).toHaveLength(3);
      expect(DEFAULT_ICE_SERVERS[0].urls).toBe("stun:stun.l.google.com:19302");
    });
  });

  describe("DEFAULT_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_CONFIG.iceServers).toEqual(DEFAULT_ICE_SERVERS);
      expect(DEFAULT_CONFIG.iceTransportPolicy).toBe("all");
      expect(DEFAULT_CONFIG.bundlePolicy).toBe("max-bundle");
      expect(DEFAULT_CONFIG.rtcpMuxPolicy).toBe("require");
    });
  });

  describe("create()", () => {
    it("should create a new RTCPeerConnection", () => {
      const manager = new PeerConnectionManager();
      const pc = manager.create();
      expect(RTCPeerConnection).toHaveBeenCalled();
      expect(pc).toBeDefined();
    });

    it("should close existing connection before creating new one", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      manager.create();
      expect(mockPeerConnection.close).toHaveBeenCalled();
    });

    it("should setup event handlers", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      expect(mockPeerConnection.onicecandidate).toBeDefined();
      expect(mockPeerConnection.ontrack).toBeDefined();
      expect(mockPeerConnection.onconnectionstatechange).toBeDefined();
    });

    it("should reset state after creation", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      expect(manager.connectionState).toBe("new");
      expect(manager.iceConnectionState).toBe("new");
      expect(manager.signalingState).toBe("stable");
    });
  });

  describe("Getters", () => {
    let manager: PeerConnectionManager;

    beforeEach(() => {
      manager = new PeerConnectionManager();
      manager.create();
    });

    it("should return connectionState", () => {
      expect(manager.connectionState).toBe("new");
    });

    it("should return iceConnectionState", () => {
      expect(manager.iceConnectionState).toBe("new");
    });

    it("should return signalingState", () => {
      expect(manager.signalingState).toBe("stable");
    });

    it("should return isConnected as false for new connection", () => {
      expect(manager.isConnected).toBe(false);
    });

    it("should return isClosed as false for active connection", () => {
      expect(manager.isClosed).toBe(false);
    });

    it("should return peerConnection", () => {
      expect(manager.peerConnection).toBeDefined();
    });

    it("should return empty localTrackList initially", () => {
      expect(manager.localTrackList).toEqual([]);
    });

    it("should return empty remoteTrackList initially", () => {
      expect(manager.remoteTrackList).toEqual([]);
    });
  });

  describe("close()", () => {
    it("should close the peer connection", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      manager.close();
      expect(mockPeerConnection.close).toHaveBeenCalled();
    });

    it("should clear local tracks", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const track = createMockMediaStreamTrack();
      const stream = createMockMediaStream([track]);
      manager.addTrack(track, stream);
      manager.close();
      expect(manager.localTrackList).toHaveLength(0);
    });

    it("should update connection state to closed", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      manager.close();
      expect(manager.connectionState).toBe("closed");
      expect(manager.isClosed).toBe(true);
    });

    it("should handle closing already closed connection", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      manager.close();
      manager.close(); // Should not throw
    });

    it("should stop all local tracks", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const track = createMockMediaStreamTrack();
      const stream = createMockMediaStream([track]);
      manager.addTrack(track, stream);
      manager.close();
      expect(track.stop).toHaveBeenCalled();
    });
  });

  describe("createOffer()", () => {
    it("should create and set local description", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const offer = await manager.createOffer();
      expect(mockPeerConnection.createOffer).toHaveBeenCalled();
      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(
        offer,
      );
      expect(offer.type).toBe("offer");
    });

    it("should throw if connection not created", async () => {
      const manager = new PeerConnectionManager();
      await expect(manager.createOffer()).rejects.toThrow(
        "PeerConnection not created",
      );
    });

    it("should pass options to createOffer", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const options: RTCOfferOptions = { offerToReceiveAudio: true };
      await manager.createOffer(options);
      expect(mockPeerConnection.createOffer).toHaveBeenCalledWith(options);
    });
  });

  describe("createAnswer()", () => {
    it("should create and set local description", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const answer = await manager.createAnswer();
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(
        answer,
      );
      expect(answer.type).toBe("answer");
    });

    it("should throw if connection not created", async () => {
      const manager = new PeerConnectionManager();
      await expect(manager.createAnswer()).rejects.toThrow(
        "PeerConnection not created",
      );
    });

    it("should pass options to createAnswer", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const options: RTCAnswerOptions = {};
      await manager.createAnswer(options);
      expect(mockPeerConnection.createAnswer).toHaveBeenCalledWith(options);
    });
  });

  describe("setRemoteDescription()", () => {
    it("should set remote description", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const description = { type: "offer" as RTCSdpType, sdp: "test-sdp" };
      await manager.setRemoteDescription(description);
      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalled();
    });

    it("should throw if connection not created", async () => {
      const manager = new PeerConnectionManager();
      const description = { type: "offer" as RTCSdpType, sdp: "test-sdp" };
      await expect(manager.setRemoteDescription(description)).rejects.toThrow(
        "PeerConnection not created",
      );
    });

    it("should process pending ICE candidates after setting remote description", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const candidate = { candidate: "test", sdpMid: "0", sdpMLineIndex: 0 };

      // Add candidate before remote description
      await manager.addIceCandidate(candidate);
      expect(mockPeerConnection.addIceCandidate).not.toHaveBeenCalled();

      // Set remote description
      const description = { type: "offer" as RTCSdpType, sdp: "test-sdp" };
      await manager.setRemoteDescription(description);

      // Candidate should be processed
      expect(mockPeerConnection.addIceCandidate).toHaveBeenCalled();
    });
  });

  describe("addIceCandidate()", () => {
    it("should add ICE candidate when remote description is set", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      await manager.setRemoteDescription({ type: "offer", sdp: "test" });
      const candidate = { candidate: "test", sdpMid: "0", sdpMLineIndex: 0 };
      await manager.addIceCandidate(candidate);
      expect(mockPeerConnection.addIceCandidate).toHaveBeenCalled();
    });

    it("should queue ICE candidate when remote description not set", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const candidate = { candidate: "test", sdpMid: "0", sdpMLineIndex: 0 };
      await manager.addIceCandidate(candidate);
      expect(mockPeerConnection.addIceCandidate).not.toHaveBeenCalled();
    });

    it("should throw if connection not created", async () => {
      const manager = new PeerConnectionManager();
      const candidate = { candidate: "test", sdpMid: "0", sdpMLineIndex: 0 };
      await expect(manager.addIceCandidate(candidate)).rejects.toThrow(
        "PeerConnection not created",
      );
    });
  });

  describe("Track Management", () => {
    let manager: PeerConnectionManager;
    let track: MediaStreamTrack;
    let stream: MediaStream;

    beforeEach(() => {
      manager = new PeerConnectionManager();
      manager.create();
      track = createMockMediaStreamTrack("audio");
      stream = createMockMediaStream([track]);
    });

    describe("addTrack()", () => {
      it("should add track to peer connection", () => {
        const sender = manager.addTrack(track, stream);
        expect(mockPeerConnection.addTrack).toHaveBeenCalledWith(track, stream);
        expect(sender).toBeDefined();
      });

      it("should store track info", () => {
        manager.addTrack(track, stream);
        expect(manager.localTrackList).toHaveLength(1);
        expect(manager.localTrackList[0].track).toBe(track);
      });

      it("should throw if connection not created", () => {
        const newManager = new PeerConnectionManager();
        expect(() => newManager.addTrack(track, stream)).toThrow(
          "PeerConnection not created",
        );
      });
    });

    describe("removeTrack()", () => {
      it("should remove track from peer connection", () => {
        manager.addTrack(track, stream);
        const result = manager.removeTrack(track.id);
        expect(result).toBe(true);
        expect(mockPeerConnection.removeTrack).toHaveBeenCalled();
      });

      it("should return false for non-existent track", () => {
        const result = manager.removeTrack("non-existent");
        expect(result).toBe(false);
      });

      it("should stop the track", () => {
        manager.addTrack(track, stream);
        manager.removeTrack(track.id);
        expect(track.stop).toHaveBeenCalled();
      });

      it("should return false if connection not created", () => {
        const newManager = new PeerConnectionManager();
        const result = newManager.removeTrack("any-id");
        expect(result).toBe(false);
      });
    });

    describe("replaceTrack()", () => {
      it("should replace existing track", () => {
        manager.addTrack(track, stream);
        const newTrack = createMockMediaStreamTrack("audio");
        const result = manager.replaceTrack(track.id, newTrack);
        expect(result).toBe(true);
      });

      it("should stop old track", () => {
        manager.addTrack(track, stream);
        const newTrack = createMockMediaStreamTrack("audio");
        manager.replaceTrack(track.id, newTrack);
        expect(track.stop).toHaveBeenCalled();
      });

      it("should return false for non-existent track", () => {
        const newTrack = createMockMediaStreamTrack("audio");
        const result = manager.replaceTrack("non-existent", newTrack);
        expect(result).toBe(false);
      });

      it("should return false if connection not created", () => {
        const newManager = new PeerConnectionManager();
        const newTrack = createMockMediaStreamTrack("audio");
        const result = newManager.replaceTrack("any-id", newTrack);
        expect(result).toBe(false);
      });
    });

    describe("getLocalTrack()", () => {
      it("should return track info", () => {
        manager.addTrack(track, stream);
        const info = manager.getLocalTrack(track.id);
        expect(info?.track).toBe(track);
      });

      it("should return undefined for non-existent track", () => {
        const info = manager.getLocalTrack("non-existent");
        expect(info).toBeUndefined();
      });
    });

    describe("getRemoteTrack()", () => {
      it("should return undefined for non-existent track", () => {
        const info = manager.getRemoteTrack("non-existent");
        expect(info).toBeUndefined();
      });
    });

    describe("getLocalAudioTracks()", () => {
      it("should return only audio tracks", () => {
        const audioTrack = createMockMediaStreamTrack("audio");
        const videoTrack = createMockMediaStreamTrack("video");
        manager.addTrack(audioTrack, stream);
        manager.addTrack(videoTrack, stream);
        const audioTracks = manager.getLocalAudioTracks();
        expect(audioTracks).toHaveLength(1);
        expect(audioTracks[0].track.kind).toBe("audio");
      });
    });

    describe("getLocalVideoTracks()", () => {
      it("should return only video tracks", () => {
        const audioTrack = createMockMediaStreamTrack("audio");
        const videoTrack = createMockMediaStreamTrack("video");
        manager.addTrack(audioTrack, stream);
        manager.addTrack(videoTrack, stream);
        const videoTracks = manager.getLocalVideoTracks();
        expect(videoTracks).toHaveLength(1);
        expect(videoTracks[0].track.kind).toBe("video");
      });
    });

    describe("getRemoteAudioTracks()", () => {
      it("should return empty array when no remote tracks", () => {
        const tracks = manager.getRemoteAudioTracks();
        expect(tracks).toHaveLength(0);
      });
    });

    describe("getRemoteVideoTracks()", () => {
      it("should return empty array when no remote tracks", () => {
        const tracks = manager.getRemoteVideoTracks();
        expect(tracks).toHaveLength(0);
      });
    });
  });

  describe("Track Enable/Disable", () => {
    let manager: PeerConnectionManager;

    beforeEach(() => {
      manager = new PeerConnectionManager();
      manager.create();
    });

    describe("enableLocalAudio()", () => {
      it("should enable/disable audio tracks", () => {
        const track = createMockMediaStreamTrack("audio");
        const stream = createMockMediaStream([track]);
        manager.addTrack(track, stream);

        manager.enableLocalAudio(false);
        expect(track.enabled).toBe(false);

        manager.enableLocalAudio(true);
        expect(track.enabled).toBe(true);
      });
    });

    describe("enableLocalVideo()", () => {
      it("should enable/disable video tracks", () => {
        const track = createMockMediaStreamTrack("video");
        const stream = createMockMediaStream([track]);
        manager.addTrack(track, stream);

        manager.enableLocalVideo(false);
        expect(track.enabled).toBe(false);

        manager.enableLocalVideo(true);
        expect(track.enabled).toBe(true);
      });
    });
  });

  describe("Statistics", () => {
    let manager: PeerConnectionManager;

    beforeEach(() => {
      manager = new PeerConnectionManager();
      manager.create();
    });

    describe("getStats()", () => {
      it("should return stats from peer connection", async () => {
        const stats = await manager.getStats();
        expect(mockPeerConnection.getStats).toHaveBeenCalled();
        expect(stats).toBeDefined();
      });

      it("should return null if connection not created", async () => {
        const newManager = new PeerConnectionManager();
        const stats = await newManager.getStats();
        expect(stats).toBeNull();
      });
    });

    describe("getConnectionStats()", () => {
      it("should return null if connection not created", async () => {
        const newManager = new PeerConnectionManager();
        const stats = await newManager.getConnectionStats();
        expect(stats).toBeNull();
      });

      it("should aggregate stats from reports", async () => {
        const mockStats = new Map([
          [
            "inbound-1",
            { type: "inbound-rtp", bytesReceived: 1000, packetsLost: 5 },
          ],
          ["outbound-1", { type: "outbound-rtp", bytesSent: 2000 }],
          [
            "pair-1",
            {
              type: "candidate-pair",
              state: "succeeded",
              currentRoundTripTime: 0.05,
            },
          ],
        ]);
        mockPeerConnection.getStats.mockResolvedValue(mockStats);

        const stats = await manager.getConnectionStats();
        expect(stats).toEqual({
          bytesReceived: 1000,
          bytesSent: 2000,
          packetsLost: 5,
          roundTripTime: 0.05,
        });
      });
    });
  });

  describe("Data Channel", () => {
    it("should create data channel", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const channel = manager.createDataChannel("test");
      expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith(
        "test",
        undefined,
      );
      expect(channel).toBeDefined();
    });

    it("should pass options to createDataChannel", () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const options: RTCDataChannelInit = { ordered: true };
      manager.createDataChannel("test", options);
      expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith(
        "test",
        options,
      );
    });

    it("should throw if connection not created", () => {
      const manager = new PeerConnectionManager();
      expect(() => manager.createDataChannel("test")).toThrow(
        "PeerConnection not created",
      );
    });
  });

  describe("updateCallbacks()", () => {
    it("should update callbacks", () => {
      const manager = new PeerConnectionManager();
      const newCallback = jest.fn();
      manager.updateCallbacks({ onConnectionStateChange: newCallback });
      manager.create();

      // Simulate connection state change
      mockPeerConnection.connectionState = "connected";
      mockPeerConnection.onconnectionstatechange?.();

      expect(newCallback).toHaveBeenCalledWith("connected");
    });

    it("should merge with existing callbacks", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onConnectionStateChange: callback1,
      });
      manager.updateCallbacks({ onIceCandidate: callback2 });
      manager.create();

      // Verify both callbacks work
      mockPeerConnection.connectionState = "connected";
      mockPeerConnection.onconnectionstatechange?.();
      expect(callback1).toHaveBeenCalled();
    });
  });

  describe("restartIce()", () => {
    it("should restart ICE and create new offer", async () => {
      const manager = new PeerConnectionManager();
      manager.create();
      const offer = await manager.restartIce();
      expect(mockPeerConnection.restartIce).toHaveBeenCalled();
      expect(mockPeerConnection.createOffer).toHaveBeenCalledWith({
        iceRestart: true,
      });
      expect(offer).toBeDefined();
    });

    it("should return null if connection not created", async () => {
      const manager = new PeerConnectionManager();
      const offer = await manager.restartIce();
      expect(offer).toBeNull();
    });
  });

  describe("Event Handlers", () => {
    it("should call onIceCandidate when ICE candidate is generated", () => {
      const onIceCandidate = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onIceCandidate,
      });
      manager.create();

      const candidate = { candidate: "test", sdpMid: "0", sdpMLineIndex: 0 };
      mockPeerConnection.onicecandidate?.({
        candidate,
      } as RTCPeerConnectionIceEvent);

      expect(onIceCandidate).toHaveBeenCalledWith(candidate);
    });

    it("should not call onIceCandidate when candidate is null", () => {
      const onIceCandidate = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onIceCandidate,
      });
      manager.create();

      mockPeerConnection.onicecandidate?.({
        candidate: null,
      } as RTCPeerConnectionIceEvent);

      expect(onIceCandidate).not.toHaveBeenCalled();
    });

    it("should call onIceCandidateError when error occurs", () => {
      const onIceCandidateError = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onIceCandidateError,
      });
      manager.create();

      const event = { errorCode: 701, errorText: "Test error" };
      mockPeerConnection.onicecandidateerror?.(event as unknown as Event);

      expect(onIceCandidateError).toHaveBeenCalled();
    });

    it("should call onIceConnectionStateChange when state changes", () => {
      const onIceConnectionStateChange = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onIceConnectionStateChange,
      });
      manager.create();

      mockPeerConnection.iceConnectionState = "checking";
      mockPeerConnection.oniceconnectionstatechange?.();

      expect(onIceConnectionStateChange).toHaveBeenCalledWith("checking");
    });

    it("should call onConnectionStateChange when state changes", () => {
      const onConnectionStateChange = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onConnectionStateChange,
      });
      manager.create();

      mockPeerConnection.connectionState = "connected";
      mockPeerConnection.onconnectionstatechange?.();

      expect(onConnectionStateChange).toHaveBeenCalledWith("connected");
    });

    it("should call onTrack when remote track is received", () => {
      const onTrack = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, { onTrack });
      manager.create();

      const track = createMockMediaStreamTrack("audio");
      const stream = createMockMediaStream([track]);
      const event = { track, streams: [stream] } as unknown as RTCTrackEvent;
      mockPeerConnection.ontrack?.(event);

      expect(onTrack).toHaveBeenCalledWith(event);
    });

    it("should store remote track when received", () => {
      const manager = new PeerConnectionManager();
      manager.create();

      const track = createMockMediaStreamTrack("audio");
      const stream = createMockMediaStream([track]);
      const event = { track, streams: [stream] } as unknown as RTCTrackEvent;
      mockPeerConnection.ontrack?.(event);

      expect(manager.remoteTrackList).toHaveLength(1);
    });

    it("should create stream if not provided with track", () => {
      const manager = new PeerConnectionManager();
      manager.create();

      const track = createMockMediaStreamTrack("audio");
      const event = { track, streams: [] } as unknown as RTCTrackEvent;
      mockPeerConnection.ontrack?.(event);

      expect(manager.remoteTrackList).toHaveLength(1);
    });

    it("should call onNegotiationNeeded when needed", () => {
      const onNegotiationNeeded = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onNegotiationNeeded,
      });
      manager.create();

      mockPeerConnection.onnegotiationneeded?.();

      expect(onNegotiationNeeded).toHaveBeenCalled();
    });

    it("should call onDataChannel when channel is created", () => {
      const onDataChannel = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onDataChannel,
      });
      manager.create();

      const event = { channel: { label: "test" } } as RTCDataChannelEvent;
      mockPeerConnection.ondatachannel?.(event);

      expect(onDataChannel).toHaveBeenCalledWith(event);
    });

    it("should call onSignalingStateChange when state changes", () => {
      const onSignalingStateChange = jest.fn();
      const manager = new PeerConnectionManager(DEFAULT_CONFIG, {
        onSignalingStateChange,
      });
      manager.create();

      mockPeerConnection.signalingState = "have-local-offer";
      mockPeerConnection.onsignalingstatechange?.();

      expect(onSignalingStateChange).toHaveBeenCalledWith("have-local-offer");
    });
  });
});

describe("createPeerConnection()", () => {
  it("should create a PeerConnectionManager instance", () => {
    const manager = createPeerConnection();
    expect(manager).toBeInstanceOf(PeerConnectionManager);
  });

  it("should pass config and callbacks to constructor", () => {
    const config: PeerConnectionConfig = {
      iceServers: [{ urls: "stun:test.server" }],
    };
    const callbacks: PeerConnectionCallbacks = {
      onConnectionStateChange: jest.fn(),
    };
    const manager = createPeerConnection(config, callbacks);
    manager.create();

    expect(RTCPeerConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        iceServers: config.iceServers,
      }),
    );
  });
});
