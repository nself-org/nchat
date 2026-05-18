/**
 * VoIP Push Notification Handler
 *
 * Handles VoIP push notifications for incoming calls on iOS and Android,
 * integrating with CallKit and Telecom frameworks.
 */

// @ts-ignore - Capacitor plugin (optional dependency)
import {
  PushNotifications,
  PushNotificationSchema,
  Token,
} from "@capacitor/push-notifications";
// @ts-ignore - Capacitor integration (optional dependency)
import { callKitManager } from "@/platforms/capacitor/src/native/call-kit";
import { useCallStore } from "@/stores/call-store";

// =============================================================================
// Types
// =============================================================================

export interface VoIPPushPayload {
  type: "incoming_call" | "call_ended" | "call_updated";
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string;
  callType: "audio" | "video";
  channelId?: string;
}

export interface VoIPPushToken {
  token: string;
  platform: "ios" | "android" | "web";
}

// =============================================================================
// VoIP Push Manager
// =============================================================================

export class VoIPPushManager {
  private token: string | null = null;
  private isInitialized = false;

  /**
   * Initialize VoIP push notifications
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Request permissions
      const result = await PushNotifications.requestPermissions();

      if (result.receive === "granted") {
        // Register for push notifications
        await PushNotifications.register();

        // Set up listeners
        this.setupListeners();

        this.isInitialized = true;
      } else {
        throw new Error("Push notification permission denied");
      }
    } catch (error) {
      logger.error("Failed to initialize VoIP push:", error);
      throw error;
    }
  }

  /**
   * Set up push notification listeners
   */
  private setupListeners(): void {
    // Registration success
    PushNotifications.addListener("registration", (token: Token) => {
      this.token = token.value;

      // Send token to server
      this.sendTokenToServer(token.value);
    });

    // Registration error
    PushNotifications.addListener("registrationError", (error: any) => {
      logger.error("Push registration error:", error);
    });

    // Push notification received
    PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification: PushNotificationSchema) => {
        // Parse VoIP payload
        const payload = this.parseVoIPPayload(notification.data);

        if (payload) {
          await this.handleVoIPPush(payload);
        }
      },
    );

    // Push notification tapped
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      async (notification: any) => {
        const payload = this.parseVoIPPayload(notification.notification.data);

        if (payload) {
          // User tapped notification - open app to call screen
          await this.handleVoIPPush(payload, true);
        }
      },
    );
  }

  /**
   * Parse VoIP push payload
   */
  private parseVoIPPayload(data: any): VoIPPushPayload | null {
    try {
      // Handle both direct object and stringified JSON
      const payload = typeof data === "string" ? JSON.parse(data) : data;

      if (!payload.type || !payload.callId) {
        return null;
      }

      return {
        type: payload.type,
        callId: payload.callId,
        callerId: payload.callerId,
        callerName: payload.callerName,
        callerAvatarUrl: payload.callerAvatarUrl,
        callType: payload.callType || "audio",
        channelId: payload.channelId,
      };
    } catch (error) {
      logger.error("Failed to parse VoIP payload:", error);
      return null;
    }
  }

  /**
   * Handle VoIP push notification
   */
  private async handleVoIPPush(
    payload: VoIPPushPayload,
    fromTap: boolean = false,
  ): Promise<void> {
    try {
      switch (payload.type) {
        case "incoming_call":
          await this.handleIncomingCall(payload, fromTap);
          break;

        case "call_ended":
          await this.handleCallEnded(payload);
          break;

        case "call_updated":
          await this.handleCallUpdated(payload);
          break;

        default:
          logger.warn("Unknown VoIP push type:", { context: payload.type });
      }
    } catch (error) {
      logger.error("Failed to handle VoIP push:", error);
    }
  }

  /**
   * Handle incoming call push
   */
  private async handleIncomingCall(
    payload: VoIPPushPayload,
    fromTap: boolean,
  ): Promise<void> {
    // Report to CallKit/Telecom
    await callKitManager.reportIncomingCall({
      uuid: payload.callId,
      handle: payload.callerId,
      handleType: "generic",
      hasVideo: payload.callType === "video",
      callerDisplayName: payload.callerName,
      callerImageUrl: payload.callerAvatarUrl,
    });

    // Update call store
    const callStore = useCallStore.getState();
    callStore.receiveIncomingCall({
      id: payload.callId,
      callerId: payload.callerId,
      callerName: payload.callerName,
      callerAvatarUrl: payload.callerAvatarUrl,
      type: payload.callType === "video" ? "video" : "voice",
      channelId: payload.channelId,
      receivedAt: new Date().toISOString(),
    });

    // If from tap, auto-accept (user tapped notification)
    if (fromTap) {
      // Small delay to ensure UI is ready
      setTimeout(() => {
        callStore.acceptCall(payload.callId);
      }, 500);
    }
  }

  /**
   * Handle call ended push
   */
  private async handleCallEnded(payload: VoIPPushPayload): Promise<void> {
    // Report to CallKit/Telecom
    await callKitManager.endCall("remoteEnded", payload.callId);

    // Update call store
    const callStore = useCallStore.getState();
    callStore.endCall("completed");
  }

  /**
   * Handle call updated push
   */
  private async handleCallUpdated(payload: VoIPPushPayload): Promise<void> {
    // Update call store
    const callStore = useCallStore.getState();
    const activeCall = callStore.activeCall;

    if (activeCall && activeCall.id === payload.callId) {
      // Update call metadata
      // This could include mute state, video state, etc.
    }
  }

  /**
   * Send push token to server
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const platform = this.getPlatform();

      // Send to your backend API
      const response = await fetch("/api/push-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          platform,
          type: "voip",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to register push token");
      }
    } catch (error) {
      logger.error("Failed to send push token to server:", error);
    }
  }

  /**
   * Get current platform
   */
  private getPlatform(): "ios" | "android" | "web" {
    if (typeof window === "undefined") return "web";

    const userAgent = window.navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return "ios";
    }

    if (/android/.test(userAgent)) {
      return "android";
    }

    return "web";
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Unregister push notifications
   */
  async unregister(): Promise<void> {
    try {
      await PushNotifications.removeAllListeners();
      this.isInitialized = false;
      this.token = null;
    } catch (error) {
      logger.error("Failed to unregister VoIP push:", error);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const voipPushManager = new VoIPPushManager();

// =============================================================================
// React Hook
// =============================================================================

import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

export function useVoIPPush() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await voipPushManager.initialize();
        setIsInitialized(true);

        const token = voipPushManager.getToken();
        if (token) {
          setPushToken(token);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize VoIP push";
        setError(message);
        logger.error("VoIP push initialization error:", err);
      }
    }

    init();

    return () => {
      voipPushManager.unregister();
    };
  }, []);

  return {
    isInitialized,
    pushToken,
    error,
  };
}

// =============================================================================
// Server-side Push Notification Sender
// =============================================================================

/**
 * Send VoIP push notification from server
 *
 * This would be called from your backend when a call is initiated.
 */
export async function sendVoIPPush(
  userToken: string,
  platform: "ios" | "android",
  payload: VoIPPushPayload,
): Promise<void> {
  if (platform === "ios") {
    // Send via APNs (Apple Push Notification service)
    await sendAPNsPush(userToken, payload);
  } else {
    // Send via FCM (Firebase Cloud Messaging)
    await sendFCMPush(userToken, payload);
  }
}

/**
 * Send APNs VoIP push (iOS)
 */
async function sendAPNsPush(
  deviceToken: string,
  payload: VoIPPushPayload,
): Promise<void> {
  // This should be called from your Node.js backend using the apn package
  // or directly via the APNs HTTP/2 API

  const apnsPayload = {
    aps: {
      alert: {
        title: payload.callerName,
        body: `Incoming ${payload.callType} call`,
      },
      sound: "default",
      badge: 1,
      "content-available": 1,
    },
    data: payload,
  };

  // Send to APNs
}

/**
 * Send FCM high-priority push (Android)
 */
async function sendFCMPush(
  deviceToken: string,
  payload: VoIPPushPayload,
): Promise<void> {
  // This should be called from your Node.js backend using the firebase-admin package

  const fcmPayload = {
    token: deviceToken,
    notification: {
      title: payload.callerName,
      body: `Incoming ${payload.callType} call`,
    },
    data: payload as any,
    android: {
      priority: "high" as const,
      ttl: 3600000, // 1 hour
      notification: {
        channelId: "voip_calls",
        priority: "high" as const,
        sound: "default",
      },
    },
  };

  // Send to FCM
}
