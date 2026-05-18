/**
 * UserProfile Component - Complete User Profile View
 *
 * Displays comprehensive user profile with all information:
 * - Profile header with avatar and cover
 * - Basic info (name, username, email, role)
 * - Status and presence
 * - Bio and additional info
 * - Contact information
 * - Statistics (joined date, activity)
 * - Action buttons (edit, message, block, report)
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useUserStore, getInitials } from "@/stores/user-store";
import { useAuth } from "@/contexts/auth-context";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// User Components
import { UserStatus } from "./user-status";
import { UserPresenceDot } from "./user-presence-dot";
import { RoleBadge } from "./role-badge";
import { SetStatusModal } from "./set-status-modal";
import { EditProfileForm } from "./edit-profile-form";

// Icons
import {
  Edit2,
  MessageSquare,
  UserX,
  Flag,
  MapPin,
  Globe,
  Calendar,
  Mail,
  Phone,
  Briefcase,
  Building,
  User,
  Link2,
  MoreVertical,
  Shield,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserProfileProps {
  /** User ID to display (if not provided, shows current user) */
  userId?: string;
  /** Callback when profile is updated */
  onUpdate?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function UserProfile({ userId, onUpdate, className }: UserProfileProps) {
  const { user: authUser } = useAuth();
  const { user, currentUser, isLoading, updateProfile } = useUser({ userId });
  const [isEditing, setIsEditing] = React.useState(false);
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  // Determine if viewing own profile
  const isOwnProfile =
    !userId || userId === authUser?.id || userId === currentUser?.id;

  // Use current user if no userId provided
  const displayUser = user || currentUser;

  // Loading state
  if (isLoading || !displayUser) {
    return <UserProfileSkeleton />;
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Cover Image */}
      <div
        className="from-primary/20 to-primary/10 relative h-48 overflow-hidden rounded-t-lg bg-gradient-to-r"
        style={
          displayUser.coverUrl
            ? {
                backgroundImage: `url(${displayUser.coverUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {isOwnProfile && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute right-4 top-4"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="px-6 pb-6">
        {/* Avatar and Basic Info */}
        <div className="-mt-16 mb-6 flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage
                src={displayUser.avatarUrl}
                alt={displayUser.displayName}
              />
              <AvatarFallback className="text-3xl">
                {getInitials(displayUser.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-2 right-2">
              <UserPresenceDot
                status={displayUser.presence ?? "offline"}
                size="lg"
              />
            </div>
          </div>

          {/* Name and Actions */}
          <div className="flex-1 pt-16">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">
                    {displayUser.displayName}
                  </h1>
                  <RoleBadge role={displayUser.role} />
                </div>
                <p className="text-muted-foreground">@{displayUser.username}</p>
                {displayUser.customStatus && (
                  <UserStatus
                    status={displayUser.customStatus}
                    variant="full"
                  />
                )}
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send Message</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon">
                          <UserX className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Block User</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Flag className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Report User</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {isOwnProfile && (
                <Button
                  variant="outline"
                  onClick={() => setStatusModalOpen(true)}
                >
                  Set Status
                </Button>
              )}
            </div>
          </div>
        </div>

        {isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <EditProfileForm
                user={displayUser}
                onSave={async (data) => {
                  await updateProfile(data);
                  setIsEditing(false);
                  onUpdate?.();
                }}
                onCancel={() => setIsEditing(false)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayUser.bio && (
                  <div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {displayUser.bio}
                    </p>
                  </div>
                )}

                {displayUser.pronouns && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Pronouns:</span>
                    <span>{displayUser.pronouns}</span>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span>
                      {new Date(displayUser.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>

                  {displayUser.lastSeenAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last seen:</span>
                      <span>
                        {new Date(displayUser.lastSeenAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span>{displayUser.email}</span>
                </div>

                {displayUser.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span>{displayUser.location}</span>
                  </div>
                )}

                {displayUser.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Website:</span>
                    <a
                      href={displayUser.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {displayUser.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Status Modal */}
      <SetStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        currentStatus={displayUser.customStatus}
      />
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

function UserProfileSkeleton() {
  return (
    <div className="w-full">
      {/* Cover Skeleton */}
      <Skeleton className="h-48 rounded-t-lg" />

      <div className="px-6 pb-6">
        {/* Avatar and Name Skeleton */}
        <div className="-mt-16 mb-6 flex items-start gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-2 pt-16">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
