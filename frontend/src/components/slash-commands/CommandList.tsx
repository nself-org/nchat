"use client";

/**
 * CommandList - List all custom commands
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Filter,
  Grid,
  List,
  SortAsc,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Power,
  PowerOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandCard } from "./CommandCard";
import {
  useSlashCommandsStore,
  selectFilteredCommands,
} from "@/stores/slash-commands-store";
import { commandCategories } from "@/lib/slash-commands/built-in-commands";
import type {
  CommandCategory,
  SlashCommand,
} from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandListProps {
  onCreateNew?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showBuiltIn?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CommandList({
  onCreateNew,
  onEdit,
  onDelete,
  showBuiltIn = true,
}: CommandListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "trigger" | "category">("name");

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    enableCommand,
    disableCommand,
    removeCommand,
  } = useSlashCommandsStore();

  const filteredCommands = useSlashCommandsStore(selectFilteredCommands);

  // Filter and sort commands
  const displayCommands = useMemo(() => {
    let commands = filteredCommands;

    // Filter by built-in status
    if (!showBuiltIn) {
      commands = commands.filter((c) => !c.isBuiltIn);
    }

    // Sort
    return commands.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "trigger":
          return a.trigger.localeCompare(b.trigger);
        case "category":
          return (a.category || "").localeCompare(b.category || "");
        default:
          return 0;
      }
    });
  }, [filteredCommands, showBuiltIn, sortBy]);

  // Group by category for list view
  const groupedCommands = useMemo(() => {
    if (selectedCategory !== "all") {
      return { [selectedCategory]: displayCommands };
    }

    return displayCommands.reduce(
      (acc, cmd) => {
        const cat = cmd.category || "custom";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(cmd);
        return acc;
      },
      {} as Record<string, SlashCommand[]>,
    );
  }, [displayCommands, selectedCategory]);

  const handleToggleEnabled = (command: SlashCommand) => {
    if (command.isEnabled) {
      disableCommand(command.id);
    } else {
      enableCommand(command.id);
    }
  };

  const handleDelete = (command: SlashCommand) => {
    if (command.isBuiltIn) return;
    removeCommand(command.id);
    onDelete?.(command.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Commands</h2>
          <p className="text-sm text-muted-foreground">
            {displayCommands.length} command
            {displayCommands.length !== 1 ? "s" : ""} available
          </p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Command
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={selectedCategory}
          onValueChange={(value) =>
            setSelectedCategory(value as CommandCategory | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(commandCategories).map(([key, cat]) => (
              <SelectItem key={key} value={key}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as typeof sortBy)}
        >
          <SelectTrigger className="w-[140px]">
            <SortAsc className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="trigger">Trigger</SelectItem>
            <SelectItem value="category">Category</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex rounded-lg border">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-none rounded-l-lg",
              viewMode === "grid" && "bg-muted",
            )}
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-none rounded-r-lg",
              viewMode === "list" && "bg-muted",
            )}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {displayCommands.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No commands found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchQuery
              ? "Try a different search term"
              : "Create your first custom command"}
          </p>
          {onCreateNew && !searchQuery && (
            <Button onClick={onCreateNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Command
            </Button>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && displayCommands.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {displayCommands.map((command) => (
              <motion.div
                key={command.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                layout
              >
                <CommandCard
                  command={command}
                  onEdit={() => onEdit?.(command.id)}
                  onDelete={() => handleDelete(command)}
                  onToggleEnabled={() => handleToggleEnabled(command)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && displayCommands.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedCommands).map(([category, commands]) => (
            <div key={category}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Badge variant="outline">
                  {commandCategories[category as keyof typeof commandCategories]
                    ?.name || category}
                </Badge>
                <span>{commands.length}</span>
              </h3>
              <div className="rounded-lg border">
                {commands.map((command, index) => (
                  <div
                    key={command.id}
                    className={cn(
                      "flex items-center gap-4 p-4",
                      index !== commands.length - 1 && "border-b",
                    )}
                  >
                    {/* Command Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-primary">
                          /{command.trigger}
                        </code>
                        {!command.isEnabled && (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                        {command.isBuiltIn && (
                          <Badge variant="outline" className="text-xs">
                            Built-in
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {command.description}
                      </p>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!command.isBuiltIn && (
                          <>
                            <DropdownMenuItem
                              onClick={() => onEdit?.(command.id)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleToggleEnabled(command)}
                        >
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
                              onClick={() => handleDelete(command)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommandList;
