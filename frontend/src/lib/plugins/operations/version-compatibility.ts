/**
 * Version Compatibility Checker
 *
 * Validates plugin versions against platform version using semver semantics.
 * Supports compatibility rules, deprecation warnings, and upgrade suggestions.
 */

import type {
  SemVer,
  VersionCompatibilityResult,
  VersionCompatibilityConfig,
  VersionCompatibilityRule,
  VersionIssue,
} from "./types";
import { DEFAULT_VERSION_COMPATIBILITY_CONFIG } from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class VersionCompatibilityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "VersionCompatibilityError";
  }
}

// ============================================================================
// SEMVER PARSING
// ============================================================================

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$/;

/**
 * Parse a semver string into components.
 */
export function parseSemVer(version: string): SemVer | null {
  const match = version.match(SEMVER_REGEX);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

/**
 * Compare two semver versions.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;

  // Prerelease versions have lower precedence
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) {
    return a.prerelease < b.prerelease
      ? -1
      : a.prerelease > b.prerelease
        ? 1
        : 0;
  }

  return 0;
}

/**
 * Compare two semver version strings.
 */
export function compareVersionStrings(a: string, b: string): number {
  const parsedA = parseSemVer(a);
  const parsedB = parseSemVer(b);

  if (!parsedA || !parsedB) {
    throw new VersionCompatibilityError(
      `Invalid semver: ${!parsedA ? a : b}`,
      "INVALID_SEMVER",
    );
  }

  return compareSemVer(parsedA, parsedB);
}

/**
 * Check if a version satisfies a range (minVersion <= version <= maxVersion).
 */
export function isVersionInRange(
  version: string,
  minVersion: string,
  maxVersion: string,
): boolean {
  const parsed = parseSemVer(version);
  const parsedMin = parseSemVer(minVersion);
  const parsedMax = parseSemVer(maxVersion);

  if (!parsed || !parsedMin || !parsedMax) return false;

  return (
    compareSemVer(parsed, parsedMin) >= 0 &&
    compareSemVer(parsed, parsedMax) <= 0
  );
}

/**
 * Check if two versions have the same major version.
 */
export function isSameMajor(a: string, b: string): boolean {
  const parsedA = parseSemVer(a);
  const parsedB = parseSemVer(b);
  if (!parsedA || !parsedB) return false;
  return parsedA.major === parsedB.major;
}

/**
 * Check if version a is compatible with version b (same major, a.minor >= b.minor).
 */
export function isCompatible(
  pluginVersion: string,
  platformVersion: string,
): boolean {
  const plugin = parseSemVer(pluginVersion);
  const platform = parseSemVer(platformVersion);
  if (!plugin || !platform) return false;

  // Same major version is required
  if (plugin.major !== platform.major) return false;

  // Plugin minor can be <= platform minor for backward compat
  return true;
}

// ============================================================================
// DEPRECATION REGISTRY
// ============================================================================

interface DeprecationEntry {
  pluginId: string;
  version: string;
  message: string;
  deprecatedAt: string;
  removalVersion: string | null;
}

// ============================================================================
// VERSION COMPATIBILITY CHECKER
// ============================================================================

export class VersionCompatibilityChecker {
  private config: VersionCompatibilityConfig;
  private rules: Map<string, VersionCompatibilityRule[]> = new Map();
  private deprecations: DeprecationEntry[] = [];
  private knownVersions: Map<string, string[]> = new Map();

  constructor(config?: Partial<VersionCompatibilityConfig>) {
    this.config = { ...DEFAULT_VERSION_COMPATIBILITY_CONFIG, ...config };

    // Load initial rules from config
    for (const rule of this.config.rules) {
      this.addRule(rule);
    }
  }

  // ==========================================================================
  // RULES MANAGEMENT
  // ==========================================================================

  /**
   * Add a compatibility rule.
   */
  addRule(rule: VersionCompatibilityRule): void {
    const rules = this.rules.get(rule.pluginId) || [];
    rules.push(rule);
    this.rules.set(rule.pluginId, rules);
  }

  /**
   * Remove all rules for a plugin.
   */
  removeRules(pluginId: string): boolean {
    return this.rules.delete(pluginId);
  }

  /**
   * Get rules for a plugin.
   */
  getRules(pluginId: string): VersionCompatibilityRule[] {
    return this.rules.get(pluginId) || [];
  }

  /**
   * Get all rules.
   */
  getAllRules(): VersionCompatibilityRule[] {
    const allRules: VersionCompatibilityRule[] = [];
    for (const rules of this.rules.values()) {
      allRules.push(...rules);
    }
    return allRules;
  }

  // ==========================================================================
  // DEPRECATION MANAGEMENT
  // ==========================================================================

  /**
   * Register a version as deprecated.
   */
  registerDeprecation(
    pluginId: string,
    version: string,
    message: string,
    removalVersion?: string,
  ): void {
    this.deprecations.push({
      pluginId,
      version,
      message,
      deprecatedAt: new Date().toISOString(),
      removalVersion: removalVersion || null,
    });
  }

  /**
   * Get deprecation warnings for a plugin version.
   */
  getDeprecations(pluginId: string, version: string): string[] {
    return this.deprecations
      .filter((d) => d.pluginId === pluginId && d.version === version)
      .map((d) => {
        let msg = d.message;
        if (d.removalVersion) {
          msg += ` (will be removed in ${d.removalVersion})`;
        }
        return msg;
      });
  }

  // ==========================================================================
  // KNOWN VERSIONS
  // ==========================================================================

  /**
   * Register known versions for a plugin (for upgrade suggestions).
   */
  registerKnownVersions(pluginId: string, versions: string[]): void {
    this.knownVersions.set(pluginId, [...versions].sort(compareVersionStrings));
  }

  /**
   * Get the latest known version for a plugin.
   */
  getLatestVersion(pluginId: string): string | null {
    const versions = this.knownVersions.get(pluginId);
    if (!versions || versions.length === 0) return null;
    return versions[versions.length - 1];
  }

  /**
   * Get a suggested compatible version for a plugin.
   */
  getSuggestedVersion(pluginId: string): string | null {
    const versions = this.knownVersions.get(pluginId);
    if (!versions || versions.length === 0) return null;

    const platformSemver = parseSemVer(this.config.platformVersion);
    if (!platformSemver) return null;

    // Find the latest version that is compatible
    for (let i = versions.length - 1; i >= 0; i--) {
      const ver = parseSemVer(versions[i]);
      if (!ver) continue;

      // Same major version, not prerelease (unless allowed)
      if (ver.major === platformSemver.major) {
        if (ver.prerelease && !this.config.allowPrerelease) continue;
        return versions[i];
      }
    }

    return null;
  }

  // ==========================================================================
  // COMPATIBILITY CHECKING
  // ==========================================================================

  /**
   * Check compatibility of a plugin version against the platform.
   */
  checkCompatibility(
    pluginId: string,
    pluginVersion: string,
  ): VersionCompatibilityResult {
    const issues: VersionIssue[] = [];
    const deprecationWarnings = this.getDeprecations(pluginId, pluginVersion);

    // Parse plugin version
    const parsedPlugin = parseSemVer(pluginVersion);
    if (!parsedPlugin) {
      issues.push({
        severity: "error",
        message: `Invalid plugin version: "${pluginVersion}" is not valid semver`,
        field: "pluginVersion",
      });
      return this.buildResult(
        pluginId,
        pluginVersion,
        false,
        issues,
        deprecationWarnings,
      );
    }

    // Parse platform version
    const parsedPlatform = parseSemVer(this.config.platformVersion);
    if (!parsedPlatform) {
      issues.push({
        severity: "error",
        message: `Invalid platform version: "${this.config.platformVersion}" is not valid semver`,
        field: "platformVersion",
      });
      return this.buildResult(
        pluginId,
        pluginVersion,
        false,
        issues,
        deprecationWarnings,
      );
    }

    // Check prerelease
    if (parsedPlugin.prerelease && !this.config.allowPrerelease) {
      issues.push({
        severity: "warning",
        message: `Plugin version "${pluginVersion}" is a prerelease version`,
        field: "prerelease",
      });
    }

    // Check major version compatibility
    if (parsedPlugin.major !== parsedPlatform.major) {
      issues.push({
        severity: "error",
        message: `Major version mismatch: plugin v${parsedPlugin.major}.x.x is not compatible with platform v${parsedPlatform.major}.x.x`,
        field: "majorVersion",
      });
    }

    // Check plugin-specific rules
    const pluginRules = this.rules.get(pluginId) || [];
    for (const rule of pluginRules) {
      if (!isVersionInRange(pluginVersion, rule.minVersion, rule.maxVersion)) {
        issues.push({
          severity: "error",
          message: `Version "${pluginVersion}" outside allowed range [${rule.minVersion}, ${rule.maxVersion}]: ${rule.description}`,
          field: "versionRange",
        });
      }

      if (parsedPlugin.prerelease && !rule.allowPrerelease) {
        issues.push({
          severity: "warning",
          message: `Prerelease versions not allowed by rule: ${rule.description}`,
          field: "prerelease",
        });
      }
    }

    // Add deprecation warnings
    for (const dep of deprecationWarnings) {
      issues.push({
        severity: "warning",
        message: dep,
        field: "deprecation",
      });
    }

    const hasErrors = issues.some((i) => i.severity === "error");
    return this.buildResult(
      pluginId,
      pluginVersion,
      !hasErrors,
      issues,
      deprecationWarnings,
    );
  }

  /**
   * Check compatibility of multiple plugins at once.
   */
  checkBulkCompatibility(
    plugins: Array<{ pluginId: string; version: string }>,
  ): Map<string, VersionCompatibilityResult> {
    const results = new Map<string, VersionCompatibilityResult>();
    for (const { pluginId, version } of plugins) {
      results.set(pluginId, this.checkCompatibility(pluginId, version));
    }
    return results;
  }

  /**
   * Check if a version upgrade is safe.
   */
  isUpgradeSafe(
    pluginId: string,
    fromVersion: string,
    toVersion: string,
  ): { safe: boolean; issues: VersionIssue[] } {
    const issues: VersionIssue[] = [];

    const from = parseSemVer(fromVersion);
    const to = parseSemVer(toVersion);

    if (!from || !to) {
      issues.push({
        severity: "error",
        message: `Invalid version: ${!from ? fromVersion : toVersion}`,
        field: "version",
      });
      return { safe: false, issues };
    }

    // Downgrade check
    if (compareSemVer(to, from) < 0) {
      issues.push({
        severity: "warning",
        message: `Downgrading from ${fromVersion} to ${toVersion}`,
        field: "downgrade",
      });
    }

    // Major version change is risky
    if (from.major !== to.major) {
      issues.push({
        severity: "error",
        message: `Major version change (${from.major} -> ${to.major}) may introduce breaking changes`,
        field: "majorVersion",
      });
    }

    // Check compatibility of target version
    const compatResult = this.checkCompatibility(pluginId, toVersion);
    if (!compatResult.compatible) {
      issues.push({
        severity: "error",
        message: `Target version ${toVersion} is not compatible with the platform`,
        field: "compatibility",
      });
    }

    const hasErrors = issues.some((i) => i.severity === "error");
    return { safe: !hasErrors, issues };
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get the current platform version.
   */
  getPlatformVersion(): string {
    return this.config.platformVersion;
  }

  /**
   * Update the platform version.
   */
  setPlatformVersion(version: string): void {
    if (!parseSemVer(version)) {
      throw new VersionCompatibilityError(
        `Invalid platform version: "${version}"`,
        "INVALID_SEMVER",
      );
    }
    this.config.platformVersion = version;
  }

  /**
   * Clear all rules, deprecations, and known versions.
   */
  clear(): void {
    this.rules.clear();
    this.deprecations = [];
    this.knownVersions.clear();
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private buildResult(
    pluginId: string,
    pluginVersion: string,
    compatible: boolean,
    issues: VersionIssue[],
    deprecations: string[],
  ): VersionCompatibilityResult {
    return {
      compatible,
      pluginId,
      pluginVersion,
      platformVersion: this.config.platformVersion,
      issues,
      deprecations,
      suggestedVersion: compatible ? null : this.getSuggestedVersion(pluginId),
    };
  }
}
