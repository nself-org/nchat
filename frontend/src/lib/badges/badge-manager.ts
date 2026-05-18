/**
 * Badge Manager
 *
 * Handles badge assignment, validation, and management for users.
 */

import {
  Badge,
  BadgeId,
  UserBadge,
  BadgeCategory,
  BADGE_DEFINITIONS,
  getBadge,
  getBadgesSortedByPriority,
  roleToBadge,
  idmeGroupToBadge,
} from "./badge-types";
import type { AuthUser } from "@/services/auth/auth-plugin.interface";
import type { IdMeGroup } from "@/services/auth/providers/idme.provider";

import { logger } from "@/lib/logger";

// Storage key for user badges
const BADGES_STORAGE_KEY = "nchat-user-badges";

/**
 * Badge assignment rules
 */
export interface BadgeRule {
  id: string;
  name: string;
  description: string;
  condition: (user: AuthUser, context?: BadgeRuleContext) => boolean;
  badge: BadgeId;
  autoAssign: boolean;
  autoRemove: boolean;
}

export interface BadgeRuleContext {
  idmeGroups?: IdMeGroup[];
  registrationDate?: Date;
  messageCount?: number;
  reactionCount?: number;
  channelCount?: number;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isPremium?: boolean;
  isSponsor?: boolean;
  customData?: Record<string, unknown>;
}

/**
 * Built-in badge assignment rules
 */
export const BADGE_RULES: BadgeRule[] = [
  // Role-based rules
  {
    id: "owner-role",
    name: "Owner Badge",
    description: "Assign owner badge to workspace owners",
    condition: (user) => user.role === "owner",
    badge: "owner",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "admin-role",
    name: "Admin Badge",
    description: "Assign admin badge to administrators",
    condition: (user) => user.role === "admin",
    badge: "admin",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "moderator-role",
    name: "Moderator Badge",
    description: "Assign moderator badge to moderators",
    condition: (user) => user.role === "moderator",
    badge: "moderator",
    autoAssign: true,
    autoRemove: true,
  },

  // Verification rules
  {
    id: "email-verified",
    name: "Verified Badge",
    description: "Assign verified badge to users with verified email",
    condition: (user, ctx) =>
      user.emailVerified === true || ctx?.isEmailVerified === true,
    badge: "verified",
    autoAssign: true,
    autoRemove: true,
  },

  // ID.me rules
  {
    id: "idme-military",
    name: "Military Badge",
    description: "Assign military badge to verified military members",
    condition: (_, ctx) => ctx?.idmeGroups?.includes("military") ?? false,
    badge: "military",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "idme-veteran",
    name: "Veteran Badge",
    description: "Assign veteran badge to verified veterans",
    condition: (_, ctx) => ctx?.idmeGroups?.includes("veteran") ?? false,
    badge: "veteran",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "idme-first-responder",
    name: "First Responder Badge",
    description: "Assign first responder badge",
    condition: (_, ctx) =>
      ctx?.idmeGroups?.includes("first-responder") ?? false,
    badge: "firstResponder",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "idme-government",
    name: "Government Badge",
    description: "Assign government badge to verified government employees",
    condition: (_, ctx) => ctx?.idmeGroups?.includes("government") ?? false,
    badge: "government",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "idme-nurse",
    name: "Healthcare Badge",
    description: "Assign healthcare badge to verified healthcare workers",
    condition: (_, ctx) =>
      (ctx?.idmeGroups?.includes("nurse") ||
        ctx?.idmeGroups?.includes("hospital")) ??
      false,
    badge: "nurse",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "idme-teacher",
    name: "Educator Badge",
    description: "Assign educator badge to verified teachers",
    condition: (_, ctx) => ctx?.idmeGroups?.includes("teacher") ?? false,
    badge: "teacher",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "idme-student",
    name: "Student Badge",
    description: "Assign student badge to verified students",
    condition: (_, ctx) => ctx?.idmeGroups?.includes("student") ?? false,
    badge: "student",
    autoAssign: true,
    autoRemove: true,
  },

  // Membership rules
  {
    id: "premium-member",
    name: "Premium Badge",
    description: "Assign premium badge to premium subscribers",
    condition: (_, ctx) => ctx?.isPremium === true,
    badge: "premium",
    autoAssign: true,
    autoRemove: true,
  },
  {
    id: "sponsor-member",
    name: "Sponsor Badge",
    description: "Assign sponsor badge to sponsors",
    condition: (_, ctx) => ctx?.isSponsor === true,
    badge: "sponsor",
    autoAssign: true,
    autoRemove: true,
  },

  // Achievement rules (examples - can be customized)
  {
    id: "early-adopter",
    name: "Early Adopter Badge",
    description:
      "Assign early adopter badge to users who registered before a certain date",
    condition: (_, ctx) => {
      if (!ctx?.registrationDate) return false;
      const cutoffDate = new Date("2025-12-31");
      return ctx.registrationDate < cutoffDate;
    },
    badge: "earlyAdopter",
    autoAssign: true,
    autoRemove: false, // Once earned, keep forever
  },
];

/**
 * Badge Manager class
 */
export class BadgeManager {
  private userBadges: Map<string, UserBadge[]> = new Map();
  private customRules: BadgeRule[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Get all badges for a user
   */
  getUserBadges(userId: string): UserBadge[] {
    return this.userBadges.get(userId) || [];
  }

  /**
   * Get sorted badges for display
   */
  getDisplayBadges(userId: string, maxBadges?: number): UserBadge[] {
    const badges = this.getUserBadges(userId).filter((b) => b.visible);
    const sorted = getBadgesSortedByPriority(badges) as UserBadge[];
    return maxBadges ? sorted.slice(0, maxBadges) : sorted;
  }

  /**
   * Check if user has a specific badge
   */
  hasBadge(userId: string, badgeId: BadgeId): boolean {
    return this.getUserBadges(userId).some((b) => b.id === badgeId);
  }

  /**
   * Assign a badge to a user
   */
  assignBadge(
    userId: string,
    badgeId: BadgeId,
    options?: {
      assignedBy?: string;
      reason?: string;
      expiresAt?: Date;
    },
  ): UserBadge | null {
    const badge = getBadge(badgeId);
    if (!badge) {
      logger.error(`Badge not found: ${badgeId}`);
      return null;
    }

    // Check if badge already exists and is not stackable
    if (!badge.stackable && this.hasBadge(userId, badgeId)) {
      return null;
    }

    const userBadge: UserBadge = {
      ...badge,
      assignedAt: new Date(),
      assignedBy: options?.assignedBy,
      reason: options?.reason,
      expiresAt: options?.expiresAt,
    };

    const userBadges = this.userBadges.get(userId) || [];
    userBadges.push(userBadge);
    this.userBadges.set(userId, userBadges);
    this.saveToStorage();

    return userBadge;
  }

  /**
   * Remove a badge from a user
   */
  removeBadge(userId: string, badgeId: BadgeId): boolean {
    const userBadges = this.userBadges.get(userId) || [];
    const index = userBadges.findIndex((b) => b.id === badgeId);

    if (index === -1) {
      return false;
    }

    userBadges.splice(index, 1);
    this.userBadges.set(userId, userBadges);
    this.saveToStorage();

    return true;
  }

  /**
   * Process badge rules for a user
   */
  processRules(user: AuthUser, context?: BadgeRuleContext): UserBadge[] {
    const allRules = [...BADGE_RULES, ...this.customRules];
    const assignedBadges: UserBadge[] = [];

    for (const rule of allRules) {
      const shouldHaveBadge = rule.condition(user, context);
      const hasBadge = this.hasBadge(user.id, rule.badge);

      if (shouldHaveBadge && !hasBadge && rule.autoAssign) {
        const badge = this.assignBadge(user.id, rule.badge, {
          reason: rule.description,
        });
        if (badge) {
          assignedBadges.push(badge);
        }
      } else if (!shouldHaveBadge && hasBadge && rule.autoRemove) {
        this.removeBadge(user.id, rule.badge);
      }
    }

    return assignedBadges;
  }

  /**
   * Process ID.me verification and assign appropriate badges
   */
  processIdMeVerification(userId: string, groups: IdMeGroup[]): UserBadge[] {
    const assignedBadges: UserBadge[] = [];

    for (const group of groups) {
      const badgeId = idmeGroupToBadge[group];
      if (badgeId && !this.hasBadge(userId, badgeId)) {
        const badge = this.assignBadge(userId, badgeId, {
          reason: `Verified via ID.me as ${group}`,
        });
        if (badge) {
          assignedBadges.push(badge);
        }
      }
    }

    return assignedBadges;
  }

  /**
   * Process user role and assign role badge
   */
  processUserRole(userId: string, role: AuthUser["role"]): UserBadge | null {
    const badgeId = roleToBadge[role];
    if (!badgeId) return null;

    // Remove old role badges first
    const roleBadges = Object.values(roleToBadge) as BadgeId[];
    for (const oldBadgeId of roleBadges) {
      if (oldBadgeId !== badgeId) {
        this.removeBadge(userId, oldBadgeId);
      }
    }

    // Assign new role badge
    if (!this.hasBadge(userId, badgeId)) {
      return this.assignBadge(userId, badgeId, {
        reason: `Assigned role: ${role}`,
      });
    }

    return null;
  }

  /**
   * Add a custom badge rule
   */
  addRule(rule: BadgeRule): void {
    this.customRules.push(rule);
  }

  /**
   * Remove a custom badge rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.customRules.findIndex((r) => r.id === ruleId);
    if (index === -1) return false;
    this.customRules.splice(index, 1);
    return true;
  }

  /**
   * Get badges by category for a user
   */
  getBadgesByCategory(userId: string, category: BadgeCategory): UserBadge[] {
    return this.getUserBadges(userId).filter((b) => b.category === category);
  }

  /**
   * Clear all badges for a user
   */
  clearUserBadges(userId: string): void {
    this.userBadges.delete(userId);
    this.saveToStorage();
  }

  /**
   * Check and remove expired badges
   */
  cleanExpiredBadges(): number {
    let removedCount = 0;
    const now = new Date();

    for (const [userId, badges] of this.userBadges) {
      const validBadges = badges.filter((b) => {
        if (b.expiresAt && b.expiresAt < now) {
          removedCount++;
          return false;
        }
        return true;
      });

      if (validBadges.length !== badges.length) {
        this.userBadges.set(userId, validBadges);
      }
    }

    if (removedCount > 0) {
      this.saveToStorage();
    }

    return removedCount;
  }

  /**
   * Get primary badge for a user (highest priority)
   */
  getPrimaryBadge(userId: string): UserBadge | null {
    const badges = this.getDisplayBadges(userId, 1);
    return badges[0] || null;
  }

  /**
   * Export all badges for backup
   */
  exportBadges(): Record<string, UserBadge[]> {
    const result: Record<string, UserBadge[]> = {};
    for (const [userId, badges] of this.userBadges) {
      result[userId] = badges;
    }
    return result;
  }

  /**
   * Import badges from backup
   */
  importBadges(data: Record<string, UserBadge[]>): void {
    for (const [userId, badges] of Object.entries(data)) {
      this.userBadges.set(userId, badges);
    }
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(BADGES_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [userId, badges] of Object.entries(data)) {
          // Rehydrate Date objects
          const hydratedBadges = (badges as UserBadge[]).map((b) => ({
            ...b,
            assignedAt: new Date(b.assignedAt),
            expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
          }));
          this.userBadges.set(userId, hydratedBadges);
        }
      }
    } catch (error) {
      logger.error("Failed to load badges from storage:", error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const data: Record<string, UserBadge[]> = {};
      for (const [userId, badges] of this.userBadges) {
        data[userId] = badges;
      }
      localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error("Failed to save badges to storage:", error);
    }
  }
}

// Singleton instance
export const badgeManager = new BadgeManager();

export default badgeManager;
