/**
 * Tests for oauth-providers.ts
 *
 * Verifies the structural integrity and utility functions of the 11 OAuth
 * provider configurations. These are pure data + utility functions — testing
 * them gives broad coverage with minimal test code.
 *
 * Coverage intent: validate all 11 providers have the required fields, all
 * utility functions return correct results given the test environment where
 * no OAuth env vars are set.
 */

import {
  oauthProviders,
  getOAuthProvider,
  getEnabledOAuthProviders,
  getAllOAuthProviderNames,
  isOAuthProviderEnabled,
  validateOAuthProvider,
  validateAllOAuthProviders,
  type OAuthProviderName,
  type OAuthProviderMetadata,
  type OAuthProviderValidation,
} from "../oauth-providers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_PROVIDER_NAMES: OAuthProviderName[] = [
  "google",
  "github",
  "microsoft",
  "facebook",
  "twitter",
  "linkedin",
  "apple",
  "discord",
  "slack",
  "gitlab",
  "idme",
];

const REQUIRED_METADATA_FIELDS: Array<keyof OAuthProviderMetadata> = [
  "name",
  "displayName",
  "redirectUri",
  "authUrl",
  "tokenUrl",
  "userInfoUrl",
  "scopes",
  "enabled",
];

// ---------------------------------------------------------------------------
// Top-level structure
// ---------------------------------------------------------------------------

describe("oauthProviders record", () => {
  it("is exported as a non-null object", () => {
    expect(oauthProviders).toBeDefined();
    expect(typeof oauthProviders).toBe("object");
    expect(oauthProviders).not.toBeNull();
  });

  it("contains exactly 11 providers", () => {
    expect(Object.keys(oauthProviders)).toHaveLength(11);
  });

  it("contains all expected provider keys", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      expect(oauthProviders).toHaveProperty(name);
    }
  });

  it("has no unexpected keys", () => {
    const keys = Object.keys(oauthProviders).sort();
    const expected = [...ALL_PROVIDER_NAMES].sort();
    expect(keys).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// Per-provider structural validation
// ---------------------------------------------------------------------------

describe("each provider has the required fields", () => {
  for (const providerName of ALL_PROVIDER_NAMES) {
    describe(`provider: ${providerName}`, () => {
      const provider = oauthProviders[providerName];

      it("has name matching the record key", () => {
        expect(provider.name).toBe(providerName);
      });

      it("has a non-empty displayName string", () => {
        expect(typeof provider.displayName).toBe("string");
        expect(provider.displayName.length).toBeGreaterThan(0);
      });

      it("has a non-empty redirectUri string", () => {
        expect(typeof provider.redirectUri).toBe("string");
        expect(provider.redirectUri.length).toBeGreaterThan(0);
      });

      it("has a non-empty authUrl string", () => {
        expect(typeof provider.authUrl).toBe("string");
        expect(provider.authUrl.length).toBeGreaterThan(0);
        expect(provider.authUrl).toMatch(/^https?:\/\//);
      });

      it("has a non-empty tokenUrl string", () => {
        expect(typeof provider.tokenUrl).toBe("string");
        expect(provider.tokenUrl.length).toBeGreaterThan(0);
        expect(provider.tokenUrl).toMatch(/^https?:\/\//);
      });

      it("has a non-empty userInfoUrl string", () => {
        expect(typeof provider.userInfoUrl).toBe("string");
        expect(provider.userInfoUrl.length).toBeGreaterThan(0);
        expect(provider.userInfoUrl).toMatch(/^https?:\/\//);
      });

      it("has a non-empty scopes array", () => {
        expect(Array.isArray(provider.scopes)).toBe(true);
        expect(provider.scopes.length).toBeGreaterThan(0);
        for (const scope of provider.scopes) {
          expect(typeof scope).toBe("string");
          expect(scope.length).toBeGreaterThan(0);
        }
      });

      it("has a boolean enabled field", () => {
        expect(typeof provider.enabled).toBe("boolean");
      });

      it("has all required fields", () => {
        for (const field of REQUIRED_METADATA_FIELDS) {
          expect(provider).toHaveProperty(field);
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// redirectUri format
// ---------------------------------------------------------------------------

describe("redirectUri format", () => {
  it("each provider redirectUri contains the provider name", () => {
    for (const providerName of ALL_PROVIDER_NAMES) {
      const provider = oauthProviders[providerName];
      expect(provider.redirectUri).toContain(providerName);
    }
  });

  it("each provider redirectUri ends with /callback", () => {
    for (const providerName of ALL_PROVIDER_NAMES) {
      const provider = oauthProviders[providerName];
      expect(provider.redirectUri).toMatch(/\/callback$/);
    }
  });

  it("each provider redirectUri contains /api/auth/", () => {
    for (const providerName of ALL_PROVIDER_NAMES) {
      const provider = oauthProviders[providerName];
      expect(provider.redirectUri).toContain("/api/auth/");
    }
  });
});

// ---------------------------------------------------------------------------
// Spot-checks on specific providers
// ---------------------------------------------------------------------------

describe("google provider spot-checks", () => {
  const provider = oauthProviders.google;

  it("has displayName 'Google'", () => {
    expect(provider.displayName).toBe("Google");
  });

  it("uses Google OAuth2 authUrl", () => {
    expect(provider.authUrl).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
  });

  it("has openid, email, profile scopes", () => {
    expect(provider.scopes).toContain("openid");
    expect(provider.scopes).toContain("email");
    expect(provider.scopes).toContain("profile");
  });

  it("is disabled in test environment (no GOOGLE_CLIENT_ID env var)", () => {
    expect(provider.enabled).toBe(false);
  });
});

describe("github provider spot-checks", () => {
  const provider = oauthProviders.github;

  it("has displayName 'GitHub'", () => {
    expect(provider.displayName).toBe("GitHub");
  });

  it("uses GitHub OAuth authUrl", () => {
    expect(provider.authUrl).toBe("https://github.com/login/oauth/authorize");
  });

  it("has read:user and user:email scopes", () => {
    expect(provider.scopes).toContain("read:user");
    expect(provider.scopes).toContain("user:email");
  });
});

describe("discord provider spot-checks", () => {
  const provider = oauthProviders.discord;

  it("has displayName 'Discord'", () => {
    expect(provider.displayName).toBe("Discord");
  });

  it("uses Discord OAuth2 authUrl", () => {
    expect(provider.authUrl).toBe("https://discord.com/api/oauth2/authorize");
  });

  it("has identify and email scopes", () => {
    expect(provider.scopes).toContain("identify");
    expect(provider.scopes).toContain("email");
  });
});

describe("idme provider spot-checks", () => {
  const provider = oauthProviders.idme;

  it("has displayName 'ID.me'", () => {
    expect(provider.displayName).toBe("ID.me");
  });

  it("uses id.me authUrl", () => {
    expect(provider.authUrl).toBe("https://api.id.me/oauth/authorize");
  });

  it("has military and responder scopes", () => {
    expect(provider.scopes).toContain("military");
    expect(provider.scopes).toContain("responder");
  });
});

// ---------------------------------------------------------------------------
// getOAuthProvider
// ---------------------------------------------------------------------------

describe("getOAuthProvider()", () => {
  it("returns the provider metadata for a known provider", () => {
    const provider = getOAuthProvider("google");
    expect(provider).not.toBeNull();
    expect(provider!.name).toBe("google");
    expect(provider!.displayName).toBe("Google");
  });

  it("returns metadata for all 11 providers", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      const provider = getOAuthProvider(name);
      expect(provider).not.toBeNull();
      expect(provider!.name).toBe(name);
    }
  });

  it("returns the same object as the oauthProviders record", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      expect(getOAuthProvider(name)).toBe(oauthProviders[name]);
    }
  });
});

// ---------------------------------------------------------------------------
// getEnabledOAuthProviders
// ---------------------------------------------------------------------------

describe("getEnabledOAuthProviders()", () => {
  it("returns an array", () => {
    const enabled = getEnabledOAuthProviders();
    expect(Array.isArray(enabled)).toBe(true);
  });

  it("returns only providers where enabled is true", () => {
    const enabled = getEnabledOAuthProviders();
    for (const provider of enabled) {
      expect(provider.enabled).toBe(true);
    }
  });

  it("returns empty array in test environment (no OAuth env vars set)", () => {
    // In the test environment no NEXT_PUBLIC_*_CLIENT_ID vars are set,
    // so all providers should be disabled.
    const enabled = getEnabledOAuthProviders();
    expect(enabled).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getAllOAuthProviderNames
// ---------------------------------------------------------------------------

describe("getAllOAuthProviderNames()", () => {
  it("returns an array of 11 strings", () => {
    const names = getAllOAuthProviderNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names).toHaveLength(11);
  });

  it("contains all expected provider names", () => {
    const names = getAllOAuthProviderNames();
    for (const expected of ALL_PROVIDER_NAMES) {
      expect(names).toContain(expected);
    }
  });

  it("each entry is a string", () => {
    const names = getAllOAuthProviderNames();
    for (const name of names) {
      expect(typeof name).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// isOAuthProviderEnabled
// ---------------------------------------------------------------------------

describe("isOAuthProviderEnabled()", () => {
  it("returns a boolean", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      expect(typeof isOAuthProviderEnabled(name)).toBe("boolean");
    }
  });

  it("returns false for all providers in test environment", () => {
    // No NEXT_PUBLIC_*_CLIENT_ID env vars set in Jest environment
    for (const name of ALL_PROVIDER_NAMES) {
      expect(isOAuthProviderEnabled(name)).toBe(false);
    }
  });

  it("is consistent with oauthProviders[name].enabled", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      expect(isOAuthProviderEnabled(name)).toBe(oauthProviders[name].enabled);
    }
  });
});

// ---------------------------------------------------------------------------
// validateOAuthProvider
// ---------------------------------------------------------------------------

describe("validateOAuthProvider()", () => {
  it("returns an OAuthProviderValidation object", () => {
    const result = validateOAuthProvider("google");
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("warnings");
  });

  it("provider field matches the input", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      const result = validateOAuthProvider(name);
      expect(result.provider).toBe(name);
    }
  });

  it("valid is a boolean", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      const result = validateOAuthProvider(name);
      expect(typeof result.valid).toBe("boolean");
    }
  });

  it("errors is an array", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      const result = validateOAuthProvider(name);
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });

  it("warnings is an array", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      const result = validateOAuthProvider(name);
      expect(Array.isArray(result.warnings)).toBe(true);
    }
  });

  it("is invalid in test environment (missing client ID and secret)", () => {
    // No OAuth credentials in the test environment
    for (const name of ALL_PROVIDER_NAMES) {
      const result = validateOAuthProvider(name);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("reports missing CLIENT_ID error for google", () => {
    const result = validateOAuthProvider("google");
    const hasClientIdError = result.errors.some((e) =>
      e.includes("NEXT_PUBLIC_GOOGLE_CLIENT_ID"),
    );
    expect(hasClientIdError).toBe(true);
  });

  it("reports missing CLIENT_SECRET error for github", () => {
    const result = validateOAuthProvider("github");
    const hasSecretError = result.errors.some((e) =>
      e.includes("GITHUB_CLIENT_SECRET"),
    );
    expect(hasSecretError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateAllOAuthProviders
// ---------------------------------------------------------------------------

describe("validateAllOAuthProviders()", () => {
  it("returns an array of 11 validation results", () => {
    const results = validateAllOAuthProviders();
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(11);
  });

  it("each result has the required fields", () => {
    const results = validateAllOAuthProviders();
    for (const result of results) {
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
    }
  });

  it("covers all 11 provider names", () => {
    const results = validateAllOAuthProviders();
    const resultProviders = results.map((r) => r.provider).sort();
    const expected = [...ALL_PROVIDER_NAMES].sort();
    expect(resultProviders).toEqual(expected);
  });

  it("all providers are invalid in test environment", () => {
    const results = validateAllOAuthProviders();
    for (const result of results) {
      expect(result.valid).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Type interface completeness
// ---------------------------------------------------------------------------

describe("OAuthProviderMetadata interface", () => {
  it("has all required fields on every provider", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      const provider = oauthProviders[name];
      for (const field of REQUIRED_METADATA_FIELDS) {
        expect(provider).toHaveProperty(field);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Iterability helpers
// ---------------------------------------------------------------------------

describe("oauthProviders iterability", () => {
  it("Object.values returns an array of 11 OAuthProviderMetadata objects", () => {
    const providers = Object.values(oauthProviders);
    expect(Array.isArray(providers)).toBe(true);
    expect(providers).toHaveLength(11);
    for (const p of providers) {
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("displayName");
      expect(p).toHaveProperty("redirectUri");
      expect(p).toHaveProperty("scopes");
      expect(p).toHaveProperty("enabled");
    }
  });

  it("Object.entries returns [key, provider] pairs", () => {
    const entries = Object.entries(oauthProviders);
    expect(entries).toHaveLength(11);
    for (const [key, provider] of entries) {
      expect(typeof key).toBe("string");
      expect(provider.name).toBe(key);
    }
  });

  it("can look up any provider by key without undefined", () => {
    for (const name of ALL_PROVIDER_NAMES) {
      expect(oauthProviders[name]).toBeDefined();
    }
  });
});
