"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Download, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppDirectoryStore } from "@/stores/app-directory-store";
import type { App } from "@/lib/app-directory/app-types";

interface AppCardProps {
  app: App;
  variant?: "default" | "compact" | "featured";
  showInstallButton?: boolean;
  className?: string;
}

export function AppCard({
  app,
  variant = "default",
  showInstallButton = true,
  className,
}: AppCardProps) {
  const isAppInstalled = useAppDirectoryStore((state) => state.isAppInstalled);
  const isInstalled = isAppInstalled(app.id);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (variant === "compact") {
    return (
      <Link href={`/apps/${app.slug}`}>
        <Card
          className={cn(
            "hover:bg-accent/50 cursor-pointer transition-colors",
            className,
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AppIcon icon={app.icon} name={app.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium">{app.name}</h3>
                  {app.verified && (
                    <Badge variant="secondary" className="px-1.5 text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {app.shortDescription}
                </p>
              </div>
              {isInstalled && (
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link href={`/apps/${app.slug}`}>
        <Card
          className={cn(
            "h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-lg",
            className,
          )}
        >
          {app.banner && (
            <div className="from-primary/20 to-primary/5 relative h-24 bg-gradient-to-r">
              <div className="absolute bottom-0 left-4 translate-y-1/2 transform">
                <AppIcon
                  icon={app.icon}
                  name={app.name}
                  size="lg"
                  className="ring-4 ring-background"
                />
              </div>
            </div>
          )}
          <CardContent className={cn("p-4", app.banner && "pt-10")}>
            {!app.banner && (
              <div className="mb-3 flex items-start gap-4">
                <AppIcon icon={app.icon} name={app.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{app.name}</h3>
                    {app.verified && (
                      <Badge variant="secondary" className="px-1.5 text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    by {app.developer.name}
                  </p>
                </div>
              </div>
            )}
            {app.banner && (
              <div className="mb-2 flex items-center gap-2">
                <h3 className="font-semibold">{app.name}</h3>
                {app.verified && (
                  <Badge variant="secondary" className="px-1.5 text-xs">
                    Verified
                  </Badge>
                )}
              </div>
            )}
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
              {app.shortDescription}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {app.stats.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {formatNumber(app.stats.activeInstalls)}
                </span>
              </div>
              {isInstalled && (
                <Badge
                  variant="outline"
                  className="border-green-200 text-green-600"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Installed
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Default variant
  return (
    <Link href={`/apps/${app.slug}`}>
      <Card
        className={cn(
          "h-full cursor-pointer transition-shadow hover:shadow-md",
          className,
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <AppIcon icon={app.icon} name={app.name} size="md" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="truncate font-semibold">{app.name}</h3>
                {app.verified && (
                  <Badge variant="secondary" className="px-1.5 text-xs">
                    Verified
                  </Badge>
                )}
                {app.builtIn && (
                  <Badge variant="outline" className="px-1.5 text-xs">
                    Built-in
                  </Badge>
                )}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                by {app.developer.name}
              </p>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {app.shortDescription}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {app.stats.rating.toFixed(1)}
                <span className="text-xs">
                  ({formatNumber(app.stats.ratingCount)})
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                {formatNumber(app.stats.activeInstalls)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {app.pricing !== "free" && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {app.pricing}
                </Badge>
              )}
              {isInstalled && (
                <Badge
                  variant="outline"
                  className="border-green-200 text-green-600"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Installed
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// App Icon Component
interface AppIconProps {
  icon: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AppIcon({ icon, name, size = "md", className }: AppIconProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-lg",
    md: "w-12 h-12 text-xl",
    lg: "w-16 h-16 text-2xl",
  };

  // Check if icon is a URL
  const isUrl = icon.startsWith("http") || icon.startsWith("/");

  if (isUrl) {
    return (
      <div
        className={cn(
          "flex-shrink-0 overflow-hidden rounded-lg bg-muted",
          sizeClasses[size],
          className,
        )}
      >
        <img
          src={icon}
          alt={`${name} icon`}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback to initial on error
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              // sast-ignore: XSS -- name.charAt(0).toUpperCase() produces a single uppercase letter; not user-injectable
              parent.innerHTML = name.charAt(0).toUpperCase();
              parent.className = cn(
                "rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary flex-shrink-0",
                sizeClasses[size],
                className,
              );
            }
          }}
        />
      </div>
    );
  }

  // Fallback to initial
  return (
    <div
      className={cn(
        "bg-primary/10 flex flex-shrink-0 items-center justify-center rounded-lg font-semibold text-primary",
        sizeClasses[size],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
