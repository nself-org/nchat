/**
 * Static Application Security Testing (SAST) Scanner
 *
 * Provides static code analysis to detect security vulnerabilities,
 * insecure coding patterns, and potential attack vectors.
 *
 * @module lib/security/sast-scanner
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Severity levels for security findings
 */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/**
 * Categories of security vulnerabilities
 */
export type VulnerabilityCategory =
  | "injection"
  | "xss"
  | "authentication"
  | "authorization"
  | "cryptography"
  | "configuration"
  | "data_exposure"
  | "insecure_design"
  | "security_misconfiguration"
  | "vulnerable_component";

/**
 * A security rule for static analysis
 */
export interface SASTRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  category: VulnerabilityCategory;
  pattern: RegExp;
  filePatterns?: RegExp[];
  excludePatterns?: RegExp[];
  cwe?: string;
  owasp?: string;
  remediation: string;
}

/**
 * A finding from the SAST scan
 */
export interface SASTFinding {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  category: VulnerabilityCategory;
  file: string;
  line: number;
  column?: number;
  snippet: string;
  description: string;
  cwe?: string;
  owasp?: string;
  remediation: string;
  timestamp: Date;
  hash: string;
}

/**
 * Configuration for the SAST scanner
 */
export interface SASTScannerConfig {
  /** Rules to use for scanning */
  rules?: SASTRule[];
  /** File patterns to include */
  includePatterns?: RegExp[];
  /** File patterns to exclude */
  excludePatterns?: RegExp[];
  /** Minimum severity to report */
  minSeverity?: Severity;
  /** Maximum findings to report */
  maxFindings?: number;
  /** Enable verbose output */
  verbose?: boolean;
}

/**
 * Result of a SAST scan
 */
export interface SASTScanResult {
  findings: SASTFinding[];
  scannedFiles: number;
  totalLines: number;
  scanDuration: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  passed: boolean;
}

// ============================================================================
// Default Rules
// ============================================================================

/**
 * Default SAST rules for TypeScript/JavaScript applications
 */
export const DEFAULT_SAST_RULES: SASTRule[] = [
  // SQL Injection
  {
    id: "SAST001",
    name: "SQL Injection - String Concatenation",
    description:
      "SQL query constructed using string concatenation with user input",
    severity: "critical",
    category: "injection",
    pattern:
      /(?:query|execute|raw)\s*\(\s*[`'"]\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s+.*?\$\{/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-89",
    owasp: "A03:2021",
    remediation:
      "Use parameterized queries with $1, $2 placeholders instead of string interpolation",
  },
  {
    id: "SAST002",
    name: "SQL Injection - Template Literal",
    description: "SQL query using template literals with embedded expressions",
    severity: "critical",
    category: "injection",
    pattern: /pool\.query\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-89",
    owasp: "A03:2021",
    remediation:
      "Use parameterized queries with $1, $2 placeholders instead of template literals",
  },

  // Command Injection
  {
    id: "SAST003",
    name: "Command Injection",
    description: "Shell command execution with potential user input",
    severity: "critical",
    category: "injection",
    pattern:
      /(?:exec|execSync|spawn|spawnSync|execFile)\s*\(\s*(?:[`'"].*?\$\{|.*?\+\s*(?:req\.|params\.|query\.|body\.))/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-78",
    owasp: "A03:2021",
    remediation:
      "Avoid shell execution with user input. Use allowlists and proper escaping if necessary",
  },

  // XSS
  {
    id: "SAST004",
    name: "Cross-Site Scripting - innerHTML",
    description: "Direct innerHTML assignment may lead to XSS",
    severity: "high",
    category: "xss",
    pattern: /\.innerHTML\s*=\s*(?!['"`]<(?:div|span|p|br|hr)\s*\/?>['"`,])/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/__tests__|\.test\.|\.spec\./],
    cwe: "CWE-79",
    owasp: "A03:2021",
    remediation:
      "Use textContent or sanitize HTML with DOMPurify before setting innerHTML",
  },
  {
    id: "SAST005",
    name: "Cross-Site Scripting - dangerouslySetInnerHTML",
    description: "React dangerouslySetInnerHTML may lead to XSS",
    severity: "high",
    category: "xss",
    pattern:
      /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html:\s*(?!sanitize|DOMPurify|purify)/gi,
    filePatterns: [/\.(tsx|jsx)$/],
    cwe: "CWE-79",
    owasp: "A03:2021",
    remediation:
      "Sanitize HTML content with DOMPurify before using dangerouslySetInnerHTML",
  },
  {
    id: "SAST006",
    name: "Cross-Site Scripting - document.write",
    description: "document.write can lead to DOM-based XSS",
    severity: "high",
    category: "xss",
    pattern: /document\.write\s*\(/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/__tests__|\.test\.|\.spec\./],
    cwe: "CWE-79",
    owasp: "A03:2021",
    remediation: "Avoid document.write. Use DOM manipulation methods instead",
  },

  // Authentication/Authorization
  {
    id: "SAST007",
    name: "Hardcoded Credentials",
    description: "Potential hardcoded password or API key",
    severity: "critical",
    category: "authentication",
    pattern:
      /(?:password|passwd|pwd|secret|api[_-]?key|auth[_-]?token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/\.test\.|\.spec\.|__tests__|mock|fixture|example/],
    cwe: "CWE-798",
    owasp: "A07:2021",
    remediation:
      "Move credentials to environment variables and use a secrets manager",
  },
  {
    id: "SAST008",
    name: "JWT Without Verification",
    description: "JWT decoded without signature verification",
    severity: "high",
    category: "authentication",
    pattern: /jwt\.decode\s*\([^)]*\)\s*(?!.*verify)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-347",
    owasp: "A07:2021",
    remediation:
      "Always verify JWT signatures using jwt.verify() with a proper secret",
  },

  // Cryptography
  {
    id: "SAST009",
    name: "Weak Cryptographic Algorithm - MD5",
    description: "MD5 is cryptographically broken",
    severity: "high",
    category: "cryptography",
    pattern: /(?:createHash|hash)\s*\(\s*['"]md5['"]/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-328",
    owasp: "A02:2021",
    remediation:
      "Use SHA-256 or stronger for hashing. For passwords, use bcrypt, scrypt, or Argon2",
  },
  {
    id: "SAST010",
    name: "Weak Cryptographic Algorithm - SHA1",
    description: "SHA-1 is deprecated for security purposes",
    severity: "medium",
    category: "cryptography",
    pattern: /(?:createHash|hash)\s*\(\s*['"]sha1?['"]/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-328",
    owasp: "A02:2021",
    remediation: "Use SHA-256 or SHA-3 instead of SHA-1",
  },
  {
    id: "SAST011",
    name: "Insecure Random Number Generation",
    description: "Math.random() is not cryptographically secure",
    severity: "medium",
    category: "cryptography",
    pattern:
      /Math\.random\s*\(\s*\).*(?:token|key|secret|password|id|session|auth|nonce)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/\.test\.|\.spec\.|__tests__/],
    cwe: "CWE-330",
    owasp: "A02:2021",
    remediation:
      "Use crypto.randomBytes() or crypto.randomUUID() for security-sensitive operations",
  },

  // Data Exposure
  {
    id: "SAST012",
    name: "Sensitive Data in Console",
    description: "Logging sensitive data to console",
    severity: "medium",
    category: "data_exposure",
    pattern:
      /console\.(?:log|info|debug|warn|error)\s*\([^)]*(?:password|secret|token|key|credential|ssn|creditCard)[^)]*\)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/\.test\.|\.spec\.|__tests__/],
    cwe: "CWE-532",
    owasp: "A09:2021",
    remediation:
      "Remove sensitive data from logs or use a structured logger with redaction",
  },
  {
    id: "SAST013",
    name: "Sensitive Data in Error Response",
    description: "Potentially exposing sensitive data in error responses",
    severity: "medium",
    category: "data_exposure",
    pattern:
      /(?:res\.(?:json|send)|NextResponse\.json)\s*\([^)]*(?:error\.stack|err\.stack|e\.stack)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/\.test\.|\.spec\.|__tests__/],
    cwe: "CWE-209",
    owasp: "A09:2021",
    remediation:
      "Do not expose stack traces in production. Log them server-side and return generic errors",
  },

  // Configuration
  {
    id: "SAST014",
    name: "CORS Allow All Origins",
    description: "CORS configured to allow all origins",
    severity: "high",
    category: "security_misconfiguration",
    pattern: /(?:Access-Control-Allow-Origin|origin)\s*[:=]\s*['"]?\*['"]?/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/\.test\.|\.spec\.|__tests__/],
    cwe: "CWE-942",
    owasp: "A05:2021",
    remediation: "Specify allowed origins explicitly instead of using wildcard",
  },
  {
    id: "SAST015",
    name: "Debug Mode in Production",
    description: "Debug flag may be enabled in production",
    severity: "medium",
    category: "security_misconfiguration",
    pattern:
      /debug\s*[:=]\s*true(?!\s*&&\s*process\.env\.NODE_ENV\s*[!=]==?\s*['"]production)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/\.test\.|\.spec\.|__tests__|\.config\./],
    cwe: "CWE-489",
    owasp: "A05:2021",
    remediation: "Ensure debug mode is disabled in production environments",
  },

  // Path Traversal
  {
    id: "SAST016",
    name: "Path Traversal",
    description: "File path constructed from user input without validation",
    severity: "high",
    category: "injection",
    pattern:
      /(?:readFile|writeFile|createReadStream|createWriteStream|access)\s*\([^)]*(?:req\.|params\.|query\.|body\.)[^)]*\)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-22",
    owasp: "A01:2021",
    remediation:
      "Validate and sanitize file paths. Use path.resolve() and check against a base directory",
  },

  // SSRF
  {
    id: "SAST017",
    name: "Server-Side Request Forgery",
    description: "URL from user input used in server request",
    severity: "high",
    category: "injection",
    pattern:
      /(?:fetch|axios|request|got|http\.get|https\.get)\s*\([^)]*(?:req\.|params\.|query\.|body\.)[^)]*\)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    excludePatterns: [/\.test\.|\.spec\.|__tests__/],
    cwe: "CWE-918",
    owasp: "A10:2021",
    remediation:
      "Validate URLs against an allowlist. Block private IP ranges and localhost",
  },

  // Insecure Design
  {
    id: "SAST018",
    name: "Eval Usage",
    description: "eval() can execute arbitrary code",
    severity: "critical",
    category: "insecure_design",
    pattern: /\beval\s*\(/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    // Exclude test files and this scanner file itself (which contains eval as a string pattern for detection)
    excludePatterns: [/\.test\.|\.spec\.|__tests__|sast-scanner\.ts$/],
    cwe: "CWE-95",
    owasp: "A03:2021",
    remediation:
      "Avoid eval(). Use JSON.parse() for JSON or a proper parser for other formats",
  },
  {
    id: "SAST019",
    name: "Function Constructor",
    description: "new Function() can execute arbitrary code",
    severity: "high",
    category: "insecure_design",
    pattern: /new\s+Function\s*\(/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    // Exclude test files and this scanner file itself (which contains Function as a string pattern for detection)
    excludePatterns: [/\.test\.|\.spec\.|__tests__|sast-scanner\.ts$/],
    cwe: "CWE-95",
    owasp: "A03:2021",
    remediation:
      "Avoid dynamic code execution. Restructure code to avoid new Function()",
  },

  // Prototype Pollution
  {
    id: "SAST020",
    name: "Prototype Pollution - Object.assign",
    description:
      "Object.assign with user input may lead to prototype pollution",
    severity: "medium",
    category: "injection",
    pattern:
      /Object\.assign\s*\(\s*\{\s*\}\s*,\s*(?:req\.|params\.|query\.|body\.)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-1321",
    owasp: "A08:2021",
    remediation: "Validate object keys or use Object.create(null) as target",
  },

  // RegEx DoS
  {
    id: "SAST021",
    name: "Regular Expression DoS",
    description: "RegExp with user input may be vulnerable to ReDoS",
    severity: "medium",
    category: "insecure_design",
    pattern: /new\s+RegExp\s*\([^)]*(?:req\.|params\.|query\.|body\.)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-1333",
    owasp: "A03:2021",
    remediation:
      "Sanitize regex input or use a safe-regex library to validate patterns",
  },

  // Security Headers
  {
    id: "SAST022",
    name: "Missing Security Headers",
    description: "Response missing important security headers",
    severity: "low",
    category: "security_misconfiguration",
    pattern: /NextResponse\.json\s*\([^)]+\)\s*(?!.*headers)/gi,
    filePatterns: [/route\.ts$/],
    cwe: "CWE-693",
    owasp: "A05:2021",
    remediation:
      "Add security headers like X-Content-Type-Options, X-Frame-Options, CSP",
  },

  // Unvalidated Redirects
  {
    id: "SAST023",
    name: "Unvalidated Redirect",
    description: "Redirect URL from user input without validation",
    severity: "medium",
    category: "injection",
    pattern:
      /(?:redirect|location)\s*[:=]\s*(?:req\.|params\.|query\.|body\.)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-601",
    owasp: "A01:2021",
    remediation:
      "Validate redirect URLs against an allowlist of permitted destinations",
  },

  // NoSQL Injection
  {
    id: "SAST024",
    name: "NoSQL Injection",
    description: "MongoDB query with user input may be vulnerable",
    severity: "high",
    category: "injection",
    pattern:
      /(?:find|findOne|findOneAndUpdate|updateOne|deleteOne)\s*\(\s*\{\s*\$where\s*:/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-943",
    owasp: "A03:2021",
    remediation:
      "Avoid $where. Sanitize queries and use parameterized operations",
  },

  // Insecure Deserialization
  {
    id: "SAST025",
    name: "Insecure Deserialization",
    description: "Deserializing untrusted data without validation",
    severity: "high",
    category: "insecure_design",
    pattern:
      /(?:deserialize|unserialize|pickle\.load|yaml\.load)\s*\([^)]*(?:req\.|params\.|query\.|body\.)/gi,
    filePatterns: [/\.(ts|tsx|js|jsx)$/],
    cwe: "CWE-502",
    owasp: "A08:2021",
    remediation:
      "Validate and sanitize data before deserialization. Use safe parsing methods",
  },
];

// ============================================================================
// SAST Scanner Implementation
// ============================================================================

/**
 * Severity order for comparison
 */
const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/**
 * Generate a hash for a finding (for deduplication)
 */
function generateFindingHash(
  ruleId: string,
  file: string,
  line: number,
  snippet: string,
): string {
  const data = `${ruleId}:${file}:${line}:${snippet}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Generate unique finding ID
 */
function generateFindingId(): string {
  return `finding-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if severity meets minimum threshold
 */
function meetsMinSeverity(severity: Severity, minSeverity: Severity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[minSeverity];
}

/**
 * Check if file matches patterns
 */
function matchesFilePatterns(file: string, patterns?: RegExp[]): boolean {
  if (!patterns || patterns.length === 0) return true;
  return patterns.some((pattern) => pattern.test(file));
}

/**
 * SAST Scanner class
 */
export class SASTScanner {
  private rules: SASTRule[];
  private config: SASTScannerConfig;

  constructor(config: SASTScannerConfig = {}) {
    this.config = {
      rules: config.rules ?? DEFAULT_SAST_RULES,
      includePatterns: config.includePatterns ?? [/\.(ts|tsx|js|jsx)$/],
      excludePatterns: config.excludePatterns ?? [
        /node_modules/,
        /\.next/,
        /dist/,
        /build/,
        /coverage/,
        /__tests__/,
        /\.test\./,
        /\.spec\./,
        /\.mock\./,
        /fixtures?/,
      ],
      minSeverity: config.minSeverity ?? "low",
      maxFindings: config.maxFindings ?? 1000,
      verbose: config.verbose ?? false,
    };
    this.rules = this.config.rules ?? DEFAULT_SAST_RULES;
  }

  /**
   * Scan a single file content
   */
  scanContent(content: string, filePath: string): SASTFinding[] {
    const findings: SASTFinding[] = [];

    // Check if file should be scanned
    if (!matchesFilePatterns(filePath, this.config.includePatterns)) {
      return findings;
    }

    // Check if file should be excluded
    if (
      this.config.excludePatterns?.some((pattern) => pattern.test(filePath))
    ) {
      return findings;
    }

    const lines = content.split("\n");

    for (const rule of this.rules) {
      // Check if rule applies to this file type
      if (!matchesFilePatterns(filePath, rule.filePatterns)) {
        continue;
      }

      // Check if file is excluded by rule
      if (rule.excludePatterns?.some((pattern) => pattern.test(filePath))) {
        continue;
      }

      // Check each line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Support inline suppression: // sast-ignore on the same line or previous line
        const prevLine = i > 0 ? lines[i - 1] : "";
        if (
          line.includes("// sast-ignore") ||
          prevLine.includes("// sast-ignore")
        ) {
          continue;
        }

        const match = line.match(rule.pattern);

        if (match) {
          // Check severity threshold
          if (
            !meetsMinSeverity(rule.severity, this.config.minSeverity ?? "low")
          ) {
            continue;
          }

          const snippet = line.trim().substring(0, 150);
          const finding: SASTFinding = {
            id: generateFindingId(),
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            category: rule.category,
            file: filePath,
            line: i + 1,
            column: match.index,
            snippet,
            description: rule.description,
            cwe: rule.cwe,
            owasp: rule.owasp,
            remediation: rule.remediation,
            timestamp: new Date(),
            hash: generateFindingHash(rule.id, filePath, i + 1, snippet),
          };

          findings.push(finding);

          // Check max findings limit
          if (findings.length >= (this.config.maxFindings ?? 1000)) {
            return findings;
          }
        }
      }
    }

    return findings;
  }

  /**
   * Scan multiple files
   */
  scanFiles(files: Array<{ path: string; content: string }>): SASTScanResult {
    const startTime = Date.now();
    const allFindings: SASTFinding[] = [];
    let totalLines = 0;

    for (const file of files) {
      const lines = file.content.split("\n").length;
      totalLines += lines;

      const findings = this.scanContent(file.content, file.path);
      allFindings.push(...findings);

      if (allFindings.length >= (this.config.maxFindings ?? 1000)) {
        break;
      }
    }

    const scanDuration = Date.now() - startTime;

    // Calculate summary
    const summary = {
      critical: allFindings.filter((f) => f.severity === "critical").length,
      high: allFindings.filter((f) => f.severity === "high").length,
      medium: allFindings.filter((f) => f.severity === "medium").length,
      low: allFindings.filter((f) => f.severity === "low").length,
      info: allFindings.filter((f) => f.severity === "info").length,
    };

    // Determine if scan passed (no critical or high findings)
    const passed = summary.critical === 0 && summary.high === 0;

    return {
      findings: allFindings,
      scannedFiles: files.length,
      totalLines,
      scanDuration,
      summary,
      passed,
    };
  }

  /**
   * Get all rules
   */
  getRules(): SASTRule[] {
    return [...this.rules];
  }

  /**
   * Add a custom rule
   */
  addRule(rule: SASTRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): SASTRule | undefined {
    return this.rules.find((r) => r.id === ruleId);
  }

  /**
   * Update configuration
   */
  configure(config: Partial<SASTScannerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.rules) {
      this.rules = config.rules;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SASTScannerConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new SAST scanner with default configuration
 */
export function createSASTScanner(config?: SASTScannerConfig): SASTScanner {
  return new SASTScanner(config);
}

/**
 * Create a SAST scanner configured for CI/CD pipelines
 * - Fails on critical and high severity findings
 */
export function createCISASTScanner(): SASTScanner {
  return new SASTScanner({
    minSeverity: "medium",
    maxFindings: 500,
    verbose: false,
  });
}

/**
 * Create a comprehensive SAST scanner for full audits
 */
export function createFullSASTScanner(): SASTScanner {
  return new SASTScanner({
    minSeverity: "info",
    maxFindings: 10000,
    verbose: true,
    excludePatterns: [/node_modules/, /\.next/, /dist/, /build/],
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a finding for display
 */
export function formatFinding(finding: SASTFinding): string {
  const parts = [
    `[${finding.severity.toUpperCase()}] ${finding.ruleName}`,
    `  File: ${finding.file}:${finding.line}`,
    `  Rule: ${finding.ruleId}`,
    `  Category: ${finding.category}`,
  ];

  if (finding.cwe) {
    parts.push(`  CWE: ${finding.cwe}`);
  }

  if (finding.owasp) {
    parts.push(`  OWASP: ${finding.owasp}`);
  }

  parts.push(`  Snippet: ${finding.snippet}`);
  parts.push(`  Remediation: ${finding.remediation}`);

  return parts.join("\n");
}

/**
 * Format scan result as a summary report
 */
export function formatScanReport(result: SASTScanResult): string {
  const lines = [
    "# SAST Scan Report",
    "",
    `## Summary`,
    `- Scanned Files: ${result.scannedFiles}`,
    `- Total Lines: ${result.totalLines}`,
    `- Scan Duration: ${result.scanDuration}ms`,
    `- Status: ${result.passed ? "PASSED" : "FAILED"}`,
    "",
    `## Findings`,
    `- Critical: ${result.summary.critical}`,
    `- High: ${result.summary.high}`,
    `- Medium: ${result.summary.medium}`,
    `- Low: ${result.summary.low}`,
    `- Info: ${result.summary.info}`,
  ];

  if (result.findings.length > 0) {
    lines.push("", "## Details", "");

    for (const finding of result.findings) {
      lines.push(formatFinding(finding), "");
    }
  }

  return lines.join("\n");
}

/**
 * Group findings by severity
 */
export function groupFindingsBySeverity(
  findings: SASTFinding[],
): Map<Severity, SASTFinding[]> {
  const groups = new Map<Severity, SASTFinding[]>();

  for (const finding of findings) {
    if (!groups.has(finding.severity)) {
      groups.set(finding.severity, []);
    }
    groups.get(finding.severity)!.push(finding);
  }

  return groups;
}

/**
 * Group findings by category
 */
export function groupFindingsByCategory(
  findings: SASTFinding[],
): Map<VulnerabilityCategory, SASTFinding[]> {
  const groups = new Map<VulnerabilityCategory, SASTFinding[]>();

  for (const finding of findings) {
    if (!groups.has(finding.category)) {
      groups.set(finding.category, []);
    }
    groups.get(finding.category)!.push(finding);
  }

  return groups;
}

/**
 * Group findings by file
 */
export function groupFindingsByFile(
  findings: SASTFinding[],
): Map<string, SASTFinding[]> {
  const groups = new Map<string, SASTFinding[]>();

  for (const finding of findings) {
    if (!groups.has(finding.file)) {
      groups.set(finding.file, []);
    }
    groups.get(finding.file)!.push(finding);
  }

  return groups;
}

/**
 * Filter findings by severity
 */
export function filterFindingsBySeverity(
  findings: SASTFinding[],
  minSeverity: Severity,
): SASTFinding[] {
  return findings.filter((f) => meetsMinSeverity(f.severity, minSeverity));
}

/**
 * Deduplicate findings by hash
 */
export function deduplicateFindings(findings: SASTFinding[]): SASTFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    if (seen.has(finding.hash)) {
      return false;
    }
    seen.add(finding.hash);
    return true;
  });
}

/**
 * Check if scan result should block deployment
 */
export function shouldBlockDeployment(result: SASTScanResult): boolean {
  return result.summary.critical > 0 || result.summary.high > 0;
}

/**
 * Get severity color for terminal output
 */
export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "\x1b[31m"; // Red
    case "high":
      return "\x1b[33m"; // Yellow
    case "medium":
      return "\x1b[36m"; // Cyan
    case "low":
      return "\x1b[32m"; // Green
    case "info":
      return "\x1b[37m"; // White
    default:
      return "\x1b[0m"; // Reset
  }
}
