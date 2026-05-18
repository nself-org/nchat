"use client";

import { useState } from "react";
import { Shield, Lock, Clock, X, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SecretChatSettings,
  DisappearingSettings,
  formatDuration,
} from "@/lib/disappearing";

interface SecretChatBannerProps {
  /** Whether this is a secret chat */
  isSecretChat: boolean;
  /** Secret chat settings (if secret chat) */
  secretSettings?: SecretChatSettings | null;
  /** Regular disappearing settings (if not secret chat) */
  disappearingSettings?: DisappearingSettings | null;
  /** Whether the banner can be dismissed */
  dismissable?: boolean;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Show as compact or full banner */
  variant?: "full" | "compact" | "inline";
  /** Additional class names */
  className?: string;
}

/**
 * Banner indicating a secret chat or disappearing messages status.
 */
export function SecretChatBanner({
  isSecretChat,
  secretSettings,
  disappearingSettings,
  dismissable = false,
  onDismiss,
  variant = "full",
  className,
}: SecretChatBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Don't show if dismissed or no settings
  if (isDismissed) return null;
  if (!isSecretChat && !disappearingSettings?.enabled) return null;
  if (!isSecretChat && disappearingSettings && !disappearingSettings.showBanner)
    return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const duration = isSecretChat
    ? secretSettings?.defaultDuration
    : disappearingSettings?.defaultDuration;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
          isSecretChat
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          className,
        )}
      >
        {isSecretChat ? (
          <>
            <Shield size={12} />
            <span>Secret chat</span>
          </>
        ) : (
          <>
            <Clock size={12} />
            <span>{formatDuration(duration || 0)}</span>
          </>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                "transition-colors hover:opacity-80",
                isSecretChat
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                className,
              )}
              onClick={() => setIsDialogOpen(true)}
            >
              {isSecretChat ? (
                <>
                  <Shield size={14} />
                  <span className="font-medium">Secret Chat</span>
                  <Lock size={12} />
                </>
              ) : (
                <>
                  <Clock size={14} />
                  <span className="font-medium">
                    Disappearing: {formatDuration(duration || 0)}
                  </span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Click for more information</p>
          </TooltipContent>
        </Tooltip>

        <SecretChatInfoDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          isSecretChat={isSecretChat}
          secretSettings={secretSettings}
          disappearingSettings={disappearingSettings}
        />
      </TooltipProvider>
    );
  }

  // Full variant
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-3",
        "border-b",
        isSecretChat
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-blue-500/20 bg-blue-500/5",
        className,
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 rounded-full p-2",
          isSecretChat ? "bg-emerald-500/10" : "bg-blue-500/10",
        )}
      >
        {isSecretChat ? (
          <Shield
            size={18}
            className="text-emerald-600 dark:text-emerald-400"
          />
        ) : (
          <Clock size={18} className="text-blue-600 dark:text-blue-400" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4
            className={cn(
              "text-sm font-semibold",
              isSecretChat
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-blue-600 dark:text-blue-400",
            )}
          >
            {isSecretChat ? "Secret Chat" : "Disappearing Messages"}
          </h4>
          {isSecretChat && <Lock size={12} className="text-emerald-500" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {isSecretChat
            ? "End-to-end encrypted. Messages disappear and cannot be forwarded."
            : `Messages will disappear after ${formatDuration(duration || 0)}`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Info size={14} className="mr-1" />
              Learn more
            </Button>
          </DialogTrigger>
          <SecretChatInfoDialogContent
            isSecretChat={isSecretChat}
            secretSettings={secretSettings}
            disappearingSettings={disappearingSettings}
          />
        </Dialog>

        {dismissable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
          >
            <X size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Info dialog for secret chat / disappearing messages.
 */
function SecretChatInfoDialog({
  open,
  onOpenChange,
  isSecretChat,
  secretSettings,
  disappearingSettings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSecretChat: boolean;
  secretSettings?: SecretChatSettings | null;
  disappearingSettings?: DisappearingSettings | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SecretChatInfoDialogContent
        isSecretChat={isSecretChat}
        secretSettings={secretSettings}
        disappearingSettings={disappearingSettings}
      />
    </Dialog>
  );
}

/**
 * Dialog content for secret chat info.
 */
function SecretChatInfoDialogContent({
  isSecretChat,
  secretSettings,
  disappearingSettings,
}: {
  isSecretChat: boolean;
  secretSettings?: SecretChatSettings | null;
  disappearingSettings?: DisappearingSettings | null;
}) {
  const duration = isSecretChat
    ? secretSettings?.defaultDuration
    : disappearingSettings?.defaultDuration;

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-full p-2",
              isSecretChat ? "bg-emerald-500/10" : "bg-blue-500/10",
            )}
          >
            {isSecretChat ? (
              <Shield
                size={24}
                className="text-emerald-600 dark:text-emerald-400"
              />
            ) : (
              <Clock size={24} className="text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <DialogTitle>
              {isSecretChat ? "Secret Chat" : "Disappearing Messages"}
            </DialogTitle>
            <DialogDescription>
              {isSecretChat
                ? "Enhanced privacy and security"
                : "Automatic message cleanup"}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {isSecretChat ? (
          <SecretChatFeatures settings={secretSettings} />
        ) : (
          <DisappearingFeatures duration={duration} />
        )}
      </div>
    </DialogContent>
  );
}

/**
 * Secret chat features list.
 */
function SecretChatFeatures({
  settings,
}: {
  settings?: SecretChatSettings | null;
}) {
  const features = [
    {
      icon: <Lock size={16} />,
      title: "End-to-end encryption",
      description: "Only you and the recipient can read messages",
      enabled: settings?.isEncrypted ?? true,
    },
    {
      icon: <Clock size={16} />,
      title: "Auto-delete",
      description: `Messages disappear after ${formatDuration(settings?.defaultDuration || 0)}`,
      enabled: true,
    },
    {
      icon: <Shield size={16} />,
      title: "Screenshot warning",
      description: "Notifies when screenshots are detected",
      enabled: settings?.screenshotWarning ?? true,
    },
  ];

  return (
    <div className="space-y-3">
      {features.map((feature, index) => (
        <div
          key={index}
          className="bg-muted/50 flex items-start gap-3 rounded-lg p-3"
        >
          <div className="mt-0.5 text-emerald-500">{feature.icon}</div>
          <div>
            <p className="text-sm font-medium">{feature.title}</p>
            <p className="text-xs text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Disappearing messages features list.
 */
function DisappearingFeatures({ duration }: { duration?: number }) {
  return (
    <div className="space-y-3">
      <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
        <div className="mt-0.5 text-blue-500">
          <Clock size={16} />
        </div>
        <div>
          <p className="text-sm font-medium">Automatic cleanup</p>
          <p className="text-xs text-muted-foreground">
            Messages will disappear {formatDuration(duration || 0)} after being
            sent
          </p>
        </div>
      </div>

      <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
        <div className="mt-0.5 text-blue-500">
          <Info size={16} />
        </div>
        <div>
          <p className="text-sm font-medium">Note</p>
          <p className="text-xs text-muted-foreground">
            Recipients may still screenshot or copy messages before they
            disappear. For enhanced privacy, use Secret Chat.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SecretChatBanner;
