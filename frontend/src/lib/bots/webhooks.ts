/**
 * Bot Webhooks System
 * Handles outgoing webhook delivery with retry logic
 */

import { gql } from "@apollo/client";
import { getApolloClient } from "@/lib/apollo-client";
import { signWebhookPayload } from "./tokens";

import { logger } from "@/lib/logger";

/**
 * Webhook event types
 */
export enum WebhookEvent {
  MESSAGE_CREATED = "message.created",
  MESSAGE_UPDATED = "message.updated",
  MESSAGE_DELETED = "message.deleted",
  CHANNEL_CREATED = "channel.created",
  CHANNEL_UPDATED = "channel.updated",
  CHANNEL_DELETED = "channel.deleted",
  USER_JOINED = "user.joined",
  USER_LEFT = "user.left",
  REACTION_ADDED = "reaction.added",
  REACTION_REMOVED = "reaction.removed",
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  attemptNumber: number;
}

/**
 * GraphQL query to get webhooks for event
 */
const GET_WEBHOOKS_FOR_EVENT = gql`
  query GetWebhooksForEvent($event: String!) {
    nchat_bot_webhooks(
      where: { is_active: { _eq: true }, events: { _contains: [$event] } }
    ) {
      id
      bot_id
      url
      secret
      bot {
        name
        is_active
      }
    }
  }
`;

/**
 * GraphQL mutation to log webhook delivery
 */
const LOG_WEBHOOK_DELIVERY = gql`
  mutation LogWebhookDelivery(
    $webhookId: uuid!
    $eventType: String!
    $payload: jsonb!
    $statusCode: Int
    $responseBody: String
    $success: Boolean!
    $attemptNumber: Int!
  ) {
    insert_nchat_bot_webhook_logs_one(
      object: {
        webhook_id: $webhookId
        event_type: $eventType
        payload: $payload
        status_code: $statusCode
        response_body: $responseBody
        success: $success
        attempt_number: $attemptNumber
      }
    ) {
      id
    }
  }
`;

/**
 * GraphQL mutation to update webhook stats
 */
const UPDATE_WEBHOOK_STATS = gql`
  mutation UpdateWebhookStats($webhookId: uuid!, $failureIncrement: Int!) {
    update_nchat_bot_webhooks_by_pk(
      pk_columns: { id: $webhookId }
      _set: { last_triggered_at: "now()" }
      _inc: { delivery_count: 1, failure_count: $failureIncrement }
    ) {
      id
    }
  }
`;

/**
 * Deliver webhook with retry logic
 * Retries up to 3 times with exponential backoff
 *
 * @param webhookId - Webhook ID
 * @param url - Webhook URL
 * @param secret - Webhook secret for signing
 * @param payload - Webhook payload
 * @param attemptNumber - Current attempt number (1-5)
 * @returns Delivery result
 */
async function deliverWebhookWithRetry(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
  attemptNumber: number = 1,
): Promise<WebhookDeliveryResult> {
  const maxAttempts = 5;

  try {
    // Prepare payload
    const payloadString = JSON.stringify(payload);
    const signature = signWebhookPayload(payloadString, secret);

    // Send HTTP request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": payload.event,
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Delivery": webhookId,
        "X-Webhook-Attempt": attemptNumber.toString(),
        "User-Agent": "nself-chat-bot-webhook/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseBody = await response.text();
    const success = response.ok;

    const result: WebhookDeliveryResult = {
      success,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000), // Limit to 1000 chars
      attemptNumber,
    };

    // Log delivery
    const client = getApolloClient();
    await client.mutate({
      mutation: LOG_WEBHOOK_DELIVERY,
      variables: {
        webhookId,
        eventType: payload.event,
        payload: payload.data,
        statusCode: response.status,
        responseBody: result.responseBody,
        success,
        attemptNumber,
      },
    });

    // If failed and we have attempts left, retry with backoff
    if (!success && attemptNumber < maxAttempts) {
      const backoffMs = Math.min(1000 * Math.pow(2, attemptNumber), 60000); // Max 60s

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return deliverWebhookWithRetry(
        webhookId,
        url,
        secret,
        payload,
        attemptNumber + 1,
      );
    }

    return result;
  } catch (error: any) {
    logger.error(
      `Webhook delivery error (attempt ${attemptNumber}/${maxAttempts}):`,
      error,
    );

    const result: WebhookDeliveryResult = {
      success: false,
      error: error.message,
      attemptNumber,
    };

    // Log delivery failure
    try {
      const client = getApolloClient();
      await client.mutate({
        mutation: LOG_WEBHOOK_DELIVERY,
        variables: {
          webhookId,
          eventType: payload.event,
          payload: payload.data,
          statusCode: null,
          responseBody: error.message,
          success: false,
          attemptNumber,
        },
      });
    } catch (logError) {
      logger.error("Failed to log webhook error:", logError);
    }

    // Retry if we have attempts left
    if (attemptNumber < maxAttempts) {
      const backoffMs = Math.min(1000 * Math.pow(2, attemptNumber), 60000);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return deliverWebhookWithRetry(
        webhookId,
        url,
        secret,
        payload,
        attemptNumber + 1,
      );
    }

    return result;
  }
}

/**
 * Trigger webhooks for an event
 * Finds all active webhooks subscribed to the event and delivers the payload
 *
 * @param event - The webhook event type
 * @param data - The event data
 *
 * @example
 * await triggerWebhooks(WebhookEvent.MESSAGE_CREATED, {
 *   messageId: 'msg_123',
 *   channelId: 'ch_456',
 *   content: 'Hello world',
 *   authorId: 'usr_789',
 *   createdAt: new Date().toISOString(),
 * });
 */
export async function triggerWebhooks(
  event: WebhookEvent,
  data: Record<string, any>,
): Promise<void> {
  try {
    // Fetch webhooks subscribed to this event
    const client = getApolloClient();
    const { data: webhooksData } = await client.query({
      query: GET_WEBHOOKS_FOR_EVENT,
      variables: { event },
      fetchPolicy: "network-only",
    });

    const webhooks = webhooksData?.nchat_bot_webhooks || [];

    if (webhooks.length === 0) {
      return; // No webhooks to trigger
    }

    // Prepare payload
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Deliver to all webhooks (in parallel for better performance)
    const deliveries = webhooks.map(async (webhook: any) => {
      // Skip inactive bots
      if (!webhook.bot?.is_active) {
        return;
      }

      try {
        const result = await deliverWebhookWithRetry(
          webhook.id,
          webhook.url,
          webhook.secret,
          payload,
        );

        // Update webhook stats
        await client.mutate({
          mutation: UPDATE_WEBHOOK_STATS,
          variables: {
            webhookId: webhook.id,
            failureIncrement: result.success ? 0 : 1,
          },
        });

        if (!result.success) {
          console.error(
            `Webhook delivery failed after ${result.attemptNumber} attempts:`,
            {
              webhookId: webhook.id,
              event,
              error: result.error || `HTTP ${result.statusCode}`,
            },
          );
        }
      } catch (error) {
        logger.error("Error in webhook delivery process:", error);
      }
    });

    await Promise.allSettled(deliveries);
  } catch (error) {
    logger.error("Error triggering webhooks:", error);
    // Don't throw - webhook delivery failures shouldn't break the main flow
  }
}

/**
 * Test webhook delivery
 * Sends a test payload to verify webhook configuration
 *
 * @param webhookId - Webhook ID
 * @param url - Webhook URL
 * @param secret - Webhook secret
 * @returns Delivery result
 */
export async function testWebhook(
  webhookId: string,
  url: string,
  secret: string,
): Promise<WebhookDeliveryResult> {
  const payload: WebhookPayload = {
    event: "test" as WebhookEvent,
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: "This is a test webhook delivery",
    },
  };

  return deliverWebhookWithRetry(webhookId, url, secret, payload, 1);
}

/**
 * Helper functions to trigger specific events
 */

export async function triggerMessageCreated(message: {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: string;
}) {
  await triggerWebhooks(WebhookEvent.MESSAGE_CREATED, {
    messageId: message.id,
    channelId: message.channelId,
    authorId: message.userId,
    content: message.content,
    createdAt: message.createdAt,
  });
}

export async function triggerMessageDeleted(message: {
  id: string;
  channelId: string;
  userId: string;
}) {
  await triggerWebhooks(WebhookEvent.MESSAGE_DELETED, {
    messageId: message.id,
    channelId: message.channelId,
    authorId: message.userId,
    deletedAt: new Date().toISOString(),
  });
}

export async function triggerChannelCreated(channel: {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
}) {
  await triggerWebhooks(WebhookEvent.CHANNEL_CREATED, {
    channelId: channel.id,
    name: channel.name,
    description: channel.description,
    isPrivate: channel.isPrivate,
    createdBy: channel.createdBy,
    createdAt: channel.createdAt,
  });
}

export async function triggerUserJoined(data: {
  userId: string;
  channelId: string;
  joinedAt: string;
}) {
  await triggerWebhooks(WebhookEvent.USER_JOINED, data);
}

export async function triggerReactionAdded(reaction: {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}) {
  await triggerWebhooks(WebhookEvent.REACTION_ADDED, {
    reactionId: reaction.id,
    messageId: reaction.messageId,
    userId: reaction.userId,
    emoji: reaction.emoji,
    createdAt: reaction.createdAt,
  });
}
