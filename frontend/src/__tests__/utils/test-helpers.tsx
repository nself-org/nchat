/**
 * Test Helper Utilities
 *
 * Common utilities and helpers for tests
 */

import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ApolloProvider } from "@apollo/client";
import { createMockApolloClient } from "../mocks/apollo-client";

// ============================================================================
// Custom Render with Providers
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  apolloMocks?: any[];
  initialAuth?: any;
  initialConfig?: any;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions,
) {
  const {
    apolloMocks = [],
    initialAuth,
    initialConfig,
    ...renderOptions
  } = options || {};

  const mockApolloClient = createMockApolloClient(apolloMocks);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ApolloProvider client={mockApolloClient}>{children}</ApolloProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// ============================================================================
// Wait Utilities
// ============================================================================

export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const waitForNextTick = () =>
  new Promise((resolve) => process.nextTick(resolve));

// ============================================================================
// Mock Data Generators
// ============================================================================

export function generateId(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateEmail(username: string): string {
  return `${username}@test.example.com`;
}

// ============================================================================
// Error Handlers
// ============================================================================

export function suppressConsoleError(callback: () => void) {
  const originalError = console.error;
  console.error = jest.fn();
  try {
    callback();
  } finally {
    console.error = originalError;
  }
}

export function suppressConsoleWarn(callback: () => void) {
  const originalWarn = console.warn;
  console.warn = jest.fn();
  try {
    callback();
  } finally {
    console.warn = originalWarn;
  }
}

// ============================================================================
// Storage Mocks
// ============================================================================

export function createMockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
}

// ============================================================================
// Timer Utilities
// ============================================================================

export function runTimers() {
  jest.runAllTimers();
}

export function advanceTimers(ms: number) {
  jest.advanceTimersByTime(ms);
}

// ============================================================================
// Async Utilities
// ============================================================================

export async function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

// ============================================================================
// File Mocks
// ============================================================================

export function createMockFile(
  name: string,
  size: number,
  type: string,
  content: string = "",
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

export function createMockImage(
  name: string = "test.png",
  width: number = 100,
  height: number = 100,
): File {
  return createMockFile(name, 1024, "image/png");
}

// ============================================================================
// Event Mocks
// ============================================================================

export function createMockMouseEvent(
  type: string,
  options: any = {},
): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...options,
  });
}

export function createMockKeyboardEvent(
  type: string,
  key: string,
  options: any = {},
): KeyboardEvent {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key,
    ...options,
  });
}

// ============================================================================
// GraphQL Mocks
// ============================================================================

export function createGraphQLMock(query: any, data: any, variables?: any) {
  return {
    request: {
      query,
      variables,
    },
    result: {
      data,
    },
  };
}

export function createGraphQLError(query: any, error: string, variables?: any) {
  return {
    request: {
      query,
      variables,
    },
    error: new Error(error),
  };
}

// ============================================================================
// URL and Navigation Mocks
// ============================================================================

export function mockRouter(overrides: any = {}) {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    pathname: "/",
    query: {},
    ...overrides,
  };
}

export function mockSearchParams(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params);
  return searchParams;
}
