/**
 * Feature Flag System
 *
 * Toggle features dynamically without code deployment.
 * Supports environment-based, user-based, and percentage-based rollouts.
 */

"use client";

import { isDevelopment, getPublicEnv } from "@/lib/environment";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type FeatureFlagKey =
  // Experimental Features
  | "voice_messages"
  | "video_calls"
  | "screen_sharing"
  | "ai_assistant"
  | "crypto_wallet"
  | "nft_avatars"

  // Beta Features
  | "advanced_search"
  | "message_reactions"
  | "custom_emojis"
  | "polls"
  | "scheduled_messages"
  | "message_forwarding"

  // Admin Features
  | "analytics_dashboard"
  | "audit_logs"
  | "advanced_moderation"
  | "custom_integrations"

  // Performance Features
  | "lazy_load_messages"
  | "virtual_scrolling"
  | "image_optimization"
  | "web_workers"

  // Development Features
  | "debug_mode"
  | "performance_monitoring"
  | "error_logging";

export interface FeatureFlagConfig {
  /** Feature is enabled */
  enabled: boolean;

  /** Description of the feature */
  description?: string;

  /** Required user role (if any) */
  requiredRole?: "owner" | "admin" | "moderator" | "member" | "guest";

  /** Percentage rollout (0-100) */
  rolloutPercentage?: number;

  /** Only enabled in specific environments */
  environments?: Array<"development" | "staging" | "production" | "test">;

  /** User IDs to enable for (beta testers) */
  enabledForUsers?: string[];
}

export interface FeatureFlags {
  [key: string]: FeatureFlagConfig;
}

// ============================================================================
// Feature Flag Definitions
// ============================================================================

const DEFAULT_FLAGS: Record<FeatureFlagKey, FeatureFlagConfig> = {
  // Experimental Features (development only)
  voice_messages: {
    enabled: true,
    description: "Record and send voice messages",
    environments: ["development", "staging"],
  },
  video_calls: {
    enabled: true,
    description: "Video calling with WebRTC",
    environments: ["development", "staging"],
  },
  screen_sharing: {
    enabled: false,
    description: "Share screen during calls",
    environments: ["development"],
  },
  ai_assistant: {
    enabled: false,
    description: "AI-powered chat assistant",
    environments: ["development"],
  },
  crypto_wallet: {
    enabled: true,
    description: "Connect Web3 wallets",
    environments: ["development", "staging"],
  },
  nft_avatars: {
    enabled: false,
    description: "Use NFTs as profile pictures",
    environments: ["development"],
  },

  // Beta Features (gradual rollout)
  advanced_search: {
    enabled: true,
    description: "Advanced search filters and operators",
    rolloutPercentage: 50,
  },
  message_reactions: {
    enabled: true,
    description: "React to messages with emojis",
  },
  custom_emojis: {
    enabled: true,
    description: "Upload custom emoji packs",
    requiredRole: "admin",
  },
  polls: {
    enabled: true,
    description: "Create polls in channels",
  },
  scheduled_messages: {
    enabled: true,
    description: "Schedule messages for later",
  },
  message_forwarding: {
    enabled: true,
    description: "Forward messages to other channels",
  },

  // Admin Features
  analytics_dashboard: {
    enabled: true,
    description: "Usage analytics and metrics",
    requiredRole: "admin",
  },
  audit_logs: {
    enabled: true,
    description: "Security and action audit logs",
    requiredRole: "admin",
  },
  advanced_moderation: {
    enabled: true,
    description: "Advanced content moderation tools",
    requiredRole: "moderator",
  },
  custom_integrations: {
    enabled: true,
    description: "Custom webhook integrations",
    requiredRole: "admin",
  },

  // Performance Features
  lazy_load_messages: {
    enabled: true,
    description: "Lazy load messages for better performance",
  },
  virtual_scrolling: {
    enabled: true,
    description: "Virtual scrolling for large message lists",
  },
  image_optimization: {
    enabled: true,
    description: "Optimize images with AVIF/WebP",
  },
  web_workers: {
    enabled: false,
    description: "Offload heavy tasks to web workers",
  },

  // Development Features
  debug_mode: {
    enabled: true,
    description: "Show debug information",
    environments: ["development"],
  },
  performance_monitoring: {
    enabled: true,
    description: "Track performance metrics",
    environments: ["development", "staging"],
  },
  error_logging: {
    enabled: true,
    description: "Enhanced error logging",
  },
};

// ============================================================================
// Feature Flag Manager
// ============================================================================

class FeatureFlagManager {
  private flags: Record<string, FeatureFlagConfig>;
  private overrides: Map<string, boolean> = new Map();
  private userContext: { userId?: string; role?: string } = {};

  constructor(initialFlags: Record<string, FeatureFlagConfig> = {}) {
    this.flags = { ...DEFAULT_FLAGS, ...initialFlags };
    this.loadOverrides();
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(
    key: FeatureFlagKey,
    context?: { userId?: string; role?: string },
  ): boolean {
    // Check for override first (for testing)
    if (this.overrides.has(key)) {
      return this.overrides.get(key)!;
    }

    const flag = this.flags[key];
    if (!flag) {
      return false;
    }

    // Check if explicitly disabled
    if (!flag.enabled) {
      return false;
    }

    // Check environment
    const env = getPublicEnv().NEXT_PUBLIC_ENV;
    if (flag.environments && !flag.environments.includes(env)) {
      return false;
    }

    const userId = context?.userId ?? this.userContext.userId;
    const userRole = context?.role ?? this.userContext.role;

    // Check user whitelist
    if (flag.enabledForUsers && userId) {
      if (!flag.enabledForUsers.includes(userId)) {
        return false;
      }
    }

    // Check role requirement
    if (flag.requiredRole && userRole) {
      const roleHierarchy = {
        guest: 0,
        member: 1,
        moderator: 2,
        admin: 3,
        owner: 4,
      };

      const requiredLevel = roleHierarchy[flag.requiredRole];
      const userLevel =
        roleHierarchy[userRole as keyof typeof roleHierarchy] ?? 0;

      if (userLevel < requiredLevel) {
        return false;
      }
    }

    // Check percentage rollout
    if (flag.rolloutPercentage !== undefined && userId) {
      const hash = this.hashUserId(userId);
      const percentage = hash % 100;
      if (percentage >= flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Set user context for feature flag evaluation
   */
  setUserContext(userId: string, role: string): void {
    this.userContext = { userId, role };
  }

  /**
   * Override a feature flag (for testing)
   */
  override(key: FeatureFlagKey, enabled: boolean): void {
    this.overrides.set(key, enabled);
    this.saveOverrides();
  }

  /**
   * Clear override
   */
  clearOverride(key: FeatureFlagKey): void {
    this.overrides.delete(key);
    this.saveOverrides();
  }

  /**
   * Clear all overrides
   */
  clearAllOverrides(): void {
    this.overrides.clear();
    if (typeof window !== "undefined") {
      localStorage.removeItem("feature-flag-overrides");
    }
  }

  /**
   * Get all flags with their status
   */
  getAllFlags(context?: {
    userId?: string;
    role?: string;
  }): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    for (const key in this.flags) {
      result[key] = this.isEnabled(key as FeatureFlagKey, context);
    }

    return result;
  }

  /**
   * Get flag configuration
   */
  getConfig(key: FeatureFlagKey): FeatureFlagConfig | undefined {
    return this.flags[key];
  }

  /**
   * Hash user ID for consistent percentage rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Load overrides from localStorage
   */
  private loadOverrides(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("feature-flag-overrides");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.overrides = new Map(Object.entries(parsed));
      }
    } catch (error) {
      logger.error("Failed to load feature flag overrides:", error);
    }
  }

  /**
   * Save overrides to localStorage
   */
  private saveOverrides(): void {
    if (typeof window === "undefined") return;

    try {
      const obj = Object.fromEntries(this.overrides);
      localStorage.setItem("feature-flag-overrides", JSON.stringify(obj));
    } catch (error) {
      logger.error("Failed to save feature flag overrides:", error);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const featureFlags = new FeatureFlagManager();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  key: FeatureFlagKey,
  context?: { userId?: string; role?: string },
): boolean {
  return featureFlags.isEnabled(key, context);
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(context?: {
  userId?: string;
  role?: string;
}): FeatureFlagKey[] {
  const all = featureFlags.getAllFlags(context);
  return Object.entries(all)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key as FeatureFlagKey);
}

/**
 * Check if feature is in development
 */
export function isDevFeature(key: FeatureFlagKey): boolean {
  const config = featureFlags.getConfig(key);
  return config?.environments?.includes("development") ?? false;
}
