"use client";

import { useState } from "react";
import { Hash, Users, Lock, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  OnboardingStepProps,
  SuggestedChannel,
} from "@/lib/onboarding/onboarding-types";

interface JoinChannelsStepProps extends OnboardingStepProps {
  suggestedChannels?: SuggestedChannel[];
  selectedChannelIds?: string[];
  onSelectionChange?: (channelIds: string[]) => void;
}

// Default suggested channels for demo
const defaultSuggestedChannels: SuggestedChannel[] = [
  {
    id: "1",
    name: "general",
    slug: "general",
    description: "Company-wide announcements and updates",
    memberCount: 150,
    category: "Company",
    isDefault: true,
    isRecommended: true,
  },
  {
    id: "2",
    name: "random",
    slug: "random",
    description: "Non-work banter and water cooler conversation",
    memberCount: 120,
    category: "Social",
    isDefault: true,
    isRecommended: true,
  },
  {
    id: "3",
    name: "help",
    slug: "help",
    description: "Get help with tools and processes",
    memberCount: 90,
    category: "Support",
    isDefault: false,
    isRecommended: true,
  },
  {
    id: "4",
    name: "introductions",
    slug: "introductions",
    description: "Introduce yourself to the team",
    memberCount: 130,
    category: "Social",
    isDefault: false,
    isRecommended: true,
  },
  {
    id: "5",
    name: "engineering",
    slug: "engineering",
    description: "Engineering team discussions",
    memberCount: 45,
    category: "Teams",
    isDefault: false,
    isRecommended: false,
  },
  {
    id: "6",
    name: "design",
    slug: "design",
    description: "Design team collaboration",
    memberCount: 30,
    category: "Teams",
    isDefault: false,
    isRecommended: false,
  },
  {
    id: "7",
    name: "product",
    slug: "product",
    description: "Product updates and discussions",
    memberCount: 40,
    category: "Teams",
    isDefault: false,
    isRecommended: false,
  },
  {
    id: "8",
    name: "announcements",
    slug: "announcements",
    description: "Official company announcements (read-only)",
    memberCount: 150,
    category: "Company",
    isDefault: true,
    isRecommended: false,
  },
];

export function JoinChannelsStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  canSkip,
  suggestedChannels = defaultSuggestedChannels,
  selectedChannelIds: initialSelected,
  onSelectionChange,
}: JoinChannelsStepProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelected ??
      suggestedChannels
        .filter((c) => c.isDefault || c.isRecommended)
        .map((c) => c.id),
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleChannel = (channelId: string) => {
    const channel = suggestedChannels.find((c) => c.id === channelId);
    if (channel?.isDefault) return; // Can't unselect default channels

    const newSelected = selectedIds.includes(channelId)
      ? selectedIds.filter((id) => id !== channelId)
      : [...selectedIds, channelId];

    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected);
  };

  const selectAll = () => {
    const allIds = suggestedChannels.map((c) => c.id);
    setSelectedIds(allIds);
    onSelectionChange?.(allIds);
  };

  const selectRecommended = () => {
    const recommendedIds = suggestedChannels
      .filter((c) => c.isDefault || c.isRecommended)
      .map((c) => c.id);
    setSelectedIds(recommendedIds);
    onSelectionChange?.(recommendedIds);
  };

  const filteredChannels = suggestedChannels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group channels by category
  const groupedChannels = filteredChannels.reduce(
    (acc, channel) => {
      const category = channel.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(channel);
      return acc;
    },
    {} as Record<string, SuggestedChannel[]>,
  );

  return (
    <div className="flex flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="from-primary/20 to-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
          <Hash className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Join Channels
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Select the channels you'd like to join. You can always join more
          later.
        </p>
      </div>

      {/* Search and Quick Actions */}
      <div className="mx-auto mb-4 w-full max-w-lg">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectRecommended}>
              Recommended
            </Button>
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
          </div>
        </div>

        <p className="text-sm text-zinc-500">
          {selectedIds.length} channel{selectedIds.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
      </div>

      {/* Channel List */}
      <div className="mx-auto max-h-[400px] w-full max-w-lg flex-1 space-y-6 overflow-y-auto">
        {Object.entries(groupedChannels).map(([category, channels]) => (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {category}
            </h3>
            <div className="space-y-2">
              {channels.map((channel) => {
                const isSelected = selectedIds.includes(channel.id);
                const isDefault = channel.isDefault;

                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => toggleChannel(channel.id)}
                    disabled={isDefault}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-all",
                      isSelected
                        ? "bg-primary/5 border-primary"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
                      isDefault && "cursor-default",
                    )}
                  >
                    {/* Selection Indicator */}
                    <div
                      className={cn(
                        "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-zinc-300 dark:border-zinc-600",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>

                    {/* Channel Info */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-zinc-400" />
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {channel.name}
                        </span>
                        {channel.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {channel.isRecommended && !channel.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="mr-1 h-3 w-3" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      {channel.description && (
                        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {channel.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <Users className="h-3 w-3" />
                        <span>{channel.memberCount} members</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredChannels.length === 0 && (
          <div className="py-8 text-center text-zinc-500">
            <Hash className="mx-auto mb-2 h-12 w-12 opacity-30" />
            <p>No channels found matching your search.</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
        <div>
          {!isFirst && (
            <Button variant="ghost" onClick={onPrev}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip
            </Button>
          )}
          <Button onClick={onNext}>
            Join {selectedIds.length} Channel
            {selectedIds.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
