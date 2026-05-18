/**
 * Privacy Filter for Analytics
 *
 * Handles PII removal, data masking, and consent checking
 * to ensure user privacy is protected in analytics data.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Consent categories that users can opt-in/out of
 */
export enum ConsentCategory {
  ESSENTIAL = "essential",
  ANALYTICS = "analytics",
  FUNCTIONAL = "functional",
  MARKETING = "marketing",
}

/**
 * User consent state
 */
export interface ConsentState {
  [ConsentCategory.ESSENTIAL]: boolean;
  [ConsentCategory.ANALYTICS]: boolean;
  [ConsentCategory.FUNCTIONAL]: boolean;
  [ConsentCategory.MARKETING]: boolean;
  timestamp: number;
  version: string;
}

/**
 * Privacy filter configuration
 */
export interface PrivacyFilterConfig {
  sensitiveFields: string[];
  sensitivePatterns: RegExp[];
  maskChar: string;
  maskLength: number;
  preserveFieldType: boolean;
  deepFilterObjects: boolean;
  filterArrays: boolean;
}

/**
 * Masking options for specific field types
 */
export interface MaskingOptions {
  email?: boolean;
  phone?: boolean;
  creditCard?: boolean;
  ssn?: boolean;
  ipAddress?: boolean;
  custom?: RegExp[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default sensitive field names to filter
 */
export const DEFAULT_SENSITIVE_FIELDS: string[] = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "apiKey",
  "access_token",
  "accessToken",
  "refresh_token",
  "refreshToken",
  "auth",
  "authorization",
  "credential",
  "credentials",
  "ssn",
  "social_security",
  "socialSecurity",
  "credit_card",
  "creditCard",
  "card_number",
  "cardNumber",
  "cvv",
  "cvc",
  "pin",
  "phone",
  "telephone",
  "mobile",
  "cell",
  "email",
  "mail",
  "address",
  "street",
  "zip",
  "zipcode",
  "postal",
  "dob",
  "date_of_birth",
  "dateOfBirth",
  "birthdate",
  "birth_date",
  "birthday",
  "bank_account",
  "bankAccount",
  "account_number",
  "accountNumber",
  "routing_number",
  "routingNumber",
  "private_key",
  "privateKey",
  "private",
];

/**
 * Patterns for detecting sensitive data in values
 */
export const SENSITIVE_PATTERNS: Record<string, RegExp> = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$/,
  creditCard:
    /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9][0-9])[0-9]{12})$/,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  ipv6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/,
};

/**
 * Default privacy filter configuration
 */
export const DEFAULT_CONFIG: PrivacyFilterConfig = {
  sensitiveFields: DEFAULT_SENSITIVE_FIELDS,
  sensitivePatterns: Object.values(SENSITIVE_PATTERNS),
  maskChar: "*",
  maskLength: 8,
  preserveFieldType: true,
  deepFilterObjects: true,
  filterArrays: true,
};

/**
 * Redacted value placeholder
 */
export const REDACTED = "[REDACTED]";

/**
 * Current consent version
 */
export const CONSENT_VERSION = "1.0";

/**
 * Consent storage key
 */
export const CONSENT_STORAGE_KEY = "nchat_privacy_consent";

// ============================================================================
// Consent Management
// ============================================================================

/**
 * Gets the default consent state (only essential is enabled)
 */
export function getDefaultConsentState(): ConsentState {
  return {
    [ConsentCategory.ESSENTIAL]: true,
    [ConsentCategory.ANALYTICS]: false,
    [ConsentCategory.FUNCTIONAL]: false,
    [ConsentCategory.MARKETING]: false,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };
}

/**
 * Loads consent state from storage
 */
export function loadConsentState(): ConsentState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as ConsentState;

    // Validate the stored consent
    if (!isValidConsentState(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Saves consent state to storage
 */
export function saveConsentState(consent: ConsentState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Storage may be unavailable
  }
}

/**
 * Clears consent state from storage
 */
export function clearConsentState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Storage may be unavailable
  }
}

/**
 * Validates a consent state object
 */
export function isValidConsentState(consent: unknown): consent is ConsentState {
  if (typeof consent !== "object" || consent === null) {
    return false;
  }

  const c = consent as Record<string, unknown>;

  return (
    typeof c[ConsentCategory.ESSENTIAL] === "boolean" &&
    typeof c[ConsentCategory.ANALYTICS] === "boolean" &&
    typeof c[ConsentCategory.FUNCTIONAL] === "boolean" &&
    typeof c[ConsentCategory.MARKETING] === "boolean" &&
    typeof c.timestamp === "number" &&
    typeof c.version === "string"
  );
}

/**
 * Checks if a specific consent category is enabled
 */
export function hasConsent(
  category: ConsentCategory,
  consent?: ConsentState | null,
): boolean {
  // Essential is always required
  if (category === ConsentCategory.ESSENTIAL) {
    return true;
  }

  if (!consent) {
    consent = loadConsentState();
  }

  if (!consent) {
    return false;
  }

  return consent[category] === true;
}

/**
 * Updates consent for a specific category
 */
export function updateConsent(
  category: ConsentCategory,
  enabled: boolean,
  currentConsent?: ConsentState | null,
): ConsentState {
  const consent =
    currentConsent || loadConsentState() || getDefaultConsentState();

  // Essential cannot be disabled
  if (category === ConsentCategory.ESSENTIAL) {
    return consent;
  }

  const updated: ConsentState = {
    ...consent,
    [category]: enabled,
    timestamp: Date.now(),
  };

  saveConsentState(updated);
  return updated;
}

/**
 * Accepts all consent categories
 */
export function acceptAllConsent(): ConsentState {
  const consent: ConsentState = {
    [ConsentCategory.ESSENTIAL]: true,
    [ConsentCategory.ANALYTICS]: true,
    [ConsentCategory.FUNCTIONAL]: true,
    [ConsentCategory.MARKETING]: true,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };

  saveConsentState(consent);
  return consent;
}

/**
 * Rejects all non-essential consent categories
 */
export function rejectAllConsent(): ConsentState {
  const consent = getDefaultConsentState();
  saveConsentState(consent);
  return consent;
}

// ============================================================================
// Privacy Filter Class
// ============================================================================

/**
 * Privacy filter for removing PII from data
 */
export class PrivacyFilter {
  private config: PrivacyFilterConfig;
  private sensitiveFieldsLower: Set<string>;

  constructor(config: Partial<PrivacyFilterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sensitiveFieldsLower = new Set(
      this.config.sensitiveFields.map((f) => f.toLowerCase()),
    );
  }

  /**
   * Filters data to remove sensitive information
   */
  filter<T>(data: T): T {
    return this.filterValue(data, "") as T;
  }

  /**
   * Checks if a field name is sensitive
   */
  isSensitiveField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();

    // Check exact match
    if (this.sensitiveFieldsLower.has(lower)) {
      return true;
    }

    // Check if field name contains any sensitive term
    for (const sensitiveField of this.sensitiveFieldsLower) {
      if (lower.includes(sensitiveField)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if a value matches sensitive patterns
   */
  isSensitiveValue(value: string): boolean {
    for (const pattern of this.config.sensitivePatterns) {
      if (pattern.test(value)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Masks a sensitive string value
   */
  maskValue(value: string): string {
    if (this.config.preserveFieldType) {
      const { maskChar, maskLength } = this.config;
      return maskChar.repeat(Math.min(maskLength, value.length || maskLength));
    }
    return REDACTED;
  }

  /**
   * Masks an email address (preserves domain)
   */
  maskEmail(email: string): string {
    const parts = email.split("@");
    if (parts.length !== 2) {
      return REDACTED;
    }
    const [localPart, domain] = parts;
    const masked = localPart.charAt(0) + this.config.maskChar.repeat(4);
    return `${masked}@${domain}`;
  }

  /**
   * Masks a phone number (preserves last 4 digits)
   */
  maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) {
      return REDACTED;
    }
    const last4 = digits.slice(-4);
    return this.config.maskChar.repeat(digits.length - 4) + last4;
  }

  /**
   * Masks a credit card number (preserves last 4 digits)
   */
  maskCreditCard(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 4) {
      return REDACTED;
    }
    const last4 = digits.slice(-4);
    return this.config.maskChar.repeat(digits.length - 4) + last4;
  }

  /**
   * Masks an IP address
   */
  maskIpAddress(ip: string): string {
    if (ip.includes(":")) {
      // IPv6
      return "xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx";
    }
    // IPv4
    return "xxx.xxx.xxx.xxx";
  }

  /**
   * Recursively filters a value
   */
  private filterValue(value: unknown, path: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      return this.filterString(value, path);
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    if (Array.isArray(value)) {
      if (!this.config.filterArrays) {
        return value;
      }
      return value.map((item, index) =>
        this.filterValue(item, `${path}[${index}]`),
      );
    }

    if (typeof value === "object") {
      if (!this.config.deepFilterObjects) {
        return value;
      }
      return this.filterObject(value as Record<string, unknown>, path);
    }

    return value;
  }

  /**
   * Filters a string value
   */
  private filterString(value: string, path: string): string {
    // Check if the path indicates a sensitive field
    const fieldName = path.split(".").pop() || "";
    if (this.isSensitiveField(fieldName)) {
      return this.maskValue(value);
    }

    // Check if value matches sensitive patterns
    if (this.isSensitiveValue(value)) {
      // Apply specific masking based on pattern type
      if (SENSITIVE_PATTERNS.email.test(value)) {
        return this.maskEmail(value);
      }
      if (SENSITIVE_PATTERNS.phone.test(value)) {
        return this.maskPhone(value);
      }
      if (SENSITIVE_PATTERNS.creditCard.test(value)) {
        return this.maskCreditCard(value);
      }
      if (
        SENSITIVE_PATTERNS.ipv4.test(value) ||
        SENSITIVE_PATTERNS.ipv6.test(value)
      ) {
        return this.maskIpAddress(value);
      }
      return this.maskValue(value);
    }

    return value;
  }

  /**
   * Filters an object's properties
   */
  private filterObject(
    obj: Record<string, unknown>,
    path: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;

      if (this.isSensitiveField(key)) {
        // If the value is an object or array, still filter recursively
        if (typeof value === "object" && value !== null) {
          result[key] = this.filterValue(value, fieldPath);
        } else {
          result[key] = REDACTED;
        }
      } else {
        result[key] = this.filterValue(value, fieldPath);
      }
    }

    return result;
  }

  /**
   * Adds additional sensitive fields
   */
  addSensitiveFields(fields: string[]): void {
    for (const field of fields) {
      this.config.sensitiveFields.push(field);
      this.sensitiveFieldsLower.add(field.toLowerCase());
    }
  }

  /**
   * Removes fields from sensitive list
   */
  removeSensitiveFields(fields: string[]): void {
    const removeSet = new Set(fields.map((f) => f.toLowerCase()));
    this.config.sensitiveFields = this.config.sensitiveFields.filter(
      (f) => !removeSet.has(f.toLowerCase()),
    );
    this.sensitiveFieldsLower = new Set(
      this.config.sensitiveFields.map((f) => f.toLowerCase()),
    );
  }

  /**
   * Adds additional sensitive patterns
   */
  addSensitivePatterns(patterns: RegExp[]): void {
    this.config.sensitivePatterns.push(...patterns);
  }

  /**
   * Gets the current configuration
   */
  getConfig(): PrivacyFilterConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates a pre-configured privacy filter
 */
export function createPrivacyFilter(
  config?: Partial<PrivacyFilterConfig>,
): PrivacyFilter {
  return new PrivacyFilter(config);
}

/**
 * Quick filter function using default configuration
 */
export function filterSensitiveData<T>(data: T): T {
  const filter = new PrivacyFilter();
  return filter.filter(data);
}

/**
 * Masks sensitive data in a string
 */
export function maskSensitiveString(
  value: string,
  options: MaskingOptions = {},
): string {
  const filter = new PrivacyFilter();

  if (options.email && SENSITIVE_PATTERNS.email.test(value)) {
    return filter.maskEmail(value);
  }
  if (options.phone && SENSITIVE_PATTERNS.phone.test(value)) {
    return filter.maskPhone(value);
  }
  if (options.creditCard && SENSITIVE_PATTERNS.creditCard.test(value)) {
    return filter.maskCreditCard(value);
  }
  if (
    options.ipAddress &&
    (SENSITIVE_PATTERNS.ipv4.test(value) || SENSITIVE_PATTERNS.ipv6.test(value))
  ) {
    return filter.maskIpAddress(value);
  }
  if (options.ssn && SENSITIVE_PATTERNS.ssn.test(value)) {
    return filter.maskValue(value);
  }

  if (options.custom) {
    for (const pattern of options.custom) {
      if (pattern.test(value)) {
        return filter.maskValue(value);
      }
    }
  }

  return value;
}

/**
 * Checks if analytics can be collected based on consent
 */
export function canCollectAnalytics(consent?: ConsentState | null): boolean {
  return hasConsent(ConsentCategory.ANALYTICS, consent);
}

/**
 * Sanitizes a URL by removing sensitive query parameters
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = [
      "token",
      "key",
      "secret",
      "password",
      "auth",
      "api_key",
      "apiKey",
    ];

    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, REDACTED);
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Sanitizes headers by removing sensitive ones
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const sensitiveHeaders = [
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
  ];
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      result[key] = REDACTED;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Hashes a value for anonymous tracking (client-side)
 */
export async function hashForTracking(value: string): Promise<string> {
  if (
    typeof window === "undefined" ||
    !window.crypto ||
    !window.crypto.subtle
  ) {
    // Fallback: simple hash for non-browser environments
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.substring(0, 16);
}

/**
 * Generates an anonymous user ID
 */
export function generateAnonymousId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `anon_${timestamp}${random}`;
}
