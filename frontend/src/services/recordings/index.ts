/**
 * Recording Services Module
 *
 * Comprehensive recording pipeline for call recordings:
 * - Recording capture and storage with encryption
 * - Retention policy management
 * - Playback ACLs and sharing
 * - Redaction functionality
 * - Processing pipeline
 *
 * @module services/recordings
 */

// Types
export * from "./types";

// Recording Pipeline Service
export {
  RecordingPipelineService,
  getRecordingPipeline,
  createRecordingPipeline,
} from "./recording-pipeline.service";

// Retention Policy Service
export {
  RetentionPolicyService,
  getRetentionPolicyService,
  createRetentionPolicyService,
} from "./retention-policy.service";

// Playback ACL Service
export {
  PlaybackACLService,
  getPlaybackACLService,
  createPlaybackACLService,
} from "./playback-acl.service";

// Redaction Service
export {
  RedactionService,
  getRedactionService,
  createRedactionService,
} from "./redaction.service";
