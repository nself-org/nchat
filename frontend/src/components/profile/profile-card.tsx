"use client";

/**
 * Profile Card Component
 *
 * Displays user profile information in a card format.
 * Supports viewing other users' profiles with privacy-aware display.
 *
 * @module components/profile/profile-card
 * @version 1.0.0
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProfileAvatar } from "./profile-avatar";
import {
  AtSign,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Globe,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Shield,
  User,
} from "lucide-react";
import type { UserProfileFull } from "@/types/profile";

// ============================================================================
// Types
// ============================================================================

export interface ProfileCardProps {
  /** User profile data */
  profile: UserProfileFull;
  /** Whether this is the current user's profile */
  isCurrentUser?: boolean;
  /** Show compact version */
  compact?: boolean;
  /** Called when user wants to message */
  onMessage?: () => void;
  /** Called when user wants to view full profile */
  onViewProfile?: () => void;
  /** Called when more actions are requested */
  onMoreActions?: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatLastSeen(date: Date | string | undefined): string {
  if (!date) return "Unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "owner":
      return "destructive";
    case "admin":
      return "default";
    case "moderator":
      return "secondary";
    default:
      return "outline";
  }
}

// ============================================================================
// Component
// ============================================================================

export function ProfileCard({
  profile,
  isCurrentUser = false,
  compact = false,
  onMessage,
  onViewProfile,
  onMoreActions,
  className,
}: ProfileCardProps) {
  return (
    <Card
      className={cn("overflow-hidden", className)}
      data-testid="profile-card"
    >
      {/* Banner */}
      {profile.bannerUrl && !compact && (
        <div
          className="h-24 bg-cover bg-center"
          style={{ backgroundImage: `url(${profile.bannerUrl})` }}
          data-testid="profile-banner"
        />
      )}

      <CardHeader
        className={cn(
          "flex flex-row items-start gap-4",
          profile.bannerUrl && !compact && "-mt-10",
        )}
      >
        {/* Avatar */}
        <ProfileAvatar
          src={profile.photo?.url}
          name={profile.displayName}
          size={compact ? "lg" : "xl"}
          showOnlineIndicator
          isOnline={
            profile.lastSeenAt
              ? new Date().getTime() - new Date(profile.lastSeenAt).getTime() <
                300000
              : false
          }
          className={
            profile.bannerUrl && !compact ? "ring-4 ring-background" : ""
          }
        />

        {/* Header Info */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3
              className="text-lg font-semibold"
              data-testid="profile-display-name"
            >
              {profile.displayName}
            </h3>
            {profile.isVerified && (
              <Shield
                className="h-4 w-4 text-blue-500"
                data-testid="verified-badge"
              />
            )}
            {profile.isBot && (
              <Badge variant="outline" className="text-xs">
                BOT
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AtSign className="h-3 w-3" />
            <span data-testid="profile-username">{profile.username}</span>
          </div>

          <Badge variant={getRoleBadgeVariant(profile.role)} className="mt-1">
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </Badge>
        </div>

        {/* Actions */}
        {!isCurrentUser && (
          <div className="flex gap-2">
            {onMessage && (
              <Button
                size="sm"
                onClick={onMessage}
                data-testid="message-button"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </Button>
            )}
            {onMoreActions && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onMoreActions}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status */}
        {(profile.status || profile.statusEmoji) && (
          <div
            className="flex items-center gap-2 text-sm"
            data-testid="profile-status"
          >
            {profile.statusEmoji && (
              <span className="text-lg">{profile.statusEmoji}</span>
            )}
            {profile.status && (
              <span className="text-muted-foreground">{profile.status}</span>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm" data-testid="profile-bio">
            {profile.bio}
          </p>
        )}

        {!compact && (
          <>
            <Separator />

            {/* Details */}
            <div className="grid gap-2 text-sm">
              {profile.email && profile.privacySettings?.showEmail && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span data-testid="profile-email">{profile.email}</span>
                </div>
              )}

              {profile.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span data-testid="profile-phone">{profile.phone}</span>
                </div>
              )}

              {profile.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span data-testid="profile-location">{profile.location}</span>
                </div>
              )}

              {profile.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    data-testid="profile-website"
                  >
                    {profile.website}
                  </a>
                </div>
              )}

              {(profile.jobTitle || profile.organization) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span data-testid="profile-job">
                    {profile.jobTitle}
                    {profile.organization && ` at ${profile.organization}`}
                  </span>
                </div>
              )}

              {profile.timezone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span data-testid="profile-timezone">{profile.timezone}</span>
                </div>
              )}

              {profile.lastSeenAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span data-testid="profile-last-seen">
                    Last seen {formatLastSeen(profile.lastSeenAt)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span data-testid="profile-joined">
                  Joined {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>

            {/* Social Links */}
            {profile.socialLinks &&
              Object.keys(profile.socialLinks).length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.socialLinks).map(
                      ([platform, url]) => {
                        if (!url || platform === "custom") return null;
                        return (
                          <a
                            key={platform}
                            href={typeof url === "string" ? url : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            data-testid={`social-link-${platform}`}
                          >
                            {platform.charAt(0).toUpperCase() +
                              platform.slice(1)}
                          </a>
                        );
                      },
                    )}
                  </div>
                </>
              )}
          </>
        )}

        {/* View Full Profile */}
        {compact && onViewProfile && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onViewProfile}
            data-testid="view-profile-button"
          >
            <User className="mr-2 h-4 w-4" />
            View Full Profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ProfileCard;
