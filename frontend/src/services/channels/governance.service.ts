/**
 * Channel Governance Service
 *
 * Comprehensive governance system for channel management including:
 * - Naming policies and validation
 * - Default channel management
 * - Channel templates integration
 * - Archival policies and automation
 * - Lifecycle hooks and webhooks
 * - Governance rules and audit logging
 *
 * Phase 6: Task 63 - Channel governance and templates
 */

import type { UserRole } from "@/types/user";
import { UserRoleLevel } from "@/types/user";
import type { ChannelType } from "@/types/channel";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Naming policy configuration
 */
export interface NamingPolicy {
  /** Enforce lowercase names */
  forceLowercase: boolean;
  /** Allow only alphanumeric and hyphens */
  alphanumericOnly: boolean;
  /** Minimum name length */
  minLength: number;
  /** Maximum name length */
  maxLength: number;
  /** Reserved names that cannot be used */
  reservedNames: string[];
  /** Prefix requirements (e.g., "team-", "proj-") */
  requiredPrefix?: string;
  /** Suffix requirements */
  requiredSuffix?: string;
  /** Regex pattern for custom validation */
  customPattern?: string;
  /** Allow unicode characters */
  allowUnicode: boolean;
  /** Allow numbers at start */
  allowNumbersAtStart: boolean;
  /** Block profanity in names */
  blockProfanity: boolean;
}

/**
 * Default channel configuration
 */
export interface DefaultChannelConfig {
  /** Unique identifier */
  id: string;
  /** Channel name */
  name: string;
  /** Channel slug */
  slug: string;
  /** Channel description */
  description: string;
  /** Channel type */
  type: ChannelType;
  /** Icon for the channel */
  icon?: string;
  /** Whether channel is read-only */
  isReadonly: boolean;
  /** Whether to auto-join all users */
  autoJoin: boolean;
  /** Position in channel list */
  position: number;
  /** Category ID to place channel in */
  categoryId?: string;
}

/**
 * Archival policy configuration
 */
export interface ArchivalPolicy {
  /** Enable auto-archival */
  enabled: boolean;
  /** Days of inactivity before archival */
  inactivityDays: number;
  /** Send notification before archival */
  notifyBeforeArchival: boolean;
  /** Days before archival to send notification */
  notificationDays: number;
  /** Exclude default channels from auto-archival */
  excludeDefaultChannels: boolean;
  /** Exclude channels with minimum member count */
  excludeMinMembers: number;
  /** Channel types to exclude from auto-archival */
  excludeTypes: ChannelType[];
  /** Specific channel IDs to exclude */
  excludeChannelIds: string[];
}

/**
 * Channel creation governance rules
 */
export interface ChannelCreationRules {
  /** Minimum role to create public channels */
  minRolePublic: UserRole;
  /** Minimum role to create private channels */
  minRolePrivate: UserRole;
  /** Maximum channels per user */
  maxChannelsPerUser: number;
  /** Require approval for public channels */
  requireApprovalPublic: boolean;
  /** Require approval for private channels */
  requireApprovalPrivate: boolean;
  /** Approver roles */
  approverRoles: UserRole[];
  /** Allow channel creation cooldown (minutes) */
  creationCooldownMinutes: number;
  /** Maximum pending approvals per user */
  maxPendingApprovals: number;
}

/**
 * Lifecycle hook types
 */
export type LifecycleHookType =
  | "channel:created"
  | "channel:renamed"
  | "channel:archived"
  | "channel:unarchived"
  | "channel:deleted"
  | "channel:settings_updated"
  | "member:joined"
  | "member:left"
  | "member:role_changed";

/**
 * Lifecycle hook configuration
 */
export interface LifecycleHook {
  /** Hook identifier */
  id: string;
  /** Hook type */
  type: LifecycleHookType;
  /** Whether hook is enabled */
  enabled: boolean;
  /** Webhook URL for notifications */
  webhookUrl?: string;
  /** Custom handler function name */
  handlerName?: string;
  /** Filter by channel types */
  channelTypes?: ChannelType[];
  /** Filter by channel IDs */
  channelIds?: string[];
  /** Additional metadata to include */
  includeMetadata?: string[];
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

/**
 * Channel approval request
 */
export interface ChannelApprovalRequest {
  id: string;
  channelName: string;
  channelType: ChannelType;
  description?: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

/**
 * Governance audit entry
 */
export interface GovernanceAuditEntry {
  id: string;
  action: string;
  channelId?: string;
  channelName?: string;
  userId: string;
  userRole: UserRole;
  details: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
}

/**
 * Channel template (extended for governance)
 */
export interface GovernanceChannelTemplate {
  id: string;
  name: string;
  description: string;
  type: ChannelType;
  icon?: string;
  isDefault: boolean;
  isReadonly: boolean;
  category?: string;
  settings: {
    slowmodeSeconds: number;
    maxMembers?: number;
    retentionDays?: number;
    permissions: {
      isPublic: boolean;
      allowGuests: boolean;
      membersCanInvite: boolean;
      membersCanPost: boolean;
    };
  };
  createdBy?: string;
  createdAt?: string;
  isBuiltIn: boolean;
}

/**
 * Naming validation result
 */
export interface NamingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedName?: string;
}

/**
 * Complete governance configuration
 */
export interface GovernanceConfig {
  namingPolicy: NamingPolicy;
  defaultChannels: DefaultChannelConfig[];
  archivalPolicy: ArchivalPolicy;
  creationRules: ChannelCreationRules;
  lifecycleHooks: LifecycleHook[];
  customTemplates: GovernanceChannelTemplate[];
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default naming policy
 */
export const DEFAULT_NAMING_POLICY: NamingPolicy = {
  forceLowercase: true,
  alphanumericOnly: true,
  minLength: 2,
  maxLength: 80,
  reservedNames: [
    "admin",
    "administrator",
    "system",
    "bot",
    "help",
    "support",
    "mod",
    "moderator",
    "owner",
    "staff",
    "team",
    "api",
    "webhook",
    "null",
    "undefined",
    "true",
    "false",
    "channel",
    "channels",
    "user",
    "users",
    "message",
    "messages",
    "settings",
    "config",
    "configuration",
    "root",
    "master",
    "main",
  ],
  allowUnicode: false,
  allowNumbersAtStart: false,
  blockProfanity: true,
};

/**
 * Default channels created on workspace setup
 */
export const DEFAULT_CHANNELS: DefaultChannelConfig[] = [
  {
    id: "general",
    name: "general",
    slug: "general",
    description: "General discussion for the entire team",
    type: "public",
    icon: "MessageSquare",
    isReadonly: false,
    autoJoin: true,
    position: 0,
  },
  {
    id: "announcements",
    name: "announcements",
    slug: "announcements",
    description: "Important announcements and updates",
    type: "public",
    icon: "Megaphone",
    isReadonly: true,
    autoJoin: true,
    position: 1,
  },
  {
    id: "random",
    name: "random",
    slug: "random",
    description: "Off-topic conversations and fun",
    type: "public",
    icon: "Coffee",
    isReadonly: false,
    autoJoin: true,
    position: 2,
  },
];

/**
 * Default archival policy
 */
export const DEFAULT_ARCHIVAL_POLICY: ArchivalPolicy = {
  enabled: true,
  inactivityDays: 90,
  notifyBeforeArchival: true,
  notificationDays: 7,
  excludeDefaultChannels: true,
  excludeMinMembers: 5,
  excludeTypes: ["direct", "group_dm"],
  excludeChannelIds: [],
};

/**
 * Default creation rules
 */
export const DEFAULT_CREATION_RULES: ChannelCreationRules = {
  minRolePublic: "moderator",
  minRolePrivate: "member",
  maxChannelsPerUser: 50,
  requireApprovalPublic: false,
  requireApprovalPrivate: false,
  approverRoles: ["admin", "owner"],
  creationCooldownMinutes: 0,
  maxPendingApprovals: 5,
};

/**
 * Built-in channel templates
 */
export const BUILT_IN_TEMPLATES: GovernanceChannelTemplate[] = [
  {
    id: "team",
    name: "Team Channel",
    description: "A channel for team discussions and collaboration",
    type: "public",
    icon: "Users",
    isDefault: false,
    isReadonly: false,
    settings: {
      slowmodeSeconds: 0,
      permissions: {
        isPublic: true,
        allowGuests: false,
        membersCanInvite: true,
        membersCanPost: true,
      },
    },
    isBuiltIn: true,
  },
  {
    id: "project",
    name: "Project Channel",
    description: "A channel for project-specific discussions",
    type: "private",
    icon: "FolderKanban",
    isDefault: false,
    isReadonly: false,
    settings: {
      slowmodeSeconds: 0,
      permissions: {
        isPublic: false,
        allowGuests: false,
        membersCanInvite: false,
        membersCanPost: true,
      },
    },
    isBuiltIn: true,
  },
  {
    id: "announcements",
    name: "Announcements",
    description: "Read-only channel for important announcements",
    type: "public",
    icon: "Megaphone",
    isDefault: false,
    isReadonly: true,
    settings: {
      slowmodeSeconds: 0,
      permissions: {
        isPublic: true,
        allowGuests: true,
        membersCanInvite: false,
        membersCanPost: false,
      },
    },
    isBuiltIn: true,
  },
  {
    id: "support",
    name: "Support Channel",
    description: "A channel for help and support requests",
    type: "public",
    icon: "HelpCircle",
    isDefault: false,
    isReadonly: false,
    settings: {
      slowmodeSeconds: 30,
      retentionDays: 90,
      permissions: {
        isPublic: true,
        allowGuests: true,
        membersCanInvite: false,
        membersCanPost: true,
      },
    },
    isBuiltIn: true,
  },
  {
    id: "social",
    name: "Social / Random",
    description: "A casual space for off-topic conversations",
    type: "public",
    icon: "Coffee",
    isDefault: false,
    isReadonly: false,
    settings: {
      slowmodeSeconds: 0,
      permissions: {
        isPublic: true,
        allowGuests: true,
        membersCanInvite: true,
        membersCanPost: true,
      },
    },
    isBuiltIn: true,
  },
];

// =============================================================================
// PROFANITY LIST (Basic - can be extended)
// =============================================================================

const PROFANITY_LIST = new Set([
  "fuck",
  "shit",
  "damn",
  "ass",
  "bitch",
  "crap",
  "piss",
  "dick",
  "cock",
  "pussy",
  "bastard",
  "slut",
  "whore",
  "cunt",
  "nigger",
  "faggot",
  "retard",
]);

// =============================================================================
// GOVERNANCE SERVICE
// =============================================================================

export class GovernanceService {
  private config: GovernanceConfig;
  private auditLog: GovernanceAuditEntry[] = [];
  private approvalRequests: Map<string, ChannelApprovalRequest> = new Map();
  private userChannelCounts: Map<string, number> = new Map();
  private lastCreationTime: Map<string, number> = new Map();

  constructor(config?: Partial<GovernanceConfig>) {
    this.config = {
      namingPolicy: config?.namingPolicy || DEFAULT_NAMING_POLICY,
      defaultChannels: config?.defaultChannels || DEFAULT_CHANNELS,
      archivalPolicy: config?.archivalPolicy || DEFAULT_ARCHIVAL_POLICY,
      creationRules: config?.creationRules || DEFAULT_CREATION_RULES,
      lifecycleHooks: config?.lifecycleHooks || [],
      customTemplates: config?.customTemplates || [],
    };
  }

  // ===========================================================================
  // NAMING POLICY VALIDATION
  // ===========================================================================

  /**
   * Validate a channel name against naming policy
   */
  validateChannelName(name: string): NamingValidationResult {
    const policy = this.config.namingPolicy;
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedName = name.trim();

    // Apply lowercase if required
    if (policy.forceLowercase) {
      sanitizedName = sanitizedName.toLowerCase();
    }

    // Check length
    if (sanitizedName.length < policy.minLength) {
      errors.push(`Name must be at least ${policy.minLength} characters`);
    }
    if (sanitizedName.length > policy.maxLength) {
      errors.push(`Name must be at most ${policy.maxLength} characters`);
    }

    // Check alphanumeric
    if (policy.alphanumericOnly) {
      const alphanumericPattern = /^[a-z0-9-]+$/;
      if (!alphanumericPattern.test(sanitizedName)) {
        errors.push(
          "Name can only contain lowercase letters, numbers, and hyphens",
        );
        sanitizedName = sanitizedName
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-");
      }
    }

    // Check for numbers at start
    if (!policy.allowNumbersAtStart && /^[0-9]/.test(sanitizedName)) {
      errors.push("Name cannot start with a number");
    }

    // Check reserved names
    if (policy.reservedNames.includes(sanitizedName.toLowerCase())) {
      errors.push(`"${sanitizedName}" is a reserved name and cannot be used`);
    }

    // Check prefix requirement
    if (
      policy.requiredPrefix &&
      !sanitizedName.startsWith(policy.requiredPrefix)
    ) {
      warnings.push(`Name should start with "${policy.requiredPrefix}"`);
    }

    // Check suffix requirement
    if (
      policy.requiredSuffix &&
      !sanitizedName.endsWith(policy.requiredSuffix)
    ) {
      warnings.push(`Name should end with "${policy.requiredSuffix}"`);
    }

    // Check custom pattern
    if (policy.customPattern) {
      const customRegex = new RegExp(policy.customPattern);
      if (!customRegex.test(sanitizedName)) {
        errors.push("Name does not match required pattern");
      }
    }

    // Check profanity
    if (policy.blockProfanity) {
      const nameParts = sanitizedName.toLowerCase().split("-");
      for (const part of nameParts) {
        if (PROFANITY_LIST.has(part)) {
          errors.push("Name contains inappropriate language");
          break;
        }
      }
    }

    // Check for consecutive hyphens
    if (sanitizedName.includes("--")) {
      warnings.push("Name should not contain consecutive hyphens");
      sanitizedName = sanitizedName.replace(/-+/g, "-");
    }

    // Check for leading/trailing hyphens
    if (sanitizedName.startsWith("-") || sanitizedName.endsWith("-")) {
      warnings.push("Name should not start or end with a hyphen");
      sanitizedName = sanitizedName.replace(/^-+|-+$/g, "");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedName: errors.length === 0 ? sanitizedName : undefined,
    };
  }

  /**
   * Sanitize a channel name according to policy
   */
  sanitizeChannelName(name: string): string {
    const policy = this.config.namingPolicy;
    let sanitized = name.trim();

    if (policy.forceLowercase) {
      sanitized = sanitized.toLowerCase();
    }

    if (policy.alphanumericOnly) {
      sanitized = sanitized
        .replace(/[^a-z0-9\s-]/gi, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    }

    sanitized = sanitized
      .replace(/^-+|-+$/g, "")
      .substring(0, policy.maxLength);

    return sanitized;
  }

  /**
   * Check if a name is reserved
   */
  isReservedName(name: string): boolean {
    return this.config.namingPolicy.reservedNames.includes(name.toLowerCase());
  }

  /**
   * Generate a unique slug from a name
   */
  generateSlug(name: string, existingSlugs: string[] = []): string {
    let slug = this.sanitizeChannelName(name);

    if (!existingSlugs.includes(slug)) {
      return slug;
    }

    let counter = 1;
    let uniqueSlug = `${slug}-${counter}`;
    while (existingSlugs.includes(uniqueSlug)) {
      counter++;
      uniqueSlug = `${slug}-${counter}`;
    }

    return uniqueSlug;
  }

  // ===========================================================================
  // DEFAULT CHANNELS
  // ===========================================================================

  /**
   * Get default channel configurations
   */
  getDefaultChannels(): DefaultChannelConfig[] {
    return [...this.config.defaultChannels];
  }

  /**
   * Add a default channel configuration
   */
  addDefaultChannel(channel: DefaultChannelConfig): void {
    const existing = this.config.defaultChannels.find(
      (c) => c.id === channel.id,
    );
    if (existing) {
      throw new Error(`Default channel with ID "${channel.id}" already exists`);
    }
    this.config.defaultChannels.push(channel);
  }

  /**
   * Remove a default channel configuration
   */
  removeDefaultChannel(channelId: string): boolean {
    const index = this.config.defaultChannels.findIndex(
      (c) => c.id === channelId,
    );
    if (index === -1) return false;
    this.config.defaultChannels.splice(index, 1);
    return true;
  }

  /**
   * Update a default channel configuration
   */
  updateDefaultChannel(
    channelId: string,
    updates: Partial<DefaultChannelConfig>,
  ): boolean {
    const channel = this.config.defaultChannels.find((c) => c.id === channelId);
    if (!channel) return false;
    Object.assign(channel, updates);
    return true;
  }

  /**
   * Create workspace default channels
   */
  async createWorkspaceDefaults(
    workspaceId: string,
    createdBy: string,
    createChannel: (
      config: DefaultChannelConfig,
      workspaceId: string,
      createdBy: string,
    ) => Promise<{ id: string }>,
  ): Promise<{
    created: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const created: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const config of this.config.defaultChannels) {
      try {
        const channel = await createChannel(config, workspaceId, createdBy);
        created.push(channel.id);
        await this.triggerHook("channel:created", {
          channelId: channel.id,
          channelName: config.name,
          channelType: config.type,
          isDefault: true,
          createdBy,
          workspaceId,
        });
      } catch (error) {
        failed.push({
          id: config.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { created, failed };
  }

  // ===========================================================================
  // CHANNEL TEMPLATES
  // ===========================================================================

  /**
   * Get all templates (built-in + custom)
   */
  getTemplates(): GovernanceChannelTemplate[] {
    return [...BUILT_IN_TEMPLATES, ...this.config.customTemplates];
  }

  /**
   * Get a template by ID
   */
  getTemplateById(templateId: string): GovernanceChannelTemplate | undefined {
    return this.getTemplates().find((t) => t.id === templateId);
  }

  /**
   * Get templates by type
   */
  getTemplatesByType(type: ChannelType): GovernanceChannelTemplate[] {
    return this.getTemplates().filter((t) => t.type === type);
  }

  /**
   * Create a custom template
   */
  createTemplate(
    template: Omit<GovernanceChannelTemplate, "id" | "isBuiltIn" | "createdAt">,
  ): GovernanceChannelTemplate {
    const newTemplate: GovernanceChannelTemplate = {
      ...template,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };
    this.config.customTemplates.push(newTemplate);
    return newTemplate;
  }

  /**
   * Update a custom template
   */
  updateTemplate(
    templateId: string,
    updates: Partial<GovernanceChannelTemplate>,
  ): boolean {
    const template = this.config.customTemplates.find(
      (t) => t.id === templateId,
    );
    if (!template) return false;
    Object.assign(template, updates);
    return true;
  }

  /**
   * Delete a custom template
   */
  deleteTemplate(templateId: string): boolean {
    const index = this.config.customTemplates.findIndex(
      (t) => t.id === templateId,
    );
    if (index === -1) return false;
    this.config.customTemplates.splice(index, 1);
    return true;
  }

  /**
   * Apply a template to create channel configuration
   */
  applyTemplate(
    templateId: string,
    overrides?: { name?: string; description?: string },
  ): Omit<
    GovernanceChannelTemplate,
    "id" | "isBuiltIn" | "createdAt" | "createdBy"
  > | null {
    const template = this.getTemplateById(templateId);
    if (!template) return null;

    return {
      name: overrides?.name || template.name,
      description: overrides?.description || template.description,
      type: template.type,
      icon: template.icon,
      isDefault: template.isDefault,
      isReadonly: template.isReadonly,
      category: template.category,
      settings: { ...template.settings },
    };
  }

  // ===========================================================================
  // ARCHIVAL POLICIES
  // ===========================================================================

  /**
   * Get archival policy
   */
  getArchivalPolicy(): ArchivalPolicy {
    return { ...this.config.archivalPolicy };
  }

  /**
   * Update archival policy
   */
  updateArchivalPolicy(updates: Partial<ArchivalPolicy>): void {
    this.config.archivalPolicy = { ...this.config.archivalPolicy, ...updates };
  }

  /**
   * Check if a channel should be auto-archived
   */
  shouldAutoArchive(channel: {
    id: string;
    type: ChannelType;
    isDefault: boolean;
    memberCount: number;
    lastMessageAt?: string | null;
  }): { shouldArchive: boolean; reason?: string; daysInactive?: number } {
    const policy = this.config.archivalPolicy;

    if (!policy.enabled) {
      return { shouldArchive: false, reason: "Auto-archival is disabled" };
    }

    // Check exclusions
    if (policy.excludeDefaultChannels && channel.isDefault) {
      return { shouldArchive: false, reason: "Default channels are excluded" };
    }

    if (policy.excludeTypes.includes(channel.type)) {
      return {
        shouldArchive: false,
        reason: `Channel type "${channel.type}" is excluded`,
      };
    }

    if (policy.excludeChannelIds.includes(channel.id)) {
      return { shouldArchive: false, reason: "Channel is explicitly excluded" };
    }

    if (channel.memberCount >= policy.excludeMinMembers) {
      return {
        shouldArchive: false,
        reason: `Channel has ${channel.memberCount} members (minimum: ${policy.excludeMinMembers})`,
      };
    }

    // Check inactivity
    if (!channel.lastMessageAt) {
      return {
        shouldArchive: true,
        reason: "No messages ever sent",
        daysInactive: Infinity,
      };
    }

    const lastActivity = new Date(channel.lastMessageAt);
    const now = new Date();
    const daysInactive = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysInactive >= policy.inactivityDays) {
      return {
        shouldArchive: true,
        reason: `Inactive for ${daysInactive} days`,
        daysInactive,
      };
    }

    return { shouldArchive: false, daysInactive };
  }

  /**
   * Check if a channel should receive archive warning
   */
  shouldWarnBeforeArchive(channel: {
    id: string;
    type: ChannelType;
    isDefault: boolean;
    memberCount: number;
    lastMessageAt?: string | null;
  }): { shouldWarn: boolean; daysUntilArchive?: number } {
    const policy = this.config.archivalPolicy;

    if (!policy.notifyBeforeArchival) {
      return { shouldWarn: false };
    }

    const archiveCheck = this.shouldAutoArchive(channel);
    if (archiveCheck.shouldArchive) {
      return { shouldWarn: false }; // Already should be archived
    }

    if (archiveCheck.daysInactive === undefined) {
      return { shouldWarn: false };
    }

    const daysUntilArchive = policy.inactivityDays - archiveCheck.daysInactive;
    if (daysUntilArchive <= policy.notificationDays && daysUntilArchive > 0) {
      return { shouldWarn: true, daysUntilArchive };
    }

    return { shouldWarn: false, daysUntilArchive };
  }

  /**
   * Get channels that should be auto-archived
   */
  getChannelsToArchive(
    channels: Array<{
      id: string;
      name: string;
      type: ChannelType;
      isDefault: boolean;
      memberCount: number;
      lastMessageAt?: string | null;
    }>,
  ): Array<{ id: string; name: string; reason: string; daysInactive: number }> {
    return channels
      .map((channel) => {
        const result = this.shouldAutoArchive(channel);
        if (result.shouldArchive) {
          return {
            id: channel.id,
            name: channel.name,
            reason: result.reason || "Inactive",
            daysInactive: result.daysInactive || 0,
          };
        }
        return null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }

  // ===========================================================================
  // CHANNEL CREATION GOVERNANCE
  // ===========================================================================

  /**
   * Check if a user can create a channel
   */
  canCreateChannel(
    userRole: UserRole,
    channelType: ChannelType,
    userId: string,
  ): { allowed: boolean; reason?: string; requiresApproval?: boolean } {
    const rules = this.config.creationRules;

    // Check role permission
    const minRole =
      channelType === "public" ? rules.minRolePublic : rules.minRolePrivate;
    if (UserRoleLevel[userRole] < UserRoleLevel[minRole]) {
      return {
        allowed: false,
        reason: `Minimum role "${minRole}" required to create ${channelType} channels`,
      };
    }

    // Check channel limit
    const userChannelCount = this.userChannelCounts.get(userId) || 0;
    if (userChannelCount >= rules.maxChannelsPerUser) {
      return {
        allowed: false,
        reason: `Maximum channel limit (${rules.maxChannelsPerUser}) reached`,
      };
    }

    // Check cooldown
    if (rules.creationCooldownMinutes > 0) {
      const lastCreation = this.lastCreationTime.get(userId);
      if (lastCreation) {
        const cooldownMs = rules.creationCooldownMinutes * 60 * 1000;
        const elapsed = Date.now() - lastCreation;
        if (elapsed < cooldownMs) {
          const remainingMinutes = Math.ceil((cooldownMs - elapsed) / 60000);
          return {
            allowed: false,
            reason: `Please wait ${remainingMinutes} minutes before creating another channel`,
          };
        }
      }
    }

    // Check approval requirement
    const requiresApproval =
      (channelType === "public" && rules.requireApprovalPublic) ||
      (channelType === "private" && rules.requireApprovalPrivate);

    if (requiresApproval) {
      // Check pending approvals limit
      const pendingCount = Array.from(this.approvalRequests.values()).filter(
        (r) => r.requestedBy === userId && r.status === "pending",
      ).length;

      if (pendingCount >= rules.maxPendingApprovals) {
        return {
          allowed: false,
          reason: `Maximum pending approvals (${rules.maxPendingApprovals}) reached`,
        };
      }

      return { allowed: true, requiresApproval: true };
    }

    return { allowed: true, requiresApproval: false };
  }

  /**
   * Request approval for channel creation
   */
  requestChannelApproval(
    channelName: string,
    channelType: ChannelType,
    description: string,
    requestedBy: string,
  ): ChannelApprovalRequest {
    const request: ChannelApprovalRequest = {
      id: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channelName,
      channelType,
      description,
      requestedBy,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };

    this.approvalRequests.set(request.id, request);
    return request;
  }

  /**
   * Approve a channel creation request
   */
  approveChannelRequest(
    requestId: string,
    reviewerId: string,
    reviewerRole: UserRole,
  ): ChannelApprovalRequest | null {
    const request = this.approvalRequests.get(requestId);
    if (!request || request.status !== "pending") return null;

    if (!this.config.creationRules.approverRoles.includes(reviewerRole)) {
      throw new Error("Insufficient permissions to approve channel requests");
    }

    request.status = "approved";
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date().toISOString();

    return request;
  }

  /**
   * Reject a channel creation request
   */
  rejectChannelRequest(
    requestId: string,
    reviewerId: string,
    reviewerRole: UserRole,
    reason: string,
  ): ChannelApprovalRequest | null {
    const request = this.approvalRequests.get(requestId);
    if (!request || request.status !== "pending") return null;

    if (!this.config.creationRules.approverRoles.includes(reviewerRole)) {
      throw new Error("Insufficient permissions to reject channel requests");
    }

    request.status = "rejected";
    request.reviewedBy = reviewerId;
    request.reviewedAt = new Date().toISOString();
    request.rejectionReason = reason;

    return request;
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): ChannelApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(
      (r) => r.status === "pending",
    );
  }

  /**
   * Record a channel creation (for tracking limits)
   */
  recordChannelCreation(userId: string): void {
    const current = this.userChannelCounts.get(userId) || 0;
    this.userChannelCounts.set(userId, current + 1);
    this.lastCreationTime.set(userId, Date.now());
  }

  /**
   * Record a channel deletion (for tracking limits)
   */
  recordChannelDeletion(userId: string): void {
    const current = this.userChannelCounts.get(userId) || 0;
    if (current > 0) {
      this.userChannelCounts.set(userId, current - 1);
    }
  }

  // ===========================================================================
  // LIFECYCLE HOOKS
  // ===========================================================================

  /**
   * Register a lifecycle hook
   */
  registerHook(hook: LifecycleHook): void {
    const existing = this.config.lifecycleHooks.find((h) => h.id === hook.id);
    if (existing) {
      throw new Error(`Hook with ID "${hook.id}" already exists`);
    }
    this.config.lifecycleHooks.push(hook);
  }

  /**
   * Unregister a lifecycle hook
   */
  unregisterHook(hookId: string): boolean {
    const index = this.config.lifecycleHooks.findIndex((h) => h.id === hookId);
    if (index === -1) return false;
    this.config.lifecycleHooks.splice(index, 1);
    return true;
  }

  /**
   * Get hooks by type
   */
  getHooksByType(type: LifecycleHookType): LifecycleHook[] {
    return this.config.lifecycleHooks.filter(
      (h) => h.type === type && h.enabled,
    );
  }

  /**
   * Trigger lifecycle hooks
   */
  async triggerHook(
    type: LifecycleHookType,
    payload: Record<string, unknown>,
  ): Promise<Array<{ hookId: string; success: boolean; error?: string }>> {
    const hooks = this.getHooksByType(type);
    const results: Array<{ hookId: string; success: boolean; error?: string }> =
      [];

    for (const hook of hooks) {
      // Check filters
      if (
        hook.channelTypes &&
        payload.channelType &&
        !hook.channelTypes.includes(payload.channelType as ChannelType)
      ) {
        continue;
      }
      if (
        hook.channelIds &&
        payload.channelId &&
        !hook.channelIds.includes(payload.channelId as string)
      ) {
        continue;
      }

      try {
        if (hook.webhookUrl) {
          await this.sendWebhook(hook, type, payload);
        }
        results.push({ hookId: hook.id, success: true });
      } catch (error) {
        results.push({
          hookId: hook.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    hook: LifecycleHook,
    type: LifecycleHookType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!hook.webhookUrl) return;

    const webhookPayload = {
      event: type,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    let attempts = 0;
    const maxAttempts = hook.retry?.maxAttempts || 1;
    const delayMs = hook.retry?.delayMs || 1000;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(hook.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed with status ${response.status}`);
        }
        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================

  /**
   * Log a governance action
   */
  logAction(
    action: string,
    userId: string,
    userRole: UserRole,
    details: Record<string, unknown>,
    channelId?: string,
    channelName?: string,
  ): GovernanceAuditEntry {
    const entry: GovernanceAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      channelId,
      channelName,
      userId,
      userRole,
      details,
      timestamp: new Date().toISOString(),
    };

    this.auditLog.push(entry);

    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    return entry;
  }

  /**
   * Get audit log entries
   */
  getAuditLog(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    channelId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): GovernanceAuditEntry[] {
    let entries = [...this.auditLog];

    if (options?.action) {
      entries = entries.filter((e) => e.action === options.action);
    }
    if (options?.channelId) {
      entries = entries.filter((e) => e.channelId === options.channelId);
    }
    if (options?.userId) {
      entries = entries.filter((e) => e.userId === options.userId);
    }
    if (options?.startDate) {
      entries = entries.filter((e) => e.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      entries = entries.filter((e) => e.timestamp <= options.endDate!);
    }

    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    return entries.slice(offset, offset + limit);
  }

  // ===========================================================================
  // CONFIGURATION MANAGEMENT
  // ===========================================================================

  /**
   * Get full governance configuration
   */
  getConfig(): GovernanceConfig {
    return {
      namingPolicy: { ...this.config.namingPolicy },
      defaultChannels: [...this.config.defaultChannels],
      archivalPolicy: { ...this.config.archivalPolicy },
      creationRules: { ...this.config.creationRules },
      lifecycleHooks: [...this.config.lifecycleHooks],
      customTemplates: [...this.config.customTemplates],
    };
  }

  /**
   * Update governance configuration
   */
  updateConfig(updates: Partial<GovernanceConfig>): void {
    if (updates.namingPolicy) {
      this.config.namingPolicy = {
        ...this.config.namingPolicy,
        ...updates.namingPolicy,
      };
    }
    if (updates.defaultChannels) {
      this.config.defaultChannels = updates.defaultChannels;
    }
    if (updates.archivalPolicy) {
      this.config.archivalPolicy = {
        ...this.config.archivalPolicy,
        ...updates.archivalPolicy,
      };
    }
    if (updates.creationRules) {
      this.config.creationRules = {
        ...this.config.creationRules,
        ...updates.creationRules,
      };
    }
    if (updates.lifecycleHooks) {
      this.config.lifecycleHooks = updates.lifecycleHooks;
    }
    if (updates.customTemplates) {
      this.config.customTemplates = updates.customTemplates;
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = {
      namingPolicy: { ...DEFAULT_NAMING_POLICY },
      defaultChannels: [...DEFAULT_CHANNELS],
      archivalPolicy: { ...DEFAULT_ARCHIVAL_POLICY },
      creationRules: { ...DEFAULT_CREATION_RULES },
      lifecycleHooks: [],
      customTemplates: [],
    };
  }
}

// =============================================================================
// SINGLETON FACTORY
// =============================================================================

let governanceServiceInstance: GovernanceService | null = null;

export function getGovernanceService(
  config?: Partial<GovernanceConfig>,
): GovernanceService {
  if (!governanceServiceInstance) {
    governanceServiceInstance = new GovernanceService(config);
  }
  return governanceServiceInstance;
}

export function createGovernanceService(
  config?: Partial<GovernanceConfig>,
): GovernanceService {
  return new GovernanceService(config);
}

export function resetGovernanceService(): void {
  governanceServiceInstance = null;
}
