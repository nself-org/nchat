/**
 * Purpose:    "/graphql-playground" — interactive GraphQL explorer. Faithful port of the legacy
 *             frontend/src/app/graphql-playground/page.tsx (quick-start examples + endpoint link +
 *             docs cards) PLUS a live query runner wired to the canonical urql client so the page
 *             is genuinely interactive (legacy only linked out to Hasura console).
 * Inputs:     none. Endpoint resolved from VITE_GRAPHQL_URL (build env).
 * Outputs:    Header, live runner (GraphqlRunner), example query/mutation/subscription snippets,
 *             endpoint card with console link, and documentation links.
 * Constraints:Client-only. GraphQL via urql (@nself/graphql-client) — never raw fetch (canonical §2).
 *             Slate theme to match the SPA shell.
 * SOT:        F-NCHAT-VITE-ROUTE — /graphql-playground
 */
import { CodeBlock } from '@/components/devtools/CodeBlock'
import { GraphqlRunner } from '@/components/devtools/GraphqlRunner'

const GRAPHQL_URL =
  (import.meta.env.VITE_GRAPHQL_URL as string | undefined) ?? 'http://localhost:8080/v1/graphql'

const EXAMPLE_QUERY = `query GetChannels {
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
}`

const EXAMPLE_MUTATION = `mutation SendMessage($channelId: uuid!, $content: String!) {
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
}`

const EXAMPLE_SUBSCRIPTION = `subscription OnNewMessage($channelId: uuid!) {
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
}`

const DOC_LINKS = [
  { href: '/docs/api/graphql-schema.md', title: 'GraphQL Schema', body: 'Complete schema reference' },
  { href: '/docs/api/graphql-queries.md', title: 'Queries', body: 'Query examples and patterns' },
  {
    href: '/docs/api/graphql-mutations.md',
    title: 'Mutations',
    body: 'Create, update, delete operations',
  },
]

export default function GraphqlPlaygroundPage() {
  return (
    <div className="min-h-full bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-2xl font-bold">GraphQL Playground</h1>
        <p className="mt-1 text-sm text-slate-400">
          Interactive GraphQL explorer — test queries, mutations, and subscriptions
        </p>
      </header>

      <div className="space-y-8 p-6">
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Run a Query</h2>
          <GraphqlRunner initialQuery={EXAMPLE_QUERY} />
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Quick Start</h2>
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium">Example Query</h3>
              <CodeBlock code={EXAMPLE_QUERY} language="graphql" />
            </div>
            <div>
              <h3 className="mb-2 font-medium">Example Mutation</h3>
              <CodeBlock code={EXAMPLE_MUTATION} language="graphql" />
            </div>
            <div>
              <h3 className="mb-2 font-medium">Example Subscription</h3>
              <CodeBlock code={EXAMPLE_SUBSCRIPTION} language="graphql" />
            </div>

            <div className="rounded-lg bg-sky-950/40 p-4">
              <h3 className="mb-2 font-medium text-sky-200">GraphQL Endpoint</h3>
              <code className="text-sm text-sky-300">{GRAPHQL_URL}</code>
              <div className="mt-4">
                <a
                  href={GRAPHQL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                >
                  Open Hasura Console
                </a>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Documentation</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {DOC_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg border border-slate-800 p-4 hover:border-slate-600 hover:bg-slate-900/60"
              >
                <h3 className="font-medium">{link.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{link.body}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
