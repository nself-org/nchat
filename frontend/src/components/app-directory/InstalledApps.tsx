"use client";

import * as React from "react";
import Link from "next/link";
import {
  Package,
  Settings,
  AlertCircle,
  ArrowUpCircle,
  Pause,
  Play,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useAppDirectoryStore,
  selectInstalledApps,
} from "@/stores/app-directory-store";
import { AppCard, AppIcon } from "./AppCard";
import type { AppInstallation } from "@/lib/app-directory/app-types";

interface InstalledAppsProps {
  className?: string;
}

export function InstalledApps({ className }: InstalledAppsProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const installedApps = useAppDirectoryStore(selectInstalledApps);

  // Filter apps by search query
  const filteredApps = installedApps.filter((installation) =>
    installation.app.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group by status
  const activeApps = filteredApps.filter((i) => i.status === "active");
  const pausedApps = filteredApps.filter((i) => i.status === "paused");

  // Check for updates (mock for now)
  const appsWithUpdates = installedApps.filter(
    (i) => i.installedVersion !== i.app.currentVersion,
  );

  if (installedApps.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-16",
          className,
        )}
      >
        <Package className="mb-4 h-16 w-16 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">No apps installed</h2>
        <p className="mb-6 max-w-md text-center text-muted-foreground">
          Browse the App Directory to discover apps and integrations for your
          workspace.
        </p>
        <Button asChild>
          <Link href="/apps">Browse Apps</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Installed Apps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{installedApps.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Apps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeApps.length}
            </div>
          </CardContent>
        </Card>

        {appsWithUpdates.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Updates Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">
                  {appsWithUpdates.length}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search installed apps..."
          className="pl-10"
        />
      </div>

      {/* Updates Available Section */}
      {appsWithUpdates.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-yellow-500" />
            <h2 className="font-semibold">Updates Available</h2>
          </div>
          <div className="space-y-2">
            {appsWithUpdates.map((installation) => (
              <InstalledAppRow
                key={installation.id}
                installation={installation}
                showUpdate
              />
            ))}
          </div>
        </section>
      )}

      {/* Active Apps */}
      {activeApps.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Active Apps ({activeApps.length})</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeApps.map((installation) => (
              <InstalledAppRow
                key={installation.id}
                installation={installation}
              />
            ))}
          </div>
        </section>
      )}

      {/* Paused Apps */}
      {pausedApps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-muted-foreground">
              Paused Apps ({pausedApps.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pausedApps.map((installation) => (
              <InstalledAppRow
                key={installation.id}
                installation={installation}
              />
            ))}
          </div>
        </section>
      )}

      {/* No results */}
      {filteredApps.length === 0 && searchQuery && (
        <div className="py-8 text-center text-muted-foreground">
          No installed apps match &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}

interface InstalledAppRowProps {
  installation: AppInstallation;
  showUpdate?: boolean;
}

function InstalledAppRow({ installation, showUpdate }: InstalledAppRowProps) {
  const { app, status, installedVersion, installedAt } = installation;
  const hasUpdate = installedVersion !== app.currentVersion;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className={cn(status === "paused" && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <AppIcon icon={app.icon} name={app.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/apps/${app.slug}`}
                className="truncate font-medium hover:underline"
              >
                {app.name}
              </Link>
              {status === "paused" && (
                <Badge variant="secondary" className="text-xs">
                  Paused
                </Badge>
              )}
              {hasUpdate && showUpdate && (
                <Badge
                  variant="outline"
                  className="border-yellow-200 text-xs text-yellow-600"
                >
                  Update available
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
              <span>v{installedVersion}</span>
              <span>Installed {formatDate(installedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUpdate && (
              <Button variant="outline" size="sm">
                <ArrowUpCircle className="mr-1 h-4 w-4" />
                Update
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/apps/${app.slug}/settings`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
