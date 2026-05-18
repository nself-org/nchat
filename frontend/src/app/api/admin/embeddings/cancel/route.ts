/**
 * Admin API: Cancel Embedding Job
 *
 * Cancel a running embedding job
 *
 * POST /api/admin/embeddings/cancel
 */

import { NextRequest, NextResponse } from "next/server";
import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";

import { logger } from "@/lib/logger";

const CANCEL_JOB = gql`
  mutation CancelEmbeddingJob($jobId: uuid!) {
    update_nchat_embedding_jobs_by_pk(
      pk_columns: { id: $jobId }
      _set: { status: "cancelled", completed_at: "now()" }
    ) {
      id
      status
      completed_at
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 },
      );
    }

    const { data, errors } = await apolloClient.mutate({
      mutation: CANCEL_JOB,
      variables: { jobId },
    });

    if (errors) {
      throw new Error(errors[0].message);
    }

    if (!data.update_nchat_embedding_jobs_by_pk) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
      job: data.update_nchat_embedding_jobs_by_pk,
    });
  } catch (error) {
    logger.error("Cancel job API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to cancel job",
      },
      { status: 500 },
    );
  }
}
