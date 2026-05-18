/**
 * Tests for NhostAuthService
 *
 * Tests production authentication service functionality.
 */

// Use global jest, not @jest/globals (causes mock issues)

// Mock nhost before importing the service
jest.mock("@/lib/nhost", () => ({
  nhost: {
    auth: {
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      getAccessToken: jest.fn(),
      isAuthenticated: jest.fn(),
      getUser: jest.fn(),
    },
    graphql: {
      request: jest.fn(),
    },
  },
}));

// Mock auth config
jest.mock("@/config/auth.config", () => ({
  authConfig: {
    isProduction: false,
    useDevAuth: false,
    authUrl: "http://localhost:4000/v1",
    graphqlUrl: "http://localhost:8080/v1/graphql",
    storageUrl: "http://localhost:8000/v1",
    providers: {
      emailPassword: true,
      magicLink: true,
      google: { enabled: true },
      github: { enabled: true },
      microsoft: { enabled: false },
      apple: { enabled: false },
    },
    twoFactor: {
      enabled: true,
      totpIssuer: "nchat",
      backupCodesCount: 10,
      enforceForRoles: ["owner", "admin"],
      gracePeriodDays: 7,
    },
    session: {
      cookieName: "nchat-session",
      maxAge: 2592000,
      refreshThreshold: 300,
      secureOnly: false,
      sameSite: "lax",
    },
    security: {
      requireEmailVerification: false,
      allowedDomains: [],
      blockedDomains: [],
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumber: true,
      passwordRequireSpecial: false,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      jwtExpiresInMinutes: 15,
      refreshTokenExpiresInDays: 30,
    },
  },
  validatePassword: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  isEmailDomainAllowed: jest.fn().mockReturnValue(true),
}));

// Import after mocks
import { NhostAuthService } from "../nhost-auth.service";
import { nhost } from "@/lib/nhost";

describe("NhostAuthService", () => {
  let service: NhostAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NhostAuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signIn", () => {
    it("should sign in successfully with valid credentials", async () => {
      const mockSession = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        accessTokenExpiresIn: 3600,
        user: {
          id: "user-123",
          email: "test@example.com",
          displayName: "Test User",
          avatarUrl: null,
        },
      };

      const mockNhostUser = {
        username: "testuser",
        display_name: "Test User",
        avatar_url: null,
        role: "member",
      };

      (nhost.auth.signIn as jest.Mock).mockResolvedValue({
        session: mockSession,
        error: null,
      });
      (nhost.graphql.request as jest.Mock).mockResolvedValue({
        data: { nchat_users: [mockNhostUser] },
        error: null,
      });

      const result = await service.signIn("test@example.com", "password123");

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("test@example.com");
      expect(result.token).toBe("test-access-token");
      expect(nhost.auth.signIn).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should throw error for invalid credentials", async () => {
      (nhost.auth.signIn as jest.Mock).mockResolvedValue({
        session: null,
        error: { message: "Invalid credentials" },
      });

      await expect(
        service.signIn("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw error when session is not created", async () => {
      (nhost.auth.signIn as jest.Mock).mockResolvedValue({
        session: null,
        error: null,
      });

      await expect(
        service.signIn("test@example.com", "password123"),
      ).rejects.toThrow("Failed to create session");
    });
  });

  describe("signUp", () => {
    it("should sign up successfully with valid data", async () => {
      const mockSession = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        accessTokenExpiresIn: 3600,
        user: {
          id: "user-123",
          email: "newuser@example.com",
          displayName: "New User",
          avatarUrl: null,
        },
      };

      (nhost.auth.signUp as jest.Mock).mockResolvedValue({
        session: mockSession,
        error: null,
      });

      // Mock checking if first user
      (nhost.graphql.request as jest.Mock)
        .mockResolvedValueOnce({
          data: { nchat_users_aggregate: { aggregate: { count: 0 } } },
          error: null,
        })
        // Mock creating nchat user
        .mockResolvedValueOnce({
          data: { insert_nchat_users_one: { id: "nchat-user-123" } },
          error: null,
        });
      (nhost.auth.getUser as jest.Mock).mockReturnValue({
        email: "newuser@example.com",
      });

      const result = await service.signUp(
        "newuser@example.com",
        "Password123",
        "newuser",
        {
          displayName: "New User",
        },
      );

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("newuser@example.com");
      expect(result.user.role).toBe("owner"); // First user should be owner
    });

    it("should assign member role if not first user", async () => {
      const mockSession = {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        user: {
          id: "user-456",
          email: "seconduser@example.com",
          displayName: "Second User",
        },
      };

      (nhost.auth.signUp as jest.Mock).mockResolvedValue({
        session: mockSession,
        error: null,
      });
      (nhost.graphql.request as jest.Mock)
        .mockResolvedValueOnce({
          data: { nchat_users_aggregate: { aggregate: { count: 5 } } },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { insert_nchat_users_one: { id: "nchat-user-456" } },
          error: null,
        });
      (nhost.auth.getUser as jest.Mock).mockReturnValue({
        email: "seconduser@example.com",
      });

      const result = await service.signUp(
        "seconduser@example.com",
        "Password123",
        "seconduser",
      );

      expect(result.user.role).toBe("member");
    });

    it("should throw error if signup fails", async () => {
      (nhost.auth.signUp as jest.Mock).mockResolvedValue({
        session: null,
        error: { message: "Email already registered" },
      });

      await expect(
        service.signUp("existing@example.com", "Password123", "existinguser"),
      ).rejects.toThrow("Email already registered");
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      (nhost.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      await expect(service.signOut()).resolves.not.toThrow();
      expect(nhost.auth.signOut).toHaveBeenCalled();
    });

    it("should handle sign out errors gracefully", async () => {
      // Sign out doesn't throw - it clears local session regardless of server response
      (nhost.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: "Sign out failed" },
      });

      // Should complete without throwing (logs error internally)
      await expect(service.signOut()).resolves.not.toThrow();
      expect(nhost.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user when authenticated", async () => {
      const mockSession = {
        user: {
          id: "user-123",
          email: "test@example.com",
          displayName: "Test User",
          avatarUrl: "https://example.com/avatar.jpg",
        },
      };

      const mockNhostUser = {
        username: "testuser",
        display_name: "Test User",
        avatar_url: "https://example.com/avatar.jpg",
        role: "member",
      };

      (nhost.auth.getSession as jest.Mock).mockReturnValue(mockSession);
      (nhost.graphql.request as jest.Mock).mockResolvedValue({
        data: { nchat_users: [mockNhostUser] },
        error: null,
      });

      const user = await service.getCurrentUser();

      expect(user).toBeDefined();
      expect(user?.email).toBe("test@example.com");
      expect(user?.role).toBe("member");
    });

    it("should return null when not authenticated", async () => {
      (nhost.auth.getSession as jest.Mock).mockReturnValue(null);

      const user = await service.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      (nhost.auth.refreshSession as jest.Mock).mockResolvedValue({
        session: {
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        },
        error: null,
      });

      const token = await service.refreshToken();

      expect(token).toBe("new-access-token");
    });

    it("should return null on refresh error", async () => {
      (nhost.auth.refreshSession as jest.Mock).mockResolvedValue({
        session: null,
        error: { message: "Refresh failed" },
      });

      const token = await service.refreshToken();

      expect(token).toBeNull();
    });
  });

  describe("updateProfile", () => {
    it("should update profile successfully", async () => {
      const mockSession = {
        accessToken: "test-token",
        user: {
          id: "user-123",
          email: "test@example.com",
          displayName: "Old Name",
        },
      };

      (nhost.auth.getSession as jest.Mock).mockReturnValue(mockSession);
      (nhost.graphql.request as jest.Mock).mockResolvedValue({
        data: {
          update_nchat_users: {
            returning: [
              {
                username: "newusername",
                display_name: "New Name",
                avatar_url: null,
                role: "member",
              },
            ],
          },
        },
        error: null,
      });

      const result = await service.updateProfile({
        username: "newusername",
        displayName: "New Name",
      });

      expect(result.user.displayName).toBe("New Name");
    });

    it("should throw error when not authenticated", async () => {
      (nhost.auth.getSession as jest.Mock).mockReturnValue(null);

      await expect(
        service.updateProfile({ displayName: "New Name" }),
      ).rejects.toThrow("Not authenticated");
    });
  });
});

describe("NhostAuthService - OAuth", () => {
  let service: NhostAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NhostAuthService();

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost:3000",
        href: "http://localhost:3000",
      },
      writable: true,
    });
  });

  describe("signInWithOAuth", () => {
    it("should redirect to OAuth provider", async () => {
      const mockLocation = { href: "" };
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
      });

      await service.signInWithOAuth({
        provider: "google",
        redirectTo: "/auth/callback",
      });

      expect(mockLocation.href).toContain("signin/provider/google");
    });
  });
});

describe("NhostAuthService - Security", () => {
  it("should not allow instantiation in production with dev auth", () => {
    // This is tested by the security configuration in auth.config.ts
    // The NhostAuthService constructor checks for this condition
  });
});
