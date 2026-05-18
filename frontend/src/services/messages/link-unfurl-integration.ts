/**
 * Link Unfurl Integration
 *
 * Integrates link unfurling with the message service.
 * Automatically extracts URLs from messages and unfurls them in the background.
 *
 * Features:
 * - URL extraction from message content
 * - Background unfurling with proper error handling
 * - Database caching via GraphQL
 * - Message metadata updates
 *
 * @module services/messages/link-unfurl-integration
 */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { logger } from "@/lib/logger";
import {
  getLinkUnfurlService,
  hashUrl,
  type LinkPreviewData,
} from "./link-unfurl.service";
import {
  GET_VALID_LINK_PREVIEW,
  INSERT_LINK_PREVIEW,
  DELETE_EXPIRED_PREVIEWS,
  transformLinkPreviewRecord,
  type LinkPreviewRecord,
} from "@/graphql/messages/link-previews";

// ============================================================================
// Types
// ============================================================================

export interface LinkUnfurlIntegrationConfig {
  /** Apollo client for GraphQL operations */
  apolloClient: ApolloClient<NormalizedCacheObject>;
  /** Maximum URLs to unfurl per message */
  maxUrlsPerMessage?: number;
  /** Whether to use database caching */
  useDbCache?: boolean;
}

export interface ExtractedUrl {
  url: string;
  urlHash: string;
  startIndex: number;
  endIndex: number;
}

export interface MessageLinkPreview {
  url: string;
  urlHash: string;
  preview?: LinkPreviewData;
  error?: string;
  cached: boolean;
}

export interface UnfurlMessageResult {
  messageId: string;
  extractedUrls: ExtractedUrl[];
  previews: MessageLinkPreview[];
}

// ============================================================================
// Constants
// ============================================================================

/** Default max URLs to unfurl per message */
const DEFAULT_MAX_URLS_PER_MESSAGE = 5;

/** URL regex pattern for extraction */
const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/** URLs that should be excluded from unfurling */
const EXCLUDED_URL_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/i, // Direct image links
  /\.(mp4|webm|mov|avi)(\?.*)?$/i, // Direct video links
  /\.(mp3|wav|ogg|flac)(\?.*)?$/i, // Direct audio links
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?.*)?$/i, // Document links
  /\.(zip|rar|7z|tar|gz)(\?.*)?$/i, // Archive links
];

// ============================================================================
// Link Unfurl Integration Class
// ============================================================================

/**
 * Link Unfurl Integration
 *
 * Manages the integration between message sending and link unfurling.
 */
export class LinkUnfurlIntegration {
  private readonly log = logger.scope("LinkUnfurlIntegration");
  private client: ApolloClient<NormalizedCacheObject>;
  private maxUrlsPerMessage: number;
  private useDbCache: boolean;

  constructor(config: LinkUnfurlIntegrationConfig) {
    this.client = config.apolloClient;
    this.maxUrlsPerMessage =
      config.maxUrlsPerMessage ?? DEFAULT_MAX_URLS_PER_MESSAGE;
    this.useDbCache = config.useDbCache ?? true;
  }

  // ==========================================================================
  // URL Extraction
  // ==========================================================================

  /**
   * Extract URLs from message content
   */
  extractUrls(content: string): ExtractedUrl[] {
    const urls: ExtractedUrl[] = [];
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    URL_REGEX.lastIndex = 0; // Reset regex state

    while ((match = URL_REGEX.exec(content)) !== null) {
      const url = match[0];

      // Skip duplicates
      if (seen.has(url)) continue;
      seen.add(url);

      // Skip excluded patterns
      if (this.shouldExcludeUrl(url)) continue;

      urls.push({
        url,
        urlHash: hashUrl(url),
        startIndex: match.index,
        endIndex: match.index + url.length,
      });

      // Limit number of URLs
      if (urls.length >= this.maxUrlsPerMessage) break;
    }

    return urls;
  }

  /**
   * Check if URL should be excluded from unfurling
   */
  private shouldExcludeUrl(url: string): boolean {
    return EXCLUDED_URL_PATTERNS.some((pattern) => pattern.test(url));
  }

  // ==========================================================================
  // Cache Operations
  // ==========================================================================

  /**
   * Get cached preview from database
   */
  async getCachedPreview(urlHash: string): Promise<LinkPreviewData | null> {
    if (!this.useDbCache) return null;

    try {
      const { data } = await this.client.query({
        query: GET_VALID_LINK_PREVIEW,
        variables: {
          urlHash,
          now: new Date().toISOString(),
        },
        fetchPolicy: "network-only",
      });

      const records = data?.nchat_link_previews as
        | LinkPreviewRecord[]
        | undefined;
      if (!records || records.length === 0) return null;

      const transformed = transformLinkPreviewRecord(records[0]);
      return {
        url: transformed.url,
        urlHash: transformed.urlHash,
        title: transformed.title,
        description: transformed.description,
        imageUrl: transformed.imageUrl,
        imageWidth: transformed.imageWidth,
        imageHeight: transformed.imageHeight,
        imageAlt: transformed.imageAlt,
        siteName: transformed.siteName,
        faviconUrl: transformed.faviconUrl,
        type: transformed.type as LinkPreviewData["type"],
        videoUrl: transformed.videoUrl,
        videoWidth: transformed.videoWidth,
        videoHeight: transformed.videoHeight,
        audioUrl: transformed.audioUrl,
        author: transformed.author,
        publishedAt: transformed.publishedAt,
        domain: transformed.domain,
        themeColor: transformed.themeColor,
        fetchedAt: transformed.fetchedAt,
        expiresAt: transformed.expiresAt,
      };
    } catch (error) {
      this.log.warn("Failed to get cached preview", { urlHash, error });
      return null;
    }
  }

  /**
   * Save preview to database cache
   */
  async cachePreview(preview: LinkPreviewData): Promise<void> {
    if (!this.useDbCache) return;

    try {
      await this.client.mutate({
        mutation: INSERT_LINK_PREVIEW,
        variables: {
          urlHash: preview.urlHash,
          url: preview.url,
          title: preview.title,
          description: preview.description || null,
          imageUrl: preview.imageUrl || null,
          imageWidth: preview.imageWidth || null,
          imageHeight: preview.imageHeight || null,
          imageAlt: preview.imageAlt || null,
          siteName: preview.siteName || null,
          faviconUrl: preview.faviconUrl || null,
          type: preview.type,
          videoUrl: preview.videoUrl || null,
          videoWidth: preview.videoWidth || null,
          videoHeight: preview.videoHeight || null,
          audioUrl: preview.audioUrl || null,
          author: preview.author || null,
          publishedAt: preview.publishedAt || null,
          domain: preview.domain,
          themeColor: preview.themeColor || null,
          fetchedAt: preview.fetchedAt.toISOString(),
          expiresAt: preview.expiresAt.toISOString(),
        },
      });
    } catch (error) {
      this.log.warn("Failed to cache preview", { url: preview.url, error });
    }
  }

  /**
   * Clean up expired previews
   */
  async cleanupExpiredPreviews(): Promise<number> {
    try {
      const { data } = await this.client.mutate({
        mutation: DELETE_EXPIRED_PREVIEWS,
        variables: {
          now: new Date().toISOString(),
        },
      });

      const deletedCount = data?.delete_nchat_link_previews?.affected_rows ?? 0;
      if (deletedCount > 0) {
        this.log.info("Cleaned up expired previews", { count: deletedCount });
      }
      return deletedCount;
    } catch (error) {
      this.log.warn("Failed to cleanup expired previews", { error });
      return 0;
    }
  }

  // ==========================================================================
  // Unfurl Operations
  // ==========================================================================

  /**
   * Unfurl a single URL
   */
  async unfurlUrl(url: string): Promise<MessageLinkPreview> {
    const urlHash = hashUrl(url);

    // Check database cache first
    const cached = await this.getCachedPreview(urlHash);
    if (cached) {
      return {
        url,
        urlHash,
        preview: cached,
        cached: true,
      };
    }

    // Unfurl the URL
    const service = getLinkUnfurlService();
    const result = await service.unfurlUrl(url);

    if (!result.success || !result.data) {
      return {
        url,
        urlHash,
        error: result.error,
        cached: false,
      };
    }

    // Cache the result
    await this.cachePreview(result.data);

    return {
      url,
      urlHash,
      preview: result.data,
      cached: false,
    };
  }

  /**
   * Unfurl multiple URLs
   */
  async unfurlUrls(urls: string[]): Promise<MessageLinkPreview[]> {
    // Limit URLs
    const urlsToUnfurl = urls.slice(0, this.maxUrlsPerMessage);

    // Unfurl in parallel with proper error handling
    const results = await Promise.all(
      urlsToUnfurl.map((url) =>
        this.unfurlUrl(url).catch((error) => ({
          url,
          urlHash: hashUrl(url),
          error: error instanceof Error ? error.message : "Unknown error",
          cached: false,
        })),
      ),
    );

    return results;
  }

  /**
   * Process a message and unfurl its URLs
   */
  async processMessage(
    messageId: string,
    content: string,
  ): Promise<UnfurlMessageResult> {
    this.log.debug("Processing message for unfurling", { messageId });

    // Extract URLs
    const extractedUrls = this.extractUrls(content);

    if (extractedUrls.length === 0) {
      return {
        messageId,
        extractedUrls: [],
        previews: [],
      };
    }

    this.log.info("Found URLs to unfurl", {
      messageId,
      urlCount: extractedUrls.length,
    });

    // Unfurl all URLs
    const urls = extractedUrls.map((e) => e.url);
    const previews = await this.unfurlUrls(urls);

    return {
      messageId,
      extractedUrls,
      previews,
    };
  }

  /**
   * Process a message in the background (non-blocking)
   */
  processMessageBackground(messageId: string, content: string): void {
    // Fire and forget - errors are logged but not propagated
    this.processMessage(messageId, content)
      .then((result) => {
        if (result.previews.length > 0) {
          const successCount = result.previews.filter((p) => p.preview).length;
          this.log.info("Background unfurl completed", {
            messageId,
            total: result.previews.length,
            success: successCount,
          });
        }
      })
      .catch((error) => {
        this.log.error(
          "Background unfurl failed",
          error instanceof Error ? error : new Error(String(error)),
          {
            messageId,
          },
        );
      });
  }
}

// ============================================================================
// Singleton and Factory
// ============================================================================

let integrationInstance: LinkUnfurlIntegration | null = null;

/**
 * Get or create the link unfurl integration singleton
 */
export function getLinkUnfurlIntegration(
  apolloClient: ApolloClient<NormalizedCacheObject>,
): LinkUnfurlIntegration {
  if (!integrationInstance) {
    integrationInstance = new LinkUnfurlIntegration({ apolloClient });
  }
  return integrationInstance;
}

/**
 * Create a new link unfurl integration instance (for testing)
 */
export function createLinkUnfurlIntegration(
  config: LinkUnfurlIntegrationConfig,
): LinkUnfurlIntegration {
  return new LinkUnfurlIntegration(config);
}

export default LinkUnfurlIntegration;
