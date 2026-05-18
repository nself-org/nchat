"use client";

/**
 * BuiltInCommands - Display list of built-in commands
 */

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  builtInCommands,
  commandCategories,
} from "@/lib/slash-commands/built-in-commands";
import type {
  CommandCategory,
  SlashCommand,
} from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface BuiltInCommandsProps {
  onSelectCommand?: (command: SlashCommand) => void;
}

// ============================================================================
// Component
// ============================================================================

export function BuiltInCommands({ onSelectCommand }: BuiltInCommandsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["general", "channel"]),
  );

  // Filter commands by search
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return builtInCommands;

    const query = searchQuery.toLowerCase();
    return builtInCommands.filter(
      (cmd) =>
        cmd.trigger.toLowerCase().includes(query) ||
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.aliases?.some((a) => a.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<CommandCategory, SlashCommand[]> = {
      general: [],
      channel: [],
      user: [],
      message: [],
      moderation: [],
      fun: [],
      utility: [],
      integration: [],
      custom: [],
    };

    for (const cmd of filteredCommands) {
      const category = cmd.category || "custom";
      if (groups[category]) {
        groups[category].push(cmd);
      }
    }

    // Sort commands within each category
    Object.values(groups).forEach((cmds) =>
      cmds.sort((a, b) => (a.order || 0) - (b.order || 0)),
    );

    return groups;
  }, [filteredCommands]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Built-in Commands</h2>
        <p className="text-sm text-muted-foreground">
          {builtInCommands.length} commands available out of the box
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search built-in commands..."
          className="pl-9"
        />
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Found {filteredCommands.length} command
          {filteredCommands.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Command Categories */}
      <div className="space-y-4">
        {Object.entries(groupedCommands).map(([category, commands]) => {
          if (commands.length === 0) return null;

          const categoryInfo =
            commandCategories[category as keyof typeof commandCategories];
          const isExpanded = expandedCategories.has(category);

          return (
            <Collapsible
              key={category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="hover:bg-muted/50 w-full justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {categoryInfo?.name || category}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {commands.length}
                    </Badge>
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-2 rounded-lg border">
                  {commands.map((command, index) => (
                    <CommandRow
                      key={command.id}
                      command={command}
                      isLast={index === commands.length - 1}
                      onSelect={onSelectCommand}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredCommands.length === 0 && searchQuery && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No built-in commands match "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Command Row
// ============================================================================

interface CommandRowProps {
  command: SlashCommand;
  isLast: boolean;
  onSelect?: (command: SlashCommand) => void;
}

function CommandRow({ command, isLast, onSelect }: CommandRowProps) {
  const handleClick = () => onSelect?.(command);

  const rowContent = (
    <>
      {/* Trigger */}
      <div className="w-28 shrink-0">
        <code className="font-mono text-sm text-primary">
          /{command.trigger}
        </code>
      </div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{command.description}</p>
        {command.aliases && command.aliases.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Aliases: {command.aliases.map((a) => `/${a}`).join(", ")}
          </p>
        )}
      </div>

      {/* Usage & Info */}
      <div className="flex items-center gap-2">
        {command.arguments && command.arguments.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {command.arguments.length} arg
            {command.arguments.length !== 1 ? "s" : ""}
          </Badge>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Info className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <div className="space-y-2">
                <p className="font-medium">{command.name}</p>
                <p className="text-sm text-muted-foreground">
                  {command.helpText || command.description}
                </p>
                <code className="block text-xs">
                  {command.usage || `/${command.trigger}`}
                </code>
                <div className="flex gap-2 pt-1">
                  <Badge variant="outline" className="text-xs">
                    {command.permissions?.minRole || "member"}+
                  </Badge>
                  {command.permissions?.allowGuests && (
                    <Badge variant="secondary" className="text-xs">
                      Guests OK
                    </Badge>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <div
        className={cn(
          "hover:bg-muted/30 flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors",
          !isLast && "border-b",
        )}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {rowContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hover:bg-muted/30 flex items-center gap-4 px-4 py-3 transition-colors",
        !isLast && "border-b",
      )}
    >
      {rowContent}
    </div>
  );
}

export default BuiltInCommands;
