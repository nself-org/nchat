/**
 * Vitest global test setup for @nself-chat/ui
 *
 * Configures jsdom environment with React Testing Library.
 */

import '@testing-library/react';
import '@testing-library/jest-dom';

// Suppress act() warnings from React 19 in test output
// These are expected when testing async state updates
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('act(')) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
