/**
 * User Import Module
 * Handles user import functionality for admin
 */

import type {
  UserImportRow,
  UserImportResult,
  UserRole,
  UserActionResult,
} from "./user-types";

// ============================================================================
// Import Operations
// ============================================================================

export async function importUsers(
  users: UserImportRow[],
  options?: {
    skipDuplicates?: boolean;
    sendInvites?: boolean;
    defaultRole?: UserRole;
  },
): Promise<UserImportResult> {
  const response = await fetch("/api/admin/users/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ users, options }),
  });

  if (!response.ok) {
    throw new Error("Failed to import users");
  }

  return response.json();
}

export async function importUsersFromFile(
  file: File,
  options?: {
    skipDuplicates?: boolean;
    sendInvites?: boolean;
    defaultRole?: UserRole;
  },
): Promise<UserImportResult> {
  const content = await file.text();
  const fileType = file.name.split(".").pop()?.toLowerCase();

  let users: UserImportRow[];

  if (fileType === "csv") {
    users = parseCSV(content);
  } else if (fileType === "json") {
    users = parseJSON(content);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  return importUsers(users, options);
}

// ============================================================================
// CSV Parsing
// ============================================================================

export function parseCSV(content: string): UserImportRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row");
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Validate required fields
  if (!headers.includes("email")) {
    throw new Error('CSV must have an "email" column');
  }

  // Map column indices
  const emailIndex = headers.indexOf("email");
  const usernameIndex = headers.indexOf("username");
  const displayNameIndex =
    headers.indexOf("displayname") !== -1
      ? headers.indexOf("displayname")
      : headers.indexOf("display_name");
  const roleIndex = headers.indexOf("role");
  const passwordIndex = headers.indexOf("password");

  const users: UserImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const email = values[emailIndex]?.trim();

    if (!email) continue;

    const user: UserImportRow = {
      email,
      username: usernameIndex >= 0 ? values[usernameIndex]?.trim() : undefined,
      displayName:
        displayNameIndex >= 0 ? values[displayNameIndex]?.trim() : undefined,
      role:
        roleIndex >= 0 ? (values[roleIndex]?.trim() as UserRole) : undefined,
      password: passwordIndex >= 0 ? values[passwordIndex]?.trim() : undefined,
    };

    users.push(user);
  }

  return users;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

// ============================================================================
// JSON Parsing
// ============================================================================

export function parseJSON(content: string): UserImportRow[] {
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    if (data.users && Array.isArray(data.users)) {
      return validateImportRows(data.users);
    }
    throw new Error(
      'JSON must be an array of users or an object with a "users" array',
    );
  }

  return validateImportRows(data);
}

function validateImportRows(data: unknown[]): UserImportRow[] {
  return data.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Invalid user data at row ${index + 1}`);
    }

    const row = item as Record<string, unknown>;

    if (!row.email || typeof row.email !== "string") {
      throw new Error(`Missing email at row ${index + 1}`);
    }

    return {
      email: row.email,
      username: typeof row.username === "string" ? row.username : undefined,
      displayName:
        typeof row.displayName === "string" ? row.displayName : undefined,
      role: typeof row.role === "string" ? (row.role as UserRole) : undefined,
      password: typeof row.password === "string" ? row.password : undefined,
      sendInvite:
        typeof row.sendInvite === "boolean" ? row.sendInvite : undefined,
    };
  });
}

// ============================================================================
// Validation
// ============================================================================

export function validateImportData(users: UserImportRow[]): {
  valid: UserImportRow[];
  invalid: { row: number; user: UserImportRow; errors: string[] }[];
} {
  const valid: UserImportRow[] = [];
  const invalid: { row: number; user: UserImportRow; errors: string[] }[] = [];
  const seenEmails = new Set<string>();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  users.forEach((user, index) => {
    const errors: string[] = [];

    // Validate email
    if (!user.email) {
      errors.push("Email is required");
    } else if (!emailRegex.test(user.email)) {
      errors.push("Invalid email format");
    } else if (seenEmails.has(user.email.toLowerCase())) {
      errors.push("Duplicate email in import");
    } else {
      seenEmails.add(user.email.toLowerCase());
    }

    // Validate username if provided
    if (user.username) {
      if (user.username.length < 3) {
        errors.push("Username must be at least 3 characters");
      } else if (user.username.length > 30) {
        errors.push("Username must be 30 characters or less");
      } else if (!/^[a-zA-Z0-9_-]+$/.test(user.username)) {
        errors.push("Username contains invalid characters");
      }
    }

    // Validate role if provided
    if (user.role) {
      const validRoles: UserRole[] = [
        "owner",
        "admin",
        "moderator",
        "member",
        "guest",
      ];
      if (!validRoles.includes(user.role)) {
        errors.push(`Invalid role: ${user.role}`);
      }
    }

    // Validate password if provided
    if (user.password && user.password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }

    if (errors.length > 0) {
      invalid.push({ row: index + 1, user, errors });
    } else {
      valid.push(user);
    }
  });

  return { valid, invalid };
}

// ============================================================================
// Templates
// ============================================================================

export function getCSVTemplate(): string {
  return `email,username,displayName,role
john@example.com,johndoe,John Doe,member
jane@example.com,janedoe,Jane Doe,member
admin@example.com,adminuser,Admin User,admin`;
}

export function getJSONTemplate(): string {
  return JSON.stringify(
    {
      users: [
        {
          email: "john@example.com",
          username: "johndoe",
          displayName: "John Doe",
          role: "member",
        },
        {
          email: "jane@example.com",
          username: "janedoe",
          displayName: "Jane Doe",
          role: "member",
        },
      ],
    },
    null,
    2,
  );
}

export function downloadTemplate(format: "csv" | "json"): void {
  const content = format === "csv" ? getCSVTemplate() : getJSONTemplate();
  const blob = new Blob([content], {
    type: format === "csv" ? "text/csv" : "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `user-import-template.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// File Validation
// ============================================================================

export function validateImportFile(file: File): UserActionResult {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["text/csv", "application/json"];
  const allowedExtensions = ["csv", "json"];

  if (file.size > maxSize) {
    return { success: false, message: "File size exceeds 5MB limit" };
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    return { success: false, message: "Only CSV and JSON files are supported" };
  }

  if (file.type && !allowedTypes.includes(file.type)) {
    // Some browsers might not set the correct MIME type
    if (!allowedExtensions.includes(extension)) {
      return { success: false, message: "Invalid file type" };
    }
  }

  return { success: true, message: "File is valid" };
}

export function getExpectedColumns(): {
  name: string;
  required: boolean;
  description: string;
}[] {
  return [
    { name: "email", required: true, description: "User email address" },
    {
      name: "username",
      required: false,
      description: "Unique username (auto-generated if not provided)",
    },
    {
      name: "displayName",
      required: false,
      description: "Display name (uses email prefix if not provided)",
    },
    {
      name: "role",
      required: false,
      description: "User role (defaults to member)",
    },
    {
      name: "password",
      required: false,
      description: "Initial password (random if not provided)",
    },
  ];
}
