/**
 * Search Query Parser
 *
 * Parses search queries with support for operators, boolean logic,
 * phrase matching, and wildcards.
 *
 * Supported operators:
 * - from:<user>     - Filter by message author
 * - in:<channel>   - Filter by channel
 * - before:<date>  - Messages before date
 * - after:<date>   - Messages after date
 * - has:<type>     - Has attachment type (link, file, image, code, mention, reaction)
 * - is:<state>     - Is in state (pinned, starred, thread, unread)
 *
 * Supported syntax:
 * - "exact phrase" - Match exact phrase
 * - AND, OR, NOT   - Boolean operators
 * - word*          - Wildcard suffix matching
 */

// ============================================================================
// Types
// ============================================================================

export type OperatorType =
  | "from"
  | "in"
  | "before"
  | "after"
  | "has"
  | "is"
  | "to"
  | "mentions";

export type HasFilterType =
  | "link"
  | "file"
  | "image"
  | "code"
  | "mention"
  | "reaction";

export type IsFilterType = "pinned" | "starred" | "thread" | "unread";

export type BooleanOperator = "AND" | "OR" | "NOT";

export interface ParsedOperator {
  type: OperatorType;
  value: string;
  negated: boolean;
}

export interface ParsedTerm {
  type: "term";
  value: string;
  isPhrase: boolean;
  isWildcard: boolean;
  negated: boolean;
}

export interface ParsedBooleanExpression {
  type: "boolean";
  operator: BooleanOperator;
  left: ParsedToken;
  right: ParsedToken;
}

export type ParsedToken = ParsedOperator | ParsedTerm | ParsedBooleanExpression;

export interface ParsedQuery {
  terms: ParsedTerm[];
  operators: ParsedOperator[];
  rawQuery: string;
  hasErrors: boolean;
  errors: string[];
}

export interface SearchFilters {
  fromUsers: string[];
  inChannels: string[];
  toUsers: string[];
  mentionsUsers: string[];
  beforeDate: Date | null;
  afterDate: Date | null;
  hasFilters: HasFilterType[];
  isFilters: IsFilterType[];
}

export interface ParseResult {
  query: ParsedQuery;
  filters: SearchFilters;
  textQuery: string;
}

// ============================================================================
// Constants
// ============================================================================

const OPERATOR_PATTERN = /^(-?)(\w+):(\S+|"[^"]*")$/;
const PHRASE_PATTERN = /^"([^"]*)"$/;
const WILDCARD_PATTERN = /\*$/;
const BOOLEAN_OPERATORS: BooleanOperator[] = ["AND", "OR", "NOT"];
const VALID_OPERATORS: OperatorType[] = [
  "from",
  "in",
  "before",
  "after",
  "has",
  "is",
  "to",
  "mentions",
];
const VALID_HAS_FILTERS: HasFilterType[] = [
  "link",
  "file",
  "image",
  "code",
  "mention",
  "reaction",
];
const VALID_IS_FILTERS: IsFilterType[] = [
  "pinned",
  "starred",
  "thread",
  "unread",
];

// ============================================================================
// Tokenizer
// ============================================================================

/**
 * Tokenizes a search query string into individual tokens
 * Handles quoted phrases as single tokens, including operator:value with quoted values
 */
export function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    if (char === '"') {
      if (inQuotes) {
        // End of quoted section
        current += char;
        // Check if we're at end of input or next char is space
        if (i === query.length - 1 || query[i + 1] === " ") {
          tokens.push(current);
          current = "";
        }
        inQuotes = false;
      } else {
        // Start of quoted section - don't push current yet if it ends with :
        // This handles operator:"value" syntax
        current += char;
        inQuotes = true;
      }
    } else if (char === " " && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Checks if a token is a boolean operator
 */
export function isBooleanOperator(token: string): boolean {
  return BOOLEAN_OPERATORS.includes(token.toUpperCase() as BooleanOperator);
}

/**
 * Checks if a string is a valid operator type
 */
export function isValidOperator(op: string): op is OperatorType {
  return VALID_OPERATORS.includes(op as OperatorType);
}

/**
 * Checks if a string is a valid has filter type
 */
export function isValidHasFilter(value: string): value is HasFilterType {
  return VALID_HAS_FILTERS.includes(value as HasFilterType);
}

/**
 * Checks if a string is a valid is filter type
 */
export function isValidIsFilter(value: string): value is IsFilterType {
  return VALID_IS_FILTERS.includes(value as IsFilterType);
}

// ============================================================================
// Parsers
// ============================================================================

/**
 * Parses a single token into a ParsedOperator or ParsedTerm
 */
export function parseToken(token: string): ParsedOperator | ParsedTerm {
  // Check if token is an operator (e.g., from:john, -in:general)
  const operatorMatch = token.match(OPERATOR_PATTERN);

  if (operatorMatch) {
    const [, negation, operator, rawValue] = operatorMatch;
    const negated = negation === "-";
    const op = operator.toLowerCase();

    // Remove quotes from value if present
    let value = rawValue;
    const phraseMatch = rawValue.match(PHRASE_PATTERN);
    if (phraseMatch) {
      value = phraseMatch[1];
    }

    if (isValidOperator(op)) {
      return {
        type: op,
        value,
        negated,
      } as ParsedOperator;
    }
  }

  // Check if token is a phrase
  const phraseMatch = token.match(PHRASE_PATTERN);
  if (phraseMatch) {
    return {
      type: "term",
      value: phraseMatch[1],
      isPhrase: true,
      isWildcard: false,
      negated: false,
    };
  }

  // Check for negation prefix
  let value = token;
  let negated = false;
  if (token.startsWith("-") && token.length > 1) {
    value = token.substring(1);
    negated = true;
  }

  // Check for wildcard suffix
  const isWildcard = WILDCARD_PATTERN.test(value);
  if (isWildcard) {
    value = value.slice(0, -1);
  }

  return {
    type: "term",
    value,
    isPhrase: false,
    isWildcard,
    negated,
  };
}

/**
 * Parses a date string into a Date object
 * Supports formats: YYYY-MM-DD, YYYY/MM/DD, today, yesterday
 */
export function parseDate(dateStr: string): Date | null {
  const lowerDate = dateStr.toLowerCase();

  // Handle relative dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lowerDate === "today") {
    return today;
  }

  if (lowerDate === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Handle relative day offsets (e.g., "7d" for 7 days ago)
  const daysAgoMatch = lowerDate.match(/^(\d+)d$/);
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  // Handle week offsets (e.g., "2w" for 2 weeks ago)
  const weeksAgoMatch = lowerDate.match(/^(\d+)w$/);
  if (weeksAgoMatch) {
    const weeksAgo = parseInt(weeksAgoMatch[1], 10);
    const date = new Date(today);
    date.setDate(date.getDate() - weeksAgo * 7);
    return date;
  }

  // Handle month offsets (e.g., "3m" for 3 months ago)
  const monthsAgoMatch = lowerDate.match(/^(\d+)m$/);
  if (monthsAgoMatch) {
    const monthsAgo = parseInt(monthsAgoMatch[1], 10);
    const date = new Date(today);
    date.setMonth(date.getMonth() - monthsAgo);
    return date;
  }

  // Handle standard date formats
  const datePatterns = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
  ];

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parses a complete search query string
 */
export function parseSearchQuery(query: string): ParseResult {
  const rawQuery = query.trim();
  const tokens = tokenize(rawQuery);
  const parsedQuery: ParsedQuery = {
    terms: [],
    operators: [],
    rawQuery,
    hasErrors: false,
    errors: [],
  };

  const filters: SearchFilters = {
    fromUsers: [],
    inChannels: [],
    toUsers: [],
    mentionsUsers: [],
    beforeDate: null,
    afterDate: null,
    hasFilters: [],
    isFilters: [],
  };

  const textTerms: string[] = [];

  // Process tokens, handling boolean operators
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // Skip boolean operators for now (simplified handling)
    if (isBooleanOperator(token)) {
      // In a more advanced implementation, we would build an AST here
      i++;
      continue;
    }

    const parsed = parseToken(token);

    if (parsed.type === "term") {
      parsedQuery.terms.push(parsed);

      // Build text query for non-negated terms
      if (!parsed.negated) {
        if (parsed.isPhrase) {
          textTerms.push(`"${parsed.value}"`);
        } else if (parsed.isWildcard) {
          textTerms.push(`${parsed.value}*`);
        } else {
          textTerms.push(parsed.value);
        }
      }
    } else {
      parsedQuery.operators.push(parsed);

      // Apply operator to filters
      switch (parsed.type) {
        case "from":
          if (!parsed.negated) {
            filters.fromUsers.push(parsed.value);
          }
          break;

        case "in":
          if (!parsed.negated) {
            filters.inChannels.push(parsed.value);
          }
          break;

        case "to":
          if (!parsed.negated) {
            filters.toUsers.push(parsed.value);
          }
          break;

        case "mentions":
          if (!parsed.negated) {
            filters.mentionsUsers.push(parsed.value);
          }
          break;

        case "before": {
          const date = parseDate(parsed.value);
          if (date) {
            filters.beforeDate = date;
          } else {
            parsedQuery.hasErrors = true;
            parsedQuery.errors.push(`Invalid date format: ${parsed.value}`);
          }
          break;
        }

        case "after": {
          const date = parseDate(parsed.value);
          if (date) {
            filters.afterDate = date;
          } else {
            parsedQuery.hasErrors = true;
            parsedQuery.errors.push(`Invalid date format: ${parsed.value}`);
          }
          break;
        }

        case "has":
          if (isValidHasFilter(parsed.value)) {
            if (!parsed.negated && !filters.hasFilters.includes(parsed.value)) {
              filters.hasFilters.push(parsed.value);
            }
          } else {
            parsedQuery.hasErrors = true;
            parsedQuery.errors.push(`Invalid has filter: ${parsed.value}`);
          }
          break;

        case "is":
          if (isValidIsFilter(parsed.value)) {
            if (!parsed.negated && !filters.isFilters.includes(parsed.value)) {
              filters.isFilters.push(parsed.value);
            }
          } else {
            parsedQuery.hasErrors = true;
            parsedQuery.errors.push(`Invalid is filter: ${parsed.value}`);
          }
          break;
      }
    }

    i++;
  }

  return {
    query: parsedQuery,
    filters,
    textQuery: textTerms.join(" "),
  };
}

/**
 * Serializes a ParseResult back to a query string
 */
export function serializeQuery(result: ParseResult): string {
  const parts: string[] = [];

  // Add operators
  for (const op of result.query.operators) {
    const prefix = op.negated ? "-" : "";
    parts.push(`${prefix}${op.type}:${op.value}`);
  }

  // Add terms
  for (const term of result.query.terms) {
    const prefix = term.negated ? "-" : "";
    const suffix = term.isWildcard ? "*" : "";
    if (term.isPhrase) {
      parts.push(`${prefix}"${term.value}"`);
    } else {
      parts.push(`${prefix}${term.value}${suffix}`);
    }
  }

  return parts.join(" ");
}

/**
 * Extracts all unique users mentioned in operators
 */
export function extractMentionedUsers(result: ParseResult): string[] {
  const users = new Set<string>();

  for (const op of result.query.operators) {
    if (op.type === "from" || op.type === "to" || op.type === "mentions") {
      users.add(op.value);
    }
  }

  return Array.from(users);
}

/**
 * Extracts all unique channels mentioned in operators
 */
export function extractMentionedChannels(result: ParseResult): string[] {
  const channels = new Set<string>();

  for (const op of result.query.operators) {
    if (op.type === "in") {
      channels.add(op.value);
    }
  }

  return Array.from(channels);
}

/**
 * Checks if the parsed query is empty (no terms or operators)
 */
export function isEmptyQuery(result: ParseResult): boolean {
  return result.query.terms.length === 0 && result.query.operators.length === 0;
}

/**
 * Validates a search query and returns validation errors
 */
export function validateQuery(query: string): string[] {
  const result = parseSearchQuery(query);
  return result.query.errors;
}

/**
 * Creates a search query string from filters
 */
export function buildQueryFromFilters(
  filters: Partial<SearchFilters>,
  textQuery = "",
): string {
  const parts: string[] = [];

  if (textQuery) {
    parts.push(textQuery);
  }

  if (filters.fromUsers) {
    for (const user of filters.fromUsers) {
      parts.push(`from:${user}`);
    }
  }

  if (filters.inChannels) {
    for (const channel of filters.inChannels) {
      parts.push(`in:${channel}`);
    }
  }

  if (filters.toUsers) {
    for (const user of filters.toUsers) {
      parts.push(`to:${user}`);
    }
  }

  if (filters.mentionsUsers) {
    for (const user of filters.mentionsUsers) {
      parts.push(`mentions:${user}`);
    }
  }

  if (filters.beforeDate) {
    const dateStr = filters.beforeDate.toISOString().split("T")[0];
    parts.push(`before:${dateStr}`);
  }

  if (filters.afterDate) {
    const dateStr = filters.afterDate.toISOString().split("T")[0];
    parts.push(`after:${dateStr}`);
  }

  if (filters.hasFilters) {
    for (const has of filters.hasFilters) {
      parts.push(`has:${has}`);
    }
  }

  if (filters.isFilters) {
    for (const is of filters.isFilters) {
      parts.push(`is:${is}`);
    }
  }

  return parts.join(" ");
}

/**
 * Suggests autocomplete options for a partial operator
 */
export function getOperatorSuggestions(partial: string): string[] {
  const suggestions: string[] = [];
  const lowerPartial = partial.toLowerCase();

  // Check if typing an operator
  if (partial.includes(":")) {
    const [op, value] = partial.split(":");
    const lowerOp = op.toLowerCase();

    if (lowerOp === "has") {
      return VALID_HAS_FILTERS.filter((f) =>
        f.startsWith(value.toLowerCase()),
      ).map((f) => `has:${f}`);
    }

    if (lowerOp === "is") {
      return VALID_IS_FILTERS.filter((f) =>
        f.startsWith(value.toLowerCase()),
      ).map((f) => `is:${f}`);
    }

    if (lowerOp === "before" || lowerOp === "after") {
      return [
        `${lowerOp}:today`,
        `${lowerOp}:yesterday`,
        `${lowerOp}:7d`,
        `${lowerOp}:30d`,
      ];
    }

    return [];
  }

  // Suggest operators that match the partial
  for (const op of VALID_OPERATORS) {
    if (op.startsWith(lowerPartial)) {
      suggestions.push(`${op}:`);
    }
  }

  return suggestions;
}

/**
 * Gets help text for operators
 */
export function getOperatorHelp(): Record<OperatorType, string> {
  return {
    from: "Filter by message author (e.g., from:john)",
    in: "Filter by channel (e.g., in:general)",
    before: "Messages before date (e.g., before:2024-01-01)",
    after: "Messages after date (e.g., after:2024-01-01)",
    has: "Has attachment type: link, file, image, code, mention, reaction",
    is: "Message state: pinned, starred, thread, unread",
    to: "Messages to user in DM (e.g., to:jane)",
    mentions: "Messages mentioning user (e.g., mentions:@alice)",
  };
}

export default parseSearchQuery;
