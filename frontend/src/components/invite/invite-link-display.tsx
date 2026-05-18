"use client";

/**
 * InviteLinkDisplay Component - Display and share invite links
 *
 * Shows an invite URL with copy button, share options, and optional QR code.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Check,
  Share2,
  Mail,
  MessageSquare,
  Link2,
  QrCode as QrCodeIcon,
  ChevronDown,
  Twitter,
  Facebook,
  Linkedin,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildInviteLink,
  copyInviteLinkToClipboard,
  shareInviteLink,
  generateMailtoLink,
  formatTimeUntilExpiry,
  getRemainingUses,
  type InviteInfo,
} from "@/lib/invite";
import { QRCode } from "./qr-code";

// ============================================================================
// Types
// ============================================================================

export interface InviteLinkDisplayProps {
  /** The invite code */
  code: string;
  /** Full invite info (optional, for showing metadata) */
  invite?: InviteInfo | null;
  /** Show the QR code (default: false) */
  showQRCode?: boolean;
  /** Size of the QR code if shown (default: 160) */
  qrCodeSize?: number;
  /** Show share dropdown (default: true) */
  showShare?: boolean;
  /** Show expiration/usage info (default: true) */
  showMeta?: boolean;
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: "default" | "compact" | "card";
  /** Called when link is copied */
  onCopy?: () => void;
  /** Called when link is shared */
  onShare?: (method: string) => void;
}

// ============================================================================
// Share Methods
// ============================================================================

interface ShareMethod {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: (url: string, title: string) => void;
}

function getShareMethods(url: string, title: string): ShareMethod[] {
  return [
    {
      id: "email",
      label: "Email",
      icon: <Mail className="h-4 w-4" />,
      action: () => {
        window.location.href = generateMailtoLink(url.split("/").pop() || "");
      },
    },
    {
      id: "twitter",
      label: "Twitter",
      icon: <Twitter className="h-4 w-4" />,
      action: (url, title) => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          "_blank",
        );
      },
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
      action: (url) => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank",
        );
      },
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      action: (url, title) => {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          "_blank",
        );
      },
    },
    {
      id: "native",
      label: "More options...",
      icon: <Share2 className="h-4 w-4" />,
      action: async (url, title) => {
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch {
            // User cancelled
          }
        }
      },
    },
  ];
}

// ============================================================================
// Component
// ============================================================================

export function InviteLinkDisplay({
  code,
  invite,
  showQRCode = false,
  qrCodeSize = 160,
  showShare = true,
  showMeta = true,
  className,
  variant = "default",
  onCopy,
  onShare,
}: InviteLinkDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(showQRCode);

  const link = buildInviteLink(code);
  const title = invite?.channelName
    ? `Join ${invite.channelName}`
    : "You have been invited";

  // Handle copy
  const handleCopy = useCallback(async () => {
    const success = await copyInviteLinkToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    }
  }, [code, onCopy]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    const success = await shareInviteLink(code, title);
    if (success) {
      onShare?.("native");
    }
  }, [code, title, onShare]);

  // Handle share method
  const handleShareMethod = useCallback(
    (method: ShareMethod) => {
      method.action(link, title);
      onShare?.(method.id);
    },
    [link, title, onShare],
  );

  // Metadata
  const expiresIn = invite?.expiresAt
    ? formatTimeUntilExpiry(invite.expiresAt)
    : null;
  const remainingUses =
    invite?.maxUses !== null && invite?.maxUses !== undefined
      ? getRemainingUses(invite.maxUses, invite.useCount)
      : null;

  const shareMethods = getShareMethods(link, title);

  // Compact variant
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="min-w-0 flex-1">
          <code className="block truncate rounded bg-muted px-2 py-1 text-sm">
            {link}
          </code>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Card variant
  if (variant === "card") {
    return (
      <div className={cn("space-y-4 rounded-xl border bg-card p-4", className)}>
        {/* Link Display */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">
            Invite Link
          </span>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={link} readOnly className="pl-9 font-mono text-sm" />
            </div>
            <Button onClick={handleCopy} variant="outline">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Metadata */}
        {showMeta && (expiresIn || remainingUses !== null) && (
          <div className="flex flex-wrap gap-2">
            {expiresIn && (
              <Badge variant="secondary">Expires in {expiresIn}</Badge>
            )}
            {remainingUses !== null && (
              <Badge variant="secondary">
                {remainingUses === 0
                  ? "No uses left"
                  : `${remainingUses} use${remainingUses !== 1 ? "s" : ""} left`}
              </Badge>
            )}
          </div>
        )}

        {/* Share Options */}
        {showShare && (
          <div className="flex items-center gap-2 border-t pt-2">
            <span className="mr-2 text-sm text-muted-foreground">
              Share via:
            </span>
            {shareMethods.slice(0, 4).map((method) => (
              <TooltipProvider key={method.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleShareMethod(method)}
                    >
                      {method.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{method.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* QR Code Toggle */}
        <div className="flex items-center justify-between border-t pt-2">
          <Button variant="ghost" size="sm" onClick={() => setShowQR(!showQR)}>
            <QrCodeIcon className="mr-2 h-4 w-4" />
            {showQR ? "Hide QR Code" : "Show QR Code"}
          </Button>
        </div>

        {/* QR Code */}
        {showQR && (
          <div className="flex justify-center pt-2">
            <QRCode value={code} size={qrCodeSize} />
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("space-y-4", className)}>
      {/* Link Input with Copy Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input value={link} readOnly className="pr-10 font-mono text-sm" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Copy link"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Share Dropdown */}
        {showShare && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {shareMethods.map((method, index) => (
                <div key={method.id}>
                  {index === shareMethods.length - 1 && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem onClick={() => handleShareMethod(method)}>
                    {method.icon}
                    <span className="ml-2">{method.label}</span>
                  </DropdownMenuItem>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Metadata Badges */}
      {showMeta && (expiresIn || remainingUses !== null) && (
        <div className="flex flex-wrap gap-2">
          {expiresIn && <Badge variant="outline">Expires in {expiresIn}</Badge>}
          {remainingUses !== null && (
            <Badge variant="outline">
              {remainingUses === 0
                ? "No uses left"
                : `${remainingUses} use${remainingUses !== 1 ? "s" : ""} remaining`}
            </Badge>
          )}
          {invite?.useCount !== undefined && invite.useCount > 0 && (
            <Badge variant="outline">
              Used {invite.useCount} time{invite.useCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      )}

      {/* QR Code */}
      {showQR && (
        <div className="flex justify-center pt-4">
          <QRCode value={code} size={qrCodeSize} />
        </div>
      )}
    </div>
  );
}

export default InviteLinkDisplay;
