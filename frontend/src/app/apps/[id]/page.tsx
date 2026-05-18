"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppDetail } from "@/components/app-directory";
import { getAppBySlug, getAppById } from "@/lib/app-directory/app-registry";
import { Skeleton } from "@/components/ui/skeleton";
import type { App } from "@/lib/app-directory/app-types";

export default function AppDetailPage() {
  const params = useParams();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;

    // Try to find app by slug first, then by ID
    const foundApp = getAppBySlug(id) || getAppById(id);

    if (foundApp) {
      setApp(foundApp);
    }
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-60 w-80 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="mb-4 text-6xl">404</div>
        <h1 className="mb-2 text-2xl font-bold">App Not Found</h1>
        <p className="mb-6 text-muted-foreground">
          The app you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Link
          href="/apps"
          className="text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Browse Apps
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <AppDetail app={app} />
    </div>
  );
}
