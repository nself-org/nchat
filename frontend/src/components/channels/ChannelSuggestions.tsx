"use client";

import * as React from "react";
import { Sparkles, ChevronRight, RefreshCw, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChannelCard } from "./ChannelCard";
import type { Channel } from "@/stores/channel-store";
import {
  generateSuggestions,
  getSuggestionReasonText,
  type UserContext,
  type ChannelSuggestion,
} from "@/lib/channels/channel-suggestions";

// ============================================================================
// Types
// ============================================================================

export interface ChannelSuggestionsProps {
  channels: Channel[];
  userContext: UserContext;
  joinedChannelIds?: Set<string>;
  limit?: number;
  showRefresh?: boolean;
  showViewAll?: boolean;
  layout?: "scroll" | "grid" | "list";
  onViewAll?: () => void;
  onRefresh?: () => void;
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  onDismiss?: (channelId: string) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelSuggestions({
  channels,
  userContext,
  joinedChannelIds = new Set(),
  limit = 6,
  showRefresh = true,
  showViewAll = true,
  layout = "scroll",
  onViewAll,
  onRefresh,
  onJoin,
  onLeave,
  onDismiss,
  className,
}: ChannelSuggestionsProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(
    new Set(),
  );

  const suggestions = React.useMemo(() => {
    const allSuggestions = generateSuggestions(channels, userContext, {
      maxSuggestions: limit + dismissedIds.size,
      excludeJoined: true,
    });

    return allSuggestions
      .filter((s) => !dismissedIds.has(s.channel.id))
      .slice(0, limit);
  }, [channels, userContext, limit, dismissedIds]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setDismissedIds(new Set());
    onRefresh?.();
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsRefreshing(false);
  };

  const handleDismiss = (channelId: string) => {
    setDismissedIds((prev) => new Set([...prev, channelId]));
    onDismiss?.(channelId);
  };

  if (suggestions.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Suggested for You
          </CardTitle>
          <CardDescription>
            No suggestions available at the moment. Join some channels to get
            personalized recommendations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const renderChannels = () => {
    if (layout === "list") {
      return (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.channel.id} className="relative">
              <ChannelCard
                channel={suggestion.channel}
                isJoined={joinedChannelIds.has(suggestion.channel.id)}
                variant="compact"
                onJoin={onJoin}
                onLeave={onLeave}
              />
              <div className="mt-1 flex items-center justify-between px-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  {getSuggestionReasonText(suggestion.reason)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleDismiss(suggestion.channel.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (layout === "grid") {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.channel.id} className="relative">
              <ChannelCard
                channel={suggestion.channel}
                isJoined={joinedChannelIds.has(suggestion.channel.id)}
                showStats
                onJoin={onJoin}
                onLeave={onLeave}
              />
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  <Lightbulb className="mr-1 h-3 w-3" />
                  {getSuggestionReasonText(suggestion.reason)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => handleDismiss(suggestion.channel.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Default: scroll layout
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.channel.id}
              className="w-[300px] flex-shrink-0"
            >
              <ChannelCard
                channel={suggestion.channel}
                isJoined={joinedChannelIds.has(suggestion.channel.id)}
                showStats
                onJoin={onJoin}
                onLeave={onLeave}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  {getSuggestionReasonText(suggestion.reason)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => handleDismiss(suggestion.channel.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Suggested for You</h2>
          <Badge variant="secondary" className="text-xs">
            AI-powered
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("mr-1 h-4 w-4", isRefreshing && "animate-spin")}
              />
              Refresh
            </Button>
          )}
          {showViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View all
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {renderChannels()}
    </section>
  );
}

ChannelSuggestions.displayName = "ChannelSuggestions";
