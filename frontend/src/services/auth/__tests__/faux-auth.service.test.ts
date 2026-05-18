/**
 * Tests for FauxAuthService
 *
 * The FauxAuthService provides a mock authentication system for development,
 * with predefined test users and auto-login capabilities.
 */

import { FauxAuthService } from "../faux-auth.service";

// Mock the auth config
jest.mock("@/config/auth.config", () => ({
  authConfig: {
    devAuth: {
      autoLogin: false,
      defaultUser: {
        id: "test-owner-id",
        email: "owner@nself.org",
        username: "owner",
        displayName: "System Owner",
        role: "owner",
        avatarUrl: "https://example.com/avatar.png",
      },
      availableUsers: [
        {
          id: "test-owner-id",
          email: "owner@nself.org",
          username: "owner",
          displayName: "System Owner",
          role: "owner",
          avatarUrl: "https://example.com/owner.png",
        },
        {
          id: "test-admin-id",
          email: "admin@nself.org",
          username: "admin",
          displayName: "Admin User",
          role: "admin",
          avatarUrl: "https://example.com/admin.png",
        },
        {
          id: "test-member-id",
          email: "member@nself.org",
          username: "member",
          displayName: "Member User",
          role: "member",
          avatarUrl: "https://example.com/member.png",
        },
      ],
    },
    session: {
      maxAge: 30 * 24 * 60 * 60,
    },
  },
}));

describe("FauxAuthService", () => {
  let service: FauxAuthService;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    mockLocalStorage = {};

    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
    });

    service = new FauxAuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn", () => {
    it("should sign in with a predefined user by email", async () => {
      const response = await service.signIn("owner@nself.org", "password123");

      expect(response.user).toBeDefined();
      expect(response.user.email).toBe("owner@nself.org");
      expect(response.user.role).toBe("owner");
      expect(response.accessToken).toContain("dev-token-");
      expect(response.refreshToken).toContain("dev-refresh-");
    });

    it("should normalize email to lowercase", async () => {
      const response = await service.signIn("OWNER@NSELF.ORG", "password123");

      expect(response.user.email).toBe("owner@nself.org");
    });

    it("should trim whitespace from email", async () => {
      const response = await service.signIn(
        "  owner@nself.org  ",
        "password123",
      );

      expect(response.user.email).toBe("owner@nself.org");
    });

    it("should create a new user for unknown emails", async () => {
      const response = await service.signIn(
        "newuser@example.com",
        "password123",
      );

      expect(response.user.email).toBe("newuser@example.com");
      expect(response.user.username).toBe("newuser");
      expect(response.user.role).toBe("member");
      expect(response.user.id).toContain("dev-user-");
    });

    it("should persist session to localStorage", async () => {
      await service.signIn("owner@nself.org", "password123");

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "nchat-dev-session",
        expect.stringContaining('"isAuthenticated":true'),
      );
    });

    it("should set the user as authenticated", async () => {
      await service.signIn("owner@nself.org", "password123");

      expect(service.isUserAuthenticated()).toBe(true);
    });
  });

  describe("signUp", () => {
    it("should create a new user with provided details", async () => {
      const response = await service.signUp(
        "test@example.com",
        "password123",
        "testuser",
      );

      expect(response.user.email).toBe("test@example.com");
      expect(response.user.username).toBe("testuser");
      expect(response.user.displayName).toBe("testuser");
      expect(response.user.role).toBe("member");
    });

    it("should generate unique tokens for new users", async () => {
      const originalDateNow = Date.now;
      let mockTime = 1000000000000;
      Date.now = jest.fn(() => mockTime++);

      try {
        const response1 = await service.signUp(
          "user1@example.com",
          "password123",
          "user1",
        );
        const response2 = await service.signUp(
          "user2@example.com",
          "password123",
          "user2",
        );

        expect(response1.accessToken).not.toBe(response2.accessToken);
        expect(response1.refreshToken).not.toBe(response2.refreshToken);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it("should set the user as authenticated after signup", async () => {
      await service.signUp("test@example.com", "password123", "testuser");

      expect(service.isUserAuthenticated()).toBe(true);
    });

    it("should persist session after signup", async () => {
      await service.signUp("test@example.com", "password123", "testuser");

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("should clear the current user and authentication state", async () => {
      await service.signIn("owner@nself.org", "password123");
      expect(service.isUserAuthenticated()).toBe(true);

      await service.signOut();

      expect(service.isUserAuthenticated()).toBe(false);
      expect(await service.getCurrentUser()).toBeNull();
    });

    it("should clear the session from localStorage", async () => {
      await service.signIn("owner@nself.org", "password123");
      await service.signOut();

      expect(localStorage.removeItem).toHaveBeenCalledWith("nchat-dev-session");
    });
  });

  describe("refreshToken", () => {
    it("should return new tokens when authenticated", async () => {
      await service.signIn("owner@nself.org", "password123");

      const response = await service.refreshToken();

      expect(response).not.toBeNull();
      expect(response?.accessToken).toContain("dev-token-");
      expect(response?.refreshToken).toContain("dev-refresh-");
    });

    it("should return null when not authenticated", async () => {
      const response = await service.refreshToken();

      expect(response).toBeNull();
    });

    it("should return the current user with refreshed tokens", async () => {
      await service.signIn("owner@nself.org", "password123");

      const response = await service.refreshToken();

      expect(response?.user.email).toBe("owner@nself.org");
    });
  });

  describe("getCurrentUser", () => {
    it("should return the current user when authenticated", async () => {
      await service.signIn("admin@nself.org", "password123");

      const user = await service.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.email).toBe("admin@nself.org");
    });

    it("should return null when not authenticated", async () => {
      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe("switchUser", () => {
    it("should switch to a different predefined user", async () => {
      await service.signIn("owner@nself.org", "password123");

      const response = await service.switchUser("test-admin-id");

      expect(response).not.toBeNull();
      expect(response?.user.email).toBe("admin@nself.org");
      expect(response?.user.role).toBe("admin");
    });

    it("should return null for non-existent user id", async () => {
      const response = await service.switchUser("non-existent-id");

      expect(response).toBeNull();
    });

    it("should update authentication state after switching", async () => {
      await service.switchUser("test-member-id");

      expect(service.isUserAuthenticated()).toBe(true);
      const user = await service.getCurrentUser();
      expect(user?.email).toBe("member@nself.org");
    });

    it("should persist the switched session", async () => {
      await service.switchUser("test-admin-id");

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("session persistence", () => {
    it("should load session from localStorage on construction", () => {
      const timestamp = Date.now();
      mockLocalStorage["nchat-dev-session"] = JSON.stringify({
        user: {
          id: "stored-user",
          email: "stored@example.com",
          role: "member",
        },
        isAuthenticated: true,
        timestamp,
      });

      const newService = new FauxAuthService();

      expect(newService.isUserAuthenticated()).toBe(true);
    });

    it("should clear expired sessions", () => {
      const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
      mockLocalStorage["nchat-dev-session"] = JSON.stringify({
        user: { id: "old-user", email: "old@example.com", role: "member" },
        isAuthenticated: true,
        timestamp: oldTimestamp,
      });

      const newService = new FauxAuthService();

      expect(newService.isUserAuthenticated()).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith("nchat-dev-session");
    });

    it("should handle corrupted session data gracefully", () => {
      mockLocalStorage["nchat-dev-session"] = "invalid-json-{";

      const newService = new FauxAuthService();

      expect(newService.isUserAuthenticated()).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith("nchat-dev-session");
    });
  });

  describe("isUserAuthenticated", () => {
    it("should return false initially", () => {
      expect(service.isUserAuthenticated()).toBe(false);
    });

    it("should return true after sign in", async () => {
      await service.signIn("owner@nself.org", "password123");

      expect(service.isUserAuthenticated()).toBe(true);
    });

    it("should return false after sign out", async () => {
      await service.signIn("owner@nself.org", "password123");
      await service.signOut();

      expect(service.isUserAuthenticated()).toBe(false);
    });
  });

  describe("updateProfile", () => {
    it("should throw error when not authenticated", async () => {
      await expect(
        service.updateProfile({ displayName: "New Name" }),
      ).rejects.toThrow("Not authenticated");
    });

    it("should update user profile when authenticated", async () => {
      await service.signIn("owner@nself.org", "password123");

      const response = await service.updateProfile({
        displayName: "Updated Name",
        username: "updated-username",
      });

      expect(response.user.displayName).toBe("Updated Name");
      expect(response.user.username).toBe("updated-username");
      expect(response.user.email).toBe("owner@nself.org"); // Original email preserved
      expect(response.accessToken).toContain("dev-token-");
      expect(response.refreshToken).toContain("dev-refresh-");
    });

    it("should persist updated profile to localStorage", async () => {
      await service.signIn("owner@nself.org", "password123");
      await service.updateProfile({ displayName: "New Display Name" });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "nchat-dev-session",
        expect.stringContaining('"displayName":"New Display Name"'),
      );
    });

    it("should allow partial profile updates", async () => {
      await service.signIn("owner@nself.org", "password123");
      const originalUser = await service.getCurrentUser();

      const response = await service.updateProfile({
        avatarUrl: "https://example.com/new-avatar.png",
      });

      expect(response.user.avatarUrl).toBe(
        "https://example.com/new-avatar.png",
      );
      expect(response.user.email).toBe(originalUser.email);
      expect(response.user.username).toBe(originalUser.username);
    });

    it("should return updated user after profile change", async () => {
      await service.signIn("member@nself.org", "password123");
      await service.updateProfile({ displayName: "Updated Member" });

      const currentUser = await service.getCurrentUser();
      expect(currentUser.displayName).toBe("Updated Member");
    });
  });
});

// Test auto-login feature with separate mock
describe("FauxAuthService - Auto-Login", () => {
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Reset modules to allow different mock configuration
    jest.resetModules();

    mockLocalStorage = {};

    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {};
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  it("should auto-login with default user when autoLogin is enabled", () => {
    // Mock auth config with autoLogin enabled
    jest.doMock("@/config/auth.config", () => ({
      authConfig: {
        devAuth: {
          autoLogin: true,
          defaultUser: {
            id: "auto-login-user",
            email: "autologin@nself.org",
            username: "autologin",
            displayName: "Auto Login User",
            role: "owner",
            avatarUrl: "https://example.com/auto.png",
          },
          availableUsers: [],
        },
        session: {
          maxAge: 30 * 24 * 60 * 60,
        },
      },
    }));

    // Re-require the service with the new mock
    const {
      FauxAuthService: AutoLoginService,
    } = require("../faux-auth.service");
    const service = new AutoLoginService();

    // Should be automatically authenticated
    expect(service.isUserAuthenticated()).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "nchat-dev-session",
      expect.stringContaining('"email":"autologin@nself.org"'),
    );
  });
});
