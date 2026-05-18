"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useAppDirectoryStore,
  selectFeaturedApps,
} from "@/stores/app-directory-store";
import { getFeaturedApps } from "@/lib/app-directory/app-registry";
import { AppCard } from "./AppCard";

interface FeaturedAppsProps {
  className?: string;
  limit?: number;
}

export function FeaturedApps({ className, limit = 6 }: FeaturedAppsProps) {
  const featuredApps = useAppDirectoryStore(selectFeaturedApps);

  // Fall back to registry if store is empty
  const apps = featuredApps.length > 0 ? featuredApps : getFeaturedApps();
  const displayApps = apps.slice(0, limit);

  if (displayApps.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Featured Apps</h2>
        </div>
        {apps.length > limit && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/apps?featured=true" className="gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayApps.map((app) => (
          <AppCard key={app.id} app={app} variant="featured" />
        ))}
      </div>
    </section>
  );
}
