/**
 * Purpose:    "/api-docs/bots" — Bot API reference. Faithful port of the legacy
 *             frontend/src/app/api-docs/bots/page.tsx: 5 tabs (Overview, Auth, Endpoints,
 *             Webhooks, Examples) with permissions, endpoint specs, webhook payload/verify,
 *             retry schedule, and cURL/JS/Python code samples.
 * Inputs:     none — static reference content (from botApiContent.tsx).
 * Outputs:    Tabbed Bot API documentation.
 * Constraints:Client-only, presentational. Self-contained Tabs + CodeBlock (no shadcn/Radix).
 *             Slate theme. Content data lives in components/devtools/botApiContent.tsx.
 * SOT:        F-NCHAT-VITE-ROUTE — /api-docs/bots
 */
import { useState, type ReactNode } from 'react'
import { CodeBlock } from '@/components/devtools/CodeBlock'
import { Tabs, type TabDef } from '@/components/devtools/Tabs'
import {
  BOT_ENDPOINTS,
  BOT_PERMISSIONS,
  EXAMPLE_CURL,
  EXAMPLE_JS,
  EXAMPLE_PYTHON,
  WEBHOOK_EVENTS,
  WEBHOOK_PAYLOAD,
  WEBHOOK_RETRIES,
  WEBHOOK_VERIFY,
} from '@/components/devtools/botApiContent'

const TABS: ReadonlyArray<TabDef> = [
  { value: 'overview', label: 'Overview' },
  { value: 'auth', label: 'Auth' },
  { value: 'endpoints', label: 'Endpoints' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'examples', label: 'Examples' },
]

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}

export default function ApiDocsBotsPage() {
  const [active, setActive] = useState('overview')

  return (
    <div className="min-h-full bg-slate-950 px-6 py-8 text-slate-200">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Bot API Documentation</h1>
          <p className="text-lg text-slate-400">
            Build powerful integrations with the ɳChat Bot API
          </p>
        </div>

        <Tabs tabs={TABS} value={active} onChange={setActive}>
          {(tab) => {
            if (tab === 'overview') {
              return (
                <div className="space-y-6">
                  <Panel title="Getting Started" description="Learn the basics of the Bot API">
                    <div>
                      <h4 className="mb-2 text-base font-semibold">What is the Bot API?</h4>
                      <p className="text-slate-400">
                        The Bot API lets you build automated integrations and bots that can:
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
                        <li>Send messages to channels</li>
                        <li>Create and manage channels</li>
                        <li>Add reactions to messages</li>
                        <li>Read user and channel information</li>
                        <li>Receive webhooks for real-time events</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 text-base font-semibold">Base URL</h4>
                      <code className="rounded bg-slate-800 px-2 py-1 text-sm">
                        https://your-domain.com/api/bots
                      </code>
                    </div>
                    <div>
                      <h4 className="mb-2 text-base font-semibold">Rate Limits</h4>
                      <p className="text-slate-400">
                        100 requests per minute per bot. Rate limit headers are included in every
                        response:
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
                        <li>
                          <code>X-RateLimit-Remaining</code>: Requests remaining in current window
                        </li>
                        <li>
                          <code>X-RateLimit-Reset</code>: When the rate limit resets
                        </li>
                      </ul>
                    </div>
                  </Panel>
                  <Panel title="Permissions" description="Required permissions for API access">
                    <div className="grid gap-3">
                      {BOT_PERMISSIONS.map((p) => (
                        <div
                          key={p.name}
                          className="rounded-lg border border-slate-800 p-3"
                        >
                          <code className="font-mono text-sm text-sky-300">{p.name}</code>
                          <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              )
            }

            if (tab === 'auth') {
              return (
                <Panel title="Authentication" description="Authenticate your bot using API tokens">
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Creating a Bot Token</h4>
                    <ol className="list-inside list-decimal space-y-2 text-slate-400">
                      <li>Go to Admin → Bot Management</li>
                      <li>Create a new bot or select an existing one</li>
                      <li>Navigate to the Tokens tab</li>
                      <li>Click "Generate Token"</li>
                      <li>Select the required permissions (scopes)</li>
                      <li>Copy the token immediately (it won&apos;t be shown again)</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Using the Token</h4>
                    <p className="mb-3 text-slate-400">
                      Include your bot token in the Authorization header:
                    </p>
                    <CodeBlock code="Authorization: Bearer nbot_abc123def456..." language="bash" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Token Format</h4>
                    <p className="text-slate-400">
                      Bot tokens always start with <code className="rounded bg-slate-800 px-1">nbot_</code>{' '}
                      followed by 64 hexadecimal characters. Example:{' '}
                      <code className="rounded bg-slate-800 px-1">nbot_a1b2c3d4e5f6...</code>
                    </p>
                  </div>
                </Panel>
              )
            }

            if (tab === 'endpoints') {
              return (
                <div className="space-y-6">
                  {BOT_ENDPOINTS.map((ep) => (
                    <Panel key={ep.title} title={ep.title} description={ep.description}>
                      <span className="inline-block rounded bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                        {ep.scope}
                      </span>
                      {ep.query && (
                        <div>
                          <h4 className="mb-2 font-semibold">Query Parameters</h4>
                          <code className="rounded bg-slate-800 px-2 py-1 text-sm">{ep.query}</code>
                        </div>
                      )}
                      {ep.request && (
                        <div>
                          <h4 className="mb-2 font-semibold">{ep.request.heading}</h4>
                          <CodeBlock code={ep.request.code} language="json" />
                        </div>
                      )}
                      {ep.response && (
                        <div>
                          <h4 className="mb-2 font-semibold">{ep.response.heading}</h4>
                          <CodeBlock code={ep.response.code} language="json" />
                        </div>
                      )}
                    </Panel>
                  ))}
                </div>
              )
            }

            if (tab === 'webhooks') {
              return (
                <Panel title="Webhooks" description="Receive real-time events from ɳChat">
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Setting Up Webhooks</h4>
                    <ol className="list-inside list-decimal space-y-2 text-slate-400">
                      <li>Go to Admin → Bot Management</li>
                      <li>Select your bot</li>
                      <li>Navigate to the Webhooks tab</li>
                      <li>Click "Add Webhook"</li>
                      <li>Enter your webhook URL (must be HTTPS)</li>
                      <li>Select the events you want to receive</li>
                      <li>Save the webhook secret for signature verification</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Webhook Events</h4>
                    <div className="grid gap-2">
                      {WEBHOOK_EVENTS.map((e) => (
                        <div key={e} className="rounded bg-slate-800 p-2">
                          <code className="text-sm">{e}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Webhook Payload</h4>
                    <CodeBlock code={WEBHOOK_PAYLOAD} language="json" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Verifying Webhooks</h4>
                    <p className="mb-3 text-slate-400">
                      Every webhook includes a signature in the{' '}
                      <code className="rounded bg-slate-800 px-1">X-Webhook-Signature</code> header.
                      Verify it using HMAC-SHA256:
                    </p>
                    <CodeBlock code={WEBHOOK_VERIFY} language="javascript" />
                  </div>
                  <div>
                    <h4 className="mb-2 text-base font-semibold">Retry Logic</h4>
                    <p className="text-slate-400">
                      Failed webhooks are automatically retried up to 5 times with exponential
                      backoff:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-slate-400">
                      {WEBHOOK_RETRIES.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </Panel>
              )
            }

            return (
              <Panel title="Code Examples" description="Get started quickly with these examples">
                <div>
                  <h4 className="mb-3 text-base font-semibold">cURL</h4>
                  <CodeBlock code={EXAMPLE_CURL} language="bash" />
                </div>
                <div>
                  <h4 className="mb-3 text-base font-semibold">JavaScript</h4>
                  <CodeBlock code={EXAMPLE_JS} language="javascript" />
                </div>
                <div>
                  <h4 className="mb-3 text-base font-semibold">Python</h4>
                  <CodeBlock code={EXAMPLE_PYTHON} language="python" />
                </div>
              </Panel>
            )
          }}
        </Tabs>
      </div>
    </div>
  )
}
