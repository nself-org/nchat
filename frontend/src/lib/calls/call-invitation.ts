/**
 * Call Invitation Manager
 *
 * Handles incoming call invitations with ring tones, notifications,
 * and timeout management.
 */

import { EventEmitter } from "events";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface CallInvitation {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string;
  type: "voice" | "video";
  channelId?: string;
  receivedAt: Date;
  expiresAt: Date;
  status: "pending" | "accepted" | "declined" | "missed" | "cancelled";
}

export interface InvitationConfig {
  ringToneUrl?: string;
  ringVolume?: number;
  ringDuration?: number; // milliseconds
  timeout?: number; // milliseconds until missed
  vibrate?: boolean;
  vibratePattern?: number[];
  enableNotifications?: boolean;
  notificationSound?: boolean;
}

export interface InvitationManagerConfig extends InvitationConfig {
  onInvitation?: (invitation: CallInvitation) => void;
  onTimeout?: (invitation: CallInvitation) => void;
  onAccepted?: (invitation: CallInvitation) => void;
  onDeclined?: (invitation: CallInvitation) => void;
  onCancelled?: (invitation: CallInvitation) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Required<InvitationConfig> = {
  ringToneUrl: "/sounds/ringtone.mp3",
  ringVolume: 0.8,
  ringDuration: 30000, // 30 seconds
  timeout: 30000, // 30 seconds until missed
  vibrate: true,
  vibratePattern: [500, 500, 500], // vibrate for 500ms, pause 500ms, repeat
  enableNotifications: true,
  notificationSound: true,
};

// =============================================================================
// Call Invitation Manager
// =============================================================================

export class CallInvitationManager extends EventEmitter {
  private invitations = new Map<string, CallInvitation>();
  private config: Required<InvitationConfig>;
  private callbacks: InvitationManagerConfig;
  private audio: HTMLAudioElement | null = null;
  private timeouts = new Map<string, NodeJS.Timeout>();
  private vibrateInterval: NodeJS.Timeout | null = null;

  constructor(config: InvitationManagerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = config;

    // Initialize audio element
    if (typeof window !== "undefined") {
      this.audio = new Audio(this.config.ringToneUrl);
      this.audio.loop = true;
      this.audio.volume = this.config.ringVolume;
    }
  }

  /**
   * Create new invitation
   */
  createInvitation(
    id: string,
    callerId: string,
    callerName: string,
    type: "voice" | "video",
    options?: {
      callerAvatarUrl?: string;
      channelId?: string;
    },
  ): CallInvitation {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.timeout);

    const invitation: CallInvitation = {
      id,
      callerId,
      callerName,
      callerAvatarUrl: options?.callerAvatarUrl,
      type,
      channelId: options?.channelId,
      receivedAt: now,
      expiresAt,
      status: "pending",
    };

    // Store invitation
    this.invitations.set(id, invitation);

    // Start ringing
    this.startRinging();

    // Set timeout
    const timeout = setTimeout(() => {
      this.timeout(id);
    }, this.config.timeout);
    this.timeouts.set(id, timeout);

    // Show notification
    if (this.config.enableNotifications) {
      this.showNotification(invitation);
    }

    // Emit event
    this.emit("invitation", invitation);
    if (this.callbacks.onInvitation) {
      this.callbacks.onInvitation(invitation);
    }

    return invitation;
  }

  /**
   * Get invitation by ID
   */
  getInvitation(id: string): CallInvitation | undefined {
    return this.invitations.get(id);
  }

  /**
   * Get all active invitations
   */
  getActiveInvitations(): CallInvitation[] {
    return Array.from(this.invitations.values()).filter(
      (inv) => inv.status === "pending",
    );
  }

  /**
   * Check if there are active invitations
   */
  hasActiveInvitations(): boolean {
    return this.getActiveInvitations().length > 0;
  }

  /**
   * Accept invitation
   */
  acceptInvitation(id: string): boolean {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== "pending") {
      return false;
    }

    // Update status
    invitation.status = "accepted";

    // Stop ringing
    this.stopRinging();

    // Clear timeout
    this.clearInvitationTimeout(id);

    // Emit event
    this.emit("accepted", invitation);
    if (this.callbacks.onAccepted) {
      this.callbacks.onAccepted(invitation);
    }

    // Remove invitation after short delay
    setTimeout(() => {
      this.invitations.delete(id);
    }, 1000);

    return true;
  }

  /**
   * Decline invitation
   */
  declineInvitation(id: string): boolean {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== "pending") {
      return false;
    }

    // Update status
    invitation.status = "declined";

    // Stop ringing if no more active invitations
    if (!this.hasActiveInvitations()) {
      this.stopRinging();
    }

    // Clear timeout
    this.clearInvitationTimeout(id);

    // Emit event
    this.emit("declined", invitation);
    if (this.callbacks.onDeclined) {
      this.callbacks.onDeclined(invitation);
    }

    // Remove invitation
    setTimeout(() => {
      this.invitations.delete(id);
    }, 1000);

    return true;
  }

  /**
   * Cancel invitation (caller cancelled)
   */
  cancelInvitation(id: string): boolean {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== "pending") {
      return false;
    }

    // Update status
    invitation.status = "cancelled";

    // Stop ringing if no more active invitations
    if (!this.hasActiveInvitations()) {
      this.stopRinging();
    }

    // Clear timeout
    this.clearInvitationTimeout(id);

    // Emit event
    this.emit("cancelled", invitation);
    if (this.callbacks.onCancelled) {
      this.callbacks.onCancelled(invitation);
    }

    // Remove invitation
    setTimeout(() => {
      this.invitations.delete(id);
    }, 1000);

    return true;
  }

  /**
   * Handle invitation timeout (missed call)
   */
  private timeout(id: string): void {
    const invitation = this.invitations.get(id);
    if (!invitation || invitation.status !== "pending") {
      return;
    }

    // Update status
    invitation.status = "missed";

    // Stop ringing if no more active invitations
    if (!this.hasActiveInvitations()) {
      this.stopRinging();
    }

    // Emit event
    this.emit("timeout", invitation);
    this.emit("missed", invitation);
    if (this.callbacks.onTimeout) {
      this.callbacks.onTimeout(invitation);
    }

    // Remove invitation
    setTimeout(() => {
      this.invitations.delete(id);
    }, 5000); // Keep missed call for 5 seconds
  }

  /**
   * Start ringing
   */
  private startRinging(): void {
    // Play audio
    if (this.audio && !this.isRinging()) {
      this.audio.play().catch((err) => {
        logger.error("Failed to play ringtone:", err);
      });
    }

    // Start vibration
    if (
      this.config.vibrate &&
      typeof navigator !== "undefined" &&
      navigator.vibrate
    ) {
      this.vibrateInterval = setInterval(
        () => {
          navigator.vibrate(this.config.vibratePattern);
        },
        this.config.vibratePattern.reduce((a, b) => a + b, 0),
      );
    }

    this.emit("ringing-started");
  }

  /**
   * Stop ringing
   */
  private stopRinging(): void {
    // Stop audio
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    // Stop vibration
    if (this.vibrateInterval) {
      clearInterval(this.vibrateInterval);
      this.vibrateInterval = null;
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(0);
    }

    this.emit("ringing-stopped");
  }

  /**
   * Check if currently ringing
   */
  isRinging(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  /**
   * Clear invitation timeout
   */
  private clearInvitationTimeout(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * Show browser notification
   */
  private async showNotification(invitation: CallInvitation): Promise<void> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    // Request permission if needed
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    // Show notification if permitted
    if (Notification.permission === "granted") {
      const notification = new Notification(
        `Incoming ${invitation.type} call`,
        {
          body: `${invitation.callerName} is calling you`,
          icon: invitation.callerAvatarUrl || "/icons/call-icon.png",
          tag: `call-${invitation.id}`,
          requireInteraction: true,
          silent: !this.config.notificationSound,
        },
      );

      // Handle notification clicks
      notification.onclick = () => {
        window.focus();
        notification.close();
        this.emit("notification-clicked", invitation);
      };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<InvitationConfig>): void {
    this.config = { ...this.config, ...config };

    // Update audio if changed
    if (config.ringToneUrl && this.audio) {
      this.audio.src = config.ringToneUrl;
    }
    if (config.ringVolume !== undefined && this.audio) {
      this.audio.volume = config.ringVolume;
    }
  }

  /**
   * Clean up all invitations
   */
  cleanup(): void {
    // Stop ringing
    this.stopRinging();

    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    // Clear invitations
    this.invitations.clear();

    // Remove audio element
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  /**
   * Get invitation statistics
   */
  getStats(): {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    missed: number;
    cancelled: number;
  } {
    const invitations = Array.from(this.invitations.values());
    return {
      total: invitations.length,
      pending: invitations.filter((i) => i.status === "pending").length,
      accepted: invitations.filter((i) => i.status === "accepted").length,
      declined: invitations.filter((i) => i.status === "declined").length,
      missed: invitations.filter((i) => i.status === "missed").length,
      cancelled: invitations.filter((i) => i.status === "cancelled").length,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new call invitation manager
 */
export function createInvitationManager(
  config?: InvitationManagerConfig,
): CallInvitationManager {
  return new CallInvitationManager(config);
}
