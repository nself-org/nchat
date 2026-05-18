"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useAppDirectoryStore,
  selectRecentApps,
} from "@/stores/app-directory-store";
import { getRecentApps } from "@/lib/app-directory/app-registry";
import { AppCard } from "./AppCard";

interface RecentAppsProps {
  className?: string;
  limit?: number;
}

export function RecentApps({ className, limit = 8 }: RecentAppsProps) {
  const recentApps = useAppDirectoryStore(selectRecentApps);

  // Fall back to registry if store is empty
  const apps = recentApps.length > 0 ? recentApps : getRecentApps(limit);
  const displayApps = apps.slice(0, limit);

  if (displayApps.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Recently Updated</h2>
        </div>
        {apps.length > limit && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/apps?sort=recent" className="gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayApps.map((app) => (
          <AppCard key={app.id} app={app} variant="compact" />
        ))}
      </div>
    </section>
  );
}
