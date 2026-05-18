"use client";

import * as React from "react";
import { useState } from "react";
import {
  Shield,
  Users,
  MessageSquare,
  FileText,
  Heart,
  AtSign,
  Link2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelPermissionsProps {
  channel: Channel;
  isAdmin?: boolean;
  onSave?: (permissions: ChannelPermissionSettings) => Promise<void>;
  className?: string;
}

export interface ChannelPermissionSettings {
  whoCanPost: "everyone" | "members" | "admins";
  whoCanReact: "everyone" | "members" | "admins";
  whoCanThread: "everyone" | "members" | "admins";
  whoCanUpload: "everyone" | "members" | "admins";
  whoCanMention: "everyone" | "members" | "admins";
  whoCanInvite: "everyone" | "members" | "admins";
  allowGuests: boolean;
  slowMode: number | null;
  messageRetention: number | null;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelPermissions({
  channel,
  isAdmin = false,
  onSave,
  className,
}: ChannelPermissionsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<ChannelPermissionSettings>({
    whoCanPost: "everyone",
    whoCanReact: "everyone",
    whoCanThread: "everyone",
    whoCanUpload: "members",
    whoCanMention: "members",
    whoCanInvite: "admins",
    allowGuests: channel.type === "public",
    slowMode: null,
    messageRetention: null,
  });

  const handlePermissionChange = (
    key: keyof ChannelPermissionSettings,
    value: any,
  ) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave?.(permissions);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Posting Permissions
          </CardTitle>
          <CardDescription>
            Control who can send messages and interact in this channel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Who can post */}
          <PermissionRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="Who can send messages"
            description="Control who is allowed to post messages"
            value={permissions.whoCanPost}
            onChange={(v) => handlePermissionChange("whoCanPost", v)}
            disabled={!isAdmin}
          />

          {/* Who can react */}
          <PermissionRow
            icon={<Heart className="h-4 w-4" />}
            label="Who can add reactions"
            description="Control who can react to messages"
            value={permissions.whoCanReact}
            onChange={(v) => handlePermissionChange("whoCanReact", v)}
            disabled={!isAdmin}
          />

          {/* Who can thread */}
          <PermissionRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="Who can start threads"
            description="Control who can create threaded replies"
            value={permissions.whoCanThread}
            onChange={(v) => handlePermissionChange("whoCanThread", v)}
            disabled={!isAdmin}
          />

          {/* Who can upload */}
          <PermissionRow
            icon={<FileText className="h-4 w-4" />}
            label="Who can upload files"
            description="Control who can share files and images"
            value={permissions.whoCanUpload}
            onChange={(v) => handlePermissionChange("whoCanUpload", v)}
            disabled={!isAdmin}
          />

          {/* Who can mention */}
          <PermissionRow
            icon={<AtSign className="h-4 w-4" />}
            label="Who can use @channel/@here"
            description="Control who can notify the entire channel"
            value={permissions.whoCanMention}
            onChange={(v) => handlePermissionChange("whoCanMention", v)}
            disabled={!isAdmin}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membership
          </CardTitle>
          <CardDescription>
            Control who can join and invite others to this channel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Who can invite */}
          <PermissionRow
            icon={<Link2 className="h-4 w-4" />}
            label="Who can invite members"
            description="Control who can add new members to this channel"
            value={permissions.whoCanInvite}
            onChange={(v) => handlePermissionChange("whoCanInvite", v)}
            disabled={!isAdmin}
          />

          {/* Allow guests */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Allow guest access
              </Label>
              <p className="text-xs text-muted-foreground">
                Let users with guest role view this channel
              </p>
            </div>
            <Switch
              checked={permissions.allowGuests}
              onCheckedChange={(checked) =>
                handlePermissionChange("allowGuests", checked)
              }
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>
            Control message frequency and retention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slow mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Slow mode</Label>
              <p className="text-xs text-muted-foreground">
                Limit how often members can send messages
              </p>
            </div>
            <Select
              value={String(permissions.slowMode ?? "off")}
              onValueChange={(v) =>
                handlePermissionChange(
                  "slowMode",
                  v === "off" ? null : parseInt(v),
                )
              }
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message retention */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Message retention</Label>
              <p className="text-xs text-muted-foreground">
                Automatically delete messages after a period
              </p>
            </div>
            <Select
              value={String(permissions.messageRetention ?? "forever")}
              onValueChange={(v) =>
                handlePermissionChange(
                  "messageRetention",
                  v === "forever" ? null : parseInt(v),
                )
              }
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forever">Forever</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Permissions
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface PermissionRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: "everyone" | "members" | "admins";
  onChange: (value: "everyone" | "members" | "admins") => void;
  disabled?: boolean;
}

function PermissionRow({
  icon,
  label,
  description,
  value,
  onChange,
  disabled,
}: PermissionRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="everyone">Everyone</SelectItem>
          <SelectItem value="members">Members only</SelectItem>
          <SelectItem value="admins">Admins only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

ChannelPermissions.displayName = "ChannelPermissions";
