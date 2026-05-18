/**
 * Tests for constants
 */

import {
  API_URLS,
  APP_CONFIG,
  DEFAULTS,
  LIMITS,
  TIMING,
  PATTERNS,
  KEYS,
  HTTP_STATUS,
  ROLES,
  ROLE_HIERARCHY,
  CHANNEL_TYPES,
  MESSAGE_TYPES,
  PRESENCE_STATUS,
  NOTIFICATION_TYPES,
  FILE_CATEGORIES,
  ERROR_CODES,
  STORAGE_KEYS,
  EVENTS,
  BREAKPOINTS,
  Z_INDEX,
} from "../constants";

describe("Constants", () => {
  describe("API_URLS", () => {
    it("should have all required URL endpoints", () => {
      expect(API_URLS).toHaveProperty("GRAPHQL");
      expect(API_URLS).toHaveProperty("AUTH");
      expect(API_URLS).toHaveProperty("STORAGE");
      expect(API_URLS).toHaveProperty("WS");
    });

    it("should have valid URLs", () => {
      expect(API_URLS.GRAPHQL).toBeTruthy();
      expect(API_URLS.AUTH).toBeTruthy();
      expect(API_URLS.STORAGE).toBeTruthy();
      expect(API_URLS.WS).toBeTruthy();
    });
  });

  describe("APP_CONFIG", () => {
    it("should have app metadata", () => {
      expect(APP_CONFIG.NAME).toBeTruthy();
      expect(APP_CONFIG.DESCRIPTION).toBeTruthy();
      expect(APP_CONFIG.VERSION).toBeTruthy();
      expect(APP_CONFIG.DEFAULT_LOCALE).toBe("en-US");
      expect(APP_CONFIG.SUPPORT_EMAIL).toBeTruthy();
    });
  });

  describe("DEFAULTS", () => {
    it("should have avatar colors array", () => {
      expect(Array.isArray(DEFAULTS.AVATAR_COLORS)).toBe(true);
      expect(DEFAULTS.AVATAR_COLORS.length).toBeGreaterThan(0);
    });

    it("should have numeric defaults", () => {
      expect(typeof DEFAULTS.PAGE_SIZE).toBe("number");
      expect(typeof DEFAULTS.AVATAR_SIZE).toBe("number");
      expect(typeof DEFAULTS.MESSAGE_LIMIT).toBe("number");
      expect(DEFAULTS.PAGE_SIZE).toBeGreaterThan(0);
    });

    it("should have timing defaults", () => {
      expect(DEFAULTS.TYPING_TIMEOUT).toBe(3000);
      expect(DEFAULTS.AUTO_SAVE_INTERVAL).toBe(30000);
      expect(DEFAULTS.RECONNECT_INTERVAL).toBe(5000);
      expect(DEFAULTS.MAX_RECONNECT_ATTEMPTS).toBe(10);
    });
  });

  describe("LIMITS", () => {
    it("should have message length limits", () => {
      expect(LIMITS.MAX_MESSAGE_LENGTH).toBe(4000);
      expect(LIMITS.MAX_MESSAGE_LENGTH).toBeGreaterThan(0);
    });

    it("should have username/name limits", () => {
      expect(LIMITS.MAX_USERNAME_LENGTH).toBeGreaterThan(
        LIMITS.MIN_USERNAME_LENGTH,
      );
      expect(LIMITS.MAX_DISPLAY_NAME_LENGTH).toBeGreaterThan(0);
    });

    it("should have file size limits", () => {
      expect(LIMITS.MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(LIMITS.MAX_IMAGE_SIZE).toBeLessThanOrEqual(LIMITS.MAX_FILE_SIZE);
      expect(LIMITS.MAX_VIDEO_SIZE).toBeGreaterThan(LIMITS.MAX_IMAGE_SIZE);
    });

    it("should have password limits", () => {
      expect(LIMITS.MIN_PASSWORD_LENGTH).toBe(8);
      expect(LIMITS.MAX_PASSWORD_LENGTH).toBeGreaterThan(
        LIMITS.MIN_PASSWORD_LENGTH,
      );
    });
  });

  describe("TIMING", () => {
    it("should have debounce timings", () => {
      expect(TIMING.SEARCH_DEBOUNCE).toBe(300);
      expect(TIMING.TYPING_DEBOUNCE).toBe(500);
      expect(TIMING.AUTO_SAVE_DEBOUNCE).toBe(1000);
    });

    it("should have animation durations", () => {
      expect(TIMING.ANIMATION_SHORT).toBeLessThan(TIMING.ANIMATION_MEDIUM);
      expect(TIMING.ANIMATION_MEDIUM).toBeLessThan(TIMING.ANIMATION_LONG);
    });

    it("should have cache TTLs", () => {
      expect(TIMING.USER_CACHE_TTL).toBeGreaterThan(0);
      expect(TIMING.CHANNEL_CACHE_TTL).toBeGreaterThan(0);
    });
  });

  describe("PATTERNS", () => {
    it("should validate email pattern", () => {
      expect(PATTERNS.EMAIL.test("user@example.com")).toBe(true);
      expect(PATTERNS.EMAIL.test("invalid-email")).toBe(false);
      expect(PATTERNS.EMAIL.test("user+tag@example.co.uk")).toBe(true);
    });

    it("should validate username pattern", () => {
      expect(PATTERNS.USERNAME.test("validuser")).toBe(true);
      expect(PATTERNS.USERNAME.test("valid_user")).toBe(true);
      expect(PATTERNS.USERNAME.test("123invalid")).toBe(false);
    });

    it("should validate hex color pattern", () => {
      expect(PATTERNS.HEX_COLOR.test("#fff")).toBe(true);
      expect(PATTERNS.HEX_COLOR.test("#ffffff")).toBe(true);
      expect(PATTERNS.HEX_COLOR.test("#ffffffff")).toBe(true);
      expect(PATTERNS.HEX_COLOR.test("ffffff")).toBe(false);
      expect(PATTERNS.HEX_COLOR.test("#gg")).toBe(false);
    });

    it("should validate UUID pattern", () => {
      expect(PATTERNS.UUID.test("550e8400-e29b-41d4-a716-446655440000")).toBe(
        true,
      );
      expect(PATTERNS.UUID.test("invalid-uuid")).toBe(false);
    });
  });

  describe("KEYS", () => {
    it("should have all keyboard keys", () => {
      expect(KEYS.ENTER).toBe("Enter");
      expect(KEYS.ESCAPE).toBe("Escape");
      expect(KEYS.TAB).toBe("Tab");
      expect(KEYS.SPACE).toBe(" ");
    });

    it("should have arrow keys", () => {
      expect(KEYS.ARROW_UP).toBe("ArrowUp");
      expect(KEYS.ARROW_DOWN).toBe("ArrowDown");
      expect(KEYS.ARROW_LEFT).toBe("ArrowLeft");
      expect(KEYS.ARROW_RIGHT).toBe("ArrowRight");
    });
  });

  describe("HTTP_STATUS", () => {
    it("should have success codes", () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });

    it("should have error codes", () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
    });

    it("should have server error codes", () => {
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  describe("ROLES", () => {
    it("should have all user roles", () => {
      expect(ROLES.OWNER).toBe("owner");
      expect(ROLES.ADMIN).toBe("admin");
      expect(ROLES.MODERATOR).toBe("moderator");
      expect(ROLES.MEMBER).toBe("member");
      expect(ROLES.GUEST).toBe("guest");
    });
  });

  describe("ROLE_HIERARCHY", () => {
    it("should have correct hierarchy order", () => {
      expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.moderator);
      expect(ROLE_HIERARCHY.moderator).toBeGreaterThan(ROLE_HIERARCHY.member);
      expect(ROLE_HIERARCHY.member).toBeGreaterThan(ROLE_HIERARCHY.guest);
    });

    it("should have all roles in hierarchy", () => {
      expect(ROLE_HIERARCHY).toHaveProperty("owner");
      expect(ROLE_HIERARCHY).toHaveProperty("admin");
      expect(ROLE_HIERARCHY).toHaveProperty("moderator");
      expect(ROLE_HIERARCHY).toHaveProperty("member");
      expect(ROLE_HIERARCHY).toHaveProperty("guest");
    });
  });

  describe("CHANNEL_TYPES", () => {
    it("should have all channel types", () => {
      expect(CHANNEL_TYPES.PUBLIC).toBe("public");
      expect(CHANNEL_TYPES.PRIVATE).toBe("private");
      expect(CHANNEL_TYPES.DIRECT).toBe("direct");
      expect(CHANNEL_TYPES.GROUP_DM).toBe("group_dm");
    });
  });

  describe("MESSAGE_TYPES", () => {
    it("should have all message types", () => {
      expect(MESSAGE_TYPES).toHaveProperty("TEXT");
      expect(MESSAGE_TYPES).toHaveProperty("IMAGE");
      expect(MESSAGE_TYPES).toHaveProperty("FILE");
      expect(MESSAGE_TYPES).toHaveProperty("SYSTEM");
    });
  });

  describe("PRESENCE_STATUS", () => {
    it("should have all presence statuses", () => {
      expect(PRESENCE_STATUS.ONLINE).toBe("online");
      expect(PRESENCE_STATUS.AWAY).toBe("away");
      expect(PRESENCE_STATUS.DND).toBe("dnd");
      expect(PRESENCE_STATUS.OFFLINE).toBe("offline");
    });
  });

  describe("FILE_CATEGORIES", () => {
    it("should have all file categories", () => {
      expect(FILE_CATEGORIES).toHaveProperty("IMAGE");
      expect(FILE_CATEGORIES).toHaveProperty("VIDEO");
      expect(FILE_CATEGORIES).toHaveProperty("AUDIO");
      expect(FILE_CATEGORIES).toHaveProperty("DOCUMENT");
      expect(FILE_CATEGORIES).toHaveProperty("ARCHIVE");
    });

    it("should have mimeTypes and extensions", () => {
      expect(Array.isArray(FILE_CATEGORIES.IMAGE.mimeTypes)).toBe(true);
      expect(Array.isArray(FILE_CATEGORIES.IMAGE.extensions)).toBe(true);
      expect(FILE_CATEGORIES.IMAGE.mimeTypes.length).toBeGreaterThan(0);
    });
  });

  describe("ERROR_CODES", () => {
    it("should have auth error codes", () => {
      expect(ERROR_CODES.AUTH_INVALID_CREDENTIALS).toBeTruthy();
      expect(ERROR_CODES.AUTH_TOKEN_EXPIRED).toBeTruthy();
      expect(ERROR_CODES.AUTH_UNAUTHORIZED).toBeTruthy();
    });

    it("should have validation error codes", () => {
      expect(ERROR_CODES.VALIDATION_REQUIRED).toBeTruthy();
      expect(ERROR_CODES.VALIDATION_INVALID_FORMAT).toBeTruthy();
    });

    it("should have network error codes", () => {
      expect(ERROR_CODES.NETWORK_ERROR).toBeTruthy();
      expect(ERROR_CODES.NETWORK_TIMEOUT).toBeTruthy();
    });
  });

  describe("STORAGE_KEYS", () => {
    it("should have all storage keys", () => {
      expect(STORAGE_KEYS.AUTH_TOKEN).toBeTruthy();
      expect(STORAGE_KEYS.USER).toBeTruthy();
      expect(STORAGE_KEYS.THEME).toBeTruthy();
      expect(STORAGE_KEYS.CONFIG).toBeTruthy();
    });

    it("should have nchat prefix", () => {
      Object.values(STORAGE_KEYS).forEach((key) => {
        expect(key).toContain("nchat");
      });
    });
  });

  describe("EVENTS", () => {
    it("should have auth events", () => {
      expect(EVENTS.AUTH_LOGIN).toContain("nchat:auth");
      expect(EVENTS.AUTH_LOGOUT).toContain("nchat:auth");
    });

    it("should have message events", () => {
      expect(EVENTS.MESSAGE_SEND).toContain("nchat:message");
      expect(EVENTS.MESSAGE_RECEIVE).toContain("nchat:message");
    });

    it("should have nchat namespace", () => {
      Object.values(EVENTS).forEach((event) => {
        expect(event).toMatch(/^nchat:/);
      });
    });
  });

  describe("BREAKPOINTS", () => {
    it("should have all breakpoints", () => {
      expect(BREAKPOINTS.SM).toBe(640);
      expect(BREAKPOINTS.MD).toBe(768);
      expect(BREAKPOINTS.LG).toBe(1024);
      expect(BREAKPOINTS.XL).toBe(1280);
      expect(BREAKPOINTS["2XL"]).toBe(1536);
    });

    it("should be in ascending order", () => {
      expect(BREAKPOINTS.SM).toBeLessThan(BREAKPOINTS.MD);
      expect(BREAKPOINTS.MD).toBeLessThan(BREAKPOINTS.LG);
      expect(BREAKPOINTS.LG).toBeLessThan(BREAKPOINTS.XL);
      expect(BREAKPOINTS.XL).toBeLessThan(BREAKPOINTS["2XL"]);
    });
  });

  describe("Z_INDEX", () => {
    it("should have all z-index layers", () => {
      expect(Z_INDEX.BASE).toBe(0);
      expect(Z_INDEX.DROPDOWN).toBe(100);
      expect(Z_INDEX.MODAL).toBe(400);
      expect(Z_INDEX.MAX).toBe(9999);
    });

    it("should be in ascending order", () => {
      expect(Z_INDEX.BASE).toBeLessThan(Z_INDEX.DROPDOWN);
      expect(Z_INDEX.DROPDOWN).toBeLessThan(Z_INDEX.MODAL);
      expect(Z_INDEX.MODAL).toBeLessThan(Z_INDEX.MAX);
    });
  });
});
