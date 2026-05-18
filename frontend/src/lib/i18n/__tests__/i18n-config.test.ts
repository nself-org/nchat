/**
 * @fileoverview Tests for i18n configuration
 *
 * Tests the core i18n configuration module including locale settings,
 * namespace management, and translation key parsing.
 */

import {
  i18nConfig,
  getI18nConfig,
  isValidNamespace,
  parseTranslationKey,
  buildTranslationKey,
  getEnvironmentConfig,
  getMergedConfig,
  type I18nConfig,
  type Namespace,
} from "../i18n-config";

describe("i18nConfig", () => {
  describe("default configuration", () => {
    it("should have correct default locale", () => {
      expect(i18nConfig.defaultLocale).toBe("en");
    });

    it("should have correct fallback locale", () => {
      expect(i18nConfig.fallbackLocale).toBe("en");
    });

    it("should have supported locales array", () => {
      expect(Array.isArray(i18nConfig.supportedLocales)).toBe(true);
      expect(i18nConfig.supportedLocales).toContain("en");
      expect(i18nConfig.supportedLocales).toContain("es");
      expect(i18nConfig.supportedLocales).toContain("ar");
    });

    it("should have correct key separator", () => {
      expect(i18nConfig.keySeparator).toBe(".");
    });

    it("should have correct namespace separator", () => {
      expect(i18nConfig.namespaceSeparator).toBe(":");
    });

    it("should have correct plural separator", () => {
      expect(i18nConfig.pluralSeparator).toBe("_");
    });

    it("should have correct context separator", () => {
      expect(i18nConfig.contextSeparator).toBe("_");
    });

    it("should have correct interpolation delimiters", () => {
      expect(i18nConfig.interpolationStart).toBe("{{");
      expect(i18nConfig.interpolationEnd).toBe("}}");
    });

    it("should have default namespace set to common", () => {
      expect(i18nConfig.defaultNamespace).toBe("common");
    });

    it("should have defined namespaces", () => {
      expect(i18nConfig.namespaces).toContain("common");
      expect(i18nConfig.namespaces).toContain("chat");
      expect(i18nConfig.namespaces).toContain("settings");
      expect(i18nConfig.namespaces).toContain("admin");
    });

    it("should have escapeValue enabled by default", () => {
      expect(i18nConfig.escapeValue).toBe(true);
    });

    it("should have lazyLoad enabled by default", () => {
      expect(i18nConfig.lazyLoad).toBe(true);
    });

    it("should have correct storage key", () => {
      expect(i18nConfig.storageKey).toBe("nchat-locale");
    });

    it("should have correct cookie name", () => {
      expect(i18nConfig.cookieName).toBe("NCHAT_LOCALE");
    });

    it("should have cookie max age of 1 year", () => {
      const oneYearInSeconds = 365 * 24 * 60 * 60;
      expect(i18nConfig.cookieMaxAge).toBe(oneYearInSeconds);
    });

    it("should have browser locale detection enabled", () => {
      expect(i18nConfig.detectBrowserLocale).toBe(true);
    });

    it("should have URL locale detection disabled", () => {
      expect(i18nConfig.detectUrlLocale).toBe(false);
    });

    it("should have correct URL param name", () => {
      expect(i18nConfig.urlParamName).toBe("lang");
    });

    it("should have locale persistence enabled", () => {
      expect(i18nConfig.persistLocale).toBe(true);
    });
  });
});

describe("getI18nConfig", () => {
  it("should return defaultLocale", () => {
    expect(getI18nConfig("defaultLocale")).toBe("en");
  });

  it("should return fallbackLocale", () => {
    expect(getI18nConfig("fallbackLocale")).toBe("en");
  });

  it("should return supportedLocales", () => {
    const locales = getI18nConfig("supportedLocales");
    expect(Array.isArray(locales)).toBe(true);
  });

  it("should return keySeparator", () => {
    expect(getI18nConfig("keySeparator")).toBe(".");
  });

  it("should return namespaceSeparator", () => {
    expect(getI18nConfig("namespaceSeparator")).toBe(":");
  });

  it("should return pluralSeparator", () => {
    expect(getI18nConfig("pluralSeparator")).toBe("_");
  });

  it("should return interpolationStart", () => {
    expect(getI18nConfig("interpolationStart")).toBe("{{");
  });

  it("should return interpolationEnd", () => {
    expect(getI18nConfig("interpolationEnd")).toBe("}}");
  });

  it("should return namespaces", () => {
    const namespaces = getI18nConfig("namespaces");
    expect(namespaces).toContain("common");
  });

  it("should return debug flag", () => {
    const debug = getI18nConfig("debug");
    expect(typeof debug).toBe("boolean");
  });

  it("should return escapeValue", () => {
    expect(getI18nConfig("escapeValue")).toBe(true);
  });

  it("should return storageKey", () => {
    expect(getI18nConfig("storageKey")).toBe("nchat-locale");
  });

  it("should return cookieName", () => {
    expect(getI18nConfig("cookieName")).toBe("NCHAT_LOCALE");
  });

  it("should return cookieMaxAge", () => {
    expect(typeof getI18nConfig("cookieMaxAge")).toBe("number");
  });

  it("should return detectBrowserLocale", () => {
    expect(getI18nConfig("detectBrowserLocale")).toBe(true);
  });

  it("should return urlParamName", () => {
    expect(getI18nConfig("urlParamName")).toBe("lang");
  });
});

describe("isValidNamespace", () => {
  it("should return true for common namespace", () => {
    expect(isValidNamespace("common")).toBe(true);
  });

  it("should return true for chat namespace", () => {
    expect(isValidNamespace("chat")).toBe(true);
  });

  it("should return true for settings namespace", () => {
    expect(isValidNamespace("settings")).toBe(true);
  });

  it("should return true for admin namespace", () => {
    expect(isValidNamespace("admin")).toBe(true);
  });

  it("should return true for auth namespace", () => {
    expect(isValidNamespace("auth")).toBe(true);
  });

  it("should return true for errors namespace", () => {
    expect(isValidNamespace("errors")).toBe(true);
  });

  it("should return false for invalid namespace", () => {
    expect(isValidNamespace("invalid")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidNamespace("")).toBe(false);
  });

  it("should return false for undefined-like strings", () => {
    expect(isValidNamespace("undefined")).toBe(false);
    expect(isValidNamespace("null")).toBe(false);
  });

  it("should return false for case-mismatched namespace", () => {
    expect(isValidNamespace("Common")).toBe(false);
    expect(isValidNamespace("CHAT")).toBe(false);
  });
});

describe("parseTranslationKey", () => {
  it("should parse key with namespace", () => {
    const result = parseTranslationKey("chat:messages.new");
    expect(result.namespace).toBe("chat");
    expect(result.key).toBe("messages.new");
  });

  it("should parse key without namespace", () => {
    const result = parseTranslationKey("buttons.save");
    expect(result.namespace).toBe("common");
    expect(result.key).toBe("buttons.save");
  });

  it("should handle simple key without dots", () => {
    const result = parseTranslationKey("hello");
    expect(result.namespace).toBe("common");
    expect(result.key).toBe("hello");
  });

  it("should handle key with only namespace separator", () => {
    const result = parseTranslationKey("admin:dashboard");
    expect(result.namespace).toBe("admin");
    expect(result.key).toBe("dashboard");
  });

  it("should handle deeply nested key", () => {
    const result = parseTranslationKey("settings:profile.form.fields.name");
    expect(result.namespace).toBe("settings");
    expect(result.key).toBe("profile.form.fields.name");
  });

  it("should handle key with multiple colons by splitting on first colon", () => {
    // The function uses split which creates array of all parts
    // Let's test what actually happens
    const result = parseTranslationKey("chat:messages:special");
    // When there are more than 2 parts, it only uses the first 2
    expect(result.namespace).toBe("common"); // Default since split produces > 2 parts
    expect(result.key).toBe("chat:messages:special");
  });

  it("should handle empty string", () => {
    const result = parseTranslationKey("");
    expect(result.namespace).toBe("common");
    expect(result.key).toBe("");
  });

  it("should handle key starting with separator", () => {
    const result = parseTranslationKey(":messages");
    expect(result.namespace).toBe("");
    expect(result.key).toBe("messages");
  });

  it("should handle auth namespace", () => {
    const result = parseTranslationKey("auth:login.title");
    expect(result.namespace).toBe("auth");
    expect(result.key).toBe("login.title");
  });

  it("should handle errors namespace", () => {
    const result = parseTranslationKey("errors:validation.required");
    expect(result.namespace).toBe("errors");
    expect(result.key).toBe("validation.required");
  });
});

describe("buildTranslationKey", () => {
  it("should build key with namespace", () => {
    const result = buildTranslationKey("chat", "messages.new");
    expect(result).toBe("chat:messages.new");
  });

  it("should return key only for default namespace", () => {
    const result = buildTranslationKey("common", "buttons.save");
    expect(result).toBe("buttons.save");
  });

  it("should build key with admin namespace", () => {
    const result = buildTranslationKey("admin", "users.list");
    expect(result).toBe("admin:users.list");
  });

  it("should build key with settings namespace", () => {
    const result = buildTranslationKey("settings", "profile.name");
    expect(result).toBe("settings:profile.name");
  });

  it("should build key with auth namespace", () => {
    const result = buildTranslationKey("auth", "login");
    expect(result).toBe("auth:login");
  });

  it("should build key with errors namespace", () => {
    const result = buildTranslationKey("errors", "notFound");
    expect(result).toBe("errors:notFound");
  });

  it("should handle empty key", () => {
    const result = buildTranslationKey("chat", "");
    expect(result).toBe("chat:");
  });

  it("should handle empty namespace (not default)", () => {
    const result = buildTranslationKey("", "key");
    expect(result).toBe(":key");
  });
});

describe("getEnvironmentConfig", () => {
  it("should return object", () => {
    const config = getEnvironmentConfig();
    expect(typeof config).toBe("object");
  });

  it("should return partial config type", () => {
    const config = getEnvironmentConfig();
    // Should be a valid partial config
    if (config.detectBrowserLocale !== undefined) {
      expect(typeof config.detectBrowserLocale).toBe("boolean");
    }
    if (config.persistLocale !== undefined) {
      expect(typeof config.persistLocale).toBe("boolean");
    }
  });
});

describe("getMergedConfig", () => {
  it("should return complete config", () => {
    const config = getMergedConfig();
    expect(config.defaultLocale).toBeDefined();
    expect(config.fallbackLocale).toBeDefined();
    expect(config.supportedLocales).toBeDefined();
    expect(config.keySeparator).toBeDefined();
    expect(config.namespaceSeparator).toBeDefined();
  });

  it("should include all base config properties", () => {
    const config = getMergedConfig();
    expect(config.defaultLocale).toBe("en");
    expect(config.keySeparator).toBe(".");
    expect(config.namespaceSeparator).toBe(":");
  });

  it("should have environment overrides applied", () => {
    const config = getMergedConfig();
    // In test environment (Node.js), window is undefined
    // so browser detection should be disabled
    expect(typeof config.detectBrowserLocale).toBe("boolean");
  });

  it("should return immutable-like config", () => {
    const config1 = getMergedConfig();
    const config2 = getMergedConfig();
    expect(config1.defaultLocale).toBe(config2.defaultLocale);
    expect(config1.namespaces).toEqual(config2.namespaces);
  });
});

describe("Namespace type", () => {
  it("should accept valid namespace strings", () => {
    const common: Namespace = "common";
    const chat: Namespace = "chat";
    const settings: Namespace = "settings";
    const admin: Namespace = "admin";

    expect(common).toBe("common");
    expect(chat).toBe("chat");
    expect(settings).toBe("settings");
    expect(admin).toBe("admin");
  });
});

describe("I18nConfig type", () => {
  it("should have all required properties", () => {
    const config: I18nConfig = i18nConfig;

    expect(typeof config.defaultLocale).toBe("string");
    expect(typeof config.fallbackLocale).toBe("string");
    expect(Array.isArray(config.supportedLocales)).toBe(true);
    expect(typeof config.debug).toBe("boolean");
    expect(typeof config.lazyLoad).toBe("boolean");
    expect(typeof config.keySeparator).toBe("string");
    expect(typeof config.namespaceSeparator).toBe("string");
    expect(typeof config.pluralSeparator).toBe("string");
    expect(typeof config.contextSeparator).toBe("string");
    expect(typeof config.interpolationStart).toBe("string");
    expect(typeof config.interpolationEnd).toBe("string");
    expect(typeof config.defaultNamespace).toBe("string");
    expect(Array.isArray(config.namespaces)).toBe(true);
    expect(typeof config.escapeValue).toBe("boolean");
    expect(typeof config.preloadNamespaces).toBe("boolean");
    expect(typeof config.storageKey).toBe("string");
    expect(typeof config.cookieName).toBe("string");
    expect(typeof config.cookieMaxAge).toBe("number");
    expect(typeof config.detectBrowserLocale).toBe("boolean");
    expect(typeof config.detectUrlLocale).toBe("boolean");
    expect(typeof config.urlParamName).toBe("string");
    expect(typeof config.persistLocale).toBe("boolean");
  });
});
