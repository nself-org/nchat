/**
 * Search Query Parser
 *
 * Parses search queries with operators like:
 * - from:username
 * - in:channel-name
 * - has:link, has:file, has:image
 * - before:2024-01-01
 * - after:2024-01-01
 * - is:pinned, is:starred
 */

export interface ParsedQuery {
  // The main search text (without operators)
  text: string;

  // Filters extracted from operators
  filters: {
    from?: string; // author username
    in?: string; // channel name
    has?: ("link" | "file" | "image")[]; // has filters
    before?: string; // date string
    after?: string; // date string
    is?: ("pinned" | "starred")[]; // is filters
  };

  // Raw operators for debugging
  operators: Array<{
    type: string;
    value: string;
  }>;
}

/**
 * Parse a search query and extract operators
 */
export function parseQuery(query: string): ParsedQuery {
  const operators: Array<{ type: string; value: string }> = [];
  const filters: ParsedQuery["filters"] = {
    has: [],
    is: [],
  };

  // Regular expressions for different operators
  const operatorRegexes = {
    from: /from:(\S+)/gi,
    in: /in:(\S+)/gi,
    has: /has:(link|file|image|attachment)/gi,
    before: /before:(\d{4}-\d{2}-\d{2})/gi,
    after: /after:(\d{4}-\d{2}-\d{2})/gi,
    is: /is:(pinned|starred)/gi,
  };

  let remainingText = query;

  // Extract 'from:' operator
  let match: RegExpExecArray | null;
  operatorRegexes.from.lastIndex = 0;
  while ((match = operatorRegexes.from.exec(query)) !== null) {
    const value = match[1];
    operators.push({ type: "from", value });
    filters.from = value;
    remainingText = remainingText.replace(match[0], "");
  }

  // Extract 'in:' operator
  operatorRegexes.in.lastIndex = 0;
  while ((match = operatorRegexes.in.exec(query)) !== null) {
    const value = match[1];
    operators.push({ type: "in", value });
    filters.in = value;
    remainingText = remainingText.replace(match[0], "");
  }

  // Extract 'has:' operators
  operatorRegexes.has.lastIndex = 0;
  while ((match = operatorRegexes.has.exec(query)) !== null) {
    const value = match[1].toLowerCase() as
      | "link"
      | "file"
      | "image"
      | "attachment";
    operators.push({ type: "has", value });
    // Map 'attachment' to 'file'
    const mappedValue: "link" | "file" | "image" =
      value === "attachment" ? "file" : value;
    if (!filters.has!.includes(mappedValue)) {
      filters.has!.push(mappedValue);
    }
    remainingText = remainingText.replace(match[0], "");
  }

  // Extract 'before:' operator
  operatorRegexes.before.lastIndex = 0;
  while ((match = operatorRegexes.before.exec(query)) !== null) {
    const value = match[1];
    operators.push({ type: "before", value });
    filters.before = value;
    remainingText = remainingText.replace(match[0], "");
  }

  // Extract 'after:' operator
  operatorRegexes.after.lastIndex = 0;
  while ((match = operatorRegexes.after.exec(query)) !== null) {
    const value = match[1];
    operators.push({ type: "after", value });
    filters.after = value;
    remainingText = remainingText.replace(match[0], "");
  }

  // Extract 'is:' operators
  operatorRegexes.is.lastIndex = 0;
  while ((match = operatorRegexes.is.exec(query)) !== null) {
    const value = match[1].toLowerCase() as "pinned" | "starred";
    operators.push({ type: "is", value });
    if (!filters.is!.includes(value)) {
      filters.is!.push(value);
    }
    remainingText = remainingText.replace(match[0], "");
  }

  // Clean up the remaining text
  const text = remainingText.replace(/\s+/g, " ").trim();

  return {
    text,
    filters,
    operators,
  };
}

/**
 * Convert parsed query filters to MeiliSearch filter string
 */
export function buildMeiliSearchFilter(
  parsedQuery: ParsedQuery,
  additionalFilters?: Record<string, unknown>,
): string {
  const filterParts: string[] = [];

  // Add author filter
  if (parsedQuery.filters.from) {
    // Note: This assumes we have author_name indexed
    // In production, you might want to resolve username to user ID first
    filterParts.push(`author_name = "${parsedQuery.filters.from}"`);
  }

  // Add channel filter
  if (parsedQuery.filters.in) {
    // Note: This assumes we have channel_name indexed
    // In production, you might want to resolve channel name to channel ID first
    filterParts.push(`channel_name = "${parsedQuery.filters.in}"`);
  }

  // Add 'has:' filters
  if (parsedQuery.filters.has && parsedQuery.filters.has.length > 0) {
    parsedQuery.filters.has.forEach((hasValue) => {
      if (hasValue === "link") {
        filterParts.push("has_link = true");
      } else if (hasValue === "file") {
        filterParts.push("has_file = true");
      } else if (hasValue === "image") {
        filterParts.push("has_image = true");
      }
    });
  }

  // Add 'is:' filters
  if (parsedQuery.filters.is && parsedQuery.filters.is.length > 0) {
    parsedQuery.filters.is.forEach((isValue) => {
      if (isValue === "pinned") {
        filterParts.push("is_pinned = true");
      } else if (isValue === "starred") {
        filterParts.push("is_starred = true");
      }
    });
  }

  // Add date filters
  if (parsedQuery.filters.before) {
    const beforeTimestamp =
      new Date(parsedQuery.filters.before).getTime() / 1000;
    filterParts.push(`created_at < ${beforeTimestamp}`);
  }

  if (parsedQuery.filters.after) {
    const afterTimestamp = new Date(parsedQuery.filters.after).getTime() / 1000;
    filterParts.push(`created_at > ${afterTimestamp}`);
  }

  // Add any additional filters
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (typeof value === "string") {
        filterParts.push(`${key} = "${value}"`);
      } else if (typeof value === "number" || typeof value === "boolean") {
        filterParts.push(`${key} = ${value}`);
      } else if (Array.isArray(value)) {
        // Handle array filters (IN operator)
        const values = value
          .map((v) => (typeof v === "string" ? `"${v}"` : v))
          .join(", ");
        filterParts.push(`${key} IN [${values}]`);
      }
    });
  }

  // Join all filter parts with AND
  return filterParts.length > 0 ? filterParts.join(" AND ") : "";
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Get suggestions for operators as user types
 */
export function getOperatorSuggestions(partialQuery: string): string[] {
  const lastWord = partialQuery.split(" ").pop() || "";

  const allOperators = [
    "from:",
    "in:",
    "has:link",
    "has:file",
    "has:image",
    "before:",
    "after:",
    "is:pinned",
    "is:starred",
  ];

  if (!lastWord) {
    return allOperators;
  }

  // Return operators that match the partial input
  return allOperators.filter((op) => op.startsWith(lastWord.toLowerCase()));
}

/**
 * Format query for display (highlight operators)
 */
export function formatQueryForDisplay(query: string): Array<{
  text: string;
  isOperator: boolean;
}> {
  const parts: Array<{ text: string; isOperator: boolean }> = [];
  const operatorRegex = /(from:|in:|has:|before:|after:|is:)\S*/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  operatorRegex.lastIndex = 0;
  while ((match = operatorRegex.exec(query)) !== null) {
    // Add text before operator
    if (match.index > lastIndex) {
      parts.push({
        text: query.slice(lastIndex, match.index),
        isOperator: false,
      });
    }

    // Add operator
    parts.push({
      text: match[0],
      isOperator: true,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < query.length) {
    parts.push({
      text: query.slice(lastIndex),
      isOperator: false,
    });
  }

  return parts;
}

/**
 * Build a query string from filters (inverse of parseQuery)
 */
export function buildQueryFromFilters(
  filters: ParsedQuery["filters"],
  text?: string,
): string {
  const parts: string[] = [];

  if (text) {
    parts.push(text);
  }

  if (filters.from) {
    parts.push(`from:${filters.from}`);
  }

  if (filters.in) {
    parts.push(`in:${filters.in}`);
  }

  if (filters.has && filters.has.length > 0) {
    filters.has.forEach((hasValue) => {
      parts.push(`has:${hasValue}`);
    });
  }

  if (filters.is && filters.is.length > 0) {
    filters.is.forEach((isValue) => {
      parts.push(`is:${isValue}`);
    });
  }

  if (filters.before) {
    parts.push(`before:${filters.before}`);
  }

  if (filters.after) {
    parts.push(`after:${filters.after}`);
  }

  return parts.join(" ");
}

export default {
  parseQuery,
  buildMeiliSearchFilter,
  isValidDate,
  getOperatorSuggestions,
  formatQueryForDisplay,
  buildQueryFromFilters,
};
