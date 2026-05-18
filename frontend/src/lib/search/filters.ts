/**
 * Advanced Search Filters
 * Provides comprehensive filtering capabilities for search queries
 */

// ============================================================================
// Types
// ============================================================================

export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

export interface UserFilter {
  userIds: string[];
  exclude?: boolean;
}

export interface ChannelFilter {
  channelIds: string[];
  types?: ("public" | "private" | "direct" | "group")[];
  exclude?: boolean;
}

export interface MessageTypeFilter {
  types: ("text" | "file" | "image" | "video" | "audio" | "system")[];
  exclude?: boolean;
}

export interface AttachmentFilter {
  hasAttachments?: boolean;
  hasImages?: boolean;
  hasVideos?: boolean;
  hasAudio?: boolean;
  hasFiles?: boolean;
  hasLinks?: boolean;
  hasCode?: boolean;
  fileTypes?: string[]; // e.g., ['pdf', 'docx', 'png']
  fileSizeMin?: number; // bytes
  fileSizeMax?: number; // bytes
}

export interface ContentFilter {
  hasMentions?: boolean;
  hasReactions?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  isThread?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface AdvancedSearchFilters {
  // Text query
  query?: string;

  // Date filters
  dateRange?: DateRangeFilter;
  createdAfter?: Date;
  createdBefore?: Date;
  editedAfter?: Date;
  editedBefore?: Date;

  // User filters
  fromUsers?: UserFilter;
  mentionsUsers?: string[];

  // Channel filters
  inChannels?: ChannelFilter;

  // Message type filters
  messageTypes?: MessageTypeFilter;

  // Attachment filters
  attachments?: AttachmentFilter;

  // Content filters
  content?: ContentFilter;

  // Semantic search options
  semanticSearch?: boolean;
  similarityThreshold?: number;

  // Sorting and pagination
  sortBy?: "relevance" | "date_desc" | "date_asc" | "hybrid";
  limit?: number;
  offset?: number;
}

export interface ParsedFilter {
  sql: string;
  params: any[];
  paramIndex: number;
}

// ============================================================================
// Filter Builder
// ============================================================================

export class SearchFilterBuilder {
  private filters: AdvancedSearchFilters = {};
  private paramIndex = 1;
  private whereClauses: string[] = [];
  private params: any[] = [];

  /**
   * Set text query
   */
  query(text: string): this {
    this.filters.query = text;
    return this;
  }

  /**
   * Filter by date range
   */
  dateRange(from?: Date, to?: Date): this {
    this.filters.dateRange = { from, to };
    return this;
  }

  /**
   * Filter messages created after date
   */
  after(date: Date): this {
    this.filters.createdAfter = date;
    return this;
  }

  /**
   * Filter messages created before date
   */
  before(date: Date): this {
    this.filters.createdBefore = date;
    return this;
  }

  /**
   * Filter by message authors
   */
  fromUsers(userIds: string[], exclude: boolean = false): this {
    this.filters.fromUsers = { userIds, exclude };
    return this;
  }

  /**
   * Filter messages in specific channels
   */
  inChannels(
    channelIds: string[],
    types?: ("public" | "private" | "direct" | "group")[],
    exclude: boolean = false,
  ): this {
    this.filters.inChannels = { channelIds, types, exclude };
    return this;
  }

  /**
   * Filter by message types
   */
  messageTypes(
    types: ("text" | "file" | "image" | "video" | "audio" | "system")[],
    exclude: boolean = false,
  ): this {
    this.filters.messageTypes = { types, exclude };
    return this;
  }

  /**
   * Filter messages with attachments
   */
  hasAttachments(value: boolean = true): this {
    if (!this.filters.attachments) this.filters.attachments = {};
    this.filters.attachments.hasAttachments = value;
    return this;
  }

  /**
   * Filter messages with images
   */
  hasImages(value: boolean = true): this {
    if (!this.filters.attachments) this.filters.attachments = {};
    this.filters.attachments.hasImages = value;
    return this;
  }

  /**
   * Filter messages with links
   */
  hasLinks(value: boolean = true): this {
    if (!this.filters.attachments) this.filters.attachments = {};
    this.filters.attachments.hasLinks = value;
    return this;
  }

  /**
   * Filter messages with code blocks
   */
  hasCode(value: boolean = true): this {
    if (!this.filters.attachments) this.filters.attachments = {};
    this.filters.attachments.hasCode = value;
    return this;
  }

  /**
   * Filter by file types
   */
  fileTypes(types: string[]): this {
    if (!this.filters.attachments) this.filters.attachments = {};
    this.filters.attachments.fileTypes = types;
    return this;
  }

  /**
   * Filter messages with mentions
   */
  hasMentions(value: boolean = true): this {
    if (!this.filters.content) this.filters.content = {};
    this.filters.content.hasMentions = value;
    return this;
  }

  /**
   * Filter messages with reactions
   */
  hasReactions(value: boolean = true): this {
    if (!this.filters.content) this.filters.content = {};
    this.filters.content.hasReactions = value;
    return this;
  }

  /**
   * Filter pinned messages
   */
  isPinned(value: boolean = true): this {
    if (!this.filters.content) this.filters.content = {};
    this.filters.content.isPinned = value;
    return this;
  }

  /**
   * Filter starred messages
   */
  isStarred(value: boolean = true): this {
    if (!this.filters.content) this.filters.content = {};
    this.filters.content.isStarred = value;
    return this;
  }

  /**
   * Filter thread messages
   */
  isThread(value: boolean = true): this {
    if (!this.filters.content) this.filters.content = {};
    this.filters.content.isThread = value;
    return this;
  }

  /**
   * Filter edited messages
   */
  isEdited(value: boolean = true): this {
    if (!this.filters.content) this.filters.content = {};
    this.filters.content.isEdited = value;
    return this;
  }

  /**
   * Include deleted messages
   */
  includeDeleted(value: boolean = true): this {
    if (!this.filters.content) this.filters.content = {};
    this.filters.content.isDeleted = value;
    return this;
  }

  /**
   * Enable semantic search
   */
  semantic(threshold: number = 0.7): this {
    this.filters.semanticSearch = true;
    this.filters.similarityThreshold = threshold;
    return this;
  }

  /**
   * Set sort order
   */
  sort(by: "relevance" | "date_desc" | "date_asc" | "hybrid"): this {
    this.filters.sortBy = by;
    return this;
  }

  /**
   * Set result limit
   */
  limit(count: number): this {
    this.filters.limit = count;
    return this;
  }

  /**
   * Set result offset
   */
  offset(count: number): this {
    this.filters.offset = count;
    return this;
  }

  /**
   * Build SQL WHERE clause from filters
   */
  buildWhereClause(schema: string = "nchat"): ParsedFilter {
    this.whereClauses = [];
    this.params = [];
    this.paramIndex = 1;

    // Date range filters
    if (this.filters.dateRange?.from) {
      this.addWhere(
        `m.created_at >= $${this.paramIndex}`,
        this.filters.dateRange.from,
      );
    }
    if (this.filters.dateRange?.to) {
      this.addWhere(
        `m.created_at <= $${this.paramIndex}`,
        this.filters.dateRange.to,
      );
    }
    if (this.filters.createdAfter) {
      this.addWhere(
        `m.created_at >= $${this.paramIndex}`,
        this.filters.createdAfter,
      );
    }
    if (this.filters.createdBefore) {
      this.addWhere(
        `m.created_at <= $${this.paramIndex}`,
        this.filters.createdBefore,
      );
    }
    if (this.filters.editedAfter) {
      this.addWhere(
        `m.edited_at >= $${this.paramIndex}`,
        this.filters.editedAfter,
      );
    }
    if (this.filters.editedBefore) {
      this.addWhere(
        `m.edited_at <= $${this.paramIndex}`,
        this.filters.editedBefore,
      );
    }

    // User filters
    if (this.filters.fromUsers) {
      const { userIds, exclude } = this.filters.fromUsers;
      const operator = exclude ? "NOT IN" : "IN";
      this.addWhere(`m.user_id ${operator} ($${this.paramIndex})`, userIds);
    }

    // Channel filters
    if (this.filters.inChannels) {
      const { channelIds, exclude } = this.filters.inChannels;
      const operator = exclude ? "NOT IN" : "IN";
      this.addWhere(
        `m.channel_id ${operator} ($${this.paramIndex})`,
        channelIds,
      );
    }

    // Message type filters
    if (this.filters.messageTypes) {
      const { types, exclude } = this.filters.messageTypes;
      const operator = exclude ? "NOT IN" : "IN";
      this.addWhere(`m.type ${operator} ($${this.paramIndex})`, types);
    }

    // Attachment filters
    if (this.filters.attachments?.hasAttachments !== undefined) {
      this.addWhere(
        `m.has_file = $${this.paramIndex}`,
        this.filters.attachments.hasAttachments,
      );
    }
    if (this.filters.attachments?.hasImages !== undefined) {
      this.addWhere(
        `m.has_image = $${this.paramIndex}`,
        this.filters.attachments.hasImages,
      );
    }
    if (this.filters.attachments?.hasLinks !== undefined) {
      this.addWhere(
        `m.has_link = $${this.paramIndex}`,
        this.filters.attachments.hasLinks,
      );
    }
    if (this.filters.attachments?.hasCode !== undefined) {
      this.addWhere(`m.content ~ $${this.paramIndex}`, "```");
    }

    // Content filters
    if (this.filters.content?.isPinned !== undefined) {
      this.addWhere(
        `m.is_pinned = $${this.paramIndex}`,
        this.filters.content.isPinned,
      );
    }
    if (this.filters.content?.isStarred !== undefined) {
      this.addWhere(
        `m.is_starred = $${this.paramIndex}`,
        this.filters.content.isStarred,
      );
    }
    if (this.filters.content?.isThread !== undefined) {
      if (this.filters.content.isThread) {
        this.addWhere(`m.parent_id IS NOT NULL`);
      } else {
        this.addWhere(`m.parent_id IS NULL`);
      }
    }
    if (this.filters.content?.isEdited !== undefined) {
      this.addWhere(
        `m.is_edited = $${this.paramIndex}`,
        this.filters.content.isEdited,
      );
    }
    if (
      this.filters.content?.isDeleted === false ||
      this.filters.content?.isDeleted === undefined
    ) {
      this.addWhere(`m.is_deleted = FALSE`);
    }

    const whereClause =
      this.whereClauses.length > 0
        ? `WHERE ${this.whereClauses.join(" AND ")}`
        : "";

    return {
      sql: whereClause,
      params: this.params,
      paramIndex: this.paramIndex,
    };
  }

  /**
   * Add WHERE clause and parameter
   */
  private addWhere(clause: string, param?: any): void {
    this.whereClauses.push(clause);
    if (param !== undefined) {
      this.params.push(param);
      this.paramIndex++;
    }
  }

  /**
   * Build ORDER BY clause
   */
  buildOrderByClause(): string {
    const sortBy = this.filters.sortBy || "relevance";

    switch (sortBy) {
      case "date_desc":
        return "ORDER BY m.created_at DESC";
      case "date_asc":
        return "ORDER BY m.created_at ASC";
      case "hybrid":
        return "ORDER BY similarity_score * 0.7 + (1 - EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 86400) * 0.3 DESC";
      case "relevance":
      default:
        return "ORDER BY similarity_score DESC, m.created_at DESC";
    }
  }

  /**
   * Build LIMIT/OFFSET clause
   */
  buildPaginationClause(): { sql: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    if (this.filters.limit) {
      clauses.push(`LIMIT $${this.paramIndex}`);
      params.push(this.filters.limit);
      this.paramIndex++;
    }

    if (this.filters.offset) {
      clauses.push(`OFFSET $${this.paramIndex}`);
      params.push(this.filters.offset);
      this.paramIndex++;
    }

    return {
      sql: clauses.join(" "),
      params,
    };
  }

  /**
   * Get current filters
   */
  getFilters(): AdvancedSearchFilters {
    return { ...this.filters };
  }

  /**
   * Reset all filters
   */
  reset(): this {
    this.filters = {};
    this.whereClauses = [];
    this.params = [];
    this.paramIndex = 1;
    return this;
  }

  /**
   * Build complete SQL query
   */
  buildQuery(schema: string = "nchat"): { sql: string; params: any[] } {
    const where = this.buildWhereClause(schema);
    const orderBy = this.buildOrderByClause();
    const pagination = this.buildPaginationClause();

    const sql = `
      SELECT
        m.id,
        m.content,
        m.channel_id,
        m.user_id,
        m.created_at,
        m.is_pinned,
        m.is_starred,
        m.is_edited,
        m.type
      FROM ${schema}.nchat_messages m
      ${where.sql}
      ${orderBy}
      ${pagination.sql}
    `.trim();

    return {
      sql,
      params: [...where.params, ...pagination.params],
    };
  }
}

// ============================================================================
// Filter Validation
// ============================================================================

export class FilterValidator {
  /**
   * Validate date range
   */
  static isValidDateRange(from?: Date, to?: Date): boolean {
    if (!from || !to) return true;
    return from <= to;
  }

  /**
   * Validate array not empty
   */
  static isNonEmptyArray<T>(arr?: T[]): boolean {
    return Array.isArray(arr) && arr.length > 0;
  }

  /**
   * Validate filters
   */
  static validate(filters: AdvancedSearchFilters): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Date range validation
    if (filters.dateRange) {
      if (
        !this.isValidDateRange(filters.dateRange.from, filters.dateRange.to)
      ) {
        errors.push("Invalid date range: from date must be before to date");
      }
    }

    // User filter validation
    if (filters.fromUsers && !this.isNonEmptyArray(filters.fromUsers.userIds)) {
      errors.push("User filter must have at least one user ID");
    }

    // Channel filter validation
    if (
      filters.inChannels &&
      !this.isNonEmptyArray(filters.inChannels.channelIds)
    ) {
      errors.push("Channel filter must have at least one channel ID");
    }

    // Limit validation
    if (
      filters.limit !== undefined &&
      (filters.limit <= 0 || filters.limit > 1000)
    ) {
      errors.push("Limit must be between 1 and 1000");
    }

    // Offset validation
    if (filters.offset !== undefined && filters.offset < 0) {
      errors.push("Offset must be non-negative");
    }

    // Similarity threshold validation
    if (filters.similarityThreshold !== undefined) {
      if (filters.similarityThreshold < 0 || filters.similarityThreshold > 1) {
        errors.push("Similarity threshold must be between 0 and 1");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new filter builder
 */
export function createFilterBuilder(): SearchFilterBuilder {
  return new SearchFilterBuilder();
}

/**
 * Validate search filters
 */
export function validateFilters(filters: AdvancedSearchFilters) {
  return FilterValidator.validate(filters);
}

export default SearchFilterBuilder;
