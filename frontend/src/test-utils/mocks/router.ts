/**
 * Router Mocks
 *
 * Mock implementations for Next.js router in tests
 */

import { jest } from "@jest/globals";

// ============================================================================
// Types
// ============================================================================

export interface MockRouter {
  push: jest.Mock;
  replace: jest.Mock;
  refresh: jest.Mock;
  back: jest.Mock;
  forward: jest.Mock;
  prefetch: jest.Mock;
  pathname: string;
  query: Record<string, string | string[]>;
  asPath: string;
  basePath: string;
  locale?: string;
  locales?: string[];
  defaultLocale?: string;
  isReady: boolean;
  isPreview: boolean;
  isFallback: boolean;
  events: {
    on: jest.Mock;
    off: jest.Mock;
    emit: jest.Mock;
  };
}

export interface MockSearchParams {
  get: (key: string) => string | null;
  getAll: (key: string) => string[];
  has: (key: string) => boolean;
  entries: () => IterableIterator<[string, string]>;
  keys: () => IterableIterator<string>;
  values: () => IterableIterator<string>;
  forEach: (callback: (value: string, key: string) => void) => void;
  toString: () => string;
}

// ============================================================================
// Create Mock Router
// ============================================================================

export function createMockRouter(
  overrides: Partial<MockRouter> = {},
): MockRouter {
  const defaultRouter: MockRouter = {
    push: jest.fn() as jest.Mock,
    replace: jest.fn() as jest.Mock,
    refresh: jest.fn() as jest.Mock,
    back: jest.fn() as jest.Mock,
    forward: jest.fn() as jest.Mock,
    prefetch: jest.fn() as jest.Mock,
    pathname: "/",
    query: {},
    asPath: "/",
    basePath: "",
    locale: "en",
    locales: ["en"],
    defaultLocale: "en",
    isReady: true,
    isPreview: false,
    isFallback: false,
    events: {
      on: jest.fn() as jest.Mock,
      off: jest.fn() as jest.Mock,
      emit: jest.fn() as jest.Mock,
    },
  };

  // Resolve mock return values
  (defaultRouter.push as any).mockResolvedValue(true);
  (defaultRouter.replace as any).mockResolvedValue(true);
  (defaultRouter.prefetch as any).mockResolvedValue(undefined);

  return {
    ...defaultRouter,
    ...overrides,
  };
}

// ============================================================================
// Create Mock Search Params
// ============================================================================

export function createMockSearchParams(
  params: Record<string, string | string[]> = {},
): MockSearchParams {
  const urlSearchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => urlSearchParams.append(key, v));
    } else {
      urlSearchParams.set(key, value);
    }
  });

  return {
    get: (key: string) => urlSearchParams.get(key),
    getAll: (key: string) => urlSearchParams.getAll(key),
    has: (key: string) => urlSearchParams.has(key),
    entries: () => urlSearchParams.entries(),
    keys: () => urlSearchParams.keys(),
    values: () => urlSearchParams.values(),
    forEach: (callback) => urlSearchParams.forEach(callback),
    toString: () => urlSearchParams.toString(),
  };
}

// ============================================================================
// Mock Next Navigation Module
// ============================================================================

let mockPathname = "/";
let mockSearchParams = new URLSearchParams();
let mockRouter = createMockRouter();

export const setMockPathname = (pathname: string) => {
  mockPathname = pathname;
};

export const setMockSearchParams = (params: Record<string, string>) => {
  mockSearchParams = new URLSearchParams(params);
};

export const setMockRouter = (router: Partial<MockRouter>) => {
  mockRouter = createMockRouter(router);
};

export const resetMockRouter = () => {
  mockPathname = "/";
  mockSearchParams = new URLSearchParams();
  mockRouter = createMockRouter();
};

export const useRouter = jest.fn(() => mockRouter);
export const usePathname = jest.fn(() => mockPathname);
export const useSearchParams = jest.fn(() => mockSearchParams);
export const useParams = jest.fn(() => ({}));
export const useSelectedLayoutSegment = jest.fn(() => null);
export const useSelectedLayoutSegments = jest.fn(() => []);
export const notFound = jest.fn();
export const redirect = jest.fn();
export const permanentRedirect = jest.fn();

// ============================================================================
// Jest Module Mock
// ============================================================================

export const mockNextNavigation = () => {
  jest.mock("next/navigation", () => ({
    useRouter: () => mockRouter,
    usePathname: () => mockPathname,
    useSearchParams: () => mockSearchParams,
    useParams: () => ({}),
    useSelectedLayoutSegment: () => null,
    useSelectedLayoutSegments: () => [],
    notFound: jest.fn(),
    redirect: jest.fn(),
    permanentRedirect: jest.fn(),
  }));
};

// ============================================================================
// Router Event Helpers
// ============================================================================

export function simulateRouteChange(
  router: MockRouter,
  newPathname: string,
  newQuery?: Record<string, string>,
) {
  router.events.emit("routeChangeStart", newPathname);
  router.pathname = newPathname;
  if (newQuery) {
    router.query = newQuery;
  }
  router.asPath =
    newPathname +
    (newQuery ? "?" + new URLSearchParams(newQuery).toString() : "");
  router.events.emit("routeChangeComplete", newPathname);
}

export function simulateRouteError(
  router: MockRouter,
  error: Error,
  pathname: string,
) {
  router.events.emit("routeChangeStart", pathname);
  router.events.emit("routeChangeError", error, pathname);
}

// ============================================================================
// Common Route Configurations
// ============================================================================

export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  chat: "/chat",
  channel: (slug: string) => `/chat/${slug}`,
  directMessage: (userId: string) => `/chat/dm/${userId}`,
  settings: "/settings",
  settingsProfile: "/settings/profile",
  settingsNotifications: "/settings/notifications",
  settingsSecurity: "/settings/security",
  admin: "/admin",
  adminUsers: "/admin/users",
  adminChannels: "/admin/channels",
  adminSettings: "/admin/settings",
  setup: "/setup",
  setupStep: (step: number) => `/setup/${step}`,
};

export const createRouterForRoute = (
  route: string,
  query?: Record<string, string>,
) => {
  return createMockRouter({
    pathname: route,
    query: query || {},
    asPath: route + (query ? "?" + new URLSearchParams(query).toString() : ""),
  });
};
