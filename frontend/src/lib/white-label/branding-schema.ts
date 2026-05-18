/**
 * Branding Schema - Type definitions and validation for white-label branding
 */

export interface BrandingConfig {
  // Step 1: App Info
  appInfo: {
    appName: string;
    tagline: string;
    description?: string;
    version?: string;
  };

  // Step 2: Logo
  logo: {
    original?: string; // Original uploaded file as data URL
    light?: string; // Light mode variant
    dark?: string; // Dark mode variant
    square?: string; // Square/icon version
    width?: number;
    height?: number;
    format?: "png" | "svg" | "jpg" | "webp";
  };

  // Step 3: Favicon
  favicon: {
    original?: string;
    sizes: {
      "16x16"?: string;
      "32x32"?: string;
      "48x48"?: string;
      "180x180"?: string; // Apple touch icon
      "192x192"?: string; // Android
      "512x512"?: string; // PWA
    };
    svg?: string;
  };

  // Step 4: Color Scheme
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
    input: string;
    ring: string;
    // Semantic colors
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    error: string;
    errorForeground: string;
    info: string;
    infoForeground: string;
  };

  // Step 5: Typography
  typography: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
    baseFontSize: number;
    lineHeight: number;
    fontWeights: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };

  // Step 6: Email Templates
  emailTemplates: {
    headerLogo?: string;
    footerText?: string;
    primaryButtonColor?: string;
    backgroundColor?: string;
    accentColor?: string;
    templates: {
      welcome?: EmailTemplate;
      passwordReset?: EmailTemplate;
      emailVerification?: EmailTemplate;
      invitation?: EmailTemplate;
      notification?: EmailTemplate;
    };
  };

  // Step 7: Landing Page
  landingPage: {
    enabled: boolean;
    hero: {
      headline: string;
      subheadline: string;
      ctaText: string;
      ctaLink: string;
      backgroundImage?: string;
      backgroundGradient?: string;
    };
    features: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    testimonials: Array<{
      quote: string;
      author: string;
      role: string;
      avatar?: string;
    }>;
    pricing?: {
      enabled: boolean;
      plans: Array<{
        name: string;
        price: string;
        period: string;
        features: string[];
        ctaText: string;
        highlighted?: boolean;
      }>;
    };
    cta: {
      headline: string;
      description: string;
      buttonText: string;
      buttonLink: string;
    };
  };

  // Step 8: Custom Domain
  customDomain: {
    domain?: string;
    status: "pending" | "verifying" | "active" | "failed" | "none";
    sslEnabled: boolean;
    dnsRecords?: Array<{
      type: "A" | "AAAA" | "CNAME" | "TXT";
      name: string;
      value: string;
      verified: boolean;
    }>;
  };

  // Metadata
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    exportedFrom?: string;
  };
}

export interface EmailTemplate {
  subject: string;
  preheader?: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  skippable: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "app-info",
    title: "App Information",
    description: "Set your app name and tagline",
    completed: false,
    skippable: false,
  },
  {
    id: "logo",
    title: "Logo",
    description: "Upload or generate your logo",
    completed: false,
    skippable: true,
  },
  {
    id: "favicon",
    title: "Favicon",
    description: "Generate favicons from your logo",
    completed: false,
    skippable: true,
  },
  {
    id: "colors",
    title: "Color Scheme",
    description: "Choose your brand colors",
    completed: false,
    skippable: false,
  },
  {
    id: "typography",
    title: "Typography",
    description: "Select fonts for your brand",
    completed: false,
    skippable: true,
  },
  {
    id: "email",
    title: "Email Templates",
    description: "Customize email appearance",
    completed: false,
    skippable: true,
  },
  {
    id: "landing",
    title: "Landing Page",
    description: "Build your landing page",
    completed: false,
    skippable: true,
  },
  {
    id: "domain",
    title: "Custom Domain",
    description: "Set up your domain",
    completed: false,
    skippable: true,
  },
  {
    id: "review",
    title: "Review",
    description: "Review and export your branding",
    completed: false,
    skippable: false,
  },
];

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  appInfo: {
    appName: "My App",
    tagline: "Your tagline here",
    description: "",
    version: "1.0.0",
  },
  logo: {
    original: undefined,
    light: undefined,
    dark: undefined,
    square: undefined,
  },
  favicon: {
    original: undefined,
    sizes: {},
    svg: undefined,
  },
  colors: {
    primary: "#3B82F6",
    primaryForeground: "#FFFFFF",
    secondary: "#6B7280",
    secondaryForeground: "#FFFFFF",
    accent: "#8B5CF6",
    accentForeground: "#FFFFFF",
    background: "#FFFFFF",
    foreground: "#18181B",
    muted: "#F4F4F5",
    mutedForeground: "#71717A",
    card: "#FFFFFF",
    cardForeground: "#18181B",
    border: "#E4E4E7",
    input: "#E4E4E7",
    ring: "#3B82F6",
    success: "#22C55E",
    successForeground: "#FFFFFF",
    warning: "#F59E0B",
    warningForeground: "#FFFFFF",
    error: "#EF4444",
    errorForeground: "#FFFFFF",
    info: "#3B82F6",
    infoForeground: "#FFFFFF",
  },
  typography: {
    headingFont: "Inter",
    bodyFont: "Inter",
    monoFont: "JetBrains Mono",
    baseFontSize: 16,
    lineHeight: 1.5,
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  emailTemplates: {
    headerLogo: undefined,
    footerText: undefined,
    primaryButtonColor: "#3B82F6",
    backgroundColor: "#F4F4F5",
    accentColor: "#3B82F6",
    templates: {},
  },
  landingPage: {
    enabled: true,
    hero: {
      headline: "Welcome to Our Platform",
      subheadline: "The best solution for your needs",
      ctaText: "Get Started",
      ctaLink: "/signup",
      backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    features: [
      {
        icon: "Zap",
        title: "Fast & Reliable",
        description: "Lightning-fast performance you can count on",
      },
      {
        icon: "Shield",
        title: "Secure",
        description: "Enterprise-grade security for your data",
      },
      {
        icon: "Users",
        title: "Team Collaboration",
        description: "Work together seamlessly with your team",
      },
    ],
    testimonials: [],
    cta: {
      headline: "Ready to get started?",
      description: "Join thousands of satisfied users today",
      buttonText: "Sign Up Free",
      buttonLink: "/signup",
    },
  },
  customDomain: {
    domain: undefined,
    status: "none",
    sslEnabled: false,
    dnsRecords: [],
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: "1.0.0",
  },
};

/**
 * Validates a branding configuration object
 */
export function validateBrandingConfig(config: Partial<BrandingConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate app info
  if (!config.appInfo?.appName || config.appInfo.appName.trim().length < 2) {
    errors.push("App name must be at least 2 characters");
  }

  // Validate colors
  if (config.colors) {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const [key, value] of Object.entries(config.colors)) {
      if (value && !hexRegex.test(value)) {
        errors.push(`Invalid color format for ${key}: ${value}`);
      }
    }
  }

  // Validate typography
  if (config.typography) {
    if (
      config.typography.baseFontSize &&
      (config.typography.baseFontSize < 10 ||
        config.typography.baseFontSize > 24)
    ) {
      errors.push("Base font size must be between 10 and 24");
    }
    if (
      config.typography.lineHeight &&
      (config.typography.lineHeight < 1 || config.typography.lineHeight > 3)
    ) {
      errors.push("Line height must be between 1 and 3");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
