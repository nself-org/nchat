/**
 * Recording Storage Service
 *
 * Handles storage and retrieval of call recordings from LiveKit egress:
 * - Moving completed recordings to permanent storage
 * - Generating signed download URLs
 * - Managing recording metadata and thumbnails
 * - Handling webhook callbacks from LiveKit
 */

import { nhost } from "@/lib/nhost.server";
import { getStorageConfig } from "@/services/files/config";
import { logger } from "@/lib/logger";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export interface RecordingFile {
  id: string;
  filename: string;
  size: number;
  duration: number;
  format: "mp4" | "webm";
  resolution: "720p" | "1080p" | "4k";
  thumbnailUrl?: string;
}

export interface RecordingEgressData {
  egressId: string;
  roomName: string;
  result: {
    file?: {
      filename: string;
      size: string; // in bytes as string from LiveKit
    };
  };
  status: string;
  createdAt: number;
}

export interface RecordingCompletionPayload {
  egressId: string;
  roomName: string;
  status: "EGRESS_COMPLETE" | "EGRESS_FAILED";
  result?: {
    file?: {
      filename: string;
    };
  };
  error?: string;
}

export class RecordingStorageService {
  private s3Client: S3Client;
  private storageConfig: ReturnType<typeof getStorageConfig>;

  constructor() {
    this.storageConfig = getStorageConfig();
    this.s3Client = new S3Client({
      endpoint: this.storageConfig.endpoint,
      region: this.storageConfig.region || "us-east-1",
      credentials: {
        accessKeyId: this.storageConfig.accessKey || "",
        secretAccessKey: this.storageConfig.secretKey || "",
      },
      forcePathStyle: this.storageConfig.provider === "minio",
    });
  }

  /**
   * Process completed recording from LiveKit egress webhook
   * Called when LiveKit finishes recording
   */
  async processCompletedRecording(
    payload: RecordingCompletionPayload,
  ): Promise<void> {
    try {
      // Find the recording by egress ID
      const { data, error } = await nhost.graphql.request(
        `
          query GetRecordingByEgressId($egressId: String!) {
            nchat_call_recordings(where: {livekit_egress_id: {_eq: $egressId}}) {
              id
              call_id
              channel_id
              recorded_by
              status
              resolution
              layout_type
              audio_only
              started_at
              call {
                id
              }
            }
          }
        `,
        { egressId: payload.egressId },
      );

      if (error || !data?.nchat_call_recordings?.[0]) {
        logger.warn("Recording not found for egress", {
          egressId: payload.egressId,
        });
        return;
      }

      const recording = data.nchat_call_recordings[0];

      // Handle success case
      if (payload.status === "EGRESS_COMPLETE" && payload.result?.file) {
        const filename = payload.result.file.filename;
        const fileUrl = `${process.env.NEXT_PUBLIC_STORAGE_URL || ""}/files/${filename}`;

        // Update recording with file info
        await nhost.graphql.request(
          `
            mutation UpdateRecordingComplete($id: uuid!, $fileUrl: String!, $status: String!) {
              update_nchat_call_recordings_by_pk(
                pk_columns: {id: $id}
                _set: {
                  status: $status
                  file_url: $fileUrl
                  file_path: $fileUrl
                  processed_at: "now()"
                }
              ) {
                id
                status
                file_url
              }
            }
          `,
          {
            id: recording.id,
            fileUrl,
            status: "completed",
          },
        );

        logger.info("Recording processing completed", {
          recordingId: recording.id,
          callId: recording.call_id,
          fileUrl,
        });
      } else {
        // Handle failure case
        await nhost.graphql.request(
          `
            mutation UpdateRecordingFailed($id: uuid!, $error: String!) {
              update_nchat_call_recordings_by_pk(
                pk_columns: {id: $id}
                _set: {
                  status: "failed"
                  error_message: $error
                  processed_at: "now()"
                }
              ) {
                id
                status
              }
            }
          `,
          {
            id: recording.id,
            error: payload.error || "Recording processing failed",
          },
        );

        logger.error("Recording processing failed", {
          recordingId: recording.id,
          egressId: payload.egressId,
          error: payload.error,
        });
      }
    } catch (error) {
      logger.error("Error processing recording completion webhook:", error);
    }
  }

  /**
   * Get signed download URL for a recording
   */
  async getRecordingDownloadUrl(
    recordingId: string,
    userId: string,
    expirySeconds: number = 3600,
  ): Promise<string | null> {
    try {
      // Verify user has access to recording
      const { data: recordingData, error: recordingError } =
        await nhost.graphql.request(
          `
          query GetRecordingForDownload($id: uuid!) {
            nchat_call_recordings_by_pk(id: $id) {
              id
              file_url
              file_path
              recorded_by
              call_id
              call {
                id
                initiator_id
                participants: nchat_call_participants(limit: 100) {
                  user_id
                }
              }
            }
          }
        `,
          { id: recordingId },
        );

      if (recordingError || !recordingData?.nchat_call_recordings_by_pk) {
        return null;
      }

      const recording = recordingData.nchat_call_recordings_by_pk;
      const call = recording.call;

      // Check access: initiator, participant, or recorded by same user
      const isInitiator = call?.initiator_id === userId;
      const isParticipant = call?.participants?.some(
        (p: any) => p.user_id === userId,
      );
      const isRecorder = recording.recorded_by === userId;

      if (!isInitiator && !isParticipant && !isRecorder) {
        return null;
      }

      // Generate signed URL if file path exists
      if (recording.file_path) {
        const command = new GetObjectCommand({
          Bucket: this.storageConfig.bucket || "recordings",
          Key: recording.file_path,
          ResponseContentDisposition: 'attachment; filename="recording.mp4"',
        });

        const url = await getSignedUrl(this.s3Client, command, {
          expiresIn: expirySeconds,
        });
        return url;
      }

      return recording.file_url || null;
    } catch (error) {
      logger.error("Error generating recording download URL:", error);
      return null;
    }
  }

  /**
   * Get recording metadata including file info
   */
  async getRecordingMetadata(recordingId: string) {
    try {
      const { data, error } = await nhost.graphql.request(
        `
          query GetRecordingMetadata($id: uuid!) {
            nchat_call_recordings_by_pk(id: $id) {
              id
              call_id
              status
              file_url
              file_path
              file_size_bytes
              duration_seconds
              resolution
              layout_type
              audio_only
              thumbnail_url
              started_at
              ended_at
              processed_at
              error_message
            }
          }
        `,
        { id: recordingId },
      );

      if (error || !data?.nchat_call_recordings_by_pk) {
        return null;
      }

      return data.nchat_call_recordings_by_pk;
    } catch (error) {
      logger.error("Error fetching recording metadata:", error);
      return null;
    }
  }

  /**
   * Delete a recording and its file
   */
  async deleteRecording(recordingId: string, userId: string): Promise<boolean> {
    try {
      // Verify user has permission
      const { data: recordingData, error: recordingError } =
        await nhost.graphql.request(
          `
          query GetRecordingForDelete($id: uuid!) {
            nchat_call_recordings_by_pk(id: $id) {
              id
              file_path
              recorded_by
              call {
                initiator_id
              }
            }
          }
        `,
          { id: recordingId },
        );

      if (recordingError || !recordingData?.nchat_call_recordings_by_pk) {
        return false;
      }

      const recording = recordingData.nchat_call_recordings_by_pk;
      const isRecorder = recording.recorded_by === userId;
      const isInitiator = recording.call?.initiator_id === userId;

      if (!isRecorder && !isInitiator) {
        return false;
      }

      // Delete from storage if file exists
      if (recording.file_path) {
        try {
          const command = new DeleteObjectCommand({
            Bucket: this.storageConfig.bucket || "recordings",
            Key: recording.file_path,
          });
          await this.s3Client.send(command);
        } catch (storageError) {
          logger.warn("Failed to delete recording file from storage:", {
            error: String(storageError),
          });
          // Continue to delete DB record anyway
        }
      }

      // Delete from database
      const { error: deleteError } = await nhost.graphql.request(
        `
          mutation DeleteRecording($id: uuid!) {
            delete_nchat_call_recordings_by_pk(id: $id) {
              id
            }
          }
        `,
        { id: recordingId },
      );

      if (deleteError) {
        logger.error("Failed to delete recording from database:", deleteError);
        return false;
      }

      logger.info("Recording deleted", { recordingId });
      return true;
    } catch (error) {
      logger.error("Error deleting recording:", error);
      return false;
    }
  }

  /**
   * Archive old recordings (for retention policies)
   */
  async archiveOldRecordings(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await nhost.graphql.request(
        `
          query GetOldRecordings($cutoffDate: timestamptz!) {
            nchat_call_recordings(
              where: {
                status: {_eq: "completed"}
                created_at: {_lt: $cutoffDate}
              }
            ) {
              id
            }
          }
        `,
        { cutoffDate: cutoffDate.toISOString() },
      );

      if (error || !data?.nchat_call_recordings) {
        return 0;
      }

      // Update all old recordings to archived status
      const archivedCount = data.nchat_call_recordings.length;

      if (archivedCount > 0) {
        await nhost.graphql.request(
          `
            mutation ArchiveOldRecordings($cutoffDate: timestamptz!) {
              update_nchat_call_recordings(
                where: {
                  status: {_eq: "completed"}
                  created_at: {_lt: $cutoffDate}
                }
                _set: {status: "archived"}
              ) {
                affected_rows
              }
            }
          `,
          { cutoffDate: cutoffDate.toISOString() },
        );

        logger.info("Archived old recordings", { count: archivedCount });
      }

      return archivedCount;
    } catch (error) {
      logger.error("Error archiving old recordings:", error);
      return 0;
    }
  }
}

// Singleton instance
let recordingStorageService: RecordingStorageService | null = null;

/**
 * Get Recording Storage Service instance
 */
export function getRecordingStorageService(): RecordingStorageService {
  if (!recordingStorageService) {
    recordingStorageService = new RecordingStorageService();
  }
  return recordingStorageService;
}

export default RecordingStorageService;
