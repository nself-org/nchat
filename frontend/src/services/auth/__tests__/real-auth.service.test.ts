/**
 * Tests for RealAuthService
 *
 * The RealAuthService handles authentication against a real backend API,
 * managing tokens and API calls for production use.
 */

import { RealAuthService } from "../real-auth.service";

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

describe("RealAuthService", () => {
  let service: RealAuthService;
  let mockSessionStorage: Record<string, string>;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    mockSessionStorage = {};
    mockLocalStorage = {};

    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockSessionStorage[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete mockSessionStorage[key];
        }),
        clear: jest.fn(() => {
          mockSessionStorage = {};
        }),
      },
      writable: true,
    });

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
    service = new RealAuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn", () => {
    it("should sign in successfully with valid credentials", async () => {
      const mockResponse = {
        session: {
          user: {
            id: "user-1",
            email: "test@example.com",
            displayName: "Test User",
          },
          accessToken: "access-token-123",
          refreshToken: "refresh-token-456",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await service.signIn("test@example.com", "password123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/signin",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "test@example.com",
            password: "password123",
          }),
        }),
      );
      expect(response.user).toEqual(mockResponse.session.user);
      expect(response.accessToken).toBe("access-token-123");
      expect(response.refreshToken).toBe("refresh-token-456");
    });

    it("should throw error on invalid credentials", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "Invalid credentials" }),
      });

      await expect(
        service.signIn("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw generic error when no message provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(
        service.signIn("test@example.com", "password"),
      ).rejects.toThrow("Sign in failed");
    });

    it("should persist tokens after successful sign in", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              user: { id: "user-1", email: "test@example.com" },
              accessToken: "access-123",
              refreshToken: "refresh-456",
            },
          }),
      });

      await service.signIn("test@example.com", "password123");

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "nchat-access-token",
        "access-123",
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "nchat-refresh-token",
        "refresh-456",
      );
    });
  });

  describe("signUp", () => {
    it("should sign up successfully with valid details", async () => {
      const mockResponse = {
        session: {
          user: {
            id: "new-user-1",
            email: "newuser@example.com",
            displayName: "New User",
          },
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        },
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

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/signup",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "newuser@example.com",
            password: "password123",
            options: {
              displayName: "newuser",
              metadata: { username: "newuser" },
            },
          }),
        }),
      );
      expect(response.user).toEqual(mockResponse.session.user);
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

    it("should persist tokens after successful signup", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              user: { id: "user-1", email: "test@example.com" },
              accessToken: "signup-access",
              refreshToken: "signup-refresh",
            },
          }),
      });

      await service.signUp("test@example.com", "password123", "testuser");

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "nchat-access-token",
        "signup-access",
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "nchat-refresh-token",
        "signup-refresh",
      );
    });
  });

  describe("signOut", () => {
    it("should call signout endpoint and clear tokens", async () => {
      mockSessionStorage["nchat-access-token"] = "access-token";
      mockLocalStorage["nchat-refresh-token"] = "refresh-token";

      // Reload service to pick up tokens
      service = new RealAuthService();

      mockFetch.mockResolvedValueOnce({ ok: true });

      await service.signOut();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/signout",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer access-token",
          }),
          body: JSON.stringify({ refreshToken: "refresh-token" }),
        }),
      );
      expect(sessionStorage.removeItem).toHaveBeenCalledWith(
        "nchat-access-token",
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "nchat-refresh-token",
      );
    });

    it("should clear tokens even if signout request fails", async () => {
      mockSessionStorage["nchat-access-token"] = "access-token";
      mockLocalStorage["nchat-refresh-token"] = "refresh-token";
      service = new RealAuthService();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await service.signOut();

      expect(sessionStorage.removeItem).toHaveBeenCalledWith(
        "nchat-access-token",
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "nchat-refresh-token",
      );
    });

    it("should not call signout endpoint if no refresh token", async () => {
      await service.signOut();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh tokens successfully", async () => {
      mockLocalStorage["nchat-refresh-token"] = "old-refresh-token";
      service = new RealAuthService();

      const mockResponse = {
        session: {
          user: { id: "user-1", email: "test@example.com" },
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await service.refreshAccessToken();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/token",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ refreshToken: "old-refresh-token" }),
        }),
      );
      expect(response?.accessToken).toBe("new-access-token");
      expect(response?.refreshToken).toBe("new-refresh-token");
    });

    it("should return null when no refresh token exists", async () => {
      const response = await service.refreshAccessToken();

      expect(response).toBeNull();
    });

    it("should clear tokens on refresh failure", async () => {
      mockLocalStorage["nchat-refresh-token"] = "invalid-token";
      service = new RealAuthService();

      mockFetch.mockResolvedValueOnce({ ok: false });

      const response = await service.refreshAccessToken();

      expect(response).toBeNull();
      expect(sessionStorage.removeItem).toHaveBeenCalledWith(
        "nchat-access-token",
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "nchat-refresh-token",
      );
    });

    it("should clear tokens on network error", async () => {
      mockLocalStorage["nchat-refresh-token"] = "token";
      service = new RealAuthService();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const response = await service.refreshAccessToken();

      expect(response).toBeNull();
      expect(sessionStorage.removeItem).toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe("getCurrentUser", () => {
    it("should fetch current user with access token", async () => {
      mockSessionStorage["nchat-access-token"] = "valid-access-token";
      service = new RealAuthService();

      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const user = await service.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith("https://auth.example.com/user", {
        headers: { Authorization: "Bearer valid-access-token" },
      });
      expect(user).toEqual(mockUser);
    });

    it("should return null when no access token", async () => {
      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });

    it("should attempt token refresh when user fetch fails", async () => {
      mockSessionStorage["nchat-access-token"] = "expired-token";
      mockLocalStorage["nchat-refresh-token"] = "valid-refresh";
      service = new RealAuthService();

      const mockUser = { id: "user-1", email: "test@example.com" };

      // First call fails (expired token)
      mockFetch.mockResolvedValueOnce({ ok: false });
      // Token refresh succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            session: {
              user: mockUser,
              accessToken: "new-access",
              refreshToken: "new-refresh",
            },
          }),
      });
      // Retry with new token succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const user = await service.getCurrentUser();

      expect(user).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should return null on network error", async () => {
      mockSessionStorage["nchat-access-token"] = "token";
      service = new RealAuthService();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe("isUserAuthenticated", () => {
    it("should return false when no access token", () => {
      expect(service.isUserAuthenticated()).toBe(false);
    });

    it("should return true when access token exists", () => {
      mockSessionStorage["nchat-access-token"] = "some-token";
      service = new RealAuthService();

      expect(service.isUserAuthenticated()).toBe(true);
    });
  });

  describe("getAccessToken", () => {
    it("should return null when no token exists", () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it("should return the access token when it exists", () => {
      mockSessionStorage["nchat-access-token"] = "my-access-token";
      service = new RealAuthService();

      expect(service.getAccessToken()).toBe("my-access-token");
    });
  });

  describe("token loading", () => {
    it("should load tokens from storage on construction", () => {
      mockSessionStorage["nchat-access-token"] = "stored-access";
      mockLocalStorage["nchat-refresh-token"] = "stored-refresh";

      const newService = new RealAuthService();

      expect(newService.isUserAuthenticated()).toBe(true);
      expect(newService.getAccessToken()).toBe("stored-access");
    });
  });
});
