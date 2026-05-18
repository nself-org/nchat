/**
 * GraphQL Playground Page
 *
 * Interactive GraphQL explorer for testing queries, mutations, and subscriptions.
 */

"use client";

import { useEffect, useState } from "react";

export default function GraphQLPlaygroundPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <p className="text-gray-600">Loading GraphQL Playground...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">GraphQL Playground</h1>
        <p className="mt-1 text-sm text-gray-500">
          Interactive GraphQL explorer - Test queries, mutations, and
          subscriptions
        </p>
      </div>

      <div className="p-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Quick Start</h2>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium">Example Query</h3>
              <pre className="rounded bg-gray-900 p-4 text-sm text-gray-100">
                {`query GetChannels {
  nchat_channels(
    limit: 10
    order_by: { created_at: desc }
  ) {
    id
    name
    description
    type
    member_count
  }
}`}
              </pre>
            </div>

            <div>
              <h3 className="mb-2 font-medium">Example Mutation</h3>
              <pre className="rounded bg-gray-900 p-4 text-sm text-gray-100">
                {`mutation SendMessage($channelId: uuid!, $content: String!) {
  insert_nchat_messages_one(
    object: {
      channel_id: $channelId
      content: $content
    }
  ) {
    id
    content
    created_at
    user {
      id
      display_name
    }
  }
}`}
              </pre>
            </div>

            <div>
              <h3 className="mb-2 font-medium">Example Subscription</h3>
              <pre className="rounded bg-gray-900 p-4 text-sm text-gray-100">
                {`subscription OnNewMessage($channelId: uuid!) {
  nchat_messages(
    where: { channel_id: { _eq: $channelId } }
    order_by: { created_at: desc }
    limit: 1
  ) {
    id
    content
    user {
      display_name
    }
  }
}`}
              </pre>
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 font-medium text-blue-900">
                GraphQL Endpoint
              </h3>
              <code className="text-sm text-blue-800">
                {process.env.NEXT_PUBLIC_GRAPHQL_URL ||
                  "http://localhost:8080/v1/graphql"}
              </code>

              <div className="mt-4">
                <a
                  href={
                    process.env.NEXT_PUBLIC_GRAPHQL_URL ||
                    "http://localhost:8080/v1/graphql"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Open Hasura Console
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">Documentation</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/docs/api/graphql-schema.md"
              className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm"
            >
              <h3 className="font-medium">GraphQL Schema</h3>
              <p className="mt-1 text-sm text-gray-600">
                Complete schema reference
              </p>
            </a>
            <a
              href="/docs/api/graphql-queries.md"
              className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm"
            >
              <h3 className="font-medium">Queries</h3>
              <p className="mt-1 text-sm text-gray-600">
                Query examples and patterns
              </p>
            </a>
            <a
              href="/docs/api/graphql-mutations.md"
              className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm"
            >
              <h3 className="font-medium">Mutations</h3>
              <p className="mt-1 text-sm text-gray-600">
                Create, update, delete operations
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
