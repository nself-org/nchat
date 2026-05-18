"use client";

/**
 * CommandChannels - Where the command works
 */

import { useState } from "react";
import {
  Hash,
  Lock,
  MessageCircle,
  Users,
  X,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CommandChannelConfig } from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandChannelsProps {
  channels?: Partial<CommandChannelConfig>;
  onChange: (channels: Partial<CommandChannelConfig>) => void;
}

// ============================================================================
// Channel Types
// ============================================================================

const channelTypes = [
  {
    value: "public",
    label: "Public Channels",
    icon: Hash,
    description: "Open channels anyone can join",
  },
  {
    value: "private",
    label: "Private Channels",
    icon: Lock,
    description: "Invite-only channels",
  },
  {
    value: "direct",
    label: "Direct Messages",
    icon: MessageCircle,
    description: "One-on-one conversations",
  },
  {
    value: "group",
    label: "Group DMs",
    icon: Users,
    description: "Multi-person private chats",
  },
] as const;

type ChannelType = "public" | "private" | "direct" | "group";

// ============================================================================
// Component
// ============================================================================

export function CommandChannels({
  channels = {},
  onChange,
}: CommandChannelsProps) {
  const [newAllowedChannel, setNewAllowedChannel] = useState("");
  const [newBlockedChannel, setNewBlockedChannel] = useState("");

  const allowedTypes = channels.allowedTypes || [
    "public",
    "private",
    "direct",
    "group",
  ];

  const handleToggleType = (type: ChannelType) => {
    if (allowedTypes.includes(type)) {
      // Remove type
      const newTypes = allowedTypes.filter((t) => t !== type);
      if (newTypes.length > 0) {
        onChange({ ...channels, allowedTypes: newTypes });
      }
    } else {
      // Add type
      onChange({ ...channels, allowedTypes: [...allowedTypes, type] });
    }
  };

  const handleAddAllowedChannel = () => {
    if (!newAllowedChannel.trim()) return;
    const current = channels.allowedChannels || [];
    if (!current.includes(newAllowedChannel.trim())) {
      onChange({
        ...channels,
        allowedChannels: [...current, newAllowedChannel.trim()],
      });
    }
    setNewAllowedChannel("");
  };

  const handleRemoveAllowedChannel = (channel: string) => {
    const current = channels.allowedChannels || [];
    onChange({
      ...channels,
      allowedChannels: current.filter((c) => c !== channel),
    });
  };

  const handleAddBlockedChannel = () => {
    if (!newBlockedChannel.trim()) return;
    const current = channels.blockedChannels || [];
    if (!current.includes(newBlockedChannel.trim())) {
      onChange({
        ...channels,
        blockedChannels: [...current, newBlockedChannel.trim()],
      });
    }
    setNewBlockedChannel("");
  };

  const handleRemoveBlockedChannel = (channel: string) => {
    const current = channels.blockedChannels || [];
    onChange({
      ...channels,
      blockedChannels: current.filter((c) => c !== channel),
    });
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Channel Settings</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Control where this command can be used.
        </p>
      </div>

      {/* Channel Types */}
      <div className="space-y-3">
        <Label>Allowed Channel Types</Label>
        <p className="text-xs text-muted-foreground">
          Select which types of channels this command can be used in
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {channelTypes.map((type) => {
            const checkboxId = `channel-type-${type.value}`;
            return (
              <label
                key={type.value}
                htmlFor={checkboxId}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  allowedTypes.includes(type.value as ChannelType)
                    ? "bg-primary/5 border-primary"
                    : "hover:bg-muted/50",
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={allowedTypes.includes(type.value as ChannelType)}
                  onCheckedChange={() =>
                    handleToggleType(type.value as ChannelType)
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
        {allowedTypes.length === 0 && (
          <p className="text-sm text-destructive">
            At least one channel type must be selected
          </p>
        )}
      </div>

      {/* Thread Support */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Allow in Threads
          </Label>
          <p className="text-xs text-muted-foreground">
            Enable this to let users use the command in message threads
          </p>
        </div>
        <Switch
          checked={channels.allowInThreads ?? true}
          onCheckedChange={(checked) =>
            onChange({ ...channels, allowInThreads: checked })
          }
        />
      </div>

      {/* Specific Allowed Channels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Allowed Channels (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              If set, the command will ONLY work in these specific channels
            </p>
          </div>
          <Badge variant="outline">
            {channels.allowedChannels?.length || 0}
          </Badge>
        </div>

        {channels.allowedChannels && channels.allowedChannels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {channels.allowedChannels.map((channel) => (
              <Badge key={channel} variant="secondary" className="gap-1">
                <Hash className="h-3 w-3" />
                {channel}
                <button
                  onClick={() => handleRemoveAllowedChannel(channel)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={newAllowedChannel}
              onChange={(e) => setNewAllowedChannel(e.target.value)}
              placeholder="channel-name or ID"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddAllowedChannel();
                }
              }}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddAllowedChannel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Blocked Channels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Blocked Channels</Label>
            <p className="text-xs text-muted-foreground">
              The command will NOT work in these specific channels
            </p>
          </div>
          <Badge variant="outline">
            {channels.blockedChannels?.length || 0}
          </Badge>
        </div>

        {channels.blockedChannels && channels.blockedChannels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {channels.blockedChannels.map((channel) => (
              <Badge key={channel} variant="destructive" className="gap-1">
                <Hash className="h-3 w-3" />
                {channel}
                <button
                  onClick={() => handleRemoveBlockedChannel(channel)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={newBlockedChannel}
              onChange={(e) => setNewBlockedChannel(e.target.value)}
              placeholder="channel-name or ID"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddBlockedChannel();
                }
              }}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddBlockedChannel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Channel Summary</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>
            - Works in:{" "}
            {allowedTypes
              .map((t) => channelTypes.find((ct) => ct.value === t)?.label)
              .join(", ")}
          </li>
          <li>
            - Threads:{" "}
            {(channels.allowInThreads ?? true) ? "Allowed" : "Not allowed"}
          </li>
          {channels.allowedChannels && channels.allowedChannels.length > 0 && (
            <li>
              - Limited to {channels.allowedChannels.length} specific channel(s)
            </li>
          )}
          {channels.blockedChannels && channels.blockedChannels.length > 0 && (
            <li>- Blocked in {channels.blockedChannels.length} channel(s)</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default CommandChannels;
