/**
 * Notification Batch API Route
 *
 * POST - Send multiple notifications in batch
 * GET - Get batch job status
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

// ============================================================================
// Types & Validation
// ============================================================================

const NotificationSchema = z.object({
  type: z.enum([
    "mention",
    "direct_message",
    "thread_reply",
    "reaction",
    "channel_invite",
    "channel_update",
    "system",
    "announcement",
    "keyword",
  ]),
  priority: z
    .enum(["low", "normal", "high", "urgent"])
    .optional()
    .default("normal"),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  userId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const BatchCreateSchema = z.object({
  notifications: z.array(NotificationSchema).min(1).max(100),
  priority: z.enum(["sequential", "parallel"]).optional().default("parallel"),
  stopOnError: z.boolean().optional().default(false),
});

const BatchStatusSchema = z.object({
  batchId: z.string().uuid(),
});

// ============================================================================
// Types
// ============================================================================

interface BatchResult {
  batchId: string;
  total: number;
  successful: number;
  failed: number;
  status: "pending" | "processing" | "completed" | "failed";
  errors?: Array<{
    index: number;
    error: string;
  }>;
  createdNotifications?: Array<{
    index: number;
    id: string;
  }>;
}

// ============================================================================
// GraphQL Mutations
// ============================================================================

const CREATE_NOTIFICATION_MUTATION = `
  mutation CreateNotification($notification: nchat_notifications_insert_input!) {
    insert_nchat_notifications_one(object: $notification) {
      id
      type
      priority
      title
      body
      user_id
      created_at
    }
  }
`;

const CREATE_BATCH_JOB_MUTATION = `
  mutation CreateBatchJob($job: nchat_batch_jobs_insert_input!) {
    insert_nchat_batch_jobs_one(object: $job) {
      id
      status
      total
      successful
      failed
      created_at
    }
  }
`;

const GET_BATCH_JOB_QUERY = `
  query GetBatchJob($batchId: uuid!) {
    nchat_batch_jobs_by_pk(id: $batchId) {
      id
      status
      total
      successful
      failed
      errors
      results
      created_at
      updated_at
      completed_at
    }
  }
`;

const UPDATE_BATCH_JOB_MUTATION = `
  mutation UpdateBatchJob(
    $batchId: uuid!
    $status: String!
    $successful: Int!
    $failed: Int!
    $errors: jsonb
    $results: jsonb
  ) {
    update_nchat_batch_jobs_by_pk(
      pk_columns: { id: $batchId }
      _set: {
        status: $status
        successful: $successful
        failed: $failed
        errors: $errors
        results: $results
        updated_at: "now()"
        completed_at: "now()"
      }
    ) {
      id
      status
    }
  }
`;

// ============================================================================
// Helper Functions
// ============================================================================

async function executeGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  authToken?: string,
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const hasuraUrl =
    process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8080/v1/graphql";
  const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (hasuraAdminSecret) {
    headers["x-hasura-admin-secret"] = hasuraAdminSecret;
  } else if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(hasuraUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}

function getAuthToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * Process notifications in batches with rate limiting
 */
async function processBatch(
  notifications: z.infer<typeof NotificationSchema>[],
  options: {
    priority: "sequential" | "parallel";
    stopOnError: boolean;
    authToken?: string;
  },
): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  results: Array<{ index: number; id: string }>;
}> {
  const { priority, stopOnError, authToken } = options;
  const errors: Array<{ index: number; error: string }> = [];
  const results: Array<{ index: number; id: string }> = [];

  const batchSize = parseInt(process.env.NOTIFICATIONS_BATCH_SIZE || "50", 10);
  const batchInterval = parseInt(
    process.env.NOTIFICATIONS_BATCH_INTERVAL || "5000",
    10,
  );

  if (priority === "sequential") {
    // Process one at a time
    for (let i = 0; i < notifications.length; i++) {
      try {
        const notification = notifications[i];
        const result = await executeGraphQL<{
          insert_nchat_notifications_one: { id: string };
        }>(
          CREATE_NOTIFICATION_MUTATION,
          {
            notification: {
              type: notification.type,
              priority: notification.priority,
              title: notification.title,
              body: notification.body,
              user_id: notification.userId,
              actor_id: notification.actorId,
              channel_id: notification.channelId,
              message_id: notification.messageId,
              thread_id: notification.threadId,
              action_url: notification.actionUrl,
              metadata: notification.metadata,
              is_read: false,
              is_archived: false,
            },
          },
          authToken,
        );

        if (result.errors) {
          throw new Error(result.errors[0].message);
        }

        const createdId = result.data?.insert_nchat_notifications_one?.id;
        if (createdId) {
          results.push({ index: i, id: createdId });
        }

        // Add delay between batches
        if ((i + 1) % batchSize === 0 && i < notifications.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, batchInterval));
        }
      } catch (error) {
        errors.push({
          index: i,
          error:
            error instanceof Error
              ? error instanceof Error
                ? error.message
                : String(error)
              : "Unknown error",
        });

        if (stopOnError) {
          break;
        }
      }
    }
  } else {
    // Process in parallel batches
    for (
      let batchStart = 0;
      batchStart < notifications.length;
      batchStart += batchSize
    ) {
      const batch = notifications.slice(batchStart, batchStart + batchSize);
      const batchPromises = batch.map((notification, batchIndex) => {
        const globalIndex = batchStart + batchIndex;
        return executeGraphQL<{
          insert_nchat_notifications_one: { id: string };
        }>(
          CREATE_NOTIFICATION_MUTATION,
          {
            notification: {
              type: notification.type,
              priority: notification.priority,
              title: notification.title,
              body: notification.body,
              user_id: notification.userId,
              actor_id: notification.actorId,
              channel_id: notification.channelId,
              message_id: notification.messageId,
              thread_id: notification.threadId,
              action_url: notification.actionUrl,
              metadata: notification.metadata,
              is_read: false,
              is_archived: false,
            },
          },
          authToken,
        )
          .then((result) => {
            if (result.errors) {
              throw new Error(result.errors[0].message);
            }
            const createdId = result.data?.insert_nchat_notifications_one?.id;
            if (createdId) {
              results.push({ index: globalIndex, id: createdId });
            }
          })
          .catch((error) => {
            errors.push({
              index: globalIndex,
              error:
                error instanceof Error
                  ? error instanceof Error
                    ? error.message
                    : String(error)
                  : "Unknown error",
            });
          });
      });

      await Promise.allSettled(batchPromises);

      // Add delay between batches
      if (batchStart + batchSize < notifications.length) {
        await new Promise((resolve) => setTimeout(resolve, batchInterval));
      }

      // Stop if error encountered and stopOnError is true
      if (stopOnError && errors.length > 0) {
        break;
      }
    }
  }

  return {
    successful: results.length,
    failed: errors.length,
    errors,
    results,
  };
}

// ============================================================================
// POST - Create batch of notifications
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();

    const parsed = BatchCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: parsed.error.errors,
        },
        { status: 400 },
      );
    }

    const { notifications, priority, stopOnError } = parsed.data;

    // Create batch job record
    const batchId = crypto.randomUUID();
    const batchJob = {
      id: batchId,
      type: "notification_batch",
      status: "processing",
      total: notifications.length,
      successful: 0,
      failed: 0,
      errors: null,
      results: null,
    };

    await executeGraphQL(
      CREATE_BATCH_JOB_MUTATION,
      { job: batchJob },
      authToken,
    );

    // Process batch asynchronously
    processBatch(notifications, { priority, stopOnError, authToken })
      .then(async (result) => {
        // Update batch job with results
        await executeGraphQL(
          UPDATE_BATCH_JOB_MUTATION,
          {
            batchId,
            status: result.failed > 0 ? "completed_with_errors" : "completed",
            successful: result.successful,
            failed: result.failed,
            errors: result.errors,
            results: result.results,
          },
          authToken,
        );
      })
      .catch(async (error) => {
        // Update batch job with failure
        await executeGraphQL(
          UPDATE_BATCH_JOB_MUTATION,
          {
            batchId,
            status: "failed",
            successful: 0,
            failed: notifications.length,
            errors: [
              {
                index: -1,
                error: error instanceof Error ? error.message : String(error),
              },
            ],
            results: [],
          },
          authToken,
        );
      });

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        total: notifications.length,
        status: "processing",
        message: "Batch job created and processing",
      },
    });
  } catch (error) {
    logger.error("POST /api/notifications/batch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - Get batch job status
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authToken = getAuthToken(request);
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batch_id");

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: "batch_id is required" },
        { status: 400 },
      );
    }

    const result = await executeGraphQL<{
      nchat_batch_jobs_by_pk: any;
    }>(GET_BATCH_JOB_QUERY, { batchId }, authToken);

    if (result.errors) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch batch job",
          details: result.errors,
        },
        { status: 500 },
      );
    }

    const job = result.data?.nchat_batch_jobs_by_pk;
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Batch job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId: job.id,
        status: job.status,
        total: job.total,
        successful: job.successful,
        failed: job.failed,
        errors: job.errors,
        results: job.results,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      },
    });
  } catch (error) {
    logger.error("GET /api/notifications/batch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
