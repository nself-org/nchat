/**
 * CommunitySettings - WhatsApp community settings modal
 *
 * Admin controls for community management:
 * - Edit community info (name, description, icon)
 * - Group management permissions
 * - Member invite settings
 * - Approval requirements
 * - Events toggle
 * - Delete community
 */

"use client";

import * as React from "react";
import { useState } from "react";
import {
  Settings,
  Upload,
  Save,
  Trash2,
  AlertTriangle,
  Users,
  UserPlus,
  Shield,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Community } from "@/types/advanced-channels";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface CommunitySettingsProps {
  community: Community;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (updates: Partial<Community>) => Promise<void>;
  onDelete?: () => Promise<void>;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function CommunitySettings({
  community,
  open = false,
  onOpenChange,
  onSave,
  onDelete,
  className,
}: CommunitySettingsProps) {
  const [updates, setUpdates] = useState<Partial<Community>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const mergedCommunity = { ...community, ...updates };

  const handleChange = (newUpdates: Partial<Community>) => {
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
      logger.error("Failed to save community settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete();
      setShowDeleteDialog(false);
      onOpenChange?.(false);
    } catch (error) {
      logger.error("Failed to delete community:", error);
    }
  };

  const hasChanges = Object.keys(updates).length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("max-w-2xl", className)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Community Settings
            </DialogTitle>
            <DialogDescription>
              Manage your community settings and preferences
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[600px] pr-4">
            <div className="space-y-6">
              {/* Community Icon */}
              <div className="space-y-2">
                <Label>Community Icon</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={mergedCommunity.iconUrl}
                      alt={mergedCommunity.name}
                    />
                    <AvatarFallback className="text-xl font-bold">
                      {mergedCommunity.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Icon
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 512x512px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>

              {/* Community Name */}
              <div className="space-y-2">
                <Label htmlFor="community-name">Community Name</Label>
                <Input
                  id="community-name"
                  value={mergedCommunity.name}
                  onChange={(e) => handleChange({ name: e.target.value })}
                  placeholder="Enter community name"
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={mergedCommunity.description || ""}
                  onChange={(e) =>
                    handleChange({ description: e.target.value })
                  }
                  placeholder="Describe your community"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {mergedCommunity.description?.length || 0}/500 characters
                </p>
              </div>

              <Separator />

              {/* Permissions Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Permissions</h3>
                </div>

                {/* Who can add groups */}
                <div className="space-y-2">
                  <Label htmlFor="add-groups">Who can add groups</Label>
                  <Select
                    value={mergedCommunity.addGroupsPermission}
                    onValueChange={(value: "admin" | "member") =>
                      handleChange({ addGroupsPermission: value })
                    }
                  >
                    <SelectTrigger id="add-groups">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admins only</SelectItem>
                      <SelectItem value="member">All members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Members can invite */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="members-invite">Members can invite</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allow all members to invite new people
                    </p>
                  </div>
                  <Switch
                    id="members-invite"
                    checked={mergedCommunity.membersCanInvite}
                    onCheckedChange={(checked) =>
                      handleChange({ membersCanInvite: checked })
                    }
                  />
                </div>

                {/* Approval required */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="approval-required">
                        Require admin approval
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      New members must be approved by an admin
                    </p>
                  </div>
                  <Switch
                    id="approval-required"
                    checked={mergedCommunity.approvalRequired}
                    onCheckedChange={(checked) =>
                      handleChange({ approvalRequired: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Features Section */}
              <div className="space-y-4">
                <h3 className="font-semibold">Features</h3>

                {/* Events */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="events-enabled">Community events</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allow creating and managing community events
                    </p>
                  </div>
                  <Switch
                    id="events-enabled"
                    checked={mergedCommunity.eventsEnabled}
                    onCheckedChange={(checked) =>
                      handleChange({ eventsEnabled: checked })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Limits Section */}
              <div className="space-y-4">
                <h3 className="font-semibold">Limits</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Max groups */}
                  <div className="space-y-2">
                    <Label htmlFor="max-groups">Maximum groups</Label>
                    <Input
                      id="max-groups"
                      type="number"
                      min={1}
                      max={100}
                      value={mergedCommunity.maxGroups}
                      onChange={(e) =>
                        handleChange({
                          maxGroups: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {community.groupCount} groups
                    </p>
                  </div>

                  {/* Max members */}
                  <div className="space-y-2">
                    <Label htmlFor="max-members">Maximum members</Label>
                    <Input
                      id="max-members"
                      type="number"
                      min={1}
                      max={5000}
                      value={mergedCommunity.maxMembers}
                      onChange={(e) =>
                        handleChange({
                          maxMembers: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {community.totalMemberCount} members
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Danger Zone */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <h3 className="font-semibold">Danger Zone</h3>
                </div>

                <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label className="text-destructive">Delete Community</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this community and all associated
                      groups. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="mt-2"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Community
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{community.name}</strong> and
              all associated groups. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Delete Community
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CommunitySettings;
