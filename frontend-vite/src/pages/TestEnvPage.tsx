/**
 * Purpose:    "/test-env" — environment-detection diagnostics page. Faithful port of the legacy
 *             frontend/src/app/test-env/page.tsx: shows isDevelopment(), window.location facts,
 *             build env vars, and the expected dev auto-prefill values.
 * Inputs:     none (reads window.location + import.meta.env on mount).
 * Outputs:    Diagnostic cards. Mirrors legacy "Loading..." gate while client info resolves.
 * Constraints:Client-only (browser globals). Next's process.env.* mapped to Vite import.meta.env:
 *             NEXT_PUBLIC_ENV -> VITE_APP_ENV, NODE_ENV -> import.meta.env.MODE. Slate theme.
 * SOT:        F-NCHAT-VITE-ROUTE — /test-env
 */
import { useEffect, useState } from 'react'

interface ClientInfo {
  isDevelopment: boolean
  hostname: string
  isLocalDomain: boolean
  port: string
  href: string
  protocol: string
  appEnv: string | undefined
  mode: string
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1']

export default function TestEnvPage() {
  const [info, setInfo] = useState<ClientInfo | null>(null)

  useEffect(() => {
    const { hostname, port, href, protocol } = window.location
    const isLocalDomain = LOCAL_HOSTS.includes(hostname)
    setInfo({
      isDevelopment: import.meta.env.DEV || isLocalDomain,
      hostname,
      isLocalDomain,
      port,
      href,
      protocol,
      appEnv: import.meta.env.VITE_APP_ENV as string | undefined,
      mode: import.meta.env.MODE,
    })
  }, [])

  if (!info) return <div className="p-8 text-slate-400">Loading...</div>

  return (
    <div className="mx-auto max-w-4xl p-8 text-slate-200">
      <h1 className="mb-6 text-2xl font-bold">Environment Detection Test</h1>

      <div className="space-y-4">
        <section className="rounded-lg bg-slate-800/60 p-4">
          <h2 className="mb-2 font-semibold">Detection Results:</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              isDevelopment():{' '}
              <span className={info.isDevelopment ? 'text-emerald-400' : 'text-rose-400'}>
                {String(info.isDevelopment)}
              </span>
            </div>
            <div>hostname (direct): {info.hostname}</div>
            <div>isLocalDomain (direct): {String(info.isLocalDomain)}</div>
          </div>
        </section>

        <section className="rounded-lg bg-slate-800/60 p-4">
          <h2 className="mb-2 font-semibold">Window Location:</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>hostname: {info.hostname}</div>
            <div>port: {info.port || '(none)'}</div>
            <div>protocol: {info.protocol}</div>
            <div>href: {info.href}</div>
          </div>
        </section>

        <section className="rounded-lg bg-slate-800/60 p-4">
          <h2 className="mb-2 font-semibold">Environment Variables:</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>VITE_APP_ENV: {info.appEnv || '(undefined)'}</div>
            <div>MODE: {info.mode || '(undefined)'}</div>
          </div>
        </section>

        <section className="rounded-lg bg-amber-900/30 p-4">
          <h2 className="mb-2 font-semibold">Expected Auto-Prefill Values (if dev):</h2>
          {info.isDevelopment ? (
            <div className="space-y-2 text-sm">
              <div>✓ Email: owner@nself.org</div>
              <div>✓ Name: Admin User</div>
              <div>✓ Role: Platform Owner</div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Auto-prefill is disabled in production mode</div>
          )}
        </section>
      </div>
    </div>
  )
}
