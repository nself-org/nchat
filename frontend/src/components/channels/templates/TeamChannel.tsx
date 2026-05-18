"use client";

import * as React from "react";
import { Users, MessageSquare, FileText, AtSign, Bell } from "lucide-react";
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

export interface TeamChannelProps {
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TeamChannel({
  isSelected = false,
  onClick,
  className,
}: TeamChannelProps) {
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
          <div className="rounded-lg bg-green-500/10 p-3">
            <Users className="h-6 w-6 text-green-600" />
          </div>
          <Badge variant="secondary">Popular</Badge>
        </div>
        <CardTitle className="text-lg">Team Channel</CardTitle>
        <CardDescription>
          A collaborative space for team discussions, updates, and coordination.
          Perfect for department or project teams.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Included features:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              Threaded discussions
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              File sharing
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <AtSign className="h-3 w-3" />
              Mentions
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Bell className="h-3 w-3" />
              Notifications
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Best for:</strong> Engineering teams, marketing departments,
            cross-functional projects, or any group that needs a dedicated space
            for ongoing collaboration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

TeamChannel.displayName = "TeamChannel";
