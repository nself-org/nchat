/**
 * Embedding Pipeline - Automated embedding generation and management
 *
 * Handles automatic embedding generation for messages, including:
 * - New message embedding
 * - Batch embedding for existing messages
 * - Re-embedding on message edit
 * - Retry logic for failed embeddings
 * - Progress tracking
 *
 * @module lib/ai/embedding-pipeline
 */

import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";
import { embeddingService, EmbeddingRequest } from "./embedding-service";
import {
  vectorStore,
  BatchEmbeddingOperation,
} from "@/lib/database/vector-store";

import { logger } from "@/lib/logger";

// ========================================
// Types
// ========================================

export interface PipelineConfig {
  batchSize: number;
  maxRetries: number;
  retryDelayMs: number;
  maxConcurrent: number;
}

export interface PipelineProgress {
  jobId: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentage: number;
  estimatedTimeRemaining: number;
}

export interface MessageForEmbedding {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
}

// ========================================
// GraphQL Queries
// ========================================

const GET_MESSAGES_WITHOUT_EMBEDDINGS = gql`
  query GetMessagesWithoutEmbeddings($limit: Int!, $offset: Int!) {
    nchat_messages(
      where: {
        embedding: { _is_null: true }
        is_deleted: { _eq: false }
        type: { _eq: "text" }
        content: { _is_null: false, _neq: "" }
      }
      order_by: { created_at: asc }
      limit: $limit
      offset: $offset
    ) {
      id
      content
      channel_id
      user_id
      created_at
    }
  }
`;

const COUNT_MESSAGES_WITHOUT_EMBEDDINGS = gql`
  query CountMessagesWithoutEmbeddings {
    nchat_messages_aggregate(
      where: {
        embedding: { _is_null: true }
        is_deleted: { _eq: false }
        type: { _eq: "text" }
        content: { _is_null: false, _neq: "" }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_MESSAGES_WITH_ERRORS = gql`
  query GetMessagesWithErrors($maxRetries: Int!, $limit: Int!) {
    nchat_messages(
      where: {
        embedding_error: { _is_null: false }
        embedding_retry_count: { _lt: $maxRetries }
        is_deleted: { _eq: false }
      }
      order_by: { embedding_retry_count: asc, updated_at: asc }
      limit: $limit
    ) {
      id
      content
      channel_id
      user_id
      embedding_retry_count
      embedding_error
    }
  }
`;

const GET_EMBEDDING_QUEUE = gql`
  query GetEmbeddingQueue($limit: Int!) {
    nchat_embedding_queue(
      where: { claimed_at: { _is_null: true }, retry_count: { _lt: 3 } }
      order_by: [{ priority: desc }, { scheduled_at: asc }]
      limit: $limit
    ) {
      id
      message_id
      priority
      retry_count
    }
  }
`;

const CLAIM_QUEUE_ITEMS = gql`
  mutation ClaimQueueItems($ids: [uuid!]!, $workerId: String!) {
    update_nchat_embedding_queue(
      where: { id: { _in: $ids } }
      _set: { claimed_at: "now()", claimed_by: $workerId }
    ) {
      affected_rows
      returning {
        id
        message_id
      }
    }
  }
`;

const REMOVE_FROM_QUEUE = gql`
  mutation RemoveFromQueue($messageIds: [uuid!]!) {
    delete_nchat_embedding_queue(where: { message_id: { _in: $messageIds } }) {
      affected_rows
    }
  }
`;

const CREATE_EMBEDDING_JOB = gql`
  mutation CreateEmbeddingJob(
    $jobType: String!
    $totalMessages: Int!
    $createdBy: uuid
    $metadata: jsonb
  ) {
    insert_nchat_embedding_jobs_one(
      object: {
        job_type: $jobType
        status: "pending"
        total_messages: $totalMessages
        created_by: $createdBy
        metadata: $metadata
      }
    ) {
      id
      job_type
      total_messages
      created_at
    }
  }
`;

const UPDATE_JOB_PROGRESS = gql`
  mutation UpdateJobProgress(
    $jobId: uuid!
    $status: String!
    $processedMessages: Int!
    $successfulEmbeddings: Int!
    $failedEmbeddings: Int!
  ) {
    update_nchat_embedding_jobs_by_pk(
      pk_columns: { id: $jobId }
      _set: {
        status: $status
        processed_messages: $processedMessages
        successful_embeddings: $successfulEmbeddings
        failed_embeddings: $failedEmbeddings
        updated_at: "now()"
      }
    ) {
      id
      status
    }
  }
`;

const COMPLETE_JOB = gql`
  mutation CompleteJob($jobId: uuid!, $status: String!, $errorMessage: String) {
    update_nchat_embedding_jobs_by_pk(
      pk_columns: { id: $jobId }
      _set: {
        status: $status
        completed_at: "now()"
        error_message: $errorMessage
      }
    ) {
      id
      status
      completed_at
    }
  }
`;

const START_JOB = gql`
  mutation StartJob($jobId: uuid!) {
    update_nchat_embedding_jobs_by_pk(
      pk_columns: { id: $jobId }
      _set: { status: "running", started_at: "now()" }
    ) {
      id
    }
  }
`;

// ========================================
// Default Configuration
// ========================================

const DEFAULT_CONFIG: PipelineConfig = {
  batchSize: 100,
  maxRetries: 3,
  retryDelayMs: 5000,
  maxConcurrent: 5,
};

// ========================================
// Embedding Pipeline Class
// ========================================

export class EmbeddingPipeline {
  private client = apolloClient;
  private config: PipelineConfig;
  private progressCallbacks = new Map<
    string,
    (progress: PipelineProgress) => void
  >();

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate embeddings for all messages without embeddings
   */
  async generateAllEmbeddings(
    userId?: string,
    onProgress?: (progress: PipelineProgress) => void,
  ): Promise<string> {
    // Count total messages
    const { data: countData } = await this.client.query({
      query: COUNT_MESSAGES_WITHOUT_EMBEDDINGS,
      fetchPolicy: "network-only",
    });

    const totalMessages = countData.nchat_messages_aggregate.aggregate.count;

    if (totalMessages === 0) {
      throw new Error("No messages need embeddings");
    }

    // Create job
    const { data: jobData } = await this.client.mutate({
      mutation: CREATE_EMBEDDING_JOB,
      variables: {
        jobType: "initial",
        totalMessages,
        createdBy: userId || null,
        metadata: { batchSize: this.config.batchSize },
      },
    });

    const jobId = jobData.insert_nchat_embedding_jobs_one.id;

    // Register progress callback
    if (onProgress) {
      this.progressCallbacks.set(jobId, onProgress);
    }

    // Start job asynchronously
    this.processJob(jobId, totalMessages).catch((error) => {
      logger.error(`Job ${jobId} failed:`, error);
    });

    return jobId;
  }

  /**
   * Re-generate embeddings for messages with errors
   */
  async retryFailedEmbeddings(
    userId?: string,
    onProgress?: (progress: PipelineProgress) => void,
  ): Promise<string> {
    // Get failed messages count
    const { data } = await this.client.query({
      query: GET_MESSAGES_WITH_ERRORS,
      variables: {
        maxRetries: this.config.maxRetries,
        limit: 10000,
      },
      fetchPolicy: "network-only",
    });

    const messages = data.nchat_messages;

    if (messages.length === 0) {
      throw new Error("No failed embeddings to retry");
    }

    // Create job
    const { data: jobData } = await this.client.mutate({
      mutation: CREATE_EMBEDDING_JOB,
      variables: {
        jobType: "repair",
        totalMessages: messages.length,
        createdBy: userId || null,
        metadata: { maxRetries: this.config.maxRetries },
      },
    });

    const jobId = jobData.insert_nchat_embedding_jobs_one.id;

    if (onProgress) {
      this.progressCallbacks.set(jobId, onProgress);
    }

    // Process retries
    this.processRetryJob(jobId, messages).catch((error) => {
      logger.error(`Retry job ${jobId} failed:`, error);
    });

    return jobId;
  }

  /**
   * Process embedding queue (called by workers)
   */
  async processQueue(
    workerId: string,
    limit = 50,
  ): Promise<{ processed: number; successful: number; failed: number }> {
    // Get queue items
    const { data } = await this.client.query({
      query: GET_EMBEDDING_QUEUE,
      variables: { limit },
      fetchPolicy: "network-only",
    });

    const queueItems = data.nchat_embedding_queue;

    if (queueItems.length === 0) {
      return { processed: 0, successful: 0, failed: 0 };
    }

    // Claim queue items
    const queueIds = queueItems.map((item: any) => item.id);
    await this.client.mutate({
      mutation: CLAIM_QUEUE_ITEMS,
      variables: { ids: queueIds, workerId },
    });

    // Get message details
    const messageIds = queueItems.map((item: any) => item.message_id);
    const { data: messagesData } = await this.client.query({
      query: gql`
        query GetQueuedMessages($ids: [uuid!]!) {
          nchat_messages(where: { id: { _in: $ids } }) {
            id
            content
            channel_id
            user_id
            created_at
          }
        }
      `,
      variables: { ids: messageIds },
      fetchPolicy: "network-only",
    });

    const messages: MessageForEmbedding[] = messagesData.nchat_messages;

    // Generate embeddings
    const result = await this.processBatch(messages);

    // Remove from queue
    const successfulIds = result.successful.map((m) => m.id);
    if (successfulIds.length > 0) {
      await this.client.mutate({
        mutation: REMOVE_FROM_QUEUE,
        variables: { messageIds: successfulIds },
      });
    }

    return {
      processed: messages.length,
      successful: result.successful.length,
      failed: result.failed.length,
    };
  }

  /**
   * Process a single job
   */
  private async processJob(
    jobId: string,
    totalMessages: number,
  ): Promise<void> {
    const startTime = Date.now();
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      // Start job
      await this.client.mutate({
        mutation: START_JOB,
        variables: { jobId },
      });

      // Process in batches
      while (processed < totalMessages) {
        const { data } = await this.client.query({
          query: GET_MESSAGES_WITHOUT_EMBEDDINGS,
          variables: {
            limit: this.config.batchSize,
            offset: processed,
          },
          fetchPolicy: "network-only",
        });

        const messages: MessageForEmbedding[] = data.nchat_messages;

        if (messages.length === 0) {
          break;
        }

        const result = await this.processBatch(messages);
        processed += messages.length;
        successful += result.successful.length;
        failed += result.failed.length;

        // Update progress
        await this.updateProgress(jobId, {
          total: totalMessages,
          processed,
          successful,
          failed,
          startTime,
        });
      }

      // Complete job
      await this.client.mutate({
        mutation: COMPLETE_JOB,
        variables: {
          jobId,
          status: "completed",
          errorMessage: null,
        },
      });
    } catch (error) {
      logger.error(`Job ${jobId} error:`, error);

      await this.client.mutate({
        mutation: COMPLETE_JOB,
        variables: {
          jobId,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      this.progressCallbacks.delete(jobId);
    }
  }

  /**
   * Process retry job
   */
  private async processRetryJob(
    jobId: string,
    messages: MessageForEmbedding[],
  ): Promise<void> {
    const startTime = Date.now();
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      await this.client.mutate({
        mutation: START_JOB,
        variables: { jobId },
      });

      // Process in batches
      for (let i = 0; i < messages.length; i += this.config.batchSize) {
        const batch = messages.slice(i, i + this.config.batchSize);
        const result = await this.processBatch(batch);

        processed += batch.length;
        successful += result.successful.length;
        failed += result.failed.length;

        await this.updateProgress(jobId, {
          total: messages.length,
          processed,
          successful,
          failed,
          startTime,
        });
      }

      await this.client.mutate({
        mutation: COMPLETE_JOB,
        variables: { jobId, status: "completed", errorMessage: null },
      });
    } catch (error) {
      await this.client.mutate({
        mutation: COMPLETE_JOB,
        variables: {
          jobId,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      this.progressCallbacks.delete(jobId);
    }
  }

  /**
   * Process a batch of messages
   */
  private async processBatch(messages: MessageForEmbedding[]): Promise<{
    successful: MessageForEmbedding[];
    failed: MessageForEmbedding[];
  }> {
    const successful: MessageForEmbedding[] = [];
    const failed: MessageForEmbedding[] = [];

    try {
      // Prepare requests
      const requests: EmbeddingRequest[] = messages.map((msg) => ({
        text: msg.content,
        messageId: msg.id,
      }));

      // Generate embeddings
      const response = await embeddingService.batchGenerateEmbeddings(requests);

      // Prepare batch operations
      const operations: BatchEmbeddingOperation[] = response.embeddings.map(
        (emb) => ({
          messageId: emb.messageId,
          embedding: emb.embedding,
          metadata: {
            model: embeddingService.getModel(),
            version: embeddingService.getVersion(),
          },
        }),
      );

      // Insert into vector store
      await vectorStore.batchInsertEmbeddings(operations);

      successful.push(...messages);
    } catch (error) {
      logger.error("Batch processing error:", error);

      // Record errors for each message
      for (const message of messages) {
        await vectorStore.recordError(
          message.id,
          error instanceof Error ? error.message : String(error),
          1,
        );
        failed.push(message);
      }
    }

    return { successful, failed };
  }

  /**
   * Update job progress
   */
  private async updateProgress(
    jobId: string,
    data: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
      startTime: number;
    },
  ): Promise<void> {
    const { total, processed, successful, failed, startTime } = data;

    // Update database
    await this.client.mutate({
      mutation: UPDATE_JOB_PROGRESS,
      variables: {
        jobId,
        status: "running",
        processedMessages: processed,
        successfulEmbeddings: successful,
        failedEmbeddings: failed,
      },
    });

    // Calculate progress
    const percentage = Math.floor((processed / total) * 100);
    const elapsed = Date.now() - startTime;
    const avgTimePerMessage = elapsed / processed;
    const remaining = total - processed;
    const estimatedTimeRemaining = Math.floor(avgTimePerMessage * remaining);

    const progress: PipelineProgress = {
      jobId,
      total,
      processed,
      successful,
      failed,
      percentage,
      estimatedTimeRemaining,
    };

    // Call callback if registered
    const callback = this.progressCallbacks.get(jobId);
    if (callback) {
      callback(progress);
    }
  }
}

// Export singleton instance
export const embeddingPipeline = new EmbeddingPipeline();
