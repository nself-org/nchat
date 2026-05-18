"use client";

import { useState } from "react";
import {
  Hash,
  Lock,
  Star,
  Users,
  Pin,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Bell,
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Separator } from "@/components/ui/separator";
import {
  ComponentPreview,
  PreviewCard,
  PreviewGrid,
} from "@/components/dev/component-preview";
import { CodeBlock } from "@/components/dev/code-block";
import { PropsTable, PropDefinition } from "@/components/dev/props-table";

// ============================================================================
// Mock Data
// ============================================================================

const mockChannels = [
  {
    id: "ch-1",
    name: "general",
    type: "public",
    memberCount: 42,
    unreadCount: 0,
  },
  {
    id: "ch-2",
    name: "engineering",
    type: "public",
    memberCount: 15,
    unreadCount: 3,
  },
  {
    id: "ch-3",
    name: "design",
    type: "public",
    memberCount: 8,
    unreadCount: 0,
  },
  {
    id: "ch-4",
    name: "leadership",
    type: "private",
    memberCount: 5,
    unreadCount: 1,
  },
  {
    id: "ch-5",
    name: "random",
    type: "public",
    memberCount: 38,
    unreadCount: 0,
  },
];

// ============================================================================
// Props Definitions
// ============================================================================

const channelListProps: PropDefinition[] = [
  { name: "className", type: "string", description: "Additional CSS classes" },
  {
    name: "onChannelSelect",
    type: "(channel: Channel) => void",
    description: "Callback when channel is selected",
  },
];

const channelHeaderProps: PropDefinition[] = [
  { name: "className", type: "string", description: "Additional CSS classes" },
  {
    name: "onSearchClick",
    type: "() => void",
    description: "Callback for search button",
  },
  {
    name: "onPinnedClick",
    type: "() => void",
    description: "Callback for pinned messages button",
  },
  {
    name: "onMembersClick",
    type: "() => void",
    description: "Callback for members button",
  },
  {
    name: "onSettingsClick",
    type: "() => void",
    description: "Callback for settings button",
  },
  {
    name: "onInfoClick",
    type: "() => void",
    description: "Callback for info button",
  },
];

const channelItemProps: PropDefinition[] = [
  {
    name: "channel",
    type: "Channel",
    required: true,
    description: "Channel object to display",
  },
  {
    name: "isActive",
    type: "boolean",
    default: "false",
    description: "Whether this channel is active",
  },
  {
    name: "onSelect",
    type: "(channel: Channel) => void",
    description: "Selection callback",
  },
  { name: "className", type: "string", description: "Additional CSS classes" },
];

// ============================================================================
// Code Examples
// ============================================================================

const channelListCode = `import { ChannelList } from '@/components/channel/channel-list'

function Sidebar() {
  const handleChannelSelect = (channel: Channel) => {
    router.push(\`/chat/channel/\${channel.slug}\`)
  }

  return (
    <aside className="w-64 border-r">
      <ChannelList onChannelSelect={handleChannelSelect} />
    </aside>
  )
}`;

const channelHeaderCode = `import { ChannelHeader } from '@/components/channel/channel-header'

function ChatView() {
  return (
    <div className="flex flex-col h-full">
      <ChannelHeader
        onSearchClick={() => openChannelSearch()}
        onMembersClick={() => toggleMembersPanel()}
        onPinnedClick={() => showPinnedMessages()}
      />
      <MessageList ... />
      <MessageInput ... />
    </div>
  )
}`;

const channelItemCode = `import { ChannelItem } from '@/components/channel/channel-item'

<ChannelItem
  channel={{
    id: 'ch-1',
    name: 'engineering',
    type: 'public',
    description: 'Engineering discussions',
    memberCount: 15,
    unreadCount: 3,
    lastMessageAt: new Date()
  }}
  isActive={activeChannelId === 'ch-1'}
  onSelect={(channel) => navigateTo(channel)}
/>`;

// ============================================================================
// Page Component
// ============================================================================

export default function ChannelsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["starred", "channels"]),
  );

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setExpandedCategories(next);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Hash className="h-5 w-5 text-purple-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Channel Components
          </h1>
        </div>
        <p className="text-muted-foreground">
          Components for displaying and managing chat channels. Includes channel
          lists, headers, categories, and creation modals.
        </p>
      </div>

      {/* Component List */}
      <div className="flex flex-wrap gap-2">
        {[
          "ChannelList",
          "ChannelHeader",
          "ChannelItem",
          "ChannelCategory",
          "ChannelInfoPanel",
          "CreateChannelModal",
        ].map((name) => (
          <Badge key={name} variant="secondary" className="text-sm">
            {name}
          </Badge>
        ))}
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channellist">ChannelList</TabsTrigger>
          <TabsTrigger value="channelheader">ChannelHeader</TabsTrigger>
          <TabsTrigger value="channelitem">ChannelItem</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Channel System Overview</CardTitle>
              <CardDescription>
                The channel system provides a Slack-like experience for
                organizing conversations into public and private channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <PreviewCard title="ChannelList">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Sidebar component showing all channels with search,
                      categories, and quick actions.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>Public and private channels</li>
                      <li>Starred channels section</li>
                      <li>Channel categories</li>
                      <li>Unread badges</li>
                    </ul>
                  </div>
                </PreviewCard>

                <PreviewCard title="ChannelHeader">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Header bar showing channel info with action buttons for
                      search, members, and settings.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>Channel name and icon</li>
                      <li>Topic display</li>
                      <li>Member count</li>
                      <li>Star/mute toggles</li>
                    </ul>
                  </div>
                </PreviewCard>

                <PreviewCard title="ChannelItem">
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      Individual channel item in the sidebar with hover actions
                      and context menu.
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      <li>Channel type icon</li>
                      <li>Unread indicator</li>
                      <li>Muted state</li>
                      <li>Context menu</li>
                    </ul>
                  </div>
                </PreviewCard>
              </div>
            </CardContent>
          </Card>

          {/* Demo Preview */}
          <ComponentPreview
            title="Channel List Demo"
            description="Interactive channel list with categories and search"
          >
            <div className="w-64 rounded-lg border bg-background">
              {/* Search */}
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search channels..."
                    className="bg-muted/30 w-full rounded-md border py-1.5 pl-8 pr-3 text-sm"
                  />
                </div>
              </div>

              {/* Channel List */}
              <div className="px-2 pb-3">
                {/* Starred */}
                <div className="mb-2">
                  <button
                    className="hover:bg-muted/50 flex w-full items-center gap-1.5 rounded px-2 py-1"
                    onClick={() => toggleCategory("starred")}
                  >
                    {expandedCategories.has("starred") ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Starred
                    </span>
                    <span className="text-muted-foreground/60 text-xs">
                      (1)
                    </span>
                  </button>
                  {expandedCategories.has("starred") && (
                    <div className="mt-1 space-y-0.5">
                      <div className="bg-primary/10 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">general</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Channels */}
                <div className="mb-2">
                  <button
                    className="hover:bg-muted/50 flex w-full items-center gap-1.5 rounded px-2 py-1"
                    onClick={() => toggleCategory("channels")}
                  >
                    {expandedCategories.has("channels") ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Channels
                    </span>
                    <span className="text-muted-foreground/60 text-xs">
                      (5)
                    </span>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </button>
                  {expandedCategories.has("channels") && (
                    <div className="mt-1 space-y-0.5">
                      {mockChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className={cn(
                            "hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                            channel.id === "ch-1" &&
                              "bg-primary/10 text-primary",
                          )}
                        >
                          {channel.type === "private" ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Hash className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={cn(
                              channel.unreadCount > 0 && "font-semibold",
                            )}
                          >
                            {channel.name}
                          </span>
                          {channel.unreadCount > 0 && (
                            <span className="text-primary-foreground ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium">
                              {channel.unreadCount}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ComponentPreview>
        </TabsContent>

        {/* ChannelList Tab */}
        <TabsContent value="channellist" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>ChannelList</CardTitle>
              <CardDescription>
                A complete channel sidebar with search, categories, starred
                channels, and direct messages. Integrates with Zustand store for
                state management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={channelListCode}
                language="tsx"
                filename="sidebar.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={channelListProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewGrid cols={2}>
                <PreviewCard title="Channel Search">
                  <p className="text-sm text-muted-foreground">
                    Filter channels by name, description, or topic. Results
                    update in real-time as you type.
                  </p>
                </PreviewCard>
                <PreviewCard title="Channel Categories">
                  <p className="text-sm text-muted-foreground">
                    Organize channels into collapsible categories. Categories
                    can be reordered via drag and drop (when enabled).
                  </p>
                </PreviewCard>
                <PreviewCard title="Starred Channels">
                  <p className="text-sm text-muted-foreground">
                    Users can star frequently used channels for quick access.
                    Starred channels appear in a dedicated section at the top.
                  </p>
                </PreviewCard>
                <PreviewCard title="Unread Indicators">
                  <p className="text-sm text-muted-foreground">
                    Channels with unread messages show a badge with the count.
                    Bold text indicates unread content.
                  </p>
                </PreviewCard>
              </PreviewGrid>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ChannelHeader Tab */}
        <TabsContent value="channelheader" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>ChannelHeader</CardTitle>
              <CardDescription>
                The channel header displays the current channel name, topic, and
                provides quick actions for search, members, and settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={channelHeaderCode}
                language="tsx"
                filename="chat-view.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={channelHeaderProps} />
            </CardContent>
          </Card>

          {/* Demo */}
          <ComponentPreview title="ChannelHeader Demo">
            <div className="rounded-lg border bg-background">
              <div className="flex h-14 items-center justify-between border-b px-4">
                {/* Left */}
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="font-semibold">engineering</h1>
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    </div>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      Building the future, one commit at a time
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Right */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm">15</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </ComponentPreview>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewGrid cols={3}>
                <PreviewCard title="Star/Unstar">
                  <p className="text-sm text-muted-foreground">
                    Toggle starred status. Starred channels appear in the
                    dedicated section at the top of the channel list.
                  </p>
                </PreviewCard>
                <PreviewCard title="Mute/Unmute">
                  <p className="text-sm text-muted-foreground">
                    Mute notifications for this channel. Muted channels show a
                    bell-off icon in the header.
                  </p>
                </PreviewCard>
                <PreviewCard title="Members">
                  <p className="text-sm text-muted-foreground">
                    Open the members panel to see who is in the channel and
                    their online status.
                  </p>
                </PreviewCard>
              </PreviewGrid>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ChannelItem Tab */}
        <TabsContent value="channelitem" className="mt-6 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>ChannelItem</CardTitle>
              <CardDescription>
                Individual channel item in the sidebar. Shows channel type icon,
                name, unread count, and supports context menu actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={channelItemCode}
                language="tsx"
                filename="channel-item-example.tsx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Props</CardTitle>
            </CardHeader>
            <CardContent>
              <PropsTable props={channelItemProps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewGrid cols={2}>
                <PreviewCard title="Public Channel">
                  <div className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>general</span>
                  </div>
                </PreviewCard>

                <PreviewCard title="Private Channel">
                  <div className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span>leadership</span>
                  </div>
                </PreviewCard>

                <PreviewCard title="Active Channel">
                  <div className="bg-primary/10 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">
                      engineering
                    </span>
                  </div>
                </PreviewCard>

                <PreviewCard title="Unread Channel">
                  <div className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">design</span>
                    <span className="text-primary-foreground ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium">
                      5
                    </span>
                  </div>
                </PreviewCard>

                <PreviewCard title="Muted Channel">
                  <div className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>random</span>
                    <BellOff className="ml-auto h-3.5 w-3.5" />
                  </div>
                </PreviewCard>

                <PreviewCard title="Starred Channel">
                  <div className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span>announcements</span>
                    <Star className="ml-auto h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  </div>
                </PreviewCard>
              </PreviewGrid>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
