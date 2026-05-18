/**
 * GuildSettingsModal - Discord-style server settings
 *
 * Comprehensive server/guild configuration with tabs for:
 * - Overview (name, icon, banner)
 * - Roles and permissions
 * - Channels
 * - Moderation
 * - Invites
 * - Boost status
 * - Emoji and stickers
 */

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Settings,
  Shield,
  Hash,
  UserPlus,
  Zap,
  Smile,
  AlertTriangle,
  Upload,
  Save,
  X,
  Crown,
  Users,
  Lock,
  Eye,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Workspace } from "@/types/advanced-channels";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface GuildSettingsModalProps {
  workspace: Workspace;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (updates: Partial<Workspace>) => Promise<void>;
  className?: string;
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({
  workspace,
  onChange,
}: {
  workspace: Workspace;
  onChange: (updates: Partial<Workspace>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Server Icon */}
      <div className="space-y-2">
        <Label>Server Icon</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={workspace.iconUrl} alt={workspace.name} />
            <AvatarFallback className="text-2xl font-bold">
              {workspace.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
            <p className="text-xs text-muted-foreground">
              Recommended: 512x512px, PNG or JPG
            </p>
          </div>
        </div>
      </div>

      {/* Server Name */}
      <div className="space-y-2">
        <Label htmlFor="server-name">Server Name</Label>
        <Input
          id="server-name"
          value={workspace.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Enter server name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={workspace.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Tell people what this server is about"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {workspace.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Server Banner */}
      <div className="space-y-2">
        <Label>Server Banner</Label>
        {workspace.bannerUrl ? (
          <div className="relative">
            <img
              src={workspace.bannerUrl}
              alt="Server banner"
              className="h-48 w-full rounded-lg object-cover"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => onChange({ bannerUrl: undefined })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload Banner
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Recommended: 1920x1080px, PNG or JPG
        </p>
      </div>

      {/* Vanity URL */}
      <div className="space-y-2">
        <Label htmlFor="vanity-url">Vanity URL</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">discord.gg/</span>
          <Input
            id="vanity-url"
            value={workspace.vanityUrl || ""}
            onChange={(e) => onChange({ vanityUrl: e.target.value })}
            placeholder="custom-url"
            className="flex-1"
          />
        </div>
        {workspace.boostTier < 3 && (
          <p className="text-xs text-amber-500">Requires Server Boost Tier 3</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Moderation Tab
// ============================================================================

function ModerationTab({
  workspace,
  onChange,
}: {
  workspace: Workspace;
  onChange: (updates: Partial<Workspace>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Verification Level */}
      <div className="space-y-2">
        <Label htmlFor="verification">Verification Level</Label>
        <Select
          value={workspace.verificationLevel.toString()}
          onValueChange={(value) =>
            onChange({ verificationLevel: parseInt(value) })
          }
        >
          <SelectTrigger id="verification">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">None - Unrestricted</SelectItem>
            <SelectItem value="1">Low - Verified email required</SelectItem>
            <SelectItem value="2">
              Medium - Registered for 5+ minutes
            </SelectItem>
            <SelectItem value="3">High - Member for 10+ minutes</SelectItem>
            <SelectItem value="4">Highest - Verified phone required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Explicit Content Filter */}
      <div className="space-y-2">
        <Label htmlFor="content-filter">Explicit Content Filter</Label>
        <Select
          value={workspace.explicitContentFilter.toString()}
          onValueChange={(value) =>
            onChange({ explicitContentFilter: parseInt(value) })
          }
        >
          <SelectTrigger id="content-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Don't scan any media</SelectItem>
            <SelectItem value="1">
              Scan media from members without roles
            </SelectItem>
            <SelectItem value="2">Scan media from all members</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* System Messages Channel */}
      <div className="space-y-2">
        <Label htmlFor="system-channel">System Messages Channel</Label>
        <Select
          value={workspace.systemChannelId || "none"}
          onValueChange={(value) =>
            onChange({ systemChannelId: value === "none" ? undefined : value })
          }
        >
          <SelectTrigger id="system-channel">
            <SelectValue placeholder="Select a channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {/* In production, populate with actual channels */}
            <SelectItem value="general">general</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Send welcome messages and boost notifications here
        </p>
      </div>

      {/* Rules Channel */}
      <div className="space-y-2">
        <Label htmlFor="rules-channel">Rules Channel</Label>
        <Select
          value={workspace.rulesChannelId || "none"}
          onValueChange={(value) =>
            onChange({ rulesChannelId: value === "none" ? undefined : value })
          }
        >
          <SelectTrigger id="rules-channel">
            <SelectValue placeholder="Select a channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="rules">rules</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          New members must accept rules before participating
        </p>
      </div>

      {/* Discovery */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="discoverable">Enable Server Discovery</Label>
          <p className="text-sm text-muted-foreground">
            Show this server in Server Discovery
          </p>
        </div>
        <Switch
          id="discoverable"
          checked={workspace.isDiscoverable}
          onCheckedChange={(checked) => onChange({ isDiscoverable: checked })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Boost Status Tab
// ============================================================================

function BoostTab({ workspace }: { workspace: Workspace }) {
  const boostLevels = [
    {
      tier: 0,
      boosts: 0,
      perks: ["128 Kbps Audio", "50 MB Upload Limit", "50 Emoji Slots"],
    },
    {
      tier: 1,
      boosts: 2,
      perks: [
        "128 Kbps Audio",
        "+ Animated Server Icon",
        "+ Custom Server Invite Background",
        "+ 100 Emoji Slots (50 extra)",
      ],
    },
    {
      tier: 2,
      boosts: 7,
      perks: [
        "256 Kbps Audio",
        "+ Server Banner",
        "+ 150 Emoji Slots (50 extra)",
        "+ 50 MB Upload Limit for all members",
      ],
    },
    {
      tier: 3,
      boosts: 14,
      perks: [
        "384 Kbps Audio",
        "+ Custom Server Invite URL",
        "+ 250 Emoji Slots (100 extra)",
        "+ 100 MB Upload Limit for all members",
      ],
    },
  ];

  const currentLevel = boostLevels[workspace.boostTier];
  const nextLevel = boostLevels[Math.min(workspace.boostTier + 1, 3)];
  const progress =
    workspace.boostTier < 3
      ? (workspace.boostCount / nextLevel.boosts) * 100
      : 100;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="space-y-4 rounded-lg border bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500">
              <Zap className="h-6 w-6 fill-white text-white" />
            </div>
            <div>
              <h3 className="font-semibold">
                {workspace.boostTier === 0
                  ? "Not Boosted"
                  : `Tier ${workspace.boostTier}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {workspace.boostCount} Boosts
              </p>
            </div>
          </div>
          <Button variant="secondary" className="gap-2">
            <Zap className="h-4 w-4" />
            Boost This Server
          </Button>
        </div>

        {/* Progress to next tier */}
        {workspace.boostTier < 3 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progress to Tier {workspace.boostTier + 1}
              </span>
              <span className="font-medium">
                {workspace.boostCount} / {nextLevel.boosts}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Boost Perks */}
      <div className="space-y-3">
        <h4 className="font-semibold">Current Perks</h4>
        <div className="grid gap-2">
          {currentLevel.perks.map((perk, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border p-3"
            >
              <Zap className="h-4 w-4 text-pink-500" />
              <span className="text-sm">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Level Preview */}
      {workspace.boostTier < 3 && (
        <div className="space-y-3">
          <h4 className="font-semibold">
            Unlock with {nextLevel.boosts - workspace.boostCount} More Boosts
          </h4>
          <div className="grid gap-2">
            {nextLevel.perks.slice(currentLevel.perks.length).map((perk, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-dashed p-3 opacity-60"
              >
                <Lock className="h-4 w-4" />
                <span className="text-sm">{perk}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function GuildSettingsModal({
  workspace,
  open = false,
  onOpenChange,
  onSave,
  className,
}: GuildSettingsModalProps) {
  const [updates, setUpdates] = useState<Partial<Workspace>>({});
  const [isSaving, setIsSaving] = useState(false);

  const mergedWorkspace = { ...workspace, ...updates };

  const handleChange = (newUpdates: Partial<Workspace>) => {
    setUpdates((prev) => ({ ...prev, ...newUpdates }));
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(updates);
      setUpdates({});
      onOpenChange?.(false);
    } catch (error) {
      logger.error("Failed to save workspace settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(updates).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-4xl", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Server Settings
          </DialogTitle>
          <DialogDescription>
            Manage your server settings and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="boost">
              <Zap className="mr-2 h-4 w-4" />
              Boost Status
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] pr-4">
            <TabsContent value="overview" className="space-y-4">
              <OverviewTab
                workspace={mergedWorkspace}
                onChange={handleChange}
              />
            </TabsContent>

            <TabsContent value="moderation" className="space-y-4">
              <ModerationTab
                workspace={mergedWorkspace}
                onChange={handleChange}
              />
            </TabsContent>

            <TabsContent value="boost" className="space-y-4">
              <BoostTab workspace={mergedWorkspace} />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GuildSettingsModal;
