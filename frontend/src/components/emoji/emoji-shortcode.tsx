"use client";

import { memo, useMemo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Comprehensive emoji shortcode mapping
// This is a subset of commonly used shortcodes
const EMOJI_SHORTCODES: Record<string, string> = {
  // Smileys
  smile: "\uD83D\uDE04",
  grin: "\uD83D\uDE00",
  joy: "\uD83D\uDE02",
  rofl: "\uD83E\uDD23",
  smiley: "\uD83D\uDE03",
  sweat_smile: "\uD83D\uDE05",
  laughing: "\uD83D\uDE06",
  wink: "\uD83D\uDE09",
  blush: "\uD83D\uDE0A",
  yum: "\uD83D\uDE0B",
  sunglasses: "\uD83D\uDE0E",
  heart_eyes: "\uD83D\uDE0D",
  kissing_heart: "\uD83D\uDE18",
  kissing: "\uD83D\uDE17",
  relaxed: "\u263A\uFE0F",
  stuck_out_tongue: "\uD83D\uDE1B",
  stuck_out_tongue_winking_eye: "\uD83D\uDE1C",
  stuck_out_tongue_closed_eyes: "\uD83D\uDE1D",
  neutral_face: "\uD83D\uDE10",
  expressionless: "\uD83D\uDE11",
  unamused: "\uD83D\uDE12",
  sweat: "\uD83D\uDE13",
  pensive: "\uD83D\uDE14",
  confused: "\uD83D\uDE15",
  confounded: "\uD83D\uDE16",
  disappointed: "\uD83D\uDE1E",
  worried: "\uD83D\uDE1F",
  angry: "\uD83D\uDE20",
  rage: "\uD83D\uDE21",
  cry: "\uD83D\uDE22",
  sob: "\uD83D\uDE2D",
  scream: "\uD83D\uDE31",
  fearful: "\uD83D\uDE28",
  cold_sweat: "\uD83D\uDE30",
  persevere: "\uD83D\uDE23",
  disappointed_relieved: "\uD83D\uDE25",
  sleepy: "\uD83D\uDE2A",
  sleeping: "\uD83D\uDE34",
  mask: "\uD83D\uDE37",
  thinking: "\uD83E\uDD14",
  nerd: "\uD83E\uDD13",
  shush: "\uD83E\uDD2B",
  monocle: "\uD83E\uDDD0",
  pleading: "\uD83E\uDD7A",
  partying: "\uD83E\uDD73",
  hot: "\uD83E\uDD75",
  cold: "\uD83E\uDD76",
  woozy: "\uD83E\uDD74",
  zany: "\uD83E\uDD2A",
  star_struck: "\uD83E\uDD29",
  exploding_head: "\uD83E\uDD2F",
  cowboy: "\uD83E\uDD20",
  clown: "\uD83E\uDD21",

  // Gestures
  thumbsup: "\uD83D\uDC4D",
  "+1": "\uD83D\uDC4D",
  thumbsdown: "\uD83D\uDC4E",
  "-1": "\uD83D\uDC4E",
  ok_hand: "\uD83D\uDC4C",
  ok: "\uD83D\uDC4C",
  wave: "\uD83D\uDC4B",
  clap: "\uD83D\uDC4F",
  raised_hands: "\uD83D\uDE4C",
  pray: "\uD83D\uDE4F",
  handshake: "\uD83E\uDD1D",
  point_up: "\u261D\uFE0F",
  point_down: "\uD83D\uDC47",
  point_left: "\uD83D\uDC48",
  point_right: "\uD83D\uDC49",
  fist: "\u270A",
  punch: "\uD83D\uDC4A",
  v: "\u270C\uFE0F",
  crossed_fingers: "\uD83E\uDD1E",
  metal: "\uD83E\uDD18",
  call_me: "\uD83E\uDD19",
  muscle: "\uD83D\uDCAA",
  writing_hand: "\u270D\uFE0F",
  selfie: "\uD83E\uDD33",

  // Hearts
  heart: "\u2764\uFE0F",
  red_heart: "\u2764\uFE0F",
  orange_heart: "\uD83E\uDDE1",
  yellow_heart: "\uD83D\uDC9B",
  green_heart: "\uD83D\uDC9A",
  blue_heart: "\uD83D\uDC99",
  purple_heart: "\uD83D\uDC9C",
  black_heart: "\uD83D\uDDA4",
  white_heart: "\uD83E\uDD0D",
  brown_heart: "\uD83E\uDD0E",
  broken_heart: "\uD83D\uDC94",
  heartbeat: "\uD83D\uDC93",
  heartpulse: "\uD83D\uDC97",
  two_hearts: "\uD83D\uDC95",
  sparkling_heart: "\uD83D\uDC96",
  cupid: "\uD83D\uDC98",
  gift_heart: "\uD83D\uDC9D",
  revolving_hearts: "\uD83D\uDC9E",

  // Objects
  fire: "\uD83D\uDD25",
  star: "\u2B50",
  star2: "\uD83C\uDF1F",
  sparkles: "\u2728",
  zap: "\u26A1",
  boom: "\uD83D\uDCA5",
  collision: "\uD83D\uDCA5",
  100: "\uD83D\uDCAF",
  trophy: "\uD83C\uDFC6",
  medal: "\uD83C\uDF96\uFE0F",
  crown: "\uD83D\uDC51",
  gem: "\uD83D\uDC8E",
  bell: "\uD83D\uDD14",
  key: "\uD83D\uDD11",
  lock: "\uD83D\uDD12",
  unlock: "\uD83D\uDD13",
  bulb: "\uD83D\uDCA1",
  gift: "\uD83C\uDF81",
  balloon: "\uD83C\uDF88",
  tada: "\uD83C\uDF89",
  confetti_ball: "\uD83C\uDF8A",
  rocket: "\uD83D\uDE80",
  airplane: "\u2708\uFE0F",
  car: "\uD83D\uDE97",
  bike: "\uD83D\uDEB2",
  phone: "\uD83D\uDCF1",
  computer: "\uD83D\uDCBB",
  keyboard: "\u2328\uFE0F",
  calendar: "\uD83D\uDCC5",
  clock: "\u23F0",
  hourglass: "\u231B",
  pencil: "\u270F\uFE0F",
  memo: "\uD83D\uDCDD",
  book: "\uD83D\uDCD6",
  bookmark: "\uD83D\uDD16",
  link: "\uD83D\uDD17",
  paperclip: "\uD83D\uDCCE",
  scissors: "\u2702\uFE0F",
  toolbox: "\uD83E\uDDF0",
  hammer: "\uD83D\uDD28",
  wrench: "\uD83D\uDD27",
  gear: "\u2699\uFE0F",

  // Animals
  dog: "\uD83D\uDC36",
  cat: "\uD83D\uDC31",
  mouse: "\uD83D\uDC2D",
  hamster: "\uD83D\uDC39",
  rabbit: "\uD83D\uDC30",
  fox: "\uD83E\uDD8A",
  bear: "\uD83D\uDC3B",
  panda: "\uD83D\uDC3C",
  koala: "\uD83D\uDC28",
  tiger: "\uD83D\uDC2F",
  lion: "\uD83E\uDD81",
  cow: "\uD83D\uDC2E",
  pig: "\uD83D\uDC37",
  monkey: "\uD83D\uDC35",
  chicken: "\uD83D\uDC14",
  penguin: "\uD83D\uDC27",
  bird: "\uD83D\uDC26",
  eagle: "\uD83E\uDD85",
  duck: "\uD83E\uDD86",
  owl: "\uD83E\uDD89",
  frog: "\uD83D\uDC38",
  snake: "\uD83D\uDC0D",
  turtle: "\uD83D\uDC22",
  fish: "\uD83D\uDC1F",
  octopus: "\uD83D\uDC19",
  crab: "\uD83E\uDD80",
  whale: "\uD83D\uDC33",
  dolphin: "\uD83D\uDC2C",
  shark: "\uD83E\uDD88",
  bug: "\uD83D\uDC1B",
  butterfly: "\uD83E\uDD8B",
  bee: "\uD83D\uDC1D",
  unicorn: "\uD83E\uDD84",
  dragon: "\uD83D\uDC09",

  // Food & Drink
  apple: "\uD83C\uDF4E",
  banana: "\uD83C\uDF4C",
  orange: "\uD83C\uDF4A",
  lemon: "\uD83C\uDF4B",
  watermelon: "\uD83C\uDF49",
  grapes: "\uD83C\uDF47",
  strawberry: "\uD83C\uDF53",
  peach: "\uD83C\uDF51",
  cherry: "\uD83C\uDF52",
  pizza: "\uD83C\uDF55",
  hamburger: "\uD83C\uDF54",
  fries: "\uD83C\uDF5F",
  hotdog: "\uD83C\uDF2D",
  taco: "\uD83C\uDF2E",
  burrito: "\uD83C\uDF2F",
  popcorn: "\uD83C\uDF7F",
  cake: "\uD83C\uDF82",
  cookie: "\uD83C\uDF6A",
  donut: "\uD83C\uDF69",
  icecream: "\uD83C\uDF68",
  coffee: "\u2615",
  tea: "\uD83C\uDF75",
  beer: "\uD83C\uDF7A",
  wine: "\uD83C\uDF77",
  cocktail: "\uD83C\uDF78",
  champagne: "\uD83C\uDF7E",

  // Nature
  sun: "\u2600\uFE0F",
  moon: "\uD83C\uDF19",
  cloud: "\u2601\uFE0F",
  rain: "\uD83C\uDF27\uFE0F",
  snow: "\u2744\uFE0F",
  snowflake: "\u2744\uFE0F",
  rainbow: "\uD83C\uDF08",
  umbrella: "\u2602\uFE0F",
  ocean: "\uD83C\uDF0A",
  mountain: "\u26F0\uFE0F",
  tree: "\uD83C\uDF33",
  palm_tree: "\uD83C\uDF34",
  cactus: "\uD83C\uDF35",
  flower: "\uD83C\uDF38",
  rose: "\uD83C\uDF39",
  sunflower: "\uD83C\uDF3B",
  tulip: "\uD83C\uDF37",
  seedling: "\uD83C\uDF31",
  leaf: "\uD83C\uDF43",
  four_leaf_clover: "\uD83C\uDF40",
  mushroom: "\uD83C\uDF44",

  // Symbols
  check: "\u2705",
  white_check_mark: "\u2705",
  x: "\u274C",
  cross_mark: "\u274C",
  exclamation: "\u2757",
  question: "\u2753",
  warning: "\u26A0\uFE0F",
  no_entry: "\u26D4",
  stop_sign: "\uD83D\uDED1",
  sos: "\uD83C\uDD98",
  info: "\u2139\uFE0F",
  arrow_up: "\u2B06\uFE0F",
  arrow_down: "\u2B07\uFE0F",
  arrow_left: "\u2B05\uFE0F",
  arrow_right: "\u27A1\uFE0F",
  recycle: "\u267B\uFE0F",
  copyright: "\u00A9\uFE0F",
  registered: "\u00AE\uFE0F",
  tm: "\u2122\uFE0F",
};

// Reverse mapping for emoji to shortcode
const EMOJI_TO_SHORTCODE: Record<string, string> = Object.entries(
  EMOJI_SHORTCODES,
).reduce<Record<string, string>>((acc, [shortcode, emoji]) => {
  // Don't overwrite if we already have a shortcode for this emoji
  if (!acc[emoji]) {
    acc[emoji] = shortcode;
  }
  return acc;
}, {});

// Convert shortcode to emoji
export function shortcodeToEmoji(shortcode: string): string | null {
  // Remove colons if present
  const code = shortcode.replace(/^:|:$/g, "");
  return EMOJI_SHORTCODES[code] || null;
}

// Convert emoji to shortcode
export function emojiToShortcode(emoji: string): string | null {
  return EMOJI_TO_SHORTCODE[emoji] || null;
}

// Get all available shortcodes
export function getAvailableShortcodes(): string[] {
  return Object.keys(EMOJI_SHORTCODES);
}

// Search shortcodes by query
export function searchShortcodes(
  query: string,
): Array<{ shortcode: string; emoji: string }> {
  const normalizedQuery = query.toLowerCase().replace(/^:|:$/g, "");

  return Object.entries(EMOJI_SHORTCODES)
    .filter(([shortcode]) => shortcode.includes(normalizedQuery))
    .map(([shortcode, emoji]) => ({ shortcode, emoji }))
    .sort((a, b) => {
      // Prioritize exact matches and starts-with matches
      const aStartsWith = a.shortcode.startsWith(normalizedQuery);
      const bStartsWith = b.shortcode.startsWith(normalizedQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.shortcode.localeCompare(b.shortcode);
    })
    .slice(0, 10);
}

// Parse text and replace all :shortcodes: with emojis
export function parseShortcodes(text: string): string {
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, shortcode) => {
    const emoji = EMOJI_SHORTCODES[shortcode];
    return emoji || match;
  });
}

// Component to render text with shortcode conversion
export interface EmojiTextProps {
  text: string;
  className?: string;
}

export const EmojiText = memo(function EmojiText({
  text,
  className,
}: EmojiTextProps) {
  const parsedText = useMemo(() => parseShortcodes(text), [text]);
  return <span className={className}>{parsedText}</span>;
});

// Shortcode autocomplete component
export interface ShortcodeAutocompleteProps {
  query: string;
  onSelect: (shortcode: string, emoji: string) => void;
  onClose: () => void;
  visible?: boolean;
  className?: string;
  position?: { top: number; left: number };
}

export function ShortcodeAutocomplete({
  query,
  onSelect,
  onClose,
  visible = true,
  className,
  position,
}: ShortcodeAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for matching shortcodes
  const results = useMemo(() => searchShortcodes(query), [query]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelect(
            results[selectedIndex].shortcode,
            results[selectedIndex].emoji,
          );
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, results, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!containerRef.current) return;
    const selectedElement = containerRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Handle item click
  const handleItemClick = useCallback(
    (shortcode: string, emoji: string) => {
      onSelect(shortcode, emoji);
    },
    [onSelect],
  );

  if (!visible || results.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.1 }}
        className={cn(
          "absolute z-50 overflow-hidden rounded-md border bg-popover shadow-lg",
          className,
        )}
        style={
          position ? { top: position.top, left: position.left } : undefined
        }
      >
        <ScrollArea className="max-h-[200px]">
          <div className="p-1">
            {results.map(({ shortcode, emoji }, index) => (
              <button
                key={shortcode}
                type="button"
                data-index={index}
                onClick={() => handleItemClick(shortcode, emoji)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  "transition-colors hover:bg-accent",
                  index === selectedIndex && "bg-accent",
                )}
              >
                <span className="text-lg">{emoji}</span>
                <span className="text-muted-foreground">:{shortcode}:</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for shortcode detection in text input
export interface UseShortcodeDetectionOptions {
  enabled?: boolean;
  triggerChar?: string;
}

export function useShortcodeDetection(
  options: UseShortcodeDetectionOptions = {},
) {
  const { enabled = true, triggerChar = ":" } = options;
  const [query, setQuery] = useState<string | null>(null);
  const [position, setPosition] = useState({ start: 0, end: 0 });

  const detectShortcode = useCallback(
    (text: string, cursorPosition: number) => {
      if (!enabled) {
        setQuery(null);
        return;
      }

      // Find the start of the potential shortcode
      let start = cursorPosition - 1;
      while (
        start >= 0 &&
        text[start] !== triggerChar &&
        text[start] !== " " &&
        text[start] !== "\n"
      ) {
        start--;
      }

      // Check if we found a trigger character
      if (start >= 0 && text[start] === triggerChar) {
        const potentialQuery = text.slice(start + 1, cursorPosition);
        // Only show autocomplete if we have at least 1 character after the colon
        if (
          potentialQuery.length >= 1 &&
          /^[a-zA-Z0-9_+-]*$/.test(potentialQuery)
        ) {
          setQuery(potentialQuery);
          setPosition({ start, end: cursorPosition });
          return;
        }
      }

      setQuery(null);
    },
    [enabled, triggerChar],
  );

  const replaceShortcode = useCallback(
    (text: string, shortcode: string, emoji: string): string => {
      if (query === null) return text;

      // Replace the shortcode with the emoji
      const before = text.slice(0, position.start);
      const after = text.slice(position.end);
      return `${before}${emoji}${after}`;
    },
    [query, position],
  );

  const clearQuery = useCallback(() => {
    setQuery(null);
  }, []);

  return {
    query,
    position,
    detectShortcode,
    replaceShortcode,
    clearQuery,
    isActive: query !== null,
  };
}

// Export shortcode data for external use
export { EMOJI_SHORTCODES, EMOJI_TO_SHORTCODE };
