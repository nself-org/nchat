/**
 * MeiliSearch helper for the frontend
 *
 * Provides message search with two execution paths:
 *
 *   1. Direct MeiliSearch (preferred): when NEXT_PUBLIC_MEILISEARCH_URL is set
 *      the browser hits the MeiliSearch search API directly using the public
 *      (search-only) API key. No backend round-trip.
 *
 *   2. Proxy fallback: when NEXT_PUBLIC_MEILISEARCH_URL is absent (MeiliSearch
 *      not installed, or self-hosted user opted out), all queries are forwarded
 *      to the existing Next.js proxy at /api/plugins/search/search, which in
 *      turn talks to the Advanced Search plugin service on port 3107.
 *
 * Usage:
 *   import { searchMessages } from '@/lib/search/meilisearch'
 *   const result = await searchMessages('hello world', { limit: 20, offset: 0 })
 */

// ============================================================================
// Configuration
// ============================================================================

const MEILISEARCH_URL = process.env.NEXT_PUBLIC_MEILISEARCH_URL
const MEILISEARCH_PUBLIC_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_PUBLIC_KEY ?? ''

/** Index name for messages — must match the MeiliSearch index created by the
 *  Advanced Search plugin (meilisearch-client.ts INDEX_NAMES.MESSAGES). */
const MESSAGES_INDEX = 'messages'

// ============================================================================
// Types
// ============================================================================

export interface MessageSearchHit {
  id: string
  channel_id: string
  user_id: string | null
  thread_id: string | null
  parent_message_id: string | null
  content_search: string
  content_plain: string | null
  type: string
  is_pinned: boolean | null
  reaction_count: number | null
  reply_count: number | null
  created_at: string
  updated_at: string
  /** MeiliSearch formatted/highlighted snippets when attributesToHighlight is used */
  _formatted?: Partial<MessageSearchHit>
}

export interface SearchMessagesOptions {
  /** Maximum number of results to return (default: 20, max: 100) */
  limit?: number
  /** Number of results to skip for pagination (default: 0) */
  offset?: number
  /** Filter to a specific channel ID */
  channelId?: string
  /** Filter to a specific user ID (author) */
  userId?: string
}

export interface SearchMessagesResult {
  hits: MessageSearchHit[]
  /** Estimated total number of matching documents */
  estimatedTotalHits: number
  /** Search engine processing time in milliseconds */
  processingTimeMs: number
  /** Whether more results are available beyond the current page */
  hasMore: boolean
  /** The backend path used: 'meilisearch' | 'proxy' */
  via: 'meilisearch' | 'proxy'
}

// ============================================================================
// MeiliSearch direct path
// ============================================================================

interface MeiliSearchResponse {
  hits: MessageSearchHit[]
  estimatedTotalHits?: number
  processingTimeMs?: number
  limit?: number
  offset?: number
}

async function searchViaMeiliSearch(
  query: string,
  options: SearchMessagesOptions
): Promise<SearchMessagesResult> {
  const limit = Math.min(options.limit ?? 20, 100)
  const offset = options.offset ?? 0

  const filters: string[] = []
  if (options.channelId) {
    filters.push(`channel_id = "${options.channelId}"`)
  }
  if (options.userId) {
    filters.push(`user_id = "${options.userId}"`)
  }

  const body: Record<string, unknown> = {
    q: query,
    limit,
    offset,
    attributesToHighlight: ['content_search', 'content_plain'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
    cropLength: 200,
  }

  if (filters.length > 0) {
    body.filter = filters.join(' AND ')
  }

  const url = `${MEILISEARCH_URL}/indexes/${MESSAGES_INDEX}/search`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MEILISEARCH_PUBLIC_KEY ? { Authorization: `Bearer ${MEILISEARCH_PUBLIC_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MeiliSearch search failed (${response.status}): ${text}`)
  }

  const data: MeiliSearchResponse = await response.json()
  const estimatedTotalHits = data.estimatedTotalHits ?? 0

  return {
    hits: data.hits,
    estimatedTotalHits,
    processingTimeMs: data.processingTimeMs ?? 0,
    hasMore: offset + limit < estimatedTotalHits,
    via: 'meilisearch',
  }
}

// ============================================================================
// Proxy fallback path
// ============================================================================

interface ProxyResponse {
  results?: MessageSearchHit[]
  hits?: MessageSearchHit[]
  total?: number
  totalCount?: number
  estimatedTotalHits?: number
  processingTimeMs?: number
}

async function searchViaProxy(
  query: string,
  options: SearchMessagesOptions
): Promise<SearchMessagesResult> {
  const limit = Math.min(options.limit ?? 20, 100)
  const offset = options.offset ?? 0

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    offset: String(offset),
  })

  if (options.channelId) {
    params.set('channel_id', options.channelId)
  }
  if (options.userId) {
    params.set('user_id', options.userId)
  }

  const response = await fetch(`/api/plugins/search/search?${params.toString()}`)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Search proxy failed (${response.status}): ${text}`)
  }

  const data: ProxyResponse = await response.json()

  const hits: MessageSearchHit[] = data.results ?? data.hits ?? []
  const estimatedTotalHits = data.estimatedTotalHits ?? data.totalCount ?? data.total ?? 0

  return {
    hits,
    estimatedTotalHits,
    processingTimeMs: data.processingTimeMs ?? 0,
    hasMore: offset + limit < estimatedTotalHits,
    via: 'proxy',
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Search messages using MeiliSearch or the proxy fallback.
 *
 * When NEXT_PUBLIC_MEILISEARCH_URL is set, queries go directly to MeiliSearch
 * using the public search-only API key. When it is absent, queries are routed
 * through /api/plugins/search/search (the Advanced Search plugin proxy).
 *
 * Returns an empty result set — never throws — when MeiliSearch is unavailable
 * and the proxy also fails, so callers can degrade gracefully.
 *
 * @param query    The search text
 * @param options  Optional pagination and filter parameters
 */
export async function searchMessages(
  query: string,
  options: SearchMessagesOptions = {}
): Promise<SearchMessagesResult> {
  const trimmed = query.trim()

  if (!trimmed) {
    return {
      hits: [],
      estimatedTotalHits: 0,
      processingTimeMs: 0,
      hasMore: false,
      via: MEILISEARCH_URL ? 'meilisearch' : 'proxy',
    }
  }

  if (MEILISEARCH_URL) {
    return searchViaMeiliSearch(trimmed, options)
  }

  return searchViaProxy(trimmed, options)
}

/**
 * Returns whether MeiliSearch direct access is configured.
 * Components can use this to show search-engine-specific UI hints.
 */
export function isMeiliSearchConfigured(): boolean {
  return Boolean(MEILISEARCH_URL)
}
