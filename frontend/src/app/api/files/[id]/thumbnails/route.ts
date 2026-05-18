/**
 * File Thumbnails API Route
 *
 * GET /api/files/[id]/thumbnails - Get thumbnails for a file
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  getStorageConfig,
  getProcessingConfig,
  generateThumbnailPath,
  FILE_SERVICE_CONSTANTS,
} from "@/services/files/config";
import type { ThumbnailRecord } from "@/services/files/types";

import { logger } from "@/lib/logger";

// Initialize S3 client
function getS3Client() {
  const config = getStorageConfig();

  return new S3Client({
    endpoint: config.endpoint,
    region: config.region || "us-east-1",
    credentials: {
      accessKeyId: config.accessKey || "",
      secretAccessKey: config.secretKey || "",
    },
    forcePathStyle: config.provider === "minio",
  });
}

// ============================================================================
// Mock Database (replace with real database queries)
// ============================================================================

// This should be imported from a shared location
const thumbnailStore = new Map<string, ThumbnailRecord[]>();

// ============================================================================
// GET - Get thumbnails for a file
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Check for specific size request
    const size = searchParams.get("size");
    const signed = searchParams.get("signed") !== "false";

    // Check local cache first
    let thumbnails = thumbnailStore.get(id);

    // If not in cache, try to fetch from processing service
    if (!thumbnails || thumbnails.length === 0) {
      const processingConfig = getProcessingConfig();

      try {
        const response = await fetch(
          `${processingConfig.baseUrl}/api/files/${id}/thumbnails`,
        );

        if (response.ok) {
          thumbnails = await response.json();
          if (thumbnails && thumbnails.length > 0) {
            thumbnailStore.set(id, thumbnails);
          }
        }
      } catch {
        // Processing service unavailable, try storage directly
      }
    }

    // If still no thumbnails, check storage directly
    if (!thumbnails || thumbnails.length === 0) {
      thumbnails = await findThumbnailsInStorage(id);
      if (thumbnails.length > 0) {
        thumbnailStore.set(id, thumbnails);
      }
    }

    if (!thumbnails || thumbnails.length === 0) {
      return NextResponse.json([]);
    }

    // Filter by size if requested
    if (size) {
      const requestedSize = parseInt(size, 10);
      thumbnails = thumbnails.filter(
        (t) => Math.abs(t.width - requestedSize) < 50,
      );
    }

    // Generate signed URLs if requested
    if (signed) {
      const s3Client = getS3Client();
      const storageConfig = getStorageConfig();

      thumbnails = await Promise.all(
        thumbnails.map(async (thumb) => {
          try {
            const command = new GetObjectCommand({
              Bucket: storageConfig.bucket,
              Key: thumb.path,
            });

            const signedUrl = await getSignedUrl(s3Client, command, {
              expiresIn: FILE_SERVICE_CONSTANTS.DEFAULT_URL_EXPIRY,
            });

            return { ...thumb, url: signedUrl };
          } catch {
            return thumb;
          }
        }),
      );
    }

    return NextResponse.json(thumbnails);
  } catch (error) {
    logger.error("Get thumbnails error:", error);
    return NextResponse.json(
      { error: "Failed to get thumbnails" },
      { status: 500 },
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find thumbnails in storage by checking common paths
 */
async function findThumbnailsInStorage(
  fileId: string,
): Promise<ThumbnailRecord[]> {
  const s3Client = getS3Client();
  const storageConfig = getStorageConfig();
  const thumbnails: ThumbnailRecord[] = [];

  for (const size of FILE_SERVICE_CONSTANTS.THUMBNAIL_SIZES) {
    for (const format of FILE_SERVICE_CONSTANTS.THUMBNAIL_FORMATS) {
      const path = generateThumbnailPath(fileId, size, format);

      try {
        const headCommand = new HeadObjectCommand({
          Bucket: storageConfig.bucket,
          Key: path,
        });

        const metadata = await s3Client.send(headCommand);

        thumbnails.push({
          id: `${fileId}-${size}`,
          fileId,
          path,
          width: size,
          height: size, // Assuming square thumbnails
          size: metadata.ContentLength || 0,
          format: format as "jpeg" | "png" | "webp",
          createdAt: metadata.LastModified || new Date(),
        });

        // Found a thumbnail at this size, no need to check other formats
        break;
      } catch {
        // Thumbnail doesn't exist at this path
      }
    }
  }

  return thumbnails;
}
