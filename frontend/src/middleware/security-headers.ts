/**
 * Security Headers Middleware
 * Phase 19 - Security Hardening (Task 126)
 *
 * Implements comprehensive security headers including:
 * - XSS Protection
 * - SSRF Prevention
 * - Content Security Policy
 * - HSTS
 * - Frame Options
 * - Content Type sniffing protection
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;

  // Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.nself.org wss://*.nself.org https://api.stripe.com",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  headers.set("Content-Security-Policy", cspDirectives.join("; "));

  // HTTP Strict Transport Security (HSTS)
  // Force HTTPS for 1 year, including subdomains
  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // X-Frame-Options - Prevent clickjacking
  headers.set("X-Frame-Options", "SAMEORIGIN");

  // X-Content-Type-Options - Prevent MIME sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection - Enable browser XSS filter
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy - Control referrer information
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy - Control browser features
  const permissionsPolicy = [
    "camera=(self)",
    "microphone=(self)",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
  ];
  headers.set("Permissions-Policy", permissionsPolicy.join(", "));

  // Cross-Origin policies
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // Remove sensitive headers that might leak info
  headers.delete("X-Powered-By");
  headers.delete("Server");

  return response;
}

/**
 * Validate and sanitize URLs to prevent SSRF
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);

    // Block private IPs and localhost
    const blockedHosts = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "169.254.169.254", // AWS metadata
      "10.0.0.0", // Private network
      "172.16.0.0",
      "192.168.0.0",
    ];

    if (
      blockedHosts.some(
        (blocked) =>
          parsed.hostname === blocked ||
          parsed.hostname.endsWith("." + blocked),
      )
    ) {
      return { valid: false, error: "Private IP addresses not allowed" };
    }

    // Block non-HTTP protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Only HTTP/HTTPS protocols allowed" };
    }

    // Block potential DNS rebinding
    if (parsed.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      const octets = parsed.hostname.split(".").map(Number);

      // RFC 1918 private networks
      if (
        octets[0] === 10 ||
        (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] === 192 && octets[1] === 168)
      ) {
        return { valid: false, error: "Private IP range not allowed" };
      }

      // Loopback
      if (octets[0] === 127) {
        return { valid: false, error: "Loopback address not allowed" };
      }

      // Link-local
      if (octets[0] === 169 && octets[1] === 254) {
        return { valid: false, error: "Link-local address not allowed" };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/data:text\/html/gi, ""); // Remove data URLs
}

/**
 * Validate file upload to prevent malicious files
 */
export function validateFileUpload(
  filename: string,
  mimetype: string,
  size: number,
): { valid: boolean; error?: string } {
  // Check file extension
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".md",
    ".json",
    ".csv",
    ".mp3",
    ".mp4",
    ".webm",
    ".ogg",
    ".zip",
    ".tar",
    ".gz",
  ];

  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: "File type not allowed" };
  }

  // Check MIME type matches extension
  const mimeExtMap: Record<string, string[]> = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
    "image/svg+xml": [".svg"],
    "application/pdf": [".pdf"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "application/json": [".json"],
  };

  const expectedExts = mimeExtMap[mimetype] || [];
  if (expectedExts.length > 0 && !expectedExts.includes(ext)) {
    return { valid: false, error: "File extension does not match MIME type" };
  }

  // Check file size (default 100MB)
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || "104857600", 10);
  if (size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  // Block dangerous files
  const dangerousExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".app",
    ".js",
    ".jar",
    ".apk",
    ".deb",
    ".rpm",
    ".msi",
    ".dll",
    ".so",
    ".dylib",
  ];

  if (dangerousExtensions.includes(ext)) {
    return { valid: false, error: "Executable files not allowed" };
  }

  return { valid: true };
}

/**
 * Generate Content Security Policy nonce for inline scripts
 */
export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Middleware to apply all security measures
 */
export async function securityMiddleware(
  request: NextRequest,
): Promise<NextResponse> {
  // Create response
  const response = NextResponse.next();

  // Apply security headers
  return applySecurityHeaders(response);
}
