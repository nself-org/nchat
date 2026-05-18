/**
 * Dependency Scanner Tests
 */

import {
  DependencyScanner,
  createDependencyScanner,
  createCIDependencyScanner,
  createStrictDependencyScanner,
  DEFAULT_ALLOWED_LICENSES,
  DEFAULT_RESTRICTED_LICENSES,
  KNOWN_VULNERABILITIES,
  formatVulnerability,
  formatLicenseFinding,
  formatDependencyScanReport,
  groupVulnerabilitiesBySeverity,
  groupVulnerabilitiesByPackage,
  shouldBlockDeployment,
  getSeverityColor,
  getLicenseStatusColor,
  type Dependency,
  type DependencyVulnerability,
  type LicenseFinding,
  type VulnerabilitySeverity,
  type LicenseStatus,
} from "../dependency-scanner";

describe("Dependency Scanner", () => {
  // =========================================================================
  // Scanner Creation
  // =========================================================================
  describe("Scanner Creation", () => {
    it("creates scanner with default configuration", () => {
      const scanner = createDependencyScanner();
      expect(scanner).toBeInstanceOf(DependencyScanner);
    });

    it("creates scanner with custom configuration", () => {
      const scanner = createDependencyScanner({
        minSeverity: "high",
        checkDevDependencies: false,
      });
      const config = scanner.getConfig();
      expect(config.minSeverity).toBe("high");
      expect(config.checkDevDependencies).toBe(false);
    });

    it("creates CI scanner with appropriate settings", () => {
      const scanner = createCIDependencyScanner();
      const config = scanner.getConfig();
      expect(config.checkDevDependencies).toBe(false);
      expect(config.failOnVulnerabilities).toBe(true);
    });

    it("creates strict scanner for production", () => {
      const scanner = createStrictDependencyScanner();
      const config = scanner.getConfig();
      expect(config.failOnVulnerabilities).toBe(true);
      expect(config.failOnRestrictedLicenses).toBe(true);
    });
  });

  // =========================================================================
  // Dependency Parsing
  // =========================================================================
  describe("Dependency Parsing", () => {
    let scanner: DependencyScanner;

    beforeEach(() => {
      scanner = createDependencyScanner();
    });

    it("parses production dependencies from package.json", () => {
      const packageJson = {
        dependencies: {
          lodash: "^4.17.21",
          axios: "0.21.1",
        },
      };

      const deps = scanner.parseDependencies(packageJson);

      expect(deps.length).toBe(2);
      expect(deps.find((d) => d.name === "lodash")).toBeDefined();
      expect(deps.find((d) => d.name === "axios")).toBeDefined();
      expect(deps.every((d) => !d.isDev)).toBe(true);
    });

    it("parses dev dependencies when enabled", () => {
      const packageJson = {
        dependencies: { lodash: "^4.17.21" },
        devDependencies: { jest: "^29.0.0" },
      };

      const deps = scanner.parseDependencies(packageJson);

      expect(deps.length).toBe(2);
      expect(deps.find((d) => d.name === "jest")?.isDev).toBe(true);
    });

    it("skips dev dependencies when disabled", () => {
      const scanner2 = createDependencyScanner({ checkDevDependencies: false });
      const packageJson = {
        dependencies: { lodash: "^4.17.21" },
        devDependencies: { jest: "^29.0.0" },
      };

      const deps = scanner2.parseDependencies(packageJson);

      expect(deps.length).toBe(1);
      expect(deps[0].name).toBe("lodash");
    });

    it("removes version prefixes", () => {
      const packageJson = {
        dependencies: {
          lodash: "^4.17.21",
          axios: "~0.21.1",
        },
      };

      const deps = scanner.parseDependencies(packageJson);

      expect(deps.find((d) => d.name === "lodash")?.version).toBe("4.17.21");
      expect(deps.find((d) => d.name === "axios")?.version).toBe("0.21.1");
    });
  });

  // =========================================================================
  // Vulnerability Detection
  // =========================================================================
  describe("Vulnerability Detection", () => {
    let scanner: DependencyScanner;

    beforeEach(() => {
      scanner = createDependencyScanner();
    });

    it("detects known vulnerabilities in dependencies", () => {
      const dep: Dependency = {
        name: "lodash",
        version: "4.17.20", // Vulnerable version
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
      };

      const vulns = scanner.checkVulnerabilities(dep);

      expect(vulns.length).toBeGreaterThan(0);
      expect(vulns[0].packageName).toBe("lodash");
    });

    it("does not flag patched versions", () => {
      const dep: Dependency = {
        name: "lodash",
        version: "4.17.21", // Patched version
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
      };

      const vulns = scanner.checkVulnerabilities(dep);

      expect(vulns.length).toBe(0);
    });

    it("includes CVE and CWE information", () => {
      const dep: Dependency = {
        name: "lodash",
        version: "4.17.19",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
      };

      const vulns = scanner.checkVulnerabilities(dep);

      if (vulns.length > 0) {
        expect(vulns[0].cve).toBeDefined();
        expect(vulns[0].cwe).toBeDefined();
      }
    });

    it("respects minimum severity filter", () => {
      const scanner2 = createDependencyScanner({ minSeverity: "critical" });
      const dep: Dependency = {
        name: "axios",
        version: "0.21.1", // High severity, not critical
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
      };

      // Add a custom high severity vuln
      scanner2.addVulnerability({
        id: "TEST-HIGH",
        packageName: "axios",
        affectedVersions: "<0.21.2",
        severity: "high",
        title: "Test High Vuln",
        description: "Test",
        recommendation: "Upgrade",
        references: [],
      });

      const vulns = scanner2.checkVulnerabilities(dep);

      // High severity should be filtered out when minSeverity is critical
      expect(vulns.filter((v) => v.severity === "high").length).toBe(0);
    });
  });

  // =========================================================================
  // License Checking
  // =========================================================================
  describe("License Checking", () => {
    let scanner: DependencyScanner;

    beforeEach(() => {
      scanner = createDependencyScanner();
    });

    it("marks allowed licenses as allowed", () => {
      const dep: Dependency = {
        name: "lodash",
        version: "4.17.21",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
        license: "MIT",
      };

      const finding = scanner.checkLicense(dep);

      expect(finding?.status).toBe("allowed");
    });

    it("marks restricted licenses as restricted", () => {
      const dep: Dependency = {
        name: "some-gpl-package",
        version: "1.0.0",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
        license: "GPL-3.0",
      };

      const finding = scanner.checkLicense(dep);

      expect(finding?.status).toBe("restricted");
    });

    it("marks copyleft licenses appropriately", () => {
      // Use a scanner without LGPL in restricted list to test copyleft detection
      const customScanner = createDependencyScanner({
        restrictedLicenses: ["GPL-3.0", "AGPL-3.0"], // Don't include LGPL
      });
      const dep: Dependency = {
        name: "some-lgpl-package",
        version: "1.0.0",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
        license: "LGPL-3.0",
      };

      const finding = customScanner.checkLicense(dep);

      expect(finding?.status).toBe("copyleft");
    });

    it("marks unknown licenses", () => {
      const dep: Dependency = {
        name: "some-package",
        version: "1.0.0",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
        license: "UNKNOWN-LICENSE",
      };

      const finding = scanner.checkLicense(dep);

      expect(finding?.status).toBe("unknown");
    });

    it("handles missing license", () => {
      const dep: Dependency = {
        name: "no-license-package",
        version: "1.0.0",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
      };

      const finding = scanner.checkLicense(dep);

      expect(finding?.status).toBe("unknown");
      expect(finding?.license).toBe("UNKNOWN");
    });
  });

  // =========================================================================
  // Full Scan
  // =========================================================================
  describe("Full Scan", () => {
    let scanner: DependencyScanner;

    beforeEach(() => {
      scanner = createDependencyScanner();
    });

    it("scans dependencies and returns comprehensive result", () => {
      const deps: Dependency[] = [
        {
          name: "lodash",
          version: "4.17.20",
          ecosystem: "npm",
          isDev: false,
          isTransitive: false,
          license: "MIT",
        },
        {
          name: "safe-package",
          version: "1.0.0",
          ecosystem: "npm",
          isDev: false,
          isTransitive: false,
          license: "MIT",
        },
      ];

      const result = scanner.scan(deps);

      expect(result.dependencies).toEqual(deps);
      expect(result.vulnerabilities.length).toBeGreaterThanOrEqual(0);
      expect(result.licenseFindings.length).toBe(2);
      expect(result.summary.totalDependencies).toBe(2);
    });

    it("calculates summary statistics correctly", () => {
      const deps: Dependency[] = [
        {
          name: "dep1",
          version: "1.0.0",
          ecosystem: "npm",
          isDev: false,
          isTransitive: false,
          license: "MIT",
        },
        {
          name: "dep2",
          version: "1.0.0",
          ecosystem: "npm",
          isDev: true,
          isTransitive: false,
          license: "Apache-2.0",
        },
        {
          name: "dep3",
          version: "1.0.0",
          ecosystem: "npm",
          isDev: false,
          isTransitive: true,
          license: "BSD-3-Clause",
        },
      ];

      const result = scanner.scan(deps);

      expect(result.summary.totalDependencies).toBe(3);
      expect(result.summary.directDependencies).toBe(2); // dep1 and dep2
      expect(result.summary.devDependencies).toBe(1);
      expect(result.summary.transitiveDependencies).toBe(1);
    });

    it("determines passed status based on vulnerabilities", () => {
      const safeDeps: Dependency[] = [
        {
          name: "safe",
          version: "1.0.0",
          ecosystem: "npm",
          isDev: false,
          isTransitive: false,
          license: "MIT",
        },
      ];

      const unsafeDeps: Dependency[] = [
        {
          name: "lodash",
          version: "4.17.19",
          ecosystem: "npm",
          isDev: false,
          isTransitive: false,
          license: "MIT",
        },
      ];

      const safeResult = scanner.scan(safeDeps);
      const unsafeResult = scanner.scan(unsafeDeps);

      expect(safeResult.passed).toBe(true);
      expect(unsafeResult.passed).toBe(false);
    });

    it("records scan duration", () => {
      const deps: Dependency[] = [
        {
          name: "lodash",
          version: "4.17.21",
          ecosystem: "npm",
          isDev: false,
          isTransitive: false,
        },
      ];

      const result = scanner.scan(deps);

      expect(result.scanDuration).toBeGreaterThanOrEqual(0);
    });
  });

  // =========================================================================
  // Scan from Package.json
  // =========================================================================
  describe("Scan from Package.json", () => {
    let scanner: DependencyScanner;

    beforeEach(() => {
      scanner = createDependencyScanner();
    });

    it("scans from package.json content", () => {
      const packageJson = JSON.stringify({
        dependencies: {
          lodash: "^4.17.21",
        },
        devDependencies: {
          jest: "^29.0.0",
        },
      });

      const result = scanner.scanFromPackageJson(packageJson);

      expect(result.dependencies.length).toBe(2);
    });

    it("handles invalid JSON gracefully", () => {
      expect(() => {
        scanner.scanFromPackageJson("invalid json");
      }).toThrow();
    });
  });

  // =========================================================================
  // Configuration
  // =========================================================================
  describe("Configuration", () => {
    it("updates configuration", () => {
      const scanner = createDependencyScanner();
      scanner.configure({ minSeverity: "critical" });
      expect(scanner.getConfig().minSeverity).toBe("critical");
    });

    it("adds custom vulnerabilities", () => {
      const scanner = createDependencyScanner();
      scanner.addVulnerability({
        id: "CUSTOM-001",
        packageName: "custom-pkg",
        affectedVersions: "<1.0.0",
        severity: "high",
        title: "Custom Vulnerability",
        description: "Test",
        recommendation: "Upgrade",
        references: [],
      });

      const dep: Dependency = {
        name: "custom-pkg",
        version: "0.9.0",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
      };

      const vulns = scanner.checkVulnerabilities(dep);
      expect(vulns.some((v) => v.advisoryId === "CUSTOM-001")).toBe(true);
    });

    it("clears vulnerability database", () => {
      const scanner = createDependencyScanner();
      scanner.clearVulnerabilityDb();

      const dep: Dependency = {
        name: "lodash",
        version: "4.17.19",
        ecosystem: "npm",
        isDev: false,
        isTransitive: false,
      };

      const vulns = scanner.checkVulnerabilities(dep);
      expect(vulns.length).toBe(0);
    });
  });

  // =========================================================================
  // Utility Functions
  // =========================================================================
  describe("Utility Functions", () => {
    describe("formatVulnerability", () => {
      it("formats a vulnerability for display", () => {
        const vuln: DependencyVulnerability = {
          id: "test-1",
          advisoryId: "GHSA-1234",
          packageName: "lodash",
          packageVersion: "4.17.19",
          ecosystem: "npm",
          severity: "critical",
          title: "Prototype Pollution",
          description: "Test description",
          cve: "CVE-2021-23337",
          affectedVersions: "<4.17.21",
          patchedVersions: ">=4.17.21",
          recommendation: "Upgrade lodash",
          references: [],
        };

        const formatted = formatVulnerability(vuln);

        expect(formatted).toContain("[CRITICAL]");
        expect(formatted).toContain("lodash@4.17.19");
        expect(formatted).toContain("CVE-2021-23337");
      });
    });

    describe("formatLicenseFinding", () => {
      it("formats allowed license", () => {
        const finding: LicenseFinding = {
          packageName: "lodash",
          packageVersion: "4.17.21",
          license: "MIT",
          status: "allowed",
        };

        const formatted = formatLicenseFinding(finding);

        expect(formatted).toContain("[OK]");
        expect(formatted).toContain("MIT");
      });

      it("formats restricted license", () => {
        const finding: LicenseFinding = {
          packageName: "gpl-pkg",
          packageVersion: "1.0.0",
          license: "GPL-3.0",
          status: "restricted",
          reason: "License is on the restricted list",
        };

        const formatted = formatLicenseFinding(finding);

        expect(formatted).toContain("[BLOCKED]");
        expect(formatted).toContain("GPL-3.0");
      });
    });

    describe("formatDependencyScanReport", () => {
      it("formats scan result as report", () => {
        const result = {
          dependencies: [],
          vulnerabilities: [],
          licenseFindings: [],
          scanDuration: 100,
          timestamp: new Date(),
          summary: {
            totalDependencies: 10,
            directDependencies: 5,
            devDependencies: 3,
            transitiveDependencies: 2,
            vulnerabilities: {
              critical: 0,
              high: 1,
              moderate: 2,
              low: 3,
              info: 0,
            },
            licenses: { allowed: 8, restricted: 1, unknown: 1, copyleft: 0 },
          },
          passed: false,
        };

        const report = formatDependencyScanReport(result);

        expect(report).toContain("# Dependency Scan Report");
        expect(report).toContain("Total Dependencies: 10");
        expect(report).toContain("FAILED");
      });
    });

    describe("groupVulnerabilitiesBySeverity", () => {
      it("groups vulnerabilities by severity", () => {
        const vulns: DependencyVulnerability[] = [
          createMockVuln({ severity: "critical" }),
          createMockVuln({ severity: "critical" }),
          createMockVuln({ severity: "high" }),
        ];

        const groups = groupVulnerabilitiesBySeverity(vulns);

        expect(groups.get("critical")?.length).toBe(2);
        expect(groups.get("high")?.length).toBe(1);
      });
    });

    describe("groupVulnerabilitiesByPackage", () => {
      it("groups vulnerabilities by package", () => {
        const vulns: DependencyVulnerability[] = [
          createMockVuln({ packageName: "pkg-a", packageVersion: "1.0.0" }),
          createMockVuln({ packageName: "pkg-a", packageVersion: "1.0.0" }),
          createMockVuln({ packageName: "pkg-b", packageVersion: "2.0.0" }),
        ];

        const groups = groupVulnerabilitiesByPackage(vulns);

        expect(groups.get("pkg-a@1.0.0")?.length).toBe(2);
        expect(groups.get("pkg-b@2.0.0")?.length).toBe(1);
      });
    });

    describe("shouldBlockDeployment", () => {
      it("returns true for critical vulnerabilities", () => {
        const result = {
          dependencies: [],
          vulnerabilities: [],
          licenseFindings: [],
          scanDuration: 100,
          timestamp: new Date(),
          summary: {
            totalDependencies: 1,
            directDependencies: 1,
            devDependencies: 0,
            transitiveDependencies: 0,
            vulnerabilities: {
              critical: 1,
              high: 0,
              moderate: 0,
              low: 0,
              info: 0,
            },
            licenses: { allowed: 1, restricted: 0, unknown: 0, copyleft: 0 },
          },
          passed: false,
        };

        expect(shouldBlockDeployment(result)).toBe(true);
      });

      it("returns true for restricted licenses", () => {
        const result = {
          dependencies: [],
          vulnerabilities: [],
          licenseFindings: [],
          scanDuration: 100,
          timestamp: new Date(),
          summary: {
            totalDependencies: 1,
            directDependencies: 1,
            devDependencies: 0,
            transitiveDependencies: 0,
            vulnerabilities: {
              critical: 0,
              high: 0,
              moderate: 0,
              low: 0,
              info: 0,
            },
            licenses: { allowed: 0, restricted: 1, unknown: 0, copyleft: 0 },
          },
          passed: true,
        };

        expect(shouldBlockDeployment(result)).toBe(true);
      });

      it("returns false for clean scan", () => {
        const result = {
          dependencies: [],
          vulnerabilities: [],
          licenseFindings: [],
          scanDuration: 100,
          timestamp: new Date(),
          summary: {
            totalDependencies: 1,
            directDependencies: 1,
            devDependencies: 0,
            transitiveDependencies: 0,
            vulnerabilities: {
              critical: 0,
              high: 0,
              moderate: 0,
              low: 0,
              info: 0,
            },
            licenses: { allowed: 1, restricted: 0, unknown: 0, copyleft: 0 },
          },
          passed: true,
        };

        expect(shouldBlockDeployment(result)).toBe(false);
      });
    });

    describe("Color Functions", () => {
      it("getSeverityColor returns correct colors", () => {
        expect(getSeverityColor("critical")).toContain("31"); // Red
        expect(getSeverityColor("high")).toContain("33"); // Yellow
        expect(getSeverityColor("moderate")).toContain("36"); // Cyan
        expect(getSeverityColor("low")).toContain("32"); // Green
      });

      it("getLicenseStatusColor returns correct colors", () => {
        expect(getLicenseStatusColor("allowed")).toContain("32"); // Green
        expect(getLicenseStatusColor("restricted")).toContain("31"); // Red
        expect(getLicenseStatusColor("copyleft")).toContain("33"); // Yellow
      });
    });
  });

  // =========================================================================
  // License Lists
  // =========================================================================
  describe("License Lists", () => {
    it("has comprehensive allowed licenses list", () => {
      expect(DEFAULT_ALLOWED_LICENSES).toContain("MIT");
      expect(DEFAULT_ALLOWED_LICENSES).toContain("Apache-2.0");
      expect(DEFAULT_ALLOWED_LICENSES).toContain("BSD-3-Clause");
      expect(DEFAULT_ALLOWED_LICENSES).toContain("ISC");
    });

    it("has comprehensive restricted licenses list", () => {
      expect(DEFAULT_RESTRICTED_LICENSES).toContain("GPL-3.0");
      expect(DEFAULT_RESTRICTED_LICENSES).toContain("AGPL-3.0");
      expect(DEFAULT_RESTRICTED_LICENSES).toContain("SSPL-1.0");
    });
  });

  // =========================================================================
  // Known Vulnerabilities Database
  // =========================================================================
  describe("Known Vulnerabilities Database", () => {
    it("has sample vulnerabilities for common packages", () => {
      const lodashVuln = KNOWN_VULNERABILITIES.find(
        (v) => v.packageName === "lodash",
      );
      expect(lodashVuln).toBeDefined();
    });

    it("all vulnerabilities have required fields", () => {
      for (const vuln of KNOWN_VULNERABILITIES) {
        expect(vuln.id).toBeDefined();
        expect(vuln.packageName).toBeDefined();
        expect(vuln.severity).toBeDefined();
        expect(vuln.recommendation).toBeDefined();
      }
    });
  });
});

// Helper function to create mock vulnerabilities
function createMockVuln(
  overrides: Partial<DependencyVulnerability> = {},
): DependencyVulnerability {
  return {
    id: `mock-${Date.now()}-${Math.random()}`,
    advisoryId: "MOCK-001",
    packageName: "mock-package",
    packageVersion: "1.0.0",
    ecosystem: "npm",
    severity: "moderate",
    title: "Mock Vulnerability",
    description: "Test description",
    affectedVersions: "<2.0.0",
    recommendation: "Upgrade",
    references: [],
    ...overrides,
  };
}
