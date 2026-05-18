"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  UserPlus,
  Ban,
  MoreHorizontal,
  Clock,
  Mail,
  Calendar,
  Shield,
  AtSign,
  Phone,
  MapPin,
  Link as LinkIcon,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BaseModal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  type ModalSize,
} from "./base-modal";

import { logger } from "@/lib/logger";

export type ProfileStatus = "online" | "away" | "busy" | "offline";

export interface ProfileUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: string;
  bio?: string;
  status: ProfileStatus;
  customStatus?: {
    emoji?: string;
    text: string;
    expiresAt?: Date;
  };
  createdAt?: Date;
  timezone?: string;
  phone?: string;
  location?: string;
  website?: string;
}

export interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ProfileUser | null;
  currentUserId?: string;
  onSendMessage?: (userId: string) => void;
  onAddToChannel?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
  onViewFullProfile?: (userId: string) => void;
  onCopyUserId?: (userId: string) => void;
  size?: ModalSize;
}

const STATUS_COLORS: Record<ProfileStatus, string> = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  offline: "bg-gray-400",
};

const STATUS_LABELS: Record<ProfileStatus, string> = {
  online: "Active",
  away: "Away",
  busy: "Do not disturb",
  offline: "Offline",
};

const ROLE_BADGES: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    hasIcon?: boolean;
  }
> = {
  owner: { variant: "default", hasIcon: true },
  admin: { variant: "default", hasIcon: true },
  moderator: { variant: "secondary" },
  member: { variant: "outline" },
  guest: { variant: "outline" },
};

export function ProfileModal({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSendMessage,
  onAddToChannel,
  onBlockUser,
  onViewFullProfile,
  onCopyUserId,
  size = "sm",
}: ProfileModalProps) {
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const isSelf = currentUserId === user.id;
  const roleConfig = ROLE_BADGES[user.role.toLowerCase()] || ROLE_BADGES.member;

  const formatDate = (date?: Date) => {
    if (!date) return "Unknown";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const formatLocalTime = (timezone?: string) => {
    if (!timezone) return null;
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(new Date());
    } catch {
      return null;
    }
  };

  const handleBlock = () => {
    if (blockConfirm && onBlockUser) {
      onBlockUser(user.id);
      setBlockConfirm(false);
      onOpenChange(false);
    } else {
      setBlockConfirm(true);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      onCopyUserId?.(user.id);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy:", err);
    }
  };

  const localTime = formatLocalTime(user.timezone);

  return (
    <BaseModal
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setBlockConfirm(false);
        }
        onOpenChange(newOpen);
      }}
      size={size}
      showCloseButton={false}
      className="overflow-hidden p-0"
    >
      {/* Header with large avatar */}
      <div className="relative">
        <div className="from-primary/30 to-primary/5 h-24 bg-gradient-to-br" />
        <div className="absolute -bottom-12 left-6">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback className="text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-background",
                STATUS_COLORS[user.status],
              )}
            />
          </div>
        </div>

        {/* Actions dropdown */}
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/50 h-8 w-8"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewFullProfile && (
                <DropdownMenuItem onClick={() => onViewFullProfile(user.id)}>
                  View full profile
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleCopyId}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy user ID
                  </>
                )}
              </DropdownMenuItem>
              {!isSelf && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleBlock}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    {blockConfirm ? "Click again to confirm" : "Block user"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile info */}
      <ModalBody className="pb-6 pt-14">
        <ModalHeader className="space-y-1 p-0">
          <div className="flex items-center gap-2">
            <ModalTitle className="text-xl">{user.name}</ModalTitle>
            <Badge variant={roleConfig.variant} className="text-xs">
              {roleConfig.hasIcon && <Shield className="mr-1 h-3 w-3" />}
              {user.role}
            </Badge>
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <AtSign className="h-3 w-3" />
            {user.username}
          </p>
        </ModalHeader>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2">
          <div
            className={cn("h-2 w-2 rounded-full", STATUS_COLORS[user.status])}
          />
          <span className="text-sm text-muted-foreground">
            {STATUS_LABELS[user.status]}
          </span>
        </div>

        {/* Custom status */}
        {user.customStatus && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            {user.customStatus.emoji && (
              <span className="text-lg">{user.customStatus.emoji}</span>
            )}
            <span className="flex-1 text-sm">{user.customStatus.text}</span>
            {user.customStatus.expiresAt && (
              <span className="text-xs text-muted-foreground">
                <Clock className="mr-1 inline h-3 w-3" />
                Clears soon
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            {user.bio}
          </p>
        )}

        <Separator className="my-4" />

        {/* Contact info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Email</span>
            <span className="ml-auto truncate">{user.email}</span>
          </div>

          {user.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Phone</span>
              <span className="ml-auto">{user.phone}</span>
            </div>
          )}

          {user.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Location</span>
              <span className="ml-auto">{user.location}</span>
            </div>
          )}

          {user.website && (
            <div className="flex items-center gap-3 text-sm">
              <LinkIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Website</span>
              <a
                href={user.website}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto truncate text-primary hover:underline"
              >
                {user.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}

          {localTime && (
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Local time</span>
              <span className="ml-auto">{localTime}</span>
            </div>
          )}

          {user.createdAt && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Joined</span>
              <span className="ml-auto">{formatDate(user.createdAt)}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isSelf && (onSendMessage || onAddToChannel) && (
          <div className="mt-4 flex gap-2 border-t pt-4">
            {onSendMessage && (
              <Button
                onClick={() => {
                  onSendMessage(user.id);
                  onOpenChange(false);
                }}
                className="flex-1"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </Button>
            )}
            {onAddToChannel && (
              <Button
                variant="outline"
                onClick={() => {
                  onAddToChannel(user.id);
                  onOpenChange(false);
                }}
                className="flex-1"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add to channel
              </Button>
            )}
          </div>
        )}
      </ModalBody>
    </BaseModal>
  );
}
