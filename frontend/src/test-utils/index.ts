/**
 * Test Utilities for nself-chat
 *
 * This is the main entry point for all test utilities.
 *
 * @example
 * ```tsx
 * import {
 *   renderWithProviders,
 *   createUser,
 *   createMessage,
 *   fixtures,
 *   mockAuthService,
 * } from '@/test-utils'
 *
 * describe('MyComponent', () => {
 *   it('renders correctly', () => {
 *     const { user, mocks } = renderWithProviders(<MyComponent />, {
 *       user: fixtures.users.alice,
 *     })
 *
 *     expect(screen.getByText('Hello')).toBeInTheDocument()
 *   })
 * })
 * ```
 */

// Import functions needed by setupTestEnvironment
import { resetAllStores } from "./mocks";
import { resetAllFactories } from "./factories";
import { resetMockRouter } from "./mocks";

// ============================================================================
// Render Utilities
// ============================================================================

export {
  renderWithProviders,
  renderUnauthenticated,
  renderAsAdmin,
  renderAsOwner,
  renderWithDarkTheme,
  screen,
  waitFor,
  within,
  fireEvent,
  act,
  userEvent,
  defaultTestUser,
  defaultTestConfig,
  useTestAuth,
  useTestAppConfig,
  useTestTheme,
} from "./render";

export type {
  TestUser,
  TestChannel,
  TestMessage,
  RenderWithProvidersOptions,
  CustomRenderResult,
} from "./render";

// ============================================================================
// Mocks
// ============================================================================

export {
  // Auth mocks
  testUsers,
  MockAuthService,
  mockAuthService,
  createMockAuthContext,
  createMockLocalStorage,
  mockAuthModule,

  // Router mocks
  createMockRouter,
  createMockSearchParams,
  setMockPathname,
  setMockSearchParams,
  setMockRouter,
  resetMockRouter,
  mockNextNavigation,
  simulateRouteChange,
  simulateRouteError,
  routes,
  createRouterForRoute,

  // GraphQL mocks
  createMockQuery,
  createMockMutation,
  createMockError,
  createNetworkError,
  createGraphQLError,
  mockChannelData,
  mockMessageData,
  buildChannelsResponse,
  buildMessagesResponse,
  buildChannelResponse,
  buildUserResponse,
  buildSendMessageResponse,
  buildCreateChannelResponse,
  createMockApolloClient,

  // Store mocks
  resetAllStores,
  resetMessageStore,
  resetChannelStore,
  resetUIStore,
  resetUserStore,
  resetNotificationStore,
  resetPresenceStore,
  resetTypingStore,
  getStoresSnapshot,
  setupMessageStore,
  setupChannelStore,
  setupUserStore,
  createMockMessageStore,
  createMockChannelStore,
  createMockUIStore,

  // Browser API mocks
  mockMatchMedia,
  mockResizeObserver,
  mockIntersectionObserver,
  mockScrollTo,
  mockExecCommand,
  mockClipboard,
  mockMediaDevices,
  mockFetch,
  mockWebSocket,
  createMockFile,
  mockImageLoad,
  setupAllMocks,
} from "./mocks";

// ============================================================================
// Factories
// ============================================================================

export {
  // User factory
  createUser,
  createUsers,
  createOwner,
  createAdmin,
  createModerator,
  createMember,
  createGuest,
  createUserWithStatus,
  createOfflineUser,
  createAwayUser,
  createBusyUser,
  predefinedUsers,
  resetUserIdCounter,

  // Channel factory
  createChannel,
  createChannels,
  createPublicChannel,
  createPrivateChannel,
  createDirectChannel,
  createGroupChannel,
  createDefaultChannel,
  createArchivedChannel,
  createPopularChannel,
  predefinedChannels,
  createWorkspaceChannels,
  resetChannelIdCounter,

  // Message factory
  createMessage,
  createMessages,
  createTextMessage,
  createSystemMessage,
  createFileMessage,
  createImageMessage,
  createEditedMessage,
  createMessageWithReactions,
  createPopularMessage,
  createMessageFrom,
  createMessageWithMention,
  createCodeMessage,
  createLinkMessage,
  createConversation,
  createThread,
  createMessagesOverTime,
  predefinedMessages,
  resetMessageIdCounter,

  // Reset all
  resetAllFactories,
} from "./factories";

// ============================================================================
// Fixtures
// ============================================================================

export {
  fixtures,
  createEmptyWorkspaceFixture,
  createActiveWorkspaceFixture,
  createWorkspaceWithDMsFixture,
  createWorkspaceWithPrivateChannelsFixture,
  authFixtures,
  formFixtures,
  errorFixtures,
  configFixtures,
} from "./fixtures";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for a specified duration
 */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for the next tick of the event loop
 */
export const waitForNextTick = () =>
  new Promise((resolve) => process.nextTick(resolve));

/**
 * Flush all pending promises
 */
export const flushPromises = () =>
  new Promise((resolve) => setImmediate(resolve));

/**
 * Generate a unique ID for testing
 */
export function generateTestId(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique email for testing
 */
export function generateTestEmail(prefix: string = "user"): string {
  return `${prefix}-${Date.now()}@test.example.com`;
}

/**
 * Suppress console errors during a test
 */
export function suppressConsoleError<T>(callback: () => T): T {
  const originalError = console.error;
  console.error = jest.fn();
  try {
    return callback();
  } finally {
    console.error = originalError;
  }
}

/**
 * Suppress console warnings during a test
 */
export function suppressConsoleWarn<T>(callback: () => T): T {
  const originalWarn = console.warn;
  console.warn = jest.fn();
  try {
    return callback();
  } finally {
    console.warn = originalWarn;
  }
}

/**
 * Advance Jest timers and flush promises
 */
export async function advanceTimersAndFlush(ms: number) {
  jest.advanceTimersByTime(ms);
  await flushPromises();
}

/**
 * Create a deferred promise for testing async behavior
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

// ============================================================================
// Setup and Teardown Helpers
// ============================================================================

/**
 * Standard beforeEach setup for tests
 */
export function setupTestEnvironment() {
  try {
    resetAllStores();
  } catch (e) {
    // Stores may not be initialized
  }
  try {
    resetAllFactories();
  } catch (e) {
    // Factories may not be initialized
  }
  try {
    resetMockRouter();
  } catch (e) {
    // Router may not be mocked
  }
  jest.clearAllMocks();
}

/**
 * Standard afterEach cleanup for tests
 */
export function cleanupTestEnvironment() {
  jest.restoreAllMocks();
}
