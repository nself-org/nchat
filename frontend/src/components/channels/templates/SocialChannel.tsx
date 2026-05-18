"use client";

import * as React from "react";
import { Coffee, Heart, Image as ImageIcon, Smile, Music } from "lucide-react";
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

export interface SocialChannelProps {
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SocialChannel({
  isSelected = false,
  onClick,
  className,
}: SocialChannelProps) {
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
          <div className="rounded-lg bg-pink-500/10 p-3">
            <Coffee className="h-6 w-6 text-pink-600" />
          </div>
          <Badge variant="secondary">Casual</Badge>
        </div>
        <CardTitle className="text-lg">Social / Random</CardTitle>
        <CardDescription>
          A casual space for off-topic conversations, fun, and team bonding. The
          digital water cooler.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Included features:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Smile className="h-3 w-3" />
              GIFs & Stickers
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Heart className="h-3 w-3" />
              Reactions
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <ImageIcon className="h-3 w-3" />
              Media sharing
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Music className="h-3 w-3" />
              Voice messages
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Permissions:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>- Everyone can post and reply</li>
            <li>- Guests are welcome</li>
            <li>- All media types allowed</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Best for:</strong> Team bonding, sharing memes, celebrating
            wins, casual conversations, or anything that does not fit in other
            channels.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

SocialChannel.displayName = "SocialChannel";
