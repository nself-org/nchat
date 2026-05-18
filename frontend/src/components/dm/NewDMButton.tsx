"use client";

import * as React from "react";
import { Plus, MessageSquarePlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDMStore } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface NewDMButtonProps {
  variant?: "default" | "icon" | "expanded";
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function NewDMButton({ variant = "icon", className }: NewDMButtonProps) {
  const { openNewDMModal, openGroupDMCreate } = useDMStore();

  if (variant === "icon") {
    return (
      <TooltipProvider delayDuration={300}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", className)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">New message</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>New message</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={openNewDMModal}>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New message
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openGroupDMCreate}>
              <Users className="mr-2 h-4 w-4" />
              New group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    );
  }

  if (variant === "expanded") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Button
          variant="default"
          className="w-full justify-start"
          onClick={openNewDMModal}
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New message
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={openGroupDMCreate}
        >
          <Users className="mr-2 h-4 w-4" />
          New group
        </Button>
      </div>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className={cn("gap-1.5", className)}
        >
          <Plus className="h-4 w-4" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={openNewDMModal}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New message
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openGroupDMCreate}>
          <Users className="mr-2 h-4 w-4" />
          New group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

NewDMButton.displayName = "NewDMButton";
