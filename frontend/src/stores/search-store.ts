/**
 * Search Store - Manages all search-related state for the nself-chat application
 *
 * Handles search queries, filters, results, and search history
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { searchMessages, type SearchMessagesResult } from '@/lib/search/meilisearch'

// ============================================================================
// Types
// ============================================================================

export type SearchTab = 'all' | 'messages' | 'files' | 'people' | 'channels'

export type SearchSortBy = 'relevance' | 'date_desc' | 'date_asc'

export type HasFilter = 'link' | 'file' | 'image' | 'code' | 'mention' | 'reaction'

export type IsFilter = 'pinned' | 'starred' | 'thread' | 'unread'

export interface DateRange {
  from: Date | null
  to: Date | null
}

export interface SearchFilters {
  fromUsers: string[] // User IDs
  inChannels: string[] // Channel IDs
  dateRange: DateRange
  has: HasFilter[]
  is: IsFilter[]
}

export interface SearchResultBase {
  id: string
  score: number
  highlights: string[]
}

export interface MessageSearchResult extends SearchResultBase {
  type: 'message'
  channelId: string
  channelName: string
  authorId: string
  authorName: string
  authorAvatar: string | null
  content: string
  timestamp: Date
  threadId: string | null
  isPinned: boolean
  isStarred: boolean
  reactions: { emoji: string; count: number }[]
  hasAttachments: boolean
}

export interface FileSearchResult extends SearchResultBase {
  type: 'file'
  messageId: string
  channelId: string
  channelName: string
  uploaderId: string
  uploaderName: string
  fileName: string
  fileType: string
  fileSize: number
  thumbnailUrl: string | null
  uploadedAt: Date
}

export interface UserSearchResult extends SearchResultBase {
  type: 'user'
  userId: string
  displayName: string
  username: string
  email: string
  avatar: string | null
  role: string
  status: 'online' | 'away' | 'busy' | 'offline'
  lastSeen: Date | null
}

export interface ChannelSearchResult extends SearchResultBase {
  type: 'channel'
  channelId: string
  name: string
  description: string | null
  isPrivate: boolean
  memberCount: number
  isMember: boolean
  createdAt: Date
  lastActivityAt: Date | null
}

export type SearchResult =
  | MessageSearchResult
  | FileSearchResult
  | UserSearchResult
  | ChannelSearchResult

export interface RecentSearch {
  id: string
  query: string
  filters: Partial<SearchFilters>
  timestamp: Date
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters: SearchFilters
  createdAt: Date
}

// ============================================================================
// State Interface
// ============================================================================

export interface SearchState {
  // Query
  query: string
  debouncedQuery: string

  // Active tab
  activeTab: SearchTab

  // Filters
  filters: SearchFilters

  // Sorting
  sortBy: SearchSortBy

  // Results
  results: SearchResult[]
  totalResults: number
  hasMore: boolean
  currentPage: number
  resultsPerPage: number

  // Loading states
  isSearching: boolean
  isLoadingMore: boolean

  // UI state
  isOpen: boolean
  showFilters: boolean
  showAdvanced: boolean

  // History
  recentSearches: RecentSearch[]
  savedSearches: SavedSearch[]

  // In-channel search
  inChannelSearchActive: boolean
  inChannelSearchQuery: string
  inChannelSearchResults: MessageSearchResult[]
  inChannelCurrentIndex: number

  // Quick switcher
  quickSwitcherMode: boolean
  quickSwitcherResults: (ChannelSearchResult | UserSearchResult)[]
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface SearchActions {
  // Query actions
  setQuery: (query: string) => void
  setDebouncedQuery: (query: string) => void
  clearQuery: () => void

  // Tab actions
  setActiveTab: (tab: SearchTab) => void

  // Filter actions
  setFilters: (filters: Partial<SearchFilters>) => void
  addFromUser: (userId: string) => void
  removeFromUser: (userId: string) => void
  addInChannel: (channelId: string) => void
  removeInChannel: (channelId: string) => void
  setDateRange: (range: DateRange) => void
  toggleHasFilter: (filter: HasFilter) => void
  toggleIsFilter: (filter: IsFilter) => void
  clearFilters: () => void

  // Sort actions
  setSortBy: (sortBy: SearchSortBy) => void

  // Result actions
  setResults: (results: SearchResult[], total: number, hasMore: boolean) => void
  appendResults: (results: SearchResult[], hasMore: boolean) => void
  clearResults: () => void
  setCurrentPage: (page: number) => void

  // Loading actions
  setSearching: (isSearching: boolean) => void
  setLoadingMore: (isLoading: boolean) => void

  // UI actions
  openSearch: () => void
  closeSearch: () => void
  toggleFilters: () => void
  setShowFilters: (show: boolean) => void
  toggleAdvanced: () => void
  setShowAdvanced: (show: boolean) => void

  // History actions
  addRecentSearch: (query: string, filters?: Partial<SearchFilters>) => void
  removeRecentSearch: (id: string) => void
  clearRecentSearches: () => void
  saveSearch: (name: string) => void
  removeSavedSearch: (id: string) => void
  loadSavedSearch: (search: SavedSearch) => void

  // In-channel search actions
  startInChannelSearch: () => void
  endInChannelSearch: () => void
  setInChannelQuery: (query: string) => void
  setInChannelResults: (results: MessageSearchResult[]) => void
  navigateInChannelResult: (direction: 'next' | 'prev') => void
  jumpToInChannelResult: (index: number) => void

  // Quick switcher actions
  enableQuickSwitcherMode: () => void
  disableQuickSwitcherMode: () => void
  setQuickSwitcherResults: (results: (ChannelSearchResult | UserSearchResult)[]) => void

  // Search execution actions
  /**
   * Execute a full-text message search using the configured search backend
   * (MeiliSearch direct or proxy fallback). Updates results, totalResults,
   * hasMore, and loading state. Appends results when loadMore is true.
   */
  performSearch: (query: string, loadMore?: boolean) => Promise<void>
  /**
   * Execute an in-channel message search scoped to channelId.
   */
  performInChannelSearch: (query: string, channelId: string) => Promise<void>

  // Utility actions
  reset: () => void
}

export type SearchStore = SearchState & SearchActions

// ============================================================================
// Initial State
// ============================================================================

const emptyFilters: SearchFilters = {
  fromUsers: [],
  inChannels: [],
  dateRange: { from: null, to: null },
  has: [],
  is: [],
}

const initialState: SearchState = {
  // Query
  query: '',
  debouncedQuery: '',

  // Active tab
  activeTab: 'all',

  // Filters
  filters: { ...emptyFilters },

  // Sorting
  sortBy: 'relevance',

  // Results
  results: [],
  totalResults: 0,
  hasMore: false,
  currentPage: 1,
  resultsPerPage: 20,

  // Loading states
  isSearching: false,
  isLoadingMore: false,

  // UI state
  isOpen: false,
  showFilters: false,
  showAdvanced: false,

  // History
  recentSearches: [],
  savedSearches: [],

  // In-channel search
  inChannelSearchActive: false,
  inChannelSearchQuery: '',
  inChannelSearchResults: [],
  inChannelCurrentIndex: 0,

  // Quick switcher
  quickSwitcherMode: false,
  quickSwitcherResults: [],
}

// ============================================================================
// Store
// ============================================================================

export const useSearchStore = create<SearchStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Query actions
        setQuery: (query) =>
          set(
            (state) => {
              state.query = query
            },
            false,
            'search/setQuery'
          ),

        setDebouncedQuery: (query) =>
          set(
            (state) => {
              state.debouncedQuery = query
            },
            false,
            'search/setDebouncedQuery'
          ),

        clearQuery: () =>
          set(
            (state) => {
              state.query = ''
              state.debouncedQuery = ''
            },
            false,
            'search/clearQuery'
          ),

        // Tab actions
        setActiveTab: (tab) =>
          set(
            (state) => {
              state.activeTab = tab
              state.results = []
              state.currentPage = 1
            },
            false,
            'search/setActiveTab'
          ),

        // Filter actions
        setFilters: (filters) =>
          set(
            (state) => {
              state.filters = { ...state.filters, ...filters }
              state.results = []
              state.currentPage = 1
            },
            false,
            'search/setFilters'
          ),

        addFromUser: (userId) =>
          set(
            (state) => {
              if (!state.filters.fromUsers.includes(userId)) {
                state.filters.fromUsers.push(userId)
              }
            },
            false,
            'search/addFromUser'
          ),

        removeFromUser: (userId) =>
          set(
            (state) => {
              state.filters.fromUsers = state.filters.fromUsers.filter((id) => id !== userId)
            },
            false,
            'search/removeFromUser'
          ),

        addInChannel: (channelId) =>
          set(
            (state) => {
              if (!state.filters.inChannels.includes(channelId)) {
                state.filters.inChannels.push(channelId)
              }
            },
            false,
            'search/addInChannel'
          ),

        removeInChannel: (channelId) =>
          set(
            (state) => {
              state.filters.inChannels = state.filters.inChannels.filter((id) => id !== channelId)
            },
            false,
            'search/removeInChannel'
          ),

        setDateRange: (range) =>
          set(
            (state) => {
              state.filters.dateRange = range
            },
            false,
            'search/setDateRange'
          ),

        toggleHasFilter: (filter) =>
          set(
            (state) => {
              const index = state.filters.has.indexOf(filter)
              if (index === -1) {
                state.filters.has.push(filter)
              } else {
                state.filters.has.splice(index, 1)
              }
            },
            false,
            'search/toggleHasFilter'
          ),

        toggleIsFilter: (filter) =>
          set(
            (state) => {
              const index = state.filters.is.indexOf(filter)
              if (index === -1) {
                state.filters.is.push(filter)
              } else {
                state.filters.is.splice(index, 1)
              }
            },
            false,
            'search/toggleIsFilter'
          ),

        clearFilters: () =>
          set(
            (state) => {
              state.filters = { ...emptyFilters }
              state.results = []
              state.currentPage = 1
            },
            false,
            'search/clearFilters'
          ),

        // Sort actions
        setSortBy: (sortBy) =>
          set(
            (state) => {
              state.sortBy = sortBy
              state.results = []
              state.currentPage = 1
            },
            false,
            'search/setSortBy'
          ),

        // Result actions
        setResults: (results, total, hasMore) =>
          set(
            (state) => {
              state.results = results
              state.totalResults = total
              state.hasMore = hasMore
            },
            false,
            'search/setResults'
          ),

        appendResults: (results, hasMore) =>
          set(
            (state) => {
              state.results = [...state.results, ...results]
              state.hasMore = hasMore
            },
            false,
            'search/appendResults'
          ),

        clearResults: () =>
          set(
            (state) => {
              state.results = []
              state.totalResults = 0
              state.hasMore = false
              state.currentPage = 1
            },
            false,
            'search/clearResults'
          ),

        setCurrentPage: (page) =>
          set(
            (state) => {
              state.currentPage = page
            },
            false,
            'search/setCurrentPage'
          ),

        // Loading actions
        setSearching: (isSearching) =>
          set(
            (state) => {
              state.isSearching = isSearching
            },
            false,
            'search/setSearching'
          ),

        setLoadingMore: (isLoading) =>
          set(
            (state) => {
              state.isLoadingMore = isLoading
            },
            false,
            'search/setLoadingMore'
          ),

        // UI actions
        openSearch: () =>
          set(
            (state) => {
              state.isOpen = true
            },
            false,
            'search/openSearch'
          ),

        closeSearch: () =>
          set(
            (state) => {
              state.isOpen = false
              state.quickSwitcherMode = false
            },
            false,
            'search/closeSearch'
          ),

        toggleFilters: () =>
          set(
            (state) => {
              state.showFilters = !state.showFilters
            },
            false,
            'search/toggleFilters'
          ),

        setShowFilters: (show) =>
          set(
            (state) => {
              state.showFilters = show
            },
            false,
            'search/setShowFilters'
          ),

        toggleAdvanced: () =>
          set(
            (state) => {
              state.showAdvanced = !state.showAdvanced
            },
            false,
            'search/toggleAdvanced'
          ),

        setShowAdvanced: (show) =>
          set(
            (state) => {
              state.showAdvanced = show
            },
            false,
            'search/setShowAdvanced'
          ),

        // History actions
        addRecentSearch: (query, filters) =>
          set(
            (state) => {
              // Remove existing entry with same query
              state.recentSearches = state.recentSearches.filter((s) => s.query !== query)
              // Add to beginning
              state.recentSearches.unshift({
                id: crypto.randomUUID(),
                query,
                filters: filters ?? {},
                timestamp: new Date(),
              })
              // Keep only last 10
              if (state.recentSearches.length > 10) {
                state.recentSearches = state.recentSearches.slice(0, 10)
              }
            },
            false,
            'search/addRecentSearch'
          ),

        removeRecentSearch: (id) =>
          set(
            (state) => {
              state.recentSearches = state.recentSearches.filter((s) => s.id !== id)
            },
            false,
            'search/removeRecentSearch'
          ),

        clearRecentSearches: () =>
          set(
            (state) => {
              state.recentSearches = []
            },
            false,
            'search/clearRecentSearches'
          ),

        saveSearch: (name) =>
          set(
            (state) => {
              const { query, filters } = get()
              state.savedSearches.push({
                id: crypto.randomUUID(),
                name,
                query,
                filters: { ...filters },
                createdAt: new Date(),
              })
            },
            false,
            'search/saveSearch'
          ),

        removeSavedSearch: (id) =>
          set(
            (state) => {
              state.savedSearches = state.savedSearches.filter((s) => s.id !== id)
            },
            false,
            'search/removeSavedSearch'
          ),

        loadSavedSearch: (search) =>
          set(
            (state) => {
              state.query = search.query
              state.debouncedQuery = search.query
              state.filters = { ...search.filters }
              state.results = []
              state.currentPage = 1
            },
            false,
            'search/loadSavedSearch'
          ),

        // In-channel search actions
        startInChannelSearch: () =>
          set(
            (state) => {
              state.inChannelSearchActive = true
              state.inChannelSearchQuery = ''
              state.inChannelSearchResults = []
              state.inChannelCurrentIndex = 0
            },
            false,
            'search/startInChannelSearch'
          ),

        endInChannelSearch: () =>
          set(
            (state) => {
              state.inChannelSearchActive = false
              state.inChannelSearchQuery = ''
              state.inChannelSearchResults = []
              state.inChannelCurrentIndex = 0
            },
            false,
            'search/endInChannelSearch'
          ),

        setInChannelQuery: (query) =>
          set(
            (state) => {
              state.inChannelSearchQuery = query
            },
            false,
            'search/setInChannelQuery'
          ),

        setInChannelResults: (results) =>
          set(
            (state) => {
              state.inChannelSearchResults = results
              state.inChannelCurrentIndex = 0
            },
            false,
            'search/setInChannelResults'
          ),

        navigateInChannelResult: (direction) =>
          set(
            (state) => {
              const { inChannelSearchResults, inChannelCurrentIndex } = state
              if (inChannelSearchResults.length === 0) return

              if (direction === 'next') {
                state.inChannelCurrentIndex =
                  (inChannelCurrentIndex + 1) % inChannelSearchResults.length
              } else {
                state.inChannelCurrentIndex =
                  inChannelCurrentIndex === 0
                    ? inChannelSearchResults.length - 1
                    : inChannelCurrentIndex - 1
              }
            },
            false,
            'search/navigateInChannelResult'
          ),

        jumpToInChannelResult: (index) =>
          set(
            (state) => {
              if (index >= 0 && index < state.inChannelSearchResults.length) {
                state.inChannelCurrentIndex = index
              }
            },
            false,
            'search/jumpToInChannelResult'
          ),

        // Quick switcher actions
        enableQuickSwitcherMode: () =>
          set(
            (state) => {
              state.quickSwitcherMode = true
              state.isOpen = true
              state.query = ''
              state.results = []
            },
            false,
            'search/enableQuickSwitcherMode'
          ),

        disableQuickSwitcherMode: () =>
          set(
            (state) => {
              state.quickSwitcherMode = false
              state.quickSwitcherResults = []
            },
            false,
            'search/disableQuickSwitcherMode'
          ),

        setQuickSwitcherResults: (results) =>
          set(
            (state) => {
              state.quickSwitcherResults = results
            },
            false,
            'search/setQuickSwitcherResults'
          ),

        // Search execution actions
        performSearch: async (query, loadMore = false) => {
          const state = get()
          const trimmed = query.trim()

          if (!trimmed) {
            set(
              (s) => {
                s.results = []
                s.totalResults = 0
                s.hasMore = false
                s.currentPage = 1
              },
              false,
              'search/performSearch/cleared'
            )
            return
          }

          if (loadMore) {
            set((s) => { s.isLoadingMore = true }, false, 'search/performSearch/loadingMore')
          } else {
            set((s) => { s.isSearching = true }, false, 'search/performSearch/searching')
          }

          const offset = loadMore ? state.results.length : 0

          let result: SearchMessagesResult
          try {
            result = await searchMessages(trimmed, {
              limit: state.resultsPerPage,
              offset,
            })
          } catch {
            set(
              (s) => {
                s.isSearching = false
                s.isLoadingMore = false
              },
              false,
              'search/performSearch/error'
            )
            return
          }

          // Map MeiliSearch hits to the store's MessageSearchResult shape
          const mapped: MessageSearchResult[] = result.hits.map((hit) => ({
            id: hit.id,
            type: 'message' as const,
            score: 1,
            highlights: hit._formatted?.content_search
              ? [hit._formatted.content_search]
              : [],
            channelId: hit.channel_id,
            channelName: '',
            authorId: hit.user_id ?? '',
            authorName: '',
            authorAvatar: null,
            content: hit.content_search,
            timestamp: new Date(hit.created_at),
            threadId: hit.thread_id,
            isPinned: hit.is_pinned ?? false,
            isStarred: false,
            reactions: [],
            hasAttachments: false,
          }))

          if (loadMore) {
            set(
              (s) => {
                s.results = [...s.results, ...mapped]
                s.hasMore = result.hasMore
                s.isLoadingMore = false
                s.currentPage = s.currentPage + 1
              },
              false,
              'search/performSearch/loadedMore'
            )
          } else {
            set(
              (s) => {
                s.results = mapped
                s.totalResults = result.estimatedTotalHits
                s.hasMore = result.hasMore
                s.isSearching = false
                s.currentPage = 1
              },
              false,
              'search/performSearch/done'
            )
          }
        },

        performInChannelSearch: async (query, channelId) => {
          const trimmed = query.trim()

          if (!trimmed) {
            set(
              (s) => {
                s.inChannelSearchResults = []
                s.inChannelCurrentIndex = 0
              },
              false,
              'search/performInChannelSearch/cleared'
            )
            return
          }

          let result: SearchMessagesResult
          try {
            result = await searchMessages(trimmed, {
              limit: 100,
              offset: 0,
              channelId,
            })
          } catch {
            return
          }

          const mapped: MessageSearchResult[] = result.hits.map((hit) => ({
            id: hit.id,
            type: 'message' as const,
            score: 1,
            highlights: hit._formatted?.content_search
              ? [hit._formatted.content_search]
              : [],
            channelId: hit.channel_id,
            channelName: '',
            authorId: hit.user_id ?? '',
            authorName: '',
            authorAvatar: null,
            content: hit.content_search,
            timestamp: new Date(hit.created_at),
            threadId: hit.thread_id,
            isPinned: hit.is_pinned ?? false,
            isStarred: false,
            reactions: [],
            hasAttachments: false,
          }))

          set(
            (s) => {
              s.inChannelSearchResults = mapped
              s.inChannelCurrentIndex = 0
            },
            false,
            'search/performInChannelSearch/done'
          )
        },

        // Utility actions
        reset: () =>
          set(
            () => ({
              ...initialState,
              // Preserve persisted data
              recentSearches: get().recentSearches,
              savedSearches: get().savedSearches,
            }),
            false,
            'search/reset'
          ),
      })),
      {
        name: 'nchat-search',
        partialize: (state) => ({
          recentSearches: state.recentSearches,
          savedSearches: state.savedSearches,
        }),
      }
    ),
    { name: 'search-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const selectHasActiveFilters = (state: SearchStore): boolean => {
  const { filters } = state
  return (
    filters.fromUsers.length > 0 ||
    filters.inChannels.length > 0 ||
    filters.dateRange.from !== null ||
    filters.dateRange.to !== null ||
    filters.has.length > 0 ||
    filters.is.length > 0
  )
}

export const selectActiveFilterCount = (state: SearchStore): number => {
  const { filters } = state
  let count = 0
  count += filters.fromUsers.length
  count += filters.inChannels.length
  if (filters.dateRange.from || filters.dateRange.to) count += 1
  count += filters.has.length
  count += filters.is.length
  return count
}

export const selectFilteredResults = (state: SearchStore): SearchResult[] => {
  const { results, activeTab } = state
  if (activeTab === 'all') return results

  const typeMap: Record<SearchTab, SearchResult['type'] | null> = {
    all: null,
    messages: 'message',
    files: 'file',
    people: 'user',
    channels: 'channel',
  }

  const targetType = typeMap[activeTab]
  if (!targetType) return results

  return results.filter((r) => r.type === targetType)
}

export const selectResultsByType = (state: SearchStore) => {
  const { results } = state
  return {
    messages: results.filter((r): r is MessageSearchResult => r.type === 'message'),
    files: results.filter((r): r is FileSearchResult => r.type === 'file'),
    users: results.filter((r): r is UserSearchResult => r.type === 'user'),
    channels: results.filter((r): r is ChannelSearchResult => r.type === 'channel'),
  }
}

export const selectInChannelSearchState = (state: SearchStore) => ({
  active: state.inChannelSearchActive,
  query: state.inChannelSearchQuery,
  results: state.inChannelSearchResults,
  currentIndex: state.inChannelCurrentIndex,
  total: state.inChannelSearchResults.length,
})
