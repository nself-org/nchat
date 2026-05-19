"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { CreateChannelModal } from "@/components/channel/create-channel-modal";
import { CreateDmModal } from "@/components/channel/create-dm-modal";
import { SearchModal } from "@/components/search/search-modal";
import {
  Hash,
  Plus,
  Search,
  Clock,
  MessageSquare,
  Users,
  Sparkles,
  ArrowRight,
  Compass,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

interface RecentChannelProps {
  name: string;
  slug: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

// ============================================================================
// Quick Action Card Component
// ============================================================================

function QuickAction({
  icon,
  title,
  description,
  href,
  onClick,
}: QuickActionProps) {
  const content = (
    <Card
      className={cn(
        "hover:border-primary/50 group cursor-pointer transition-all hover:shadow-md",
        "hover:bg-accent/50 bg-card",
      )}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div className="bg-primary/10 group-hover:text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary transition-colors group-hover:bg-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-medium">
            {title}
            <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return (
    <button onClick={onClick} className="w-full text-left" aria-label={title}>
      {content}
    </button>
  );
}

// ============================================================================
// Recent Channel Item Component
// ============================================================================

function RecentChannelItem({
  name,
  slug,
  lastMessage,
  lastMessageTime,
}: RecentChannelProps) {
  return (
    <Link
      href={`/chat/channel/${slug}`}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2",
        "transition-colors hover:bg-accent",
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Hash className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{name}</span>
          {lastMessageTime && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {lastMessageTime}
            </span>
          )}
        </div>
        {lastMessage && (
          <p className="truncate text-sm text-muted-foreground">
            {lastMessage}
          </p>
        )}
      </div>
    </Link>
  );
}

// ============================================================================
// Main Chat Page Component
// ============================================================================

export default function ChatPage() {
  const { user } = useAuth();
  const { config } = useAppConfig();

  // Modal state
  const [showCreateChannel, setShowCreateChannel] = React.useState(false);
  const [showCreateDm, setShowCreateDm] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);

  // Mock recent activity data
  const recentChannels: RecentChannelProps[] = [
    {
      name: "general",
      slug: "general",
      lastMessage: "Welcome to the team! Feel free to introduce yourself.",
      lastMessageTime: "2m ago",
    },
    {
      name: "announcements",
      slug: "announcements",
      lastMessage: "New features have been deployed to production.",
      lastMessageTime: "1h ago",
    },
    {
      name: "random",
      slug: "random",
      lastMessage: "Anyone up for lunch?",
      lastMessageTime: "3h ago",
    },
  ];

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="mx-auto w-full max-w-4xl flex-1 p-6 lg:p-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, {user?.displayName?.split(" ")[0] || "there"}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Welcome to {config?.branding?.appName || "nchat"}. What would you
            like to do today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickAction
              icon={<Compass className="h-5 w-5" />}
              title="Browse Channels"
              description="Discover and join channels that interest you"
              href="/chat/channel/general"
            />
            <QuickAction
              icon={<Plus className="h-5 w-5" />}
              title="Create Channel"
              description="Start a new channel for your team"
              onClick={() => setShowCreateChannel(true)}
            />
            <QuickAction
              icon={<MessageSquare className="h-5 w-5" />}
              title="Start a Conversation"
              description="Send a direct message to a teammate"
              onClick={() => setShowCreateDm(true)}
            />
            <QuickAction
              icon={<Search className="h-5 w-5" />}
              title="Search Messages"
              description="Find messages, files, or conversations"
              onClick={() => setShowSearch(true)}
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </h2>
          <Card>
            <CardContent className="p-2">
              {recentChannels.length > 0 ? (
                <div className="divide-y">
                  {recentChannels.map((channel) => (
                    <RecentChannelItem key={channel.slug} {...channel} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity yet. Start by joining a channel!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Stats (Placeholder) */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-muted-foreground" />
            Team Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Members</CardDescription>
                <CardTitle className="text-2xl">8</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Channels</CardDescription>
                <CardTitle className="text-2xl">12</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Messages Today</CardDescription>
                <CardTitle className="text-2xl">47</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Getting Started Guide (for new users) */}
        {user?.role === "owner" && !config?.setup?.isCompleted && (
          <div className="border-primary/30 bg-primary/5 mt-8 rounded-lg border-2 border-dashed p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold">
                  Complete Your Setup
                </h3>
                <p className="mb-4 text-muted-foreground">
                  You haven&apos;t finished setting up your workspace. Complete
                  the setup wizard to customize your chat experience.
                </p>
                <Button asChild>
                  <Link href="/setup">Continue Setup</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateChannelModal
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
      />
      <CreateDmModal open={showCreateDm} onOpenChange={setShowCreateDm} />
      <SearchModal open={showSearch} onOpenChange={setShowSearch} />
    </div>
  );
}
