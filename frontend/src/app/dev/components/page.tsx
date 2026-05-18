"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  MessageSquare,
  Hash,
  User,
  Layers,
  Settings,
  Bell,
  FileIcon,
  Smile,
  Menu,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ============================================================================
// Types
// ============================================================================

interface ComponentInfo {
  name: string;
  description: string;
  path: string;
  category: string;
  status: "stable" | "beta" | "new";
}

// ============================================================================
// Component Data
// ============================================================================

const categories = [
  { id: "all", label: "All", icon: Layers },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "channel", label: "Channels", icon: Hash },
  { id: "user", label: "Users", icon: User },
  { id: "ui", label: "UI", icon: Settings },
  { id: "notification", label: "Notifications", icon: Bell },
  { id: "file", label: "Files", icon: FileIcon },
  { id: "emoji", label: "Emoji", icon: Smile },
  { id: "layout", label: "Layout", icon: Menu },
];

const components: ComponentInfo[] = [
  // Chat components
  {
    name: "MessageList",
    description:
      "Virtualized list of messages with grouping and infinite scroll",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },
  {
    name: "MessageItem",
    description: "Individual message with reactions, threads, and actions",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },
  {
    name: "MessageInput",
    description: "Rich text editor with TipTap, mentions, and attachments",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },
  {
    name: "MessageSkeleton",
    description: "Loading placeholder for message list",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },
  {
    name: "MessageReactions",
    description: "Emoji reactions display and picker",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },
  {
    name: "MessageThreadPreview",
    description: "Thread reply preview with participant avatars",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },
  {
    name: "TypingIndicator",
    description: "Shows users currently typing in channel",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },
  {
    name: "MessageSystem",
    description: "System messages like joins, leaves, and announcements",
    path: "/dev/components/messages",
    category: "chat",
    status: "stable",
  },

  // Channel components
  {
    name: "ChannelList",
    description: "Sidebar channel list with categories and search",
    path: "/dev/components/channels",
    category: "channel",
    status: "stable",
  },
  {
    name: "ChannelHeader",
    description: "Channel header with name, topic, and actions",
    path: "/dev/components/channels",
    category: "channel",
    status: "stable",
  },
  {
    name: "ChannelItem",
    description: "Individual channel item with unread badge",
    path: "/dev/components/channels",
    category: "channel",
    status: "stable",
  },
  {
    name: "ChannelCategory",
    description: "Collapsible category for organizing channels",
    path: "/dev/components/channels",
    category: "channel",
    status: "stable",
  },
  {
    name: "ChannelInfoPanel",
    description: "Detailed channel information sidebar",
    path: "/dev/components/channels",
    category: "channel",
    status: "stable",
  },
  {
    name: "CreateChannelModal",
    description: "Modal for creating new channels",
    path: "/dev/components/channels",
    category: "channel",
    status: "stable",
  },

  // User components
  {
    name: "UserAvatar",
    description: "User avatar with presence indicator",
    path: "/dev/components/users",
    category: "user",
    status: "stable",
  },
  {
    name: "UserAvatarGroup",
    description: "Stacked avatar group with overflow count",
    path: "/dev/components/users",
    category: "user",
    status: "stable",
  },
  {
    name: "UserProfileCard",
    description: "User profile hover card with actions",
    path: "/dev/components/users",
    category: "user",
    status: "stable",
  },
  {
    name: "UserPresenceDot",
    description: "Online/offline/away/DND status indicator",
    path: "/dev/components/users",
    category: "user",
    status: "stable",
  },
  {
    name: "RoleBadge",
    description: "User role badge (owner, admin, moderator, etc.)",
    path: "/dev/components/users",
    category: "user",
    status: "stable",
  },
  {
    name: "UserStatus",
    description: "Custom status with emoji and text",
    path: "/dev/components/users",
    category: "user",
    status: "stable",
  },

  // UI components
  {
    name: "Button",
    description: "Versatile button with multiple variants and sizes",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Input",
    description: "Text input with label and error states",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Dialog",
    description: "Modal dialog with accessibility support",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "DropdownMenu",
    description: "Dropdown menu with submenus and checkboxes",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Tabs",
    description: "Tabbed interface with keyboard navigation",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Tooltip",
    description: "Hover tooltip with configurable positioning",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Card",
    description: "Content container with header and footer",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Badge",
    description: "Small status indicator label",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Switch",
    description: "Toggle switch for boolean settings",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },
  {
    name: "Select",
    description: "Dropdown select with search",
    path: "/dev/components",
    category: "ui",
    status: "stable",
  },

  // Notification components
  {
    name: "NotificationBell",
    description: "Notification bell icon with unread count",
    path: "/dev/components",
    category: "notification",
    status: "stable",
  },
  {
    name: "UnreadBadge",
    description: "Unread message count badge",
    path: "/dev/components",
    category: "notification",
    status: "stable",
  },
  {
    name: "MentionBadge",
    description: "Badge showing mention count",
    path: "/dev/components",
    category: "notification",
    status: "stable",
  },

  // File components
  {
    name: "FileIcon",
    description: "File type icon based on mime type",
    path: "/dev/components",
    category: "file",
    status: "stable",
  },
  {
    name: "MessageAttachments",
    description: "File attachment display with preview",
    path: "/dev/components/messages",
    category: "file",
    status: "stable",
  },

  // Emoji components
  {
    name: "EmojiButton",
    description: "Emoji picker trigger button",
    path: "/dev/components",
    category: "emoji",
    status: "stable",
  },
  {
    name: "ReactionPicker",
    description: "Quick reaction picker menu",
    path: "/dev/components",
    category: "emoji",
    status: "stable",
  },
  {
    name: "ReactionDisplay",
    description: "Reaction display with users list",
    path: "/dev/components",
    category: "emoji",
    status: "stable",
  },

  // Layout components
  {
    name: "ChatLayout",
    description: "Main chat layout with sidebar and content",
    path: "/dev/components",
    category: "layout",
    status: "stable",
  },
  {
    name: "Sidebar",
    description: "Application sidebar with navigation",
    path: "/dev/components",
    category: "layout",
    status: "stable",
  },
  {
    name: "Header",
    description: "Application header with user menu",
    path: "/dev/components",
    category: "layout",
    status: "stable",
  },
  {
    name: "SettingsLayout",
    description: "Settings page layout with navigation",
    path: "/dev/components",
    category: "layout",
    status: "stable",
  },
];

// ============================================================================
// Component Card
// ============================================================================

function ComponentCard({ component }: { component: ComponentInfo }) {
  return (
    <Link href={component.path} className="group">
      <Card className="hover:border-primary/50 h-full transition-all hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base transition-colors group-hover:text-primary">
              {component.name}
            </CardTitle>
            <Badge
              variant={
                component.status === "stable"
                  ? "outline"
                  : component.status === "new"
                    ? "default"
                    : "secondary"
              }
              className={cn(
                "text-[10px]",
                component.status === "new" && "bg-green-500",
              )}
            >
              {component.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm">
            {component.description}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default function ComponentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Filter components based on search and category
  const filteredComponents = useMemo(() => {
    return components.filter((component) => {
      const matchesSearch =
        searchQuery === "" ||
        component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        component.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === "all" || component.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  // Get counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: components.length };
    components.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight">
          Component Library
        </h1>
        <p className="text-muted-foreground">
          Browse all {components.length} components available in nself-chat.
          Each component is fully typed, accessible, and themeable.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="h-10 flex-wrap justify-start gap-1 bg-transparent p-0">
          {categories.map((category) => {
            const Icon = category.icon;
            const count = categoryCounts[category.id] || 0;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="data-[state=active]:text-primary-foreground h-8 gap-1.5 data-[state=active]:bg-primary"
              >
                <Icon className="h-3.5 w-3.5" />
                {category.label}
                <span className="ml-1 text-xs opacity-60">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filteredComponents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredComponents.map((component) => (
                <ComponentCard key={component.name} component={component} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                No components found matching your search.
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Navigation */}
      <div className="border-t pt-8">
        <h2 className="mb-4 text-xl font-semibold">Detailed Documentation</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link href="/dev/components/messages" className="group">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Message Components</h3>
                    <p className="text-sm text-muted-foreground">
                      8 components
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/dev/components/channels" className="group">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <Hash className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Channel Components</h3>
                    <p className="text-sm text-muted-foreground">
                      6 components
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/dev/components/users" className="group">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-500/10 p-2">
                    <User className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">User Components</h3>
                    <p className="text-sm text-muted-foreground">
                      6 components
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
