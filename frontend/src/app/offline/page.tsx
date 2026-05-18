"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Home, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CachedConversation {
  id: string;
  name: string;
  type: "channel" | "dm";
  lastMessage?: string;
  timestamp?: number;
}

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [cachedConversations, setCachedConversations] = useState<
    CachedConversation[]
  >([]);
  const [retryCount, setRetryCount] = useState(0);

  // Check online status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Redirect to home when back online
      window.location.href = "/";
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load cached conversations from localStorage/cache
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        // Try to get cached conversations from localStorage
        const cachedData = localStorage.getItem("nchat-cached-conversations");
        if (cachedData) {
          const conversations = JSON.parse(cachedData) as CachedConversation[];
          setCachedConversations(conversations.slice(0, 5)); // Show up to 5
        }
      } catch {
        // Ignore errors
      }
    };

    loadCachedData();
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      // Try to fetch a small resource to check connectivity
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }
    } catch {
      // Still offline
    }

    // Also check navigator.onLine
    if (navigator.onLine) {
      window.location.href = "/";
      return;
    }

    setIsRetrying(false);
  };

  // If online, redirect
  if (isOnline) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Reconnecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-white">
              nChat
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <WifiOff className="h-4 w-4" />
            Offline
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Offline illustration */}
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-6 h-32 w-32">
              {/* Cloud with X */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                <WifiOff className="h-16 w-16 text-zinc-400 dark:text-zinc-500" />
              </div>
              {/* Decorative circles */}
              <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-zinc-300 opacity-60 dark:bg-zinc-600" />
              <div className="absolute -bottom-1 -left-3 h-6 w-6 rounded-full bg-zinc-300 opacity-40 dark:bg-zinc-600" />
            </div>

            <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
              You&apos;re offline
            </h1>

            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              It looks like you&apos;ve lost your internet connection.
              Don&apos;t worry - your messages will be synced when you&apos;re
              back online.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 sm:w-auto"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Checking..." : "Try again"}
              </Button>

              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to home
                </Button>
              </Link>
            </div>

            {retryCount >= 3 && (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                Still having trouble? Try checking your Wi-Fi or mobile data
                connection.
              </p>
            )}
          </div>

          {/* Cached conversations */}
          {cachedConversations.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
              <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
                <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  Cached conversations
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  These conversations are available offline
                </p>
              </div>

              <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {cachedConversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      href={
                        conversation.type === "channel"
                          ? `/chat/channels/${conversation.id}`
                          : `/chat/dm/${conversation.id}`
                      }
                      className="dark:hover:bg-zinc-750 flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50"
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          conversation.type === "channel"
                            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                            : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {conversation.type === "channel"
                          ? "#"
                          : conversation.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-white">
                          {conversation.type === "channel"
                            ? `#${conversation.name}`
                            : conversation.name}
                        </p>
                        {conversation.lastMessage && (
                          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                            {conversation.lastMessage}
                          </p>
                        )}
                      </div>

                      {conversation.timestamp && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                          {formatTimestamp(conversation.timestamp)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-2 font-medium text-blue-900 dark:text-blue-100">
              Tips while offline
            </h3>
            <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>- You can still read cached messages</li>
              <li>- New messages will be queued and sent when online</li>
              <li>- Some features may be limited</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl text-center text-sm text-zinc-500 dark:text-zinc-400">
          <p>nChat works best with an internet connection</p>
        </div>
      </footer>
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
