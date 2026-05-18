"use client";

/**
 * CommandCard - Command preview card
 */

import {
  Hash,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Power,
  PowerOff,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { commandCategories } from "@/lib/slash-commands/built-in-commands";
import type { SlashCommand } from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandCardProps {
  command: SlashCommand;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleEnabled?: () => void;
  compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommandCard({
  command,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleEnabled,
  compact = false,
}: CommandCardProps) {
  const category =
    commandCategories[command.category as keyof typeof commandCategories];

  if (compact) {
    return (
      <div
        className={cn(
          "hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors",
          !command.isEnabled && "opacity-60",
        )}
      >
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded text-primary">
          <Hash className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <code className="font-mono text-sm text-primary">
            /{command.trigger}
          </code>
          <p className="truncate text-xs text-muted-foreground">
            {command.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "group relative transition-all hover:shadow-md",
        !command.isEnabled && "opacity-60",
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg text-primary">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm font-medium text-primary">
                  /{command.trigger}
                </code>
                {!command.isEnabled && (
                  <Badge variant="secondary" className="text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
              <h3 className="font-medium">{command.name}</h3>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!command.isBuiltIn && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onToggleEnabled}>
                {command.isEnabled ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Disable
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Enable
                  </>
                )}
              </DropdownMenuItem>
              {!command.isBuiltIn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {command.description}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center gap-2">
          {/* Category */}
          <Badge variant="outline" className="text-xs">
            {category?.name || command.category}
          </Badge>

          {/* Built-in badge */}
          {command.isBuiltIn && (
            <Badge variant="secondary" className="text-xs">
              Built-in
            </Badge>
          )}

          {/* Arguments count */}
          {command.arguments && command.arguments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {command.arguments.length} arg
              {command.arguments.length !== 1 ? "s" : ""}
            </Badge>
          )}

          {/* Aliases */}
          {command.aliases && command.aliases.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Tag className="mr-1 h-3 w-3" />
              {command.aliases.length}
            </Badge>
          )}
        </div>

        {/* Usage preview on hover */}
        <div className="bg-muted/50 mt-3 overflow-hidden rounded p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <code className="text-xs text-muted-foreground">
            {command.usage || `/${command.trigger}`}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}

export default CommandCard;
