"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TourOverlay } from "@/components/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useAuth } from "@/contexts/auth-context";

export default function TourPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const { tour, tourActive, initialize, startTour, setTourActive } =
    useOnboardingStore();

  // Redirect unauthenticated visitors to login before tour can begin.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login?redirect=/onboarding/tour");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!user?.id) return;
    initialize(user.id);
  }, [user?.id, initialize]);

  useEffect(() => {
    // Auto-start tour if not already in progress
    if (tour && tour.status === "not_started") {
      startTour();
    } else if (
      tour &&
      tour.status !== "completed" &&
      tour.status !== "dismissed"
    ) {
      setTourActive(true);
    }
  }, [tour?.status, startTour, setTourActive]);

  const handleComplete = () => {
    router.push("/chat");
  };

  const handleDismiss = () => {
    router.push("/chat");
  };

  // If tour is already completed, redirect
  useEffect(() => {
    if (tour?.status === "completed" || tour?.status === "dismissed") {
      router.push("/chat");
    }
  }, [tour?.status, router]);

  // Guard render during auth resolution to avoid flashing the tour backdrop
  // to unauthenticated visitors mid-redirect.
  if (loading || !isAuthenticated || !user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900">
      {/* Tour backdrop: static mock of the chat UI so tour highlights have real targets */}
      <div className="flex h-screen">
        {/* Tour backdrop — simulated chat UI */}
        <div
          data-tour="sidebar"
          className="flex w-64 flex-col border-r border-zinc-700 bg-zinc-800"
        >
          {/* Workspace header */}
          <div className="border-b border-zinc-700 p-4">
            <h2 className="font-semibold text-white">nchat Demo</h2>
          </div>

          {/* Channel list */}
          <div data-tour="channel-list" className="flex-1 space-y-1 p-2">
            <div className="px-3 py-1 text-xs font-semibold uppercase text-zinc-500">
              Channels
            </div>
            <button className="bg-primary/20 flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-white">
              <span>#</span>
              <span>general</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-zinc-400 hover:bg-zinc-700">
              <span>#</span>
              <span>random</span>
            </button>
            <button className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-zinc-400 hover:bg-zinc-700">
              <span>#</span>
              <span>engineering</span>
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">#</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                general
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                data-tour="search"
                className="rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <svg
                  className="h-5 w-5 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
              <button
                data-tour="notifications"
                className="rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <svg
                  className="h-5 w-5 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
              <button
                data-tour="settings"
                className="rounded p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <svg
                  className="h-5 w-5 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </header>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-900">
            {/* Sample messages */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 font-bold text-white">
                  JD
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      John Doe
                    </span>
                    <span className="text-xs text-zinc-500">10:30 AM</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Welcome to nchat! This is your new team communication
                    platform.
                  </p>
                  <div
                    data-tour="message-actions"
                    className="mt-1 flex items-center gap-1"
                  >
                    <button className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                      <span className="text-sm">+</span>
                    </button>
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-sm dark:bg-yellow-900/30">
                      2
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 font-bold text-white">
                  AS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      Alice Smith
                    </span>
                    <span className="text-xs text-zinc-500">10:32 AM</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    Great to have you here! Feel free to explore and ask
                    questions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Message composer */}
          <div
            data-tour="message-composer"
            className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 dark:bg-zinc-700">
              <button className="p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              <input
                type="text"
                placeholder="Message #general"
                className="flex-1 border-none bg-transparent text-zinc-900 placeholder-zinc-500 outline-none dark:text-white"
              />
              <button className="p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden element for keyboard shortcuts tour stop */}
      <div data-tour="keyboard-shortcuts" className="hidden" />

      {/* Tour Overlay */}
      <TourOverlay
        isActive={tourActive}
        onComplete={handleComplete}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
