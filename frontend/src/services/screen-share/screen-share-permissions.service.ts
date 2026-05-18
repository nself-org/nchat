/**
 * Screen Share Permissions Service
 *
 * Manages screen sharing permissions, request-to-share flow,
 * concurrent sharers limits, and host override capabilities.
 */

// =============================================================================
// Types
// =============================================================================

export type ScreenSharePermissionMode =
  | "anyone" // Anyone can share without approval
  | "host-only" // Only host can share
  | "request-approval" // Participants must request and get approval
  | "presenters-only"; // Only designated presenters can share

export type ShareRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "cancelled";

export interface ScreenSharePermissions {
  /** Who can share by default */
  mode: ScreenSharePermissionMode;
  /** Maximum concurrent screen shares allowed (0 = unlimited) */
  maxConcurrentShares: number;
  /** Whether host can take over someone else's share */
  allowHostOverride: boolean;
  /** Time in ms before share request expires */
  requestTimeout: number;
  /** IDs of users who can always share (presenters) */
  presenterIds: string[];
  /** Whether participants can annotate shared screens */
  allowParticipantAnnotations: boolean;
  /** Whether audio sharing is allowed */
  allowAudioSharing: boolean;
}

export interface ShareRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  requestedAt: Date;
  status: ShareRequestStatus;
  respondedAt?: Date;
  respondedBy?: string;
  reason?: string;
}

export interface ActiveShare {
  id: string;
  userId: string;
  userName: string;
  startedAt: Date;
  shareType: "screen" | "window" | "tab";
  hasAudio: boolean;
}

export interface ScreenSharePermissionCallbacks {
  onShareRequested?: (request: ShareRequest) => void;
  onShareRequestResponded?: (request: ShareRequest) => void;
  onShareStarted?: (share: ActiveShare) => void;
  onShareStopped?: (shareId: string) => void;
  onShareOverridden?: (share: ActiveShare, byUserId: string) => void;
  onPermissionsChanged?: (permissions: ScreenSharePermissions) => void;
}

// =============================================================================
// Default Permissions
// =============================================================================

export const DEFAULT_SCREEN_SHARE_PERMISSIONS: ScreenSharePermissions = {
  mode: "anyone",
  maxConcurrentShares: 1,
  allowHostOverride: true,
  requestTimeout: 60000, // 1 minute
  presenterIds: [],
  allowParticipantAnnotations: true,
  allowAudioSharing: true,
};

// =============================================================================
// Screen Share Permissions Service
// =============================================================================

export class ScreenSharePermissionsService {
  private permissions: ScreenSharePermissions;
  private callbacks: ScreenSharePermissionCallbacks;
  private pendingRequests: Map<string, ShareRequest> = new Map();
  private activeShares: Map<string, ActiveShare> = new Map();
  private hostId: string;
  private currentUserId: string;
  private requestTimeoutHandles: Map<string, NodeJS.Timeout> = new Map();
  private requestCounter = 0;

  constructor(
    hostId: string,
    currentUserId: string,
    permissions: Partial<ScreenSharePermissions> = {},
    callbacks: ScreenSharePermissionCallbacks = {},
  ) {
    this.hostId = hostId;
    this.currentUserId = currentUserId;
    this.permissions = { ...DEFAULT_SCREEN_SHARE_PERMISSIONS, ...permissions };
    this.callbacks = callbacks;
  }

  // ===========================================================================
  // Permission Checks
  // ===========================================================================

  /**
   * Check if current user can start screen sharing
   */
  canShare(): { allowed: boolean; reason?: string } {
    // Check concurrent share limit
    if (
      this.permissions.maxConcurrentShares > 0 &&
      this.activeShares.size >= this.permissions.maxConcurrentShares
    ) {
      return {
        allowed: false,
        reason: `Maximum of ${this.permissions.maxConcurrentShares} concurrent shares reached`,
      };
    }

    // Check if already sharing
    if (this.isUserSharing(this.currentUserId)) {
      return { allowed: false, reason: "You are already sharing" };
    }

    switch (this.permissions.mode) {
      case "anyone":
        return { allowed: true };

      case "host-only":
        if (this.currentUserId === this.hostId) {
          return { allowed: true };
        }
        return { allowed: false, reason: "Only the host can share screen" };

      case "request-approval":
        // Return that sharing requires request
        return {
          allowed: false,
          reason: "REQUIRES_APPROVAL",
        };

      case "presenters-only":
        if (
          this.currentUserId === this.hostId ||
          this.permissions.presenterIds.includes(this.currentUserId)
        ) {
          return { allowed: true };
        }
        return { allowed: false, reason: "Only presenters can share screen" };

      default:
        return { allowed: false, reason: "Unknown permission mode" };
    }
  }

  /**
   * Check if user can request to share
   */
  canRequestToShare(): boolean {
    // Can request if mode requires approval and not already pending/sharing
    if (this.permissions.mode !== "request-approval") {
      return false;
    }

    // Check if already has pending request
    for (const request of this.pendingRequests.values()) {
      if (
        request.userId === this.currentUserId &&
        request.status === "pending"
      ) {
        return false;
      }
    }

    return !this.isUserSharing(this.currentUserId);
  }

  /**
   * Check if current user is the host
   */
  isHost(): boolean {
    return this.currentUserId === this.hostId;
  }

  /**
   * Check if current user is a presenter
   */
  isPresenter(userId?: string): boolean {
    const checkId = userId ?? this.currentUserId;
    return this.permissions.presenterIds.includes(checkId);
  }

  /**
   * Check if a user is currently sharing
   */
  isUserSharing(userId: string): boolean {
    for (const share of this.activeShares.values()) {
      if (share.userId === userId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if audio sharing is allowed
   */
  canShareAudio(): boolean {
    return this.permissions.allowAudioSharing;
  }

  /**
   * Check if participant annotations are allowed
   */
  canAnnotate(userId?: string): boolean {
    const checkId = userId ?? this.currentUserId;

    // Host and sharers can always annotate
    if (checkId === this.hostId || this.isUserSharing(checkId)) {
      return true;
    }

    return this.permissions.allowParticipantAnnotations;
  }

  // ===========================================================================
  // Share Request Flow
  // ===========================================================================

  /**
   * Request permission to share screen
   */
  requestToShare(): ShareRequest {
    const requestId = `share-req-${++this.requestCounter}-${Date.now()}`;

    const request: ShareRequest = {
      id: requestId,
      userId: this.currentUserId,
      userName: "Current User", // Would be passed in real implementation
      requestedAt: new Date(),
      status: "pending",
    };

    this.pendingRequests.set(requestId, request);

    // Set timeout for request expiry
    const timeoutHandle = setTimeout(() => {
      this.expireRequest(requestId);
    }, this.permissions.requestTimeout);
    this.requestTimeoutHandles.set(requestId, timeoutHandle);

    this.callbacks.onShareRequested?.(request);

    return request;
  }

  /**
   * Approve a share request (host only)
   */
  approveRequest(requestId: string): boolean {
    if (!this.isHost()) {
      return false;
    }

    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== "pending") {
      return false;
    }

    // Clear timeout
    const timeoutHandle = this.requestTimeoutHandles.get(requestId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.requestTimeoutHandles.delete(requestId);
    }

    request.status = "approved";
    request.respondedAt = new Date();
    request.respondedBy = this.currentUserId;

    this.callbacks.onShareRequestResponded?.(request);

    return true;
  }

  /**
   * Deny a share request (host only)
   */
  denyRequest(requestId: string, reason?: string): boolean {
    if (!this.isHost()) {
      return false;
    }

    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== "pending") {
      return false;
    }

    // Clear timeout
    const timeoutHandle = this.requestTimeoutHandles.get(requestId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.requestTimeoutHandles.delete(requestId);
    }

    request.status = "denied";
    request.respondedAt = new Date();
    request.respondedBy = this.currentUserId;
    request.reason = reason;

    this.callbacks.onShareRequestResponded?.(request);

    return true;
  }

  /**
   * Cancel own pending request
   */
  cancelRequest(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (
      !request ||
      request.userId !== this.currentUserId ||
      request.status !== "pending"
    ) {
      return false;
    }

    // Clear timeout
    const timeoutHandle = this.requestTimeoutHandles.get(requestId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.requestTimeoutHandles.delete(requestId);
    }

    request.status = "cancelled";
    this.callbacks.onShareRequestResponded?.(request);

    return true;
  }

  /**
   * Expire a request after timeout
   */
  private expireRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (!request || request.status !== "pending") {
      return;
    }

    request.status = "expired";
    this.requestTimeoutHandles.delete(requestId);
    this.callbacks.onShareRequestResponded?.(request);
  }

  // ===========================================================================
  // Active Share Management
  // ===========================================================================

  /**
   * Register a new active share
   */
  registerShare(
    userId: string,
    userName: string,
    shareType: "screen" | "window" | "tab",
    hasAudio: boolean,
  ): ActiveShare {
    const shareId = `share-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const share: ActiveShare = {
      id: shareId,
      userId,
      userName,
      startedAt: new Date(),
      shareType,
      hasAudio,
    };

    this.activeShares.set(shareId, share);
    this.callbacks.onShareStarted?.(share);

    return share;
  }

  /**
   * Stop an active share
   */
  stopShare(shareId: string): boolean {
    const share = this.activeShares.get(shareId);
    if (!share) {
      return false;
    }

    // Only the sharer or host can stop
    if (share.userId !== this.currentUserId && !this.isHost()) {
      return false;
    }

    this.activeShares.delete(shareId);
    this.callbacks.onShareStopped?.(shareId);

    return true;
  }

  /**
   * Host overrides current share to take control
   */
  overrideShare(shareIdToOverride: string): ActiveShare | null {
    if (!this.isHost() || !this.permissions.allowHostOverride) {
      return null;
    }

    const existingShare = this.activeShares.get(shareIdToOverride);
    if (!existingShare) {
      return null;
    }

    // Stop the existing share
    this.activeShares.delete(shareIdToOverride);
    this.callbacks.onShareOverridden?.(existingShare, this.currentUserId);

    return existingShare;
  }

  /**
   * Get all active shares
   */
  getActiveShares(): ActiveShare[] {
    return Array.from(this.activeShares.values());
  }

  /**
   * Get pending requests (for host)
   */
  getPendingRequests(): ShareRequest[] {
    return Array.from(this.pendingRequests.values()).filter(
      (r) => r.status === "pending",
    );
  }

  /**
   * Get user's pending request
   */
  getMyPendingRequest(): ShareRequest | undefined {
    for (const request of this.pendingRequests.values()) {
      if (
        request.userId === this.currentUserId &&
        request.status === "pending"
      ) {
        return request;
      }
    }
    return undefined;
  }

  // ===========================================================================
  // Presenter Management
  // ===========================================================================

  /**
   * Add a presenter (host only)
   */
  addPresenter(userId: string): boolean {
    if (!this.isHost()) {
      return false;
    }

    if (!this.permissions.presenterIds.includes(userId)) {
      this.permissions.presenterIds.push(userId);
      this.callbacks.onPermissionsChanged?.(this.permissions);
    }

    return true;
  }

  /**
   * Remove a presenter (host only)
   */
  removePresenter(userId: string): boolean {
    if (!this.isHost()) {
      return false;
    }

    const index = this.permissions.presenterIds.indexOf(userId);
    if (index !== -1) {
      this.permissions.presenterIds.splice(index, 1);
      this.callbacks.onPermissionsChanged?.(this.permissions);
    }

    return true;
  }

  /**
   * Get all presenters
   */
  getPresenters(): string[] {
    return [...this.permissions.presenterIds];
  }

  // ===========================================================================
  // Permission Updates
  // ===========================================================================

  /**
   * Update permissions (host only)
   */
  updatePermissions(updates: Partial<ScreenSharePermissions>): boolean {
    if (!this.isHost()) {
      return false;
    }

    this.permissions = { ...this.permissions, ...updates };
    this.callbacks.onPermissionsChanged?.(this.permissions);

    return true;
  }

  /**
   * Get current permissions
   */
  getPermissions(): ScreenSharePermissions {
    return { ...this.permissions };
  }

  /**
   * Set permission mode
   */
  setMode(mode: ScreenSharePermissionMode): boolean {
    return this.updatePermissions({ mode });
  }

  /**
   * Set max concurrent shares
   */
  setMaxConcurrentShares(max: number): boolean {
    return this.updatePermissions({ maxConcurrentShares: max });
  }

  // ===========================================================================
  // Host Management
  // ===========================================================================

  /**
   * Transfer host role to another user
   */
  transferHost(newHostId: string): boolean {
    if (!this.isHost()) {
      return false;
    }

    this.hostId = newHostId;
    return true;
  }

  /**
   * Get current host ID
   */
  getHostId(): string {
    return this.hostId;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all timeout handles
    for (const handle of this.requestTimeoutHandles.values()) {
      clearTimeout(handle);
    }
    this.requestTimeoutHandles.clear();
    this.pendingRequests.clear();
    this.activeShares.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createScreenSharePermissionsService(
  hostId: string,
  currentUserId: string,
  permissions?: Partial<ScreenSharePermissions>,
  callbacks?: ScreenSharePermissionCallbacks,
): ScreenSharePermissionsService {
  return new ScreenSharePermissionsService(
    hostId,
    currentUserId,
    permissions,
    callbacks,
  );
}
