/**
 * Storage Setup and Configuration
 *
 * MinIO bucket setup, access control policies, and initialization.
 */

import {
  S3Client,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
  HeadBucketCommand,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";
import { getStorageConfig, FILE_SERVICE_CONSTANTS } from "./config";
import type { StorageConfig, FileTypeConfig } from "./types";
import { DEFAULT_FILE_CONFIG } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface StorageSetupResult {
  success: boolean;
  message: string;
  buckets: string[];
  errors?: string[];
}

export interface BucketPolicy {
  Version: string;
  Statement: Array<{
    Sid: string;
    Effect: "Allow" | "Deny";
    Principal: string | { AWS: string };
    Action: string | string[];
    Resource: string | string[];
    Condition?: Record<string, Record<string, string | string[]>>;
  }>;
}

// ============================================================================
// Default Configuration Values
// ============================================================================

/**
 * Default storage buckets to create
 */
export const DEFAULT_BUCKETS = {
  files: "nchat-files",
  thumbnails: "nchat-thumbnails",
  temp: "nchat-temp",
  avatars: "nchat-avatars",
} as const;

/**
 * CORS configuration for file buckets
 */
export const DEFAULT_CORS_CONFIG = {
  CORSRules: [
    {
      AllowedHeaders: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
      AllowedOrigins: ["*"], // Configure this for production
      ExposeHeaders: ["ETag", "Content-Length", "Content-Type", "x-amz-meta-*"],
      MaxAgeSeconds: 3600,
    },
  ],
};

/**
 * Default bucket policy (public read for thumbnails)
 */
export function getPublicReadPolicy(bucket: string): BucketPolicy {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicRead",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };
}

/**
 * Private bucket policy (authenticated users only)
 */
export function getPrivatePolicy(bucket: string): BucketPolicy {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PrivateAccess",
        Effect: "Allow",
        Principal: { AWS: "*" },
        Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
        Condition: {
          StringEquals: {
            "aws:PrincipalType": "IAMUser",
          },
        },
      },
    ],
  };
}

// ============================================================================
// S3 Client Factory
// ============================================================================

function createS3Client(config?: StorageConfig): S3Client {
  const storageConfig = config || getStorageConfig();

  return new S3Client({
    endpoint: storageConfig.endpoint,
    region: storageConfig.region || "us-east-1",
    credentials: {
      accessKeyId: storageConfig.accessKey || "",
      secretAccessKey: storageConfig.secretKey || "",
    },
    forcePathStyle: storageConfig.provider === "minio",
  });
}

// ============================================================================
// Storage Setup Functions
// ============================================================================

/**
 * Check if a bucket exists
 */
export async function bucketExists(
  bucketName: string,
  client?: S3Client,
): Promise<boolean> {
  const s3Client = client || createS3Client();

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error: unknown) {
    if ((error as { name?: string }).name === "NotFound") {
      return false;
    }
    throw error;
  }
}

/**
 * Create a bucket if it doesn't exist
 */
export async function createBucket(
  bucketName: string,
  options: {
    public?: boolean;
    cors?: boolean;
    client?: S3Client;
  } = {},
): Promise<{ created: boolean; error?: string }> {
  const { public: isPublic = false, cors = true, client } = options;
  const s3Client = client || createS3Client();

  try {
    // Check if bucket exists
    const exists = await bucketExists(bucketName, s3Client);
    if (exists) {
      return { created: false };
    }

    // Create bucket
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      }),
    );

    // Set CORS if requested
    if (cors) {
      await s3Client.send(
        new PutBucketCorsCommand({
          Bucket: bucketName,
          CORSConfiguration: DEFAULT_CORS_CONFIG,
        }),
      );
    }

    // Set policy if public
    if (isPublic) {
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(getPublicReadPolicy(bucketName)),
        }),
      );
    }

    return { created: true };
  } catch (error) {
    return {
      created: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Set up all required storage buckets
 */
export async function setupStorage(
  config?: StorageConfig,
): Promise<StorageSetupResult> {
  const storageConfig = config || getStorageConfig();
  const s3Client = createS3Client(storageConfig);

  const results: {
    bucket: string;
    success: boolean;
    error?: string;
  }[] = [];

  // Create main files bucket
  const filesResult = await createBucket(storageConfig.bucket, {
    public: false,
    cors: true,
    client: s3Client,
  });
  results.push({
    bucket: storageConfig.bucket,
    success: filesResult.created || !filesResult.error,
    error: filesResult.error,
  });

  // Create thumbnails bucket (public read)
  const thumbnailsBucket = `${storageConfig.bucket}-thumbnails`;
  const thumbnailsResult = await createBucket(thumbnailsBucket, {
    public: true,
    cors: true,
    client: s3Client,
  });
  results.push({
    bucket: thumbnailsBucket,
    success: thumbnailsResult.created || !thumbnailsResult.error,
    error: thumbnailsResult.error,
  });

  // Create temp bucket for processing
  const tempBucket = `${storageConfig.bucket}-temp`;
  const tempResult = await createBucket(tempBucket, {
    public: false,
    cors: true,
    client: s3Client,
  });
  results.push({
    bucket: tempBucket,
    success: tempResult.created || !tempResult.error,
    error: tempResult.error,
  });

  // Aggregate results
  const errors = results
    .filter((r) => !r.success && r.error)
    .map((r) => `${r.bucket}: ${r.error}`);

  return {
    success: errors.length === 0,
    message:
      errors.length === 0
        ? "Storage setup completed successfully"
        : `Storage setup completed with errors: ${errors.join(", ")}`,
    buckets: results.filter((r) => r.success).map((r) => r.bucket),
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * List all buckets
 */
export async function listBuckets(config?: StorageConfig): Promise<string[]> {
  const s3Client = createS3Client(config);

  try {
    const response = await s3Client.send(new ListBucketsCommand({}));
    return response.Buckets?.map((b) => b.Name || "") || [];
  } catch {
    return [];
  }
}

/**
 * Verify storage connection
 */
export async function verifyStorageConnection(config?: StorageConfig): Promise<{
  connected: boolean;
  error?: string;
  provider: string;
}> {
  const storageConfig = config || getStorageConfig();

  try {
    const buckets = await listBuckets(storageConfig);

    return {
      connected: true,
      provider: storageConfig.provider,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed",
      provider: storageConfig.provider,
    };
  }
}

// ============================================================================
// File Size Limits Configuration
// ============================================================================

/**
 * Get file size limits based on file type and user tier
 */
export interface FileSizeLimits {
  maxFileSize: number;
  maxTotalSize: number;
  maxFilesPerMessage: number;
  maxFilesPerChannel: number;
}

export type UserTier = "free" | "starter" | "professional" | "enterprise";

export function getFileSizeLimits(tier: UserTier = "free"): FileSizeLimits {
  const limits: Record<UserTier, FileSizeLimits> = {
    free: {
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxTotalSize: 25 * 1024 * 1024, // 25 MB per message
      maxFilesPerMessage: 10,
      maxFilesPerChannel: 1000,
    },
    starter: {
      maxFileSize: 50 * 1024 * 1024, // 50 MB
      maxTotalSize: 100 * 1024 * 1024, // 100 MB per message
      maxFilesPerMessage: 20,
      maxFilesPerChannel: 10000,
    },
    professional: {
      maxFileSize: 100 * 1024 * 1024, // 100 MB
      maxTotalSize: 250 * 1024 * 1024, // 250 MB per message
      maxFilesPerMessage: 50,
      maxFilesPerChannel: 100000,
    },
    enterprise: {
      maxFileSize: 500 * 1024 * 1024, // 500 MB
      maxTotalSize: 1024 * 1024 * 1024, // 1 GB per message
      maxFilesPerMessage: 100,
      maxFilesPerChannel: -1, // Unlimited
    },
  };

  return limits[tier];
}

// ============================================================================
// Allowed File Types Configuration
// ============================================================================

/**
 * Get allowed file types by category
 */
export function getAllowedFileTypes(): Record<string, string[]> {
  return {
    images: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "image/svg+xml",
      "image/heic",
      "image/heif",
    ],
    videos: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/ogg",
    ],
    audio: [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "audio/aac",
      "audio/flac",
    ],
    documents: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "text/markdown",
      "application/rtf",
    ],
    archives: [
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/x-tar",
      "application/gzip",
      "application/x-bzip2",
    ],
    code: [
      "text/javascript",
      "application/javascript",
      "text/typescript",
      "application/json",
      "text/html",
      "text/css",
      "text/xml",
      "application/xml",
      "text/x-python",
      "text/x-java-source",
      "text/x-c",
      "text/x-c++",
      "text/x-ruby",
      "text/x-go",
      "text/x-rust",
    ],
  };
}

/**
 * Get all allowed MIME types
 */
export function getAllAllowedMimeTypes(): string[] {
  const types = getAllowedFileTypes();
  return Object.values(types).flat();
}

/**
 * Check if a MIME type is allowed
 */
export function isMimeTypeAllowed(mimeType: string): boolean {
  const allowedTypes = getAllAllowedMimeTypes();

  // Direct match
  if (allowedTypes.includes(mimeType)) {
    return true;
  }

  // Wildcard match (e.g., image/*)
  const category = mimeType.split("/")[0];
  return allowedTypes.some(
    (type) => type.startsWith(`${category}/`) || type === `${category}/*`,
  );
}

// ============================================================================
// Export Configuration
// ============================================================================

/**
 * Get complete storage configuration for the application
 */
export function getCompleteStorageConfig(tier: UserTier = "free"): {
  storage: StorageConfig;
  limits: FileSizeLimits;
  fileTypes: FileTypeConfig;
  buckets: typeof DEFAULT_BUCKETS;
} {
  return {
    storage: getStorageConfig(),
    limits: getFileSizeLimits(tier),
    fileTypes: {
      ...DEFAULT_FILE_CONFIG,
      allowedMimeTypes: getAllAllowedMimeTypes(),
    },
    buckets: DEFAULT_BUCKETS,
  };
}
