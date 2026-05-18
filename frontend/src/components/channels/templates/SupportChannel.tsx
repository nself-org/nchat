"use client";

import * as React from "react";
import {
  HelpCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
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

export interface SupportChannelProps {
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SupportChannel({
  isSelected = false,
  onClick,
  className,
}: SupportChannelProps) {
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
          <div className="rounded-lg bg-red-500/10 p-3">
            <HelpCircle className="h-6 w-6 text-red-600" />
          </div>
          <Badge variant="outline">Help Desk</Badge>
        </div>
        <CardTitle className="text-lg">Support / Help</CardTitle>
        <CardDescription>
          A channel for questions, support requests, and getting help. Includes
          thread-based Q&A and slow mode.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Included features:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              Threaded Q&A
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Slow mode (30s)
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <CheckCircle className="h-3 w-3" />
              Resolved marking
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <FileText className="h-3 w-3" />
              File attachments
            </Badge>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Optimizations:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>- Slow mode prevents spam</li>
            <li>- Messages archived after 90 days</li>
            <li>- Encouraged to use threads</li>
          </ul>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Best for:</strong> IT help desk, customer support, FAQ
            channels, onboarding questions, or any scenario where people need
            assistance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

SupportChannel.displayName = "SupportChannel";
