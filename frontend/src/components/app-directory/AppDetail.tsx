"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Download,
  ExternalLink,
  Shield,
  Calendar,
  Globe,
  FileText,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useAppDirectoryStore,
  selectAppById,
} from "@/stores/app-directory-store";
import { AppIcon } from "./AppCard";
import { AppInstallButton } from "./AppInstallButton";
import { AppPermissions } from "./AppPermissions";
import { AppScreenshots } from "./AppScreenshots";
import { AppRatings } from "./AppRatings";
import { getRelatedApps } from "@/lib/app-directory/app-search";
import { AppCard } from "./AppCard";
import type { App } from "@/lib/app-directory/app-types";

interface AppDetailProps {
  app: App;
  className?: string;
}

export function AppDetail({ app, className }: AppDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const relatedApps = getRelatedApps(app.id, 4);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      {/* Back Navigation */}
      <Link
        href="/apps"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to App Directory
      </Link>

      {/* App Header */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* App Info */}
        <div className="flex-1">
          <div className="mb-4 flex items-start gap-4">
            <AppIcon icon={app.icon} name={app.name} size="lg" />
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-2xl font-bold">{app.name}</h1>
                {app.verified && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
                {app.builtIn && (
                  <Badge variant="outline" className="text-xs">
                    Built-in
                  </Badge>
                )}
              </div>
              <p className="mb-2 text-muted-foreground">
                by{" "}
                {app.developer.website ? (
                  <a
                    href={app.developer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {app.developer.name}
                  </a>
                ) : (
                  app.developer.name
                )}
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {app.categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/apps?category=${category.id}`}
                  >
                    <Badge variant="secondary">{category.name}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <p className="mb-4 text-lg text-muted-foreground">
            {app.shortDescription}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">
                {app.stats.rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({formatNumber(app.stats.ratingCount)} ratings)
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Download className="h-5 w-5" />
              <span>
                {formatNumber(app.stats.activeInstalls)} active installs
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span>Updated {formatDate(app.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Install Card */}
        <Card className="flex-shrink-0 lg:w-80">
          <CardContent className="p-6">
            <AppInstallButton app={app} className="mb-4 w-full" />

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>{app.currentVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pricing</span>
                <span className="capitalize">{app.pricing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{app.type}</span>
              </div>
            </div>

            {/* Links */}
            {(app.links.website ||
              app.links.documentation ||
              app.links.support) && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-col gap-2">
                  {app.links.website && (
                    <a
                      href={app.links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Globe className="h-4 w-4" />
                      Website
                      <ExternalLink className="ml-auto h-3 w-3" />
                    </a>
                  )}
                  {app.links.documentation && (
                    <a
                      href={app.links.documentation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <FileText className="h-4 w-4" />
                      Documentation
                      <ExternalLink className="ml-auto h-3 w-3" />
                    </a>
                  )}
                  {app.links.support && (
                    <a
                      href={app.links.support}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Support
                      <ExternalLink className="ml-auto h-3 w-3" />
                    </a>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Screenshots */}
      {app.screenshots.length > 0 && (
        <AppScreenshots screenshots={app.screenshots} appName={app.name} />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="mr-1 h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews ({formatNumber(app.stats.reviewCount)})
          </TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Description */}
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <h2 className="mb-4 text-xl font-semibold">About this app</h2>
                <div className="whitespace-pre-wrap text-muted-foreground">
                  {app.longDescription}
                </div>
              </div>

              {/* Features */}
              {app.features.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-4 text-xl font-semibold">Features</h2>
                  <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {app.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <h3 className="mb-3 font-semibold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {app.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline">
                    {tag.name}
                  </Badge>
                ))}
              </div>

              {/* Developer Info */}
              <div className="mt-6">
                <h3 className="mb-3 font-semibold">Developer</h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {app.developer.avatarUrl ? (
                      <img
                        src={app.developer.avatarUrl}
                        alt={app.developer.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {app.developer.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{app.developer.name}</p>
                    {app.developer.verified && (
                      <p className="text-xs text-muted-foreground">
                        Verified Developer
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <AppPermissions permissions={app.permissions} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <AppRatings appId={app.id} stats={app.stats} />
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Version History</h2>
            {app.versions.map((version, index) => (
              <Card key={version.version}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Version {version.version}
                      {index === 0 && (
                        <Badge variant="secondary" className="ml-2">
                          Current
                        </Badge>
                      )}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(version.releaseDate)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {version.changelog}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Related Apps */}
      {relatedApps.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Related Apps</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {relatedApps.map((relatedApp) => (
              <AppCard key={relatedApp.id} app={relatedApp} variant="compact" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
