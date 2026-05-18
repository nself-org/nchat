/**
 * Event Schema Tests
 *
 * Tests for analytics event types, validation, and helpers.
 */

import {
  AnalyticsEvent,
  EventCategory,
  eventCategoryMap,
  isValidEventName,
  getEventCategory,
  validateEventProperties,
  validateTrackedEvent,
  createEventId,
  getEventsByCategory,
  isErrorEvent,
  isPerformanceEvent,
  isSessionEvent,
  TrackedEvent,
  BaseEventProperties,
} from "../event-schema";

// ============================================================================
// Test Helpers
// ============================================================================

const createBaseProperties = (
  overrides?: Partial<BaseEventProperties>,
): BaseEventProperties => ({
  timestamp: Date.now(),
  sessionId: "session-123",
  userId: "user-456",
  platform: "web",
  appVersion: "1.0.0",
  ...overrides,
});

const createTrackedEvent = <T extends AnalyticsEvent>(
  name: T,
  properties: Record<string, unknown> = {},
  baseOverrides?: Partial<BaseEventProperties>,
): TrackedEvent<T> => ({
  id: createEventId(),
  name,
  category: eventCategoryMap[name],
  properties: properties as TrackedEvent<T>["properties"],
  base: createBaseProperties(baseOverrides),
});

// ============================================================================
// AnalyticsEvent Enum Tests
// ============================================================================

describe("AnalyticsEvent Enum", () => {
  it("should have all navigation events", () => {
    expect(AnalyticsEvent.PAGE_VIEW).toBe("page_view");
    expect(AnalyticsEvent.NAVIGATION).toBe("navigation");
  });

  it("should have all authentication events", () => {
    expect(AnalyticsEvent.SIGN_IN).toBe("sign_in");
    expect(AnalyticsEvent.SIGN_OUT).toBe("sign_out");
    expect(AnalyticsEvent.SIGN_UP).toBe("sign_up");
    expect(AnalyticsEvent.PASSWORD_RESET).toBe("password_reset");
  });

  it("should have all messaging events", () => {
    expect(AnalyticsEvent.MESSAGE_SENT).toBe("message_sent");
    expect(AnalyticsEvent.MESSAGE_EDITED).toBe("message_edited");
    expect(AnalyticsEvent.MESSAGE_DELETED).toBe("message_deleted");
    expect(AnalyticsEvent.REACTION_ADDED).toBe("reaction_added");
    expect(AnalyticsEvent.REACTION_REMOVED).toBe("reaction_removed");
  });

  it("should have all channel events", () => {
    expect(AnalyticsEvent.CHANNEL_CREATED).toBe("channel_created");
    expect(AnalyticsEvent.CHANNEL_JOINED).toBe("channel_joined");
    expect(AnalyticsEvent.CHANNEL_LEFT).toBe("channel_left");
    expect(AnalyticsEvent.CHANNEL_ARCHIVED).toBe("channel_archived");
    expect(AnalyticsEvent.CHANNEL_UPDATED).toBe("channel_updated");
  });

  it("should have all call events", () => {
    expect(AnalyticsEvent.CALL_STARTED).toBe("call_started");
    expect(AnalyticsEvent.CALL_ENDED).toBe("call_ended");
    expect(AnalyticsEvent.CALL_JOINED).toBe("call_joined");
    expect(AnalyticsEvent.CALL_LEFT).toBe("call_left");
    expect(AnalyticsEvent.SCREEN_SHARED).toBe("screen_shared");
  });

  it("should have all error events", () => {
    expect(AnalyticsEvent.ERROR_OCCURRED).toBe("error_occurred");
    expect(AnalyticsEvent.API_ERROR).toBe("api_error");
    expect(AnalyticsEvent.WEBSOCKET_ERROR).toBe("websocket_error");
  });

  it("should have all session events", () => {
    expect(AnalyticsEvent.SESSION_START).toBe("session_start");
    expect(AnalyticsEvent.SESSION_END).toBe("session_end");
    expect(AnalyticsEvent.SESSION_RESUME).toBe("session_resume");
  });

  it("should have all performance events", () => {
    expect(AnalyticsEvent.PERFORMANCE_MARK).toBe("performance_mark");
    expect(AnalyticsEvent.SLOW_OPERATION).toBe("slow_operation");
  });

  it("should have feature events", () => {
    expect(AnalyticsEvent.FEATURE_USED).toBe("feature_used");
    expect(AnalyticsEvent.SEARCH_PERFORMED).toBe("search_performed");
    expect(AnalyticsEvent.FILE_UPLOADED).toBe("file_uploaded");
    expect(AnalyticsEvent.FILE_DOWNLOADED).toBe("file_downloaded");
  });
});

// ============================================================================
// EventCategory Enum Tests
// ============================================================================

describe("EventCategory Enum", () => {
  it("should have all expected categories", () => {
    expect(EventCategory.NAVIGATION).toBe("navigation");
    expect(EventCategory.AUTHENTICATION).toBe("authentication");
    expect(EventCategory.MESSAGING).toBe("messaging");
    expect(EventCategory.CHANNELS).toBe("channels");
    expect(EventCategory.DIRECT_MESSAGES).toBe("direct_messages");
    expect(EventCategory.THREADS).toBe("threads");
    expect(EventCategory.CALLS).toBe("calls");
    expect(EventCategory.FEATURES).toBe("features");
    expect(EventCategory.USER_ACTIONS).toBe("user_actions");
    expect(EventCategory.ERRORS).toBe("errors");
    expect(EventCategory.PERFORMANCE).toBe("performance");
    expect(EventCategory.SESSION).toBe("session");
    expect(EventCategory.ENGAGEMENT).toBe("engagement");
  });
});

// ============================================================================
// eventCategoryMap Tests
// ============================================================================

describe("eventCategoryMap", () => {
  it("should map navigation events correctly", () => {
    expect(eventCategoryMap[AnalyticsEvent.PAGE_VIEW]).toBe(
      EventCategory.NAVIGATION,
    );
    expect(eventCategoryMap[AnalyticsEvent.NAVIGATION]).toBe(
      EventCategory.NAVIGATION,
    );
  });

  it("should map authentication events correctly", () => {
    expect(eventCategoryMap[AnalyticsEvent.SIGN_IN]).toBe(
      EventCategory.AUTHENTICATION,
    );
    expect(eventCategoryMap[AnalyticsEvent.SIGN_OUT]).toBe(
      EventCategory.AUTHENTICATION,
    );
    expect(eventCategoryMap[AnalyticsEvent.SIGN_UP]).toBe(
      EventCategory.AUTHENTICATION,
    );
    expect(eventCategoryMap[AnalyticsEvent.PASSWORD_RESET]).toBe(
      EventCategory.AUTHENTICATION,
    );
  });

  it("should map messaging events correctly", () => {
    expect(eventCategoryMap[AnalyticsEvent.MESSAGE_SENT]).toBe(
      EventCategory.MESSAGING,
    );
    expect(eventCategoryMap[AnalyticsEvent.MESSAGE_EDITED]).toBe(
      EventCategory.MESSAGING,
    );
    expect(eventCategoryMap[AnalyticsEvent.MESSAGE_DELETED]).toBe(
      EventCategory.MESSAGING,
    );
    expect(eventCategoryMap[AnalyticsEvent.REACTION_ADDED]).toBe(
      EventCategory.MESSAGING,
    );
    expect(eventCategoryMap[AnalyticsEvent.REACTION_REMOVED]).toBe(
      EventCategory.MESSAGING,
    );
  });

  it("should map channel events correctly", () => {
    expect(eventCategoryMap[AnalyticsEvent.CHANNEL_CREATED]).toBe(
      EventCategory.CHANNELS,
    );
    expect(eventCategoryMap[AnalyticsEvent.CHANNEL_JOINED]).toBe(
      EventCategory.CHANNELS,
    );
    expect(eventCategoryMap[AnalyticsEvent.CHANNEL_LEFT]).toBe(
      EventCategory.CHANNELS,
    );
    expect(eventCategoryMap[AnalyticsEvent.CHANNEL_ARCHIVED]).toBe(
      EventCategory.CHANNELS,
    );
  });

  it("should map error events correctly", () => {
    expect(eventCategoryMap[AnalyticsEvent.ERROR_OCCURRED]).toBe(
      EventCategory.ERRORS,
    );
    expect(eventCategoryMap[AnalyticsEvent.API_ERROR]).toBe(
      EventCategory.ERRORS,
    );
    expect(eventCategoryMap[AnalyticsEvent.WEBSOCKET_ERROR]).toBe(
      EventCategory.ERRORS,
    );
  });

  it("should map session events correctly", () => {
    expect(eventCategoryMap[AnalyticsEvent.SESSION_START]).toBe(
      EventCategory.SESSION,
    );
    expect(eventCategoryMap[AnalyticsEvent.SESSION_END]).toBe(
      EventCategory.SESSION,
    );
    expect(eventCategoryMap[AnalyticsEvent.SESSION_RESUME]).toBe(
      EventCategory.SESSION,
    );
  });

  it("should map performance events correctly", () => {
    expect(eventCategoryMap[AnalyticsEvent.PERFORMANCE_MARK]).toBe(
      EventCategory.PERFORMANCE,
    );
    expect(eventCategoryMap[AnalyticsEvent.SLOW_OPERATION]).toBe(
      EventCategory.PERFORMANCE,
    );
  });

  it("should map all events to a category", () => {
    const allEvents = Object.values(AnalyticsEvent);
    for (const event of allEvents) {
      expect(eventCategoryMap[event]).toBeDefined();
      expect(Object.values(EventCategory)).toContain(eventCategoryMap[event]);
    }
  });
});

// ============================================================================
// isValidEventName Tests
// ============================================================================

describe("isValidEventName", () => {
  it("should return true for valid event names", () => {
    expect(isValidEventName("page_view")).toBe(true);
    expect(isValidEventName("message_sent")).toBe(true);
    expect(isValidEventName("error_occurred")).toBe(true);
    expect(isValidEventName("session_start")).toBe(true);
  });

  it("should return false for invalid event names", () => {
    expect(isValidEventName("invalid_event")).toBe(false);
    expect(isValidEventName("")).toBe(false);
    expect(isValidEventName("PAGE_VIEW")).toBe(false);
    expect(isValidEventName("pageView")).toBe(false);
  });

  it("should work with all AnalyticsEvent values", () => {
    Object.values(AnalyticsEvent).forEach((event) => {
      expect(isValidEventName(event)).toBe(true);
    });
  });
});

// ============================================================================
// getEventCategory Tests
// ============================================================================

describe("getEventCategory", () => {
  it("should return correct category for navigation events", () => {
    expect(getEventCategory(AnalyticsEvent.PAGE_VIEW)).toBe(
      EventCategory.NAVIGATION,
    );
    expect(getEventCategory(AnalyticsEvent.NAVIGATION)).toBe(
      EventCategory.NAVIGATION,
    );
  });

  it("should return correct category for messaging events", () => {
    expect(getEventCategory(AnalyticsEvent.MESSAGE_SENT)).toBe(
      EventCategory.MESSAGING,
    );
    expect(getEventCategory(AnalyticsEvent.MESSAGE_EDITED)).toBe(
      EventCategory.MESSAGING,
    );
  });

  it("should return correct category for error events", () => {
    expect(getEventCategory(AnalyticsEvent.ERROR_OCCURRED)).toBe(
      EventCategory.ERRORS,
    );
    expect(getEventCategory(AnalyticsEvent.API_ERROR)).toBe(
      EventCategory.ERRORS,
    );
  });

  it("should return correct category for all event types", () => {
    expect(getEventCategory(AnalyticsEvent.CALL_STARTED)).toBe(
      EventCategory.CALLS,
    );
    expect(getEventCategory(AnalyticsEvent.FEATURE_USED)).toBe(
      EventCategory.FEATURES,
    );
    expect(getEventCategory(AnalyticsEvent.THEME_CHANGED)).toBe(
      EventCategory.USER_ACTIONS,
    );
    expect(getEventCategory(AnalyticsEvent.APP_BACKGROUNDED)).toBe(
      EventCategory.ENGAGEMENT,
    );
  });
});

// ============================================================================
// validateEventProperties Tests
// ============================================================================

describe("validateEventProperties", () => {
  describe("PAGE_VIEW validation", () => {
    it("should validate valid page view properties", () => {
      const result = validateEventProperties(AnalyticsEvent.PAGE_VIEW, {
        path: "/chat",
        title: "Chat Page",
      });
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should fail validation for missing path", () => {
      const result = validateEventProperties(AnalyticsEvent.PAGE_VIEW, {
        title: "Chat Page",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("path");
    });

    it("should fail validation for missing title", () => {
      const result = validateEventProperties(AnalyticsEvent.PAGE_VIEW, {
        path: "/chat",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("title");
    });

    it("should fail validation for missing both required fields", () => {
      const result = validateEventProperties(AnalyticsEvent.PAGE_VIEW, {});
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("path");
      expect(result.missingFields).toContain("title");
    });
  });

  describe("MESSAGE_SENT validation", () => {
    it("should validate valid message sent properties", () => {
      const result = validateEventProperties(AnalyticsEvent.MESSAGE_SENT, {
        channelId: "channel-123",
        channelType: "public",
        length: 100,
      });
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should fail validation for missing channelId", () => {
      const result = validateEventProperties(AnalyticsEvent.MESSAGE_SENT, {
        channelType: "public",
        length: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("channelId");
    });

    it("should fail validation for missing channelType", () => {
      const result = validateEventProperties(AnalyticsEvent.MESSAGE_SENT, {
        channelId: "channel-123",
        length: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("channelType");
    });

    it("should fail validation for missing length", () => {
      const result = validateEventProperties(AnalyticsEvent.MESSAGE_SENT, {
        channelId: "channel-123",
        channelType: "public",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("length");
    });
  });

  describe("ERROR_OCCURRED validation", () => {
    it("should validate valid error properties", () => {
      const result = validateEventProperties(AnalyticsEvent.ERROR_OCCURRED, {
        errorType: "NetworkError",
        errorMessage: "Failed to fetch",
      });
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should fail validation for missing errorType", () => {
      const result = validateEventProperties(AnalyticsEvent.ERROR_OCCURRED, {
        errorMessage: "Failed to fetch",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("errorType");
    });

    it("should fail validation for missing errorMessage", () => {
      const result = validateEventProperties(AnalyticsEvent.ERROR_OCCURRED, {
        errorType: "NetworkError",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("errorMessage");
    });
  });

  describe("API_ERROR validation", () => {
    it("should validate valid API error properties", () => {
      const result = validateEventProperties(AnalyticsEvent.API_ERROR, {
        endpoint: "/api/messages",
        method: "POST",
        statusCode: 500,
        errorMessage: "Internal Server Error",
        requestDuration: 1500,
      });
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should fail validation for missing required fields", () => {
      const result = validateEventProperties(AnalyticsEvent.API_ERROR, {
        endpoint: "/api/messages",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("method");
      expect(result.missingFields).toContain("statusCode");
      expect(result.missingFields).toContain("errorMessage");
      expect(result.missingFields).toContain("requestDuration");
    });
  });

  describe("SEARCH_PERFORMED validation", () => {
    it("should validate valid search properties", () => {
      const result = validateEventProperties(AnalyticsEvent.SEARCH_PERFORMED, {
        query: "test search",
        queryLength: 11,
        resultCount: 5,
        searchDuration: 200,
      });
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should fail validation for missing search fields", () => {
      const result = validateEventProperties(AnalyticsEvent.SEARCH_PERFORMED, {
        query: "test",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("queryLength");
      expect(result.missingFields).toContain("resultCount");
      expect(result.missingFields).toContain("searchDuration");
    });
  });

  describe("FILE_UPLOADED validation", () => {
    it("should validate valid file upload properties", () => {
      const result = validateEventProperties(AnalyticsEvent.FILE_UPLOADED, {
        fileId: "file-123",
        fileName: "document.pdf",
        fileType: "application/pdf",
        fileSize: 1024000,
      });
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should fail validation for missing file fields", () => {
      const result = validateEventProperties(AnalyticsEvent.FILE_UPLOADED, {
        fileId: "file-123",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("fileName");
      expect(result.missingFields).toContain("fileType");
      expect(result.missingFields).toContain("fileSize");
    });
  });

  describe("Events without required fields", () => {
    it("should pass validation for events without required fields", () => {
      const result = validateEventProperties(AnalyticsEvent.SIGN_OUT, {});
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should pass validation with optional properties", () => {
      const result = validateEventProperties(AnalyticsEvent.SIGN_OUT, {
        someOptional: "value",
      });
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  describe("Null and undefined handling", () => {
    it("should treat null values as missing", () => {
      const result = validateEventProperties(AnalyticsEvent.PAGE_VIEW, {
        path: null,
        title: "Title",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("path");
    });

    it("should treat undefined values as missing", () => {
      const result = validateEventProperties(AnalyticsEvent.PAGE_VIEW, {
        path: undefined,
        title: "Title",
      });
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("path");
    });
  });
});

// ============================================================================
// validateTrackedEvent Tests
// ============================================================================

describe("validateTrackedEvent", () => {
  it("should validate a valid tracked event", () => {
    const event = createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
      path: "/chat",
      title: "Chat Page",
    });
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail validation for missing event id", () => {
    const event = createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
      path: "/chat",
      title: "Chat Page",
    });
    event.id = "";
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Event must have a valid string id");
  });

  it("should fail validation for invalid event name", () => {
    const event = createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
      path: "/chat",
      title: "Chat Page",
    });
    (event as TrackedEvent).name = "invalid_event" as AnalyticsEvent;
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid event name"))).toBe(
      true,
    );
  });

  it("should fail validation for category mismatch", () => {
    const event = createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
      path: "/chat",
      title: "Chat Page",
    });
    event.category = EventCategory.MESSAGING;
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Event category mismatch")),
    ).toBe(true);
  });

  it("should fail validation for missing base properties", () => {
    const event = createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
      path: "/chat",
      title: "Chat Page",
    });
    (event as Partial<TrackedEvent>).base =
      undefined as unknown as BaseEventProperties;
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Event must have base properties");
  });

  it("should fail validation for invalid timestamp", () => {
    const event = createTrackedEvent(
      AnalyticsEvent.PAGE_VIEW,
      { path: "/chat", title: "Chat Page" },
      { timestamp: -1 },
    );
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Event must have a valid timestamp");
  });

  it("should fail validation for zero timestamp", () => {
    const event = createTrackedEvent(
      AnalyticsEvent.PAGE_VIEW,
      { path: "/chat", title: "Chat Page" },
      { timestamp: 0 },
    );
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Event must have a valid timestamp");
  });

  it("should fail validation for missing sessionId", () => {
    const event = createTrackedEvent(
      AnalyticsEvent.PAGE_VIEW,
      { path: "/chat", title: "Chat Page" },
      { sessionId: "" },
    );
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Event must have a sessionId");
  });

  it("should fail validation for missing platform", () => {
    const event = createTrackedEvent(
      AnalyticsEvent.PAGE_VIEW,
      { path: "/chat", title: "Chat Page" },
      { platform: "" as "web" },
    );
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Event must have a platform");
  });

  it("should fail validation for missing appVersion", () => {
    const event = createTrackedEvent(
      AnalyticsEvent.PAGE_VIEW,
      { path: "/chat", title: "Chat Page" },
      { appVersion: "" },
    );
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Event must have an appVersion");
  });

  it("should fail validation for missing required event properties", () => {
    const event = createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
      path: "/chat",
    });
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("Missing required fields")),
    ).toBe(true);
  });

  it("should collect multiple validation errors", () => {
    const event = createTrackedEvent(
      AnalyticsEvent.PAGE_VIEW,
      {},
      { timestamp: 0, sessionId: "", platform: "" as "web" },
    );
    const result = validateTrackedEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// createEventId Tests
// ============================================================================

describe("createEventId", () => {
  it("should create a unique event id", () => {
    const id = createEventId();
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("should start with evt_ prefix", () => {
    const id = createEventId();
    expect(id.startsWith("evt_")).toBe(true);
  });

  it("should create different ids for each call", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createEventId());
    }
    expect(ids.size).toBe(100);
  });

  it("should contain timestamp component", () => {
    const beforeTimestamp = Date.now().toString(36);
    const id = createEventId();
    const parts = id.split("_");
    expect(parts.length).toBe(3);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("should have consistent format", () => {
    const id = createEventId();
    const pattern = /^evt_[a-z0-9]+_[a-z0-9]+$/;
    expect(pattern.test(id)).toBe(true);
  });
});

// ============================================================================
// getEventsByCategory Tests
// ============================================================================

describe("getEventsByCategory", () => {
  it("should return navigation events for NAVIGATION category", () => {
    const events = getEventsByCategory(EventCategory.NAVIGATION);
    expect(events).toContain(AnalyticsEvent.PAGE_VIEW);
    expect(events).toContain(AnalyticsEvent.NAVIGATION);
  });

  it("should return authentication events for AUTHENTICATION category", () => {
    const events = getEventsByCategory(EventCategory.AUTHENTICATION);
    expect(events).toContain(AnalyticsEvent.SIGN_IN);
    expect(events).toContain(AnalyticsEvent.SIGN_OUT);
    expect(events).toContain(AnalyticsEvent.SIGN_UP);
    expect(events).toContain(AnalyticsEvent.PASSWORD_RESET);
  });

  it("should return messaging events for MESSAGING category", () => {
    const events = getEventsByCategory(EventCategory.MESSAGING);
    expect(events).toContain(AnalyticsEvent.MESSAGE_SENT);
    expect(events).toContain(AnalyticsEvent.MESSAGE_EDITED);
    expect(events).toContain(AnalyticsEvent.MESSAGE_DELETED);
    expect(events).toContain(AnalyticsEvent.REACTION_ADDED);
  });

  it("should return error events for ERRORS category", () => {
    const events = getEventsByCategory(EventCategory.ERRORS);
    expect(events).toContain(AnalyticsEvent.ERROR_OCCURRED);
    expect(events).toContain(AnalyticsEvent.API_ERROR);
    expect(events).toContain(AnalyticsEvent.WEBSOCKET_ERROR);
  });

  it("should return session events for SESSION category", () => {
    const events = getEventsByCategory(EventCategory.SESSION);
    expect(events).toContain(AnalyticsEvent.SESSION_START);
    expect(events).toContain(AnalyticsEvent.SESSION_END);
    expect(events).toContain(AnalyticsEvent.SESSION_RESUME);
  });

  it("should return performance events for PERFORMANCE category", () => {
    const events = getEventsByCategory(EventCategory.PERFORMANCE);
    expect(events).toContain(AnalyticsEvent.PERFORMANCE_MARK);
    expect(events).toContain(AnalyticsEvent.SLOW_OPERATION);
  });

  it("should not return events from other categories", () => {
    const events = getEventsByCategory(EventCategory.NAVIGATION);
    expect(events).not.toContain(AnalyticsEvent.MESSAGE_SENT);
    expect(events).not.toContain(AnalyticsEvent.ERROR_OCCURRED);
    expect(events).not.toContain(AnalyticsEvent.SESSION_START);
  });

  it("should return empty array for category with no events", () => {
    // This test ensures the function handles edge cases
    // All current categories have events, but the function should handle empty results
    const events = getEventsByCategory("nonexistent" as EventCategory);
    expect(Array.isArray(events)).toBe(true);
    expect(events).toHaveLength(0);
  });
});

// ============================================================================
// isErrorEvent Tests
// ============================================================================

describe("isErrorEvent", () => {
  it("should return true for error events", () => {
    expect(isErrorEvent(AnalyticsEvent.ERROR_OCCURRED)).toBe(true);
    expect(isErrorEvent(AnalyticsEvent.API_ERROR)).toBe(true);
    expect(isErrorEvent(AnalyticsEvent.WEBSOCKET_ERROR)).toBe(true);
  });

  it("should return false for non-error events", () => {
    expect(isErrorEvent(AnalyticsEvent.PAGE_VIEW)).toBe(false);
    expect(isErrorEvent(AnalyticsEvent.MESSAGE_SENT)).toBe(false);
    expect(isErrorEvent(AnalyticsEvent.SESSION_START)).toBe(false);
    expect(isErrorEvent(AnalyticsEvent.SIGN_IN)).toBe(false);
  });
});

// ============================================================================
// isPerformanceEvent Tests
// ============================================================================

describe("isPerformanceEvent", () => {
  it("should return true for performance events", () => {
    expect(isPerformanceEvent(AnalyticsEvent.PERFORMANCE_MARK)).toBe(true);
    expect(isPerformanceEvent(AnalyticsEvent.SLOW_OPERATION)).toBe(true);
  });

  it("should return false for non-performance events", () => {
    expect(isPerformanceEvent(AnalyticsEvent.PAGE_VIEW)).toBe(false);
    expect(isPerformanceEvent(AnalyticsEvent.MESSAGE_SENT)).toBe(false);
    expect(isPerformanceEvent(AnalyticsEvent.ERROR_OCCURRED)).toBe(false);
    expect(isPerformanceEvent(AnalyticsEvent.SESSION_START)).toBe(false);
  });
});

// ============================================================================
// isSessionEvent Tests
// ============================================================================

describe("isSessionEvent", () => {
  it("should return true for session events", () => {
    expect(isSessionEvent(AnalyticsEvent.SESSION_START)).toBe(true);
    expect(isSessionEvent(AnalyticsEvent.SESSION_END)).toBe(true);
    expect(isSessionEvent(AnalyticsEvent.SESSION_RESUME)).toBe(true);
  });

  it("should return false for non-session events", () => {
    expect(isSessionEvent(AnalyticsEvent.PAGE_VIEW)).toBe(false);
    expect(isSessionEvent(AnalyticsEvent.MESSAGE_SENT)).toBe(false);
    expect(isSessionEvent(AnalyticsEvent.ERROR_OCCURRED)).toBe(false);
    expect(isSessionEvent(AnalyticsEvent.PERFORMANCE_MARK)).toBe(false);
  });
});

// ============================================================================
// Type Safety Tests
// ============================================================================

describe("Type Safety", () => {
  it("should maintain type safety with EventPropertiesMap", () => {
    // This is a compile-time test - if it compiles, types are correct
    const pageViewEvent: TrackedEvent<AnalyticsEvent.PAGE_VIEW> =
      createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
        path: "/chat",
        title: "Chat",
      });
    expect(pageViewEvent.name).toBe(AnalyticsEvent.PAGE_VIEW);
  });

  it("should allow additional properties in event", () => {
    const event = createTrackedEvent(AnalyticsEvent.PAGE_VIEW, {
      path: "/chat",
      title: "Chat",
      referrer: "https://example.com",
      loadTime: 500,
    });
    expect(event.properties).toHaveProperty("path");
    expect(event.properties).toHaveProperty("title");
  });
});
