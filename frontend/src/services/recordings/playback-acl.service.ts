/**
 * Playback ACL Service
 *
 * Manages recording access control:
 * - Only participants by default
 * - Share with specific users
 * - Public link option
 * - Expiring share links
 * - Download permissions
 *
 * @module services/recordings/playback-acl.service
 */

import { createHash, randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import type {
  Recording,
  RecordingVisibility,
  SharePermission,
  PlaybackACL,
  ShareLink,
  ShareAccessLog,
  AccessRequest,
} from "./types";
import {
  RecordingAccessDeniedError,
  ShareLinkError,
  RecordingNotFoundError,
} from "./types";
import {
  getRecordingPipeline,
  RecordingPipelineService,
} from "./recording-pipeline.service";

// ============================================================================
// Types
// ============================================================================

interface ACLStore {
  acls: Map<string, PlaybackACL>;
  shareLinks: Map<string, ShareLink>;
  accessRequests: Map<string, AccessRequest>;
  accessLogs: Map<string, ShareAccessLog[]>;
}

interface ACLConfig {
  defaultVisibility: RecordingVisibility;
  maxShareLinksPerRecording: number;
  defaultLinkExpiryDays: number;
  maxViewsPerLink: number;
  requirePasswordForPublic: boolean;
  allowDownloadByDefault: boolean;
}

// ============================================================================
// Playback ACL Service
// ============================================================================

export class PlaybackACLService {
  private store: ACLStore;
  private config: ACLConfig;
  private pipeline: RecordingPipelineService;

  constructor(
    customConfig?: Partial<ACLConfig>,
    pipelineInstance?: RecordingPipelineService,
  ) {
    this.store = {
      acls: new Map(),
      shareLinks: new Map(),
      accessRequests: new Map(),
      accessLogs: new Map(),
    };

    this.config = {
      defaultVisibility: customConfig?.defaultVisibility ?? "participants",
      maxShareLinksPerRecording: customConfig?.maxShareLinksPerRecording ?? 10,
      defaultLinkExpiryDays: customConfig?.defaultLinkExpiryDays ?? 7,
      maxViewsPerLink: customConfig?.maxViewsPerLink ?? 100,
      requirePasswordForPublic: customConfig?.requirePasswordForPublic ?? false,
      allowDownloadByDefault: customConfig?.allowDownloadByDefault ?? true,
    };

    this.pipeline = pipelineInstance ?? getRecordingPipeline();
  }

  // ==========================================================================
  // Access Control
  // ==========================================================================

  /**
   * Check if a user has access to a recording
   */
  async checkAccess(
    recordingId: string,
    userId: string,
    requiredPermission: SharePermission = "view",
  ): Promise<boolean> {
    try {
      const recording = await this.pipeline.getRecording(recordingId);
      return this.hasAccess(recording, userId, requiredPermission);
    } catch (error) {
      if (error instanceof RecordingNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if user has specific access
   */
  private hasAccess(
    recording: Recording,
    userId: string,
    requiredPermission: SharePermission,
  ): boolean {
    // Owner always has access
    if (recording.recordedBy === userId) {
      return true;
    }

    // Check visibility
    switch (recording.visibility) {
      case "public":
        return true;

      case "workspace":
        // In production, check workspace membership
        return true;

      case "channel":
        // In production, check channel membership
        return true;

      case "participants":
        const isParticipant = recording.metadata.participants.some(
          (p) => p.userId === userId,
        );
        if (isParticipant) return true;
        break;

      case "private":
        break;
    }

    // Check explicit ACL
    if (recording.allowedUserIds.includes(userId)) {
      return true;
    }

    // Check ACL entries
    for (const acl of this.store.acls.values()) {
      if (
        acl.recordingId === recording.id &&
        acl.userId === userId &&
        acl.isActive &&
        acl.permissions.includes(requiredPermission)
      ) {
        // Check expiry
        if (!acl.expiresAt || new Date(acl.expiresAt) > new Date()) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get user's permissions for a recording
   */
  async getPermissions(
    recordingId: string,
    userId: string,
  ): Promise<SharePermission[]> {
    const recording = await this.pipeline.getRecording(recordingId);

    // Owner has all permissions
    if (recording.recordedBy === userId) {
      return ["view", "download", "share", "edit", "delete"];
    }

    const permissions: Set<SharePermission> = new Set();

    // Check visibility-based permissions
    switch (recording.visibility) {
      case "public":
        permissions.add("view");
        if (this.config.allowDownloadByDefault) {
          permissions.add("download");
        }
        break;

      case "workspace":
      case "channel":
      case "participants":
        const hasDefaultAccess = this.hasAccess(recording, userId, "view");
        if (hasDefaultAccess) {
          permissions.add("view");
          if (this.config.allowDownloadByDefault) {
            permissions.add("download");
          }
        }
        break;
    }

    // Add explicit ACL permissions
    for (const acl of this.store.acls.values()) {
      if (
        acl.recordingId === recordingId &&
        acl.userId === userId &&
        acl.isActive
      ) {
        if (!acl.expiresAt || new Date(acl.expiresAt) > new Date()) {
          acl.permissions.forEach((p) => permissions.add(p));
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Require access to recording
   */
  async requireAccess(
    recordingId: string,
    userId: string,
    permission: SharePermission = "view",
  ): Promise<Recording> {
    const recording = await this.pipeline.getRecording(recordingId);

    if (!this.hasAccess(recording, userId, permission)) {
      throw new RecordingAccessDeniedError(recordingId, userId);
    }

    return recording;
  }

  // ==========================================================================
  // Visibility Management
  // ==========================================================================

  /**
   * Update recording visibility
   */
  async setVisibility(
    recordingId: string,
    visibility: RecordingVisibility,
    userId: string,
  ): Promise<void> {
    const recording = await this.requireAccess(recordingId, userId, "edit");

    // Validate visibility change
    if (visibility === "public" && this.config.requirePasswordForPublic) {
      throw new ShareLinkError("Public recordings require a password");
    }

    (recording as any).visibility = visibility;
    (recording as any).updatedAt = new Date().toISOString();

    await this.pipeline.emitEvent("acl.updated", recording, userId, {
      visibility,
      previousVisibility: recording.visibility,
    });

    logger.info("Recording visibility updated", {
      recordingId,
      visibility,
      userId,
    });
  }

  // ==========================================================================
  // ACL Management
  // ==========================================================================

  /**
   * Grant access to a user
   */
  async grantAccess(
    recordingId: string,
    targetUserId: string,
    permissions: SharePermission[],
    grantedBy: string,
    options: {
      expiresAt?: string;
    } = {},
  ): Promise<PlaybackACL> {
    await this.requireAccess(recordingId, grantedBy, "share");

    const acl: PlaybackACL = {
      id: crypto.randomUUID(),
      recordingId,
      userId: targetUserId,
      permissions,
      grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt: options.expiresAt,
      isActive: true,
      accessCount: 0,
    };

    this.store.acls.set(acl.id, acl);

    // Update recording's allowed users
    const recording = await this.pipeline.getRecording(recordingId);
    if (!recording.allowedUserIds.includes(targetUserId)) {
      recording.allowedUserIds.push(targetUserId);
    }

    await this.pipeline.emitEvent("acl.updated", recording, grantedBy, {
      action: "grant",
      targetUserId,
      permissions,
    });

    logger.info("Access granted", {
      recordingId,
      targetUserId,
      permissions,
      grantedBy,
    });

    return acl;
  }

  /**
   * Revoke access from a user
   */
  async revokeAccess(
    recordingId: string,
    targetUserId: string,
    revokedBy: string,
  ): Promise<void> {
    await this.requireAccess(recordingId, revokedBy, "share");

    // Deactivate all ACLs for this user
    for (const [aclId, acl] of this.store.acls) {
      if (acl.recordingId === recordingId && acl.userId === targetUserId) {
        acl.isActive = false;
        this.store.acls.set(aclId, acl);
      }
    }

    // Remove from allowed users
    const recording = await this.pipeline.getRecording(recordingId);
    recording.allowedUserIds = recording.allowedUserIds.filter(
      (id) => id !== targetUserId,
    );

    await this.pipeline.emitEvent("acl.updated", recording, revokedBy, {
      action: "revoke",
      targetUserId,
    });

    logger.info("Access revoked", {
      recordingId,
      targetUserId,
      revokedBy,
    });
  }

  /**
   * Get all ACLs for a recording
   */
  async getACLs(recordingId: string): Promise<PlaybackACL[]> {
    const acls: PlaybackACL[] = [];
    for (const acl of this.store.acls.values()) {
      if (acl.recordingId === recordingId) {
        acls.push(acl);
      }
    }
    return acls.sort(
      (a, b) =>
        new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
    );
  }

  // ==========================================================================
  // Share Links
  // ==========================================================================

  /**
   * Create a share link
   */
  async createShareLink(
    recordingId: string,
    createdBy: string,
    options: {
      permissions?: SharePermission[];
      expiresAt?: string;
      maxViews?: number;
      password?: string;
      requireAuth?: boolean;
      allowedDomains?: string[];
      allowedEmails?: string[];
    } = {},
  ): Promise<ShareLink> {
    await this.requireAccess(recordingId, createdBy, "share");

    // Check link limit
    const existingLinks = await this.getShareLinks(recordingId);
    const activeLinks = existingLinks.filter((l) => l.isActive);
    if (activeLinks.length >= this.config.maxShareLinksPerRecording) {
      throw new ShareLinkError(
        "Maximum share links reached for this recording",
      );
    }

    // Generate token
    const token = randomBytes(32).toString("hex");

    // Calculate default expiry
    let expiresAt = options.expiresAt;
    if (!expiresAt && this.config.defaultLinkExpiryDays > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + this.config.defaultLinkExpiryDays);
      expiresAt = expiry.toISOString();
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (options.password) {
      hashedPassword = createHash("sha256")
        .update(options.password)
        .digest("hex");
    }

    const shareLink: ShareLink = {
      id: crypto.randomUUID(),
      recordingId,
      token,
      createdBy,
      createdAt: new Date().toISOString(),
      expiresAt,
      maxViews: options.maxViews ?? this.config.maxViewsPerLink,
      viewCount: 0,
      permissions: options.permissions ?? ["view"],
      password: hashedPassword,
      isActive: true,
      allowedDomains: options.allowedDomains,
      allowedEmails: options.allowedEmails,
      requireAuth: options.requireAuth ?? false,
      accessLog: [],
    };

    this.store.shareLinks.set(shareLink.id, shareLink);

    // Update recording's share links
    const recording = await this.pipeline.getRecording(recordingId);
    recording.shareLinks.push(shareLink);

    await this.pipeline.emitEvent("share.created", recording, createdBy, {
      shareId: shareLink.id,
      hasPassword: !!options.password,
      expiresAt,
    });

    logger.info("Share link created", {
      recordingId,
      shareId: shareLink.id,
      createdBy,
      expiresAt,
    });

    return shareLink;
  }

  /**
   * Get share link by token
   */
  async getShareLinkByToken(token: string): Promise<ShareLink | null> {
    for (const link of this.store.shareLinks.values()) {
      if (link.token === token) {
        return link;
      }
    }
    return null;
  }

  /**
   * Get share link by ID
   */
  async getShareLink(linkId: string): Promise<ShareLink | null> {
    return this.store.shareLinks.get(linkId) || null;
  }

  /**
   * Get all share links for a recording
   */
  async getShareLinks(recordingId: string): Promise<ShareLink[]> {
    const links: ShareLink[] = [];
    for (const link of this.store.shareLinks.values()) {
      if (link.recordingId === recordingId) {
        links.push(link);
      }
    }
    return links.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Validate share link access
   */
  async validateShareLink(
    token: string,
    options: {
      password?: string;
      email?: string;
      domain?: string;
      userId?: string;
      ip?: string;
      userAgent?: string;
    } = {},
  ): Promise<{ valid: boolean; link?: ShareLink; error?: string }> {
    const link = await this.getShareLinkByToken(token);

    if (!link) {
      return { valid: false, error: "Share link not found" };
    }

    if (!link.isActive) {
      return { valid: false, error: "Share link is inactive" };
    }

    // Check expiry
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      link.isActive = false;
      this.store.shareLinks.set(link.id, link);
      return { valid: false, error: "Share link has expired" };
    }

    // Check view limit
    if (link.maxViews && link.viewCount >= link.maxViews) {
      link.isActive = false;
      this.store.shareLinks.set(link.id, link);
      return { valid: false, error: "Share link view limit reached" };
    }

    // Check password
    if (link.password) {
      if (!options.password) {
        return { valid: false, error: "Password required" };
      }
      const hashedInput = createHash("sha256")
        .update(options.password)
        .digest("hex");
      if (hashedInput !== link.password) {
        this.logAccess(link.id, options, "view", false, "Invalid password");
        return { valid: false, error: "Invalid password" };
      }
    }

    // Check domain restriction
    if (link.allowedDomains?.length) {
      if (!options.domain || !link.allowedDomains.includes(options.domain)) {
        this.logAccess(link.id, options, "view", false, "Domain not allowed");
        return {
          valid: false,
          error: "Access from this domain is not allowed",
        };
      }
    }

    // Check email restriction
    if (link.allowedEmails?.length) {
      if (!options.email || !link.allowedEmails.includes(options.email)) {
        this.logAccess(link.id, options, "view", false, "Email not allowed");
        return {
          valid: false,
          error: "Your email is not allowed to access this link",
        };
      }
    }

    // Check auth requirement
    if (link.requireAuth && !options.userId) {
      return { valid: false, error: "Authentication required" };
    }

    // Success - update counters and log
    link.viewCount++;
    link.lastAccessAt = new Date().toISOString();
    this.store.shareLinks.set(link.id, link);

    this.logAccess(link.id, options, "view", true);

    return { valid: true, link };
  }

  /**
   * Log share link access
   */
  private logAccess(
    linkId: string,
    options: {
      ip?: string;
      userAgent?: string;
      userId?: string;
      email?: string;
    },
    action: "view" | "download" | "share",
    success: boolean,
    reason?: string,
  ): void {
    const log: ShareAccessLog = {
      timestamp: new Date().toISOString(),
      ip: options.ip,
      userAgent: options.userAgent,
      userId: options.userId,
      email: options.email,
      action,
      success,
      reason,
    };

    const link = this.store.shareLinks.get(linkId);
    if (link) {
      link.accessLog.push(log);
      this.store.shareLinks.set(linkId, link);
    }

    // Also store in accessLogs map for easier querying
    const logs = this.store.accessLogs.get(linkId) || [];
    logs.push(log);
    this.store.accessLogs.set(linkId, logs);
  }

  /**
   * Update share link
   */
  async updateShareLink(
    linkId: string,
    updates: Partial<
      Pick<ShareLink, "expiresAt" | "maxViews" | "permissions" | "isActive">
    >,
    userId: string,
  ): Promise<ShareLink> {
    const link = await this.getShareLink(linkId);
    if (!link) {
      throw new ShareLinkError("Share link not found", linkId);
    }

    await this.requireAccess(link.recordingId, userId, "share");

    Object.assign(link, updates);
    this.store.shareLinks.set(linkId, link);

    logger.info("Share link updated", { linkId, updates });

    return link;
  }

  /**
   * Delete share link
   */
  async deleteShareLink(linkId: string, userId: string): Promise<void> {
    const link = await this.getShareLink(linkId);
    if (!link) {
      throw new ShareLinkError("Share link not found", linkId);
    }

    await this.requireAccess(link.recordingId, userId, "share");

    this.store.shareLinks.delete(linkId);

    // Update recording
    const recording = await this.pipeline.getRecording(link.recordingId);
    recording.shareLinks = recording.shareLinks.filter((l) => l.id !== linkId);

    logger.info("Share link deleted", { linkId, userId });
  }

  /**
   * Generate share URL
   */
  generateShareUrl(link: ShareLink, baseUrl?: string): string {
    const base =
      baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://app.nchat.com";
    return `${base}/recordings/shared/${link.token}`;
  }

  // ==========================================================================
  // Access Requests
  // ==========================================================================

  /**
   * Request access to a recording
   */
  async requestAccess(
    recordingId: string,
    requesterId: string,
    requesterEmail: string,
    requesterName: string,
    reason?: string,
  ): Promise<AccessRequest> {
    const recording = await this.pipeline.getRecording(recordingId);

    // Check if already has access
    if (this.hasAccess(recording, requesterId, "view")) {
      throw new ShareLinkError("You already have access to this recording");
    }

    // Check for pending request
    for (const request of this.store.accessRequests.values()) {
      if (
        request.recordingId === recordingId &&
        request.requesterId === requesterId &&
        request.status === "pending"
      ) {
        throw new ShareLinkError("You already have a pending access request");
      }
    }

    const request: AccessRequest = {
      id: crypto.randomUUID(),
      recordingId,
      requesterId,
      requesterEmail,
      requesterName,
      reason,
      status: "pending",
      requestedAt: new Date().toISOString(),
    };

    this.store.accessRequests.set(request.id, request);

    logger.info("Access request created", {
      requestId: request.id,
      recordingId,
      requesterId,
    });

    return request;
  }

  /**
   * Respond to access request
   */
  async respondToAccessRequest(
    requestId: string,
    approved: boolean,
    respondedBy: string,
    options: {
      permissions?: SharePermission[];
      expiresAt?: string;
    } = {},
  ): Promise<AccessRequest> {
    const request = this.store.accessRequests.get(requestId);
    if (!request) {
      throw new ShareLinkError("Access request not found");
    }

    await this.requireAccess(request.recordingId, respondedBy, "share");

    request.status = approved ? "approved" : "denied";
    request.respondedAt = new Date().toISOString();
    request.respondedBy = respondedBy;

    if (approved) {
      const permissions = options.permissions ?? ["view"];
      request.grantedPermissions = permissions;
      request.expiresAt = options.expiresAt;

      // Grant access
      await this.grantAccess(
        request.recordingId,
        request.requesterId,
        permissions,
        respondedBy,
        { expiresAt: options.expiresAt },
      );
    }

    this.store.accessRequests.set(requestId, request);

    logger.info("Access request responded", {
      requestId,
      approved,
      respondedBy,
    });

    return request;
  }

  /**
   * Get pending access requests for a recording
   */
  async getAccessRequests(
    recordingId: string,
    status?: "pending" | "approved" | "denied",
  ): Promise<AccessRequest[]> {
    const requests: AccessRequest[] = [];
    for (const request of this.store.accessRequests.values()) {
      if (request.recordingId === recordingId) {
        if (!status || request.status === status) {
          requests.push(request);
        }
      }
    }
    return requests.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
    );
  }

  // ==========================================================================
  // Recording Access Logging
  // ==========================================================================

  /**
   * Log recording access
   */
  async logRecordingAccess(
    recordingId: string,
    userId: string,
    action: "view" | "download",
  ): Promise<void> {
    const recording = await this.pipeline.getRecording(recordingId);

    // Update ACL access stats
    for (const [aclId, acl] of this.store.acls) {
      if (
        acl.recordingId === recordingId &&
        acl.userId === userId &&
        acl.isActive
      ) {
        acl.accessCount++;
        acl.lastAccessAt = new Date().toISOString();
        this.store.acls.set(aclId, acl);
      }
    }

    await this.pipeline.emitEvent(
      action === "view" ? "recording.accessed" : "recording.downloaded",
      recording,
      userId,
    );
  }

  // ==========================================================================
  // Utility Methods for Testing
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.store.acls.clear();
    this.store.shareLinks.clear();
    this.store.accessRequests.clear();
    this.store.accessLogs.clear();
  }

  /**
   * Get all ACLs (for testing)
   */
  getAllACLs(): PlaybackACL[] {
    return Array.from(this.store.acls.values());
  }

  /**
   * Get all share links (for testing)
   */
  getAllShareLinks(): ShareLink[] {
    return Array.from(this.store.shareLinks.values());
  }

  /**
   * Get all access requests (for testing)
   */
  getAllAccessRequests(): AccessRequest[] {
    return Array.from(this.store.accessRequests.values());
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let aclInstance: PlaybackACLService | null = null;

/**
 * Get singleton playback ACL service instance
 */
export function getPlaybackACLService(
  config?: Partial<ACLConfig>,
): PlaybackACLService {
  if (!aclInstance) {
    aclInstance = new PlaybackACLService(config);
  }
  return aclInstance;
}

/**
 * Create new playback ACL service instance
 */
export function createPlaybackACLService(
  config?: Partial<ACLConfig>,
  pipelineInstance?: RecordingPipelineService,
): PlaybackACLService {
  return new PlaybackACLService(config, pipelineInstance);
}
