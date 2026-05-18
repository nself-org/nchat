/**
 * Branding Export - Export and import branding configurations
 */

import type { BrandingConfig } from "./branding-schema";
import {
  generateFaviconHtml,
  generateWebManifest,
  generateBrowserConfig,
} from "./favicon-generator";
import { paletteToCSS, generateGradient } from "./color-generator";
import { generateFontCSS, generateGoogleFontsUrl } from "./font-loader";

export interface ExportOptions {
  format: "json" | "css" | "tailwind" | "scss" | "zip";
  includeAssets?: boolean;
  minify?: boolean;
}

/**
 * Export branding config as JSON
 */
export function exportAsJSON(
  config: BrandingConfig,
  minify: boolean = false,
): string {
  return JSON.stringify(config, null, minify ? 0 : 2);
}

/**
 * Import branding config from JSON
 */
export function importFromJSON(jsonString: string): BrandingConfig {
  try {
    const config = JSON.parse(jsonString) as BrandingConfig;
    // Validate basic structure
    if (!config.appInfo || !config.colors) {
      throw new Error(
        "Invalid branding configuration: missing required fields",
      );
    }
    // Update metadata
    config.metadata = {
      ...config.metadata,
      updatedAt: new Date().toISOString(),
    };
    return config;
  } catch (error) {
    throw new Error(`Failed to parse branding configuration: ${error}`);
  }
}

/**
 * Export branding config as CSS custom properties
 */
export function exportAsCSS(config: BrandingConfig): string {
  const lines: string[] = [];

  // Font imports
  lines.push("/* Font Imports */");
  const fontUrl = generateGoogleFontsUrl([
    { family: config.typography.headingFont },
    { family: config.typography.bodyFont },
    { family: config.typography.monoFont },
  ]);
  lines.push(`@import url('${fontUrl}');`);
  lines.push("");

  // CSS Variables
  lines.push(":root {");
  lines.push("  /* Brand Identity */");
  lines.push(`  --brand-name: "${config.appInfo.appName}";`);
  lines.push(`  --brand-tagline: "${config.appInfo.tagline}";`);
  lines.push("");

  lines.push("  /* Colors */");
  lines.push(paletteToCSS(config.colors, ""));
  lines.push("");

  lines.push("  /* Typography */");
  lines.push(
    `  --font-heading: "${config.typography.headingFont}", system-ui, sans-serif;`,
  );
  lines.push(
    `  --font-body: "${config.typography.bodyFont}", system-ui, sans-serif;`,
  );
  lines.push(`  --font-mono: "${config.typography.monoFont}", monospace;`);
  lines.push(`  --font-size-base: ${config.typography.baseFontSize}px;`);
  lines.push(`  --line-height: ${config.typography.lineHeight};`);
  lines.push("");

  lines.push("  /* Font Weights */");
  lines.push(
    `  --font-weight-normal: ${config.typography.fontWeights.normal};`,
  );
  lines.push(
    `  --font-weight-medium: ${config.typography.fontWeights.medium};`,
  );
  lines.push(
    `  --font-weight-semibold: ${config.typography.fontWeights.semibold};`,
  );
  lines.push(`  --font-weight-bold: ${config.typography.fontWeights.bold};`);
  lines.push("}");
  lines.push("");

  // Base styles
  lines.push("/* Base Styles */");
  lines.push("body {");
  lines.push("  font-family: var(--font-body);");
  lines.push("  font-size: var(--font-size-base);");
  lines.push("  line-height: var(--line-height);");
  lines.push("  background-color: var(--background);");
  lines.push("  color: var(--foreground);");
  lines.push("}");
  lines.push("");

  lines.push("h1, h2, h3, h4, h5, h6 {");
  lines.push("  font-family: var(--font-heading);");
  lines.push("  font-weight: var(--font-weight-bold);");
  lines.push("}");
  lines.push("");

  lines.push("code, pre, kbd {");
  lines.push("  font-family: var(--font-mono);");
  lines.push("}");

  return lines.join("\n");
}

/**
 * Export branding config as Tailwind CSS config
 */
export function exportAsTailwindConfig(config: BrandingConfig): string {
  const tailwindConfig = {
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: config.colors.primary,
            foreground: config.colors.primaryForeground,
          },
          secondary: {
            DEFAULT: config.colors.secondary,
            foreground: config.colors.secondaryForeground,
          },
          accent: {
            DEFAULT: config.colors.accent,
            foreground: config.colors.accentForeground,
          },
          background: config.colors.background,
          foreground: config.colors.foreground,
          muted: {
            DEFAULT: config.colors.muted,
            foreground: config.colors.mutedForeground,
          },
          card: {
            DEFAULT: config.colors.card,
            foreground: config.colors.cardForeground,
          },
          border: config.colors.border,
          input: config.colors.input,
          ring: config.colors.ring,
          success: {
            DEFAULT: config.colors.success,
            foreground: config.colors.successForeground,
          },
          warning: {
            DEFAULT: config.colors.warning,
            foreground: config.colors.warningForeground,
          },
          error: {
            DEFAULT: config.colors.error,
            foreground: config.colors.errorForeground,
          },
          info: {
            DEFAULT: config.colors.info,
            foreground: config.colors.infoForeground,
          },
        },
        fontFamily: {
          heading: [
            `"${config.typography.headingFont}"`,
            "system-ui",
            "sans-serif",
          ],
          body: [`"${config.typography.bodyFont}"`, "system-ui", "sans-serif"],
          mono: [`"${config.typography.monoFont}"`, "monospace"],
        },
        fontSize: {
          base: [
            `${config.typography.baseFontSize}px`,
            { lineHeight: `${config.typography.lineHeight}` },
          ],
        },
        fontWeight: {
          normal: config.typography.fontWeights.normal,
          medium: config.typography.fontWeights.medium,
          semibold: config.typography.fontWeights.semibold,
          bold: config.typography.fontWeights.bold,
        },
      },
    },
  };

  return `// tailwind.config.js
// Generated from ${config.appInfo.appName} branding

module.exports = ${JSON.stringify(tailwindConfig, null, 2)}
`;
}

/**
 * Export branding config as SCSS variables
 */
export function exportAsSCSS(config: BrandingConfig): string {
  const lines: string[] = [];

  lines.push("// Brand Identity");
  lines.push(`$brand-name: "${config.appInfo.appName}";`);
  lines.push(`$brand-tagline: "${config.appInfo.tagline}";`);
  lines.push("");

  lines.push("// Colors");
  for (const [key, value] of Object.entries(config.colors)) {
    const scssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    lines.push(`$color-${scssKey}: ${value};`);
  }
  lines.push("");

  lines.push("// Typography");
  lines.push(
    `$font-heading: "${config.typography.headingFont}", system-ui, sans-serif;`,
  );
  lines.push(
    `$font-body: "${config.typography.bodyFont}", system-ui, sans-serif;`,
  );
  lines.push(`$font-mono: "${config.typography.monoFont}", monospace;`);
  lines.push(`$font-size-base: ${config.typography.baseFontSize}px;`);
  lines.push(`$line-height: ${config.typography.lineHeight};`);
  lines.push("");

  lines.push("// Font Weights");
  lines.push(`$font-weight-normal: ${config.typography.fontWeights.normal};`);
  lines.push(`$font-weight-medium: ${config.typography.fontWeights.medium};`);
  lines.push(
    `$font-weight-semibold: ${config.typography.fontWeights.semibold};`,
  );
  lines.push(`$font-weight-bold: ${config.typography.fontWeights.bold};`);

  return lines.join("\n");
}

/**
 * Generate email template HTML
 */
export function generateEmailTemplate(
  config: BrandingConfig,
  template:
    | "welcome"
    | "passwordReset"
    | "emailVerification"
    | "invitation"
    | "notification",
): string {
  const email = config.emailTemplates;
  const colors = config.colors;
  const brand = config.appInfo;

  const templates: Record<
    string,
    { subject: string; heading: string; body: string; cta?: string }
  > = {
    welcome: {
      subject: `Welcome to ${brand.appName}!`,
      heading: `Welcome to ${brand.appName}`,
      body: `Thank you for joining ${brand.appName}. We're excited to have you on board!`,
      cta: "Get Started",
    },
    passwordReset: {
      subject: `Reset your ${brand.appName} password`,
      heading: "Reset Your Password",
      body: `We received a request to reset your password. Click the button below to create a new password.`,
      cta: "Reset Password",
    },
    emailVerification: {
      subject: `Verify your email for ${brand.appName}`,
      heading: "Verify Your Email",
      body: `Please verify your email address to complete your ${brand.appName} registration.`,
      cta: "Verify Email",
    },
    invitation: {
      subject: `You've been invited to ${brand.appName}`,
      heading: `Join ${brand.appName}`,
      body: `You've been invited to join ${brand.appName}. Click below to accept the invitation.`,
      cta: "Accept Invitation",
    },
    notification: {
      subject: `New notification from ${brand.appName}`,
      heading: "New Notification",
      body: `You have a new notification from ${brand.appName}.`,
    },
  };

  const t = templates[template];
  const buttonColor = email.primaryButtonColor || colors.primary;
  const bgColor = email.backgroundColor || colors.muted;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: ${colors.card}; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; background-color: ${colors.primary};">
              ${email.headerLogo ? `<img src="${email.headerLogo}" alt="${brand.appName}" style="max-height: 48px;">` : `<h1 style="margin: 0; color: ${colors.primaryForeground}; font-size: 24px;">${brand.appName}</h1>`}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: ${colors.cardForeground}; font-size: 24px; font-weight: 600;">${t.heading}</h2>
              <p style="margin: 0 0 24px; color: ${colors.mutedForeground}; font-size: 16px; line-height: 1.5;">${t.body}</p>
              ${t.cta ? `<a href="{{action_url}}" style="display: inline-block; padding: 12px 24px; background-color: ${buttonColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">${t.cta}</a>` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${colors.muted}; text-align: center;">
              <p style="margin: 0; color: ${colors.mutedForeground}; font-size: 14px;">${email.footerText || `&copy; ${new Date().getFullYear()} ${brand.appName}. All rights reserved.`}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Export all assets as a ZIP file
 */
export async function exportAsZip(
  config: BrandingConfig,
  favicons: Array<{ name: string; blob: Blob }>,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Add branding config
  zip.file("branding.json", exportAsJSON(config));

  // Add CSS
  zip.file("css/variables.css", exportAsCSS(config));
  zip.file(
    "css/typography.css",
    generateFontCSS([
      { family: config.typography.headingFont },
      { family: config.typography.bodyFont },
      { family: config.typography.monoFont },
    ]),
  );

  // Add SCSS
  zip.file("scss/_variables.scss", exportAsSCSS(config));

  // Add Tailwind config
  zip.file("tailwind.config.js", exportAsTailwindConfig(config));

  // Add favicons
  const faviconFolder = zip.folder("favicons")!;
  for (const favicon of favicons) {
    faviconFolder.file(favicon.name, favicon.blob);
  }

  // Add manifest files
  faviconFolder.file(
    "site.webmanifest",
    generateWebManifest(
      config.appInfo.appName,
      config.appInfo.appName,
      config.colors.primary,
      config.colors.background,
    ),
  );
  faviconFolder.file(
    "browserconfig.xml",
    generateBrowserConfig(config.colors.primary),
  );
  faviconFolder.file("favicon-html.txt", generateFaviconHtml());

  // Add logo if exists
  if (config.logo.original) {
    const logoFolder = zip.folder("logo")!;
    const logoBlob = await fetch(config.logo.original).then((r) => r.blob());
    logoFolder.file("logo.png", logoBlob);

    if (config.logo.light) {
      const lightBlob = await fetch(config.logo.light).then((r) => r.blob());
      logoFolder.file("logo-light.png", lightBlob);
    }
    if (config.logo.dark) {
      const darkBlob = await fetch(config.logo.dark).then((r) => r.blob());
      logoFolder.file("logo-dark.png", darkBlob);
    }
  }

  // Add email templates
  const emailFolder = zip.folder("emails")!;
  emailFolder.file("welcome.html", generateEmailTemplate(config, "welcome"));
  emailFolder.file(
    "password-reset.html",
    generateEmailTemplate(config, "passwordReset"),
  );
  emailFolder.file(
    "email-verification.html",
    generateEmailTemplate(config, "emailVerification"),
  );
  emailFolder.file(
    "invitation.html",
    generateEmailTemplate(config, "invitation"),
  );
  emailFolder.file(
    "notification.html",
    generateEmailTemplate(config, "notification"),
  );

  // Add README
  zip.file("README.md", generateReadme(config));

  return zip.generateAsync({ type: "blob" });
}

/**
 * Generate README for exported package
 */
function generateReadme(config: BrandingConfig): string {
  return `# ${config.appInfo.appName} Brand Assets

${config.appInfo.tagline}

## Contents

- \`branding.json\` - Complete branding configuration
- \`css/\` - CSS custom properties and typography styles
- \`scss/\` - SCSS variables
- \`tailwind.config.js\` - Tailwind CSS configuration
- \`favicons/\` - Favicon files for all platforms
- \`logo/\` - Logo variations
- \`emails/\` - Email templates

## Usage

### CSS Custom Properties

Import the CSS file in your project:

\`\`\`html
<link rel="stylesheet" href="css/variables.css">
\`\`\`

### Tailwind CSS

Copy the theme configuration to your \`tailwind.config.js\`:

\`\`\`js
const brandingConfig = require('./tailwind.config.js');
module.exports = {
  ...brandingConfig,
  // your other config
};
\`\`\`

### Favicons

Copy the favicon files to your public directory and add the HTML snippet from \`favicon-html.txt\` to your \`<head>\`.

## Colors

| Name | Value |
|------|-------|
| Primary | ${config.colors.primary} |
| Secondary | ${config.colors.secondary} |
| Accent | ${config.colors.accent} |
| Background | ${config.colors.background} |
| Foreground | ${config.colors.foreground} |

## Typography

- Heading Font: ${config.typography.headingFont}
- Body Font: ${config.typography.bodyFont}
- Monospace Font: ${config.typography.monoFont}

---

Generated on ${new Date().toISOString()}
`;
}

/**
 * Download exported file
 */
export function downloadFile(content: string | Blob, filename: string): void {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: "text/plain" })
      : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
