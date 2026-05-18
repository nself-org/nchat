"use client";

import * as React from "react";
import {
  X,
  User,
  Hash,
  Calendar,
  Link,
  FileIcon,
  Image,
  Code,
  AtSign,
  Pin,
  Star,
  MessageSquare,
  Filter,
  ChevronDown,
  Smile,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useSearchStore,
  type HasFilter,
  type IsFilter,
  type DateRange,
  selectHasActiveFilters,
  selectActiveFilterCount,
} from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface SearchFiltersProps {
  className?: string;
  /** Callback when a user filter is clicked (for user picker) */
  onSelectUser?: () => void;
  /** Callback when a channel filter is clicked (for channel picker) */
  onSelectChannel?: () => void;
  /** Callback when date range is clicked (for date picker) */
  onSelectDateRange?: () => void;
  /** User lookup function to get user names by ID */
  getUserName?: (userId: string) => string;
  /** Channel lookup function to get channel names by ID */
  getChannelName?: (channelId: string) => string;
}

// ============================================================================
// Filter Configuration
// ============================================================================

const hasFilterConfig: {
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

const isFilterConfig: {
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

export function SearchFilters({
  className,
  onSelectUser,
  onSelectChannel,
  onSelectDateRange,
  getUserName = (id) => id,
  getChannelName = (id) => id,
}: SearchFiltersProps) {
  const filters = useSearchStore((state) => state.filters);
  const hasActiveFilters = useSearchStore(selectHasActiveFilters);
  const activeFilterCount = useSearchStore(selectActiveFilterCount);
  const clearFilters = useSearchStore((state) => state.clearFilters);
  const removeFromUser = useSearchStore((state) => state.removeFromUser);
  const removeInChannel = useSearchStore((state) => state.removeInChannel);
  const setDateRange = useSearchStore((state) => state.setDateRange);
  const toggleHasFilter = useSearchStore((state) => state.toggleHasFilter);
  const toggleIsFilter = useSearchStore((state) => state.toggleIsFilter);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Quick filter buttons */}
      <div className="flex flex-wrap gap-2">
        {/* From user */}
        <FilterButton
          icon={User}
          label="From"
          active={filters.fromUsers.length > 0}
          count={filters.fromUsers.length}
          onClick={onSelectUser}
        />

        {/* In channel */}
        <FilterButton
          icon={Hash}
          label="In"
          active={filters.inChannels.length > 0}
          count={filters.inChannels.length}
          onClick={onSelectChannel}
        />

        {/* Date range */}
        <FilterButton
          icon={Calendar}
          label="Date"
          active={
            filters.dateRange.from !== null || filters.dateRange.to !== null
          }
          onClick={onSelectDateRange}
        />

        {/* Has dropdown */}
        <HasFilterDropdown
          selectedFilters={filters.has}
          onToggle={toggleHasFilter}
        />

        {/* Is dropdown */}
        <IsFilterDropdown
          selectedFilters={filters.is}
          onToggle={toggleIsFilter}
        />

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear all ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {/* User chips */}
          {filters.fromUsers.map((userId) => (
            <FilterChip
              key={userId}
              label={`From: ${getUserName(userId)}`}
              onRemove={() => removeFromUser(userId)}
            />
          ))}

          {/* Channel chips */}
          {filters.inChannels.map((channelId) => (
            <FilterChip
              key={channelId}
              label={`In: #${getChannelName(channelId)}`}
              onRemove={() => removeInChannel(channelId)}
            />
          ))}

          {/* Date range chip */}
          {(filters.dateRange.from || filters.dateRange.to) && (
            <FilterChip
              label={formatDateRange(filters.dateRange)}
              onRemove={() => setDateRange({ from: null, to: null })}
            />
          )}

          {/* Has filter chips */}
          {filters.has.map((filter) => {
            const config = hasFilterConfig.find((c) => c.value === filter);
            return (
              <FilterChip
                key={filter}
                label={`Has: ${config?.label ?? filter}`}
                onRemove={() => toggleHasFilter(filter)}
              />
            );
          })}

          {/* Is filter chips */}
          {filters.is.map((filter) => {
            const config = isFilterConfig.find((c) => c.value === filter);
            return (
              <FilterChip
                key={filter}
                label={`Is: ${config?.label ?? filter}`}
                onRemove={() => toggleIsFilter(filter)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Filter Button
// ============================================================================

interface FilterButtonProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}

function FilterButton({
  icon: Icon,
  label,
  active = false,
  count,
  onClick,
}: FilterButtonProps) {
  return (
    <Button
      variant={active ? "secondary" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn("h-8 gap-1.5", active && "border-primary/50")}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
          {count}
        </Badge>
      )}
      <ChevronDown className="h-3 w-3 opacity-50" />
    </Button>
  );
}

// ============================================================================
// Filter Chip
// ============================================================================

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="h-7 gap-1 px-2 pr-1 text-xs font-normal"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// ============================================================================
// Has Filter Dropdown
// ============================================================================

interface HasFilterDropdownProps {
  selectedFilters: HasFilter[];
  onToggle: (filter: HasFilter) => void;
}

function HasFilterDropdown({
  selectedFilters,
  onToggle,
}: HasFilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant={selectedFilters.length > 0 ? "secondary" : "outline"}
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(
          "h-8 gap-1.5",
          selectedFilters.length > 0 && "border-primary/50",
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        Has
        {selectedFilters.length > 0 && (
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
            {selectedFilters.length}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
          {hasFilterConfig.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                "hover:text-accent-foreground hover:bg-accent",
                selectedFilters.includes(value) && "bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {selectedFilters.includes(value) && (
                <span className="ml-auto text-primary">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Is Filter Dropdown
// ============================================================================

interface IsFilterDropdownProps {
  selectedFilters: IsFilter[];
  onToggle: (filter: IsFilter) => void;
}

function IsFilterDropdown({
  selectedFilters,
  onToggle,
}: IsFilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant={selectedFilters.length > 0 ? "secondary" : "outline"}
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(
          "h-8 gap-1.5",
          selectedFilters.length > 0 && "border-primary/50",
        )}
      >
        <Pin className="h-3.5 w-3.5" />
        Is
        {selectedFilters.length > 0 && (
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
            {selectedFilters.length}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
          {isFilterConfig.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                "hover:text-accent-foreground hover:bg-accent",
                selectedFilters.includes(value) && "bg-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {selectedFilters.includes(value) && (
                <span className="ml-auto text-primary">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Inline Filters (Compact Version)
// ============================================================================

export interface InlineFiltersProps {
  className?: string;
}

export function InlineFilters({ className }: InlineFiltersProps) {
  const filters = useSearchStore((state) => state.filters);
  const toggleHasFilter = useSearchStore((state) => state.toggleHasFilter);
  const toggleIsFilter = useSearchStore((state) => state.toggleIsFilter);

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {hasFilterConfig.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={filters.has.includes(value) ? "secondary" : "ghost"}
          size="sm"
          onClick={() => toggleHasFilter(value)}
          className={cn(
            "h-7 gap-1 px-2 text-xs",
            filters.has.includes(value) && "border-primary/30 border",
          )}
        >
          <Icon className="h-3 w-3" />
          {label}
        </Button>
      ))}
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

export default SearchFilters;
