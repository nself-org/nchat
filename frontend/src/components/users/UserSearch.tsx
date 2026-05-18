"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/search/search-input";
import { useUserDirectoryStore } from "@/stores/user-directory-store";

// ============================================================================
// Types
// ============================================================================

export interface UserSearchProps extends React.HTMLAttributes<HTMLDivElement> {
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const UserSearch = React.forwardRef<HTMLDivElement, UserSearchProps>(
  (
    {
      className,
      onSearch,
      placeholder = "Search users by name, username, or email...",
      autoFocus = false,
      ...props
    },
    ref,
  ) => {
    const { searchQuery, setSearchQuery, isSearching } =
      useUserDirectoryStore();

    const handleSearch = React.useCallback(
      (value: string) => {
        setSearchQuery(value);
        onSearch?.(value);
      },
      [setSearchQuery, onSearch],
    );

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <SearchInput
          value={searchQuery}
          onChange={handleSearch}
          placeholder={placeholder}
          isLoading={isSearching}
          shortcutHint="/K"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          size="md"
        />
      </div>
    );
  },
);
UserSearch.displayName = "UserSearch";

export { UserSearch };
