/**
 * Next.js Instrumentation File
 *
 * This file is automatically loaded by Next.js on both server and edge runtimes.
 * It's used to initialize monitoring and observability tools like Sentry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Initialize server-side instrumentation (Node.js runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }

  // Initialize edge runtime instrumentation
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./instrumentation.edge");
  }
}
