/**
 * Live Streaming Library
 *
 * Comprehensive live streaming system with WebRTC ingest, HLS distribution,
 * adaptive bitrate streaming, and interactive features.
 *
 * @module lib/streaming
 */

// Types
export * from "./stream-types";

// HLS Player
export {
  HLSPlayerManager,
  createHLSPlayer,
  type HLSPlayerConfig,
  type HLSPlayerError,
} from "./hls-player";

// Stream Client (Broadcaster)
export {
  StreamClient,
  createStreamClient,
  type StreamClientConfig,
  type StreamClientError,
  type MediaConstraints,
} from "./stream-client";

// Stream Manager
export {
  StreamManager,
  createStreamManager,
  getStreamManager,
  type StreamManagerConfig,
} from "./stream-manager";

// Analytics
export {
  StreamAnalyticsCollector,
  analyticsManager,
  getStreamAnalytics,
  createStreamAnalytics,
  type AnalyticsEvent,
  type BufferingEvent,
} from "./stream-analytics";

// Adaptive Bitrate
export {
  AdaptiveBitrateManager,
  createAdaptiveBitrateManager,
  type ABRConfig,
  type NetworkConditions,
  type BufferState,
} from "./adaptive-bitrate";
