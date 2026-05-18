/**
 * Link Preview API Route
 *
 * POST /api/messages/[id]/link-preview - Generate link preview for message URLs
 * GET /api/messages/[id]/link-preview - Get existing link previews
 *
 * Features:
 * - OpenGraph metadata extraction
 * - Twitter Card support
 * - SSRF protection
 * - URL validation and sanitization
 * - Caching with hash-based deduplication
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";
import { getLinkUnfurlService } from "@/services/messages/link-unfurl.service";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const GenerateLinkPreviewSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10, "Maximum 10 URLs per request"),
  force: z.boolean().default(false), // Force refresh cached previews
});

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const GET_MESSAGE_LINK_PREVIEWS = gql`
  query GetMessageLinkPreviews($messageId: uuid!) {
    nchat_link_previews(
      where: { message_id: { _eq: $messageId } }
      order_by: { created_at: asc }
    ) {
      id
      url
      title
      description
      image_url
      site_name
      favicon_url
      theme_color
      video_url
      author
      published_at
      fetch_status
      fetch_error
      fetched_at
    }
  }
`;

const GET_CACHED_LINK_PREVIEW = gql`
  query GetCachedLinkPreview($urlHash: String!) {
    nchat_link_previews(
      where: { url_hash: { _eq: $urlHash } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      url
      title
      description
      image_url
      site_name
      favicon_url
      theme_color
      video_url
      author
      published_at
      fetch_status
      fetched_at
    }
  }
`;

const CREATE_LINK_PREVIEW = gql`
  mutation CreateLinkPreview(
    $messageId: uuid!
    $url: String!
    $urlHash: String!
    $title: String
    $description: String
    $imageUrl: String
    $siteName: String
    $faviconUrl: String
    $themeColor: String
    $videoUrl: String
    $author: String
    $publishedAt: timestamptz
    $metadata: jsonb
    $fetchStatus: String!
    $fetchError: String
  ) {
    insert_nchat_link_previews_one(
      object: {
        message_id: $messageId
        url: $url
        url_hash: $urlHash
        title: $title
        description: $description
        image_url: $imageUrl
        site_name: $siteName
        favicon_url: $faviconUrl
        theme_color: $themeColor
        video_url: $videoUrl
        author: $author
        published_at: $publishedAt
        metadata: $metadata
        fetch_status: $fetchStatus
        fetch_error: $fetchError
        fetched_at: "now()"
      }
    ) {
      id
      url
      title
      description
      image_url
      site_name
    }
  }
`;

// ============================================================================
// HELPERS
// ============================================================================

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

// ============================================================================
// GET - Retrieve existing link previews
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const messageId = resolvedParams.id;

  try {
    logger.debug("GET /api/messages/[id]/link-preview", { messageId });

    const { data, errors } = await apolloClient.query({
      query: GET_MESSAGE_LINK_PREVIEWS,
      variables: { messageId },
      fetchPolicy: "network-only",
    });

    if (errors) {
      throw new Error(errors[0].message);
    }

    return NextResponse.json({
      success: true,
      data: {
        previews: data.nchat_link_previews || [],
        count: data.nchat_link_previews?.length || 0,
      },
    });
  } catch (error) {
    logger.error(
      "GET /api/messages/[id]/link-preview - Error",
      error as Error,
      {
        messageId,
      },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch link previews",
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
// POST - Generate link previews
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const messageId = resolvedParams.id;

  try {
    logger.info("POST /api/messages/[id]/link-preview", { messageId });

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = GenerateLinkPreviewSchema.safeParse(body);

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

    const { urls, force } = validation.data;
    const linkUnfurlService = getLinkUnfurlService();
    const previews = [];
    const errors = [];

    for (const url of urls) {
      try {
        const urlHash = hashUrl(url);

        // Check cache unless force refresh
        if (!force) {
          const { data: cachedData } = await apolloClient.query({
            query: GET_CACHED_LINK_PREVIEW,
            variables: { urlHash },
            fetchPolicy: "network-only",
          });

          if (cachedData?.nchat_link_previews?.[0]) {
            const cached = cachedData.nchat_link_previews[0];
            // Reuse cached preview if less than 7 days old
            const cacheAge = Date.now() - new Date(cached.fetched_at).getTime();
            const maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days

            if (cacheAge < maxCacheAge && cached.fetch_status === "success") {
              logger.debug("Using cached link preview", { url, urlHash });

              // Create link preview record for this message pointing to cached data
              const { data: previewData } = await apolloClient.mutate({
                mutation: CREATE_LINK_PREVIEW,
                variables: {
                  messageId,
                  url: cached.url,
                  urlHash,
                  title: cached.title,
                  description: cached.description,
                  imageUrl: cached.image_url,
                  siteName: cached.site_name,
                  faviconUrl: cached.favicon_url,
                  themeColor: cached.theme_color,
                  videoUrl: cached.video_url,
                  author: cached.author,
                  publishedAt: cached.published_at,
                  metadata: {},
                  fetchStatus: "success",
                  fetchError: null,
                },
              });

              previews.push(previewData.insert_nchat_link_previews_one);
              continue;
            }
          }
        }

        // Fetch fresh link preview with SSRF protection
        const result = await linkUnfurlService.unfurlUrl(url, {
          timeout: 10000,
          maxRedirects: 3,
        });

        if (!result.success) {
          logger.warn("Link unfurl failed", { url, error: result.error });

          // Store failed attempt
          await apolloClient.mutate({
            mutation: CREATE_LINK_PREVIEW,
            variables: {
              messageId,
              url,
              urlHash,
              title: null,
              description: null,
              imageUrl: null,
              siteName: null,
              faviconUrl: null,
              themeColor: null,
              videoUrl: null,
              author: null,
              publishedAt: null,
              metadata: {},
              fetchStatus: "failed",
              fetchError:
                typeof result.error === "string"
                  ? result.error
                  : (result.error as any)?.message || "Unknown error",
            },
          });

          errors.push({
            url,
            error:
              typeof result.error === "string"
                ? result.error
                : (result.error as any)?.message || "Unknown error",
          });
          continue;
        }

        const preview = result.data!;

        // Store successful preview
        const { data: previewData } = await apolloClient.mutate({
          mutation: CREATE_LINK_PREVIEW,
          variables: {
            messageId,
            url,
            urlHash,
            title: preview.title,
            description: preview.description,
            imageUrl: preview.imageUrl,
            siteName: preview.siteName,
            faviconUrl: preview.faviconUrl,
            themeColor: preview.themeColor,
            videoUrl: preview.videoUrl,
            author: preview.author,
            publishedAt: preview.publishedAt,
            metadata: {},
            fetchStatus: "success",
            fetchError: null,
          },
        });

        previews.push(previewData.insert_nchat_link_previews_one);
        logger.info("Link preview generated", { url, messageId });
      } catch (urlError) {
        logger.error("Error processing URL for preview", urlError as Error, {
          url,
        });
        errors.push({
          url,
          error: urlError instanceof Error ? urlError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          previews,
          errors: errors.length > 0 ? errors : undefined,
          successCount: previews.length,
          errorCount: errors.length,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error(
      "POST /api/messages/[id]/link-preview - Error",
      error as Error,
      {
        messageId,
      },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate link previews",
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
