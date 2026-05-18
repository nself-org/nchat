"use client";

import { Bot, CheckCircle, Download, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Bot as BotType } from "@/graphql/bots";

// ============================================================================
// TYPES
// ============================================================================

export interface BotCardProps {
  bot: BotType;
  installed?: boolean;
  onInstall?: (bot: BotType) => void;
  onConfigure?: (bot: BotType) => void;
  onViewDetails?: (bot: BotType) => void;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatInstallCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatRating(rating: number): string {
  return rating.toFixed(1);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BotCard({
  bot,
  installed = false,
  onInstall,
  onConfigure,
  onViewDetails,
  compact = false,
  className,
}: BotCardProps) {
  const handleInstallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstall?.(bot);
  };

  const handleConfigureClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfigure?.(bot);
  };

  const handleCardClick = () => {
    onViewDetails?.(bot);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onViewDetails && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onViewDetails(bot);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "hover:bg-accent/50 flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
          className,
        )}
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={bot.avatarUrl} alt={bot.name} />
          <AvatarFallback>
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{bot.name}</span>
            {bot.verified && (
              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {bot.description}
          </p>
        </div>

        {installed ? (
          <Button variant="outline" size="sm" onClick={handleConfigureClick}>
            Configure
          </Button>
        ) : (
          <Button size="sm" onClick={handleInstallClick}>
            Install
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "hover:border-primary/50 cursor-pointer transition-all hover:shadow-md",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={bot.avatarUrl} alt={bot.name} />
            <AvatarFallback className="bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <CardTitle className="truncate text-base">{bot.name}</CardTitle>
              {bot.verified && (
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
              )}
            </div>
            {bot.category && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {bot.category}
              </Badge>
            )}
          </div>

          {bot.featured && (
            <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              Featured
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <CardDescription className="line-clamp-2">
          {bot.description}
        </CardDescription>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {bot.rating !== undefined && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>{formatRating(bot.rating)}</span>
              {bot.reviewsCount !== undefined && (
                <span className="text-xs">({bot.reviewsCount})</span>
              )}
            </div>
          )}

          {bot.installCount !== undefined && (
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span>{formatInstallCount(bot.installCount)}</span>
            </div>
          )}
        </div>

        {installed ? (
          <Button variant="outline" size="sm" onClick={handleConfigureClick}>
            Configure
          </Button>
        ) : (
          <Button size="sm" onClick={handleInstallClick}>
            Install
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

export function BotCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}
