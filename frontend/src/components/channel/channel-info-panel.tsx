"use client";

import * as React from "react";
import { useState } from "react";
import { format } from "date-fns";
import {
  X,
  Hash,
  Lock,
  Calendar,
  User,
  Users,
  Pin,
  FileText,
  Settings,
  Edit2,
  Link as LinkIcon,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChannelMembers } from "./channel-members";
import { PinnedMessages } from "./pinned-messages";
import {
  useChannelStore,
  selectActiveChannel,
  type Channel,
} from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

interface ChannelInfoPanelProps {
  className?: string;
  onClose?: () => void;
}

type TabValue = "about" | "members" | "pinned" | "files" | "settings";

// ============================================================================
// Helper Components
// ============================================================================

function InfoRow({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm">{value}</div>
      </div>
      {action}
    </div>
  );
}

function ChannelIcon({ channel }: { channel: Channel }) {
  const isDM = channel.type === "direct" || channel.type === "group";

  if (isDM) {
    return (
      <Avatar className="h-16 w-16">
        <AvatarImage
          src={channel.otherUserAvatar}
          alt={channel.otherUserName}
        />
        <AvatarFallback className="text-xl">
          {channel.otherUserName?.charAt(0).toUpperCase() ||
            channel.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
      {channel.type === "private" ? (
        <Lock className="h-8 w-8 text-muted-foreground" />
      ) : (
        <Hash className="h-8 w-8 text-muted-foreground" />
      )}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ChannelInfoPanel({
  className,
  onClose,
}: ChannelInfoPanelProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const channel = useChannelStore(selectActiveChannel);
  const { setMembersPanelOpen, openModal } = useUIStore();

  const [activeTab, setActiveTab] = useState<TabValue>("about");
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setMembersPanelOpen(false);
    }
  };

  const handleEditChannel = () => {
    if (channel) {
      openModal("channel-settings", { channelId: channel.id });
    }
  };

  const handleCopyLink = async () => {
    if (!channel) return;
    const url = `${window.location.origin}/chat/channel/${channel.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!channel) {
    return null;
  }

  const isDM = channel.type === "direct" || channel.type === "group";

  return (
    <div
      className={cn("flex h-full flex-col border-l bg-background", className)}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="font-semibold">
          {isDM ? "Conversation Details" : "Channel Details"}
        </h2>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Channel Info Header */}
      <div className="border-b p-4">
        <div className="flex items-start gap-4">
          <ChannelIcon channel={channel} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold">
                {isDM ? channel.otherUserName || channel.name : channel.name}
              </h3>
              {isAdmin && !isDM && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleEditChannel}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {channel.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {channel.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {channel.type === "private"
                  ? "Private"
                  : channel.type === "public"
                    ? "Public"
                    : "Direct"}
              </Badge>
              {!isDM && (
                <span className="text-xs text-muted-foreground">
                  {channel.memberCount} member
                  {channel.memberCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid w-full grid-cols-4 px-4 pt-2">
          <TabsTrigger value="about" className="text-xs">
            About
          </TabsTrigger>
          <TabsTrigger value="members" className="text-xs">
            Members
          </TabsTrigger>
          <TabsTrigger value="pinned" className="text-xs">
            Pinned
          </TabsTrigger>
          {isAdmin && !isDM && (
            <TabsTrigger value="settings" className="text-xs">
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* About Tab */}
        <TabsContent value="about" className="m-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-4">
              {/* Topic */}
              {channel.topic && (
                <InfoRow
                  icon={FileText}
                  label="Topic"
                  value={<p className="whitespace-pre-wrap">{channel.topic}</p>}
                />
              )}

              {/* Description */}
              {channel.description && (
                <InfoRow
                  icon={FileText}
                  label="Description"
                  value={
                    <p className="whitespace-pre-wrap">{channel.description}</p>
                  }
                />
              )}

              {/* Created */}
              <InfoRow
                icon={Calendar}
                label="Created"
                value={format(new Date(channel.createdAt), "MMMM d, yyyy")}
              />

              {/* Creator */}
              {channel.createdBy && (
                <InfoRow
                  icon={User}
                  label="Created by"
                  value={
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {channel.createdBy.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{channel.createdBy}</span>
                    </div>
                  }
                />
              )}

              {/* Members */}
              {!isDM && (
                <InfoRow
                  icon={Users}
                  label="Members"
                  value={`${channel.memberCount} member${channel.memberCount !== 1 ? "s" : ""}`}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("members")}
                    >
                      View all
                    </Button>
                  }
                />
              )}

              {/* Channel Link */}
              {!isDM && (
                <InfoRow
                  icon={LinkIcon}
                  label="Channel link"
                  value={
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      /chat/channel/{channel.slug}
                    </code>
                  }
                  action={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  }
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="m-0 flex-1">
          <ChannelMembers channelId={channel.id} />
        </TabsContent>

        {/* Pinned Tab */}
        <TabsContent value="pinned" className="m-0 flex-1">
          <PinnedMessages channelId={channel.id} />
        </TabsContent>

        {/* Settings Tab (Admin only) */}
        {isAdmin && !isDM && (
          <TabsContent value="settings" className="m-0 flex-1">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleEditChannel}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Edit channel details
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    openModal("invite-members", { channelId: channel.id })
                  }
                >
                  <Users className="mr-2 h-4 w-4" />
                  Invite people
                </Button>

                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() =>
                      openModal("confirm-action", {
                        title: "Archive Channel",
                        message: `Are you sure you want to archive #${channel.name}? Members will no longer be able to send messages.`,
                        confirmLabel: "Archive",
                        onConfirm: () => {
                          useChannelStore.getState().archiveChannel(channel.id);
                        },
                      })
                    }
                  >
                    Archive channel
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

ChannelInfoPanel.displayName = "ChannelInfoPanel";
