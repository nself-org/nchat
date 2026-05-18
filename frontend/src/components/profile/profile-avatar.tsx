"use client";

/**
 * Profile Avatar Component
 *
 * Displays user avatar with fallback to initials, supports upload and edit modes.
 *
 * @module components/profile/profile-avatar
 * @version 1.0.0
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, User } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ProfileAvatarProps {
  /** Image URL */
  src?: string | null;
  /** Display name for initials fallback */
  name?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Show edit button overlay */
  editable?: boolean;
  /** Loading state for upload */
  isUploading?: boolean;
  /** Called when user wants to upload new photo */
  onUpload?: () => void;
  /** Called when user wants to delete photo */
  onDelete?: () => void;
  /** Show online indicator */
  showOnlineIndicator?: boolean;
  /** Online status */
  isOnline?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get size classes for avatar
 */
function getSizeClasses(size: ProfileAvatarProps["size"]) {
  switch (size) {
    case "sm":
      return "h-8 w-8 text-xs";
    case "md":
      return "h-10 w-10 text-sm";
    case "lg":
      return "h-16 w-16 text-lg";
    case "xl":
      return "h-24 w-24 text-2xl";
    case "2xl":
      return "h-32 w-32 text-3xl";
    default:
      return "h-10 w-10 text-sm";
  }
}

/**
 * Get online indicator size
 */
function getIndicatorSize(size: ProfileAvatarProps["size"]) {
  switch (size) {
    case "sm":
      return "h-2 w-2 border";
    case "md":
      return "h-2.5 w-2.5 border";
    case "lg":
      return "h-3 w-3 border-2";
    case "xl":
      return "h-4 w-4 border-2";
    case "2xl":
      return "h-5 w-5 border-2";
    default:
      return "h-2.5 w-2.5 border";
  }
}

// ============================================================================
// Component
// ============================================================================

export function ProfileAvatar({
  src,
  name = "User",
  size = "md",
  editable = false,
  isUploading = false,
  onUpload,
  onDelete,
  showOnlineIndicator = false,
  isOnline = false,
  className,
}: ProfileAvatarProps) {
  const [showActions, setShowActions] = React.useState(false);
  const sizeClasses = getSizeClasses(size);
  const indicatorSize = getIndicatorSize(size);
  const initials = getInitials(name);

  const handleMouseEnter = () => {
    if (editable) setShowActions(true);
  };

  const handleMouseLeave = () => {
    if (editable) setShowActions(false);
  };

  return (
    <div
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="profile-avatar"
    >
      <Avatar className={cn(sizeClasses, "relative")}>
        <AvatarImage src={src || undefined} alt={name} />
        <AvatarFallback
          className={cn(
            "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-medium",
          )}
        >
          {initials || <User className="h-1/2 w-1/2" />}
        </AvatarFallback>
      </Avatar>

      {/* Online Indicator */}
      {showOnlineIndicator && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-background",
            indicatorSize,
            isOnline ? "bg-green-500" : "bg-gray-400",
          )}
          data-testid={`online-indicator-${isOnline ? "online" : "offline"}`}
        />
      )}

      {/* Edit Overlay */}
      {editable && (showActions || isUploading) && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 transition-opacity",
            isUploading ? "opacity-100" : "opacity-0 hover:opacity-100",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-1/3 w-1/3 animate-spin text-white" />
          ) : (
            <div className="flex gap-1">
              {onUpload && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-white hover:bg-white/20"
                  onClick={onUpload}
                  data-testid="avatar-upload-button"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
              {onDelete && src && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-white hover:bg-white/20"
                  onClick={onDelete}
                  data-testid="avatar-delete-button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProfileAvatar;
