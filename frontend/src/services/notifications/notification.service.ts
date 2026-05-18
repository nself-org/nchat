/**
 * Notification Service - Send notifications via the notifications plugin
 *
 * Integrates with the nself notifications plugin API to send email, push, and SMS notifications.
 */

import {
  NotificationChannel,
  NotificationCategory,
  SendNotificationRequest,
  SendNotificationResponse,
  PluginNotification,
  ChatNotificationEvent,
  NotificationPluginConfig,
  defaultNotificationConfig,
  TemplateVariables,
} from "@/types/notifications";

// =============================================================================
// Types
// =============================================================================

export interface SendOptions {
  userId: string;
  channel: NotificationChannel;
  category?: NotificationCategory;
  template?: string;
  to: {
    email?: string;
    phone?: string;
    pushToken?: string;
  };
  content?: {
    subject?: string;
    body?: string;
    html?: string;
  };
  variables?: TemplateVariables;
  priority?: number;
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface NotificationServiceOptions {
  config?: Partial<NotificationPluginConfig>;
  getAuthToken?: () => Promise<string | null>;
}

// =============================================================================
// Notification Service
// =============================================================================

export class NotificationService {
  private config: NotificationPluginConfig;
  private getAuthToken?: () => Promise<string | null>;

  constructor(options: NotificationServiceOptions = {}) {
    this.config = { ...defaultNotificationConfig, ...options.config };
    this.getAuthToken = options.getAuthToken;
  }

  /**
   * Get request headers with optional auth token
   */
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Make API request with retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const headers = await this.getHeaders();

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.config.retry.maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        // Don't retry on certain errors
        if (
          lastError.message.includes("404") ||
          lastError.message.includes("400")
        ) {
          throw lastError;
        }

        // Wait before retry
        if (attempt < this.config.retry.maxAttempts - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retry.delayMs * (attempt + 1)),
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Send a notification
   */
  async send(options: SendOptions): Promise<SendNotificationResponse> {
    const request: SendNotificationRequest = {
      user_id: options.userId,
      channel: options.channel,
      category: options.category || this.config.defaultCategory,
      template: options.template,
      to: {
        email: options.to.email,
        phone: options.to.phone,
        push_token: options.to.pushToken,
      },
      content: options.content,
      variables: options.variables,
      priority: options.priority,
      scheduled_at: options.scheduledAt?.toISOString(),
      metadata: options.metadata,
      tags: options.tags,
    };

    return this.request<SendNotificationResponse>(
      "POST",
      "/api/notifications/send",
      request,
    );
  }

  /**
   * Send email notification
   */
  async sendEmail(
    userId: string,
    email: string,
    options: {
      template?: string;
      subject?: string;
      body?: string;
      html?: string;
      variables?: TemplateVariables;
      category?: NotificationCategory;
    },
  ): Promise<SendNotificationResponse> {
    if (!this.config.emailEnabled) {
      return { success: false, error: "Email notifications are disabled" };
    }

    return this.send({
      userId,
      channel: "email",
      category: options.category,
      template: options.template,
      to: { email },
      content: {
        subject: options.subject,
        body: options.body,
        html: options.html,
      },
      variables: options.variables,
    });
  }

  /**
   * Send push notification
   */
  async sendPush(
    userId: string,
    pushToken: string,
    options: {
      template?: string;
      title?: string;
      body?: string;
      variables?: TemplateVariables;
      category?: NotificationCategory;
      metadata?: Record<string, unknown>;
    },
  ): Promise<SendNotificationResponse> {
    if (!this.config.pushEnabled) {
      return { success: false, error: "Push notifications are disabled" };
    }

    return this.send({
      userId,
      channel: "push",
      category: options.category,
      template: options.template,
      to: { pushToken },
      content: {
        subject: options.title,
        body: options.body,
      },
      variables: options.variables,
      metadata: options.metadata,
    });
  }

  /**
   * Send SMS notification
   */
  async sendSms(
    userId: string,
    phone: string,
    options: {
      template?: string;
      body?: string;
      variables?: TemplateVariables;
      category?: NotificationCategory;
    },
  ): Promise<SendNotificationResponse> {
    if (!this.config.smsEnabled) {
      return { success: false, error: "SMS notifications are disabled" };
    }

    return this.send({
      userId,
      channel: "sms",
      category: options.category,
      template: options.template,
      to: { phone },
      content: {
        body: options.body,
      },
      variables: options.variables,
    });
  }

  /**
   * Get notification status by ID
   */
  async getStatus(notificationId: string): Promise<PluginNotification | null> {
    try {
      const response = await this.request<{ notification: PluginNotification }>(
        "GET",
        `/api/notifications/${notificationId}`,
      );
      return response.notification;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Process a chat event and send appropriate notifications
   */
  async processChatEvent(
    event: ChatNotificationEvent,
  ): Promise<SendNotificationResponse[]> {
    const results: SendNotificationResponse[] = [];
    const { type, actor, target, data } = event;

    // Map event type to template and channels
    const eventConfig = this.getEventConfig(type);
    if (!eventConfig) {
      return results;
    }

    // Send notifications based on user preferences (handled by plugin)
    for (const channel of eventConfig.channels) {
      const to: SendOptions["to"] = {};
      if (channel === "email" && target.user_email) {
        to.email = target.user_email;
      } else if (channel === "push" && target.user_push_token) {
        to.pushToken = target.user_push_token;
      }

      if (Object.keys(to).length === 0) continue;

      try {
        const result = await this.send({
          userId: target.user_id,
          channel,
          category: eventConfig.category,
          template: eventConfig.template,
          to,
          variables: {
            actor_name: actor.name,
            actor_avatar: actor.avatar_url,
            channel_name: data.channel_name,
            message_preview: data.message_preview,
            action_url: data.action_url,
            ...data,
          },
          metadata: {
            event_type: type,
            actor_id: actor.id,
            channel_id: data.channel_id,
            message_id: data.message_id,
            thread_id: data.thread_id,
          },
          tags: [type, `channel:${data.channel_id || "dm"}`],
        });

        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Get notification configuration for a chat event type
   */
  private getEventConfig(eventType: ChatNotificationEvent["type"]): {
    template: string;
    channels: NotificationChannel[];
    category: NotificationCategory;
  } | null {
    const configs: Record<
      ChatNotificationEvent["type"],
      {
        template: string;
        channels: NotificationChannel[];
        category: NotificationCategory;
      }
    > = {
      "message.new": {
        template: "nchat_new_message",
        channels: ["push", "email"],
        category: "transactional",
      },
      "message.mention": {
        template: "nchat_mention",
        channels: ["push", "email"],
        category: "transactional",
      },
      "message.reaction": {
        template: "nchat_reaction",
        channels: ["push"],
        category: "transactional",
      },
      "thread.reply": {
        template: "nchat_thread_reply",
        channels: ["push", "email"],
        category: "transactional",
      },
      "dm.new": {
        template: "nchat_direct_message",
        channels: ["push", "email"],
        category: "transactional",
      },
      "channel.invite": {
        template: "nchat_channel_invite",
        channels: ["push", "email"],
        category: "transactional",
      },
      "channel.join": {
        template: "nchat_channel_join",
        channels: ["push"],
        category: "system",
      },
      "channel.leave": {
        template: "nchat_channel_leave",
        channels: ["push"],
        category: "system",
      },
      "reminder.due": {
        template: "nchat_reminder",
        channels: ["push", "email"],
        category: "alert",
      },
      "announcement.new": {
        template: "nchat_announcement",
        channels: ["push", "email"],
        category: "system",
      },
    };

    return configs[eventType] || null;
  }

  /**
   * Check if the notifications service is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await this.request<{ status: string }>("GET", "/health");
      return { healthy: response.status === "ok" };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(
  options?: NotificationServiceOptions,
): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService(options);
  }
  return notificationServiceInstance;
}

export function resetNotificationService(): void {
  notificationServiceInstance = null;
}
