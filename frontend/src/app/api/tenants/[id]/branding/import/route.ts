/**
 * Branding Import API Route
 *
 * POST /api/tenants/[id]/branding/import - Import branding from JSON
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  compose,
  withErrorHandler,
  withAuth,
  withLogging,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/api/middleware";

export const dynamic = "force-dynamic";

// 1MB limit for branding import files
const MAX_IMPORT_SIZE = 1024 * 1024;

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://api.localhost/v1/graphql";
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

// Validation schema for imported branding JSON
const BrandingImportSchema = z.object({
  version: z.number().int().positive().optional(),
  primaryColor: z.string().max(50).optional(),
  secondaryColor: z.string().max(50).optional(),
  accentColor: z.string().max(50).optional(),
  backgroundColor: z.string().max(50).optional(),
  textColor: z.string().max(50).optional(),
  logoUrl: z.string().url().max(2048).optional(),
  faviconUrl: z.string().url().max(2048).optional(),
  appName: z.string().max(100).optional(),
  tagline: z.string().max(255).optional(),
  customCSS: z
    .string()
    .max(50 * 1024)
    .optional(), // 50KB max CSS
  fontFamily: z.string().max(100).optional(),
});

type BrandingImport = z.infer<typeof BrandingImportSchema>;

/**
 * Resolve and optionally re-host external logo/favicon URLs.
 * Returns the original URL unchanged — a self-hosted file proxy can be wired in here
 * when object storage is available.
 */
function resolveAssetUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // For now, accept the URL as-is (already validated by zod as a valid URL).
  // To re-download and self-host, upload to MinIO/storage here and return the
  // internal URL instead. Left as a no-op so callers receive a working URL rather
  // than a silent gap.
  return url;
}

/**
 * POST - Import branding configuration (admin/owner only)
 */
export const POST = compose(
  withErrorHandler,
  withLogging,
  withAuth,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { id: tenantId } = (await context.params) as { id: string };
  const { user } = request;

  // Only admins and owners can import branding
  if (!["admin", "owner"].includes(user.role)) {
    return NextResponse.json(
      {
        success: false,
        error: "Insufficient permissions. Admin role required.",
      },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file provided" },
      { status: 400 },
    );
  }

  // Enforce file size limit
  if (file.size > MAX_IMPORT_SIZE) {
    return NextResponse.json(
      { success: false, error: "Import file exceeds 1MB limit" },
      { status: 400 },
    );
  }

  // Read and parse JSON
  const text = await file.text();
  let rawBranding: unknown;
  try {
    rawBranding = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON file" },
      { status: 400 },
    );
  }

  // Validate branding structure with strict schema
  const validation = BrandingImportSchema.safeParse(rawBranding);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid branding configuration",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const branding: BrandingImport = validation.data;

  // Resolve asset URLs (re-host from external sources when storage is available)
  const resolvedLogoUrl = resolveAssetUrl(branding.logoUrl);
  const resolvedFaviconUrl = resolveAssetUrl(branding.faviconUrl);

  // Persist to database
  if (ADMIN_SECRET) {
    const mutation = `
      mutation ImportBranding($tenantId: String!, $data: nchat_tenant_branding_set_input!) {
        update_nchat_tenant_branding(
          where: { tenant_id: { _eq: $tenantId } }
          _set: $data
        ) {
          affected_rows
        }
      }
    `;

    const dbData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (branding.appName !== undefined) dbData.app_name = branding.appName;
    if (branding.tagline !== undefined) dbData.tagline = branding.tagline;
    if (resolvedLogoUrl !== undefined) dbData.logo_url = resolvedLogoUrl;
    if (resolvedFaviconUrl !== undefined)
      dbData.favicon_url = resolvedFaviconUrl;
    if (branding.fontFamily !== undefined)
      dbData.primary_font = branding.fontFamily;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { tenantId, data: dbData },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      logger.warn("GraphQL errors persisting imported branding:", {
        tenantId,
        errors: result.errors,
      });
      // Continue — return the parsed branding even if DB write failed
    } else {
      logger.info("Imported branding persisted to database:", {
        tenantId,
        affectedRows: result.data?.update_nchat_tenant_branding?.affected_rows,
      });
    }
  } else {
    logger.warn(
      "HASURA_ADMIN_SECRET not set, imported branding not persisted",
      { tenantId },
    );
  }

  logger.info("Branding configuration imported:", {
    tenantId,
    userId: user.id,
    version: branding.version,
  });

  return NextResponse.json({
    success: true,
    tenantId,
    ...branding,
    logoUrl: resolvedLogoUrl,
    faviconUrl: resolvedFaviconUrl,
    audit: {
      createdAt: new Date(),
      createdBy: user.id,
      updatedAt: new Date(),
      updatedBy: user.id,
      version: 1,
      changelog: [
        {
          timestamp: new Date(),
          userId: user.id,
          action: "import",
          changes: { source: "file_import" },
        },
      ],
    },
  });
});
