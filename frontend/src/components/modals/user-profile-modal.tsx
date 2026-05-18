"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type UserStatus = "online" | "away" | "busy" | "offline";

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: string;
  bio?: string;
  status: UserStatus;
  customStatus?: {
    emoji?: string;
    text: string;
    expiresAt?: Date;
  };
  createdAt?: Date;
  timezone?: string;
}

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  currentUserId?: string;
  onSendMessage?: (userId: string) => void;
  onAddToChannel?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
  onViewFullProfile?: (userId: string) => void;
}

const STATUS_COLORS: Record<UserStatus, string> = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  busy: "bg-red-500",
  offline: "bg-gray-400",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  online: "Active",
  away: "Away",
  busy: "Do not disturb",
  offline: "Offline",
};

const ROLE_BADGES: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    icon?: React.ReactNode;
  }
> = {
  owner: { variant: "default", icon: <Shield className="mr-1 h-3 w-3" /> },
  admin: { variant: "default", icon: <Shield className="mr-1 h-3 w-3" /> },
  moderator: { variant: "secondary" },
  member: { variant: "outline" },
  guest: { variant: "outline" },
};

export function UserProfileModal({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSendMessage,
  onAddToChannel,
  onBlockUser,
  onViewFullProfile,
}: UserProfileModalProps) {
  const [blockConfirm, setBlockConfirm] = useState(false);

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

  const handleBlock = () => {
    if (blockConfirm && onBlockUser) {
      onBlockUser(user.id);
      setBlockConfirm(false);
      onOpenChange(false);
    } else {
      setBlockConfirm(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[400px]">
        {/* Header with large avatar */}
        <div className="relative">
          <div className="from-primary/20 to-primary/5 h-24 bg-gradient-to-br" />
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewFullProfile && (
                  <DropdownMenuItem onClick={() => onViewFullProfile(user.id)}>
                    View full profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>Copy user ID</DropdownMenuItem>
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
        <div className="space-y-4 px-6 pb-6 pt-14">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl">{user.name}</DialogTitle>
              <Badge variant={roleConfig.variant} className="text-xs">
                {roleConfig.icon}
                {user.role}
              </Badge>
            </div>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <AtSign className="h-3 w-3" />
              {user.username}
            </p>
          </DialogHeader>

          {/* Status */}
          <div className="flex items-center gap-2">
            <div
              className={cn("h-2 w-2 rounded-full", STATUS_COLORS[user.status])}
            />
            <span className="text-sm text-muted-foreground">
              {STATUS_LABELS[user.status]}
            </span>
          </div>

          {/* Custom status */}
          {user.customStatus && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              {user.customStatus.emoji && (
                <span className="text-lg">{user.customStatus.emoji}</span>
              )}
              <span className="text-sm">{user.customStatus.text}</span>
              {user.customStatus.expiresAt && (
                <span className="ml-auto text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Clears soon
                </span>
              )}
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <p className="text-sm leading-relaxed text-foreground">
              {user.bio}
            </p>
          )}

          <Separator />

          {/* Contact info */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email</span>
              <span className="ml-auto">{user.email}</span>
            </div>
            {user.timezone && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Local time</span>
                <span className="ml-auto">{user.timezone}</span>
              </div>
            )}
            {user.createdAt && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined</span>
                <span className="ml-auto">{formatDate(user.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!isSelf && (
            <div className="flex gap-2 pt-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
