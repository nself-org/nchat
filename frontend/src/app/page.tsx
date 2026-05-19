"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { LandingPage } from "@/components/landing/landing-page";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { config, isLoading: configLoading } = useAppConfig();
  const router = useRouter();

  const loading = authLoading || configLoading;

  useEffect(() => {
    if (loading) return;

    // First check if setup is completed - if not, redirect to setup
    if (!config.setup.isCompleted) {
      router.push("/setup");
      return;
    }

    // If user is already authenticated, redirect to chat
    if (user) {
      router.push("/chat");
      return;
    }

    // Handle different homepage modes for unauthenticated users
    switch (config.homepage.mode) {
      case "redirect":
        if (config.homepage.redirectTo) {
          router.push(config.homepage.redirectTo);
        }
        break;
      case "chat":
        // For chat mode, redirect to login since user is not authenticated
        router.push("/auth/signin");
        break;
      case "landing":
      default:
        // Show landing page (handled by render below)
        break;
    }
  }, [config, user, loading, router]);

  // While auth or config is still loading for an authenticated user, show
  // a stable fixed-positioned redirect screen to avoid layout shift.
  if (!loading && user) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-background"
        role="status"
        aria-live="polite"
        aria-label="Redirecting to chat"
      >
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  // For non-landing modes (redirect/chat), show a stable redirect screen.
  // We check this before loading completes so the layout doesn't shift.
  if (!loading && config.homepage.mode !== "landing") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-background"
        role="status"
        aria-live="polite"
        aria-label="Redirecting"
      >
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  // Render the LandingPage immediately — for unauthenticated users in landing
  // mode this is the correct final state, so rendering it before loading
  // completes avoids the spinner→full-page layout shift that causes CLS.
  // The useEffect above handles any necessary redirects (setup, auth, mode).
  return <LandingPage />;
}
