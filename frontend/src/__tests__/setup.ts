/**
 * Test Setup for nself-chat
 *
 * Configures the test environment with all necessary mocks and utilities.
 * This file is loaded by jest.setup.js for all tests.
 */

import "@testing-library/jest-dom";

// ============================================================================
// Environment Variables
// ============================================================================

process.env.NEXT_PUBLIC_APP_NAME = "nchat";
process.env.NEXT_PUBLIC_APP_TAGLINE = "Team Communication Platform";
process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL = "http://localhost:1337/v1/graphql";
process.env.NEXT_PUBLIC_NHOST_AUTH_URL = "http://localhost:1337/v1/auth";
process.env.NEXT_PUBLIC_USE_DEV_AUTH = "true";
process.env.NEXT_PUBLIC_ENV = "test";

// ============================================================================
// Mock Next.js Router
// ============================================================================

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  pathname: "/",
  route: "/",
  query: {},
  asPath: "/",
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// ============================================================================
// Mock Socket.io Client
// ============================================================================

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  id: "mock-socket-id",
};

jest.mock("socket.io-client", () => ({
  io: jest.fn(() => mockSocket),
  Socket: jest.fn(),
}));

// ============================================================================
// Mock Apollo Client
// ============================================================================

const mockApolloClient = {
  query: jest.fn(),
  mutate: jest.fn(),
  subscribe: jest.fn(),
  watchQuery: jest.fn(),
  readQuery: jest.fn(),
  writeQuery: jest.fn(),
  readFragment: jest.fn(),
  writeFragment: jest.fn(),
  resetStore: jest.fn(),
  clearStore: jest.fn(),
  cache: {
    readQuery: jest.fn(),
    writeQuery: jest.fn(),
    readFragment: jest.fn(),
    writeFragment: jest.fn(),
    modify: jest.fn(),
    evict: jest.fn(),
    gc: jest.fn(),
    extract: jest.fn(),
    restore: jest.fn(),
  },
};

jest.mock("@apollo/client", () => {
  const actualApollo = jest.requireActual("@apollo/client");
  return {
    ...actualApollo,
    useQuery: jest.fn(() => ({
      data: null,
      loading: false,
      error: null,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    })),
    useMutation: jest.fn(() => [
      jest.fn(),
      { data: null, loading: false, error: null },
    ]),
    useSubscription: jest.fn(() => ({
      data: null,
      loading: false,
      error: null,
    })),
    useLazyQuery: jest.fn(() => [
      jest.fn(),
      { data: null, loading: false, error: null },
    ]),
    useApolloClient: jest.fn(() => mockApolloClient),
    ApolloProvider: ({ children }: { children: React.ReactNode }) => children,
    ApolloClient: jest.fn(() => mockApolloClient),
    InMemoryCache: jest.fn(),
    HttpLink: jest.fn(),
    split: jest.fn(),
    gql: actualApollo.gql,
  };
});

// ============================================================================
// Mock Nhost
// ============================================================================

const mockNhost = {
  auth: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChanged: jest.fn(() => () => {}),
    onTokenChanged: jest.fn(() => () => {}),
    isAuthenticated: jest.fn(() => false),
    isAuthenticatedAsync: jest.fn(() => Promise.resolve(false)),
    getAccessToken: jest.fn(() => null),
  },
  storage: {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    getPublicUrl: jest.fn(),
  },
  graphql: {
    request: jest.fn(),
  },
  functions: {
    call: jest.fn(),
  },
};

jest.mock("@nhost/react", () => ({
  NhostProvider: ({ children }: { children: React.ReactNode }) => children,
  useNhostClient: () => mockNhost,
  useSignInEmailPassword: () => ({
    signInEmailPassword: jest.fn(),
    isLoading: false,
    error: null,
    isSuccess: false,
  }),
  useSignUpEmailPassword: () => ({
    signUpEmailPassword: jest.fn(),
    isLoading: false,
    error: null,
    isSuccess: false,
  }),
  useSignOut: () => ({
    signOut: jest.fn(),
    isLoading: false,
  }),
  useUserData: () => null,
  useAuthenticationStatus: () => ({
    isAuthenticated: false,
    isLoading: false,
  }),
  useAccessToken: () => null,
}));

jest.mock("@nhost/nextjs", () => ({
  NhostClient: jest.fn(() => mockNhost),
  getNhostSession: jest.fn(() => null),
}));

// ============================================================================
// Mock TipTap Editor
// ============================================================================

jest.mock("@tiptap/react", () => ({
  useEditor: jest.fn(() => ({
    commands: {
      setContent: jest.fn(),
      clearContent: jest.fn(),
      focus: jest.fn(),
      insertContent: jest.fn(),
      toggleBold: jest.fn(),
      toggleItalic: jest.fn(),
      toggleUnderline: jest.fn(),
      toggleStrike: jest.fn(),
      toggleCode: jest.fn(),
      setLink: jest.fn(),
    },
    chain: jest.fn(() => ({
      focus: jest.fn().mockReturnThis(),
      toggleBold: jest.fn().mockReturnThis(),
      toggleItalic: jest.fn().mockReturnThis(),
      toggleUnderline: jest.fn().mockReturnThis(),
      toggleStrike: jest.fn().mockReturnThis(),
      toggleCode: jest.fn().mockReturnThis(),
      setLink: jest.fn().mockReturnThis(),
      run: jest.fn(),
    })),
    getHTML: jest.fn(() => ""),
    getText: jest.fn(() => ""),
    isFocused: false,
    isActive: jest.fn(() => false),
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
  })),
  EditorContent: ({ editor }: { editor: unknown }) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "editor-content" });
  },
  Editor: jest.fn(),
}));

// ============================================================================
// Mock Framer Motion
// ============================================================================

jest.mock("framer-motion", () => {
  const React = require("react");
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement("div", { ...props, ref }, children),
      ),
      span: React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement("span", { ...props, ref }, children),
      ),
      button: React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement("button", { ...props, ref }, children),
      ),
      ul: React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement("ul", { ...props, ref }, children),
      ),
      li: React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement("li", { ...props, ref }, children),
      ),
      p: React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement("p", { ...props, ref }, children),
      ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
    }),
    useMotionValue: (initial: any) => ({
      get: () => initial,
      set: jest.fn(),
    }),
    useTransform: (value: any) => value,
  };
});

// ============================================================================
// Mock Browser APIs
// ============================================================================

// LocalStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// SessionStorage mock
Object.defineProperty(window, "sessionStorage", {
  value: localStorageMock,
});

// MatchMedia mock
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ResizeObserver mock
class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

// IntersectionObserver mock
class IntersectionObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  root = null;
  rootMargin = "";
  thresholds = [];
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverMock,
});

// URL.createObjectURL mock
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: jest.fn(() => "blob:mock-url"),
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: jest.fn(),
});

// Clipboard mock
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
});

// Scroll mock
Element.prototype.scrollIntoView = jest.fn();
Element.prototype.scrollTo = jest.fn();

// ============================================================================
// Mock Emoji Picker
// ============================================================================

jest.mock("emoji-picker-react", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ onEmojiClick }: { onEmojiClick: (data: any) => void }) =>
      React.createElement("div", {
        "data-testid": "emoji-picker",
        onClick: () =>
          onEmojiClick({ emoji: "👍", names: ["thumbs_up"], unified: "1f44d" }),
      }),
    Theme: { AUTO: "auto", LIGHT: "light", DARK: "dark" },
    EmojiStyle: { NATIVE: "native", APPLE: "apple" },
  };
});

// ============================================================================
// Mock react-dropzone
// ============================================================================

jest.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
    acceptedFiles: [],
    fileRejections: [],
  }),
}));

// ============================================================================
// Export Mock Utilities
// ============================================================================

export const mocks = {
  router: mockRouter,
  socket: mockSocket,
  apolloClient: mockApolloClient,
  nhost: mockNhost,
};

export const resetAllMocks = () => {
  jest.clearAllMocks();
  localStorageMock.clear();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockSocket.on.mockClear();
  mockSocket.emit.mockClear();
};

// Reset mocks before each test
beforeEach(() => {
  resetAllMocks();
});
