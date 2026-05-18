"use client";

import { useState, useCallback, useRef } from "react";
import {
  Loader2,
  Upload,
  X,
  Copy,
  Check,
  Hash,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CreateWebhookFormData, Webhook, copyWebhookUrl } from "@/lib/webhooks";

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

export interface CreateWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: Channel[];
  onSubmit: (data: CreateWebhookFormData) => Promise<Webhook | null>;
  isLoading?: boolean;
  error?: string | null;
  defaultChannelId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateWebhookModal({
  open,
  onOpenChange,
  channels,
  onSubmit,
  isLoading = false,
  error = null,
  defaultChannelId,
}: CreateWebhookModalProps) {
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState(defaultChannelId || "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [createdWebhook, setCreatedWebhook] = useState<Webhook | null>(null);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setName("");
    setChannelId(defaultChannelId || "");
    setAvatarUrl("");
    setAvatarPreview(null);
    setCreatedWebhook(null);
    setValidationError(null);
    setCopied(false);
  }, [defaultChannelId]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false);
      // Reset form after animation
      setTimeout(resetForm, 300);
    }
  }, [isLoading, onOpenChange, resetForm]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setValidationError("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setValidationError("Image must be less than 2MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarPreview(dataUrl);
      setAvatarUrl(dataUrl); // In production, you'd upload this to storage
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

    // Validation
    if (!name.trim()) {
      setValidationError("Please enter a webhook name");
      return;
    }

    if (!channelId) {
      setValidationError("Please select a target channel");
      return;
    }

    setValidationError(null);

    const result = await onSubmit({
      name: name.trim(),
      channelId,
      avatarUrl: avatarUrl || undefined,
    });

    if (result) {
      setCreatedWebhook(result);
    }
  };

  const handleCopyUrl = async () => {
    if (createdWebhook) {
      const success = await copyWebhookUrl(createdWebhook.url);
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

  // Success view
  if (createdWebhook) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Webhook Created Successfully
            </DialogTitle>
            <DialogDescription>
              Your webhook has been created. Copy the URL below to use it in
              your integrations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Webhook Preview */}
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={createdWebhook.avatar_url} />
                <AvatarFallback>
                  {getInitials(createdWebhook.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{createdWebhook.name}</p>
                <p className="text-sm text-muted-foreground">
                  #{createdWebhook.channel?.name || "Unknown channel"}
                </p>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={createdWebhook.url}
                  readOnly
                  className="font-mono text-sm"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
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
              <p className="text-xs text-muted-foreground">
                Keep this URL secret. Anyone with this URL can post messages to
                your channel.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Create Another
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Create form view
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Create a webhook to allow external services to post messages to a
              channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Error Display */}
            {(error || validationError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || validationError}</AlertDescription>
              </Alert>
            )}

            {/* Webhook Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Webhook Name *</Label>
              <Input
                id="name"
                placeholder="e.g., GitHub Notifications"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This name will appear as the sender of webhook messages.
              </p>
            </div>

            {/* Avatar Upload */}
            <div className="space-y-2">
              <Label>Avatar (optional)</Label>
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
              <Label htmlFor="channel">Target Channel *</Label>
              <Select
                value={channelId}
                onValueChange={setChannelId}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No channels available
                    </div>
                  ) : (
                    channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span>{channel.name}</span>
                          {channel.is_private && (
                            <span className="text-xs text-muted-foreground">
                              (private)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Messages sent via this webhook will appear in this channel.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !channelId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Webhook"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWebhookModal;
