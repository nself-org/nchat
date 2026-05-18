"use client";

/**
 * WorkflowList - List of all workflows
 *
 * Displays workflows in a grid or list view with filtering and sorting
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { WorkflowCard } from "./WorkflowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Grid3X3,
  List,
  SortAsc,
  Filter,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import type { Workflow, WorkflowStatus } from "@/lib/workflows/workflow-types";

interface WorkflowListProps {
  workflows: Workflow[];
  isLoading?: boolean;
  onCreateNew?: () => void;
  onEdit?: (workflow: Workflow) => void;
  onDuplicate?: (workflow: Workflow) => void;
  onDelete?: (workflow: Workflow) => void;
  onToggleStatus?: (workflow: Workflow) => void;
  className?: string;
}

type ViewMode = "grid" | "list";
type SortBy = "name" | "updatedAt" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

export function WorkflowList({
  workflows,
  isLoading = false,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  className,
}: WorkflowListProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    WorkflowStatus | "all"
  >("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<SortBy>("updatedAt");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");

  // Get unique categories from workflows
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    workflows.forEach((w) => {
      if (w.settings.category) cats.add(w.settings.category);
      if (w.metadata?.category) cats.add(w.metadata.category);
    });
    return Array.from(cats).sort();
  }, [workflows]);

  // Filter and sort workflows
  const filteredWorkflows = React.useMemo(() => {
    let result = [...workflows];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.description?.toLowerCase().includes(query) ||
          w.settings.tags?.some((t) => t.toLowerCase().includes(query)),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((w) => w.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(
        (w) =>
          w.settings.category === categoryFilter ||
          w.metadata?.category === categoryFilter,
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "updatedAt":
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "createdAt":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [workflows, searchQuery, statusFilter, categoryFilter, sortBy, sortOrder]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workflows</h2>
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="mr-1 h-4 w-4" />
            New Workflow
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8"
          />
        </div>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as WorkflowStatus | "all")}
        >
          <SelectTrigger className="h-9 w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Category filter */}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <SortAsc className="mr-1 h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSortBy("updatedAt");
                setSortOrder("desc");
              }}
            >
              Recently updated
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy("createdAt");
                setSortOrder("desc");
              }}
            >
              Recently created
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy("name");
                setSortOrder("asc");
              }}
            >
              Name (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy("name");
                setSortOrder("desc");
              }}
            >
              Name (Z-A)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy("status");
                setSortOrder("asc");
              }}
            >
              Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View mode toggle */}
        <div className="flex items-center rounded-md border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 rounded-r-none"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-9 rounded-l-none"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredWorkflows.length} workflow
        {filteredWorkflows.length !== 1 ? "s" : ""}
        {(searchQuery || statusFilter !== "all" || categoryFilter !== "all") &&
          " found"}
      </p>

      {/* Workflow grid/list */}
      {filteredWorkflows.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No workflows found</p>
          {onCreateNew && (
            <Button variant="outline" className="mt-4" onClick={onCreateNew}>
              <Plus className="mr-1 h-4 w-4" />
              Create your first workflow
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              variant="list"
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default WorkflowList;
