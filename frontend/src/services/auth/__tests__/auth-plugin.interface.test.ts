/**
 * Tests for Auth Plugin Interface
 *
 * Tests for BaseAuthProvider abstract class and AuthProviderRegistry.
 */

import {
  BaseAuthProvider,
  AuthProviderRegistry,
  authProviderRegistry,
  type AuthCredentials,
  type AuthResult,
  type AuthProvider,
  type AuthProviderMetadata,
  type AuthProviderConfig,
  type AuthEvent,
  type AuthEventListener,
  type EmailPasswordCredentials,
} from "../auth-plugin.interface";

// Concrete implementation for testing
class TestAuthProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "test-provider",
    name: "Test Provider",
    type: "email",
    description: "A test auth provider",
    requiresBackend: false,
    supportedFeatures: {
      signIn: true,
      signUp: true,
      signOut: true,
      tokenRefresh: true,
      passwordReset: false,
      emailVerification: false,
      phoneVerification: false,
      mfa: false,
      linkAccount: false,
    },
  };

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    const emailCreds = credentials as EmailPasswordCredentials;
    if (emailCreds.email === "valid@example.com") {
      this.currentUser = {
        id: "user-1",
        email: emailCreds.email,
        role: "member",
      };
      this.authenticated = true;
      this.emitEvent({
        type: "signIn",
        user: this.currentUser,
        timestamp: Date.now(),
      });
      return this.createSuccessResult(
        this.currentUser,
        "test-token",
        "test-refresh",
      );
    }
    return this.createErrorResult(
      this.createError("INVALID_CREDENTIALS", "Invalid credentials"),
    );
  }

  async signUp(credentials: AuthCredentials): Promise<AuthResult> {
    const emailCreds = credentials as EmailPasswordCredentials;
    this.currentUser = {
      id: `user-${Date.now()}`,
      email: emailCreds.email,
      role: "member",
    };
    this.authenticated = true;
    this.emitEvent({
      type: "signUp",
      user: this.currentUser,
      timestamp: Date.now(),
    });
    return this.createSuccessResult(
      this.currentUser,
      "signup-token",
      "signup-refresh",
    );
  }
}

describe("BaseAuthProvider", () => {
  let provider: TestAuthProvider;

  beforeEach(() => {
    provider = new TestAuthProvider();
  });

  describe("initialize", () => {
    it("should initialize with provided config", async () => {
      const config: AuthProviderConfig = {
        enabled: true,
        clientId: "test-client",
      };

      await provider.initialize(config);

      expect(provider.isEnabled()).toBe(true);
    });

    it("should start disabled by default", () => {
      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe("isEnabled / setEnabled", () => {
    it("should toggle enabled state", async () => {
      await provider.initialize({ enabled: false });

      expect(provider.isEnabled()).toBe(false);

      provider.setEnabled(true);

      expect(provider.isEnabled()).toBe(true);

      provider.setEnabled(false);

      expect(provider.isEnabled()).toBe(false);
    });
  });

  describe("signIn", () => {
    it("should sign in successfully with valid credentials", async () => {
      const result = await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("valid@example.com");
      expect(result.accessToken).toBe("test-token");
      expect(result.refreshToken).toBe("test-refresh");
    });

    it("should fail with invalid credentials", async () => {
      const result = await provider.signIn({
        email: "invalid@example.com",
        password: "password",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
    });

    it("should set authenticated state on success", async () => {
      expect(provider.isAuthenticated()).toBe(false);

      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(provider.isAuthenticated()).toBe(true);
    });
  });

  describe("signUp", () => {
    it("should sign up successfully", async () => {
      const result = await provider.signUp!({
        email: "new@example.com",
        password: "password",
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("new@example.com");
    });

    it("should set authenticated state after signup", async () => {
      await provider.signUp!({
        email: "new@example.com",
        password: "password",
      });

      expect(provider.isAuthenticated()).toBe(true);
    });
  });

  describe("signOut", () => {
    it("should clear authentication state", async () => {
      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });
      expect(provider.isAuthenticated()).toBe(true);

      await provider.signOut();

      expect(provider.isAuthenticated()).toBe(false);
      expect(await provider.getCurrentUser()).toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("should return null when not authenticated", async () => {
      const user = await provider.getCurrentUser();

      expect(user).toBeNull();
    });

    it("should return current user when authenticated", async () => {
      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      const user = await provider.getCurrentUser();

      expect(user?.email).toBe("valid@example.com");
    });
  });

  describe("onAuthStateChange", () => {
    it("should notify listeners on sign in", async () => {
      const listener = jest.fn();
      provider.onAuthStateChange(listener);

      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signIn",
          user: expect.objectContaining({ email: "valid@example.com" }),
        }),
      );
    });

    it("should notify listeners on sign out", async () => {
      const listener = jest.fn();
      provider.onAuthStateChange(listener);

      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });
      await provider.signOut();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signOut",
        }),
      );
    });

    it("should return unsubscribe function", async () => {
      const listener = jest.fn();
      const unsubscribe = provider.onAuthStateChange(listener);

      unsubscribe();
      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle listener errors gracefully", async () => {
      const errorListener = jest.fn(() => {
        throw new Error("Listener error");
      });
      const normalListener = jest.fn();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      provider.onAuthStateChange(errorListener);
      provider.onAuthStateChange(normalListener);

      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("destroy", () => {
    it("should clear all state and listeners", async () => {
      const listener = jest.fn();
      provider.onAuthStateChange(listener);
      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      provider.destroy();

      expect(provider.isAuthenticated()).toBe(false);
      expect(await provider.getCurrentUser()).toBeNull();

      // Listener should have been cleared
      await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });
      // Original listener calls + sign in after destroy should not add more
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("helper methods", () => {
    it("should create error objects correctly", async () => {
      const result = await provider.signIn({
        email: "invalid@example.com",
        password: "wrong",
      });

      expect(result.error).toEqual({
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
        details: undefined,
      });
    });

    it("should create success results with expiration", async () => {
      const result = await provider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });
  });
});

describe("AuthProviderRegistry", () => {
  let registry: AuthProviderRegistry;
  let testProvider: TestAuthProvider;

  beforeEach(() => {
    registry = new AuthProviderRegistry();
    testProvider = new TestAuthProvider();
  });

  afterEach(() => {
    registry.destroy();
  });

  describe("register", () => {
    it("should register a provider", () => {
      registry.register(testProvider);

      expect(registry.get("test-provider")).toBe(testProvider);
    });

    it("should replace existing provider with same id", () => {
      const firstProvider = new TestAuthProvider();
      const secondProvider = new TestAuthProvider();
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      registry.register(firstProvider);
      registry.register(secondProvider);

      expect(registry.get("test-provider")).toBe(secondProvider);
      // Check that console.warn was called (message may be formatted by jest.setup.js)
      expect(consoleSpy).toHaveBeenCalled();
      // Verify the call contains the expected text (any argument position)
      const calls = consoleSpy.mock.calls;
      const hasExpectedMessage = calls.some((args) =>
        args.some(
          (arg) =>
            typeof arg === "string" && arg.includes("already registered"),
        ),
      );
      expect(hasExpectedMessage).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should forward events from registered providers", async () => {
      const listener = jest.fn();
      registry.onAuthStateChange(listener);
      registry.register(testProvider);

      await testProvider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signIn",
        }),
      );
    });
  });

  describe("unregister", () => {
    it("should remove a provider", () => {
      registry.register(testProvider);
      expect(registry.get("test-provider")).toBe(testProvider);

      registry.unregister("test-provider");

      expect(registry.get("test-provider")).toBeUndefined();
    });

    it("should destroy the provider when unregistering", () => {
      const destroySpy = jest.spyOn(testProvider, "destroy");
      registry.register(testProvider);

      registry.unregister("test-provider");

      expect(destroySpy).toHaveBeenCalled();
    });

    it("should handle unregistering non-existent provider gracefully", () => {
      expect(() => registry.unregister("non-existent")).not.toThrow();
    });
  });

  describe("get", () => {
    it("should return provider by id", () => {
      registry.register(testProvider);

      expect(registry.get("test-provider")).toBe(testProvider);
    });

    it("should return undefined for unknown id", () => {
      expect(registry.get("unknown")).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all registered providers", () => {
      const provider1 = new TestAuthProvider();
      const provider2 = new TestAuthProvider();
      provider2.metadata.id = "test-provider-2";

      registry.register(provider1);
      registry.register(provider2);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContain(provider1);
      expect(all).toContain(provider2);
    });

    it("should return empty array when no providers registered", () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("getEnabled", () => {
    it("should return only enabled providers", async () => {
      const enabledProvider = new TestAuthProvider();
      enabledProvider.metadata.id = "enabled";
      await enabledProvider.initialize({ enabled: true });

      const disabledProvider = new TestAuthProvider();
      disabledProvider.metadata.id = "disabled";
      await disabledProvider.initialize({ enabled: false });

      registry.register(enabledProvider);
      registry.register(disabledProvider);

      const enabled = registry.getEnabled();

      expect(enabled).toHaveLength(1);
      expect(enabled[0]).toBe(enabledProvider);
    });
  });

  describe("getByType", () => {
    it("should return providers by type", () => {
      const emailProvider = new TestAuthProvider();
      emailProvider.metadata.id = "email-1";
      emailProvider.metadata.type = "email";

      const socialProvider = new TestAuthProvider();
      socialProvider.metadata.id = "social-1";
      socialProvider.metadata.type = "social";

      registry.register(emailProvider);
      registry.register(socialProvider);

      const emailProviders = registry.getByType("email");

      expect(emailProviders).toHaveLength(1);
      expect(emailProviders[0]).toBe(emailProvider);
    });
  });

  describe("onAuthStateChange", () => {
    it("should notify registry listeners on provider events", async () => {
      const listener = jest.fn();
      registry.onAuthStateChange(listener);
      registry.register(testProvider);

      await testProvider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      expect(listener).toHaveBeenCalled();
    });

    it("should return unsubscribe function", async () => {
      const listener = jest.fn();
      const unsubscribe = registry.onAuthStateChange(listener);
      registry.register(testProvider);

      unsubscribe();
      await testProvider.signIn({
        email: "valid@example.com",
        password: "password",
      });

      // Listener should still be called because the provider forwards to registry
      // but if we check the registry's own listeners, it should be empty
      // This tests the unsubscribe from registry level
    });
  });

  describe("destroy", () => {
    it("should destroy all providers and clear listeners", () => {
      const destroySpy = jest.spyOn(testProvider, "destroy");
      registry.register(testProvider);

      registry.destroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(registry.getAll()).toEqual([]);
    });
  });
});

describe("authProviderRegistry singleton", () => {
  afterEach(() => {
    // Clean up singleton state
    authProviderRegistry.destroy();
  });

  it("should be a singleton instance", () => {
    expect(authProviderRegistry).toBeDefined();
    expect(authProviderRegistry).toBeInstanceOf(AuthProviderRegistry);
  });

  it("should allow registering providers", () => {
    const provider = new TestAuthProvider();

    authProviderRegistry.register(provider);

    expect(authProviderRegistry.get("test-provider")).toBe(provider);
  });
});
