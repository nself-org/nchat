"use client";

/**
 * Enhanced Emoji Picker Component
 *
 * Full-featured emoji picker with:
 * - Search functionality
 * - Category tabs
 * - Recent emojis (persisted to localStorage)
 * - Skin tone selector
 * - Emoji shortcode support
 * - Keyboard navigation
 * - Custom emojis
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, Smile, Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  type Emoji,
  type EmojiCategory,
  type SkinTone,
  EMOJI_CATEGORIES,
  QUICK_REACTIONS,
  searchEmojis,
  applySkinTone,
  supportsSkinTone as checkSupportsSkinTone,
  getEmojisByCategory,
} from "@/lib/emoji";

const RECENT_EMOJIS_KEY = "nchat-recent-emojis";
const SKIN_TONE_KEY = "nchat-emoji-skin-tone";
const MAX_RECENT = 24;

// ============================================================================
// Interfaces
// ============================================================================

export interface EmojiPickerProps {
  /** Callback when emoji is selected */
  onSelect: (emoji: string) => void;
  /** Custom trigger button */
  trigger?: React.ReactNode;
  /** Alignment */
  align?: "start" | "center" | "end";
  /** Show quick reactions bar */
  showQuickReactions?: boolean;
  /** Custom emojis */
  customEmojis?: Emoji[];
  /** ClassName for trigger */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function EmojiPicker({
  onSelect,
  trigger,
  align = "start",
  showQuickReactions = true,
  customEmojis = [],
  className,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<EmojiCategory>("smileys");
  const [skinTone, setSkinTone] = useState<SkinTone>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(SKIN_TONE_KEY) as SkinTone) || "";
    }
    return "";
  });
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(RECENT_EMOJIS_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Save skin tone to localStorage
  const handleSkinToneChange = useCallback((tone: SkinTone) => {
    setSkinTone(tone);
    if (typeof window !== "undefined") {
      localStorage.setItem(SKIN_TONE_KEY, tone);
    }
  }, []);

  // Handle emoji selection
  const handleSelectEmoji = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      setIsOpen(false);
      setSearchQuery("");

      // Add to recent emojis
      setRecentEmojis((prev) => {
        const updated = [emoji, ...prev.filter((e) => e !== emoji)].slice(
          0,
          MAX_RECENT,
        );
        if (typeof window !== "undefined") {
          localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    },
    [onSelect],
  );

  // Apply skin tone if needed
  const applyEmojiSkinTone = useCallback(
    (emoji: string): string => {
      if (skinTone !== "" && checkSupportsSkinTone(emoji)) {
        return applySkinTone(emoji, skinTone);
      }
      return emoji;
    },
    [skinTone],
  );

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchEmojis(searchQuery, { limit: 50 });
  }, [searchQuery]);

  // Get categories with recent
  const categories = useMemo(() => {
    const cats = EMOJI_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.name,
      icon: cat.icon,
      emojis: getEmojisByCategory(cat.id),
    })).filter((cat) => cat.emojis.length > 0);

    // Add recent category if there are recent emojis
    if (recentEmojis.length > 0) {
      return [
        {
          id: "recent" as EmojiCategory,
          label: "Recently Used",
          icon: "🕒",
          emojis: recentEmojis.map((emoji) => ({
            id: emoji,
            emoji,
            name: "",
            displayName: "",
            shortcode: "",
            keywords: [] as string[],
            aliases: [] as string[],
            category: "recent" as EmojiCategory,
            supportsSkinTone: false,
          })),
        },
        ...cats,
      ];
    }

    return cats;
  }, [recentEmojis]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className={className}>
            <Smile className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[360px] p-0"
        align={align}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex h-[420px] flex-col">
          {/* Header with Search and Skin Tone */}
          <div className="space-y-2 border-b p-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search emoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9"
              />
            </div>

            {/* Skin Tone Selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Skin Tone</span>
              <SkinToneSelector
                value={skinTone}
                onChange={handleSkinToneChange}
              />
            </div>
          </div>

          {/* Quick Reactions */}
          {!searchQuery && showQuickReactions && (
            <div className="border-b p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Quick Reactions
              </div>
              <div className="flex gap-1">
                {QUICK_REACTIONS.map((emojiObj) => (
                  <button
                    key={emojiObj.emoji}
                    type="button"
                    onClick={() =>
                      handleSelectEmoji(applyEmojiSkinTone(emojiObj.emoji))
                    }
                    className="flex h-10 w-10 items-center justify-center rounded text-2xl transition-colors hover:bg-accent"
                  >
                    {applyEmojiSkinTone(emojiObj.emoji)}
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
                {searchResults && searchResults.length > 0 ? (
                  <>
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Search Results ({searchResults.length})
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {searchResults.map((result, index) => {
                        const emojiObj = result.emoji as any;
                        const emojiChar = emojiObj.emoji ?? emojiObj;
                        const emojiName = emojiObj.name ?? "";
                        return (
                          <EmojiButton
                            key={`${emojiChar}-${index}`}
                            emoji={applyEmojiSkinTone(emojiChar)}
                            label={emojiName}
                            onClick={() =>
                              handleSelectEmoji(applyEmojiSkinTone(emojiChar))
                            }
                          />
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No emoji found for "{searchQuery}"
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            // Category Tabs
            <Tabs
              value={selectedCategory}
              onValueChange={(v) => setSelectedCategory(v as EmojiCategory)}
              className="flex flex-1 flex-col"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start rounded-none border-b bg-transparent p-1">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="min-w-[40px] rounded-sm data-[state=active]:bg-accent"
                    title={category.label}
                  >
                    <span className="text-lg">{category.icon}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent
                  key={category.id}
                  value={category.id}
                  className="m-0 mt-0 flex-1"
                >
                  <ScrollArea className="h-full">
                    <div className="p-3">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">
                        {category.label}
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {category.emojis.map((emojiData, index) => (
                          <EmojiButton
                            key={`${emojiData.emoji}-${index}`}
                            emoji={applyEmojiSkinTone(emojiData.emoji)}
                            label={emojiData.name}
                            onClick={() =>
                              handleSelectEmoji(
                                applyEmojiSkinTone(emojiData.emoji),
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Emoji Button Component
// ============================================================================

interface EmojiButtonProps {
  emoji: string;
  label?: string;
  onClick: () => void;
}

function EmojiButton({ emoji, label, onClick }: EmojiButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded text-2xl transition-colors hover:bg-accent"
      title={label ? `:${label}:` : undefined}
    >
      {emoji}
    </button>
  );
}

// ============================================================================
// Skin Tone Selector Component
// ============================================================================

interface SkinToneSelectorProps {
  value: SkinTone;
  onChange: (tone: SkinTone) => void;
}

function SkinToneSelector({ value, onChange }: SkinToneSelectorProps) {
  const skinTones: { tone: SkinTone; emoji: string; label: string }[] = [
    { tone: "", emoji: "👋", label: "Default" },
    { tone: "1F3FB", emoji: "👋🏻", label: "Light" },
    { tone: "1F3FC", emoji: "👋🏼", label: "Medium-Light" },
    { tone: "1F3FD", emoji: "👋🏽", label: "Medium" },
    { tone: "1F3FE", emoji: "👋🏾", label: "Medium-Dark" },
    { tone: "1F3FF", emoji: "👋🏿", label: "Dark" },
  ];

  const currentTone = skinTones.find((t) => t.tone === value) || skinTones[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2">
          <span className="mr-1 text-lg">{currentTone.emoji}</span>
          <span className="text-xs">{currentTone.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {skinTones.map((item) => (
          <DropdownMenuItem
            key={item.tone}
            onClick={() => onChange(item.tone)}
            className={cn("cursor-pointer", value === item.tone && "bg-accent")}
          >
            <span className="mr-2 text-lg">{item.emoji}</span>
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
