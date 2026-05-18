/**
 * Tests for DatabaseAuthService
 *
 * The DatabaseAuthService handles authentication through API endpoints
 * that interact with the database directly.
 */

import { DatabaseAuthService } from "../database-auth.service";

// Mock the auth config
jest.mock("@/config/auth.config", () => ({
  authConfig: {
    authUrl: "https://auth.example.com",
    session: {
      maxAge: 30 * 24 * 60 * 60,
    },
  },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("DatabaseAuthService", () => {
  let service: DatabaseAuthService;
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

    mockFetch.mockReset();
    service = new DatabaseAuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn", () => {
    it("should sign in successfully with valid credentials", async () => {
      const mockResponse = {
        user: { id: "user-1", email: "test@example.com", role: "member" },
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await service.signIn("test@example.com", "password123");

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });
      expect(response.user.email).toBe("test@example.com");
      expect(response.accessToken).toBe("access-token-123");
    });

    it("should throw error on invalid credentials", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "Invalid email or password" }),
      });

      await expect(
        service.signIn("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw default error when no message provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(
        service.signIn("test@example.com", "password"),
      ).rejects.toThrow("Invalid email or password");
    });

    it("should persist session after successful sign in", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "access-123",
            refreshToken: "refresh-456",
          }),
      });

      await service.signIn("test@example.com", "password123");

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "nchat-session",
        expect.stringContaining('"accessToken":"access-123"'),
      );
    });

    it("should clear any existing session before signing in", async () => {
      mockLocalStorage["nchat-session"] = JSON.stringify({ old: "session" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "new-access",
            refreshToken: "new-refresh",
          }),
      });

      await service.signIn("test@example.com", "password123");

      expect(localStorage.removeItem).toHaveBeenCalledWith("nchat-session");
    });

    it("should set the user as authenticated", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "access",
            refreshToken: "refresh",
          }),
      });

      await service.signIn("test@example.com", "password123");

      expect(service.isUserAuthenticated()).toBe(true);
    });
  });

  describe("signUp", () => {
    it("should sign up successfully with valid details", async () => {
      const mockResponse = {
        user: {
          id: "new-user-1",
          email: "newuser@example.com",
          role: "member",
        },
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await service.signUp(
        "newuser@example.com",
        "password123",
        "newuser",
      );

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "password123",
          username: "newuser",
        }),
      });
      expect(response.user.email).toBe("newuser@example.com");
    });

    it("should throw error on signup failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "Email already exists" }),
      });

      await expect(
        service.signUp("existing@example.com", "password123", "username"),
      ).rejects.toThrow("Email already exists");
    });

    it("should throw default error when no message provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(
        service.signUp("test@example.com", "password", "user"),
      ).rejects.toThrow("Sign up failed");
    });

    it("should persist session after successful signup", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "signup-access",
            refreshToken: "signup-refresh",
          }),
      });

      await service.signUp("test@example.com", "password123", "testuser");

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("should clear all authentication state", async () => {
      // First sign in
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "token",
            refreshToken: "refresh",
          }),
      });
      await service.signIn("test@example.com", "password");

      await service.signOut();

      expect(service.isUserAuthenticated()).toBe(false);
      expect(await service.getCurrentUser()).toBeNull();
    });

    it("should clear session from localStorage", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "token",
            refreshToken: "refresh",
          }),
      });
      await service.signIn("test@example.com", "password");

      await service.signOut();

      expect(localStorage.removeItem).toHaveBeenCalledWith("nchat-session");
    });
  });

  describe("getCurrentUser", () => {
    it("should return cached user when available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "cached@example.com", role: "admin" },
            accessToken: "token",
            refreshToken: "refresh",
          }),
      });
      await service.signIn("cached@example.com", "password");

      const user = await service.getCurrentUser();

      expect(user?.email).toBe("cached@example.com");
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only sign in call, not /me
    });

    it("should fetch user from API when token exists but no cached user", async () => {
      mockLocalStorage["nchat-session"] = JSON.stringify({
        accessToken: "stored-token",
        refreshToken: "stored-refresh",
        user: null,
        timestamp: Date.now(),
      });
      service = new DatabaseAuthService();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "user-1",
            email: "fetched@example.com",
            role: "member",
          }),
      });

      const user = await service.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith("/api/auth/me", {
        headers: { Authorization: "Bearer stored-token" },
      });
      expect(user?.email).toBe("fetched@example.com");
    });

    it("should return null when not authenticated", async () => {
      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });

    it("should return null when API call fails", async () => {
      mockLocalStorage["nchat-session"] = JSON.stringify({
        accessToken: "expired-token",
        refreshToken: "refresh",
        user: null,
        timestamp: Date.now(),
      });
      service = new DatabaseAuthService();

      mockFetch.mockResolvedValueOnce({ ok: false });

      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe("isUserAuthenticated", () => {
    it("should return false when not authenticated", () => {
      expect(service.isUserAuthenticated()).toBe(false);
    });

    it("should return true when authenticated with both token and user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "token",
            refreshToken: "refresh",
          }),
      });
      await service.signIn("test@example.com", "password");

      expect(service.isUserAuthenticated()).toBe(true);
    });

    it("should return false with only token but no user", () => {
      mockLocalStorage["nchat-session"] = JSON.stringify({
        accessToken: "token",
        refreshToken: "refresh",
        user: null,
        timestamp: Date.now(),
      });
      service = new DatabaseAuthService();

      expect(service.isUserAuthenticated()).toBe(false);
    });
  });

  describe("getAccessToken", () => {
    it("should return null when no token exists", () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it("should return the access token when authenticated", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "user-1", email: "test@example.com", role: "member" },
            accessToken: "my-access-token",
            refreshToken: "refresh",
          }),
      });
      await service.signIn("test@example.com", "password");

      expect(service.getAccessToken()).toBe("my-access-token");
    });
  });

  describe("session persistence", () => {
    it("should load session from localStorage on construction", () => {
      const timestamp = Date.now();
      mockLocalStorage["nchat-session"] = JSON.stringify({
        accessToken: "stored-access",
        refreshToken: "stored-refresh",
        user: { id: "user-1", email: "stored@example.com", role: "member" },
        timestamp,
      });

      const newService = new DatabaseAuthService();

      expect(newService.isUserAuthenticated()).toBe(true);
      expect(newService.getAccessToken()).toBe("stored-access");
    });

    it("should clear expired sessions (older than 24 hours)", () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      mockLocalStorage["nchat-session"] = JSON.stringify({
        accessToken: "old-token",
        refreshToken: "old-refresh",
        user: { id: "user-1", email: "old@example.com", role: "member" },
        timestamp: oldTimestamp,
      });

      const newService = new DatabaseAuthService();

      expect(newService.isUserAuthenticated()).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith("nchat-session");
    });

    it("should handle corrupted session data gracefully", () => {
      mockLocalStorage["nchat-session"] = "not-valid-json{{{";

      const newService = new DatabaseAuthService();

      expect(newService.isUserAuthenticated()).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith("nchat-session");
    });
  });
});
