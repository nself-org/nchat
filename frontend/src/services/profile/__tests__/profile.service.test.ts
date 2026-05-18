/**
 * Profile Service Tests
 *
 * Comprehensive tests for the profile service including:
 * - Username validation
 * - Display name validation
 * - Bio validation
 * - Phone validation
 * - Website validation
 * - Profile input validation
 *
 * @module services/profile/__tests__/profile.service.test
 */

import {
  validateUsername,
  validateDisplayName,
  validateBio,
  validateWebsite,
  validatePhone,
  validateProfileInput,
  ProfileService,
} from "../profile.service";
import { USERNAME_RULES, PROFILE_LIMITS } from "@/types/profile";

// ============================================================================
// Username Validation Tests (15 tests)
// ============================================================================

describe("validateUsername", () => {
  describe("valid usernames", () => {
    it("should accept valid lowercase username", () => {
      const result = validateUsername("johndoe");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept username with numbers", () => {
      const result = validateUsername("john123");
      expect(result.valid).toBe(true);
    });

    it("should accept username with underscores", () => {
      const result = validateUsername("john_doe");
      expect(result.valid).toBe(true);
    });

    it("should accept minimum length username", () => {
      const result = validateUsername("abc");
      expect(result.valid).toBe(true);
    });

    it("should accept maximum length username", () => {
      const username = "a".repeat(USERNAME_RULES.maxLength);
      const result = validateUsername(username);
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid usernames - length", () => {
    it("should reject username shorter than minimum length", () => {
      const result = validateUsername("ab");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at least");
    });

    it("should reject username longer than maximum length", () => {
      const username = "a".repeat(USERNAME_RULES.maxLength + 1);
      const result = validateUsername(username);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("at most");
    });
  });

  describe("invalid usernames - characters", () => {
    it("should normalize uppercase letters to lowercase", () => {
      // Usernames with uppercase are normalized, so 'JohnDoe' becomes 'johndoe' which is valid
      const result = validateUsername("JohnDoe");
      expect(result.valid).toBe(true);
    });

    it("should reject username with special characters", () => {
      const result = validateUsername("john@doe");
      expect(result.valid).toBe(false);
    });

    it("should reject username with spaces", () => {
      const result = validateUsername("john doe");
      expect(result.valid).toBe(false);
    });

    it("should reject username with hyphens", () => {
      const result = validateUsername("john-doe");
      expect(result.valid).toBe(false);
    });
  });

  describe("invalid usernames - format rules", () => {
    it("should reject username starting with number", () => {
      const result = validateUsername("123john");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("start with a letter");
    });

    it("should reject username ending with underscore", () => {
      const result = validateUsername("johndoe_");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cannot end with");
    });

    it("should reject username with consecutive underscores", () => {
      const result = validateUsername("john__doe");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("consecutive");
    });

    it("should reject reserved usernames", () => {
      const result = validateUsername("admin");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("reserved");
    });
  });
});

// ============================================================================
// Display Name Validation Tests (5 tests)
// ============================================================================

describe("validateDisplayName", () => {
  it("should accept valid display name", () => {
    const result = validateDisplayName("John Doe");
    expect(result.valid).toBe(true);
  });

  it("should accept display name with special characters", () => {
    const result = validateDisplayName("John O'Brien");
    expect(result.valid).toBe(true);
  });

  it("should reject empty display name", () => {
    const result = validateDisplayName("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("required");
  });

  it("should reject display name exceeding max length", () => {
    const name = "a".repeat(PROFILE_LIMITS.displayName.max + 1);
    const result = validateDisplayName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at most");
  });

  it("should reject display name with control characters", () => {
    const result = validateDisplayName("John\x00Doe");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("invalid characters");
  });
});

// ============================================================================
// Bio Validation Tests (3 tests)
// ============================================================================

describe("validateBio", () => {
  it("should accept valid bio", () => {
    const result = validateBio("Hello, I am a developer.");
    expect(result.valid).toBe(true);
  });

  it("should accept empty bio", () => {
    const result = validateBio("");
    expect(result.valid).toBe(true);
  });

  it("should reject bio exceeding max length", () => {
    const bio = "a".repeat(PROFILE_LIMITS.bio + 1);
    const result = validateBio(bio);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at most");
  });
});

// ============================================================================
// Website Validation Tests (5 tests)
// ============================================================================

describe("validateWebsite", () => {
  it("should accept valid https URL", () => {
    const result = validateWebsite("https://example.com");
    expect(result.valid).toBe(true);
  });

  it("should accept valid http URL", () => {
    const result = validateWebsite("http://example.com");
    expect(result.valid).toBe(true);
  });

  it("should accept empty website", () => {
    const result = validateWebsite("");
    expect(result.valid).toBe(true);
  });

  it("should reject invalid URL format", () => {
    const result = validateWebsite("not-a-url");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid");
  });

  it("should reject non-http protocols", () => {
    const result = validateWebsite("ftp://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("http");
  });
});

// ============================================================================
// Phone Validation Tests (4 tests)
// ============================================================================

describe("validatePhone", () => {
  it("should accept valid phone number with country code", () => {
    const result = validatePhone("+1234567890");
    expect(result.valid).toBe(true);
  });

  it("should accept phone number with formatting", () => {
    const result = validatePhone("+1 (234) 567-8901");
    expect(result.valid).toBe(true);
  });

  it("should accept empty phone", () => {
    const result = validatePhone("");
    expect(result.valid).toBe(true);
  });

  it("should reject phone number with letters", () => {
    const result = validatePhone("+1234abc567");
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// Profile Input Validation Tests (5 tests)
// ============================================================================

describe("validateProfileInput", () => {
  it("should accept valid profile input", () => {
    const result = validateProfileInput({
      displayName: "John Doe",
      username: "johndoe",
      bio: "Hello world",
      website: "https://example.com",
    });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("should accept partial profile input", () => {
    const result = validateProfileInput({
      displayName: "John Doe",
    });
    expect(result.valid).toBe(true);
  });

  it("should collect multiple errors", () => {
    const result = validateProfileInput({
      displayName: "",
      username: "AB", // too short
      bio: "a".repeat(200), // too long
    });
    expect(result.valid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(1);
  });

  it("should validate location length", () => {
    const result = validateProfileInput({
      location: "a".repeat(PROFILE_LIMITS.location + 1),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.location).toBeDefined();
  });

  it("should validate organization length", () => {
    const result = validateProfileInput({
      organization: "a".repeat(PROFILE_LIMITS.organization + 1),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.organization).toBeDefined();
  });
});

// ============================================================================
// Profile Service Class Tests (5 tests)
// ============================================================================

describe("ProfileService", () => {
  let service: ProfileService;

  beforeEach(() => {
    service = new ProfileService({
      graphqlUrl: "http://localhost:8080/v1/graphql",
    });
  });

  describe("generateUsernameSuggestions (via checkUsernameAvailability)", () => {
    it("should be instantiable", () => {
      expect(service).toBeInstanceOf(ProfileService);
    });
  });

  describe("getProfile", () => {
    it("should handle missing user", async () => {
      // Mock fetch to return null
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { nchat_users_by_pk: null } }),
      });

      const profile = await service.getProfile("non-existent-id");
      expect(profile).toBeNull();
    });
  });

  describe("updateProfile", () => {
    it("should validate input before updating", async () => {
      const result = await service.updateProfile("user-id", {
        displayName: "", // Invalid
      });

      expect(result.success).toBe(false);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.displayName).toBeDefined();
    });
  });

  describe("changeUsername", () => {
    it("should validate username format", async () => {
      const result = await service.changeUsername("user-id", "AB"); // Too short

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("privacy settings", () => {
    it("should return default privacy settings when none exist", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { nchat_users_by_pk: null } }),
      });

      const settings = await service.getPrivacySettings("user-id");
      expect(settings.onlineStatus).toBe("everyone");
      expect(settings.readReceipts).toBe(true);
    });
  });
});
