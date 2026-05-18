"use client";

import { useState, useCallback } from "react";
import {
  Bot,
  Key,
  Store,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox as UICheckbox } from "@/components/ui/checkbox";
import { BotPermissions } from "./bot-permissions";
import { BotCard, BotCardSkeleton } from "./bot-card";
import { cn } from "@/lib/utils";
import type { Bot as BotType, BotPermission } from "@/graphql/bots";

// ============================================================================
// TYPES
// ============================================================================

export interface AddBotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: { id: string; name: string }[];
  marketplaceBots?: BotType[];
  marketplaceLoading?: boolean;
  onAddByToken: (token: string, channelIds: string[]) => Promise<void>;
  onInstallBot: (
    botId: string,
    channelIds: string[],
    permissions: BotPermission[],
  ) => Promise<void>;
  onOpenMarketplace?: () => void;
}

type Step =
  | "method"
  | "token"
  | "browse"
  | "permissions"
  | "channels"
  | "confirm";

// ============================================================================
// COMPONENT
// ============================================================================

export function AddBotModal({
  open,
  onOpenChange,
  channels,
  marketplaceBots = [],
  marketplaceLoading = false,
  onAddByToken,
  onInstallBot,
  onOpenMarketplace,
}: AddBotModalProps) {
  const [step, setStep] = useState<Step>("method");
  const [activeTab, setActiveTab] = useState<"token" | "browse">("token");
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenValidating, setTokenValidating] = useState(false);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<
    BotPermission[]
  >([]);
  const [installing, setInstalling] = useState(false);

  const resetState = useCallback(() => {
    setStep("method");
    setActiveTab("token");
    setToken("");
    setTokenError(null);
    setSelectedBot(null);
    setSelectedChannels([]);
    setSelectedPermissions([]);
    setInstalling(false);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetState, 200);
  }, [onOpenChange, resetState]);

  const handleTokenSubmit = async () => {
    if (!token.trim()) {
      setTokenError("Please enter a bot token");
      return;
    }

    setTokenValidating(true);
    setTokenError(null);

    try {
      // Simulate token validation - in production this would verify the token
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo, create a mock bot from the token
      const mockBot: BotType = {
        id: `token-bot-${Date.now()}`,
        name: "Custom Bot",
        description: "A custom bot added via token",
        status: "active",
        permissions: ["read_messages", "send_messages", "use_slash_commands"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: "unknown",
      };

      setSelectedBot(mockBot);
      setSelectedPermissions(mockBot.permissions);
      setStep("channels");
    } catch {
      setTokenError("Invalid bot token. Please check and try again.");
    } finally {
      setTokenValidating(false);
    }
  };

  const handleBotSelect = (bot: BotType) => {
    setSelectedBot(bot);
    setSelectedPermissions(bot.permissions);
    setStep("permissions");
  };

  const handleChannelToggle = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId],
    );
  };

  const handleSelectAllChannels = () => {
    if (selectedChannels.length === channels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(channels.map((c) => c.id));
    }
  };

  const handleInstall = async () => {
    if (!selectedBot || selectedChannels.length === 0) return;

    setInstalling(true);

    try {
      if (activeTab === "token") {
        await onAddByToken(token, selectedChannels);
      } else {
        await onInstallBot(
          selectedBot.id,
          selectedChannels,
          selectedPermissions,
        );
      }
      handleClose();
    } catch {
      // Error handling is done in the parent
    } finally {
      setInstalling(false);
    }
  };

  const canProceedFromPermissions = selectedPermissions.length > 0;
  const canProceedFromChannels = selectedChannels.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Bot</DialogTitle>
          <DialogDescription>
            {step === "method" && "Choose how you want to add a bot"}
            {step === "token" && "Enter your bot token"}
            {step === "browse" && "Browse available bots"}
            {step === "permissions" && "Review bot permissions"}
            {step === "channels" && "Select channels to install"}
            {step === "confirm" && "Confirm installation"}
          </DialogDescription>
        </DialogHeader>

        {step === "method" && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "token" | "browse")}
            className="mt-2"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="token" className="gap-2">
                <Key className="h-4 w-4" />
                Bot Token
              </TabsTrigger>
              <TabsTrigger value="browse" className="gap-2">
                <Store className="h-4 w-4" />
                Browse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="token" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-token">Bot Token</Label>
                <Input
                  id="bot-token"
                  placeholder="Enter bot token (e.g., xoxb-...)"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTokenError(null);
                  }}
                  className={cn(tokenError && "border-destructive")}
                />
                {tokenError && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {tokenError}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Get your bot token from the bot developer or your admin panel.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleTokenSubmit}
                  disabled={!token.trim() || tokenValidating}
                >
                  {tokenValidating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Validate Token
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="browse" className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {marketplaceLoading ? (
                    <>
                      <BotCardSkeleton compact />
                      <BotCardSkeleton compact />
                      <BotCardSkeleton compact />
                    </>
                  ) : marketplaceBots.length > 0 ? (
                    marketplaceBots
                      .slice(0, 5)
                      .map((bot) => (
                        <BotCard
                          key={bot.id}
                          bot={bot}
                          compact
                          onInstall={handleBotSelect}
                        />
                      ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No bots available
                    </div>
                  )}
                </div>
              </ScrollArea>

              {onOpenMarketplace && (
                <div className="mt-4 border-t pt-4 text-center">
                  <Button
                    variant="link"
                    onClick={() => {
                      handleClose();
                      onOpenMarketplace();
                    }}
                  >
                    Browse full marketplace
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {step === "permissions" && selectedBot && (
          <div className="space-y-4">
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedBot.avatarUrl} />
                <AvatarFallback>
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{selectedBot.name}</span>
                  {selectedBot.verified && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedBot.description}
                </p>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Permissions</Label>
              <ScrollArea className="h-[250px] pr-4">
                <BotPermissions
                  permissions={selectedPermissions}
                  onChange={setSelectedPermissions}
                  showDescriptions
                />
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("method")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep("channels")}
                disabled={!canProceedFromPermissions}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "channels" && selectedBot && (
          <div className="space-y-4">
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedBot.avatarUrl} />
                <AvatarFallback>
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-medium">{selectedBot.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {selectedPermissions.length} permissions
                </Badge>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Install in channels</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllChannels}
                >
                  {selectedChannels.length === channels.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>
              <ScrollArea className="h-[200px] rounded-lg border p-2">
                <div className="space-y-1">
                  {channels.map((channel) => (
                    <label
                      key={channel.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors",
                        selectedChannels.includes(channel.id)
                          ? "bg-primary/10"
                          : "hover:bg-muted",
                      )}
                    >
                      <Checkbox
                        checked={selectedChannels.includes(channel.id)}
                        onCheckedChange={() => handleChannelToggle(channel.id)}
                      />
                      <span className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">#</span>
                        {channel.name}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedChannels.length} channel
                {selectedChannels.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setStep(activeTab === "token" ? "method" : "permissions")
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleInstall}
                disabled={!canProceedFromChannels || installing}
              >
                {installing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Install Bot
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// CHECKBOX COMPONENT (inline definition if not exported from ui)
// ============================================================================

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

function Checkbox({ checked, onCheckedChange, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "h-4 w-4 rounded border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked && "text-primary-foreground bg-primary",
        className,
      )}
    >
      {checked && (
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
}
