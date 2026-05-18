"use client";

/**
 * CreateInviteModal Component - Create channel or workspace invite links
 *
 * Modal for creating invite links with expiration time, max uses,
 * and instant link/QR code generation.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Link2,
  Clock,
  Users,
  Hash,
  Globe,
  Loader2,
  Check,
  Copy,
  QrCode as QrCodeIcon,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useInvite,
  EXPIRATION_OPTIONS,
  MAX_USES_OPTIONS,
  type CreateInviteOptions,
  type InviteType,
} from "@/lib/invite";
import { InviteLinkDisplay } from "./invite-link-display";
import { QRCode } from "./qr-code";

// ============================================================================
// Types
// ============================================================================

export interface CreateInviteModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Type of invite to create */
  type?: InviteType;
  /** Channel ID (required for channel invites) */
  channelId?: string;
  /** Channel name (for display) */
  channelName?: string;
  /** Channel is private */
  channelIsPrivate?: boolean;
  /** Called after invite is created */
  onInviteCreated?: (code: string, link: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CreateInviteModal({
  open,
  onOpenChange,
  type = "channel",
  channelId,
  channelName,
  channelIsPrivate = false,
  onInviteCreated,
}: CreateInviteModalProps) {
  // Form state
  const [expirationOption, setExpirationOption] = useState("7d");
  const [maxUsesOption, setMaxUsesOption] = useState<string>("none");
  const [activeTab, setActiveTab] = useState<"settings" | "link">("settings");

  // Hook
  const {
    createInvite,
    isCreating,
    createdInvite,
    createError,
    clearCreatedInvite,
    copyInviteLink,
  } = useInvite({
    onCreateSuccess: (invite) => {
      setActiveTab("link");
      onInviteCreated?.(invite.code, invite.link);
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setExpirationOption("7d");
      setMaxUsesOption("none");
      setActiveTab("settings");
      clearCreatedInvite();
    }
  }, [open, clearCreatedInvite]);

  // Parse max uses value
  const getMaxUsesValue = useCallback((option: string): number | null => {
    if (option === "none") return null;
    const preset = MAX_USES_OPTIONS.find((o) => o.value?.toString() === option);
    return preset?.value ?? null;
  }, []);

  // Handle create
  const handleCreate = useCallback(async () => {
    const options: CreateInviteOptions = {
      type,
      channelId: type === "channel" ? channelId : null,
      channelName,
      expirationOption,
      maxUses: getMaxUsesValue(maxUsesOption),
    };

    await createInvite(options);
  }, [
    type,
    channelId,
    channelName,
    expirationOption,
    maxUsesOption,
    createInvite,
    getMaxUsesValue,
  ]);

  // Handle copy
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    if (createdInvite) {
      const success = await copyInviteLink(createdInvite.code);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [createdInvite, copyInviteLink]);

  // Get expiration label
  const getExpirationLabel = useCallback((value: string) => {
    return EXPIRATION_OPTIONS.find((o) => o.value === value)?.label || value;
  }, []);

  // Get max uses label
  const getMaxUsesLabel = useCallback((value: string) => {
    if (value === "none") return "No limit";
    const preset = MAX_USES_OPTIONS.find((o) => o.value?.toString() === value);
    return preset?.label || value;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-muted-foreground" />
            Create Invite Link
          </DialogTitle>
          <DialogDescription>
            {type === "channel" ? (
              <>
                Create an invite link for{" "}
                <span className="font-medium">
                  {channelIsPrivate ? (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      {channelName || "this channel"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      {channelName || "this channel"}
                    </span>
                  )}
                </span>
              </>
            ) : (
              "Create an invite link to your workspace"
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "settings" | "link")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" disabled={!!createdInvite}>
              Settings
            </TabsTrigger>
            <TabsTrigger value="link" disabled={!createdInvite}>
              Invite Link
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 pt-4">
            {/* Expiration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Expire after</Label>
              </div>
              <Select
                value={expirationOption}
                onValueChange={setExpirationOption}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The invite link will stop working after this time
              </p>
            </div>

            {/* Max Uses */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label>Maximum uses</Label>
              </div>
              <Select
                value={maxUsesOption}
                onValueChange={setMaxUsesOption}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select max uses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No limit</SelectItem>
                  {MAX_USES_OPTIONS.filter((o) => o.value !== null).map(
                    (option) => (
                      <SelectItem
                        key={option.value!.toString()}
                        value={option.value!.toString()}
                      >
                        {option.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of times this link can be used before it expires
              </p>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 space-y-2 rounded-xl p-4">
              <p className="text-sm font-medium">Invite Summary</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <Clock className="mr-1 h-3 w-3" />
                  {getExpirationLabel(expirationOption)}
                </Badge>
                <Badge variant="secondary">
                  <Users className="mr-1 h-3 w-3" />
                  {getMaxUsesLabel(maxUsesOption)}
                </Badge>
                {type === "channel" && (
                  <Badge variant="secondary">
                    <Hash className="mr-1 h-3 w-3" />
                    {channelName || "Channel"}
                  </Badge>
                )}
                {type === "workspace" && (
                  <Badge variant="secondary">
                    <Globe className="mr-1 h-3 w-3" />
                    Workspace
                  </Badge>
                )}
              </div>
            </div>

            {/* Error */}
            {createError && (
              <div className="bg-destructive/10 border-destructive/20 flex items-start gap-3 rounded-xl border p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Failed to create invite
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {createError}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-6 pt-4">
            {createdInvite && (
              <>
                {/* Success Message */}
                <div className="flex items-start gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-600">
                      Invite link created!
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Share this link with others to invite them
                    </p>
                  </div>
                </div>

                {/* Link Display */}
                <InviteLinkDisplay
                  code={createdInvite.code}
                  invite={{
                    id: createdInvite.id,
                    code: createdInvite.code,
                    type: createdInvite.type,
                    channelId: createdInvite.channelId,
                    channelName: createdInvite.channelName,
                    channelSlug: null,
                    channelDescription: null,
                    channelIsPrivate: false,
                    channelMembersCount: 0,
                    workspaceName: null,
                    creatorName: "",
                    creatorAvatarUrl: null,
                    maxUses: createdInvite.maxUses,
                    useCount: 0,
                    expiresAt: createdInvite.expiresAt,
                    isActive: true,
                    createdAt: createdInvite.createdAt,
                  }}
                  showQRCode
                  variant="card"
                />
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          {activeTab === "settings" && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Generate Link
                  </>
                )}
              </Button>
            </>
          )}
          {activeTab === "link" && createdInvite && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab("settings");
                  clearCreatedInvite();
                }}
              >
                Create Another
              </Button>
              <Button onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateInviteModal;
