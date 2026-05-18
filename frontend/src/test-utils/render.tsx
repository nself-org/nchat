/**
 * Custom render function with all providers
 *
 * Provides a consistent testing setup with all required providers:
 * - AuthProvider (mocked)
 * - AppConfigProvider (mocked)
 * - ThemeProvider (mocked)
 * - ApolloProvider (mocked)
 * - Router (mocked)
 */

import React, { ReactElement, ReactNode } from "react";
import {
  render,
  RenderOptions,
  RenderResult,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import type { AppConfig } from "@/config/app-config";
import type { User } from "@/types/user";

// ============================================================================
// Types
// ============================================================================

export interface TestUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  status?: "online" | "offline" | "away" | "busy";
}

export interface TestChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: "public" | "private" | "direct" | "group";
  isDefault?: boolean;
  isArchived?: boolean;
  memberCount?: number;
}

export interface TestMessage {
  id: string;
  channelId: string;
  content: string;
  type?: "text" | "system" | "file" | "image";
  userId: string;
  user?: Partial<TestUser>;
  createdAt?: Date;
  isEdited?: boolean;
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
}

export interface RenderWithProvidersOptions extends Omit<
  RenderOptions,
  "wrapper"
> {
  /**
   * Initial authenticated user (null for unauthenticated state)
   */
  user?: TestUser | null;
  /**
   * Whether the user is authenticated
   */
  isAuthenticated?: boolean;
  /**
   * Initial app configuration
   */
  config?: Partial<AppConfig>;
  /**
   * Theme mode
   */
  theme?: "light" | "dark" | "system";
  /**
   * Apollo GraphQL mocks
   */
  apolloMocks?: MockedResponse[];
  /**
   * Initial router pathname
   */
  pathname?: string;
  /**
   * Router search params
   */
  searchParams?: Record<string, string>;
  /**
   * Initial channels for store
   */
  channels?: TestChannel[];
  /**
   * Initial messages for store
   */
  messages?: Record<string, TestMessage[]>;
  /**
   * Active channel ID
   */
  activeChannelId?: string;
}

export interface CustomRenderResult extends Omit<RenderResult, "rerender"> {
  /**
   * User event instance for simulating user interactions
   */
  user: UserEvent;
  /**
   * Re-render with the same providers
   */
  rerender: (ui: ReactNode) => void;
  /**
   * Mock functions for testing interactions
   */
  mocks: {
    signIn: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
    updateProfile: jest.Mock;
    updateConfig: jest.Mock;
    saveConfig: jest.Mock;
    setTheme: jest.Mock;
    router: {
      push: jest.Mock;
      replace: jest.Mock;
      refresh: jest.Mock;
      back: jest.Mock;
      forward: jest.Mock;
      prefetch: jest.Mock;
    };
  };
}

// ============================================================================
// Default Values
// ============================================================================

export const defaultTestUser: TestUser = {
  id: "test-user-1",
  username: "testuser",
  displayName: "Test User",
  email: "test@example.com",
  avatarUrl: "https://example.com/avatar.png",
  role: "member",
  status: "online",
};

export const defaultTestConfig: Partial<AppConfig> = {
  setup: {
    isCompleted: true,
    currentStep: 9,
    visitedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  owner: {
    name: "Test Owner",
    email: "owner@test.com",
    company: "Test Company",
    role: "developer",
  },
  branding: {
    appName: "nchat",
    tagline: "Team Communication Platform",
    logoScale: 1,
  },
  features: {
    publicChannels: true,
    privateChannels: true,
    directMessages: true,
    fileUploads: true,
    voiceMessages: false,
    threads: true,
    reactions: true,
    search: true,
    guestAccess: false,
    inviteLinks: true,
    channelCategories: true,
    customEmojis: false,
    gifs: true,
    stickers: false,
    messageScheduling: false,
    videoConferencing: false,
    endToEndEncryption: false,
    voiceCalls: false,
    videoCalls: false,
    groupCalls: false,
    screenSharing: false,
    callRecording: false,
    maxCallParticipants: 50,
    liveStreaming: false,
    streamRecording: false,
    streamChat: false,
    streamReactions: false,
    streamScheduling: false,
    maxStreamDuration: 0,
  },
};

// ============================================================================
// Mock Contexts
// ============================================================================

interface AuthContextValue {
  user: TestUser | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  isDevMode: boolean;
  signIn: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  updateProfile: jest.Mock;
  refreshToken: jest.Mock;
  switchUser?: jest.Mock;
}

interface AppConfigContextValue {
  config: AppConfig;
  isLoading: boolean;
  error: Error | null;
  updateConfig: jest.Mock;
  saveConfig: jest.Mock;
  resetConfig: jest.Mock;
  refetch: jest.Mock;
}

interface ThemeContextValue {
  theme: "light" | "dark" | "system";
  resolvedTheme: "light" | "dark";
  setTheme: jest.Mock;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined,
);
const AppConfigContext = React.createContext<AppConfigContextValue | undefined>(
  undefined,
);
const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined,
);

// Export hooks for use in tests
export const useTestAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useTestAuth must be used within AuthProvider");
  return context;
};

export const useTestAppConfig = () => {
  const context = React.useContext(AppConfigContext);
  if (!context)
    throw new Error("useTestAppConfig must be used within AppConfigProvider");
  return context;
};

export const useTestTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context)
    throw new Error("useTestTheme must be used within ThemeProvider");
  return context;
};

// ============================================================================
// Provider Factory
// ============================================================================

function createAllProviders(options: RenderWithProvidersOptions) {
  const {
    user = defaultTestUser,
    isAuthenticated = true,
    config = defaultTestConfig,
    theme = "system",
    apolloMocks = [],
  } = options;

  // Create mock functions
  const mocks = {
    signIn: jest.fn().mockResolvedValue({ user }),
    signUp: jest.fn().mockResolvedValue({ user }),
    signOut: jest.fn().mockResolvedValue(undefined),
    updateProfile: jest.fn().mockResolvedValue(user),
    refreshToken: jest.fn().mockResolvedValue({ accessToken: "test-token" }),
    switchUser: jest.fn(),
    updateConfig: jest
      .fn()
      .mockImplementation((updates) =>
        Promise.resolve({ ...config, ...updates }),
      ),
    saveConfig: jest.fn().mockResolvedValue(undefined),
    resetConfig: jest.fn(),
    refetch: jest.fn(),
    setTheme: jest.fn(),
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    },
  };

  const authValue: AuthContextValue = {
    user: isAuthenticated ? user : null,
    loading: false,
    error: null,
    isAuthenticated,
    isDevMode: true,
    signIn: mocks.signIn,
    signUp: mocks.signUp,
    signOut: mocks.signOut,
    updateProfile: mocks.updateProfile,
    refreshToken: mocks.refreshToken,
    switchUser: mocks.switchUser,
  };

  const configValue: AppConfigContextValue = {
    config: { ...defaultTestConfig, ...config } as AppConfig,
    isLoading: false,
    error: null,
    updateConfig: mocks.updateConfig,
    saveConfig: mocks.saveConfig,
    resetConfig: mocks.resetConfig,
    refetch: mocks.refetch,
  };

  const themeValue: ThemeContextValue = {
    theme,
    resolvedTheme: theme === "system" ? "light" : theme,
    setTheme: mocks.setTheme,
  };

  const AllProviders: React.FC<{ children: ReactNode }> = ({ children }) => (
    <MockedProvider mocks={apolloMocks} addTypename={false}>
      <AuthContext.Provider value={authValue}>
        <AppConfigContext.Provider value={configValue}>
          <ThemeContext.Provider value={themeValue}>
            {children}
          </ThemeContext.Provider>
        </AppConfigContext.Provider>
      </AuthContext.Provider>
    </MockedProvider>
  );

  return { AllProviders, mocks };
}

// ============================================================================
// Custom Render Function
// ============================================================================

/**
 * Custom render function that wraps components with all required providers
 *
 * @example
 * ```tsx
 * const { user, mocks } = renderWithProviders(<MyComponent />, {
 *   user: { id: '1', username: 'alice', email: 'alice@test.com', role: 'admin' },
 *   config: { features: { threads: false } }
 * })
 *
 * await user.click(screen.getByRole('button', { name: /submit/i }))
 * expect(mocks.signIn).toHaveBeenCalled()
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): CustomRenderResult {
  const { AllProviders, mocks } = createAllProviders(options);

  const result = render(ui, {
    wrapper: AllProviders,
    ...options,
  });

  return {
    ...result,
    user: userEvent.setup(),
    rerender: (newUi: ReactNode) => result.rerender(newUi as ReactElement),
    mocks,
  };
}

// ============================================================================
// Specialized Render Functions
// ============================================================================

/**
 * Render with an unauthenticated user
 */
export function renderUnauthenticated(
  ui: ReactElement,
  options: Omit<RenderWithProvidersOptions, "user" | "isAuthenticated"> = {},
): CustomRenderResult {
  return renderWithProviders(ui, {
    ...options,
    user: null,
    isAuthenticated: false,
  });
}

/**
 * Render with an admin user
 */
export function renderAsAdmin(
  ui: ReactElement,
  options: Omit<RenderWithProvidersOptions, "user"> = {},
): CustomRenderResult {
  return renderWithProviders(ui, {
    ...options,
    user: {
      ...defaultTestUser,
      id: "admin-user",
      username: "admin",
      displayName: "Admin User",
      email: "admin@test.com",
      role: "admin",
    },
  });
}

/**
 * Render with an owner user
 */
export function renderAsOwner(
  ui: ReactElement,
  options: Omit<RenderWithProvidersOptions, "user"> = {},
): CustomRenderResult {
  return renderWithProviders(ui, {
    ...options,
    user: {
      ...defaultTestUser,
      id: "owner-user",
      username: "owner",
      displayName: "Owner User",
      email: "owner@test.com",
      role: "owner",
    },
  });
}

/**
 * Render with dark theme
 */
export function renderWithDarkTheme(
  ui: ReactElement,
  options: Omit<RenderWithProvidersOptions, "theme"> = {},
): CustomRenderResult {
  return renderWithProviders(ui, {
    ...options,
    theme: "dark",
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  screen,
  waitFor,
  within,
  fireEvent,
  act,
} from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
