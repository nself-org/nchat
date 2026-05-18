/**
 * Social Media Embed Formatter
 * Creates rich embeds for social media posts to display in channels
 */

import type { SocialPost, SocialEmbed, SocialPlatform } from "./types";

// Platform colors for embed styling
const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  twitter: "#1DA1F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
};

// Platform icons (using emoji as fallback)
const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  twitter: "𝕏", // Twitter/X icon
  instagram: "📷",
  linkedin: "💼",
};

/**
 * Create a rich embed object from a social post
 */
export function createSocialEmbed(
  post: SocialPost,
  platform: SocialPlatform,
): SocialEmbed {
  return {
    type: "social",
    platform,
    post_url: post.post_url,
    author: {
      name: post.author_name,
      handle: post.author_handle,
      avatar_url: post.author_avatar_url,
    },
    content: post.content,
    media: post.media_urls?.map((url, index) => ({
      url,
      type: post.media_types?.[index] || "image",
      thumbnail_url: url, // Use same URL as thumbnail for now
    })),
    engagement: post.engagement,
    posted_at: post.posted_at,
    color: PLATFORM_COLORS[platform],
  };
}

/**
 * Format social embed as a message content object for database
 */
export function formatAsMessageContent(embed: SocialEmbed): any {
  const platformName = getPlatformDisplayName(embed.platform);
  const platformIcon = PLATFORM_ICONS[embed.platform];

  // Format engagement stats
  let engagementText = "";
  if (embed.engagement) {
    const stats: string[] = [];
    if (embed.engagement.likes)
      stats.push(`❤️ ${formatNumber(embed.engagement.likes)}`);
    if (embed.engagement.retweets)
      stats.push(`🔄 ${formatNumber(embed.engagement.retweets)}`);
    if (embed.engagement.shares)
      stats.push(`🔗 ${formatNumber(embed.engagement.shares)}`);
    if (embed.engagement.comments)
      stats.push(`💬 ${formatNumber(embed.engagement.comments)}`);
    if (embed.engagement.replies)
      stats.push(`💬 ${formatNumber(embed.engagement.replies)}`);
    if (stats.length > 0) {
      engagementText = `\n\n${stats.join(" • ")}`;
    }
  }

  // Format timestamp
  const timeAgo = formatTimeAgo(new Date(embed.posted_at));

  return {
    type: "social_embed",
    platform: embed.platform,
    embed: {
      title: `${platformIcon} New ${platformName} Post`,
      author: {
        name: embed.author.name,
        handle: embed.author.handle,
        avatar_url: embed.author.avatar_url,
        url: getAuthorUrl(embed.platform, embed.author.handle),
      },
      description: truncateText(embed.content, 500),
      url: embed.post_url,
      color: embed.color,
      media: embed.media,
      footer: {
        text: `Posted ${timeAgo}`,
        timestamp: embed.posted_at,
      },
      engagement: engagementText,
    },
  };
}

/**
 * Get platform display name
 */
function getPlatformDisplayName(platform: SocialPlatform): string {
  const names: Record<SocialPlatform, string> = {
    twitter: "Twitter/X",
    instagram: "Instagram",
    linkedin: "LinkedIn",
  };
  return names[platform];
}

/**
 * Get author profile URL
 */
function getAuthorUrl(
  platform: SocialPlatform,
  handle?: string,
): string | undefined {
  if (!handle) return undefined;

  const urls: Record<SocialPlatform, (h: string) => string> = {
    twitter: (h) => `https://twitter.com/${h}`,
    instagram: (h) => `https://instagram.com/${h}`,
    linkedin: (h) => `https://linkedin.com/in/${h}`, // Note: LinkedIn uses /in/ for profiles
  };

  return urls[platform](handle);
}

/**
 * Format large numbers (1.2K, 3.4M, etc.)
 */
function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

/**
 * Format timestamp as "X ago"
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Create a preview text for notifications
 */
export function createPreviewText(
  post: SocialPost,
  platform: SocialPlatform,
): string {
  const platformName = getPlatformDisplayName(platform);
  const authorHandle = post.author_handle
    ? `@${post.author_handle}`
    : post.author_name;
  const preview = truncateText(post.content, 100);
  return `${platformName} • ${authorHandle}: ${preview}`;
}

/**
 * Generate HTML for email notifications
 */
export function generateEmailHTML(embed: SocialEmbed): string {
  const platformName = getPlatformDisplayName(embed.platform);
  const authorUrl = getAuthorUrl(embed.platform, embed.author.handle);
  const timeAgo = formatTimeAgo(new Date(embed.posted_at));

  let html = `
    <div style="border-left: 4px solid ${embed.color}; padding: 16px; margin: 16px 0; background: #f9f9f9;">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        ${embed.author.avatar_url ? `<img src="${embed.author.avatar_url}" style="width: 48px; height: 48px; border-radius: 50%; margin-right: 12px;" />` : ""}
        <div>
          <strong>${embed.author.name}</strong>
          ${embed.author.handle ? `<br/><a href="${authorUrl}" style="color: #666; text-decoration: none;">@${embed.author.handle}</a>` : ""}
        </div>
      </div>
      <p style="margin: 12px 0;">${embed.content}</p>
  `;

  // Add media
  if (embed.media && embed.media.length > 0) {
    html += '<div style="margin: 12px 0;">';
    for (const media of embed.media.slice(0, 4)) {
      // Max 4 images
      if (media.type === "image") {
        html += `<img src="${media.url}" style="max-width: 100%; height: auto; margin: 4px; border-radius: 8px;" />`;
      }
    }
    html += "</div>";
  }

  // Add engagement
  if (embed.engagement) {
    const stats: string[] = [];
    if (embed.engagement.likes)
      stats.push(`❤️ ${formatNumber(embed.engagement.likes)} likes`);
    if (embed.engagement.retweets)
      stats.push(`🔄 ${formatNumber(embed.engagement.retweets)} retweets`);
    if (embed.engagement.shares)
      stats.push(`🔗 ${formatNumber(embed.engagement.shares)} shares`);
    if (embed.engagement.comments)
      stats.push(`💬 ${formatNumber(embed.engagement.comments)} comments`);

    if (stats.length > 0) {
      html += `<div style="color: #666; font-size: 14px; margin-top: 12px;">${stats.join(" • ")}</div>`;
    }
  }

  html += `
      <div style="margin-top: 12px;">
        <a href="${embed.post_url}" style="color: ${embed.color}; text-decoration: none;">View on ${platformName}</a>
        <span style="color: #999; margin-left: 12px;">${timeAgo}</span>
      </div>
    </div>
  `;

  return html;
}
