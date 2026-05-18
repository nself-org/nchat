"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Loader2,
  Upload,
  X,
  Copy,
  Check,
  Hash,
  AlertCircle,
  RefreshCw,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Webhook,
  WebhookStatus,
  UpdateWebhookFormData,
  copyWebhookUrl,
  getWebhookStatusColor,
} from "@/lib/webhooks";

// ============================================================================
// TYPES
// ============================================================================

export interface Channel {
  id: string;
  name: string;
  slug: string;
  type?: string;
  is_private?: boolean;
}

export interface WebhookSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: Webhook | null;
  channels: Channel[];
  onUpdate: (data: UpdateWebhookFormData) => Promise<Webhook | null>;
  onRegenerateUrl: (id: string) => Promise<Webhook | null>;
  onDelete: (id: string) => Promise<boolean>;
  isLoading?: boolean;
  error?: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WebhookSettingsModal({
  open,
  onOpenChange,
  webhook,
  channels,
  onUpdate,
  onRegenerateUrl,
  onDelete,
  isLoading = false,
  error = null,
}: WebhookSettingsModalProps) {
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<WebhookStatus>("active");
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with webhook data
  useEffect(() => {
    if (webhook) {
      setName(webhook.name);
      setChannelId(webhook.channel_id);
      setAvatarUrl(webhook.avatar_url || "");
      setAvatarPreview(webhook.avatar_url || null);
      setStatus(webhook.status);
      setHasChanges(false);
      setValidationError(null);
    }
  }, [webhook]);

  // Track changes
  useEffect(() => {
    if (webhook) {
      const changed =
        name !== webhook.name ||
        channelId !== webhook.channel_id ||
        avatarUrl !== (webhook.avatar_url || "") ||
        status !== webhook.status;
      setHasChanges(changed);
    }
  }, [webhook, name, channelId, avatarUrl, status]);

  const handleClose = useCallback(() => {
    if (!isLoading && !isRegenerating && !isDeleting) {
      onOpenChange(false);
    }
  }, [isLoading, isRegenerating, isDeleting, onOpenChange]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setValidationError("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setValidationError("Image must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarPreview(dataUrl);
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    setValidationError(null);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webhook) return;

    if (!name.trim()) {
      setValidationError("Please enter a webhook name");
      return;
    }

    if (!channelId) {
      setValidationError("Please select a target channel");
      return;
    }

    setValidationError(null);

    const result = await onUpdate({
      id: webhook.id,
      name: name.trim(),
      channelId,
      avatarUrl: avatarUrl || undefined,
      status,
    });

    if (result) {
      handleClose();
    }
  };

  const handleRegenerateUrl = async () => {
    if (!webhook) return;

    setIsRegenerating(true);
    await onRegenerateUrl(webhook.id);
    setIsRegenerating(false);
    setShowRegenerateConfirm(false);
  };

  const handleDelete = async () => {
    if (!webhook) return;

    setIsDeleting(true);
    const success = await onDelete(webhook.id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);

    if (success) {
      handleClose();
    }
  };

  const handleCopyUrl = async () => {
    if (webhook) {
      const success = await copyWebhookUrl(webhook.url);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!webhook) return null;

  const statusVariant = getWebhookStatusColor(webhook.status);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Webhook Settings
              <Badge variant={statusVariant}>{webhook.status}</Badge>
            </DialogTitle>
            <DialogDescription>
              Configure your webhook settings or manage its URL.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="danger">Danger Zone</TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Display */}
                {(error || validationError) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error || validationError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Webhook Name */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Webhook Name</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    maxLength={100}
                  />
                </div>

                {/* Avatar Upload */}
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={avatarPreview || undefined} />
                      <AvatarFallback className="text-lg">
                        {name ? getInitials(name) : "WH"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={isLoading}
                          className="text-muted-foreground"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Target Channel */}
                <div className="space-y-2">
                  <Label htmlFor="edit-channel">Target Channel</Label>
                  <Select
                    value={channelId}
                    onValueChange={setChannelId}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span>{channel.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value: WebhookStatus) => setStatus(value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Webhook URL (read-only) */}
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhook.url}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleCopyUrl}
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copied ? "Copied!" : "Copy URL"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading || !hasChanges}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="space-y-4">
              {/* Regenerate URL */}
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
                <h4 className="font-semibold text-orange-700 dark:text-orange-300">
                  Regenerate Webhook URL
                </h4>
                <p className="mt-1 text-sm text-orange-600 dark:text-orange-400">
                  This will generate a new URL and invalidate the current one.
                  Any existing integrations will stop working until updated.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-300"
                  onClick={() => setShowRegenerateConfirm(true)}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate URL
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Delete Webhook */}
              <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
                <h4 className="font-semibold text-destructive">
                  Delete Webhook
                </h4>
                <p className="text-destructive/80 mt-1 text-sm">
                  Permanently delete this webhook. This action cannot be undone.
                  All delivery history will also be deleted.
                </p>
                <Button
                  variant="destructive"
                  className="mt-3"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Webhook
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog
        open={showRegenerateConfirm}
        onOpenChange={setShowRegenerateConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Webhook URL?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new webhook URL. The current URL will stop
              working immediately. Make sure to update any integrations that use
              this webhook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRegenerating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerateUrl}
              disabled={isRegenerating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate URL"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{webhook.name}&quot;? This
              action cannot be undone. All delivery history will also be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Webhook"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default WebhookSettingsModal;
