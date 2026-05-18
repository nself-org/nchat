/**
 * Notification Event Dispatcher - Wire app events to notifications
 *
 * Listens for chat events and dispatches notifications via the notification service.
 */

import {
  ChatEventType,
  ChatNotificationEvent,
  NotificationChannel,
  SendNotificationResponse,
} from "@/types/notifications";
import {
  getNotificationService,
  NotificationService,
} from "./notification.service";
import { getPreferenceService, PreferenceService } from "./preference.service";

// =============================================================================
// Types
// =============================================================================

export interface EventDispatcherOptions {
  /**
   * Notification service instance (optional, will create default if not provided)
   */
  notificationService?: NotificationService;

  /**
   * Preference service instance (optional, will create default if not provided)
   */
  preferenceService?: PreferenceService;

  /**
   * Whether to check user preferences before sending
   */
  checkPreferences?: boolean;

  /**
   * Callback when a notification is sent
   */
  onNotificationSent?: (
    event: ChatNotificationEvent,
    results: SendNotificationResponse[],
  ) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (event: ChatNotificationEvent, error: Error) => void;

  /**
   * Whether to enable debug logging
   */
  debug?: boolean;
}

export type EventHandler = (
  event: ChatNotificationEvent,
) => Promise<void> | void;

export interface EventSubscription {
  unsubscribe: () => void;
}

// =============================================================================
// Event Dispatcher
// =============================================================================

export class NotificationEventDispatcher {
  private notificationService: NotificationService;
  private preferenceService: PreferenceService;
  private options: EventDispatcherOptions;
  private eventHandlers: Map<ChatEventType, Set<EventHandler>> = new Map();
  private globalHandlers: Set<EventHandler> = new Set();
  private isProcessing = false;
  private eventQueue: ChatNotificationEvent[] = [];

  constructor(options: EventDispatcherOptions = {}) {
    this.options = options;
    this.notificationService =
      options.notificationService || getNotificationService();
    this.preferenceService =
      options.preferenceService || getPreferenceService();
  }

  /**
   * Dispatch a chat event to send notifications
   */
  async dispatch(
    event: ChatNotificationEvent,
  ): Promise<SendNotificationResponse[]> {
    try {
      this.log(`Dispatching event: ${event.type}`, event);

      // Add to queue and process
      this.eventQueue.push(event);
      return await this.processQueue(event);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      this.options.onError?.(event, err);
      this.log(`Error dispatching event: ${err.message}`);
      return [{ success: false, error: err.message }];
    }
  }

  /**
   * Process the event queue
   */
  private async processQueue(
    currentEvent: ChatNotificationEvent,
  ): Promise<SendNotificationResponse[]> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return [{ success: true, message: "Event queued" }];
    }

    this.isProcessing = true;
    const results: SendNotificationResponse[] = [];

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (!event) continue;

        // Call event-specific handlers
        const handlers = this.eventHandlers.get(event.type);
        if (handlers) {
          for (const handler of handlers) {
            await handler(event);
          }
        }

        // Call global handlers
        for (const handler of this.globalHandlers) {
          await handler(event);
        }

        // Check preferences if enabled
        if (this.options.checkPreferences !== false) {
          const canReceive = await this.checkUserPreferences(event);
          if (!canReceive) {
            this.log(`User opted out of ${event.type} notifications`);
            continue;
          }
        }

        // Send notifications via notification service
        const notificationResults =
          await this.notificationService.processChatEvent(event);
        results.push(...notificationResults);

        // Notify callback
        if (event === currentEvent) {
          this.options.onNotificationSent?.(event, notificationResults);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Check if user preferences allow this notification
   */
  private async checkUserPreferences(
    event: ChatNotificationEvent,
  ): Promise<boolean> {
    try {
      // Get the notification category for this event type
      const category = this.getEventCategory(event.type);

      // Check push preferences (most common channel)
      const canReceivePush = await this.preferenceService.canReceive(
        event.target.user_id,
        "push",
        category,
      );

      if (canReceivePush) {
        return true;
      }

      // Check email preferences as fallback
      const canReceiveEmail = await this.preferenceService.canReceive(
        event.target.user_id,
        "email",
        category,
      );

      return canReceiveEmail;
    } catch (error) {
      // On error, allow the notification (preferences service handles defaults)
      return true;
    }
  }

  /**
   * Get notification category for event type
   */
  private getEventCategory(
    eventType: ChatEventType,
  ): "transactional" | "marketing" | "system" | "alert" {
    const categoryMap: Record<
      ChatEventType,
      "transactional" | "marketing" | "system" | "alert"
    > = {
      "message.new": "transactional",
      "message.mention": "transactional",
      "message.reaction": "transactional",
      "thread.reply": "transactional",
      "dm.new": "transactional",
      "channel.invite": "transactional",
      "channel.join": "system",
      "channel.leave": "system",
      "reminder.due": "alert",
      "announcement.new": "system",
    };

    return categoryMap[eventType] || "transactional";
  }

  /**
   * Subscribe to a specific event type
   */
  on(eventType: ChatEventType, handler: EventHandler): EventSubscription {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    return {
      unsubscribe: () => {
        this.eventHandlers.get(eventType)?.delete(handler);
      },
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): EventSubscription {
    this.globalHandlers.add(handler);

    return {
      unsubscribe: () => {
        this.globalHandlers.delete(handler);
      },
    };
  }

  /**
   * Remove all handlers for an event type
   */
  off(eventType: ChatEventType): void {
    this.eventHandlers.delete(eventType);
  }

  /**
   * Remove all handlers
   */
  offAll(): void {
    this.eventHandlers.clear();
    this.globalHandlers.clear();
  }

  // ==========================================================================
  // Convenience Methods for Common Events
  // ==========================================================================

  /**
   * Dispatch new message notification
   */
  async notifyNewMessage(options: {
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetUserId: string;
    targetEmail?: string;
    targetPushToken?: string;
    channelId: string;
    channelName: string;
    messageId: string;
    messagePreview: string;
    actionUrl: string;
  }): Promise<SendNotificationResponse[]> {
    return this.dispatch({
      type: "message.new",
      timestamp: new Date().toISOString(),
      actor: {
        id: options.actorId,
        name: options.actorName,
        avatar_url: options.actorAvatar,
      },
      target: {
        user_id: options.targetUserId,
        user_email: options.targetEmail,
        user_push_token: options.targetPushToken,
      },
      data: {
        channel_id: options.channelId,
        channel_name: options.channelName,
        message_id: options.messageId,
        message_preview: options.messagePreview,
        action_url: options.actionUrl,
      },
    });
  }

  /**
   * Dispatch mention notification
   */
  async notifyMention(options: {
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetUserId: string;
    targetEmail?: string;
    targetPushToken?: string;
    channelId: string;
    channelName: string;
    messageId: string;
    messagePreview: string;
    actionUrl: string;
  }): Promise<SendNotificationResponse[]> {
    return this.dispatch({
      type: "message.mention",
      timestamp: new Date().toISOString(),
      actor: {
        id: options.actorId,
        name: options.actorName,
        avatar_url: options.actorAvatar,
      },
      target: {
        user_id: options.targetUserId,
        user_email: options.targetEmail,
        user_push_token: options.targetPushToken,
      },
      data: {
        channel_id: options.channelId,
        channel_name: options.channelName,
        message_id: options.messageId,
        message_preview: options.messagePreview,
        action_url: options.actionUrl,
      },
    });
  }

  /**
   * Dispatch thread reply notification
   */
  async notifyThreadReply(options: {
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetUserId: string;
    targetEmail?: string;
    targetPushToken?: string;
    channelId: string;
    channelName: string;
    threadId: string;
    messageId: string;
    messagePreview: string;
    actionUrl: string;
  }): Promise<SendNotificationResponse[]> {
    return this.dispatch({
      type: "thread.reply",
      timestamp: new Date().toISOString(),
      actor: {
        id: options.actorId,
        name: options.actorName,
        avatar_url: options.actorAvatar,
      },
      target: {
        user_id: options.targetUserId,
        user_email: options.targetEmail,
        user_push_token: options.targetPushToken,
      },
      data: {
        channel_id: options.channelId,
        channel_name: options.channelName,
        thread_id: options.threadId,
        message_id: options.messageId,
        message_preview: options.messagePreview,
        action_url: options.actionUrl,
      },
    });
  }

  /**
   * Dispatch direct message notification
   */
  async notifyDirectMessage(options: {
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetUserId: string;
    targetEmail?: string;
    targetPushToken?: string;
    messageId: string;
    messagePreview: string;
    actionUrl: string;
  }): Promise<SendNotificationResponse[]> {
    return this.dispatch({
      type: "dm.new",
      timestamp: new Date().toISOString(),
      actor: {
        id: options.actorId,
        name: options.actorName,
        avatar_url: options.actorAvatar,
      },
      target: {
        user_id: options.targetUserId,
        user_email: options.targetEmail,
        user_push_token: options.targetPushToken,
      },
      data: {
        message_id: options.messageId,
        message_preview: options.messagePreview,
        action_url: options.actionUrl,
      },
    });
  }

  /**
   * Dispatch channel invite notification
   */
  async notifyChannelInvite(options: {
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetUserId: string;
    targetEmail?: string;
    targetPushToken?: string;
    channelId: string;
    channelName: string;
    actionUrl: string;
  }): Promise<SendNotificationResponse[]> {
    return this.dispatch({
      type: "channel.invite",
      timestamp: new Date().toISOString(),
      actor: {
        id: options.actorId,
        name: options.actorName,
        avatar_url: options.actorAvatar,
      },
      target: {
        user_id: options.targetUserId,
        user_email: options.targetEmail,
        user_push_token: options.targetPushToken,
      },
      data: {
        channel_id: options.channelId,
        channel_name: options.channelName,
        action_url: options.actionUrl,
      },
    });
  }

  /**
   * Dispatch reminder notification
   */
  async notifyReminder(options: {
    targetUserId: string;
    targetEmail?: string;
    targetPushToken?: string;
    reminderTitle: string;
    reminderDescription?: string;
    actionUrl: string;
  }): Promise<SendNotificationResponse[]> {
    return this.dispatch({
      type: "reminder.due",
      timestamp: new Date().toISOString(),
      actor: {
        id: "system",
        name: "Reminder",
      },
      target: {
        user_id: options.targetUserId,
        user_email: options.targetEmail,
        user_push_token: options.targetPushToken,
      },
      data: {
        reminder_title: options.reminderTitle,
        reminder_description: options.reminderDescription,
        action_url: options.actionUrl,
      },
    });
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      // REMOVED: console.log(`[NotificationEventDispatcher] ${message}`, data || '')
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let eventDispatcherInstance: NotificationEventDispatcher | null = null;

export function getNotificationEventDispatcher(
  options?: EventDispatcherOptions,
): NotificationEventDispatcher {
  if (!eventDispatcherInstance) {
    eventDispatcherInstance = new NotificationEventDispatcher(options);
  }
  return eventDispatcherInstance;
}

export function resetNotificationEventDispatcher(): void {
  eventDispatcherInstance?.offAll();
  eventDispatcherInstance = null;
}
