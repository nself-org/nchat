/**
 * Validation utilities for nself-chat
 * @module utils/validation
 */

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the value is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Warning message (valid but not ideal) */
  warning?: string;
}

/**
 * Password strength level
 */
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/**
 * Password validation options
 */
export interface PasswordOptions {
  /** Minimum length (default: 8) */
  minLength?: number;
  /** Maximum length (default: 128) */
  maxLength?: number;
  /** Require uppercase letter */
  requireUppercase?: boolean;
  /** Require lowercase letter */
  requireLowercase?: boolean;
  /** Require number */
  requireNumber?: boolean;
  /** Require special character */
  requireSpecial?: boolean;
}

/**
 * Common email regex pattern (RFC 5322 simplified)
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Channel name regex (lowercase, numbers, hyphens, underscores)
 */
const CHANNEL_NAME_REGEX = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]$/;

/**
 * Username regex (letters, numbers, underscores, periods)
 */
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9]$|^[a-zA-Z]$/;

/**
 * Validate an email address
 * @param email - Email address to validate
 * @returns Validation result
 * @example
 * validateEmail('user@example.com') // { valid: true }
 * validateEmail('invalid') // { valid: false, error: 'Invalid email format' }
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Email is required" };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long" };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  // Check for common typos
  const domain = trimmed.split("@")[1]?.toLowerCase();
  const typoWarnings: Record<string, string> = {
    "gmial.com": "Did you mean gmail.com?",
    "gmal.com": "Did you mean gmail.com?",
    "gamil.com": "Did you mean gmail.com?",
    "hotmal.com": "Did you mean hotmail.com?",
    "yahooo.com": "Did you mean yahoo.com?",
    "outlok.com": "Did you mean outlook.com?",
  };

  if (domain && typoWarnings[domain]) {
    return { valid: true, warning: typoWarnings[domain] };
  }

  return { valid: true };
}

/**
 * Validate a password
 * @param password - Password to validate
 * @param options - Validation options
 * @returns Validation result with strength
 * @example
 * validatePassword('password123') // { valid: false, error: 'Password must contain an uppercase letter' }
 * validatePassword('Secure@Pass123') // { valid: true }
 */
export function validatePassword(
  password: string,
  options: PasswordOptions = {},
): ValidationResult & { strength?: PasswordStrength } {
  const {
    minLength = 8,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false,
  } = options;

  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters`,
    };
  }

  if (password.length > maxLength) {
    return {
      valid: false,
      error: `Password must be no more than ${maxLength} characters`,
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain an uppercase letter" };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain a lowercase letter" };
  }

  if (requireNumber && !/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain a number" };
  }

  if (
    requireSpecial &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    return { valid: false, error: "Password must contain a special character" };
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "password123",
    "123456789",
    "qwerty123",
    "letmein",
    "welcome",
    "admin123",
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: "This password is too common" };
  }

  // Calculate strength
  const strength = calculatePasswordStrength(password);

  return { valid: true, strength };
}

/**
 * Calculate password strength
 * @param password - Password to analyze
 * @returns Password strength level
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 2;

  // Penalty for repetitive characters
  if (/(.)\1{2,}/.test(password)) score -= 1;

  // Penalty for sequential characters
  if (
    /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(
      password,
    )
  ) {
    score -= 1;
  }

  if (score <= 2) return "weak";
  if (score <= 4) return "fair";
  if (score <= 6) return "good";
  return "strong";
}

/**
 * Validate a channel name
 * @param name - Channel name to validate
 * @param options - Validation options
 * @returns Validation result
 * @example
 * validateChannelName('general') // { valid: true }
 * validateChannelName('My Channel') // { valid: false, error: 'Channel name can only contain...' }
 */
export function validateChannelName(
  name: string,
  options: { minLength?: number; maxLength?: number } = {},
): ValidationResult {
  const { minLength = 1, maxLength = 80 } = options;

  if (!name || typeof name !== "string") {
    return { valid: false, error: "Channel name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `Channel name must be at least ${minLength} character${minLength > 1 ? "s" : ""}`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Channel name must be no more than ${maxLength} characters`,
    };
  }

  if (!CHANNEL_NAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error:
        "Channel name can only contain lowercase letters, numbers, hyphens, and underscores",
    };
  }

  // Reserved names
  const reserved = [
    "admin",
    "system",
    "bot",
    "help",
    "support",
    "here",
    "channel",
    "everyone",
  ];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: "This channel name is reserved" };
  }

  return { valid: true };
}

/**
 * Validate a username
 * @param username - Username to validate
 * @param options - Validation options
 * @returns Validation result
 * @example
 * validateUsername('john_doe') // { valid: true }
 * validateUsername('a') // { valid: false, error: 'Username must be at least 2 characters' }
 */
export function validateUsername(
  username: string,
  options: { minLength?: number; maxLength?: number } = {},
): ValidationResult {
  const { minLength = 2, maxLength = 30 } = options;

  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `Username must be at least ${minLength} characters`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Username must be no more than ${maxLength} characters`,
    };
  }

  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username must start with a letter and can only contain letters, numbers, underscores, and periods",
    };
  }

  // Check for consecutive special characters
  if (/[_.]{2,}/.test(trimmed)) {
    return {
      valid: false,
      error: "Username cannot have consecutive special characters",
    };
  }

  // Reserved usernames
  const reserved = [
    "admin",
    "administrator",
    "system",
    "bot",
    "support",
    "help",
    "root",
    "mod",
    "moderator",
  ];
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: "This username is reserved" };
  }

  return { valid: true };
}

/**
 * Validate message length
 * @param message - Message content to validate
 * @param options - Validation options
 * @returns Validation result
 * @example
 * validateMessageLength('Hello!') // { valid: true }
 * validateMessageLength('') // { valid: false, error: 'Message cannot be empty' }
 */
export function validateMessageLength(
  message: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
  } = {},
): ValidationResult {
  const { minLength = 1, maxLength = 4000, allowEmpty = false } = options;

  if (message === null || message === undefined) {
    return { valid: false, error: "Message is required" };
  }

  const trimmed = message.trim();

  if (!allowEmpty && trimmed.length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (trimmed.length < minLength && !allowEmpty) {
    return {
      valid: false,
      error: `Message must be at least ${minLength} character${minLength > 1 ? "s" : ""}`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Message is too long (${trimmed.length}/${maxLength} characters)`,
    };
  }

  // Warn if approaching limit
  if (trimmed.length > maxLength * 0.9) {
    return {
      valid: true,
      warning: `${maxLength - trimmed.length} characters remaining`,
    };
  }

  return { valid: true };
}

/**
 * Allowed file types configuration
 */
export interface FileTypeConfig {
  /** Allowed MIME types */
  mimeTypes?: string[];
  /** Allowed file extensions */
  extensions?: string[];
  /** Category presets to allow */
  categories?: Array<"image" | "video" | "audio" | "document" | "archive">;
}

/**
 * File type categories
 */
const FILE_CATEGORIES: Record<
  string,
  { mimeTypes: string[]; extensions: string[] }
> = {
  image: {
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  },
  video: {
    mimeTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ],
    extensions: [".mp4", ".webm", ".mov", ".avi"],
  },
  audio: {
    mimeTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "audio/aac",
    ],
    extensions: [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
  },
  document: {
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ],
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"],
  },
  archive: {
    mimeTypes: [
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/gzip",
    ],
    extensions: [".zip", ".rar", ".7z", ".gz", ".tar"],
  },
};

/**
 * Validate file type
 * @param file - File or file metadata to validate
 * @param config - Allowed file types configuration
 * @returns Validation result
 * @example
 * validateFileType({ name: 'photo.jpg', type: 'image/jpeg' }, { categories: ['image'] }) // { valid: true }
 */
export function validateFileType(
  file: { name: string; type?: string },
  config: FileTypeConfig = {},
): ValidationResult {
  const { mimeTypes = [], extensions = [], categories = [] } = config;

  // If no config provided, allow all
  if (
    mimeTypes.length === 0 &&
    extensions.length === 0 &&
    categories.length === 0
  ) {
    return { valid: true };
  }

  // Build allowed lists from categories
  const allowedMimeTypes = new Set(mimeTypes);
  const allowedExtensions = new Set(extensions.map((e) => e.toLowerCase()));

  for (const category of categories) {
    const cat = FILE_CATEGORIES[category];
    if (cat) {
      cat.mimeTypes.forEach((m) => allowedMimeTypes.add(m));
      cat.extensions.forEach((e) => allowedExtensions.add(e));
    }
  }

  // Check MIME type
  if (file.type && allowedMimeTypes.size > 0) {
    if (allowedMimeTypes.has(file.type)) {
      return { valid: true };
    }
  }

  // Check extension
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && allowedExtensions.has(ext)) {
    return { valid: true };
  }

  // Generate friendly error message
  const allowedList = Array.from(allowedExtensions).join(", ");
  return {
    valid: false,
    error: `File type not allowed. Allowed types: ${allowedList}`,
  };
}

/**
 * Validate file size
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @param minSize - Minimum required size in bytes (default: 0)
 * @returns Validation result
 * @example
 * validateFileSize(1024, 5 * 1024 * 1024) // { valid: true }
 * validateFileSize(10 * 1024 * 1024, 5 * 1024 * 1024) // { valid: false, error: 'File is too large...' }
 */
export function validateFileSize(
  size: number,
  maxSize: number,
  minSize: number = 0,
): ValidationResult {
  if (typeof size !== "number" || isNaN(size)) {
    return { valid: false, error: "Invalid file size" };
  }

  if (size < minSize) {
    const minSizeMB = (minSize / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File must be at least ${minSizeMB}MB` };
  }

  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const actualSizeMB = (size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${actualSizeMB}MB). Maximum size is ${maxSizeMB}MB`,
    };
  }

  // Warn if approaching limit (>80%)
  if (size > maxSize * 0.8) {
    const remaining = ((maxSize - size) / (1024 * 1024)).toFixed(1);
    return {
      valid: true,
      warning: `File is large. ${remaining}MB remaining before limit.`,
    };
  }

  return { valid: true };
}

/**
 * Validate URL
 * @param url - URL string to validate
 * @param options - Validation options
 * @returns Validation result
 * @example
 * validateUrl('https://example.com') // { valid: true }
 * validateUrl('not-a-url') // { valid: false, error: 'Invalid URL format' }
 */
export function validateUrl(
  url: string,
  options: {
    requireHttps?: boolean;
    allowedProtocols?: string[];
    allowedDomains?: string[];
  } = {},
): ValidationResult {
  const { requireHttps = false, allowedProtocols, allowedDomains } = options;

  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (requireHttps && parsed.protocol !== "https:") {
    return { valid: false, error: "URL must use HTTPS" };
  }

  if (allowedProtocols && allowedProtocols.length > 0) {
    const protocol = parsed.protocol.replace(":", "");
    if (!allowedProtocols.includes(protocol)) {
      return {
        valid: false,
        error: `URL protocol must be one of: ${allowedProtocols.join(", ")}`,
      };
    }
  }

  if (allowedDomains && allowedDomains.length > 0) {
    const domain = parsed.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(
      (d) =>
        domain === d.toLowerCase() || domain.endsWith(`.${d.toLowerCase()}`),
    );
    if (!isAllowed) {
      return { valid: false, error: "URL domain is not allowed" };
    }
  }

  return { valid: true };
}

/**
 * Validate display name
 * @param name - Display name to validate
 * @param options - Validation options
 * @returns Validation result
 */
export function validateDisplayName(
  name: string,
  options: { minLength?: number; maxLength?: number } = {},
): ValidationResult {
  const { minLength = 1, maxLength = 50 } = options;

  if (!name || typeof name !== "string") {
    return { valid: false, error: "Display name is required" };
  }

  const trimmed = name.trim();

  if (trimmed.length < minLength) {
    return {
      valid: false,
      error: `Display name must be at least ${minLength} character${minLength > 1 ? "s" : ""}`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Display name must be no more than ${maxLength} characters`,
    };
  }

  // Check for only special characters
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return {
      valid: false,
      error: "Display name must contain at least one letter or number",
    };
  }

  return { valid: true };
}

/**
 * Combine multiple validation results
 * @param results - Array of validation results
 * @returns Combined validation result
 */
export function combineValidations(
  ...results: ValidationResult[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
    if (result.warning) {
      warnings.push(result.warning);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join(". "),
      ...(warnings.length > 0 && { warning: warnings.join(". ") }),
    };
  }

  return {
    valid: true,
    ...(warnings.length > 0 && { warning: warnings.join(". ") }),
  };
}
