/**
 * Tenant Branding Persistence System
 *
 * Manages complete white-label branding configurations including:
 * - Logo and favicon management
 * - Color schemes and themes
 * - Typography settings
 * - Custom CSS injection
 * - Template configurations
 * - Domain/subdomain settings
 */

import type { BrandingConfig } from "./branding-schema";
import type { PlatformTemplate, TemplateId } from "@/templates/types";
import { logger } from "@/lib/logger";

export interface TenantBranding extends BrandingConfig {
  tenantId: string;
  templateId: TemplateId;
  customTemplate?: Partial<PlatformTemplate>;
  customCSS?: string;

  // Logo persistence
  logos: {
    primary?: {
      url: string;
      storageKey: string;
      width: number;
      height: number;
    };
    square?: {
      url: string;
      storageKey: string;
      size: number;
    };
    favicon?: {
      url: string;
      storageKey: string;
    };
  };

  // Domain configuration
  domains: {
    primary?: string;
    custom: string[];
    subdomain: string;
    subdomainVerified: boolean;
    customDomainVerified: boolean;
  };

  // Theme overrides
  themeOverrides: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };

  // Feature flags per template
  featureFlags: Record<string, boolean>;

  // Audit trail
  audit: {
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    version: number;
    changelog: Array<{
      timestamp: Date;
      userId: string;
      action: string;
      changes: Record<string, unknown>;
    }>;
  };
}

export class TenantBrandingService {
  private cache = new Map<string, TenantBranding>();

  /**
   * Get tenant branding configuration
   */
  async getTenantBranding(tenantId: string): Promise<TenantBranding | null> {
    try {
      // Check cache first
      if (this.cache.has(tenantId)) {
        return this.cache.get(tenantId)!;
      }

      const response = await fetch(`/api/tenants/${tenantId}/branding`);

      if (!response.ok) {
        throw new Error(`Failed to fetch branding: ${response.statusText}`);
      }

      const branding = await response.json();
      this.cache.set(tenantId, branding);
      return branding;
    } catch (error) {
      logger.error("Failed to get tenant branding:", error);
      return null;
    }
  }

  /**
   * Update tenant branding configuration
   */
  async updateTenantBranding(
    tenantId: string,
    updates: Partial<TenantBranding>,
    userId: string,
  ): Promise<TenantBranding> {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/branding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update branding: ${response.statusText}`);
      }

      const branding = await response.json();

      // Update cache
      this.cache.set(tenantId, branding);

      // Trigger branding change event
      this.emitBrandingChange(tenantId, branding);

      return branding;
    } catch (error) {
      logger.error("Failed to update tenant branding:", error);
      throw error;
    }
  }

  /**
   * Upload logo file
   */
  async uploadLogo(
    tenantId: string,
    file: File,
    type: "primary" | "square" | "favicon",
  ): Promise<{ url: string; storageKey: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("tenantId", tenantId);

      const response = await fetch(`/api/tenants/${tenantId}/branding/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Failed to upload logo:", error);
      throw error;
    }
  }

  /**
   * Delete logo file
   */
  async deleteLogo(tenantId: string, storageKey: string): Promise<void> {
    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/branding/upload/${encodeURIComponent(storageKey)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error("Failed to delete logo:", error);
      throw error;
    }
  }

  /**
   * Switch template for tenant
   */
  async switchTemplate(
    tenantId: string,
    templateId: TemplateId,
    userId: string,
    preserveCustomizations: boolean = true,
  ): Promise<TenantBranding> {
    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/branding/template`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId,
            userId,
            preserveCustomizations,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Template switch failed: ${response.statusText}`);
      }

      const branding = await response.json();

      // Clear cache and update
      this.cache.delete(tenantId);
      this.cache.set(tenantId, branding);

      // Emit change event
      this.emitBrandingChange(tenantId, branding);

      return branding;
    } catch (error) {
      logger.error("Failed to switch template:", error);
      throw error;
    }
  }

  /**
   * Export branding configuration
   */
  async exportBranding(tenantId: string): Promise<Blob> {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/branding/export`);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      logger.error("Failed to export branding:", error);
      throw error;
    }
  }

  /**
   * Import branding configuration
   */
  async importBranding(
    tenantId: string,
    file: File,
    userId: string,
  ): Promise<TenantBranding> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const response = await fetch(`/api/tenants/${tenantId}/branding/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const branding = await response.json();

      // Update cache
      this.cache.set(tenantId, branding);

      // Emit change event
      this.emitBrandingChange(tenantId, branding);

      return branding;
    } catch (error) {
      logger.error("Failed to import branding:", error);
      throw error;
    }
  }

  /**
   * Configure custom domain
   */
  async configureDomain(
    tenantId: string,
    domain: string,
    userId: string,
  ): Promise<{
    dnsRecords: Array<{ type: string; name: string; value: string }>;
    verificationToken: string;
  }> {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/branding/domain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Domain configuration failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Failed to configure domain:", error);
      throw error;
    }
  }

  /**
   * Verify custom domain
   */
  async verifyDomain(
    tenantId: string,
    domain: string,
  ): Promise<{ verified: boolean; errors?: string[] }> {
    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/branding/domain/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain }),
        },
      );

      if (!response.ok) {
        throw new Error(`Domain verification failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error("Failed to verify domain:", error);
      throw error;
    }
  }

  /**
   * Apply custom CSS
   */
  async applyCustomCSS(
    tenantId: string,
    css: string,
    userId: string,
  ): Promise<TenantBranding> {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/branding/css`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          css,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`CSS update failed: ${response.statusText}`);
      }

      const branding = await response.json();

      // Update cache
      this.cache.set(tenantId, branding);

      // Emit change event
      this.emitBrandingChange(tenantId, branding);

      return branding;
    } catch (error) {
      logger.error("Failed to apply custom CSS:", error);
      throw error;
    }
  }

  /**
   * Clear cache for tenant
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Emit branding change event
   */
  private emitBrandingChange(tenantId: string, branding: TenantBranding): void {
    const event = new CustomEvent("tenant-branding-changed", {
      detail: { tenantId, branding },
    });
    window.dispatchEvent(event);
  }

  /**
   * Listen to branding changes
   */
  onBrandingChange(
    callback: (tenantId: string, branding: TenantBranding) => void,
  ): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{
        tenantId: string;
        branding: TenantBranding;
      }>;
      callback(customEvent.detail.tenantId, customEvent.detail.branding);
    };

    window.addEventListener("tenant-branding-changed", handler);

    return () => {
      window.removeEventListener("tenant-branding-changed", handler);
    };
  }
}

// Singleton instance
export const tenantBrandingService = new TenantBrandingService();
