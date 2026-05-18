/**
 * File Download API Route
 *
 * GET /api/files/[id]/download - Get secure download URL
 */

import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerApolloClient } from "@/lib/apollo-client";
import { GET_FILE_BY_ID } from "@/graphql/files";
import {
  getStorageConfig,
  FILE_SERVICE_CONSTANTS,
} from "@/services/files/config";
import type { FileRecord } from "@/services/files/types";

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
// GET - Get secure download URL
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Parse options
    const expiresIn = Math.min(
      parseInt(
        searchParams.get("expiresIn") ||
          String(FILE_SERVICE_CONSTANTS.DEFAULT_URL_EXPIRY),
        10,
      ),
      FILE_SERVICE_CONSTANTS.MAX_URL_EXPIRY,
    );
    const disposition = searchParams.get("disposition") || "inline";
    const filename = searchParams.get("filename");

    // Fetch file from database
    const client = getServerApolloClient();
    const { data, error } = await client.query({
      query: GET_FILE_BY_ID,
      variables: { id },
      fetchPolicy: "network-only",
    });

    if (error || !data?.nchat_attachments_by_pk) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const attachment = data.nchat_attachments_by_pk;

    // Map database record to FileRecord type
    const file: FileRecord = {
      id: attachment.id,
      name: attachment.file_name,
      storagePath: attachment.storage_path,
      url: attachment.file_url,
      size: attachment.file_size,
      mimeType: attachment.file_type,
      extension: attachment.file_name.split(".").pop()?.toLowerCase() || "",
      bucket: getStorageConfig().bucket,
      provider: getStorageConfig().provider,
      uploadedBy: attachment.user_id,
      uploadedAt: new Date(attachment.created_at),
      processingStatus: (attachment.processing_status || "completed") as any,
      processingJobId: attachment.processing_job_id || undefined,
      channelId: attachment.channel_id || undefined,
      messageId: attachment.message_id || undefined,
      isDeleted: attachment.is_deleted || false,
      deletedAt: attachment.deleted_at
        ? new Date(attachment.deleted_at)
        : undefined,
      contentHash: attachment.content_hash || undefined,
    };

    if (file.isDeleted) {
      return NextResponse.json(
        { error: "File has been deleted" },
        { status: 410 },
      );
    }

    // Generate signed URL
    const storageConfig = getStorageConfig();
    const s3Client = getS3Client();

    const downloadFilename = filename || file.name;

    const command = new GetObjectCommand({
      Bucket: file.bucket || storageConfig.bucket,
      Key: file.storagePath,
      ResponseContentDisposition:
        disposition === "attachment"
          ? `attachment; filename="${encodeURIComponent(downloadFilename)}"`
          : `inline; filename="${encodeURIComponent(downloadFilename)}"`,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return NextResponse.json({
      url: signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      contentType: file.mimeType,
      filename: downloadFilename,
      size: file.size,
    });
  } catch (error) {
    logger.error("Download URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST - Generate signed URL (alternative endpoint)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      expiresIn = FILE_SERVICE_CONSTANTS.DEFAULT_URL_EXPIRY,
      disposition = "inline",
      filename,
    } = body;

    // Redirect to GET with query params
    const url = new URL(request.url);
    url.searchParams.set("expiresIn", String(expiresIn));
    url.searchParams.set("disposition", disposition);
    if (filename) {
      url.searchParams.set("filename", filename);
    }

    // Forward to GET handler
    return GET(new NextRequest(url, { method: "GET" }), {
      params: Promise.resolve({ id }),
    });
  } catch (error) {
    logger.error("Download URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 },
    );
  }
}
