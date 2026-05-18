"use client";

import * as React from "react";
import {
  FolderKanban,
  Lock,
  GitBranch,
  Calendar,
  FileText,
  CheckSquare,
} from "lucide-react";
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

export interface ProjectChannelProps {
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ProjectChannel({
  isSelected = false,
  onClick,
  className,
}: ProjectChannelProps) {
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
          <div className="rounded-lg bg-purple-500/10 p-3">
            <FolderKanban className="h-6 w-6 text-purple-600" />
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            Private
          </Badge>
        </div>
        <CardTitle className="text-lg">Project Channel</CardTitle>
        <CardDescription>
          A private channel for project-specific discussions, updates, and
          collaboration. Invite-only access for project members.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Included features:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <GitBranch className="h-3 w-3" />
              GitHub integration
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              Reminders
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              Document sharing
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <CheckSquare className="h-3 w-3" />
              Task mentions
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Permissions:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>- Private by default</li>
            <li>- Only invited members can access</li>
            <li>- Full feature access for all members</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Best for:</strong> Software projects, marketing campaigns,
            product launches, or any initiative with a defined team and
            timeline.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

ProjectChannel.displayName = "ProjectChannel";
