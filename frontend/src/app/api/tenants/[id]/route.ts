/**
 * GET/PUT/DELETE /api/tenants/[id]
 *
 * Manage individual tenant.
 * Requires authentication and ownership verification.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTenantService } from "@/lib/tenants/tenant-service";
import { getTenantId } from "@/lib/tenants/tenant-middleware";
import type { UpdateTenantRequest } from "@/lib/tenants/types";
import { z } from "zod";

import { logger } from "@/lib/logger";

const updateTenantSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  customDomain: z.string().max(255).optional(),
  branding: z
    .object({
      appName: z.string().optional(),
      logoUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      customCSS: z.string().optional(),
    })
    .optional(),
  limits: z.record(z.any()).optional(),
  features: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantService = getTenantService();

    // Verify tenant access
    const requestTenantId = getTenantId(request);
    if (requestTenantId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tenant = await tenantService.getTenantById(id);

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    logger.error("Error fetching tenant:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tenant",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify tenant access
    const requestTenantId = getTenantId(request);
    if (requestTenantId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Validate request
    const validationResult = updateTenantSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const data: UpdateTenantRequest = validationResult.data;

    // Update tenant
    const tenantService = getTenantService();
    const tenant = await tenantService.updateTenant(id, data);

    return NextResponse.json(tenant);
  } catch (error) {
    logger.error("Error updating tenant:", error);
    return NextResponse.json(
      {
        error: "Failed to update tenant",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verify tenant access
    const requestTenantId = getTenantId(request);
    if (requestTenantId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete tenant (soft delete by default)
    const tenantService = getTenantService();
    await tenantService.deleteTenant(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting tenant:", error);
    return NextResponse.json(
      {
        error: "Failed to delete tenant",
        details:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : String(error),
      },
      { status: 500 },
    );
  }
}
