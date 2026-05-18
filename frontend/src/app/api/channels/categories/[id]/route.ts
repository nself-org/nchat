/**
 * Single Category API Route
 *
 * Handles operations on a specific category.
 *
 * GET /api/channels/categories/[id] - Get category details
 * PATCH /api/channels/categories/[id] - Update category (admin/owner only)
 * DELETE /api/channels/categories/[id] - Delete category (admin/owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { categoryService } from "@/services/channels";
import type { UserRole } from "@/types/user";
import type { UpdateCategoryInput } from "@/types/advanced-channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  position: z.number().int().min(0).optional(),
  isCollapsed: z.boolean().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function getUserRoleFromRequest(request: NextRequest): UserRole {
  return (request.headers.get("x-user-role") as UserRole) || "guest";
}

function validateCategoryId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Check if user has permission to manage categories
 * Only admins and owners can create/update/delete categories
 */
function canManageCategories(role: UserRole): boolean {
  return ["admin", "owner"].includes(role);
}

// ============================================================================
// GET /api/channels/categories/[id] - Get category details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("GET /api/channels/categories/[id] - Get category request", {
      categoryId: id,
    });

    // Validate category ID
    if (!validateCategoryId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid category ID format" },
        { status: 400 },
      );
    }

    // Get category
    const category = await categoryService.getCategory(id);

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    logger.info("GET /api/channels/categories/[id] - Success", {
      categoryId: id,
    });

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/channels/categories/[id] - Error", error as Error, {
      categoryId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch category",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH /api/channels/categories/[id] - Update category
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info(
      "PATCH /api/channels/categories/[id] - Update category request",
      {
        categoryId: id,
      },
    );

    // Validate category ID
    if (!validateCategoryId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid category ID format" },
        { status: 400 },
      );
    }

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = getUserRoleFromRequest(request);

    // Check permissions - only admins and owners can update categories
    if (!canManageCategories(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to update categories",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Cast to UpdateCategoryInput (schema fields are a subset of the type)
    const updates = validation.data as UpdateCategoryInput;

    // Check if category exists
    const existingCategory = await categoryService.getCategory(id);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    // Update the category
    const category = await categoryService.updateCategory(id, updates);

    logger.info("PATCH /api/channels/categories/[id] - Category updated", {
      categoryId: id,
      updatedBy: userId,
      updates: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      category,
      message: "Category updated successfully",
    });
  } catch (error) {
    const { id } = await params;
    logger.error(
      "PATCH /api/channels/categories/[id] - Error",
      error as Error,
      {
        categoryId: id,
      },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update category",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE /api/channels/categories/[id] - Delete category
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info(
      "DELETE /api/channels/categories/[id] - Delete category request",
      {
        categoryId: id,
      },
    );

    // Validate category ID
    if (!validateCategoryId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid category ID format" },
        { status: 400 },
      );
    }

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const userRole = getUserRoleFromRequest(request);

    // Check permissions - only admins and owners can delete categories
    if (!canManageCategories(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to delete categories",
        },
        { status: 403 },
      );
    }

    // Check if category exists
    const existingCategory = await categoryService.getCategory(id);
    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    // Delete the category (channels will be moved to uncategorized)
    await categoryService.deleteCategory(id);

    logger.info("DELETE /api/channels/categories/[id] - Category deleted", {
      categoryId: id,
      categoryName: existingCategory.name || "Unknown",
      deletedBy: userId,
    });

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
      categoryId: id,
      categoryName: existingCategory.name || "Unknown",
    });
  } catch (error) {
    const { id } = await params;
    logger.error(
      "DELETE /api/channels/categories/[id] - Error",
      error as Error,
      {
        categoryId: id,
      },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete category",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
