"use client";

import { isDevelopment } from "@/lib/environment";
import { useEffect, useState } from "react";

export default function TestEnvPage() {
  const [clientInfo, setClientInfo] = useState<any>(null);

  useEffect(() => {
    const info = {
      isDevelopment: isDevelopment(),
      hostname: window.location.hostname,
      isLocalDomain: ["localhost", "127.0.0.1"].includes(
        window.location.hostname,
      ),
      windowLocation: {
        hostname: window.location.hostname,
        port: window.location.port,
        href: window.location.href,
        protocol: window.location.protocol,
      },
      processEnv: {
        NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
        NODE_ENV: process.env.NODE_ENV,
      },
    };
    setClientInfo(info);
  }, []);

  if (!clientInfo) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Environment Detection Test</h1>

      <div className="space-y-4">
        <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
          <h2 className="mb-2 font-semibold">Detection Results:</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              isDevelopment():{" "}
              <span
                className={
                  clientInfo.isDevelopment ? "text-green-600" : "text-red-600"
                }
              >
                {String(clientInfo.isDevelopment)}
              </span>
            </div>
            <div>hostname (direct): {clientInfo.hostname}</div>
            <div>
              isLocalDomain (direct): {String(clientInfo.isLocalDomain)}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
          <h2 className="mb-2 font-semibold">Window Location:</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>hostname: {clientInfo.windowLocation.hostname}</div>
            <div>port: {clientInfo.windowLocation.port || "(none)"}</div>
            <div>protocol: {clientInfo.windowLocation.protocol}</div>
            <div>href: {clientInfo.windowLocation.href}</div>
          </div>
        </div>

        <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800">
          <h2 className="mb-2 font-semibold">Environment Variables:</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              NEXT_PUBLIC_ENV:{" "}
              {clientInfo.processEnv.NEXT_PUBLIC_ENV || "(undefined)"}
            </div>
            <div>
              NODE_ENV: {clientInfo.processEnv.NODE_ENV || "(undefined)"}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-amber-100 p-4 dark:bg-amber-900/30">
          <h2 className="mb-2 font-semibold">
            Expected Auto-Prefill Values (if dev):
          </h2>
          {clientInfo.isDevelopment ? (
            <div className="space-y-2 text-sm">
              <div>✓ Email: owner@nself.org</div>
              <div>✓ Name: Admin User</div>
              <div>✓ Role: Platform Owner</div>
            </div>
          ) : (
            <div className="text-sm text-zinc-600">
              Auto-prefill is disabled in production mode
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
