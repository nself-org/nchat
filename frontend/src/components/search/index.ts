/**
 * Search Components - nself-chat
 *
 * A comprehensive search system for Slack/Discord/Telegram-like team communication.
 * Includes search modal, filters, results, suggestions, quick switcher, and in-channel search.
 */

// ============================================================================
// Main Search Modal
// ============================================================================

export {
  SearchModal,
  SearchTrigger,
  useSearchModal,
  type SearchModalProps,
  type SearchTriggerProps,
} from "./search-modal";

// ============================================================================
// Search Input
// ============================================================================

export {
  SearchInput,
  CompactSearchInput,
  type SearchInputProps,
  type CompactSearchInputProps,
} from "./search-input";

// ============================================================================
// Search Filters
// ============================================================================

export {
  SearchFilters,
  InlineFilters,
  type SearchFiltersProps,
  type InlineFiltersProps,
} from "./search-filters";

// ============================================================================
// Search Results
// ============================================================================

export {
  SearchResults,
  GroupedSearchResults,
  type SearchResultsProps,
  type GroupedSearchResultsProps,
} from "./search-results";

// ============================================================================
// Result Components - Messages
// ============================================================================

export {
  SearchResultMessage,
  CompactMessageResult,
  HighlightedText,
  MessageResultSkeleton,
  type SearchResultMessageProps,
  type CompactMessageResultProps,
} from "./search-result-message";

// ============================================================================
// Result Components - Files
// ============================================================================

export {
  SearchResultFile,
  CompactFileResult,
  FileGridItem,
  FileResultSkeleton,
  type SearchResultFileProps,
  type CompactFileResultProps,
  type FileGridItemProps,
} from "./search-result-file";

// ============================================================================
// Result Components - Users
// ============================================================================

export {
  SearchResultUser,
  CompactUserResult,
  UserCard,
  UserResultSkeleton,
  PresenceIndicator,
  type SearchResultUserProps,
  type CompactUserResultProps,
  type UserCardProps,
  type PresenceIndicatorProps,
  type UserStatus,
} from "./search-result-user";

// ============================================================================
// Result Components - Channels
// ============================================================================

export {
  SearchResultChannel,
  CompactChannelResult,
  ChannelListItem,
  ChannelCard,
  ChannelResultSkeleton,
  type SearchResultChannelProps,
  type CompactChannelResultProps,
  type ChannelListItemProps,
  type ChannelCardProps,
} from "./search-result-channel";

// ============================================================================
// Search Suggestions
// ============================================================================

export {
  SearchSuggestions,
  CompactSuggestions,
  type SearchSuggestionsProps,
  type CompactSuggestionsProps,
  type QuickAction,
} from "./search-suggestions";

// ============================================================================
// Quick Switcher
// ============================================================================

export {
  QuickSwitcher,
  useQuickSwitcher,
  type QuickSwitcherProps,
} from "./quick-switcher";

// ============================================================================
// Search in Channel
// ============================================================================

export {
  SearchInChannel,
  SearchInChannelTrigger,
  HighlightMatches,
  useSearchInChannel,
  type SearchInChannelProps,
  type SearchInChannelTriggerProps,
  type HighlightMatchesProps,
} from "./search-in-channel";

// ============================================================================
// Advanced Search
// ============================================================================

export {
  AdvancedSearch,
  SavedSearchesList,
  CompactAdvancedSearch,
  type AdvancedSearchProps,
  type SavedSearchesListProps,
  type CompactAdvancedSearchProps,
} from "./advanced-search";

// ============================================================================
// Advanced Search Builder (v0.7.0)
// ============================================================================

export {
  AdvancedSearchBuilder,
  type AdvancedSearchBuilderProps,
  type QueryPart,
  type BooleanOperator,
  type QueryField,
} from "./AdvancedSearchBuilder";

// ============================================================================
// Search Result Card (v0.7.0)
// ============================================================================

export {
  SearchResultCard,
  CompactSearchResultCard,
  type SearchResultCardProps,
  type CompactSearchResultCardProps,
} from "./SearchResultCard";

// ============================================================================
// Search History (v0.7.0)
// ============================================================================

export {
  SearchHistory,
  CompactSearchHistory,
  type SearchHistoryProps,
  type CompactSearchHistoryProps,
} from "./SearchHistory";

// ============================================================================
// Saved Searches (v0.7.0)
// ============================================================================

export { SavedSearches, type SavedSearchesProps } from "./SavedSearches";

// ============================================================================
// Smart Search (AI-powered)
// ============================================================================

export { SmartSearch, type SmartSearchProps } from "./SmartSearch";

// ============================================================================
// Global Search (v0.9.1) - Command Palette Style
// ============================================================================

export {
  GlobalSearch,
  useGlobalSearch,
  type GlobalSearchProps,
  type SearchResultItem,
} from "./global-search";
