/**
 * Test Utilities for nself-chat
 *
 * Custom render functions, mock stores, wait helpers, and testing utilities.
 * Provides a consistent testing setup with all required providers.
 */

import React, { ReactElement, ReactNode } from "react";
import {
  render,
  RenderOptions,
  RenderResult,
  waitFor,
} from "@testing-library/react";
import userEvent, { UserEvent } from "@testing-library/user-event";
import {
  useMessageStore,
  MessageStore,
  MessageState,
} from "@/stores/message-store";
import {
  useChannelStore,
  ChannelStore,
  Channel,
  ChannelType,
} from "@/stores/channel-store";
import { useUIStore } from "@/stores/ui-store";
import {
  createMockUser,
  createMockChannel,
  createMockMessage,
  MockUser,
  MockChannel,
  MockMessage,
} from "../mocks/handlers";
import type { Message, MessageUser, Reaction } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

interface WrapperOptions {
  /** Initial authenticated user */
  user?: MockUser | null;
  /** Initial app config */
  config?: Partial<AppConfig>;
  /** Initial channels */
  channels?: MockChannel[];
  /** Initial messages by channel */
  messages?: Record<string, MockMessage[]>;
  /** Initial active channel ID */
  activeChannelId?: string | null;
  /** Initial route/pathname */
  pathname?: string;
  /** Whether user is authenticated */
  isAuthenticated?: boolean;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  wrapperOptions?: WrapperOptions;
}

interface CustomRenderResult extends RenderResult {
  user: UserEvent;
}

interface AppConfig {
  setup: {
    completed: boolean;
    completedSteps: string[];
    currentStep: number;
  };
  owner: {
    name: string;
    email: string;
    company: string;
  };
  branding: {
    appName: string;
    logo: string | null;
    favicon: string | null;
    tagline: string;
  };
  auth: {
    methods: { email: boolean; google: boolean; github: boolean };
    permissions: "allow-all" | "verified-only" | "admin-only";
  };
  features: {
    channels: boolean;
    directMessages: boolean;
    threads: boolean;
    reactions: boolean;
    fileUploads: boolean;
  };
  theme: {
    mode: "light" | "dark" | "system";
    preset: string;
    colors: Record<string, string>;
  };
}

// ============================================================================
// Default Values
// ============================================================================

const defaultUser: MockUser = createMockUser({
  id: "test-user-1",
  username: "testuser",
  displayName: "Test User",
  email: "test@example.com",
  role: "member",
});

const defaultConfig: AppConfig = {
  setup: {
    completed: true,
    completedSteps: ["welcome", "owner-info", "auth-methods"],
    currentStep: 3,
  },
  owner: {
    name: "Test Owner",
    email: "owner@test.com",
    company: "Test Company",
  },
  branding: {
    appName: "nchat",
    logo: null,
    favicon: null,
    tagline: "Team Communication Platform",
  },
  auth: {
    methods: { email: true, google: false, github: false },
    permissions: "allow-all",
  },
  features: {
    channels: true,
    directMessages: true,
    threads: true,
    reactions: true,
    fileUploads: true,
  },
  theme: {
    mode: "system",
    preset: "default",
    colors: {},
  },
};

// ============================================================================
// Mock Providers
// ============================================================================

const MockAuthContext = React.createContext<{
  user: MockUser | null;
  loading: boolean;
  signIn: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  updateProfile: jest.Mock;
  switchUser?: jest.Mock;
  isDevMode: boolean;
}>({
  user: null,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  switchUser: jest.fn(),
  isDevMode: true,
});

const MockAppConfigContext = React.createContext<{
  config: AppConfig;
  updateConfig: jest.Mock;
  resetConfig: jest.Mock;
  isLoading: boolean;
  saveConfig: jest.Mock;
}>({
  config: defaultConfig,
  updateConfig: jest.fn(),
  resetConfig: jest.fn(),
  isLoading: false,
  saveConfig: jest.fn(),
});

const MockThemeContext = React.createContext<{
  theme: "light" | "dark" | "system";
  setTheme: jest.Mock;
  resolvedTheme: "light" | "dark";
}>({
  theme: "system",
  setTheme: jest.fn(),
  resolvedTheme: "light",
});

// Export hooks for use in tests
export const useAuth = () => React.useContext(MockAuthContext);
export const useAppConfig = () => React.useContext(MockAppConfigContext);
export const useTheme = () => React.useContext(MockThemeContext);

// ============================================================================
// Test Wrapper Component
// ============================================================================

function createTestWrapper(options: WrapperOptions = {}) {
  const {
    user = defaultUser,
    config = defaultConfig,
    channels = [],
    messages = {},
    activeChannelId = null,
    isAuthenticated = true,
  } = options;

  // Setup initial store state if provided
  if (channels.length > 0) {
    const channelStore = useChannelStore.getState();
    const formattedChannels: Channel[] = channels.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      type: c.type as ChannelType,
      categoryId: null,
      createdBy: c.creator?.id || "user-1",
      createdAt: c.created_at,
      updatedAt: c.created_at,
      topic: c.topic || null,
      icon: null,
      color: null,
      isArchived: c.is_archived,
      isDefault: c.is_default,
      memberCount: c.members_aggregate?.aggregate?.count || 0,
      lastMessageAt: null,
      lastMessagePreview: null,
    }));
    channelStore.setChannels(formattedChannels);
    if (activeChannelId) {
      channelStore.setActiveChannel(activeChannelId);
    }
  }

  // Setup message store if provided
  if (Object.keys(messages).length > 0) {
    const messageStore = useMessageStore.getState();
    Object.entries(messages).forEach(([channelId, msgs]) => {
      const formattedMessages: Message[] = msgs.map((m) => ({
        id: m.id,
        channelId,
        content: m.content,
        type: m.type as Message["type"],
        userId: m.user?.id || "user-1",
        user: {
          id: m.user?.id || "user-1",
          username: m.user?.username || "user",
          displayName: m.user?.displayName || "User",
          avatarUrl: m.user?.avatarUrl,
        } as MessageUser,
        createdAt: new Date(m.created_at),
        isEdited: m.is_edited,
        editedAt: m.edited_at ? new Date(m.edited_at) : undefined,
        reactions: m.reactions?.map((r) => ({
          emoji: r.emoji,
          count: 1,
          users: [],
          hasReacted: false,
        })) as Reaction[],
      }));
      messageStore.setMessages(channelId, formattedMessages);
    });
  }

  const TestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    const authValue = {
      user: isAuthenticated ? user : null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
      switchUser: jest.fn(),
      isDevMode: true,
    };

    const configValue = {
      config: { ...defaultConfig, ...config } as AppConfig,
      updateConfig: jest
        .fn()
        .mockResolvedValue({ ...defaultConfig, ...config }),
      resetConfig: jest.fn(),
      isLoading: false,
      saveConfig: jest.fn().mockResolvedValue(undefined),
    };

    const themeValue = {
      theme: config.theme?.mode || "system",
      setTheme: jest.fn(),
      resolvedTheme: "light" as const,
    };

    return (
      <MockAuthContext.Provider value={authValue}>
        <MockAppConfigContext.Provider value={configValue}>
          <MockThemeContext.Provider value={themeValue}>
            {children}
          </MockThemeContext.Provider>
        </MockAppConfigContext.Provider>
      </MockAuthContext.Provider>
    );
  };

  return TestWrapper;
}

// ============================================================================
// Custom Render Function
// ============================================================================

/**
 * Custom render function that wraps components with all required providers
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): CustomRenderResult {
  const { wrapperOptions, ...renderOptions } = options;
  const Wrapper = createTestWrapper(wrapperOptions);

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    user: userEvent.setup(),
  };
}

// Re-export everything from @testing-library/react
export * from "@testing-library/react";
export { customRender as render };

// ============================================================================
// Store Utilities
// ============================================================================

/**
 * Reset all Zustand stores to their initial state
 */
export const resetStores = () => {
  useMessageStore.getState().reset();
  useChannelStore.getState().resetChannelStore();
  // UIStore reset if available
  if (typeof useUIStore.getState().reset === "function") {
    (useUIStore.getState() as any).reset();
  }
};

/**
 * Create a message store with initial state for testing
 */
export const createMockMessageStore = (
  initialState?: Partial<MessageState>,
) => {
  const store = useMessageStore.getState();
  if (initialState) {
    if (initialState.messagesByChannel) {
      Object.entries(initialState.messagesByChannel).forEach(
        ([channelId, messages]) => {
          store.setMessages(channelId, messages);
        },
      );
    }
    if (initialState.currentChannelId) {
      store.setCurrentChannel(initialState.currentChannelId);
    }
  }
  return store;
};

/**
 * Create a channel store with initial state for testing
 */
export const createMockChannelStore = (initialChannels?: Channel[]) => {
  const store = useChannelStore.getState();
  if (initialChannels) {
    store.setChannels(initialChannels);
  }
  return store;
};

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for a condition to be true
 */
export const waitForCondition = async (
  condition: () => boolean,
  options?: { timeout?: number; interval?: number },
) => {
  const { timeout = 5000, interval = 50 } = options || {};
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

/**
 * Wait for store state to match expected value
 */
export const waitForStoreState = async <T,>(
  selector: () => T,
  expected: T,
  options?: { timeout?: number },
) => {
  await waitFor(
    () => {
      expect(selector()).toEqual(expected);
    },
    { timeout: options?.timeout || 5000 },
  );
};

/**
 * Wait for async operation with retry
 */
export const waitForAsync = async <T,>(
  asyncFn: () => Promise<T>,
  options?: { timeout?: number; retries?: number },
): Promise<T> => {
  const { timeout = 5000, retries = 3 } = options || {};
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const result = await Promise.race([
        asyncFn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeout),
        ),
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw lastError || new Error("Failed after retries");
};

// ============================================================================
// Mock Data Helpers
// ============================================================================

/**
 * Create a full mock message for testing
 */
export const createTestMessage = (overrides?: Partial<Message>): Message => {
  const mockMsg = createMockMessage(overrides as any);
  return {
    id: mockMsg.id,
    channelId: "channel-1",
    content: mockMsg.content,
    type: mockMsg.type as Message["type"],
    userId: mockMsg.user?.id || "user-1",
    user: {
      id: mockMsg.user?.id || "user-1",
      username: mockMsg.user?.username || "testuser",
      displayName: mockMsg.user?.displayName || "Test User",
      avatarUrl: mockMsg.user?.avatarUrl,
    },
    createdAt: new Date(mockMsg.created_at),
    isEdited: mockMsg.is_edited,
    ...overrides,
  };
};

/**
 * Create a full mock channel for testing
 */
export const createTestChannel = (overrides?: Partial<Channel>): Channel => {
  const mockCh = createMockChannel(overrides as any);
  return {
    id: mockCh.id,
    name: mockCh.name,
    slug: mockCh.slug,
    description: mockCh.description || null,
    type: mockCh.type as ChannelType,
    categoryId: null,
    createdBy: mockCh.creator?.id || "user-1",
    createdAt: mockCh.created_at,
    updatedAt: mockCh.created_at,
    topic: mockCh.topic || null,
    icon: null,
    color: null,
    isArchived: mockCh.is_archived,
    isDefault: mockCh.is_default,
    memberCount: mockCh.members_aggregate?.aggregate?.count || 0,
    lastMessageAt: null,
    lastMessagePreview: null,
    ...overrides,
  };
};

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that an element has focus
 */
export const expectFocused = (element: HTMLElement) => {
  expect(document.activeElement).toBe(element);
};

/**
 * Assert that a specific number of elements exist
 */
export const expectCount = (
  container: HTMLElement,
  selector: string,
  count: number,
) => {
  const elements = container.querySelectorAll(selector);
  expect(elements.length).toBe(count);
};

/**
 * Assert that text is visible in the document
 */
export const expectTextVisible = (text: string) => {
  expect(document.body).toHaveTextContent(text);
};

// ============================================================================
// Event Simulation Helpers
// ============================================================================

/**
 * Simulate typing into an input element
 */
export const typeIntoInput = async (
  user: UserEvent,
  element: HTMLElement,
  text: string,
) => {
  await user.clear(element);
  await user.type(element, text);
};

/**
 * Simulate keyboard shortcut
 */
export const pressKey = async (
  user: UserEvent,
  key: string,
  options?: { shift?: boolean; ctrl?: boolean; alt?: boolean; meta?: boolean },
) => {
  const { shift, ctrl, alt, meta } = options || {};
  let keyString = key;
  if (shift) keyString = `{Shift>}${keyString}{/Shift}`;
  if (ctrl) keyString = `{Control>}${keyString}{/Control}`;
  if (alt) keyString = `{Alt>}${keyString}{/Alt}`;
  if (meta) keyString = `{Meta>}${keyString}{/Meta}`;
  await user.keyboard(keyString);
};

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Log the current store state for debugging
 */
export const logStoreState = (storeName: "message" | "channel" | "ui") => {
  const stores = {
    message: useMessageStore,
    channel: useChannelStore,
    ui: useUIStore,
  };
  console.log(`[${storeName} store]:`, stores[storeName].getState());
};

/**
 * Create a test snapshot of store state
 */
export const getStoreSnapshot = () => ({
  message: useMessageStore.getState(),
  channel: useChannelStore.getState(),
  ui: useUIStore.getState(),
});
