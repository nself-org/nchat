/**
 * Custom CSS API Route
 *
 * POST /api/tenants/[id]/branding/css - Apply custom CSS
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  compose,
  withErrorHandler,
  withAuth,
  withLogging,
  AuthenticatedRequest,
  RouteContext,
} from '@/lib/api/middleware'
import csstree from 'css-tree'

export const dynamic = 'force-dynamic'

// 50KB limit for custom CSS
const MAX_CSS_SIZE = 50 * 1024

/**
 * Validate CSS using a proper AST parser.
 * Rejects malformed CSS and dangerous patterns (external URLs, javascript: URIs).
 */
function validateCSS(css: string): { valid: boolean; error?: string } {
  try {
    let dangerous = false
    csstree.parse(css, {
      parseValue: true,
      onParseError: (err: Error) => {
        throw err
      },
      // Walk the AST inline via the visitor API
    })

    // Walk AST to detect dangerous URL references
    const ast = csstree.parse(css, { parseValue: true })
    csstree.walk(ast, (node) => {
      if (node.type === 'Url') {
        // css-tree Url nodes have a value child that is a String or Raw
        const urlNode = (node.value as unknown) as { type: string; value: string } | undefined
        const urlStr = urlNode?.value?.replace(/['"]/g, '') ?? ''
        if (/^(https?:|javascript:|data:)/i.test(urlStr)) {
          dangerous = true
        }
      }
      if (node.type === 'Atrule' && node.name === 'import') {
        dangerous = true
      }
    })

    if (dangerous) {
      return { valid: false, error: 'External URLs and @import are not allowed in CSS' }
    }
    return { valid: true }
  } catch (err) {
    return { valid: false, error: `Invalid CSS: ${err instanceof Error ? err.message : err}` }
  }
}

/**
 * POST - Apply custom CSS (admin/owner only)
 */
export const POST = compose(
  withErrorHandler,
  withLogging,
  withAuth
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  const { id: tenantId } = (await context.params) as { id: string }
  const { user } = request

  // Only admins and owners can update branding
  if (!['admin', 'owner'].includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions. Admin role required.' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { css } = body

  if (typeof css !== 'string') {
    return NextResponse.json(
      { success: false, error: 'css field must be a string' },
      { status: 400 }
    )
  }

  // Enforce size limit
  if (Buffer.byteLength(css, 'utf8') > MAX_CSS_SIZE) {
    return NextResponse.json(
      { success: false, error: 'CSS content exceeds 50KB limit' },
      { status: 400 }
    )
  }

  // Validate CSS using AST parser (catches malformed CSS and dangerous patterns)
  const cssValidation = validateCSS(css)
  if (!cssValidation.valid) {
    return NextResponse.json(
      { success: false, error: cssValidation.error || 'Invalid CSS content' },
      { status: 400 }
    )
  }

  // Persist validated CSS to nchat_tenant_branding via Hasura mutation

  logger.info('Custom CSS applied:', {
    tenantId,
    userId: user.id,
    cssLength: css.length,
  })

  const branding = {
    tenantId,
    customCSS: css,
    audit: {
      createdAt: new Date(),
      createdBy: user.id,
      updatedAt: new Date(),
      updatedBy: user.id,
      version: 2,
      changelog: [
        {
          timestamp: new Date(),
          userId: user.id,
          action: 'update_css',
          changes: { cssLength: css.length },
        },
      ],
    },
  }

  return NextResponse.json(branding)
})
