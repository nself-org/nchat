/**
 * Media Manager
 *
 * Manages media streams for WebRTC voice and video calls.
 * Provides getUserMedia wrapper, screen sharing, device enumeration,
 * and track management.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type MediaDeviceKind = "audioinput" | "audiooutput" | "videoinput";

export interface MediaDevice {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

export interface AudioConstraints {
  deviceId?: string | { exact: string };
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
}

export interface VideoConstraints {
  deviceId?: string | { exact: string };
  width?: number | { min?: number; ideal?: number; max?: number };
  height?: number | { min?: number; ideal?: number; max?: number };
  frameRate?: number | { min?: number; ideal?: number; max?: number };
  facingMode?: "user" | "environment" | { exact: "user" | "environment" };
  aspectRatio?: number;
}

export interface ScreenShareOptions {
  video?:
    | boolean
    | {
        cursor?: "always" | "motion" | "never";
        displaySurface?: "browser" | "monitor" | "window";
        width?: number | { max: number };
        height?: number | { max: number };
        frameRate?: number | { max: number };
      };
  audio?:
    | boolean
    | {
        echoCancellation?: boolean;
        noiseSuppression?: boolean;
        autoGainControl?: boolean;
      };
  selfBrowserSurface?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  systemAudio?: "include" | "exclude";
}

export interface MediaManagerCallbacks {
  onDeviceChange?: (devices: MediaDevice[]) => void;
  onTrackEnded?: (track: MediaStreamTrack) => void;
  onStreamError?: (error: Error) => void;
}

export interface MediaPermissions {
  audio: boolean;
  video: boolean;
}

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_AUDIO_CONSTRAINTS: AudioConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export const DEFAULT_VIDEO_CONSTRAINTS: VideoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30 },
  facingMode: "user",
};

export const HD_VIDEO_CONSTRAINTS: VideoConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30 },
  facingMode: "user",
};

export const LOW_BANDWIDTH_VIDEO_CONSTRAINTS: VideoConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 15 },
  facingMode: "user",
};

export const DEFAULT_SCREEN_SHARE_OPTIONS: ScreenShareOptions = {
  video: {
    cursor: "always",
    displaySurface: "monitor",
  },
  audio: false,
};

// =============================================================================
// Media Manager Class
// =============================================================================

export class MediaManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private devices: MediaDevice[] = [];
  private callbacks: MediaManagerCallbacks;
  private _audioEnabled: boolean = true;
  private _videoEnabled: boolean = true;
  private boundHandleDeviceChange: () => void;

  constructor(callbacks: MediaManagerCallbacks = {}) {
    this.callbacks = callbacks;
    this.boundHandleDeviceChange = this.handleDeviceChange.bind(this);
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get stream(): MediaStream | null {
    return this.localStream;
  }

  get screenShareStream(): MediaStream | null {
    return this.screenStream;
  }

  get audioEnabled(): boolean {
    return this._audioEnabled;
  }

  get videoEnabled(): boolean {
    return this._videoEnabled;
  }

  get audioTracks(): MediaStreamTrack[] {
    return this.localStream?.getAudioTracks() ?? [];
  }

  get videoTracks(): MediaStreamTrack[] {
    return this.localStream?.getVideoTracks() ?? [];
  }

  get screenVideoTracks(): MediaStreamTrack[] {
    return this.screenStream?.getVideoTracks() ?? [];
  }

  get screenAudioTracks(): MediaStreamTrack[] {
    return this.screenStream?.getAudioTracks() ?? [];
  }

  get hasAudio(): boolean {
    return this.audioTracks.length > 0;
  }

  get hasVideo(): boolean {
    return this.videoTracks.length > 0;
  }

  get isScreenSharing(): boolean {
    return this.screenStream !== null && this.screenStream.active;
  }

  get deviceList(): MediaDevice[] {
    return [...this.devices];
  }

  // ===========================================================================
  // Device Enumeration
  // ===========================================================================

  async enumerateDevices(): Promise<MediaDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.devices = devices.map((device) => ({
        deviceId: device.deviceId,
        kind: device.kind as MediaDeviceKind,
        label:
          device.label || `${device.kind} (${device.deviceId.slice(0, 8)}...)`,
        groupId: device.groupId,
      }));
      return this.devices;
    } catch (error) {
      logger.error("Failed to enumerate devices:", error);
      this.devices = [];
      return [];
    }
  }

  getAudioInputDevices(): MediaDevice[] {
    return this.devices.filter((d) => d.kind === "audioinput");
  }

  getAudioOutputDevices(): MediaDevice[] {
    return this.devices.filter((d) => d.kind === "audiooutput");
  }

  getVideoInputDevices(): MediaDevice[] {
    return this.devices.filter((d) => d.kind === "videoinput");
  }

  // ===========================================================================
  // Device Change Handling
  // ===========================================================================

  startDeviceChangeListener(): void {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener(
        "devicechange",
        this.boundHandleDeviceChange,
      );
    }
  }

  stopDeviceChangeListener(): void {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        this.boundHandleDeviceChange,
      );
    }
  }

  private async handleDeviceChange(): Promise<void> {
    await this.enumerateDevices();
    this.callbacks.onDeviceChange?.(this.devices);
  }

  // ===========================================================================
  // Media Stream Management
  // ===========================================================================

  async getUserMedia(
    audio: boolean | AudioConstraints = true,
    video: boolean | VideoConstraints = false,
  ): Promise<MediaStream> {
    this.stopLocalStream();

    const constraints: MediaStreamConstraints = {};

    if (audio === true) {
      constraints.audio = DEFAULT_AUDIO_CONSTRAINTS;
    } else if (audio !== false) {
      constraints.audio = audio;
    } else {
      constraints.audio = false;
    }

    if (video === true) {
      constraints.video = DEFAULT_VIDEO_CONSTRAINTS;
    } else if (video !== false) {
      constraints.video = video;
    } else {
      constraints.video = false;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.setupTrackEndedHandlers(this.localStream);

      this._audioEnabled = true;
      this._videoEnabled = true;

      // Refresh device list after getting permissions
      await this.enumerateDevices();

      return this.localStream;
    } catch (error) {
      const mediaError =
        error instanceof Error ? error : new Error("Failed to get user media");
      this.callbacks.onStreamError?.(mediaError);
      throw mediaError;
    }
  }

  async getAudioOnlyStream(
    constraints?: AudioConstraints,
  ): Promise<MediaStream> {
    return this.getUserMedia(constraints ?? DEFAULT_AUDIO_CONSTRAINTS, false);
  }

  async getVideoStream(
    audioConstraints?: AudioConstraints,
    videoConstraints?: VideoConstraints,
  ): Promise<MediaStream> {
    return this.getUserMedia(
      audioConstraints ?? DEFAULT_AUDIO_CONSTRAINTS,
      videoConstraints ?? DEFAULT_VIDEO_CONSTRAINTS,
    );
  }

  // ===========================================================================
  // Screen Sharing
  // ===========================================================================

  async getDisplayMedia(
    options: ScreenShareOptions = DEFAULT_SCREEN_SHARE_OPTIONS,
  ): Promise<MediaStream> {
    this.stopScreenShare();

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(
        options as DisplayMediaStreamOptions,
      );
      this.setupTrackEndedHandlers(this.screenStream);

      return this.screenStream;
    } catch (error) {
      const mediaError =
        error instanceof Error
          ? error
          : new Error("Failed to get display media");
      this.callbacks.onStreamError?.(mediaError);
      throw mediaError;
    }
  }

  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.screenStream = null;
    }
  }

  // ===========================================================================
  // Track Management
  // ===========================================================================

  private setupTrackEndedHandlers(stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        this.callbacks.onTrackEnded?.(track);
      };
    });
  }

  enableAudio(enabled: boolean): void {
    this._audioEnabled = enabled;
    this.audioTracks.forEach((track) => {
      track.enabled = enabled;
    });
  }

  enableVideo(enabled: boolean): void {
    this._videoEnabled = enabled;
    this.videoTracks.forEach((track) => {
      track.enabled = enabled;
    });
  }

  toggleAudio(): boolean {
    this._audioEnabled = !this._audioEnabled;
    this.enableAudio(this._audioEnabled);
    return this._audioEnabled;
  }

  toggleVideo(): boolean {
    this._videoEnabled = !this._videoEnabled;
    this.enableVideo(this._videoEnabled);
    return this._videoEnabled;
  }

  // ===========================================================================
  // Device Selection
  // ===========================================================================

  async switchAudioDevice(deviceId: string): Promise<void> {
    if (!this.localStream) {
      throw new Error("No active stream. Call getUserMedia first.");
    }

    const hasVideo = this.hasVideo;
    const videoConstraints = hasVideo
      ? (this.videoTracks[0].getConstraints() as VideoConstraints)
      : false;

    await this.getUserMedia(
      { ...DEFAULT_AUDIO_CONSTRAINTS, deviceId: { exact: deviceId } },
      videoConstraints,
    );
  }

  async switchVideoDevice(deviceId: string): Promise<void> {
    if (!this.localStream) {
      throw new Error("No active stream. Call getUserMedia first.");
    }

    const hasAudio = this.hasAudio;
    const audioConstraints = hasAudio
      ? (this.audioTracks[0].getConstraints() as AudioConstraints)
      : false;

    await this.getUserMedia(audioConstraints, {
      ...DEFAULT_VIDEO_CONSTRAINTS,
      deviceId: { exact: deviceId },
    });
  }

  async setAudioOutput(
    deviceId: string,
    element: HTMLMediaElement,
  ): Promise<void> {
    if (!("setSinkId" in element)) {
      throw new Error(
        "Audio output selection is not supported in this browser",
      );
    }

    await (
      element as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }
    ).setSinkId(deviceId);
  }

  // ===========================================================================
  // Permission Checking
  // ===========================================================================

  async checkPermissions(): Promise<MediaPermissions> {
    const permissions: MediaPermissions = { audio: false, video: false };

    try {
      if ("permissions" in navigator) {
        const [micPermission, cameraPermission] = await Promise.all([
          navigator.permissions.query({ name: "microphone" as PermissionName }),
          navigator.permissions.query({ name: "camera" as PermissionName }),
        ]);
        permissions.audio = micPermission.state === "granted";
        permissions.video = cameraPermission.state === "granted";
      }
    } catch {
      // Fallback: try to enumerate devices
      await this.enumerateDevices();
      permissions.audio = this.getAudioInputDevices().some(
        (d) => d.label !== "",
      );
      permissions.video = this.getVideoInputDevices().some(
        (d) => d.label !== "",
      );
    }

    return permissions;
  }

  async requestPermissions(
    audio: boolean = true,
    video: boolean = false,
  ): Promise<MediaPermissions> {
    const permissions: MediaPermissions = { audio: false, video: false };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video,
      });
      stream.getTracks().forEach((track) => track.stop());
      permissions.audio = audio;
      permissions.video = video;
      await this.enumerateDevices();
    } catch (error) {
      // Permission denied or no devices
    }

    return permissions;
  }

  // ===========================================================================
  // Audio Level Detection
  // ===========================================================================

  createAudioAnalyzer(): {
    analyser: AnalyserNode;
    getLevel: () => number;
    cleanup: () => void;
  } | null {
    if (!this.localStream || this.audioTracks.length === 0) {
      return null;
    }

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(this.localStream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const getLevel = (): number => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        return sum / dataArray.length / 255; // Normalized 0-1
      };

      const cleanup = (): void => {
        source.disconnect();
        audioContext.close();
      };

      return { analyser, getLevel, cleanup };
    } catch (error) {
      logger.error("Failed to create audio analyzer:", error);
      return null;
    }
  }

  // ===========================================================================
  // Video Quality Control
  // ===========================================================================

  async applyVideoConstraints(constraints: VideoConstraints): Promise<void> {
    if (this.videoTracks.length === 0) {
      throw new Error("No video track available");
    }

    await this.videoTracks[0].applyConstraints(constraints);
  }

  getVideoSettings(): MediaTrackSettings | null {
    if (this.videoTracks.length === 0) {
      return null;
    }

    return this.videoTracks[0].getSettings();
  }

  getAudioSettings(): MediaTrackSettings | null {
    if (this.audioTracks.length === 0) {
      return null;
    }

    return this.audioTracks[0].getSettings();
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
    this._audioEnabled = true;
    this._videoEnabled = true;
  }

  stopAllStreams(): void {
    this.stopLocalStream();
    this.stopScreenShare();
  }

  cleanup(): void {
    this.stopAllStreams();
    this.stopDeviceChangeListener();
    this.devices = [];
  }

  // ===========================================================================
  // Callbacks Update
  // ===========================================================================

  updateCallbacks(callbacks: Partial<MediaManagerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createMediaManager(
  callbacks?: MediaManagerCallbacks,
): MediaManager {
  return new MediaManager(callbacks);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isMediaDevicesSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices
  );
}

export function isScreenSharingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getDisplayMedia" in navigator.mediaDevices
  );
}

export function isAudioOutputSelectionSupported(): boolean {
  return (
    typeof HTMLMediaElement !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype
  );
}
