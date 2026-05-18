import "@testing-library/jest-dom";

// Mock the Tauri IPC bridge so unit tests can run without a real Tauri runtime.
// @tauri-apps/api/mocks provides mockIPC for this purpose.
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";

beforeEach(() => {
  // Reset all mocks before each test to prevent state leakage.
  mockIPC(() => undefined);
});

afterEach(() => {
  clearMocks();
});
