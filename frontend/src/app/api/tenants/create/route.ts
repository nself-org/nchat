/**
 * POST /api/tenants/create
 *
 * Create a new tenant organization.
 * Public route - allows new tenant sign-ups.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTenantService } from "@/lib/tenants/tenant-service";
import type { CreateTenantRequest } from "@/lib/tenants/types";
import { z } from "zod";

import { logger } from "@/lib/logger";

const createTenantSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(2).max(255),
  ownerPassword: z.string().min(8),
  plan: z.enum(["free", "pro", "enterprise", "custom"]).optional(),
  trial: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validationResult = createTenantSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const data: CreateTenantRequest = validationResult.data;

    // Create tenant
    const tenantService = getTenantService();
    const tenant = await tenantService.createTenant(data);

    // Return tenant data (without sensitive information)
    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.billing.plan,
      createdAt: tenant.createdAt,
    });
  } catch (error) {
    logger.error("Error creating tenant:", error);

    // Check for specific error types
    if (
      (error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : String(error)
      )?.includes("already exists")
    ) {
      return NextResponse.json(
        { error: "A tenant with this slug already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create tenant",
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
