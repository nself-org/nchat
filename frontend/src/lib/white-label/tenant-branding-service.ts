// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Branding Service
// Complete white-label branding persistence and management
// ═══════════════════════════════════════════════════════════════════════════════

import { logger } from "@/lib/logger";
import type { ThemeColors } from "@/templates/types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantBrandingData {
  // App Identity
  appName?: string;
  tagline?: string;
  companyName?: string;
  websiteUrl?: string;

  // Logo Assets
  logoUrl?: string;
  logoDarkUrl?: string;
  logoScale?: number;
  logoSvg?: string;

  // Favicon
  faviconUrl?: string;
  faviconSvg?: string;

  // Email Assets
  emailHeaderUrl?: string;
  emailFooterHtml?: string;

  // Fonts
  primaryFont?: string;
  headingFont?: string;
  monoFont?: string;
  fontUrls?: {
    primary?: string;
    heading?: string;
    mono?: string;
  };

  // Custom Domain
  customDomain?: string;
  domainVerified?: boolean;
  domainVerifiedAt?: Date;
  sslEnabled?: boolean;

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImageUrl?: string;

  // Social Links
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    discord?: string;
    facebook?: string;
    instagram?: string;
  };

  // Legal
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  supportEmail?: string;
  contactEmail?: string;
}

export interface TenantThemeData {
  defaultMode: "light" | "dark" | "system";
  lightColors: Partial<ThemeColors>;
  darkColors: Partial<ThemeColors>;

  // Platform-specific
  lightMessageBubbleOwn?: string;
  lightMessageBubbleOther?: string;
  darkMessageBubbleOwn?: string;
  darkMessageBubbleOther?: string;

  // Custom CSS
  customCss?: string;
  customCssEnabled?: boolean;
}

export interface TenantFeaturesData {
  // Core Features
  publicChannels?: boolean;
  privateChannels?: boolean;
  directMessages?: boolean;
  groupMessages?: boolean;

  // Messaging Features
  threads?: boolean;
  threadStyle?: "panel" | "inline" | "popup";
  reactions?: boolean;
  reactionStyle?: "inline" | "floating" | "hover";
  messageEditing?: boolean;
  messageDeletion?: boolean;
  messagePinning?: boolean;
  messageBookmarking?: boolean;
  messageStarring?: boolean;
  messageForwarding?: boolean;
  messageScheduling?: boolean;

  // Rich Content
  fileUploads?: boolean;
  voiceMessages?: boolean;
  codeBlocks?: boolean;
  markdown?: boolean;
  linkPreviews?: boolean;
  emojiPicker?: "native" | "custom" | "both";
  gifPicker?: boolean;
  stickerPicker?: boolean;

  // Real-time Features
  typingIndicators?: boolean;
  typingStyle?: "dots" | "text" | "avatar";
  userPresence?: boolean;
  readReceipts?: boolean;
  readReceiptStyle?: "checkmarks" | "avatars" | "text";

  // Communication
  voiceCalls?: boolean;
  videoCalls?: boolean;
  screenSharing?: boolean;
  liveStreaming?: boolean;

  // Collaboration
  polls?: boolean;
  reminders?: boolean;
  tasks?: boolean;
  calendar?: boolean;

  // Search & Discovery
  search?: boolean;
  semanticSearch?: boolean;
  channelDiscovery?: boolean;

  // Security & Privacy
  e2ee?: boolean;
  disappearingMessages?: boolean;
  viewOnceMedia?: boolean;
  screenshotProtection?: boolean;

  // Integrations
  webhooks?: boolean;
  bots?: boolean;
  slackIntegration?: boolean;
  githubIntegration?: boolean;
  jiraIntegration?: boolean;

  // Moderation
  autoModeration?: boolean;
  profanityFilter?: boolean;
  spamDetection?: boolean;

  // Layout Configuration
  sidebarPosition?: "left" | "right";
  sidebarWidth?: number;
  sidebarCollapsible?: boolean;
  headerHeight?: number;
  showHeaderBorder?: boolean;

  // Message Layout
  messageDensity?: "compact" | "comfortable" | "spacious";
  messageGrouping?: boolean;
  messageGroupingTimeout?: number;

  // Avatar Configuration
  avatarStyle?: "circle" | "rounded" | "square";
  avatarSize?: "xs" | "sm" | "md" | "lg" | "xl";
  showAvatarInGroup?: "first" | "last" | "all" | "hover" | "none";

  // Channel Layout
  showChannelIcons?: boolean;
  showChannelDescription?: boolean;
  showMemberCount?: boolean;
  channelListDensity?: "compact" | "comfortable";

  // User Layout
  showUserStatus?: boolean;
  showPresenceDots?: boolean;
  presenceDotPosition?: "bottom-right" | "bottom-left" | "top-right";

  // Animation
  enableAnimations?: boolean;
  reducedMotion?: boolean;
  transitionDuration?: "fast" | "normal" | "slow";
  messageAppear?: "fade" | "slide" | "none";
  sidebarTransition?: "slide" | "overlay" | "push";
  modalTransition?: "fade" | "scale" | "slide";
}

export interface TenantTerminologyData {
  // Core Concepts
  workspace?: string;
  workspacePlural?: string;
  channel?: string;
  channelPlural?: string;
  directMessage?: string;
  directMessagePlural?: string;
  directMessageShort?: string;
  thread?: string;
  threadPlural?: string;
  member?: string;
  memberPlural?: string;
  message?: string;
  messagePlural?: string;
  reaction?: string;
  reactionPlural?: string;

  // Actions
  sendMessage?: string;
  editMessage?: string;
  deleteMessage?: string;
  replyToThread?: string;
  createChannel?: string;
  joinChannel?: string;
  leaveChannel?: string;

  // Placeholders
  messageInputPlaceholder?: string;
  searchPlaceholder?: string;
  newChannelPlaceholder?: string;
}

export interface BrandingAsset {
  id: string;
  tenantId: string;
  assetType:
    | "logo"
    | "logo_dark"
    | "favicon"
    | "email_header"
    | "og_image"
    | "custom";
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  isActive: boolean;
  uploadedBy?: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Branding Service
// ─────────────────────────────────────────────────────────────────────────────

export class TenantBrandingService {
  private apiUrl: string;

  constructor(apiUrl = "/api/tenants") {
    this.apiUrl = apiUrl;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Branding Management
  // ─────────────────────────────────────────────────────────────────────────────

  async getBranding(tenantId: string): Promise<TenantBrandingData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/branding`);
      if (!response.ok) {
        throw new Error(`Failed to fetch branding: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      logger.error("Error fetching branding:", error);
      throw error;
    }
  }

  async updateBranding(
    tenantId: string,
    data: Partial<TenantBrandingData>,
  ): Promise<TenantBrandingData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update branding: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error updating branding:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Asset Upload (Logo, Favicon, etc.)
  // ─────────────────────────────────────────────────────────────────────────────

  async uploadAsset(
    tenantId: string,
    assetType: BrandingAsset["assetType"],
    file: File,
  ): Promise<BrandingAsset> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", assetType);

      const response = await fetch(
        `${this.apiUrl}/${tenantId}/branding/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to upload asset: ${response.statusText}`);
      }

      const asset = await response.json();

      // Update branding with new asset URL
      const urlField = this.getAssetUrlField(assetType);
      if (urlField) {
        await this.updateBranding(tenantId, {
          [urlField]: asset.fileUrl,
        });
      }

      return asset;
    } catch (error) {
      logger.error("Error uploading asset:", error);
      throw error;
    }
  }

  async getAssets(tenantId: string): Promise<BrandingAsset[]> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${tenantId}/branding/assets`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch assets: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      logger.error("Error fetching assets:", error);
      throw error;
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/assets/${assetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete asset: ${response.statusText}`);
      }
    } catch (error) {
      logger.error("Error deleting asset:", error);
      throw error;
    }
  }

  private getAssetUrlField(assetType: string): string | null {
    const fieldMap: Record<string, string> = {
      logo: "logoUrl",
      logo_dark: "logoDarkUrl",
      favicon: "faviconUrl",
      email_header: "emailHeaderUrl",
      og_image: "ogImageUrl",
    };
    return fieldMap[assetType] || null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Theme Management
  // ─────────────────────────────────────────────────────────────────────────────

  async getTheme(tenantId: string): Promise<TenantThemeData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/theme`);
      if (!response.ok) {
        throw new Error(`Failed to fetch theme: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      logger.error("Error fetching theme:", error);
      throw error;
    }
  }

  async updateTheme(
    tenantId: string,
    data: Partial<TenantThemeData>,
  ): Promise<TenantThemeData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update theme: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error updating theme:", error);
      throw error;
    }
  }

  async applyTemplatePreset(
    tenantId: string,
    presetId: string,
  ): Promise<TenantThemeData> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${tenantId}/branding/template`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetId }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to apply template: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error applying template:", error);
      throw error;
    }
  }

  async resetTheme(tenantId: string): Promise<TenantThemeData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/theme/reset`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to reset theme: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error resetting theme:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Feature Management
  // ─────────────────────────────────────────────────────────────────────────────

  async getFeatures(tenantId: string): Promise<TenantFeaturesData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/features`);
      if (!response.ok) {
        throw new Error(`Failed to fetch features: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      logger.error("Error fetching features:", error);
      throw error;
    }
  }

  async updateFeatures(
    tenantId: string,
    data: Partial<TenantFeaturesData>,
  ): Promise<TenantFeaturesData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update features: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error updating features:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Terminology Management
  // ─────────────────────────────────────────────────────────────────────────────

  async getTerminology(tenantId: string): Promise<TenantTerminologyData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/terminology`);
      if (!response.ok) {
        throw new Error(`Failed to fetch terminology: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      logger.error("Error fetching terminology:", error);
      throw error;
    }
  }

  async updateTerminology(
    tenantId: string,
    data: Partial<TenantTerminologyData>,
  ): Promise<TenantTerminologyData> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/terminology`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update terminology: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error updating terminology:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Theme Export/Import
  // ─────────────────────────────────────────────────────────────────────────────

  async exportTheme(tenantId: string, exportName: string): Promise<Blob> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${tenantId}/branding/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exportName }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to export theme: ${response.statusText}`);
      }

      return response.blob();
    } catch (error) {
      logger.error("Error exporting theme:", error);
      throw error;
    }
  }

  async importTheme(tenantId: string, file: File): Promise<void> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${this.apiUrl}/${tenantId}/branding/import`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to import theme: ${response.statusText}`);
      }
    } catch (error) {
      logger.error("Error importing theme:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Domain Management
  // ─────────────────────────────────────────────────────────────────────────────

  async addCustomDomain(
    tenantId: string,
    domain: string,
    verificationMethod: "dns_txt" | "dns_cname" | "file" | "email",
  ): Promise<{
    id: string;
    domain: string;
    verificationToken: string;
    verificationStatus: string;
  }> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${tenantId}/branding/domain`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, verificationMethod }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to add custom domain: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error adding custom domain:", error);
      throw error;
    }
  }

  async verifyCustomDomain(
    tenantId: string,
    domainId: string,
  ): Promise<{
    verified: boolean;
    sslEnabled: boolean;
  }> {
    try {
      const response = await fetch(
        `${this.apiUrl}/${tenantId}/branding/domain/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domainId }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to verify domain: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error("Error verifying domain:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CSS Generation
  // ─────────────────────────────────────────────────────────────────────────────

  async generateCSS(tenantId: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/${tenantId}/branding/css`);
      if (!response.ok) {
        throw new Error(`Failed to generate CSS: ${response.statusText}`);
      }
      return response.text();
    } catch (error) {
      logger.error("Error generating CSS:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get complete branding configuration for a tenant
   */
  async getCompleteBranding(tenantId: string): Promise<{
    branding: TenantBrandingData;
    theme: TenantThemeData;
    features: TenantFeaturesData;
    terminology: TenantTerminologyData;
    assets: BrandingAsset[];
  }> {
    try {
      const [branding, theme, features, terminology, assets] =
        await Promise.all([
          this.getBranding(tenantId),
          this.getTheme(tenantId),
          this.getFeatures(tenantId),
          this.getTerminology(tenantId),
          this.getAssets(tenantId),
        ]);

      return {
        branding,
        theme,
        features,
        terminology,
        assets,
      };
    } catch (error) {
      logger.error("Error fetching complete branding:", error);
      throw error;
    }
  }

  /**
   * Validate logo dimensions and file size
   */
  validateLogoFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "image/webp",
    ];

    if (file.size > maxSize) {
      return { valid: false, error: "File size must be less than 5MB" };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: "File must be PNG, JPEG, SVG, or WebP",
      };
    }

    return { valid: true };
  }

  /**
   * Generate favicon from logo
   */
  async generateFavicon(logoUrl: string): Promise<Blob> {
    try {
      const response = await fetch("/api/favicon/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate favicon: ${response.statusText}`);
      }

      return response.blob();
    } catch (error) {
      logger.error("Error generating favicon:", error);
      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export singleton instance
// ─────────────────────────────────────────────────────────────────────────────

export const tenantBrandingService = new TenantBrandingService();
