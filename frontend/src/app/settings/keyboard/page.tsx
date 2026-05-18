"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  SettingsLayout,
  SettingsSection,
  KeyboardShortcut,
  KeyboardShortcutGroup,
  Kbd,
} from "@/components/settings";
import { Keyboard, Search, Info } from "lucide-react";

interface ShortcutCategory {
  title: string;
  description?: string;
  shortcuts: {
    keys: string[];
    label: string;
    description?: string;
  }[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: "Navigation",
    description: "Move around the app quickly",
    shortcuts: [
      {
        keys: ["Cmd", "K"],
        label: "Quick switcher",
        description: "Open quick channel/DM switcher",
      },
      {
        keys: ["Cmd", "/"],
        label: "Keyboard shortcuts",
        description: "Show this shortcuts panel",
      },
      {
        keys: ["Cmd", "."],
        label: "Toggle sidebar",
        description: "Show or hide the sidebar",
      },
      {
        keys: ["Cmd", "Shift", "A"],
        label: "All unreads",
        description: "View all unread messages",
      },
      {
        keys: ["Cmd", "Shift", "T"],
        label: "All threads",
        description: "View all threads",
      },
      {
        keys: ["Cmd", "Shift", "D"],
        label: "All DMs",
        description: "View all direct messages",
      },
      {
        keys: ["Alt", "Up"],
        label: "Previous channel",
        description: "Navigate to previous channel",
      },
      {
        keys: ["Alt", "Down"],
        label: "Next channel",
        description: "Navigate to next channel",
      },
      {
        keys: ["Alt", "Shift", "Up"],
        label: "Previous unread",
        description: "Navigate to previous unread channel",
      },
      {
        keys: ["Alt", "Shift", "Down"],
        label: "Next unread",
        description: "Navigate to next unread channel",
      },
    ],
  },
  {
    title: "Messages",
    description: "Compose and interact with messages",
    shortcuts: [
      {
        keys: ["Cmd", "N"],
        label: "New message",
        description: "Start composing a new message",
      },
      {
        keys: ["Enter"],
        label: "Send message",
        description: "Send the current message",
      },
      {
        keys: ["Shift", "Enter"],
        label: "New line",
        description: "Insert a new line in message",
      },
      {
        keys: ["Up"],
        label: "Edit last message",
        description: "Edit your last message (in empty input)",
      },
      {
        keys: ["Cmd", "Shift", "Enter"],
        label: "Create snippet",
        description: "Create a code snippet",
      },
      {
        keys: ["Cmd", "U"],
        label: "Upload file",
        description: "Open file upload dialog",
      },
      {
        keys: ["Escape"],
        label: "Cancel",
        description: "Cancel editing or close dialogs",
      },
    ],
  },
  {
    title: "Formatting",
    description: "Format your messages",
    shortcuts: [
      {
        keys: ["Cmd", "B"],
        label: "Bold",
        description: "Make selected text bold",
      },
      {
        keys: ["Cmd", "I"],
        label: "Italic",
        description: "Make selected text italic",
      },
      {
        keys: ["Cmd", "Shift", "X"],
        label: "Strikethrough",
        description: "Strike through selected text",
      },
      {
        keys: ["Cmd", "Shift", "C"],
        label: "Code",
        description: "Format as inline code",
      },
      {
        keys: ["Cmd", "Shift", "7"],
        label: "Numbered list",
        description: "Create a numbered list",
      },
      {
        keys: ["Cmd", "Shift", "8"],
        label: "Bulleted list",
        description: "Create a bulleted list",
      },
      {
        keys: ["Cmd", "Shift", ">"],
        label: "Quote",
        description: "Format as blockquote",
      },
      {
        keys: ["Cmd", "Shift", "K"],
        label: "Link",
        description: "Insert a hyperlink",
      },
    ],
  },
  {
    title: "Reactions & Actions",
    description: "Quick reactions and message actions",
    shortcuts: [
      {
        keys: ["Cmd", "Shift", "\\"],
        label: "Emoji picker",
        description: "Open emoji picker",
      },
      {
        keys: ["+", ":"],
        label: "Add reaction",
        description: "Add emoji reaction to message",
      },
      {
        keys: ["R"],
        label: "Reply in thread",
        description: "Start a thread on selected message",
      },
      {
        keys: ["E"],
        label: "Edit message",
        description: "Edit selected message",
      },
      {
        keys: ["P"],
        label: "Pin message",
        description: "Pin or unpin selected message",
      },
      {
        keys: ["S"],
        label: "Save message",
        description: "Save message for later",
      },
      {
        keys: ["M"],
        label: "Mark unread",
        description: "Mark message as unread",
      },
      {
        keys: ["Delete"],
        label: "Delete message",
        description: "Delete selected message",
      },
    ],
  },
  {
    title: "Search",
    description: "Find messages and content",
    shortcuts: [
      {
        keys: ["Cmd", "F"],
        label: "Search in channel",
        description: "Search within current channel",
      },
      {
        keys: ["Cmd", "G"],
        label: "Global search",
        description: "Search across all channels",
      },
      {
        keys: ["Cmd", "Shift", "F"],
        label: "Search messages",
        description: "Advanced message search",
      },
      {
        keys: ["Cmd", "P"],
        label: "Search people",
        description: "Find a person",
      },
    ],
  },
  {
    title: "Calls",
    description: "Audio and video call shortcuts",
    shortcuts: [
      {
        keys: ["Cmd", "Shift", "H"],
        label: "Start huddle",
        description: "Start an audio huddle",
      },
      {
        keys: ["M"],
        label: "Toggle mute",
        description: "Mute or unmute microphone (in call)",
      },
      {
        keys: ["V"],
        label: "Toggle video",
        description: "Turn video on or off (in call)",
      },
      {
        keys: ["Cmd", "Shift", "E"],
        label: "End call",
        description: "Leave the current call",
      },
    ],
  },
  {
    title: "Accessibility",
    description: "Screen reader and accessibility shortcuts",
    shortcuts: [
      {
        keys: ["F6"],
        label: "Move focus",
        description: "Move focus between main areas",
      },
      {
        keys: ["Cmd", "Shift", "M"],
        label: "Jump to message",
        description: "Jump to message input",
      },
      {
        keys: ["Cmd", "J"],
        label: "Jump to unread",
        description: "Jump to first unread message",
      },
    ],
  },
];

export default function KeyboardSettingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    // Detect OS
    setIsMac(navigator.platform.toLowerCase().includes("mac"));
  }, []);

  // Replace Cmd with Ctrl for non-Mac systems
  const getKey = (key: string) => {
    if (!isMac && key === "Cmd") return "Ctrl";
    if (!isMac && key === "Option") return "Alt";
    return key;
  };

  // Filter shortcuts based on search
  const filteredCategories = shortcutCategories
    .map((category) => ({
      ...category,
      shortcuts: category.shortcuts.filter(
        (shortcut) =>
          shortcut.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          shortcut.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          shortcut.keys.some((key) =>
            getKey(key).toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      ),
    }))
    .filter((category) => category.shortcuts.length > 0);

  return (
    <SettingsLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Keyboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Keyboard Shortcuts
            </h1>
            <p className="text-sm text-muted-foreground">
              Speed up your workflow with keyboard shortcuts
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* OS Info */}
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>
            Showing shortcuts for{" "}
            <span className="font-medium text-foreground">
              {isMac ? "macOS" : "Windows/Linux"}
            </span>
            . Use <Kbd>{isMac ? "Cmd" : "Ctrl"}</Kbd> as the primary modifier
            key.
          </span>
        </div>

        {/* Shortcut Categories */}
        <div className="space-y-8">
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Keyboard className="text-muted-foreground/50 mb-4 h-12 w-12" />
              <p className="text-lg font-medium">No shortcuts found</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <KeyboardShortcutGroup
                key={category.title}
                title={category.title}
                description={category.description}
              >
                {category.shortcuts.map((shortcut, index) => (
                  <KeyboardShortcut
                    key={index}
                    keys={shortcut.keys.map(getKey)}
                    label={shortcut.label}
                    description={shortcut.description}
                  />
                ))}
              </KeyboardShortcutGroup>
            ))
          )}
        </div>

        {/* Tips Section */}
        <SettingsSection
          title="Tips"
          description="Get the most out of keyboard shortcuts"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium">Learn navigation first</p>
                <p className="text-sm text-muted-foreground">
                  Master <Kbd>{isMac ? "Cmd" : "Ctrl"}</Kbd> + <Kbd>K</Kbd> and
                  channel navigation to move around quickly.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium">Use the quick switcher</p>
                <p className="text-sm text-muted-foreground">
                  Press <Kbd>{isMac ? "Cmd" : "Ctrl"}</Kbd> + <Kbd>K</Kbd> to
                  quickly jump to any channel, DM, or search.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-4">
              <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium">Format messages efficiently</p>
                <p className="text-sm text-muted-foreground">
                  Use formatting shortcuts like{" "}
                  <Kbd>{isMac ? "Cmd" : "Ctrl"}</Kbd> + <Kbd>B</Kbd> for bold
                  while composing messages.
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Customization Note */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Coming soon:</strong> Custom keyboard shortcut bindings will
            be available in a future update. You'll be able to remap any
            shortcut to your preferred key combination.
          </p>
        </div>
      </div>
    </SettingsLayout>
  );
}
