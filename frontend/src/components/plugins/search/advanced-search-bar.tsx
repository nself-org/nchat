/**
 * Advanced Search Bar Component
 * Search interface with auto-suggestions and filters
 */

"use client";

import { useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  useAdvancedSearch,
  useSearchSuggestions,
} from "@/hooks/use-search-plugin";
import type { SearchFilters } from "@/services/plugins/search.service";

interface AdvancedSearchBarProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
}

export function AdvancedSearchBar({
  onSearch,
  placeholder = "Search messages, channels, users...",
}: AdvancedSearchBarProps) {
  const [inputValue, setInputValue] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const { suggestions } = useSearchSuggestions(inputValue);
  const { setQuery, filters, setFilters, search } = useAdvancedSearch();

  const handleSearch = () => {
    setQuery(inputValue);
    search();
    onSearch?.(inputValue, filters);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9 pr-9"
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              onClick={() => setInputValue("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className="h-4 w-4" />
              {hasFilters && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Search Filters</h4>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-from">From user</Label>
                <Input
                  id="filter-from"
                  placeholder="@username"
                  value={filters.from || ""}
                  onChange={(e) => handleFilterChange("from", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-in">In channel</Label>
                <Input
                  id="filter-in"
                  placeholder="#channel-name"
                  value={filters.in || ""}
                  onChange={(e) => handleFilterChange("in", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-after">After date</Label>
                <Input
                  id="filter-after"
                  type="date"
                  value={filters.after || ""}
                  onChange={(e) => handleFilterChange("after", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-before">Before date</Label>
                <Input
                  id="filter-before"
                  type="date"
                  value={filters.before || ""}
                  onChange={(e) => handleFilterChange("before", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-has">Has attachment</Label>
                <Input
                  id="filter-has"
                  placeholder="image, file, link"
                  value={filters.has || ""}
                  onChange={(e) => handleFilterChange("has", e.target.value)}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button onClick={handleSearch}>Search</Button>
      </div>

      {suggestions.length > 0 && inputValue && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setInputValue(suggestion.value);
                  handleSearch();
                }}
              >
                <span className="font-medium">{suggestion.label}</span>
                {suggestion.type && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {suggestion.type}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
