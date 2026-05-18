/**
 * Search Query Builder
 *
 * Provides a fluent API for building MeiliSearch queries with filters.
 * Supports user filters, channel filters, date ranges, attachment filters, and more.
 *
 * @module lib/search/query-builder
 */

// ============================================================================
// Types
// ============================================================================

export interface SearchQueryOptions {
  q: string;
  filter: string | string[];
  sort: string[];
  limit: number;
  offset: number;
  attributesToHighlight: string[];
  attributesToCrop: string[];
  cropLength: number;
  matchingStrategy: "all" | "last";
  showMatchesPosition: boolean;
}

export interface DateRange {
  after?: Date;
  before?: Date;
}

export type AttachmentType = "file" | "image" | "video" | "audio" | "link";

// ============================================================================
// SearchQueryBuilder Class
// ============================================================================

export class SearchQueryBuilder {
  private queryText: string;
  private filters: string[] = [];
  private sortOptions: string[] = [];
  private limitValue: number = 20;
  private offsetValue: number = 0;
  private highlightAttributes: string[] = ["content", "name", "display_name"];
  private cropAttributes: string[] = ["content"];
  private cropLengthValue: number = 200;
  private matchStrategy: "all" | "last" = "last";
  private showPositions: boolean = true;

  constructor(query: string) {
    this.queryText = query.trim();
  }

  /**
   * Add filter for specific user(s)
   */
  fromUser(userId: string | string[]): this {
    if (Array.isArray(userId)) {
      if (userId.length > 0) {
        const userFilters = userId.map((id) => `author_id = "${id}"`);
        this.filters.push(`(${userFilters.join(" OR ")})`);
      }
    } else {
      this.filters.push(`author_id = "${userId}"`);
    }
    return this;
  }

  /**
   * Add filter for specific channel(s)
   */
  inChannel(channelId: string | string[]): this {
    if (Array.isArray(channelId)) {
      if (channelId.length > 0) {
        const channelFilters = channelId.map((id) => `channel_id = "${id}"`);
        this.filters.push(`(${channelFilters.join(" OR ")})`);
      }
    } else {
      this.filters.push(`channel_id = "${channelId}"`);
    }
    return this;
  }

  /**
   * Add date range filter
   */
  dateRange(range: DateRange): this {
    if (range.after) {
      const afterTimestamp = Math.floor(range.after.getTime() / 1000);
      this.filters.push(`created_at >= ${afterTimestamp}`);
    }
    if (range.before) {
      const beforeTimestamp = Math.floor(range.before.getTime() / 1000);
      this.filters.push(`created_at <= ${beforeTimestamp}`);
    }
    return this;
  }

  /**
   * Add filter for messages after a specific date
   */
  after(date: Date): this {
    const timestamp = Math.floor(date.getTime() / 1000);
    this.filters.push(`created_at >= ${timestamp}`);
    return this;
  }

  /**
   * Add filter for messages before a specific date
   */
  before(date: Date): this {
    const timestamp = Math.floor(date.getTime() / 1000);
    this.filters.push(`created_at <= ${timestamp}`);
    return this;
  }

  /**
   * Add filter for messages with specific attachment type
   */
  hasAttachment(type?: AttachmentType | AttachmentType[]): this {
    if (!type) {
      this.filters.push("has_attachment = true");
      return this;
    }

    const types = Array.isArray(type) ? type : [type];

    const attachmentFilters: string[] = [];
    for (const t of types) {
      switch (t) {
        case "image":
          attachmentFilters.push("has_image = true");
          break;
        case "video":
          attachmentFilters.push("has_video = true");
          break;
        case "file":
          attachmentFilters.push("has_file = true");
          break;
        case "audio":
          attachmentFilters.push("has_file = true"); // Audio is stored as file
          break;
        case "link":
          attachmentFilters.push("has_link = true");
          break;
      }
    }

    if (attachmentFilters.length > 0) {
      this.filters.push(`(${attachmentFilters.join(" OR ")})`);
    }

    return this;
  }

  /**
   * Add filter for messages with links
   */
  hasLink(): this {
    this.filters.push("has_link = true");
    return this;
  }

  /**
   * Add filter for pinned messages
   */
  isPinned(value = true): this {
    this.filters.push(`is_pinned = ${value}`);
    return this;
  }

  /**
   * Add filter for edited messages
   */
  isEdited(value = true): this {
    this.filters.push(`is_edited = ${value}`);
    return this;
  }

  /**
   * Add filter for thread messages
   */
  inThread(threadId?: string): this {
    if (threadId) {
      this.filters.push(`parent_thread_id = "${threadId}"`);
    } else {
      this.filters.push("parent_thread_id EXISTS");
    }
    return this;
  }

  /**
   * Add filter for root messages only (not thread replies)
   */
  rootMessagesOnly(): this {
    this.filters.push("parent_thread_id NOT EXISTS");
    return this;
  }

  /**
   * Add filter for messages that have threads
   */
  hasThread(): this {
    this.filters.push("thread_id EXISTS");
    return this;
  }

  /**
   * Add filter for messages mentioning specific users
   */
  mentioning(userIds: string | string[]): this {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    for (const id of ids) {
      this.filters.push(`mentioned_users = "${id}"`);
    }
    return this;
  }

  /**
   * Add filter for messages with @everyone
   */
  mentionsEveryone(): this {
    this.filters.push("mentions_everyone = true");
    return this;
  }

  /**
   * Add filter for messages with @here
   */
  mentionsHere(): this {
    this.filters.push("mentions_here = true");
    return this;
  }

  /**
   * Add filter for message type
   */
  ofType(type: string | string[]): this {
    if (Array.isArray(type)) {
      if (type.length > 0) {
        const typeFilters = type.map((t) => `message_type = "${t}"`);
        this.filters.push(`(${typeFilters.join(" OR ")})`);
      }
    } else {
      this.filters.push(`message_type = "${type}"`);
    }
    return this;
  }

  /**
   * Exclude deleted messages
   */
  excludeDeleted(): this {
    this.filters.push("is_deleted = false");
    return this;
  }

  /**
   * Add custom filter
   */
  addFilter(filter: string): this {
    this.filters.push(filter);
    return this;
  }

  /**
   * Sort by date
   */
  sortByDate(order: "asc" | "desc" = "desc"): this {
    this.sortOptions.push(`created_at:${order}`);
    return this;
  }

  /**
   * Sort by relevance (default MeiliSearch behavior)
   */
  sortByRelevance(): this {
    // Remove any existing sort options to use default relevance
    this.sortOptions = [];
    return this;
  }

  /**
   * Add custom sort
   */
  sortBy(attribute: string, order: "asc" | "desc" = "desc"): this {
    this.sortOptions.push(`${attribute}:${order}`);
    return this;
  }

  /**
   * Set pagination limit
   */
  limit(value: number): this {
    this.limitValue = Math.min(Math.max(1, value), 100);
    return this;
  }

  /**
   * Set pagination offset
   */
  offset(value: number): this {
    this.offsetValue = Math.max(0, value);
    return this;
  }

  /**
   * Set page number (1-based)
   */
  page(pageNumber: number): this {
    this.offsetValue = (Math.max(1, pageNumber) - 1) * this.limitValue;
    return this;
  }

  /**
   * Set attributes to highlight
   */
  highlight(attributes: string[]): this {
    this.highlightAttributes = attributes;
    return this;
  }

  /**
   * Set attributes to crop
   */
  crop(attributes: string[], length?: number): this {
    this.cropAttributes = attributes;
    if (length !== undefined) {
      this.cropLengthValue = length;
    }
    return this;
  }

  /**
   * Set matching strategy
   */
  matchingStrategy(strategy: "all" | "last"): this {
    this.matchStrategy = strategy;
    return this;
  }

  /**
   * Build the final query options
   */
  build(): Partial<SearchQueryOptions> {
    const options: Partial<SearchQueryOptions> = {
      q: this.queryText,
    };

    if (this.filters.length > 0) {
      options.filter = this.filters.join(" AND ");
    }

    if (this.sortOptions.length > 0) {
      options.sort = this.sortOptions;
    }

    options.limit = this.limitValue;
    options.offset = this.offsetValue;
    options.attributesToHighlight = this.highlightAttributes;
    options.attributesToCrop = this.cropAttributes;
    options.cropLength = this.cropLengthValue;
    options.matchingStrategy = this.matchStrategy;
    options.showMatchesPosition = this.showPositions;

    return options;
  }

  /**
   * Get just the filter string
   */
  getFilterString(): string {
    return this.filters.join(" AND ");
  }

  /**
   * Clone this builder for modification
   */
  clone(): SearchQueryBuilder {
    const clone = new SearchQueryBuilder(this.queryText);
    clone.filters = [...this.filters];
    clone.sortOptions = [...this.sortOptions];
    clone.limitValue = this.limitValue;
    clone.offsetValue = this.offsetValue;
    clone.highlightAttributes = [...this.highlightAttributes];
    clone.cropAttributes = [...this.cropAttributes];
    clone.cropLengthValue = this.cropLengthValue;
    clone.matchStrategy = this.matchStrategy;
    clone.showPositions = this.showPositions;
    return clone;
  }

  /**
   * Parse a search string with operators and return a configured builder
   */
  static parse(searchString: string): SearchQueryBuilder {
    const parsed = parseSearchString(searchString);
    const builder = new SearchQueryBuilder(parsed.query);

    if (parsed.fromUser) {
      builder.fromUser(parsed.fromUser);
    }
    if (parsed.inChannel) {
      builder.inChannel(parsed.inChannel);
    }
    if (parsed.after) {
      builder.after(parsed.after);
    }
    if (parsed.before) {
      builder.before(parsed.before);
    }
    if (parsed.hasAttachment) {
      builder.hasAttachment(parsed.hasAttachment as AttachmentType[]);
    }
    if (parsed.isPinned !== undefined) {
      builder.isPinned(parsed.isPinned);
    }
    if (parsed.hasLink) {
      builder.hasLink();
    }

    return builder;
  }
}

// ============================================================================
// Search String Parser
// ============================================================================

interface ParsedSearchString {
  query: string;
  fromUser?: string[];
  inChannel?: string[];
  after?: Date;
  before?: Date;
  hasAttachment?: string[];
  isPinned?: boolean;
  isEdited?: boolean;
  hasLink?: boolean;
}

/**
 * Parse a search string with operators
 *
 * Supported operators:
 * - from:username - Filter by sender
 * - in:#channel or in:channel - Filter by channel
 * - after:2024-01-01 - After date
 * - before:2024-01-01 - Before date
 * - has:file, has:image, has:video, has:link - Has attachment type
 * - is:pinned - Is pinned
 * - is:edited - Is edited
 */
export function parseSearchString(input: string): ParsedSearchString {
  const result: ParsedSearchString = {
    query: "",
    fromUser: [],
    inChannel: [],
    hasAttachment: [],
  };

  // Patterns for operators
  const patterns = {
    from: /from:(\S+)/gi,
    in: /in:(?:#)?(\S+)/gi,
    after: /after:(\d{4}-\d{2}-\d{2})/gi,
    before: /before:(\d{4}-\d{2}-\d{2})/gi,
    has: /has:(file|image|video|link|audio|attachment)/gi,
    is: /is:(pinned|edited)/gi,
  };

  let remaining = input;

  // Extract from: operators
  let match: RegExpExecArray | null;
  while ((match = patterns.from.exec(input)) !== null) {
    result.fromUser!.push(match[1]);
    remaining = remaining.replace(match[0], "");
  }

  // Extract in: operators
  patterns.in.lastIndex = 0;
  while ((match = patterns.in.exec(input)) !== null) {
    result.inChannel!.push(match[1]);
    remaining = remaining.replace(match[0], "");
  }

  // Extract after: operator
  patterns.after.lastIndex = 0;
  while ((match = patterns.after.exec(input)) !== null) {
    const date = new Date(match[1]);
    if (!isNaN(date.getTime())) {
      result.after = date;
    }
    remaining = remaining.replace(match[0], "");
  }

  // Extract before: operator
  patterns.before.lastIndex = 0;
  while ((match = patterns.before.exec(input)) !== null) {
    const date = new Date(match[1]);
    if (!isNaN(date.getTime())) {
      result.before = date;
    }
    remaining = remaining.replace(match[0], "");
  }

  // Extract has: operators
  patterns.has.lastIndex = 0;
  while ((match = patterns.has.exec(input)) !== null) {
    const value = match[1].toLowerCase();
    if (value === "link") {
      result.hasLink = true;
    } else if (value === "attachment") {
      result.hasAttachment!.push("file", "image", "video");
    } else {
      result.hasAttachment!.push(value);
    }
    remaining = remaining.replace(match[0], "");
  }

  // Extract is: operators
  patterns.is.lastIndex = 0;
  while ((match = patterns.is.exec(input)) !== null) {
    const value = match[1].toLowerCase();
    if (value === "pinned") {
      result.isPinned = true;
    } else if (value === "edited") {
      result.isEdited = true;
    }
    remaining = remaining.replace(match[0], "");
  }

  // Clean up remaining query
  result.query = remaining.replace(/\s+/g, " ").trim();

  // Clean up empty arrays
  if (result.fromUser!.length === 0) delete result.fromUser;
  if (result.inChannel!.length === 0) delete result.inChannel;
  if (result.hasAttachment!.length === 0) delete result.hasAttachment;

  return result;
}

/**
 * Build a search string from parsed components
 */
export function buildSearchString(parsed: ParsedSearchString): string {
  const parts: string[] = [];

  if (parsed.query) {
    parts.push(parsed.query);
  }

  if (parsed.fromUser) {
    for (const user of parsed.fromUser) {
      parts.push(`from:${user}`);
    }
  }

  if (parsed.inChannel) {
    for (const channel of parsed.inChannel) {
      parts.push(`in:#${channel}`);
    }
  }

  if (parsed.after) {
    parts.push(`after:${parsed.after.toISOString().split("T")[0]}`);
  }

  if (parsed.before) {
    parts.push(`before:${parsed.before.toISOString().split("T")[0]}`);
  }

  if (parsed.hasAttachment) {
    for (const type of parsed.hasAttachment) {
      parts.push(`has:${type}`);
    }
  }

  if (parsed.hasLink) {
    parts.push("has:link");
  }

  if (parsed.isPinned) {
    parts.push("is:pinned");
  }

  if (parsed.isEdited) {
    parts.push("is:edited");
  }

  return parts.join(" ");
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new search query builder
 */
export function createSearchQuery(query: string): SearchQueryBuilder {
  return new SearchQueryBuilder(query);
}

/**
 * Parse a search string and create a query builder
 */
export function parseAndBuildQuery(searchString: string): SearchQueryBuilder {
  return SearchQueryBuilder.parse(searchString);
}

// ============================================================================
// Export
// ============================================================================

export default SearchQueryBuilder;
