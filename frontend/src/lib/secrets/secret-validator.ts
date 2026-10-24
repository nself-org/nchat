/**
 * Secret Validator
 *
 * Validates secret configuration and enforces security policies.
 * Supports environment-based validation and production checks.
 *
 * @module lib/secrets/secret-validator
 */

import { z } from "zod";

import { logger } from "@/lib/logger";

import {
  SECRET_DEFINITIONS,
  SecretDefinition,
  SecretCategory,
  getSecretManager,
} from "./secret-manager";

// ============================================================================
// Types
// ============================================================================

/**
 * Validation result for a single secret
 */
export interface SecretValidationResult {
  /** Secret key */
  key: string;
  /** Whether the secret is valid */
  valid: boolean;
  /** Whether the secret exists */
  exists: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Secret category */
  category: SecretCategory;
  /** Whether the secret is required */
  required: boolean;
}

/**
 * Overall validation report
 */
export interface SecretValidationReport {
  /** Overall validation status */
  valid: boolean;
  /** Total secrets checked */
  totalChecked: number;
  /** Number of valid secrets */
  validCount: number;
  /** Number of invalid secrets */
  invalidCount: number;
  /** Number of missing required secrets */
  missingRequired: number;
  /** Individual validation results */
  results: SecretValidationResult[];
  /** Critical errors that should block deployment */
  criticalErrors: string[];
  /** Warnings that should be addressed */
  warnings: string[];
  /** Validation timestamp */
  timestamp: Date;
  /** Environment */
  environment: string;
}

/**
 * Validator configuration
 */
export interface SecretValidatorConfig {
  /** Environment to validate for */
  environment: "development" | "staging" | "production" | "test";
  /** Whether to check rotation requirements */
  checkRotation: boolean;
  /** Whether to enforce minimum lengths */
  enforceMinLength: boolean;
  /** Whether to validate patterns */
  validatePatterns: boolean;
  /** Additional required secrets */
  additionalRequired?: string[];
  /** Secrets to skip validation for */
  skipSecrets?: string[];
  /** Custom validation rules */
  customRules?: CustomValidationRule[];
}

/**
 * Custom validation rule
 */
export interface CustomValidationRule {
  /** Rule name */
  name: string;
  /** Secrets this rule applies to (empty means all) */
  appliesTo: string[];
  /** Validation function */
  validate: (key: string, value: string | undefined) => ValidationRuleResult;
}

/**
 * Result from a custom validation rule
 */
export interface ValidationRuleResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Warning message */
  warning?: string;
}

/**
 * Rotation status for a secret
 */
export interface SecretRotationStatus {
  /** Secret key */
  key: string;
  /** Whether rotation is required */
  requiresRotation: boolean;
  /** Rotation interval in days */
  rotationIntervalDays?: number;
  /** Last rotation date (if known) */
  lastRotatedAt?: Date;
  /** Whether rotation is overdue */
  isOverdue: boolean;
  /** Days until rotation is needed */
  daysUntilRotation?: number;
}

// ============================================================================
// Zod Schemas for Common Patterns
// ============================================================================

/**
 * Schema for URL-based secrets
 */
const urlSecretSchema = z.string().url();

/**
 * Schema for PostgreSQL connection strings
 */
const postgresUrlSchema = z
  .string()
  .regex(
    /^postgres(ql)?:\/\/[^:]+:[^@]+@[^/]+\/[^?]+(\?.+)?$/,
    "Invalid PostgreSQL connection string format",
  );

/**
 * Schema for Stripe secret keys
 */
const stripeSecretKeySchema = z
  .string()
  .regex(
    /^sk_(live|test)_[a-zA-Z0-9]{24,}$/,
    "Invalid Stripe secret key format",
  );

/**
 * Schema for Stripe webhook secrets
 */
const stripeWebhookSecretSchema = z
  .string()
  .regex(/^whsec_[a-zA-Z0-9]+$/, "Invalid Stripe webhook secret format");

/**
 * Schema for JWT/encryption secrets
 */
const strongSecretSchema = z
  .string()
  .min(32, "Secret must be at least 32 characters");

/**
 * Schema for AWS access keys
 */
const awsAccessKeySchema = z
  .string()
  .regex(/^AKIA[0-9A-Z]{16}$/, "Invalid AWS access key format");

/**
 * Schema for GitHub tokens
 */
const githubTokenSchema = z
  .string()
  .regex(
    /^(gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[a-zA-Z0-9]+)$/,
    "Invalid GitHub token format",
  );

// ============================================================================
// Weak Secret Detection
// ============================================================================

/**
 * Common weak secrets to detect
 */
const WEAK_SECRET_PATTERNS: RegExp[] = [
  /^password$/i,
  /^secret$/i,
  /^123456/,
  /^admin/i,
  /^test/i,
  /^demo/i,
  /^change.?me/i,
  /^your.?secret/i,
  /^xxx+$/i,
  /^placeholder/i,
  /^default/i,
  /^sample/i,
  /^example/i,
];

/**
 * Known weak secrets to reject
 */
const KNOWN_WEAK_SECRETS: Set<string> = new Set([
  "password",
  "password123",
  "secret",
  "secret123",
  "123456",
  "12345678",
  "admin",
  "admin123",
  "test",
  "test123",
  "development",
  "changeme",
  "change-me",
  "your-secret-here",
  "your_secret_here",
  "xxxxxxxx",
  "placeholder",
  "default",
  "sample",
  "example",
]);

/**
 * Check if a secret is weak
 */
export function isWeakSecret(value: string): boolean {
  if (value.length < 16) return true;
  if (KNOWN_WEAK_SECRETS.has(value.toLowerCase())) return true;
  if (WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(value))) return true;

  // Check for low entropy (too many repeated characters)
  const charCounts = new Map<string, number>();
  for (const char of value) {
    charCounts.set(char, (charCounts.get(char) ?? 0) + 1);
  }
  const maxRepeat = Math.max(...charCounts.values());
  if (maxRepeat > value.length * 0.5) return true;

  // Check for repeating patterns (like 'abababab')
  if (value.length >= 8) {
    for (let patternLen = 1; patternLen <= 4; patternLen++) {
      const pattern = value.substring(0, patternLen);
      const repeated = pattern
        .repeat(Math.ceil(value.length / patternLen))
        .substring(0, value.length);
      if (repeated === value) return true;
    }
  }

  return false;
}

/**
 * Calculate entropy of a secret
 */
export function calculateEntropy(value: string): number {
  if (!value || value.length === 0) return 0;

  const charCounts = new Map<string, number>();
  for (const char of value) {
    charCounts.set(char, (charCounts.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  const len = value.length;
  for (const count of charCounts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy * len;
}

/**
 * Get minimum recommended entropy for a secret type
 */
export function getMinimumEntropy(key: string): number {
  const definition = SECRET_DEFINITIONS.find((d) => d.key === key);
  if (definition?.category === "encryption") return 128;
  if (definition?.category === "database") return 80;
  if (definition?.category === "oauth") return 64;
  return 48;
}

// ============================================================================
// Secret Validator Class
// ============================================================================

/**
 * Default validator configuration
 */
const DEFAULT_CONFIG: SecretValidatorConfig = {
  environment: "development",
  checkRotation: true,
  enforceMinLength: true,
  validatePatterns: true,
};

/**
 * Secret validator class
 */
export class SecretValidator {
  private config: SecretValidatorConfig;
  private customSchemas: Map<string, z.ZodSchema> = new Map();

  constructor(config: Partial<SecretValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSchemas();
  }

  /**
   * Initialize predefined schemas
   */
  private initializeSchemas(): void {
    this.customSchemas.set("DATABASE_URL", postgresUrlSchema);
    this.customSchemas.set("STRIPE_SECRET_KEY", stripeSecretKeySchema);
    this.customSchemas.set("STRIPE_WEBHOOK_SECRET", stripeWebhookSecretSchema);
    this.customSchemas.set("JWT_SECRET", strongSecretSchema);
    this.customSchemas.set("ENCRYPTION_KEY", strongSecretSchema);
    this.customSchemas.set("NEXTAUTH_SECRET", strongSecretSchema);
    this.customSchemas.set("HASURA_ADMIN_SECRET", strongSecretSchema);
  }

  /**
   * Register a custom schema for a secret
   */
  registerSchema(key: string, schema: z.ZodSchema): void {
    this.customSchemas.set(key, schema);
  }

  /**
   * Get the schema for a secret key
   */
  private getSchema(key: string): z.ZodSchema | undefined {
    return this.customSchemas.get(key);
  }

  /**
   * Validate a single secret
   */
  async validateSecret(
    key: string,
    value: string | undefined,
  ): Promise<SecretValidationResult> {
    const definition = SECRET_DEFINITIONS.find(
      (d) => d.key === key || d.envVar === key,
    );
    const errors: string[] = [];
    const warnings: string[] = [];

    const result: SecretValidationResult = {
      key,
      valid: true,
      exists: value !== undefined && value !== "",
      errors,
      warnings,
      category: definition?.category ?? "other",
      required: definition?.required ?? false,
    };

    // Check if required secret is missing
    if (definition?.required && !result.exists) {
      if (this.config.environment === "production") {
        errors.push(`Required secret '${key}' is missing`);
        result.valid = false;
      } else {
        warnings.push(
          `Required secret '${key}' is missing (allowed in ${this.config.environment})`,
        );
      }
      return result;
    }

    // Skip further validation if secret doesn't exist
    if (!result.exists || !value) {
      return result;
    }

    // Check minimum length
    if (this.config.enforceMinLength && definition?.minLength) {
      if (value.length < definition.minLength) {
        errors.push(
          `Secret '${key}' is too short (${value.length} < ${definition.minLength} characters)`,
        );
        result.valid = false;
      }
    }

    // Check pattern
    if (this.config.validatePatterns && definition?.pattern) {
      if (!definition.pattern.test(value)) {
        errors.push(`Secret '${key}' does not match expected pattern`);
        result.valid = false;
      }
    }

    // Check custom schema
    const schema = this.getSchema(key);
    if (schema) {
      const parseResult = schema.safeParse(value);
      if (!parseResult.success) {
        parseResult.error.issues.forEach((err) => {
          errors.push(`${key}: ${err.message}`);
        });
        result.valid = false;
      }
    }

    // Check for weak secrets in production
    if (this.config.environment === "production") {
      if (isWeakSecret(value)) {
        errors.push(`Secret '${key}' appears to be weak or a placeholder`);
        result.valid = false;
      }

      // Check entropy for encryption keys
      if (definition?.category === "encryption") {
        const entropy = calculateEntropy(value);
        const minEntropy = getMinimumEntropy(key);
        if (entropy < minEntropy) {
          warnings.push(
            `Secret '${key}' has low entropy (${entropy.toFixed(0)} < ${minEntropy} bits)`,
          );
        }
      }
    }

    // Run custom validation rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        if (rule.appliesTo.length === 0 || rule.appliesTo.includes(key)) {
          const ruleResult = rule.validate(key, value);
          if (!ruleResult.valid) {
            errors.push(`${rule.name}: ${ruleResult.error}`);
            result.valid = false;
          }
          if (ruleResult.warning) {
            warnings.push(`${rule.name}: ${ruleResult.warning}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * Validate all secrets
   */
  async validateAll(): Promise<SecretValidationReport> {
    const manager = getSecretManager();
    const results: SecretValidationResult[] = [];
    const criticalErrors: string[] = [];
    const warnings: string[] = [];

    // Get all secret definitions
    const definitions = SECRET_DEFINITIONS.filter((d) => {
      if (this.config.skipSecrets?.includes(d.key)) return false;
      return true;
    });

    // Add additional required secrets
    const additionalRequired = this.config.additionalRequired ?? [];
    for (const key of additionalRequired) {
      if (!definitions.find((d) => d.key === key)) {
        definitions.push({
          key,
          description: "Additional required secret",
          category: "other",
          required: true,
        });
      }
    }

    // Validate each secret
    for (const definition of definitions) {
      const value = await manager.get(definition.key);
      const result = await this.validateSecret(definition.key, value);
      results.push(result);

      // Collect critical errors
      if (
        !result.valid &&
        result.required &&
        this.config.environment === "production"
      ) {
        criticalErrors.push(...result.errors);
      }

      // Collect warnings
      warnings.push(...result.warnings);
    }

    // Calculate statistics
    const validCount = results.filter((r) => r.valid).length;
    const invalidCount = results.filter((r) => !r.valid).length;
    const missingRequired = results.filter(
      (r) => r.required && !r.exists,
    ).length;

    return {
      valid: criticalErrors.length === 0,
      totalChecked: results.length,
      validCount,
      invalidCount,
      missingRequired,
      results,
      criticalErrors,
      warnings,
      timestamp: new Date(),
      environment: this.config.environment,
    };
  }

  /**
   * Validate secrets for production deployment
   */
  async validateForProduction(): Promise<SecretValidationReport> {
    const originalEnv = this.config.environment;
    this.config.environment = "production";
    const report = await this.validateAll();
    this.config.environment = originalEnv;
    return report;
  }

  /**
   * Get rotation status for all secrets
   */
  async getRotationStatus(): Promise<SecretRotationStatus[]> {
    const manager = getSecretManager();
    const secretsRequiringRotation = manager.getSecretsRequiringRotation();
    const statuses: SecretRotationStatus[] = [];

    for (const definition of secretsRequiringRotation) {
      const metadata = await manager.getMetadata(definition.key);
      const createdAt = metadata?.createdAt;
      const rotationIntervalDays = definition.rotationIntervalDays ?? 90;

      let isOverdue = false;
      let daysUntilRotation: number | undefined;

      if (createdAt) {
        const now = Date.now();
        const createdTime = createdAt.getTime();
        const daysSinceCreation = Math.floor(
          (now - createdTime) / (1000 * 60 * 60 * 24),
        );
        daysUntilRotation = rotationIntervalDays - daysSinceCreation;
        isOverdue = daysUntilRotation <= 0;
      }

      statuses.push({
        key: definition.key,
        requiresRotation: true,
        rotationIntervalDays,
        lastRotatedAt: createdAt,
        isOverdue,
        daysUntilRotation:
          daysUntilRotation !== undefined
            ? Math.max(0, daysUntilRotation)
            : undefined,
      });
    }

    return statuses;
  }

  /**
   * Check if all required secrets are present
   */
  async hasRequiredSecrets(): Promise<boolean> {
    const manager = getSecretManager();
    const required = manager.getRequiredSecrets();

    for (const definition of required) {
      const exists = await manager.exists(definition.key);
      if (!exists) return false;
    }

    return true;
  }

  /**
   * Get list of missing required secrets
   */
  async getMissingRequired(): Promise<string[]> {
    const manager = getSecretManager();
    const required = manager.getRequiredSecrets();
    const missing: string[] = [];

    for (const definition of required) {
      const exists = await manager.exists(definition.key);
      if (!exists) {
        missing.push(definition.key);
      }
    }

    return missing;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultValidator: SecretValidator | null = null;

/**
 * Get the default secret validator
 */
export function getSecretValidator(): SecretValidator {
  if (!defaultValidator) {
    const environment =
      (process.env.NODE_ENV as SecretValidatorConfig["environment"]) ??
      "development";
    defaultValidator = new SecretValidator({ environment });
  }
  return defaultValidator;
}

/**
 * Create a new secret validator with custom configuration
 */
export function createSecretValidator(
  config: Partial<SecretValidatorConfig> = {},
): SecretValidator {
  return new SecretValidator(config);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Validate all secrets using the default validator
 */
export async function validateSecrets(): Promise<SecretValidationReport> {
  return getSecretValidator().validateAll();
}

/**
 * Validate secrets for production
 */
export async function validateSecretsForProduction(): Promise<SecretValidationReport> {
  return getSecretValidator().validateForProduction();
}

/**
 * Check if all required secrets exist
 */
export async function hasAllRequiredSecrets(): Promise<boolean> {
  return getSecretValidator().hasRequiredSecrets();
}

/**
 * Get rotation status for all secrets
 */
export async function getSecretRotationStatus(): Promise<
  SecretRotationStatus[]
> {
  return getSecretValidator().getRotationStatus();
}

// ============================================================================
// Build-time Validation
// ============================================================================

/**
 * Run validation at build time and exit if critical errors
 */
export async function runBuildTimeValidation(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const validator = createSecretValidator({
    environment: isProduction ? "production" : "development",
  });

  const report = await validator.validateAll();

  if (report.criticalErrors.length > 0) {
    logger.error("\n[SECRET VALIDATION] Critical errors found:\n");
    report.criticalErrors.forEach((error) => {
      logger.error(`  - ${error}`);
    });

    if (isProduction) {
      logger.error(
        "\n[SECRET VALIDATION] Build failed due to missing/invalid secrets\n",
      );
      process.exit(1);
    }
  }

  if (report.warnings.length > 0) {
    logger.warn("\n[SECRET VALIDATION] Warnings:\n");
    report.warnings.forEach((warning) => {
      logger.warn(`  - ${warning}`);
    });
  }

  if (report.valid) {
    // Silent in CI - only log in verbose mode
    if (process.env.VERBOSE === "true") {
      logger.info("[SECRET VALIDATION] All secrets validated successfully");
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  postgresUrlSchema,
  stripeSecretKeySchema,
  stripeWebhookSecretSchema,
  strongSecretSchema,
  awsAccessKeySchema,
  githubTokenSchema,
};
