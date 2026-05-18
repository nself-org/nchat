"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Hash,
  Lock,
  Trash2,
  Archive,
  Bell,
  BellOff,
  Users,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useChannelStore, type Channel } from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";
import { useAuth } from "@/contexts/auth-context";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

interface ChannelSettingsModalProps {
  open: boolean;
  channelId: string;
  onOpenChange: (open: boolean) => void;
}

type NotificationSetting = "all" | "mentions" | "none";
type PostPermission = "everyone" | "admins" | "owner";

// ============================================================================
// Component
// ============================================================================

export function ChannelSettingsModal({
  open,
  channelId,
  onOpenChange,
}: ChannelSettingsModalProps) {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  const { channels, updateChannel, archiveChannel, removeChannel } =
    useChannelStore();
  const channel = channels.get(channelId);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [notifications, setNotifications] =
    useState<NotificationSetting>("all");
  const [postPermission, setPostPermission] =
    useState<PostPermission>("everyone");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Initialize form when channel changes
  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description || "");
      setTopic(channel.topic || "");
      setIsPrivate(channel.type === "private");
    }
  }, [channel]);

  const handleSave = async () => {
    if (!channel) return;

    setIsLoading(true);
    try {
      updateChannel(channelId, {
        name: name.trim(),
        description: description.trim() || null,
        topic: topic.trim() || null,
        type: isPrivate ? "private" : "public",
      });
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to update channel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    archiveChannel(channelId);
    onOpenChange(false);
  };

  const handleDelete = () => {
    removeChannel(channelId);
    onOpenChange(false);
  };

  if (!channel) {
    return null;
  }

  const slugPreview = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPrivate ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Hash className="h-5 w-5 text-muted-foreground" />
            )}
            Channel Settings
          </DialogTitle>
          <DialogDescription>
            Manage settings for #{channel.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-4 space-y-4">
            {/* Channel Name */}
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel name</Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., announcements"
                maxLength={80}
              />
              {name && (
                <p className="text-xs text-muted-foreground">
                  URL: /chat/channel/{slugPreview || "channel-name"}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="channel-description">Description</Label>
              <Textarea
                id="channel-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this channel about?"
                rows={2}
                maxLength={250}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/250 characters
              </p>
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="channel-topic">Topic</Label>
              <Input
                id="channel-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Current topic of discussion"
                maxLength={250}
              />
              <p className="text-xs text-muted-foreground">
                Shown in the channel header
              </p>
            </div>

            {/* Privacy */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Private channel</Label>
                <p className="text-xs text-muted-foreground">
                  Only invited members can view and join
                </p>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
                disabled={channel.isDefault}
              />
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Notification preference</Label>
              <Select
                value={notifications}
                onValueChange={(v) =>
                  setNotifications(v as NotificationSetting)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      All messages
                    </div>
                  </SelectItem>
                  <SelectItem value="mentions">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Mentions only
                    </div>
                  </SelectItem>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <BellOff className="h-4 w-4" />
                      Nothing
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {notifications === "all" &&
                  "You will be notified of all new messages"}
                {notifications === "mentions" &&
                  "You will only be notified when mentioned"}
                {notifications === "none" &&
                  "You will not receive any notifications"}
              </p>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="mt-4 space-y-4">
            {isAdmin && (
              <>
                <div className="space-y-2">
                  <Label>Who can post messages</Label>
                  <Select
                    value={postPermission}
                    onValueChange={(v) =>
                      setPostPermission(v as PostPermission)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Everyone
                        </div>
                      </SelectItem>
                      <SelectItem value="admins">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admins only
                        </div>
                      </SelectItem>
                      <SelectItem value="owner">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Owner only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 border-t pt-4">
                  {/* Archive Channel */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive channel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive channel?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Members will no longer be able to send messages in #
                          {channel.name}. The channel and its messages will
                          still be visible. You can unarchive it later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Delete Channel (Owner only) */}
                  {isOwner && !channel.isDefault && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="hover:bg-destructive/10 w-full justify-start text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete channel
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete channel?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete #{channel.name} and all
                            of its messages. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                          >
                            Delete permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </>
            )}

            {!isAdmin && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Only admins can manage channel permissions
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

ChannelSettingsModal.displayName = "ChannelSettingsModal";
