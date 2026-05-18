"use client";

import * as React from "react";
import { Megaphone, Lock, Heart, Pin, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

export interface AnnouncementsChannelProps {
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AnnouncementsChannel({
  isSelected = false,
  onClick,
  className,
}: AnnouncementsChannelProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "border-primary ring-1 ring-primary",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-yellow-500/10 p-3">
            <Megaphone className="h-6 w-6 text-yellow-600" />
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            Moderated
          </Badge>
        </div>
        <CardTitle className="text-lg">Announcements</CardTitle>
        <CardDescription>
          A read-only channel for important announcements and updates. Only
          admins and moderators can post.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Included features:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Heart className="h-3 w-3" />
              Reactions
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Pin className="h-3 w-3" />
              Pinned messages
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Bell className="h-3 w-3" />
              @everyone mentions
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Permissions:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>- Only admins and moderators can post</li>
            <li>- Members can react but not reply</li>
            <li>- Threads are disabled</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Best for:</strong> Company-wide announcements, policy
            updates, product releases, or any communication that needs to reach
            everyone without clutter from replies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

AnnouncementsChannel.displayName = "AnnouncementsChannel";
