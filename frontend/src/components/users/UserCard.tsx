"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type UserProfile } from "@/stores/user-store";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserStatus } from "@/components/user/user-status";
import { RoleBadge } from "@/components/user/role-badge";
import { UserPresenceDot } from "@/components/user/user-presence-dot";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Phone,
  MoreHorizontal,
  MapPin,
  Clock,
  Globe,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

export interface ExtendedUserProfile extends UserProfile {
  title?: string;
  department?: string;
  team?: string;
  phone?: string;
  timezone?: string;
  pronouns?: string;
  socialLinks?: SocialLink[];
  badges?: UserBadge[];
}

export interface SocialLink {
  platform: string;
  url: string;
  icon?: React.ReactNode;
}

export interface UserBadge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UserCardProps extends React.HTMLAttributes<HTMLDivElement> {
  user: ExtendedUserProfile;
  variant?: "compact" | "default" | "detailed";
  showActions?: boolean;
  onMessage?: () => void;
  onCall?: () => void;
  onViewProfile?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const UserCard = React.forwardRef<HTMLDivElement, UserCardProps>(
  (
    {
      className,
      user,
      variant = "default",
      showActions = true,
      onMessage,
      onCall,
      onViewProfile,
      onBlock,
      onReport,
      selected = false,
      ...props
    },
    ref,
  ) => {
    // Compact variant - single line
    if (variant === "compact") {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 transition-colors",
            "hover:bg-muted/50 cursor-pointer",
            selected && "bg-primary/10",
            className,
          )}
          onClick={onViewProfile}
          onKeyDown={
            onViewProfile
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onViewProfile();
                  }
                }
              : undefined
          }
          role="button"
          tabIndex={0}
          {...props}
        >
          <UserAvatar user={user} size="sm" presence={user.presence} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {user.displayName}
              </span>
              <RoleBadge role={user.role} size="xs" />
            </div>
            <span className="block truncate text-xs text-muted-foreground">
              {user.title || `@${user.username}`}
            </span>
          </div>
          <UserPresenceDot status={user.presence} size="sm" position="inline" />
        </div>
      );
    }

    // Detailed variant - full card with extra info
    if (variant === "detailed") {
      return (
        <Card
          ref={ref}
          className={cn(
            "w-full overflow-hidden transition-shadow hover:shadow-md",
            selected && "ring-2 ring-primary",
            className,
          )}
          {...props}
        >
          {/* Cover/Header */}
          <div
            className="from-primary/20 to-primary/10 h-20 bg-gradient-to-r"
            style={{
              backgroundImage: user.coverUrl
                ? `url(${user.coverUrl})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          <CardContent className="-mt-10 pt-0">
            {/* Avatar and basic info */}
            <div className="mb-4 flex items-end gap-4">
              <UserAvatar
                user={user}
                size="xl"
                presence={user.presence}
                className="ring-4 ring-background"
              />
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-semibold">
                    {user.displayName}
                  </h3>
                  <RoleBadge role={user.role} size="sm" />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  @{user.username}
                  {user.pronouns && (
                    <span className="ml-2 text-xs">({user.pronouns})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Title and Department */}
            {(user.title || user.department) && (
              <div className="mb-3">
                {user.title && (
                  <p className="text-sm font-medium">{user.title}</p>
                )}
                {user.department && (
                  <p className="text-sm text-muted-foreground">
                    {user.department}
                    {user.team && ` - ${user.team}`}
                  </p>
                )}
              </div>
            )}

            {/* Custom status */}
            {user.customStatus && (
              <UserStatus
                status={user.customStatus}
                variant="full"
                className="mb-3"
              />
            )}

            {/* Location and timezone */}
            <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.timezone && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{user.timezone}</span>
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Website
                  </a>
                </div>
              )}
            </div>

            {/* Bio preview */}
            {user.bio && (
              <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                {user.bio}
              </p>
            )}

            {/* Badges */}
            {user.badges && user.badges.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1">
                {user.badges.slice(0, 4).map((badge) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                    style={{ backgroundColor: badge.color }}
                  >
                    {badge.icon && <span>{badge.icon}</span>}
                    {badge.name}
                  </span>
                ))}
                {user.badges.length > 4 && (
                  <span className="text-xs text-muted-foreground">
                    +{user.badges.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-2 border-t pt-3">
                {onMessage && (
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage();
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </Button>
                )}
                {onCall && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCall();
                    }}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onViewProfile && (
                      <DropdownMenuItem onClick={onViewProfile}>
                        View Profile
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onBlock && (
                      <DropdownMenuItem
                        onClick={onBlock}
                        className="text-destructive"
                      >
                        Block User
                      </DropdownMenuItem>
                    )}
                    {onReport && (
                      <DropdownMenuItem
                        onClick={onReport}
                        className="text-destructive"
                      >
                        Report User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Default variant - medium sized card
    return (
      <Card
        ref={ref}
        className={cn(
          "w-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
          selected && "ring-2 ring-primary",
          className,
        )}
        onClick={onViewProfile}
        {...props}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <UserAvatar user={user} size="lg" presence={user.presence} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{user.displayName}</h3>
                <RoleBadge role={user.role} size="xs" />
              </div>
              <p className="truncate text-sm text-muted-foreground">
                @{user.username}
              </p>
              {user.title && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {user.title}
                </p>
              )}
              {user.customStatus && (
                <UserStatus
                  status={user.customStatus}
                  variant="compact"
                  className="mt-2"
                />
              )}
            </div>
            {showActions && (
              <div className="flex items-center gap-1">
                {onMessage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage();
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onViewProfile && (
                      <DropdownMenuItem onClick={onViewProfile}>
                        View Profile
                      </DropdownMenuItem>
                    )}
                    {onCall && (
                      <DropdownMenuItem onClick={onCall}>
                        Start Call
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onBlock && (
                      <DropdownMenuItem
                        onClick={onBlock}
                        className="text-destructive"
                      >
                        Block User
                      </DropdownMenuItem>
                    )}
                    {onReport && (
                      <DropdownMenuItem
                        onClick={onReport}
                        className="text-destructive"
                      >
                        Report User
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  },
);
UserCard.displayName = "UserCard";

export { UserCard };
