/**
 * Auth Mocks
 *
 * Mock implementations for authentication in tests
 */

import type { TestUser } from "../render";

// ============================================================================
// Pre-defined Test Users
// ============================================================================

export const testUsers: Record<string, TestUser> = {
  owner: {
    id: "user-owner",
    username: "owner",
    displayName: "System Owner",
    email: "owner@nself.org",
    avatarUrl: "https://example.com/avatars/owner.png",
    role: "owner",
    status: "online",
  },
  admin: {
    id: "user-admin",
    username: "admin",
    displayName: "Admin User",
    email: "admin@nself.org",
    avatarUrl: "https://example.com/avatars/admin.png",
    role: "admin",
    status: "online",
  },
  moderator: {
    id: "user-moderator",
    username: "moderator",
    displayName: "Moderator User",
    email: "moderator@nself.org",
    avatarUrl: "https://example.com/avatars/moderator.png",
    role: "moderator",
    status: "online",
  },
  member: {
    id: "user-member",
    username: "member",
    displayName: "Member User",
    email: "member@nself.org",
    avatarUrl: "https://example.com/avatars/member.png",
    role: "member",
    status: "online",
  },
  guest: {
    id: "user-guest",
    username: "guest",
    displayName: "Guest User",
    email: "guest@nself.org",
    avatarUrl: "https://example.com/avatars/guest.png",
    role: "guest",
    status: "online",
  },
  alice: {
    id: "user-alice",
    username: "alice",
    displayName: "Alice Smith",
    email: "alice@nself.org",
    avatarUrl: "https://example.com/avatars/alice.png",
    role: "member",
    status: "online",
  },
  bob: {
    id: "user-bob",
    username: "bob",
    displayName: "Bob Jones",
    email: "bob@nself.org",
    avatarUrl: "https://example.com/avatars/bob.png",
    role: "member",
    status: "away",
  },
  charlie: {
    id: "user-charlie",
    username: "charlie",
    displayName: "Charlie Brown",
    email: "charlie@nself.org",
    avatarUrl: "https://example.com/avatars/charlie.png",
    role: "member",
    status: "offline",
  },
};

// ============================================================================
// Mock Auth Service
// ============================================================================

export interface MockAuthSession {
  user: TestUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  isAuthenticated: boolean;
}

export class MockAuthService {
  private session: MockAuthSession = {
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isAuthenticated: false,
  };

  private onAuthStateChanged: Array<(session: MockAuthSession) => void> = [];

  signIn = jest.fn(async (email: string, _password: string) => {
    // Find matching test user
    const user = Object.values(testUsers).find(
      (u) => u.email === email.toLowerCase(),
    );

    if (!user) {
      // Create dynamic user for unknown emails
      const username = email.split("@")[0];
      const dynamicUser: TestUser = {
        id: `user-${Date.now()}`,
        username,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        email: email.toLowerCase(),
        role: "member",
        status: "online",
      };
      return this.createSession(dynamicUser);
    }

    return this.createSession(user);
  });

  signUp = jest.fn(
    async (
      email: string,
      _password: string,
      username: string,
      displayName?: string,
    ) => {
      const newUser: TestUser = {
        id: `user-${Date.now()}`,
        username,
        displayName: displayName || username,
        email: email.toLowerCase(),
        role: "member",
        status: "online",
      };
      return this.createSession(newUser);
    },
  );

  signOut = jest.fn(async () => {
    this.session = {
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
    };
    this.notifyListeners();
  });

  refreshToken = jest.fn(async () => {
    if (!this.session.isAuthenticated || !this.session.user) {
      return null;
    }
    return this.createSession(this.session.user);
  });

  getCurrentUser = jest.fn(async () => {
    return this.session.user;
  });

  isAuthenticated = jest.fn(() => {
    return this.session.isAuthenticated;
  });

  getSession = jest.fn(() => {
    return this.session;
  });

  switchUser = jest.fn(async (userId: string) => {
    const user = Object.values(testUsers).find((u) => u.id === userId);
    if (!user) return null;
    return this.createSession(user);
  });

  subscribe = (callback: (session: MockAuthSession) => void) => {
    this.onAuthStateChanged.push(callback);
    return () => {
      this.onAuthStateChanged = this.onAuthStateChanged.filter(
        (cb) => cb !== callback,
      );
    };
  };

  private createSession(user: TestUser): MockAuthSession {
    this.session = {
      user,
      accessToken: `test-token-${user.id}-${Date.now()}`,
      refreshToken: `test-refresh-${user.id}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000),
      isAuthenticated: true,
    };
    this.notifyListeners();
    return this.session;
  }

  private notifyListeners() {
    this.onAuthStateChanged.forEach((cb) => cb(this.session));
  }

  reset() {
    this.session = {
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isAuthenticated: false,
    };
    this.signIn.mockClear();
    this.signUp.mockClear();
    this.signOut.mockClear();
    this.refreshToken.mockClear();
    this.getCurrentUser.mockClear();
    this.switchUser.mockClear();
  }
}

// Singleton for easy use in tests
export const mockAuthService = new MockAuthService();

// ============================================================================
// Mock Auth Context
// ============================================================================

export const createMockAuthContext = (
  user: TestUser | null = null,
  overrides: Partial<{
    signIn: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
    updateProfile: jest.Mock;
    refreshToken: jest.Mock;
  }> = {},
) => ({
  user,
  loading: false,
  error: null,
  isAuthenticated: user !== null,
  isDevMode: true,
  signIn: overrides.signIn || jest.fn().mockResolvedValue({ user }),
  signUp: overrides.signUp || jest.fn().mockResolvedValue({ user }),
  signOut: overrides.signOut || jest.fn().mockResolvedValue(undefined),
  updateProfile: overrides.updateProfile || jest.fn().mockResolvedValue(user),
  refreshToken:
    overrides.refreshToken ||
    jest.fn().mockResolvedValue({ accessToken: "test" }),
  switchUser: jest.fn(),
});

// ============================================================================
// Mock localStorage for auth
// ============================================================================

export const createMockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    _store: store,
  };
};

// ============================================================================
// Jest Module Mock Helper
// ============================================================================

export const mockAuthModule = () => {
  jest.mock("@/contexts/auth-context", () => ({
    useAuth: () => createMockAuthContext(testUsers.member),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  }));
};
