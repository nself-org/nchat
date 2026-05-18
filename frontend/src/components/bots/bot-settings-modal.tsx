"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  CheckCircle,
  ExternalLink,
  Hash,
  Shield,
  Trash2,
  AlertTriangle,
  Loader2,
  Globe,
  HelpCircle,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BotPermissions, BotPermissionsCompact } from "./bot-permissions";
import type {
  Bot as BotType,
  BotPermission,
  BotInstallation,
} from "@/graphql/bots";

// ============================================================================
// TYPES
// ============================================================================

export interface BotSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: BotType | null;
  installations?: BotInstallation[];
  onUpdatePermissions?: (
    botId: string,
    channelId: string,
    permissions: BotPermission[],
  ) => Promise<void>;
  onRemoveBot?: (botId: string, channelId?: string) => Promise<void>;
  onViewProfile?: (bot: BotType) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BotSettingsModal({
  open,
  onOpenChange,
  bot,
  installations = [],
  onUpdatePermissions,
  onRemoveBot,
  onViewProfile,
}: BotSettingsModalProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [editedPermissions, setEditedPermissions] = useState<
    Record<string, BotPermission[]>
  >({});
  const [saving, setSaving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [channelToRemove, setChannelToRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Initialize edited permissions from installations
  useEffect(() => {
    if (installations.length > 0) {
      const perms: Record<string, BotPermission[]> = {};
      for (const inst of installations) {
        perms[inst.channelId] = [...inst.permissions];
      }
      setEditedPermissions(perms);
    }
  }, [installations]);

  const handlePermissionChange = (
    channelId: string,
    permissions: BotPermission[],
  ) => {
    setEditedPermissions((prev) => ({
      ...prev,
      [channelId]: permissions,
    }));
  };

  const hasPermissionChanges = (channelId: string): boolean => {
    const original = installations.find((i) => i.channelId === channelId);
    const edited = editedPermissions[channelId];
    if (!original || !edited) return false;

    if (original.permissions.length !== edited.length) return true;
    return !original.permissions.every((p) => edited.includes(p));
  };

  const handleSavePermissions = async (channelId: string) => {
    if (!bot || !onUpdatePermissions) return;

    setSaving(true);
    try {
      await onUpdatePermissions(
        bot.id,
        channelId,
        editedPermissions[channelId],
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClick = (channelId: string | null) => {
    setChannelToRemove(channelId);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!bot || !onRemoveBot) return;

    setRemoving(true);
    try {
      await onRemoveBot(bot.id, channelToRemove ?? undefined);
      if (!channelToRemove) {
        onOpenChange(false);
      }
    } finally {
      setRemoving(false);
      setRemoveDialogOpen(false);
      setChannelToRemove(null);
    }
  };

  if (!bot) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={bot.avatarUrl} alt={bot.name} />
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-7 w-7 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl">{bot.name}</DialogTitle>
                  {bot.verified && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
                <DialogDescription className="mt-1">
                  {bot.description}
                </DialogDescription>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">{bot.status}</Badge>
                  {bot.category && (
                    <Badge variant="outline">{bot.category}</Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="channels">
                Channels ({installations.length})
              </TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-4">
              <div className="grid gap-4">
                {bot.website && (
                  <InfoRow
                    icon={Globe}
                    label="Website"
                    value={
                      <a
                        href={bot.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {new URL(bot.website).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    }
                  />
                )}
                {bot.supportUrl && (
                  <InfoRow
                    icon={HelpCircle}
                    label="Support"
                    value={
                      <a
                        href={bot.supportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        Get help
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    }
                  />
                )}
                {bot.privacyPolicyUrl && (
                  <InfoRow
                    icon={FileText}
                    label="Privacy Policy"
                    value={
                      <a
                        href={bot.privacyPolicyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        View policy
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    }
                  />
                )}
                {bot.owner && (
                  <InfoRow
                    icon={Shield}
                    label="Developer"
                    value={bot.owner.displayName}
                  />
                )}
              </div>

              {onViewProfile && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onOpenChange(false);
                    onViewProfile(bot);
                  }}
                >
                  View Full Profile
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}
            </TabsContent>

            <TabsContent value="channels" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {installations.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      This bot is not installed in any channels
                    </div>
                  ) : (
                    installations.map((installation) => (
                      <div
                        key={installation.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {installation.channel?.name || "Unknown channel"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            handleRemoveClick(installation.channelId)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="permissions" className="mt-4">
              {installations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Install the bot in a channel to manage permissions
                </div>
              ) : installations.length === 1 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {installations[0].channel?.name}
                      </span>
                    </div>
                    {hasPermissionChanges(installations[0].channelId) && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleSavePermissions(installations[0].channelId)
                        }
                        disabled={saving}
                      >
                        {saving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[250px] pr-4">
                    <BotPermissions
                      permissions={
                        editedPermissions[installations[0].channelId] ||
                        installations[0].permissions
                      }
                      onChange={(perms) =>
                        handlePermissionChange(
                          installations[0].channelId,
                          perms,
                        )
                      }
                      showDescriptions
                    />
                  </ScrollArea>
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {installations.map((installation) => (
                      <div
                        key={installation.id}
                        className="space-y-3 rounded-lg border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {installation.channel?.name || "Unknown"}
                            </span>
                          </div>
                          {hasPermissionChanges(installation.channelId) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleSavePermissions(installation.channelId)
                              }
                              disabled={saving}
                            >
                              {saving && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Save
                            </Button>
                          )}
                        </div>
                        <BotPermissionsCompact
                          permissions={
                            editedPermissions[installation.channelId] ||
                            installation.permissions
                          }
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          <Separator className="my-4" />

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => handleRemoveClick(null)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove from Workspace
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Bot
            </AlertDialogTitle>
            <AlertDialogDescription>
              {channelToRemove ? (
                <>
                  Are you sure you want to remove <strong>{bot.name}</strong>{" "}
                  from this channel? The bot will no longer be able to access
                  messages or send notifications in this channel.
                </>
              ) : (
                <>
                  Are you sure you want to remove <strong>{bot.name}</strong>{" "}
                  from your entire workspace? This will remove it from all{" "}
                  {installations.length} channel
                  {installations.length !== 1 ? "s" : ""} where it&apos;s
                  installed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
              disabled={removing}
            >
              {removing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// INFO ROW COMPONENT
// ============================================================================

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
