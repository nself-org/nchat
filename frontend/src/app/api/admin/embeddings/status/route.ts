/**
 * Admin API: Embedding Job Status
 *
 * Get status of an embedding job
 *
 * GET /api/admin/embeddings/status?jobId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";

import { logger } from "@/lib/logger";

const GET_JOB_STATUS = gql`
  query GetJobStatus($jobId: uuid!) {
    nchat_embedding_jobs_by_pk(id: $jobId) {
      id
      job_type
      status
      total_messages
      processed_messages
      successful_embeddings
      failed_embeddings
      error_message
      started_at
      completed_at
      created_at
      updated_at
      metadata
    }
  }
`;

const GET_ALL_JOBS = gql`
  query GetAllJobs($limit: Int!) {
    nchat_embedding_jobs(order_by: { created_at: desc }, limit: $limit) {
      id
      job_type
      status
      total_messages
      processed_messages
      successful_embeddings
      failed_embeddings
      started_at
      completed_at
      created_at
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (jobId) {
      // Get specific job status
      const { data, errors } = await apolloClient.query({
        query: GET_JOB_STATUS,
        variables: { jobId },
        fetchPolicy: "network-only",
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      if (!data.nchat_embedding_jobs_by_pk) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const job = data.nchat_embedding_jobs_by_pk;

      // Calculate progress
      const percentage =
        job.total_messages > 0
          ? Math.floor((job.processed_messages / job.total_messages) * 100)
          : 0;

      // Estimate time remaining
      let estimatedTimeRemaining = null;
      if (
        job.status === "running" &&
        job.started_at &&
        job.processed_messages > 0
      ) {
        const elapsed = Date.now() - new Date(job.started_at).getTime();
        const avgTimePerMessage = elapsed / job.processed_messages;
        const remaining = job.total_messages - job.processed_messages;
        estimatedTimeRemaining = Math.floor(avgTimePerMessage * remaining);
      }

      return NextResponse.json({
        job: {
          ...job,
          percentage,
          estimatedTimeRemaining,
        },
      });
    } else {
      // Get all recent jobs
      const { data, errors } = await apolloClient.query({
        query: GET_ALL_JOBS,
        variables: { limit },
        fetchPolicy: "network-only",
      });

      if (errors) {
        throw new Error(errors[0].message);
      }

      return NextResponse.json({
        jobs: data.nchat_embedding_jobs,
      });
    }
  } catch (error) {
    logger.error("Get job status API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get job status",
      },
      { status: 500 },
    );
  }
}
