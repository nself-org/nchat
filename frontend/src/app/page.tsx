"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { LandingPage } from "@/components/landing/landing-page";

/**
 * HomePage
 *
 * Renders the public LandingPage on `/`. Redirects driven by user state
 * (logged-in -> /chat, configured redirect mode -> redirectTo URL) are
 * issued from a mount-effect AFTER LandingPage's first paint so the
 * initial render is stable — Lighthouse therefore records a clean CLS
 * for the `/` audit.
 *
 * Important: the previous implementation also auto-redirected to `/setup`
 * when `config.setup.isCompleted` was false. That auto-redirect caused the
 * `/` page to swap to the SetupStepPage mid-paint, mounting a 1335x940
 * `<div class="absolute inset-0 overflow-hidden">` background decoration as
 * a new viewport-sized element. Lighthouse scored that DOM swap as CLS
 * ~0.808 on every `/` audit.
 *
 * The fix removes the `/` -> `/setup` auto-redirect entirely. First-run
 * setup is reached via:
 *   - direct navigation to `/setup` (the install / admin docs link there)
 *   - the SetupGuard component on protected routes (`/chat`, `/admin`, ...)
 *     which renders its own setup prompt when a not-yet-completed user
 *     attempts to enter a guarded surface
 *
 * Real visitors landing on `/` always see the LandingPage, which is the
 * intended public-facing behaviour for a self-hosted chat product.
 */
export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useAppConfig();
  const router = useRouter();

  const loading = authLoading || configLoading;

  useEffect(() => {
    if (loading) return;

    // If user is already authenticated, redirect to chat.
    if (user) {
      router.push("/chat");
      return;
    }

    // Handle configurable homepage modes for unauthenticated users.
    switch (config.homepage.mode) {
      case "redirect":
        if (config.homepage.redirectTo) {
          router.push(config.homepage.redirectTo);
        }
        break;
      case "chat":
        // For chat mode, redirect to sign-in since user is not authenticated.
        router.push("/auth/signin");
        break;
      case "landing":
      default:
        // Show landing page (handled by render below).
        break;
    }
  }, [config, user, loading, router]);

  // Always render the LandingPage as the stable base layer. SetupGuard
  // handles "setup not completed" enforcement on protected routes; we do
  // not auto-redirect from `/` to `/setup` because doing so caused a
  // full-page DOM swap and CLS ~0.8 on every Lighthouse `/` audit.
  return <LandingPage />;
}
