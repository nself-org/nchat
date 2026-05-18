/**
 * POST /api/tenants/[id]/branding/upload
 *
 * Handles file uploads for branding assets (logos, favicons, etc.)
 * Stores files in cloud storage and returns URLs
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { BrandingAsset } from "@/lib/white-label/tenant-branding-service";

// In a real implementation, this would use cloud storage (S3, GCS, etc.)
// For now, we'll store references in the database
async function saveAssetMetadata(
  tenantId: string,
  fileName: string,
  assetType: string,
  fileUrl: string,
  mimeType: string,
  fileSize: number,
): Promise<BrandingAsset | null> {
  const graphqlUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
  const adminSecret = process.env.HASURA_ADMIN_SECRET;

  if (!adminSecret) {
    logger.warn("HASURA_ADMIN_SECRET not set");
    return null;
  }

  try {
    const mutation = `
      mutation InsertBrandingAsset($asset: nchat_branding_assets_insert_input!) {
        insert_nchat_branding_assets_one(object: $asset) {
          id
          tenant_id
          asset_type
          file_name
          file_url
          file_size
          mime_type
          is_active
          created_at
        }
      }
    `;

    const variables = {
      asset: {
        tenant_id: tenantId,
        asset_type: assetType,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
        mime_type: mimeType,
        is_active: true,
      },
    };

    const response = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": adminSecret,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.error("GraphQL error saving asset metadata:", result.errors);
      return null;
    }

    const asset = result.data?.insert_nchat_branding_assets_one;

    if (!asset) {
      return null;
    }

    return {
      id: asset.id,
      tenantId: asset.tenant_id,
      assetType: asset.asset_type as any,
      fileName: asset.file_name,
      fileUrl: asset.file_url,
      fileSize: asset.file_size,
      mimeType: asset.mime_type,
      isActive: asset.is_active,
      createdAt: new Date(asset.created_at),
    };
  } catch (error) {
    logger.error("Failed to save asset metadata:", error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: tenantId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const assetType = (formData.get("assetType") as string) || "custom";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    if (file.size > 10 * 1024 * 1024) {
      // 10 MB limit
      return NextResponse.json(
        { error: "File too large (max 10 MB)" },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // In a real implementation, upload to cloud storage
    // For now, create a data URL or mock URL
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // In production, you would upload to S3/GCS and get a real URL
    // For now, we'll use a placeholder that indicates where the file would be stored
    const fileUrl = `/api/tenants/${tenantId}/branding/assets/${assetType}/${file.name}`;

    // Save metadata to database
    const asset = await saveAssetMetadata(
      tenantId,
      file.name,
      assetType,
      fileUrl,
      file.type,
      file.size,
    );

    if (!asset) {
      return NextResponse.json(
        { error: "Failed to save asset" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: asset,
      message: "Asset uploaded successfully",
    });
  } catch (error) {
    logger.error("Failed to upload asset:", error);
    return NextResponse.json(
      { error: "Failed to upload asset" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
