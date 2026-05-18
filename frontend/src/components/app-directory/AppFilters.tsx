"use client";

import * as React from "react";
import { X, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useAppDirectoryStore,
  selectHasActiveFilters,
} from "@/stores/app-directory-store";
import type { AppType, AppPricing } from "@/lib/app-directory/app-types";

interface AppFiltersProps {
  className?: string;
}

const APP_TYPES: { value: AppType; label: string }[] = [
  { value: "bot", label: "Bots" },
  { value: "integration", label: "Integrations" },
  { value: "plugin", label: "Plugins" },
  { value: "workflow", label: "Workflows" },
];

const PRICING_OPTIONS: { value: AppPricing; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "paid", label: "Paid" },
];

const RATING_OPTIONS = [
  { value: 4, label: "4 stars & up" },
  { value: 3, label: "3 stars & up" },
  { value: 2, label: "2 stars & up" },
];

export function AppFilters({ className }: AppFiltersProps) {
  const { searchFilters, setSearchFilters, resetSearchFilters } =
    useAppDirectoryStore();
  const hasActiveFilters = useAppDirectoryStore(selectHasActiveFilters);
  const [isOpen, setIsOpen] = React.useState(false);

  const activeFilterCount =
    searchFilters.types.length +
    searchFilters.pricing.length +
    (searchFilters.minRating > 0 ? 1 : 0) +
    (searchFilters.verified ? 1 : 0) +
    (searchFilters.featured ? 1 : 0);

  const handleTypeToggle = (type: AppType) => {
    const newTypes = searchFilters.types.includes(type)
      ? searchFilters.types.filter((t) => t !== type)
      : [...searchFilters.types, type];
    setSearchFilters({ types: newTypes });
  };

  const handlePricingToggle = (pricing: AppPricing) => {
    const newPricing = searchFilters.pricing.includes(pricing)
      ? searchFilters.pricing.filter((p) => p !== pricing)
      : [...searchFilters.pricing, pricing];
    setSearchFilters({ pricing: newPricing });
  };

  const handleRatingChange = (value: string) => {
    setSearchFilters({ minRating: value === "any" ? 0 : parseInt(value) });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Filter Button with Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filters</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetSearchFilters}
                  className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              )}
            </div>

            <Separator />

            {/* App Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">App Type</Label>
              <div className="flex flex-wrap gap-2">
                {APP_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant={
                      searchFilters.types.includes(type.value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handleTypeToggle(type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Pricing</Label>
              <div className="flex flex-wrap gap-2">
                {PRICING_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={
                      searchFilters.pricing.includes(option.value)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => handlePricingToggle(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Rating */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Minimum Rating</Label>
              <Select
                value={
                  searchFilters.minRating > 0
                    ? searchFilters.minRating.toString()
                    : "any"
                }
                onValueChange={handleRatingChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any rating</SelectItem>
                  {RATING_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Additional Filters */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Additional</Label>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchFilters.verified}
                    onChange={(e) =>
                      setSearchFilters({ verified: e.target.checked })
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm">Verified apps only</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchFilters.featured}
                    onChange={(e) =>
                      setSearchFilters({ featured: e.target.checked })
                    }
                    className="rounded border-input"
                  />
                  <span className="text-sm">Featured apps only</span>
                </label>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <>
          {searchFilters.types.map((type) => (
            <FilterPill
              key={`type-${type}`}
              label={APP_TYPES.find((t) => t.value === type)?.label || type}
              onRemove={() => handleTypeToggle(type)}
            />
          ))}
          {searchFilters.pricing.map((pricing) => (
            <FilterPill
              key={`pricing-${pricing}`}
              label={
                PRICING_OPTIONS.find((p) => p.value === pricing)?.label ||
                pricing
              }
              onRemove={() => handlePricingToggle(pricing)}
            />
          ))}
          {searchFilters.minRating > 0 && (
            <FilterPill
              label={`${searchFilters.minRating}+ stars`}
              onRemove={() => setSearchFilters({ minRating: 0 })}
            />
          )}
          {searchFilters.verified && (
            <FilterPill
              label="Verified"
              onRemove={() => setSearchFilters({ verified: false })}
            />
          )}
          {searchFilters.featured && (
            <FilterPill
              label="Featured"
              onRemove={() => setSearchFilters({ featured: false })}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSearchFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </>
      )}
    </div>
  );
}

interface FilterPillProps {
  label: string;
  onRemove: () => void;
}

function FilterPill({ label, onRemove }: FilterPillProps) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-muted-foreground/20 ml-1 rounded-full p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
