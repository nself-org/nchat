"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  User,
  Hash,
  Link,
  FileIcon,
  Image,
  Code,
  AtSign,
  Pin,
  Star,
  MessageSquare,
  Save,
  RotateCcw,
  X,
  ChevronDown,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSearchStore,
  type HasFilter,
  type IsFilter,
  type DateRange,
  selectHasActiveFilters,
} from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface AdvancedSearchProps {
  /** Callback when search is submitted */
  onSearch?: () => void;
  /** Callback when save search is clicked */
  onSaveSearch?: (name: string) => void;
  /** User lookup function to get user names by ID */
  getUserName?: (userId: string) => string;
  /** Channel lookup function to get channel names by ID */
  getChannelName?: (channelId: string) => string;
  /** Callback to open user picker */
  onSelectUser?: () => void;
  /** Callback to open channel picker */
  onSelectChannel?: () => void;
  /** Callback to open date picker */
  onSelectDateRange?: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Filter Configuration
// ============================================================================

const hasFilterOptions: {
  value: HasFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "link", label: "Links", icon: Link },
  { value: "file", label: "Files", icon: FileIcon },
  { value: "image", label: "Images", icon: Image },
  { value: "code", label: "Code", icon: Code },
  { value: "mention", label: "Mentions", icon: AtSign },
  { value: "reaction", label: "Reactions", icon: Smile },
];

const isFilterOptions: {
  value: IsFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "pinned", label: "Pinned", icon: Pin },
  { value: "starred", label: "Starred", icon: Star },
  { value: "thread", label: "In thread", icon: MessageSquare },
  { value: "unread", label: "Unread", icon: MessageSquare },
];

// ============================================================================
// Main Component
// ============================================================================

export function AdvancedSearch({
  onSearch,
  onSaveSearch,
  getUserName = (id) => id,
  getChannelName = (id) => id,
  onSelectUser,
  onSelectChannel,
  onSelectDateRange,
  className,
}: AdvancedSearchProps) {
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [searchName, setSearchName] = React.useState("");

  // Get store state
  const query = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const filters = useSearchStore((state) => state.filters);
  const hasActiveFilters = useSearchStore(selectHasActiveFilters);
  const clearFilters = useSearchStore((state) => state.clearFilters);
  const removeFromUser = useSearchStore((state) => state.removeFromUser);
  const removeInChannel = useSearchStore((state) => state.removeInChannel);
  const setDateRange = useSearchStore((state) => state.setDateRange);
  const toggleHasFilter = useSearchStore((state) => state.toggleHasFilter);
  const toggleIsFilter = useSearchStore((state) => state.toggleIsFilter);
  const clearQuery = useSearchStore((state) => state.clearQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.();
  };

  const handleReset = () => {
    clearQuery();
    clearFilters();
  };

  const handleSaveSearch = () => {
    if (searchName.trim()) {
      onSaveSearch?.(searchName.trim());
      setSearchName("");
      setSaveDialogOpen(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col", className)}>
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Search query */}
          <div className="space-y-2">
            <Label htmlFor="search-query" className="text-sm font-medium">
              Search query
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter keywords..."
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use quotes for exact phrases: &quot;project update&quot;
            </p>
          </div>

          {/* From users */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">From</Label>
            <div className="flex flex-wrap gap-2">
              {filters.fromUsers.map((userId) => (
                <Badge
                  key={userId}
                  variant="secondary"
                  className="h-7 gap-1 px-2 pr-1"
                >
                  <User className="h-3 w-3" />
                  {getUserName(userId)}
                  <button
                    type="button"
                    onClick={() => removeFromUser(userId)}
                    className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSelectUser}
                className="h-7 gap-1 px-2"
              >
                <User className="h-3 w-3" />
                Add person
              </Button>
            </div>
          </div>

          {/* In channels */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">In channel</Label>
            <div className="flex flex-wrap gap-2">
              {filters.inChannels.map((channelId) => (
                <Badge
                  key={channelId}
                  variant="secondary"
                  className="h-7 gap-1 px-2 pr-1"
                >
                  <Hash className="h-3 w-3" />
                  {getChannelName(channelId)}
                  <button
                    type="button"
                    onClick={() => removeInChannel(channelId)}
                    className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSelectChannel}
                className="h-7 gap-1 px-2"
              >
                <Hash className="h-3 w-3" />
                Add channel
              </Button>
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date range</Label>
            <div className="flex items-center gap-2">
              {filters.dateRange.from || filters.dateRange.to ? (
                <Badge variant="secondary" className="h-7 gap-1 px-2 pr-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateRange(filters.dateRange)}
                  <button
                    type="button"
                    onClick={() => setDateRange({ from: null, to: null })}
                    className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSelectDateRange}
                  className="h-7 gap-1 px-2"
                >
                  <Calendar className="h-3 w-3" />
                  Select dates
                </Button>
              )}
            </div>
          </div>

          {/* Has filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message has</Label>
            <div className="flex flex-wrap gap-2">
              {hasFilterOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={
                    filters.has.includes(value) ? "secondary" : "outline"
                  }
                  size="sm"
                  onClick={() => toggleHasFilter(value)}
                  className={cn(
                    "h-7 gap-1 px-2",
                    filters.has.includes(value) && "border-primary/50",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Is filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Message is</Label>
            <div className="flex flex-wrap gap-2">
              {isFilterOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={filters.is.includes(value) ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggleIsFilter(value)}
                  className={cn(
                    "h-7 gap-1 px-2",
                    filters.is.includes(value) && "border-primary/50",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Boolean operators hint */}
          <div className="bg-muted/50 rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-medium">Search tips</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <code className="rounded bg-muted px-1">AND</code> - Both terms
                must appear
              </li>
              <li>
                <code className="rounded bg-muted px-1">OR</code> - Either term
                can appear
              </li>
              <li>
                <code className="rounded bg-muted px-1">-term</code> - Exclude
                messages with term
              </li>
              <li>
                <code className="rounded bg-muted px-1">
                  &quot;exact phrase&quot;
                </code>{" "}
                - Match exact phrase
              </li>
            </ul>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between border-t p-4">
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 gap-1 px-2"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}

          {(query || hasActiveFilters) && (
            <div className="relative">
              {saveDialogOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Search name"
                    className="h-8 w-40"
                    autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveSearch}
                    disabled={!searchName.trim()}
                    className="h-8"
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSaveDialogOpen(false)}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                  className="h-8 gap-1 px-2"
                >
                  <Save className="h-3 w-3" />
                  Save search
                </Button>
              )}
            </div>
          )}
        </div>

        <Button type="submit" size="sm" className="h-8 gap-1 px-4">
          <Search className="h-3 w-3" />
          Search
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Saved Searches List
// ============================================================================

export interface SavedSearchesListProps {
  className?: string;
  onSelect?: (searchId: string) => void;
  onDelete?: (searchId: string) => void;
}

export function SavedSearchesList({
  className,
  onSelect,
  onDelete,
}: SavedSearchesListProps) {
  const savedSearches = useSearchStore((state) => state.savedSearches);
  const removeSavedSearch = useSearchStore((state) => state.removeSavedSearch);
  const loadSavedSearch = useSearchStore((state) => state.loadSavedSearch);

  const handleSelect = (search: (typeof savedSearches)[0]) => {
    loadSavedSearch(search);
    onSelect?.(search.id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSavedSearch(id);
    onDelete?.(id);
  };

  if (savedSearches.length === 0) {
    return (
      <div
        className={cn(
          "py-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No saved searches yet
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {savedSearches.map((search) => (
        <button
          key={search.id}
          type="button"
          onClick={() => handleSelect(search)}
          className={cn(
            "group flex w-full items-center gap-2 rounded-md px-2 py-1.5",
            "text-sm transition-colors hover:bg-accent",
          )}
        >
          <Save className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate font-medium">{search.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {search.query || "Filters only"}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => handleDelete(e, search.id)}
            className={cn(
              "shrink-0 rounded-full p-1 opacity-0 transition-opacity",
              "hover:bg-muted-foreground/20 group-hover:opacity-100",
            )}
            aria-label="Delete saved search"
          >
            <X className="h-3 w-3" />
          </button>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Compact Advanced Search (Collapsible)
// ============================================================================

export interface CompactAdvancedSearchProps extends AdvancedSearchProps {
  /** Whether the advanced options are expanded */
  expanded?: boolean;
  /** Callback when expansion state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

export function CompactAdvancedSearch({
  expanded = false,
  onExpandedChange,
  ...props
}: CompactAdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);
  const hasActiveFilters = useSearchStore(selectHasActiveFilters);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  };

  return (
    <div className={props.className}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="mb-2 h-7 gap-1 px-2 text-xs"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
        Advanced options
        {hasActiveFilters && !isExpanded && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            Active
          </Badge>
        )}
      </Button>

      {isExpanded && (
        <AdvancedSearch {...props} className="rounded-lg border" />
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatDateRange(range: DateRange): string {
  if (range.from && range.to) {
    return `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`;
  }
  if (range.from) {
    return `After ${format(range.from, "MMM d, yyyy")}`;
  }
  if (range.to) {
    return `Before ${format(range.to, "MMM d, yyyy")}`;
  }
  return "Date range";
}

export default AdvancedSearch;
