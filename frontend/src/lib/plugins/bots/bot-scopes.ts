/**
 * Bot Scope Management
 *
 * Granular scope definitions, scope validation, scope inheritance,
 * and scope escalation prevention. Ensures bots can never exceed
 * their granted permissions.
 */

import type { AppScope } from "../app-contract";
import { hasScope, expandScopes } from "../app-contract";
import { generateId } from "../app-lifecycle";
import type {
  BotScopeGrant,
  BotCapability,
  BotCapabilityPreset,
  BotInstallation,
} from "./types";
import { CAPABILITY_PRESET_SCOPES, MAX_SCOPE_GRANTS } from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class BotScopeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 403,
  ) {
    super(message);
    this.name = "BotScopeError";
  }
}

// ============================================================================
// SCOPE VALIDATOR
// ============================================================================

export class BotScopeValidator {
  /**
   * Check whether a bot installation has a specific scope.
   */
  hasScope(
    installation: BotInstallation,
    requiredScope: AppScope,
    channelId?: string,
  ): boolean {
    for (const grant of installation.scopeGrants) {
      // Check if the grant matches the required scope
      const grantedScopes = expandScopes([grant.scope]);
      if (!hasScope(grantedScopes, requiredScope)) {
        continue;
      }

      // If the grant has channel restrictions, check them
      if (grant.channelIds && grant.channelIds.length > 0 && channelId) {
        if (!grant.channelIds.includes(channelId)) {
          continue;
        }
      }

      return true;
    }
    return false;
  }

  /**
   * Check whether a bot installation has all required scopes.
   */
  hasAllScopes(
    installation: BotInstallation,
    requiredScopes: AppScope[],
    channelId?: string,
  ): boolean {
    return requiredScopes.every((scope) =>
      this.hasScope(installation, scope, channelId),
    );
  }

  /**
   * Validate that a requested scope set doesn't escalate beyond allowed scopes.
   * Returns the list of scopes that would be escalations.
   */
  findEscalations(
    currentGrants: BotScopeGrant[],
    requestedScopes: AppScope[],
  ): AppScope[] {
    const escalations: AppScope[] = [];
    const currentScopes = currentGrants.map((g) => g.scope);
    const expandedCurrent = expandScopes(currentScopes);

    for (const requested of requestedScopes) {
      if (!hasScope(expandedCurrent, requested)) {
        escalations.push(requested);
      }
    }

    return escalations;
  }

  /**
   * Validate that new scope grants don't exceed the app's manifest scopes.
   */
  validateAgainstManifest(
    requestedScopes: AppScope[],
    manifestScopes: AppScope[],
  ): { valid: boolean; violations: AppScope[] } {
    const expandedManifest = expandScopes(manifestScopes);
    const violations: AppScope[] = [];

    for (const scope of requestedScopes) {
      if (!hasScope(expandedManifest, scope)) {
        violations.push(scope);
      }
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Get the effective scopes for a bot installation (after expansion).
   */
  getEffectiveScopes(installation: BotInstallation): AppScope[] {
    const scopes = installation.scopeGrants.map((g) => g.scope);
    return expandScopes(scopes);
  }

  /**
   * Get scopes effective for a specific channel.
   */
  getChannelScopes(
    installation: BotInstallation,
    channelId: string,
  ): AppScope[] {
    const channelGrants = installation.scopeGrants.filter((grant) => {
      // Include grants with no channel restriction or grants that include this channel
      return (
        !grant.channelIds ||
        grant.channelIds.length === 0 ||
        grant.channelIds.includes(channelId)
      );
    });

    const scopes = channelGrants.map((g) => g.scope);
    return expandScopes(scopes);
  }
}

// ============================================================================
// SCOPE MANAGER
// ============================================================================

export class BotScopeManager {
  private validator = new BotScopeValidator();

  /**
   * Create scope grants from a capability preset.
   */
  createGrantsFromPreset(
    preset: BotCapabilityPreset,
    grantedBy: string,
    channelIds?: string[],
  ): BotScopeGrant[] {
    const scopes = CAPABILITY_PRESET_SCOPES[preset];
    return scopes.map((scope) =>
      this.createGrant(scope, grantedBy, channelIds),
    );
  }

  /**
   * Create a single scope grant.
   */
  createGrant(
    scope: AppScope,
    grantedBy: string,
    channelIds?: string[],
    grantedAtInstall: boolean = true,
  ): BotScopeGrant {
    return {
      scope,
      channelIds,
      grantedAtInstall,
      grantedBy,
      grantedAt: new Date().toISOString(),
    };
  }

  /**
   * Grant additional scopes to a bot installation.
   * Validates against manifest scopes and prevents escalation.
   */
  grantScopes(
    installation: BotInstallation,
    newScopes: AppScope[],
    manifestScopes: AppScope[],
    grantedBy: string,
    channelIds?: string[],
  ): BotScopeGrant[] {
    // Validate against manifest
    const validation = this.validator.validateAgainstManifest(
      newScopes,
      manifestScopes,
    );
    if (!validation.valid) {
      throw new BotScopeError(
        `Scopes exceed manifest declaration: ${validation.violations.join(", ")}`,
        "SCOPE_EXCEEDS_MANIFEST",
      );
    }

    // Check grant limit
    if (installation.scopeGrants.length + newScopes.length > MAX_SCOPE_GRANTS) {
      throw new BotScopeError(
        `Cannot exceed ${MAX_SCOPE_GRANTS} scope grants per installation`,
        "SCOPE_LIMIT_EXCEEDED",
      );
    }

    const newGrants: BotScopeGrant[] = [];
    for (const scope of newScopes) {
      // Skip if already granted
      const alreadyGranted = installation.scopeGrants.some(
        (g) =>
          g.scope === scope && this.channelSetsMatch(g.channelIds, channelIds),
      );
      if (alreadyGranted) continue;

      const grant = this.createGrant(scope, grantedBy, channelIds, false);
      installation.scopeGrants.push(grant);
      newGrants.push(grant);
    }

    return newGrants;
  }

  /**
   * Revoke specific scopes from a bot installation.
   */
  revokeScopes(
    installation: BotInstallation,
    scopesToRevoke: AppScope[],
  ): AppScope[] {
    const revoked: AppScope[] = [];
    installation.scopeGrants = installation.scopeGrants.filter((grant) => {
      if (scopesToRevoke.includes(grant.scope)) {
        revoked.push(grant.scope);
        return false;
      }
      return true;
    });
    return revoked;
  }

  /**
   * Restrict scopes to specific channels.
   */
  restrictToChannels(
    installation: BotInstallation,
    channelIds: string[],
  ): void {
    for (const grant of installation.scopeGrants) {
      grant.channelIds = channelIds;
    }
  }

  /**
   * Remove channel restrictions from scopes.
   */
  removeChannelRestrictions(installation: BotInstallation): void {
    for (const grant of installation.scopeGrants) {
      grant.channelIds = undefined;
    }
  }

  /**
   * Validate a bot action against its scopes.
   * Throws if the bot doesn't have the required scope.
   */
  enforceScope(
    installation: BotInstallation,
    requiredScope: AppScope,
    channelId?: string,
  ): void {
    if (!this.validator.hasScope(installation, requiredScope, channelId)) {
      throw new BotScopeError(
        `Bot lacks required scope "${requiredScope}"${channelId ? ` for channel ${channelId}` : ""}`,
        "INSUFFICIENT_SCOPE",
      );
    }
  }

  /**
   * Enforce multiple scopes at once.
   */
  enforceAllScopes(
    installation: BotInstallation,
    requiredScopes: AppScope[],
    channelId?: string,
  ): void {
    if (!this.validator.hasAllScopes(installation, requiredScopes, channelId)) {
      const missing = requiredScopes.filter(
        (s) => !this.validator.hasScope(installation, s, channelId),
      );
      throw new BotScopeError(
        `Bot lacks required scopes: ${missing.join(", ")}`,
        "INSUFFICIENT_SCOPE",
      );
    }
  }

  /**
   * Build capabilities list from current scope grants.
   */
  buildCapabilities(installation: BotInstallation): BotCapability[] {
    const capabilities: BotCapability[] = [];
    const effectiveScopes = this.validator.getEffectiveScopes(installation);

    // Map scopes to capabilities
    const capabilityMap: Array<{
      name: string;
      description: string;
      scopes: AppScope[];
    }> = [
      {
        name: "Read Messages",
        description: "Read messages in channels",
        scopes: ["read:messages"],
      },
      {
        name: "Send Messages",
        description: "Send messages to channels",
        scopes: ["write:messages"],
      },
      {
        name: "Delete Messages",
        description: "Delete messages",
        scopes: ["delete:messages"],
      },
      {
        name: "Read Channels",
        description: "List and read channel information",
        scopes: ["read:channels"],
      },
      {
        name: "Manage Channels",
        description: "Create and modify channels",
        scopes: ["write:channels"],
      },
      {
        name: "Read Users",
        description: "Read user profiles",
        scopes: ["read:users"],
      },
      {
        name: "Manage Reactions",
        description: "Add and manage reactions",
        scopes: ["write:reactions"],
      },
      {
        name: "Upload Files",
        description: "Upload and manage files",
        scopes: ["write:files"],
      },
      {
        name: "Manage Threads",
        description: "Create and manage threads",
        scopes: ["write:threads"],
      },
      {
        name: "Admin Moderation",
        description: "Moderate content",
        scopes: ["admin:moderation"],
      },
    ];

    for (const cap of capabilityMap) {
      const active = cap.scopes.every((s) => hasScope(effectiveScopes, s));
      capabilities.push({
        name: cap.name,
        description: cap.description,
        requiredScopes: cap.scopes,
        active,
      });
    }

    return capabilities;
  }

  /**
   * Get the validator instance.
   */
  getValidator(): BotScopeValidator {
    return this.validator;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private channelSetsMatch(a?: string[], b?: string[]): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
  }
}
