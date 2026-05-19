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

  // If authenticated, show a stable non-shifting redirect screen immediately
  // to prevent CLS from the landing page flashing before redirect fires.
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

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-background"
        role="status"
        aria-live="polite"
        aria-label="Loading application"
      >
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show landing page for landing mode (and user is not authenticated)
  if (config.homepage.mode === "landing" && !user) {
    return <LandingPage />;
  }

  // For redirect/chat modes, show stable redirect screen while redirecting
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
