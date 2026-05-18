/**
 * Dependency Scanner (Software Composition Analysis - SCA)
 *
 * Provides scanning of project dependencies for known vulnerabilities,
 * license compliance, and outdated packages.
 *
 * @module lib/security/dependency-scanner
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Severity levels for vulnerability findings
 */
export type VulnerabilitySeverity =
  | "critical"
  | "high"
  | "moderate"
  | "low"
  | "info";

/**
 * Package ecosystem types
 */
export type PackageEcosystem =
  | "npm"
  | "pypi"
  | "maven"
  | "nuget"
  | "rubygems"
  | "go"
  | "cargo";

/**
 * A vulnerability in a dependency
 */
export interface DependencyVulnerability {
  id: string;
  advisoryId: string;
  packageName: string;
  packageVersion: string;
  ecosystem: PackageEcosystem;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  cve?: string;
  cwe?: string[];
  cvss?: {
    score: number;
    vector?: string;
  };
  affectedVersions: string;
  patchedVersions?: string;
  recommendation: string;
  references: string[];
  publishedAt?: Date;
  updatedAt?: Date;
}

/**
 * A dependency in the project
 */
export interface Dependency {
  name: string;
  version: string;
  ecosystem: PackageEcosystem;
  isDev: boolean;
  isTransitive: boolean;
  parent?: string;
  license?: string;
  repository?: string;
  homepage?: string;
}

/**
 * License compliance status
 */
export type LicenseStatus = "allowed" | "restricted" | "unknown" | "copyleft";

/**
 * License finding for a dependency
 */
export interface LicenseFinding {
  packageName: string;
  packageVersion: string;
  license: string;
  status: LicenseStatus;
  reason?: string;
}

/**
 * Configuration for the dependency scanner
 */
export interface DependencyScannerConfig {
  /** Minimum severity to report */
  minSeverity?: VulnerabilitySeverity;
  /** Check dev dependencies */
  checkDevDependencies?: boolean;
  /** Check transitive dependencies */
  checkTransitive?: boolean;
  /** Allowed licenses (allowlist) */
  allowedLicenses?: string[];
  /** Restricted licenses (blocklist) */
  restrictedLicenses?: string[];
  /** Packages to ignore */
  ignoredPackages?: string[];
  /** Fail on vulnerabilities */
  failOnVulnerabilities?: boolean;
  /** Fail on restricted licenses */
  failOnRestrictedLicenses?: boolean;
  /** CVSS score threshold for critical */
  cvssThreshold?: number;
}

/**
 * Result of a dependency scan
 */
export interface DependencyScanResult {
  dependencies: Dependency[];
  vulnerabilities: DependencyVulnerability[];
  licenseFindings: LicenseFinding[];
  scanDuration: number;
  timestamp: Date;
  summary: {
    totalDependencies: number;
    directDependencies: number;
    devDependencies: number;
    transitiveDependencies: number;
    vulnerabilities: {
      critical: number;
      high: number;
      moderate: number;
      low: number;
      info: number;
    };
    licenses: {
      allowed: number;
      restricted: number;
      unknown: number;
      copyleft: number;
    };
  };
  passed: boolean;
}

/**
 * Package.json structure (simplified)
 */
export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * Package lock structure (simplified)
 */
export interface PackageLock {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: Record<string, PackageLockEntry>;
  dependencies?: Record<string, PackageLockEntry>;
}

interface PackageLockEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  dev?: boolean;
  optional?: boolean;
  peer?: boolean;
  requires?: Record<string, string>;
  dependencies?: Record<string, PackageLockEntry>;
  license?: string;
}

// ============================================================================
// Known Vulnerability Database (Simplified)
// ============================================================================

/**
 * A mock vulnerability database entry
 * In production, this would be fetched from npm audit, Snyk, or OSV
 */
export interface VulnerabilityDbEntry {
  id: string;
  packageName: string;
  affectedVersions: string;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  cve?: string;
  cwe?: string[];
  cvss?: number;
  patchedVersions?: string;
  recommendation: string;
  references: string[];
}

/**
 * Sample vulnerability database for common packages
 * This would be replaced with real data from vulnerability APIs
 */
export const KNOWN_VULNERABILITIES: VulnerabilityDbEntry[] = [
  {
    id: "GHSA-1234",
    packageName: "lodash",
    affectedVersions: "<4.17.21",
    severity: "critical",
    title: "Prototype Pollution in lodash",
    description:
      "Versions of lodash prior to 4.17.21 are vulnerable to prototype pollution",
    cve: "CVE-2021-23337",
    cwe: ["CWE-1321"],
    cvss: 7.4,
    patchedVersions: ">=4.17.21",
    recommendation: "Upgrade lodash to version 4.17.21 or later",
    references: ["https://github.com/advisories/GHSA-1234"],
  },
  {
    id: "GHSA-5678",
    packageName: "axios",
    affectedVersions: "<0.21.2",
    severity: "high",
    title: "Server-Side Request Forgery in axios",
    description: "axios before 0.21.2 allows SSRF via the baseURL option",
    cve: "CVE-2021-3749",
    cwe: ["CWE-918"],
    cvss: 7.5,
    patchedVersions: ">=0.21.2",
    recommendation: "Upgrade axios to version 0.21.2 or later",
    references: ["https://github.com/advisories/GHSA-5678"],
  },
  {
    id: "GHSA-9012",
    packageName: "minimist",
    affectedVersions: "<1.2.6",
    severity: "high",
    title: "Prototype Pollution in minimist",
    description: "minimist before 1.2.6 is vulnerable to prototype pollution",
    cve: "CVE-2021-44906",
    cwe: ["CWE-1321"],
    cvss: 9.8,
    patchedVersions: ">=1.2.6",
    recommendation: "Upgrade minimist to version 1.2.6 or later",
    references: ["https://github.com/advisories/GHSA-9012"],
  },
];

// ============================================================================
// License Configuration
// ============================================================================

/**
 * Default allowed licenses (permissive)
 */
export const DEFAULT_ALLOWED_LICENSES = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "CC0-1.0",
  "CC-BY-3.0",
  "CC-BY-4.0",
  "0BSD",
  "Unlicense",
  "Python-2.0",
  "Zlib",
  "WTFPL",
  "BlueOak-1.0.0",
];

/**
 * Default restricted licenses (copyleft or problematic)
 */
export const DEFAULT_RESTRICTED_LICENSES = [
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-3.0",
  "GPL-3.0-only",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "LGPL-2.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "SSPL-1.0",
  "CC-BY-NC-4.0",
  "CC-BY-NC-SA-4.0",
];

/**
 * Copyleft licenses (require disclosure)
 */
export const COPYLEFT_LICENSES = [
  "GPL-2.0",
  "GPL-3.0",
  "AGPL-3.0",
  "LGPL-2.0",
  "LGPL-2.1",
  "LGPL-3.0",
];

// ============================================================================
// Severity Utilities
// ============================================================================

const SEVERITY_ORDER: Record<VulnerabilitySeverity, number> = {
  critical: 5,
  high: 4,
  moderate: 3,
  low: 2,
  info: 1,
};

function meetsMinSeverity(
  severity: VulnerabilitySeverity,
  minSeverity: VulnerabilitySeverity,
): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[minSeverity];
}

function cvssToSeverity(cvss: number): VulnerabilitySeverity {
  if (cvss >= 9.0) return "critical";
  if (cvss >= 7.0) return "high";
  if (cvss >= 4.0) return "moderate";
  if (cvss >= 0.1) return "low";
  return "info";
}

// ============================================================================
// Version Comparison Utilities
// ============================================================================

/**
 * Parse a semantic version string
 */
function parseVersion(
  version: string,
): { major: number; minor: number; patch: number; prerelease?: string } | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

/**
 * Compare two version strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (!va || !vb) return 0;

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;

  return 0;
}

/**
 * Check if a version satisfies a version constraint
 * Supports: <1.0.0, <=1.0.0, >1.0.0, >=1.0.0, =1.0.0
 */
function satisfiesConstraint(version: string, constraint: string): boolean {
  const trimmed = constraint.trim();

  if (trimmed.startsWith(">=")) {
    return compareVersions(version, trimmed.slice(2)) >= 0;
  }
  if (trimmed.startsWith(">")) {
    return compareVersions(version, trimmed.slice(1)) > 0;
  }
  if (trimmed.startsWith("<=")) {
    return compareVersions(version, trimmed.slice(2)) <= 0;
  }
  if (trimmed.startsWith("<")) {
    return compareVersions(version, trimmed.slice(1)) < 0;
  }
  if (trimmed.startsWith("=")) {
    return compareVersions(version, trimmed.slice(1)) === 0;
  }

  return false;
}

/**
 * Check if a version is affected by a vulnerability constraint
 */
function isVersionAffected(version: string, affectedVersions: string): boolean {
  const cleanVersion = version.replace(/^[\^~]/, "");
  return satisfiesConstraint(cleanVersion, affectedVersions);
}

// ============================================================================
// Dependency Scanner Implementation
// ============================================================================

/**
 * Dependency Scanner class
 */
export class DependencyScanner {
  private config: DependencyScannerConfig;
  private vulnerabilityDb: VulnerabilityDbEntry[];

  constructor(config: DependencyScannerConfig = {}) {
    this.config = {
      minSeverity: config.minSeverity ?? "low",
      checkDevDependencies: config.checkDevDependencies ?? true,
      checkTransitive: config.checkTransitive ?? true,
      allowedLicenses: config.allowedLicenses ?? DEFAULT_ALLOWED_LICENSES,
      restrictedLicenses:
        config.restrictedLicenses ?? DEFAULT_RESTRICTED_LICENSES,
      ignoredPackages: config.ignoredPackages ?? [],
      failOnVulnerabilities: config.failOnVulnerabilities ?? true,
      failOnRestrictedLicenses: config.failOnRestrictedLicenses ?? false,
      cvssThreshold: config.cvssThreshold ?? 9.0,
    };
    this.vulnerabilityDb = [...KNOWN_VULNERABILITIES];
  }

  /**
   * Parse dependencies from package.json
   */
  parseDependencies(packageJson: PackageJson): Dependency[] {
    const dependencies: Dependency[] = [];

    // Production dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependencies.push({
          name,
          version: version.replace(/^[\^~]/, ""),
          ecosystem: "npm",
          isDev: false,
          isTransitive: false,
        });
      }
    }

    // Dev dependencies
    if (this.config.checkDevDependencies && packageJson.devDependencies) {
      for (const [name, version] of Object.entries(
        packageJson.devDependencies,
      )) {
        dependencies.push({
          name,
          version: version.replace(/^[\^~]/, ""),
          ecosystem: "npm",
          isDev: true,
          isTransitive: false,
        });
      }
    }

    return dependencies;
  }

  /**
   * Parse dependencies from package-lock.json for transitive deps
   */
  parsePackageLock(lockfile: PackageLock): Dependency[] {
    const dependencies: Dependency[] = [];

    const processEntry = (
      name: string,
      entry: PackageLockEntry,
      isTransitive: boolean,
      parent?: string,
    ) => {
      if (!entry.version) return;

      const dep: Dependency = {
        name: name.replace(/^node_modules\//, ""),
        version: entry.version,
        ecosystem: "npm",
        isDev: entry.dev ?? false,
        isTransitive,
        parent,
        license: entry.license,
      };

      // Skip if dev dependencies are disabled
      if (dep.isDev && !this.config.checkDevDependencies) return;

      // Skip if transitive dependencies are disabled
      if (dep.isTransitive && !this.config.checkTransitive) return;

      // Skip ignored packages
      if (this.config.ignoredPackages?.includes(dep.name)) return;

      dependencies.push(dep);
    };

    // Process packages (npm v7+ lockfile format)
    if (lockfile.packages) {
      for (const [path, entry] of Object.entries(lockfile.packages)) {
        if (path === "") continue; // Skip root
        const name = path.replace(/^node_modules\//, "");
        const isTransitive = path.includes("node_modules/node_modules");
        processEntry(name, entry, isTransitive);
      }
    }

    // Process dependencies (npm v6 lockfile format)
    if (lockfile.dependencies) {
      const processNested = (
        deps: Record<string, PackageLockEntry>,
        parent?: string,
      ) => {
        for (const [name, entry] of Object.entries(deps)) {
          processEntry(name, entry, !!parent, parent);

          if (entry.dependencies) {
            processNested(entry.dependencies, name);
          }
        }
      };

      processNested(lockfile.dependencies);
    }

    return dependencies;
  }

  /**
   * Check a dependency for vulnerabilities
   */
  checkVulnerabilities(dependency: Dependency): DependencyVulnerability[] {
    const vulnerabilities: DependencyVulnerability[] = [];

    for (const vuln of this.vulnerabilityDb) {
      if (vuln.packageName !== dependency.name) continue;

      if (isVersionAffected(dependency.version, vuln.affectedVersions)) {
        if (
          !meetsMinSeverity(vuln.severity, this.config.minSeverity ?? "low")
        ) {
          continue;
        }

        vulnerabilities.push({
          id: `${vuln.id}-${dependency.name}-${dependency.version}`,
          advisoryId: vuln.id,
          packageName: dependency.name,
          packageVersion: dependency.version,
          ecosystem: dependency.ecosystem,
          severity: vuln.severity,
          title: vuln.title,
          description: vuln.description,
          cve: vuln.cve,
          cwe: vuln.cwe,
          cvss: vuln.cvss ? { score: vuln.cvss } : undefined,
          affectedVersions: vuln.affectedVersions,
          patchedVersions: vuln.patchedVersions,
          recommendation: vuln.recommendation,
          references: vuln.references,
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check a dependency's license
   */
  checkLicense(dependency: Dependency): LicenseFinding | null {
    if (!dependency.license) {
      return {
        packageName: dependency.name,
        packageVersion: dependency.version,
        license: "UNKNOWN",
        status: "unknown",
        reason: "License not specified in package metadata",
      };
    }

    const license = dependency.license.toUpperCase();
    const allowedLicenses =
      this.config.allowedLicenses?.map((l) => l.toUpperCase()) ?? [];
    const restrictedLicenses =
      this.config.restrictedLicenses?.map((l) => l.toUpperCase()) ?? [];
    const copyleftLicenses = COPYLEFT_LICENSES.map((l) => l.toUpperCase());

    let status: LicenseStatus = "unknown";
    let reason: string | undefined;

    if (restrictedLicenses.includes(license)) {
      status = "restricted";
      reason = "License is on the restricted list";
    } else if (copyleftLicenses.includes(license)) {
      status = "copyleft";
      reason = "Copyleft license may require source code disclosure";
    } else if (allowedLicenses.includes(license)) {
      status = "allowed";
    } else {
      status = "unknown";
      reason = "License not recognized";
    }

    return {
      packageName: dependency.name,
      packageVersion: dependency.version,
      license: dependency.license,
      status,
      reason,
    };
  }

  /**
   * Scan dependencies for vulnerabilities and license issues
   */
  scan(dependencies: Dependency[]): DependencyScanResult {
    const startTime = Date.now();
    const allVulnerabilities: DependencyVulnerability[] = [];
    const allLicenseFindings: LicenseFinding[] = [];

    for (const dep of dependencies) {
      // Check vulnerabilities
      const vulns = this.checkVulnerabilities(dep);
      allVulnerabilities.push(...vulns);

      // Check license
      const licenseFinding = this.checkLicense(dep);
      if (licenseFinding) {
        allLicenseFindings.push(licenseFinding);
      }
    }

    const scanDuration = Date.now() - startTime;

    // Calculate summary
    const summary = {
      totalDependencies: dependencies.length,
      directDependencies: dependencies.filter((d) => !d.isTransitive).length,
      devDependencies: dependencies.filter((d) => d.isDev).length,
      transitiveDependencies: dependencies.filter((d) => d.isTransitive).length,
      vulnerabilities: {
        critical: allVulnerabilities.filter((v) => v.severity === "critical")
          .length,
        high: allVulnerabilities.filter((v) => v.severity === "high").length,
        moderate: allVulnerabilities.filter((v) => v.severity === "moderate")
          .length,
        low: allVulnerabilities.filter((v) => v.severity === "low").length,
        info: allVulnerabilities.filter((v) => v.severity === "info").length,
      },
      licenses: {
        allowed: allLicenseFindings.filter((l) => l.status === "allowed")
          .length,
        restricted: allLicenseFindings.filter((l) => l.status === "restricted")
          .length,
        unknown: allLicenseFindings.filter((l) => l.status === "unknown")
          .length,
        copyleft: allLicenseFindings.filter((l) => l.status === "copyleft")
          .length,
      },
    };

    // Determine if scan passed
    let passed = true;

    if (this.config.failOnVulnerabilities) {
      if (
        summary.vulnerabilities.critical > 0 ||
        summary.vulnerabilities.high > 0
      ) {
        passed = false;
      }
    }

    if (this.config.failOnRestrictedLicenses) {
      if (summary.licenses.restricted > 0) {
        passed = false;
      }
    }

    return {
      dependencies,
      vulnerabilities: allVulnerabilities,
      licenseFindings: allLicenseFindings,
      scanDuration,
      timestamp: new Date(),
      summary,
      passed,
    };
  }

  /**
   * Scan from package.json content
   */
  scanFromPackageJson(
    packageJsonContent: string,
    lockfileContent?: string,
  ): DependencyScanResult {
    const packageJson: PackageJson = JSON.parse(packageJsonContent);
    let dependencies = this.parseDependencies(packageJson);

    // If lockfile is provided, use it for transitive deps
    if (lockfileContent) {
      const lockfile: PackageLock = JSON.parse(lockfileContent);
      const lockDeps = this.parsePackageLock(lockfile);

      // Merge dependencies, preferring lockfile versions
      const depMap = new Map<string, Dependency>();
      for (const dep of dependencies) {
        depMap.set(dep.name, dep);
      }
      for (const dep of lockDeps) {
        if (!depMap.has(dep.name)) {
          depMap.set(dep.name, dep);
        } else {
          // Update with lockfile info
          const existing = depMap.get(dep.name)!;
          existing.version = dep.version;
          existing.license = dep.license;
          existing.isTransitive = dep.isTransitive;
        }
      }
      dependencies = Array.from(depMap.values());
    }

    return this.scan(dependencies);
  }

  /**
   * Add a vulnerability to the database
   */
  addVulnerability(vuln: VulnerabilityDbEntry): void {
    this.vulnerabilityDb.push(vuln);
  }

  /**
   * Clear the vulnerability database
   */
  clearVulnerabilityDb(): void {
    this.vulnerabilityDb = [];
  }

  /**
   * Update configuration
   */
  configure(config: Partial<DependencyScannerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DependencyScannerConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new dependency scanner with default configuration
 */
export function createDependencyScanner(
  config?: DependencyScannerConfig,
): DependencyScanner {
  return new DependencyScanner(config);
}

/**
 * Create a dependency scanner for CI/CD pipelines
 */
export function createCIDependencyScanner(): DependencyScanner {
  return new DependencyScanner({
    minSeverity: "moderate",
    checkDevDependencies: false,
    checkTransitive: true,
    failOnVulnerabilities: true,
    failOnRestrictedLicenses: true,
  });
}

/**
 * Create a strict dependency scanner for production
 */
export function createStrictDependencyScanner(): DependencyScanner {
  return new DependencyScanner({
    minSeverity: "low",
    checkDevDependencies: true,
    checkTransitive: true,
    failOnVulnerabilities: true,
    failOnRestrictedLicenses: true,
    cvssThreshold: 7.0,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a vulnerability for display
 */
export function formatVulnerability(vuln: DependencyVulnerability): string {
  const parts = [
    `[${vuln.severity.toUpperCase()}] ${vuln.title}`,
    `  Package: ${vuln.packageName}@${vuln.packageVersion}`,
    `  Advisory: ${vuln.advisoryId}`,
  ];

  if (vuln.cve) {
    parts.push(`  CVE: ${vuln.cve}`);
  }

  if (vuln.cvss) {
    parts.push(`  CVSS: ${vuln.cvss.score}`);
  }

  parts.push(`  Affected: ${vuln.affectedVersions}`);

  if (vuln.patchedVersions) {
    parts.push(`  Patched: ${vuln.patchedVersions}`);
  }

  parts.push(`  Recommendation: ${vuln.recommendation}`);

  return parts.join("\n");
}

/**
 * Format a license finding for display
 */
export function formatLicenseFinding(finding: LicenseFinding): string {
  const statusIcon = {
    allowed: "OK",
    restricted: "BLOCKED",
    unknown: "WARN",
    copyleft: "CAUTION",
  }[finding.status];

  let line = `[${statusIcon}] ${finding.packageName}@${finding.packageVersion}: ${finding.license}`;

  if (finding.reason) {
    line += ` (${finding.reason})`;
  }

  return line;
}

/**
 * Format scan result as a report
 */
export function formatDependencyScanReport(
  result: DependencyScanResult,
): string {
  const lines = [
    "# Dependency Scan Report",
    "",
    "## Summary",
    `- Total Dependencies: ${result.summary.totalDependencies}`,
    `- Direct Dependencies: ${result.summary.directDependencies}`,
    `- Dev Dependencies: ${result.summary.devDependencies}`,
    `- Transitive Dependencies: ${result.summary.transitiveDependencies}`,
    `- Scan Duration: ${result.scanDuration}ms`,
    `- Status: ${result.passed ? "PASSED" : "FAILED"}`,
    "",
    "## Vulnerabilities",
    `- Critical: ${result.summary.vulnerabilities.critical}`,
    `- High: ${result.summary.vulnerabilities.high}`,
    `- Moderate: ${result.summary.vulnerabilities.moderate}`,
    `- Low: ${result.summary.vulnerabilities.low}`,
    "",
    "## Licenses",
    `- Allowed: ${result.summary.licenses.allowed}`,
    `- Restricted: ${result.summary.licenses.restricted}`,
    `- Unknown: ${result.summary.licenses.unknown}`,
    `- Copyleft: ${result.summary.licenses.copyleft}`,
  ];

  if (result.vulnerabilities.length > 0) {
    lines.push("", "## Vulnerability Details", "");
    for (const vuln of result.vulnerabilities) {
      lines.push(formatVulnerability(vuln), "");
    }
  }

  if (result.licenseFindings.filter((f) => f.status !== "allowed").length > 0) {
    lines.push("", "## License Issues", "");
    for (const finding of result.licenseFindings.filter(
      (f) => f.status !== "allowed",
    )) {
      lines.push(formatLicenseFinding(finding));
    }
  }

  return lines.join("\n");
}

/**
 * Group vulnerabilities by severity
 */
export function groupVulnerabilitiesBySeverity(
  vulnerabilities: DependencyVulnerability[],
): Map<VulnerabilitySeverity, DependencyVulnerability[]> {
  const groups = new Map<VulnerabilitySeverity, DependencyVulnerability[]>();

  for (const vuln of vulnerabilities) {
    if (!groups.has(vuln.severity)) {
      groups.set(vuln.severity, []);
    }
    groups.get(vuln.severity)!.push(vuln);
  }

  return groups;
}

/**
 * Group vulnerabilities by package
 */
export function groupVulnerabilitiesByPackage(
  vulnerabilities: DependencyVulnerability[],
): Map<string, DependencyVulnerability[]> {
  const groups = new Map<string, DependencyVulnerability[]>();

  for (const vuln of vulnerabilities) {
    const key = `${vuln.packageName}@${vuln.packageVersion}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(vuln);
  }

  return groups;
}

/**
 * Check if scan result should block deployment
 */
export function shouldBlockDeployment(result: DependencyScanResult): boolean {
  return (
    result.summary.vulnerabilities.critical > 0 ||
    result.summary.vulnerabilities.high > 0 ||
    result.summary.licenses.restricted > 0
  );
}

/**
 * Get severity color for terminal output
 */
export function getSeverityColor(severity: VulnerabilitySeverity): string {
  switch (severity) {
    case "critical":
      return "\x1b[31m"; // Red
    case "high":
      return "\x1b[33m"; // Yellow
    case "moderate":
      return "\x1b[36m"; // Cyan
    case "low":
      return "\x1b[32m"; // Green
    case "info":
      return "\x1b[37m"; // White
    default:
      return "\x1b[0m"; // Reset
  }
}

/**
 * Get license status color for terminal output
 */
export function getLicenseStatusColor(status: LicenseStatus): string {
  switch (status) {
    case "allowed":
      return "\x1b[32m"; // Green
    case "restricted":
      return "\x1b[31m"; // Red
    case "copyleft":
      return "\x1b[33m"; // Yellow
    case "unknown":
      return "\x1b[36m"; // Cyan
    default:
      return "\x1b[0m"; // Reset
  }
}
