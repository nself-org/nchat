/**
 * Search domain — search, saved searches, bookmarks, reminders, quick switcher.
 *
 * @module search
 */

export * from './types'

export { SearchInput } from './search-input'
export type { SearchInputProps } from './search-input'

export { SearchResults } from './search-results'
export type { SearchResultsAdapter, SearchResultsProps } from './search-results'

export { SearchModal } from './search-modal'
export type { SearchModalAdapter, SearchModalProps } from './search-modal'

export { BookmarksPanel } from './bookmarks-panel'
export type { BookmarksPanelAdapter, BookmarksPanelProps } from './bookmarks-panel'

export { RemindersPanel } from './reminders-panel'
export type { RemindersPanelAdapter, RemindersPanelProps } from './reminders-panel'

export { QuickSwitcher } from './quick-switcher'
export type { QuickSwitcherAdapter, QuickSwitcherProps } from './quick-switcher'
