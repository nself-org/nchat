"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EmojiPickerReact, {
  EmojiClickData,
  EmojiStyle,
  SkinTones,
  Theme,
  Categories,
  SuggestionMode,
  SkinTonePickerLocation,
} from "emoji-picker-react";
import { useTheme } from "next-themes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface EmojiPickerProps {
  onEmojiSelect: (emoji: string, emojiData: EmojiClickData) => void;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  skinTone?: SkinTones;
  onSkinToneChange?: (skinTone: SkinTones) => void;
  autoFocus?: boolean;
  lazyLoadEmojis?: boolean;
  searchPlaceholder?: string;
  previewConfig?: {
    showPreview?: boolean;
    defaultCaption?: string;
    defaultEmoji?: string;
  };
}

// Category labels for customization
const categoryLabels = {
  suggested: "Recently Used",
  smileys_people: "Smileys & People",
  animals_nature: "Animals & Nature",
  food_drink: "Food & Drink",
  travel_places: "Travel & Places",
  activities: "Activities",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
};

// Default categories in order
const defaultCategories = [
  { category: Categories.SUGGESTED, name: "Recently Used" },
  { category: Categories.SMILEYS_PEOPLE, name: "Smileys & People" },
  { category: Categories.ANIMALS_NATURE, name: "Animals & Nature" },
  { category: Categories.FOOD_DRINK, name: "Food & Drink" },
  { category: Categories.TRAVEL_PLACES, name: "Travel & Places" },
  { category: Categories.ACTIVITIES, name: "Activities" },
  { category: Categories.OBJECTS, name: "Objects" },
  { category: Categories.SYMBOLS, name: "Symbols" },
  { category: Categories.FLAGS, name: "Flags" },
];

export function EmojiPicker({
  onEmojiSelect,
  children,
  open: controlledOpen,
  onOpenChange,
  disabled = false,
  side = "top",
  align = "start",
  className,
  skinTone,
  onSkinToneChange,
  autoFocus = true,
  lazyLoadEmojis = true,
  searchPlaceholder = "Search emoji...",
  previewConfig = { showPreview: true },
}: EmojiPickerProps) {
  const { resolvedTheme } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentSkinTone, setCurrentSkinTone] = useState<SkinTones>(
    skinTone || SkinTones.NEUTRAL,
  );
  const pickerRef = useRef<HTMLDivElement>(null);

  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Sync external skin tone changes
  useEffect(() => {
    if (skinTone !== undefined) {
      setCurrentSkinTone(skinTone);
    }
  }, [skinTone]);

  // Handle emoji selection
  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiSelect(emojiData.emoji, emojiData);
      setIsOpen(false);
    },
    [onEmojiSelect, setIsOpen],
  );

  // Handle skin tone change
  const handleSkinToneChange = useCallback(
    (tone: SkinTones) => {
      setCurrentSkinTone(tone);
      onSkinToneChange?.(tone);
    },
    [onSkinToneChange],
  );

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Determine theme for emoji picker
  const emojiPickerTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn("w-auto border-0 p-0", className)}
        sideOffset={8}
      >
        <div ref={pickerRef} className="emoji-picker-container">
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            theme={emojiPickerTheme}
            emojiStyle={EmojiStyle.NATIVE}
            skinTonesDisabled={false}
            defaultSkinTone={currentSkinTone}
            onSkinToneChange={handleSkinToneChange}
            autoFocusSearch={autoFocus}
            lazyLoadEmojis={lazyLoadEmojis}
            searchPlaceHolder={searchPlaceholder}
            suggestedEmojisMode={SuggestionMode.RECENT}
            categories={defaultCategories}
            previewConfig={{
              showPreview: previewConfig.showPreview ?? true,
              defaultCaption: previewConfig.defaultCaption,
              defaultEmoji: previewConfig.defaultEmoji,
            }}
            height={400}
            width={350}
            searchDisabled={false}
            skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Standalone emoji picker without popover wrapper (for modal usage)
export interface StandaloneEmojiPickerProps {
  onEmojiSelect: (emoji: string, emojiData: EmojiClickData) => void;
  skinTone?: SkinTones;
  onSkinToneChange?: (skinTone: SkinTones) => void;
  autoFocus?: boolean;
  lazyLoadEmojis?: boolean;
  searchPlaceholder?: string;
  className?: string;
  height?: number;
  width?: number;
}

export function StandaloneEmojiPicker({
  onEmojiSelect,
  skinTone,
  onSkinToneChange,
  autoFocus = true,
  lazyLoadEmojis = true,
  searchPlaceholder = "Search emoji...",
  className,
  height = 400,
  width = 350,
}: StandaloneEmojiPickerProps) {
  const { resolvedTheme } = useTheme();
  const [currentSkinTone, setCurrentSkinTone] = useState<SkinTones>(
    skinTone || SkinTones.NEUTRAL,
  );

  useEffect(() => {
    if (skinTone !== undefined) {
      setCurrentSkinTone(skinTone);
    }
  }, [skinTone]);

  const handleEmojiClick = useCallback(
    (emojiData: EmojiClickData) => {
      onEmojiSelect(emojiData.emoji, emojiData);
    },
    [onEmojiSelect],
  );

  const handleSkinToneChange = useCallback(
    (tone: SkinTones) => {
      setCurrentSkinTone(tone);
      onSkinToneChange?.(tone);
    },
    [onSkinToneChange],
  );

  const emojiPickerTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  return (
    <div className={cn("emoji-picker-standalone", className)}>
      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme={emojiPickerTheme}
        emojiStyle={EmojiStyle.NATIVE}
        skinTonesDisabled={false}
        defaultSkinTone={currentSkinTone}
        onSkinToneChange={handleSkinToneChange}
        autoFocusSearch={autoFocus}
        lazyLoadEmojis={lazyLoadEmojis}
        searchPlaceHolder={searchPlaceholder}
        suggestedEmojisMode={SuggestionMode.RECENT}
        categories={defaultCategories}
        previewConfig={{ showPreview: true }}
        height={height}
        width={width}
        searchDisabled={false}
        skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
      />
    </div>
  );
}

export { SkinTones, Theme, Categories };
export type { EmojiClickData };
