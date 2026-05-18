/**
 * Search Parser Unit Tests
 *
 * Comprehensive tests for the search query parser including tokenization,
 * operator parsing, date parsing, and query building.
 */

import {
  tokenize,
  parseToken,
  parseDate,
  parseSearchQuery,
  serializeQuery,
  extractMentionedUsers,
  extractMentionedChannels,
  isEmptyQuery,
  validateQuery,
  buildQueryFromFilters,
  getOperatorSuggestions,
  getOperatorHelp,
  isBooleanOperator,
  isValidOperator,
  isValidHasFilter,
  isValidIsFilter,
  type ParseResult,
  type SearchFilters,
} from "../search-parser";

// ============================================================================
// Tokenizer Tests
// ============================================================================

describe("tokenize", () => {
  describe("basic tokenization", () => {
    it("should tokenize single word", () => {
      expect(tokenize("hello")).toEqual(["hello"]);
    });

    it("should tokenize multiple words", () => {
      expect(tokenize("hello world")).toEqual(["hello", "world"]);
    });

    it("should handle multiple spaces", () => {
      expect(tokenize("hello   world")).toEqual(["hello", "world"]);
    });

    it("should handle leading and trailing spaces", () => {
      expect(tokenize("  hello world  ")).toEqual(["hello", "world"]);
    });

    it("should return empty array for empty string", () => {
      expect(tokenize("")).toEqual([]);
    });

    it("should return empty array for whitespace only", () => {
      expect(tokenize("   ")).toEqual([]);
    });
  });

  describe("quoted phrases", () => {
    it("should tokenize quoted phrase as single token", () => {
      expect(tokenize('"hello world"')).toEqual(['"hello world"']);
    });

    it("should handle quoted phrase with other words", () => {
      expect(tokenize('before "hello world" after')).toEqual([
        "before",
        '"hello world"',
        "after",
      ]);
    });

    it("should handle multiple quoted phrases", () => {
      expect(tokenize('"one two" "three four"')).toEqual([
        '"one two"',
        '"three four"',
      ]);
    });

    it("should handle empty quoted phrase", () => {
      expect(tokenize('""')).toEqual(['""']);
    });

    it("should handle quotes within text", () => {
      // Quotes attached to text are kept together as one token
      expect(tokenize('hello"world"')).toEqual(['hello"world"']);
    });
  });

  describe("operators", () => {
    it("should tokenize operator as single token", () => {
      expect(tokenize("from:john")).toEqual(["from:john"]);
    });

    it("should tokenize multiple operators", () => {
      expect(tokenize("from:john in:general")).toEqual([
        "from:john",
        "in:general",
      ]);
    });

    it("should tokenize operator with quoted value", () => {
      expect(tokenize('from:"john doe"')).toEqual(['from:"john doe"']);
    });

    it("should handle mixed operators and terms", () => {
      expect(tokenize("hello from:john world")).toEqual([
        "hello",
        "from:john",
        "world",
      ]);
    });
  });
});

// ============================================================================
// Boolean Operator Detection Tests
// ============================================================================

describe("isBooleanOperator", () => {
  it("should return true for AND", () => {
    expect(isBooleanOperator("AND")).toBe(true);
  });

  it("should return true for OR", () => {
    expect(isBooleanOperator("OR")).toBe(true);
  });

  it("should return true for NOT", () => {
    expect(isBooleanOperator("NOT")).toBe(true);
  });

  it("should be case insensitive", () => {
    expect(isBooleanOperator("and")).toBe(true);
    expect(isBooleanOperator("And")).toBe(true);
    expect(isBooleanOperator("or")).toBe(true);
    expect(isBooleanOperator("not")).toBe(true);
  });

  it("should return false for non-boolean operators", () => {
    expect(isBooleanOperator("from")).toBe(false);
    expect(isBooleanOperator("hello")).toBe(false);
    expect(isBooleanOperator("ANDOR")).toBe(false);
  });
});

// ============================================================================
// Operator Validation Tests
// ============================================================================

describe("isValidOperator", () => {
  it("should return true for valid operators", () => {
    expect(isValidOperator("from")).toBe(true);
    expect(isValidOperator("in")).toBe(true);
    expect(isValidOperator("before")).toBe(true);
    expect(isValidOperator("after")).toBe(true);
    expect(isValidOperator("has")).toBe(true);
    expect(isValidOperator("is")).toBe(true);
    expect(isValidOperator("to")).toBe(true);
    expect(isValidOperator("mentions")).toBe(true);
  });

  it("should return false for invalid operators", () => {
    expect(isValidOperator("invalid")).toBe(false);
    expect(isValidOperator("FROM")).toBe(false);
    expect(isValidOperator("")).toBe(false);
  });
});

describe("isValidHasFilter", () => {
  it("should return true for valid has filters", () => {
    expect(isValidHasFilter("link")).toBe(true);
    expect(isValidHasFilter("file")).toBe(true);
    expect(isValidHasFilter("image")).toBe(true);
    expect(isValidHasFilter("code")).toBe(true);
    expect(isValidHasFilter("mention")).toBe(true);
    expect(isValidHasFilter("reaction")).toBe(true);
  });

  it("should return false for invalid has filters", () => {
    expect(isValidHasFilter("invalid")).toBe(false);
    expect(isValidHasFilter("LINK")).toBe(false);
    expect(isValidHasFilter("")).toBe(false);
  });
});

describe("isValidIsFilter", () => {
  it("should return true for valid is filters", () => {
    expect(isValidIsFilter("pinned")).toBe(true);
    expect(isValidIsFilter("starred")).toBe(true);
    expect(isValidIsFilter("thread")).toBe(true);
    expect(isValidIsFilter("unread")).toBe(true);
  });

  it("should return false for invalid is filters", () => {
    expect(isValidIsFilter("invalid")).toBe(false);
    expect(isValidIsFilter("PINNED")).toBe(false);
    expect(isValidIsFilter("")).toBe(false);
  });
});

// ============================================================================
// Token Parsing Tests
// ============================================================================

describe("parseToken", () => {
  describe("simple terms", () => {
    it("should parse simple word as term", () => {
      const result = parseToken("hello");
      expect(result).toEqual({
        type: "term",
        value: "hello",
        isPhrase: false,
        isWildcard: false,
        negated: false,
      });
    });

    it("should parse negated term", () => {
      const result = parseToken("-hello");
      expect(result).toEqual({
        type: "term",
        value: "hello",
        isPhrase: false,
        isWildcard: false,
        negated: true,
      });
    });

    it("should parse wildcard term", () => {
      const result = parseToken("hel*");
      expect(result).toEqual({
        type: "term",
        value: "hel",
        isPhrase: false,
        isWildcard: true,
        negated: false,
      });
    });

    it("should parse negated wildcard term", () => {
      const result = parseToken("-hel*");
      expect(result).toEqual({
        type: "term",
        value: "hel",
        isPhrase: false,
        isWildcard: true,
        negated: true,
      });
    });
  });

  describe("phrases", () => {
    it("should parse quoted phrase", () => {
      const result = parseToken('"hello world"');
      expect(result).toEqual({
        type: "term",
        value: "hello world",
        isPhrase: true,
        isWildcard: false,
        negated: false,
      });
    });

    it("should parse empty quoted phrase", () => {
      const result = parseToken('""');
      expect(result).toEqual({
        type: "term",
        value: "",
        isPhrase: true,
        isWildcard: false,
        negated: false,
      });
    });
  });

  describe("operators", () => {
    it("should parse from operator", () => {
      const result = parseToken("from:john");
      expect(result).toEqual({
        type: "from",
        value: "john",
        negated: false,
      });
    });

    it("should parse in operator", () => {
      const result = parseToken("in:general");
      expect(result).toEqual({
        type: "in",
        value: "general",
        negated: false,
      });
    });

    it("should parse negated operator", () => {
      const result = parseToken("-from:john");
      expect(result).toEqual({
        type: "from",
        value: "john",
        negated: true,
      });
    });

    it("should parse operator with quoted value", () => {
      const result = parseToken('from:"john doe"');
      expect(result).toEqual({
        type: "from",
        value: "john doe",
        negated: false,
      });
    });

    it("should parse before operator", () => {
      const result = parseToken("before:2024-01-01");
      expect(result).toEqual({
        type: "before",
        value: "2024-01-01",
        negated: false,
      });
    });

    it("should parse after operator", () => {
      const result = parseToken("after:2024-01-01");
      expect(result).toEqual({
        type: "after",
        value: "2024-01-01",
        negated: false,
      });
    });

    it("should parse has operator", () => {
      const result = parseToken("has:link");
      expect(result).toEqual({
        type: "has",
        value: "link",
        negated: false,
      });
    });

    it("should parse is operator", () => {
      const result = parseToken("is:pinned");
      expect(result).toEqual({
        type: "is",
        value: "pinned",
        negated: false,
      });
    });

    it("should parse to operator", () => {
      const result = parseToken("to:jane");
      expect(result).toEqual({
        type: "to",
        value: "jane",
        negated: false,
      });
    });

    it("should parse mentions operator", () => {
      const result = parseToken("mentions:alice");
      expect(result).toEqual({
        type: "mentions",
        value: "alice",
        negated: false,
      });
    });

    it("should treat invalid operator as term", () => {
      const result = parseToken("invalid:value");
      expect(result.type).toBe("term");
    });
  });
});

// ============================================================================
// Date Parsing Tests
// ============================================================================

describe("parseDate", () => {
  describe("standard formats", () => {
    it("should parse YYYY-MM-DD format", () => {
      const result = parseDate("2024-01-15");
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(15);
    });

    it("should parse YYYY/MM/DD format", () => {
      const result = parseDate("2024/01/15");
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it("should return null for invalid date format", () => {
      expect(parseDate("invalid")).toBeNull();
      expect(parseDate("01-15-2024")).toBeNull();
      expect(parseDate("not-a-date")).toBeNull();
    });
  });

  describe("relative dates", () => {
    it('should parse "today"', () => {
      const result = parseDate("today");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(result).not.toBeNull();
      expect(result?.toDateString()).toBe(today.toDateString());
    });

    it('should parse "yesterday"', () => {
      const result = parseDate("yesterday");
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      expect(result).not.toBeNull();
      expect(result?.toDateString()).toBe(yesterday.toDateString());
    });

    it("should be case insensitive for relative dates", () => {
      expect(parseDate("TODAY")).not.toBeNull();
      expect(parseDate("Today")).not.toBeNull();
      expect(parseDate("YESTERDAY")).not.toBeNull();
    });

    it("should parse days ago format (7d)", () => {
      const result = parseDate("7d");
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);
      expected.setHours(0, 0, 0, 0);
      expect(result).not.toBeNull();
      expect(result?.toDateString()).toBe(expected.toDateString());
    });

    it("should parse weeks ago format (2w)", () => {
      const result = parseDate("2w");
      const expected = new Date();
      expected.setDate(expected.getDate() - 14);
      expected.setHours(0, 0, 0, 0);
      expect(result).not.toBeNull();
      expect(result?.toDateString()).toBe(expected.toDateString());
    });

    it("should parse months ago format (3m)", () => {
      const result = parseDate("3m");
      const expected = new Date();
      expected.setMonth(expected.getMonth() - 3);
      expected.setHours(0, 0, 0, 0);
      expect(result).not.toBeNull();
      expect(result?.getMonth()).toBe(expected.getMonth());
    });
  });
});

// ============================================================================
// Full Query Parsing Tests
// ============================================================================

describe("parseSearchQuery", () => {
  describe("simple queries", () => {
    it("should parse empty query", () => {
      const result = parseSearchQuery("");
      expect(result.query.terms).toHaveLength(0);
      expect(result.query.operators).toHaveLength(0);
      expect(result.textQuery).toBe("");
    });

    it("should parse single term", () => {
      const result = parseSearchQuery("hello");
      expect(result.query.terms).toHaveLength(1);
      expect(result.query.terms[0].value).toBe("hello");
      expect(result.textQuery).toBe("hello");
    });

    it("should parse multiple terms", () => {
      const result = parseSearchQuery("hello world");
      expect(result.query.terms).toHaveLength(2);
      expect(result.textQuery).toBe("hello world");
    });

    it("should parse phrase", () => {
      const result = parseSearchQuery('"hello world"');
      expect(result.query.terms).toHaveLength(1);
      expect(result.query.terms[0].isPhrase).toBe(true);
      expect(result.textQuery).toBe('"hello world"');
    });

    it("should parse wildcard", () => {
      const result = parseSearchQuery("hel*");
      expect(result.query.terms).toHaveLength(1);
      expect(result.query.terms[0].isWildcard).toBe(true);
      expect(result.textQuery).toBe("hel*");
    });
  });

  describe("operator queries", () => {
    it("should parse from operator", () => {
      const result = parseSearchQuery("from:john");
      expect(result.filters.fromUsers).toEqual(["john"]);
    });

    it("should parse in operator", () => {
      const result = parseSearchQuery("in:general");
      expect(result.filters.inChannels).toEqual(["general"]);
    });

    it("should parse multiple from operators", () => {
      const result = parseSearchQuery("from:john from:jane");
      expect(result.filters.fromUsers).toEqual(["john", "jane"]);
    });

    it("should parse multiple in operators", () => {
      const result = parseSearchQuery("in:general in:random");
      expect(result.filters.inChannels).toEqual(["general", "random"]);
    });

    it("should parse to operator", () => {
      const result = parseSearchQuery("to:jane");
      expect(result.filters.toUsers).toEqual(["jane"]);
    });

    it("should parse mentions operator", () => {
      const result = parseSearchQuery("mentions:alice");
      expect(result.filters.mentionsUsers).toEqual(["alice"]);
    });

    it("should parse has operator", () => {
      const result = parseSearchQuery("has:link");
      expect(result.filters.hasFilters).toEqual(["link"]);
    });

    it("should parse multiple has operators", () => {
      const result = parseSearchQuery("has:link has:image");
      expect(result.filters.hasFilters).toEqual(["link", "image"]);
    });

    it("should not duplicate has filters", () => {
      const result = parseSearchQuery("has:link has:link");
      expect(result.filters.hasFilters).toEqual(["link"]);
    });

    it("should parse is operator", () => {
      const result = parseSearchQuery("is:pinned");
      expect(result.filters.isFilters).toEqual(["pinned"]);
    });

    it("should not duplicate is filters", () => {
      const result = parseSearchQuery("is:pinned is:pinned");
      expect(result.filters.isFilters).toEqual(["pinned"]);
    });
  });

  describe("date operators", () => {
    it("should parse before date", () => {
      const result = parseSearchQuery("before:2024-01-15");
      expect(result.filters.beforeDate).not.toBeNull();
      expect(result.filters.beforeDate?.toISOString().split("T")[0]).toBe(
        "2024-01-15",
      );
    });

    it("should parse after date", () => {
      const result = parseSearchQuery("after:2024-01-15");
      expect(result.filters.afterDate).not.toBeNull();
      expect(result.filters.afterDate?.toISOString().split("T")[0]).toBe(
        "2024-01-15",
      );
    });

    it("should handle invalid date with error", () => {
      const result = parseSearchQuery("before:invalid");
      expect(result.filters.beforeDate).toBeNull();
      expect(result.query.hasErrors).toBe(true);
      expect(result.query.errors).toContain("Invalid date format: invalid");
    });
  });

  describe("combined queries", () => {
    it("should parse text with operators", () => {
      const result = parseSearchQuery("hello from:john in:general");
      expect(result.query.terms).toHaveLength(1);
      expect(result.query.terms[0].value).toBe("hello");
      expect(result.filters.fromUsers).toEqual(["john"]);
      expect(result.filters.inChannels).toEqual(["general"]);
      expect(result.textQuery).toBe("hello");
    });

    it("should parse complex query", () => {
      const result = parseSearchQuery(
        '"exact phrase" from:john in:general has:link is:pinned',
      );
      expect(result.query.terms).toHaveLength(1);
      expect(result.query.terms[0].isPhrase).toBe(true);
      expect(result.filters.fromUsers).toEqual(["john"]);
      expect(result.filters.inChannels).toEqual(["general"]);
      expect(result.filters.hasFilters).toEqual(["link"]);
      expect(result.filters.isFilters).toEqual(["pinned"]);
    });

    it("should skip boolean operators", () => {
      const result = parseSearchQuery("hello AND world");
      expect(result.query.terms).toHaveLength(2);
    });

    it("should handle negated operators", () => {
      const result = parseSearchQuery("-from:john hello");
      expect(result.filters.fromUsers).toEqual([]);
      expect(result.query.operators[0].negated).toBe(true);
    });

    it("should handle negated terms", () => {
      const result = parseSearchQuery("-hello world");
      expect(result.query.terms[0].negated).toBe(true);
      expect(result.query.terms[1].negated).toBe(false);
      expect(result.textQuery).toBe("world"); // negated terms excluded
    });
  });

  describe("error handling", () => {
    it("should report invalid has filter", () => {
      const result = parseSearchQuery("has:invalid");
      expect(result.query.hasErrors).toBe(true);
      expect(result.query.errors).toContain("Invalid has filter: invalid");
    });

    it("should report invalid is filter", () => {
      const result = parseSearchQuery("is:invalid");
      expect(result.query.hasErrors).toBe(true);
      expect(result.query.errors).toContain("Invalid is filter: invalid");
    });

    it("should continue parsing after error", () => {
      const result = parseSearchQuery("has:invalid hello");
      expect(result.query.hasErrors).toBe(true);
      expect(result.query.terms).toHaveLength(1);
    });
  });
});

// ============================================================================
// Serialization Tests
// ============================================================================

describe("serializeQuery", () => {
  it("should serialize simple terms", () => {
    const result = parseSearchQuery("hello world");
    expect(serializeQuery(result)).toBe("hello world");
  });

  it("should serialize operators", () => {
    const result = parseSearchQuery("from:john in:general");
    expect(serializeQuery(result)).toBe("from:john in:general");
  });

  it("should serialize phrases", () => {
    const result = parseSearchQuery('"hello world"');
    expect(serializeQuery(result)).toBe('"hello world"');
  });

  it("should serialize wildcards", () => {
    const result = parseSearchQuery("hel*");
    expect(serializeQuery(result)).toBe("hel*");
  });

  it("should serialize negated operators", () => {
    const result = parseSearchQuery("-from:john");
    expect(serializeQuery(result)).toBe("-from:john");
  });

  it("should serialize complex query", () => {
    const result = parseSearchQuery('hello from:john "exact phrase"');
    const serialized = serializeQuery(result);
    expect(serialized).toContain("from:john");
    expect(serialized).toContain("hello");
    expect(serialized).toContain('"exact phrase"');
  });
});

// ============================================================================
// Extraction Helpers Tests
// ============================================================================

describe("extractMentionedUsers", () => {
  it("should extract users from from operator", () => {
    const result = parseSearchQuery("from:john");
    expect(extractMentionedUsers(result)).toEqual(["john"]);
  });

  it("should extract users from to operator", () => {
    const result = parseSearchQuery("to:jane");
    expect(extractMentionedUsers(result)).toEqual(["jane"]);
  });

  it("should extract users from mentions operator", () => {
    const result = parseSearchQuery("mentions:alice");
    expect(extractMentionedUsers(result)).toEqual(["alice"]);
  });

  it("should extract all users from combined operators", () => {
    const result = parseSearchQuery("from:john to:jane mentions:alice");
    const users = extractMentionedUsers(result);
    expect(users).toContain("john");
    expect(users).toContain("jane");
    expect(users).toContain("alice");
  });

  it("should deduplicate users", () => {
    const result = parseSearchQuery("from:john to:john");
    expect(extractMentionedUsers(result)).toEqual(["john"]);
  });

  it("should return empty array for no users", () => {
    const result = parseSearchQuery("hello world");
    expect(extractMentionedUsers(result)).toEqual([]);
  });
});

describe("extractMentionedChannels", () => {
  it("should extract channels from in operator", () => {
    const result = parseSearchQuery("in:general");
    expect(extractMentionedChannels(result)).toEqual(["general"]);
  });

  it("should extract multiple channels", () => {
    const result = parseSearchQuery("in:general in:random");
    expect(extractMentionedChannels(result)).toEqual(["general", "random"]);
  });

  it("should deduplicate channels", () => {
    const result = parseSearchQuery("in:general in:general");
    expect(extractMentionedChannels(result)).toEqual(["general"]);
  });

  it("should return empty array for no channels", () => {
    const result = parseSearchQuery("hello world");
    expect(extractMentionedChannels(result)).toEqual([]);
  });
});

// ============================================================================
// Query Validation Tests
// ============================================================================

describe("isEmptyQuery", () => {
  it("should return true for empty query", () => {
    const result = parseSearchQuery("");
    expect(isEmptyQuery(result)).toBe(true);
  });

  it("should return true for whitespace only", () => {
    const result = parseSearchQuery("   ");
    expect(isEmptyQuery(result)).toBe(true);
  });

  it("should return false for query with terms", () => {
    const result = parseSearchQuery("hello");
    expect(isEmptyQuery(result)).toBe(false);
  });

  it("should return false for query with operators only", () => {
    const result = parseSearchQuery("from:john");
    expect(isEmptyQuery(result)).toBe(false);
  });
});

describe("validateQuery", () => {
  it("should return empty array for valid query", () => {
    expect(validateQuery("hello from:john")).toEqual([]);
  });

  it("should return errors for invalid has filter", () => {
    const errors = validateQuery("has:invalid");
    expect(errors).toContain("Invalid has filter: invalid");
  });

  it("should return errors for invalid is filter", () => {
    const errors = validateQuery("is:invalid");
    expect(errors).toContain("Invalid is filter: invalid");
  });

  it("should return errors for invalid date", () => {
    const errors = validateQuery("before:invalid");
    expect(errors).toContain("Invalid date format: invalid");
  });

  it("should return multiple errors", () => {
    const errors = validateQuery("has:invalid is:invalid");
    expect(errors).toHaveLength(2);
  });
});

// ============================================================================
// Query Building Tests
// ============================================================================

describe("buildQueryFromFilters", () => {
  it("should build empty query for empty filters", () => {
    expect(buildQueryFromFilters({})).toBe("");
  });

  it("should include text query", () => {
    expect(buildQueryFromFilters({}, "hello")).toBe("hello");
  });

  it("should build from operator", () => {
    expect(buildQueryFromFilters({ fromUsers: ["john"] })).toBe("from:john");
  });

  it("should build multiple from operators", () => {
    expect(buildQueryFromFilters({ fromUsers: ["john", "jane"] })).toBe(
      "from:john from:jane",
    );
  });

  it("should build in operator", () => {
    expect(buildQueryFromFilters({ inChannels: ["general"] })).toBe(
      "in:general",
    );
  });

  it("should build to operator", () => {
    expect(buildQueryFromFilters({ toUsers: ["jane"] })).toBe("to:jane");
  });

  it("should build mentions operator", () => {
    expect(buildQueryFromFilters({ mentionsUsers: ["alice"] })).toBe(
      "mentions:alice",
    );
  });

  it("should build before date", () => {
    const date = new Date("2024-01-15");
    const query = buildQueryFromFilters({ beforeDate: date });
    expect(query).toBe("before:2024-01-15");
  });

  it("should build after date", () => {
    const date = new Date("2024-01-15");
    const query = buildQueryFromFilters({ afterDate: date });
    expect(query).toBe("after:2024-01-15");
  });

  it("should build has filters", () => {
    expect(buildQueryFromFilters({ hasFilters: ["link", "image"] })).toBe(
      "has:link has:image",
    );
  });

  it("should build is filters", () => {
    expect(buildQueryFromFilters({ isFilters: ["pinned", "starred"] })).toBe(
      "is:pinned is:starred",
    );
  });

  it("should build complex query", () => {
    const filters: Partial<SearchFilters> = {
      fromUsers: ["john"],
      inChannels: ["general"],
      hasFilters: ["link"],
      isFilters: ["pinned"],
    };
    const query = buildQueryFromFilters(filters, "hello");
    expect(query).toContain("hello");
    expect(query).toContain("from:john");
    expect(query).toContain("in:general");
    expect(query).toContain("has:link");
    expect(query).toContain("is:pinned");
  });
});

// ============================================================================
// Autocomplete Suggestions Tests
// ============================================================================

describe("getOperatorSuggestions", () => {
  describe("operator completion", () => {
    it("should suggest operators starting with prefix", () => {
      const suggestions = getOperatorSuggestions("fr");
      expect(suggestions).toContain("from:");
    });

    it("should suggest all operators for empty string", () => {
      const suggestions = getOperatorSuggestions("");
      expect(suggestions).toContain("from:");
      expect(suggestions).toContain("in:");
      expect(suggestions).toContain("before:");
      expect(suggestions).toContain("after:");
    });

    it("should return empty for no matches", () => {
      const suggestions = getOperatorSuggestions("xyz");
      expect(suggestions).toEqual([]);
    });
  });

  describe("has value completion", () => {
    it("should suggest has values", () => {
      const suggestions = getOperatorSuggestions("has:l");
      expect(suggestions).toContain("has:link");
    });

    it("should suggest all has values for empty value", () => {
      const suggestions = getOperatorSuggestions("has:");
      expect(suggestions).toContain("has:link");
      expect(suggestions).toContain("has:file");
      expect(suggestions).toContain("has:image");
    });
  });

  describe("is value completion", () => {
    it("should suggest is values", () => {
      const suggestions = getOperatorSuggestions("is:p");
      expect(suggestions).toContain("is:pinned");
    });

    it("should suggest all is values for empty value", () => {
      const suggestions = getOperatorSuggestions("is:");
      expect(suggestions).toContain("is:pinned");
      expect(suggestions).toContain("is:starred");
      expect(suggestions).toContain("is:thread");
      expect(suggestions).toContain("is:unread");
    });
  });

  describe("date value completion", () => {
    it("should suggest relative dates for before", () => {
      const suggestions = getOperatorSuggestions("before:");
      expect(suggestions).toContain("before:today");
      expect(suggestions).toContain("before:yesterday");
      expect(suggestions).toContain("before:7d");
      expect(suggestions).toContain("before:30d");
    });

    it("should suggest relative dates for after", () => {
      const suggestions = getOperatorSuggestions("after:");
      expect(suggestions).toContain("after:today");
      expect(suggestions).toContain("after:yesterday");
    });
  });
});

// ============================================================================
// Operator Help Tests
// ============================================================================

describe("getOperatorHelp", () => {
  it("should return help for all operators", () => {
    const help = getOperatorHelp();
    expect(help.from).toBeDefined();
    expect(help.in).toBeDefined();
    expect(help.before).toBeDefined();
    expect(help.after).toBeDefined();
    expect(help.has).toBeDefined();
    expect(help.is).toBeDefined();
    expect(help.to).toBeDefined();
    expect(help.mentions).toBeDefined();
  });

  it("should have non-empty help strings", () => {
    const help = getOperatorHelp();
    Object.values(help).forEach((helpText) => {
      expect(helpText.length).toBeGreaterThan(0);
    });
  });
});
