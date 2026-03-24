/**
 * Category Reorder API Route
 *
 * Handles bulk reordering of categories.
 *
 * POST /api/channels/categories/reorder - Reorder categories (admin/owner only)
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { categoryService } from '@/services/channels'
import {
  compose,
  withErrorHandler,
  withAuth,
  withLogging,
  AuthenticatedRequest,
  RouteContext,
} from '@/lib/api/middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CategoryPositionSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0),
})

const ReorderCategoriesSchema = z.object({
  positions: z.array(CategoryPositionSchema).min(1, 'At least one category position is required'),
})

const MoveChannelSchema = z.object({
  channelId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  position: z.number().int().min(0),
})

// ============================================================================
// POST /api/channels/categories/reorder - Reorder categories
// ============================================================================

export const POST = compose(
  withErrorHandler,
  withLogging,
  withAuth
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  logger.info('POST /api/channels/categories/reorder - Reorder categories request')

  const { user } = request

  // Check permissions - only admins and owners can reorder categories
  if (!['admin', 'owner'].includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions to reorder categories' },
      { status: 403 }
    )
  }

  const body = await request.json()

  // Determine the action type
  const action = body.action || 'reorderCategories'

  if (action === 'moveChannel') {
    // Handle moving a channel to a category
    const validation = MoveChannelSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { channelId, categoryId, position } = validation.data

    const result = await categoryService.moveChannel?.({
      channelId,
      categoryId: categoryId ?? '',
      position,
    })

    logger.info('POST /api/channels/categories/reorder - Channel moved', {
      channelId,
      categoryId,
      position,
      movedBy: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Channel moved successfully',
      result: { channelId, categoryId, position },
    })
  } else {
    // Handle reordering categories
    const validation = ReorderCategoriesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { positions } = validation.data

    // Map to just IDs for the current CategoryService interface
    await categoryService.reorderCategories(positions.map((p) => p.id))

    logger.info('POST /api/channels/categories/reorder - Categories reordered', {
      count: positions.length,
      reorderedBy: user.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Categories reordered successfully',
      reorderedCount: positions.length,
    })
  }
})
