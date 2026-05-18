"use client";

import * as React from "react";
import { useState } from "react";
import {
  Settings,
  Hash,
  Lock,
  Trash2,
  Archive,
  Share2,
  Bell,
  Shield,
  Users,
  Palette,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChannelPermissions } from "./ChannelPermissions";
import { ChannelMembers } from "./ChannelMembers";
import { EncryptionBadge } from "@/components/security/encryption-badge";
import type { Channel, ChannelType } from "@/stores/channel-store";
import { DEFAULT_CATEGORIES } from "@/lib/channels/channel-categories";
import { CATEGORY_COLORS } from "@/lib/channels/channel-categories";

// ============================================================================
// Types
// ============================================================================

export interface ChannelSettingsProps {
  channel: Channel;
  isAdmin?: boolean;
  onSave?: (updates: Partial<Channel>) => Promise<void>;
  onArchive?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onLeave?: () => Promise<void>;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelSettings({
  channel,
  isAdmin = false,
  onSave,
  onArchive,
  onDelete,
  onLeave,
  className,
}: ChannelSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: channel.name,
    description: channel.description || "",
    topic: channel.topic || "",
    type: channel.type,
    categoryId: channel.categoryId || "",
    color: channel.color || CATEGORY_COLORS[0],
    isDefault: channel.isDefault,
    isEncrypted:
      (channel as Channel & { isEncrypted?: boolean }).isEncrypted ?? false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave?.({
        name: formData.name,
        description: formData.description || null,
        topic: formData.topic || null,
        type: formData.type,
        categoryId: formData.categoryId || null,
        color: formData.color,
        isDefault: formData.isDefault,
        isEncrypted: formData.isEncrypted,
      } as Partial<Channel>);
    } finally {
      setIsSaving(false);
    }
  };

  const channelIsEncrypted =
    (channel as Channel & { isEncrypted?: boolean }).isEncrypted ?? false;

  const hasChanges =
    formData.name !== channel.name ||
    formData.description !== (channel.description || "") ||
    formData.topic !== (channel.topic || "") ||
    formData.type !== channel.type ||
    formData.categoryId !== (channel.categoryId || "") ||
    formData.color !== (channel.color || CATEGORY_COLORS[0]) ||
    formData.isDefault !== channel.isDefault ||
    formData.isEncrypted !== channelIsEncrypted;

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Shield className="mr-2 h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="danger">
            <Trash2 className="mr-2 h-4 w-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Information</CardTitle>
              <CardDescription>
                Basic information about this channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#</span>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="channel-name"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  name="topic"
                  value={formData.topic}
                  onChange={handleInputChange}
                  placeholder="What is this channel about?"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  A short topic shown in the channel header
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what this channel is for..."
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                How this channel is organized in the sidebar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Channel Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: value as ChannelType,
                    }))
                  }
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Public
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Private
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, categoryId: value }))
                  }
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {DEFAULT_CATEGORIES.filter((c) => c.id !== "archived").map(
                      (category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Channel Color</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        isAdmin && setFormData((prev) => ({ ...prev, color }))
                      }
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all",
                        formData.color === color
                          ? "scale-110 border-foreground"
                          : "border-transparent",
                        !isAdmin && "cursor-not-allowed opacity-50",
                      )}
                      style={{ backgroundColor: color }}
                      disabled={!isAdmin}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Default Channel</Label>
                  <p className="text-xs text-muted-foreground">
                    New members will automatically join this channel
                  </p>
                </div>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isDefault: checked }))
                  }
                  disabled={!isAdmin}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>End-to-End Encryption</Label>
                    {formData.isEncrypted && (
                      <EncryptionBadge
                        level="encrypted"
                        size="sm"
                        showTooltip={false}
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encrypt all messages in this channel. Members must exchange
                    keys before reading messages.
                  </p>
                </div>
                <Switch
                  checked={formData.isEncrypted}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isEncrypted: checked }))
                  }
                  disabled={!isAdmin}
                />
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Permissions */}
        <TabsContent value="permissions" className="pt-4">
          <ChannelPermissions channel={channel} isAdmin={isAdmin} />
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="pt-4">
          <ChannelMembers channel={channel} isAdmin={isAdmin} />
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger" className="space-y-6 pt-4">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect this channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Leave Channel */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Leave Channel</p>
                  <p className="text-sm text-muted-foreground">
                    Remove yourself from this channel
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Leave</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave channel?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to leave #{channel.name}? You can
                        rejoin at any time.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onLeave}>
                        Leave
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {isAdmin && (
                <>
                  {/* Archive Channel */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Archive Channel</p>
                      <p className="text-sm text-muted-foreground">
                        Archive this channel. Members can still read messages.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive channel?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will archive #{channel.name}. No one will be
                            able to send new messages, but the history will be
                            preserved.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={onArchive}>
                            Archive
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Delete Channel */}
                  <div className="border-destructive/50 flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-destructive">
                        Delete Channel
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this channel and all messages
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete channel?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete #{channel.name} and all of its messages.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={onDelete}
                            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                          >
                            Delete Channel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

ChannelSettings.displayName = "ChannelSettings";
