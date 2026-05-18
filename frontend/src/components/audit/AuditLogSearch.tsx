"use client";

/**
 * AuditLogSearch - Search component for audit logs
 */

import { useState, useCallback, useEffect } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

interface AuditLogSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  recentSearches?: string[];
  onClearRecent?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const popularSearches = [
  "failed login",
  "password change",
  "role change",
  "api key",
  "security",
  "admin",
  "error",
  "critical",
];

// ============================================================================
// Component
// ============================================================================

export function AuditLogSearch({
  value,
  onChange,
  onSearch,
  placeholder = "Search audit logs...",
  className,
  showSuggestions = true,
  recentSearches = [],
  onClearRecent,
}: AuditLogSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (onSearch && value) {
        onSearch(value);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [value, onSearch]);

  const handleClear = useCallback(() => {
    onChange("");
    if (onSearch) {
      onSearch("");
    }
  }, [onChange, onSearch]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      onChange(suggestion);
      if (onSearch) {
        onSearch(suggestion);
      }
      setShowDropdown(false);
    },
    [onChange, onSearch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        onSearch(value);
        setShowDropdown(false);
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [onSearch, value],
  );

  const shouldShowDropdown =
    showSuggestions && showDropdown && isFocused && !value;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowDropdown(true);
          }}
          onBlur={() => {
            // Delay to allow click on suggestions
            setTimeout(() => {
              setIsFocused(false);
              setShowDropdown(false);
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {shouldShowDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="border-b p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </span>
                {onClearRecent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={onClearRecent}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {recentSearches.slice(0, 5).map((search, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="hover:bg-secondary/80 cursor-pointer"
                    onClick={() => handleSuggestionClick(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          <div className="p-2">
            <span className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Popular Searches
            </span>
            <div className="flex flex-wrap gap-1">
              {popularSearches.map((search, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSuggestionClick(search)}
                >
                  {search}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Search with Debounce Hook
// ============================================================================

export function useAuditSearch(initialValue = "", debounceMs = 300) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedValue(searchValue);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchValue, debounceMs]);

  return {
    searchValue,
    setSearchValue,
    debouncedValue,
    isSearching,
  };
}
