"use client";

/**
 * Reaction Picker Component
 *
 * Full emoji picker for message reactions with categories and search.
 */

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Smile,
  Heart,
  ThumbsUp,
  Flame,
  Star,
  Clock,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Common emoji categories
const EMOJI_CATEGORIES = {
  recent: {
    label: "Recent",
    icon: Clock,
    emojis: [], // Will be populated from localStorage
  },
  smileys: {
    label: "Smileys",
    icon: Smile,
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "🥲",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "😮‍💨",
      "🤥",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
    ],
  },
  gestures: {
    label: "Gestures",
    icon: ThumbsUp,
    emojis: [
      "👍",
      "👎",
      "👌",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "✍️",
      "💪",
      "🦵",
      "🦶",
      "👂",
      "🦻",
      "👃",
    ],
  },
  hearts: {
    label: "Hearts",
    icon: Heart,
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❤️‍🔥",
      "❤️‍🩹",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "♥️",
      "💌",
    ],
  },
  symbols: {
    label: "Symbols",
    icon: Star,
    emojis: [
      "⭐",
      "🌟",
      "✨",
      "💫",
      "🔥",
      "💥",
      "💯",
      "✅",
      "❌",
      "❗",
      "❓",
      "⚠️",
      "🚫",
      "💢",
      "💤",
      "💦",
      "💨",
      "🎉",
      "🎊",
      "🎈",
      "🎁",
      "🏆",
      "🥇",
      "🥈",
      "🥉",
      "🏅",
      "🎖️",
      "👑",
      "💎",
      "💍",
      "🔔",
      "🔕",
    ],
  },
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

interface ReactionPickerProps {
  onSelectReaction: (emoji: string) => void;
  trigger?: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function ReactionPicker({
  onSelectReaction,
  trigger,
  align = "start",
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nchat-recent-emojis");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      onSelectReaction(emoji);
      setIsOpen(false);
      setSearchQuery("");

      // Add to recent emojis
      setRecentEmojis((prev) => {
        const updated = [emoji, ...prev.filter((e) => e !== emoji)].slice(
          0,
          24,
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("nchat-recent-emojis", JSON.stringify(updated));
        }
        return updated;
      });
    },
    [onSelectReaction],
  );

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return null;

    const query = searchQuery.toLowerCase();
    const results: string[] = [];

    Object.values(EMOJI_CATEGORIES).forEach((category) => {
      category.emojis.forEach((emoji) => {
        if (emoji.includes(query)) {
          results.push(emoji);
        }
      });
    });

    return results;
  }, [searchQuery]);

  const categoriesWithRecent = useMemo(() => {
    return {
      ...EMOJI_CATEGORIES,
      recent: {
        ...EMOJI_CATEGORIES.recent,
        emojis: recentEmojis,
      },
    };
  }, [recentEmojis]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align={align}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex h-[400px] flex-col">
          {/* Search */}
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search emoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>

          {/* Quick Reactions */}
          {!searchQuery && (
            <div className="border-b p-3">
              <div className="flex gap-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className="flex h-10 w-10 items-center justify-center rounded text-2xl transition-colors hover:bg-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Grid */}
          {searchQuery ? (
            // Search Results
            <ScrollArea className="flex-1">
              <div className="p-3">
                {filteredEmojis && filteredEmojis.length > 0 ? (
                  <div className="grid grid-cols-8 gap-1">
                    {filteredEmojis.map((emoji, index) => (
                      <button
                        key={`${emoji}-${index}`}
                        type="button"
                        onClick={() => handleSelectEmoji(emoji)}
                        className="flex h-10 w-10 items-center justify-center rounded text-2xl transition-colors hover:bg-accent"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No emoji found
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            // Category Tabs
            <Tabs
              defaultValue={recentEmojis.length > 0 ? "recent" : "smileys"}
              className="flex flex-1 flex-col"
            >
              <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-1">
                {Object.entries(categoriesWithRecent).map(([key, category]) => {
                  if (key === "recent" && category.emojis.length === 0)
                    return null;

                  const Icon = category.icon;
                  return (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="rounded-sm data-[state=active]:bg-accent"
                    >
                      <Icon className="h-4 w-4" />
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.entries(categoriesWithRecent).map(([key, category]) => {
                if (key === "recent" && category.emojis.length === 0)
                  return null;

                return (
                  <TabsContent
                    key={key}
                    value={key}
                    className="m-0 mt-0 flex-1"
                  >
                    <ScrollArea className="h-full">
                      <div className="p-3">
                        <div className="mb-2 text-xs font-medium text-muted-foreground">
                          {category.label}
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                          {category.emojis.map((emoji, index) => (
                            <button
                              key={`${emoji}-${index}`}
                              type="button"
                              onClick={() => handleSelectEmoji(emoji)}
                              className="flex h-10 w-10 items-center justify-center rounded text-2xl transition-colors hover:bg-accent"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
