/**
 * Font Loader - Google Fonts integration and font management
 */

export interface GoogleFont {
  family: string;
  category: "serif" | "sans-serif" | "display" | "handwriting" | "monospace";
  variants: string[];
  subsets: string[];
  popularity?: number;
}

// Popular Google Fonts organized by category
export const POPULAR_FONTS: GoogleFont[] = [
  // Sans-Serif
  {
    family: "Inter",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Roboto",
    category: "sans-serif",
    variants: ["400", "500", "700"],
    subsets: ["latin"],
  },
  {
    family: "Open Sans",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Lato",
    category: "sans-serif",
    variants: ["400", "700"],
    subsets: ["latin"],
  },
  {
    family: "Montserrat",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Poppins",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Source Sans 3",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Nunito",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Raleway",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Work Sans",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "DM Sans",
    category: "sans-serif",
    variants: ["400", "500", "700"],
    subsets: ["latin"],
  },
  {
    family: "Outfit",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Plus Jakarta Sans",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Manrope",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Geist",
    category: "sans-serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },

  // Serif
  {
    family: "Playfair Display",
    category: "serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Merriweather",
    category: "serif",
    variants: ["400", "700"],
    subsets: ["latin"],
  },
  {
    family: "Lora",
    category: "serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "PT Serif",
    category: "serif",
    variants: ["400", "700"],
    subsets: ["latin"],
  },
  {
    family: "Libre Baskerville",
    category: "serif",
    variants: ["400", "700"],
    subsets: ["latin"],
  },
  {
    family: "Source Serif 4",
    category: "serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Crimson Text",
    category: "serif",
    variants: ["400", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "EB Garamond",
    category: "serif",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },

  // Display
  {
    family: "Oswald",
    category: "display",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Bebas Neue",
    category: "display",
    variants: ["400"],
    subsets: ["latin"],
  },
  {
    family: "Righteous",
    category: "display",
    variants: ["400"],
    subsets: ["latin"],
  },
  {
    family: "Alfa Slab One",
    category: "display",
    variants: ["400"],
    subsets: ["latin"],
  },
  {
    family: "Archivo Black",
    category: "display",
    variants: ["400"],
    subsets: ["latin"],
  },

  // Handwriting
  {
    family: "Dancing Script",
    category: "handwriting",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Pacifico",
    category: "handwriting",
    variants: ["400"],
    subsets: ["latin"],
  },
  {
    family: "Caveat",
    category: "handwriting",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Satisfy",
    category: "handwriting",
    variants: ["400"],
    subsets: ["latin"],
  },

  // Monospace
  {
    family: "JetBrains Mono",
    category: "monospace",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Fira Code",
    category: "monospace",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Source Code Pro",
    category: "monospace",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "IBM Plex Mono",
    category: "monospace",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Roboto Mono",
    category: "monospace",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
  {
    family: "Space Mono",
    category: "monospace",
    variants: ["400", "700"],
    subsets: ["latin"],
  },
  {
    family: "Geist Mono",
    category: "monospace",
    variants: ["400", "500", "600", "700"],
    subsets: ["latin"],
  },
];

// Font pairing recommendations
export const FONT_PAIRINGS: Array<{
  heading: string;
  body: string;
  description: string;
}> = [
  {
    heading: "Inter",
    body: "Inter",
    description: "Modern and clean, great for tech products",
  },
  {
    heading: "Playfair Display",
    body: "Lato",
    description: "Elegant serif headings with clean body text",
  },
  {
    heading: "Montserrat",
    body: "Open Sans",
    description: "Bold and approachable, good for startups",
  },
  {
    heading: "Poppins",
    body: "Roboto",
    description: "Geometric and friendly, versatile choice",
  },
  {
    heading: "Oswald",
    body: "Source Sans 3",
    description: "Strong display headings with readable body",
  },
  {
    heading: "DM Sans",
    body: "DM Sans",
    description: "Clean geometric sans, works well alone",
  },
  {
    heading: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    description: "Modern variable font, excellent for apps",
  },
  {
    heading: "Manrope",
    body: "Manrope",
    description: "Contemporary and professional",
  },
  {
    heading: "Merriweather",
    body: "Merriweather",
    description: "Classic serif, excellent readability",
  },
  {
    heading: "Outfit",
    body: "Outfit",
    description: "Friendly and modern geometric sans",
  },
];

/**
 * Generate Google Fonts URL for loading
 */
export function generateGoogleFontsUrl(
  fonts: Array<{ family: string; weights?: string[] }>,
): string {
  const families = fonts.map((font) => {
    const weights = font.weights?.join(";") || "400;500;600;700";
    const family = font.family.replace(/ /g, "+");
    return `family=${family}:wght@${weights}`;
  });

  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

/**
 * Load fonts dynamically
 */
export async function loadFonts(
  fonts: Array<{ family: string; weights?: string[] }>,
): Promise<void> {
  const url = generateGoogleFontsUrl(fonts);

  // Check if already loaded
  const existingLink = document.querySelector(`link[href="${url}"]`);
  if (existingLink) return;

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("Failed to load fonts"));
    document.head.appendChild(link);
  });
}

/**
 * Preconnect to Google Fonts for faster loading
 */
export function preconnectGoogleFonts(): void {
  const origins = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

  for (const origin of origins) {
    // Check if preconnect already exists
    if (document.querySelector(`link[href="${origin}"][rel="preconnect"]`)) {
      continue;
    }

    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    if (origin.includes("gstatic")) {
      link.crossOrigin = "anonymous";
    }
    document.head.appendChild(link);
  }
}

/**
 * Get fonts by category
 */
export function getFontsByCategory(
  category: GoogleFont["category"],
): GoogleFont[] {
  return POPULAR_FONTS.filter((font) => font.category === category);
}

/**
 * Search fonts by name
 */
export function searchFonts(query: string): GoogleFont[] {
  const lowerQuery = query.toLowerCase();
  return POPULAR_FONTS.filter((font) =>
    font.family.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Get recommended body font for a heading font
 */
export function getRecommendedBodyFont(headingFont: string): GoogleFont | null {
  const pairing = FONT_PAIRINGS.find((p) => p.heading === headingFont);
  if (pairing) {
    return POPULAR_FONTS.find((f) => f.family === pairing.body) || null;
  }
  return null;
}

/**
 * Generate CSS font-family value
 */
export function generateFontFamily(
  fontFamily: string,
  fallbacks?: string[],
): string {
  const defaultFallbacks: Record<string, string[]> = {
    "sans-serif": [
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ],
    serif: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
    monospace: [
      "SFMono-Regular",
      "Menlo",
      "Monaco",
      "Consolas",
      "Liberation Mono",
      "Courier New",
      "monospace",
    ],
    display: ["system-ui", "sans-serif"],
    handwriting: ["cursive"],
  };

  const font = POPULAR_FONTS.find((f) => f.family === fontFamily);
  const category = font?.category || "sans-serif";
  const useFallbacks = fallbacks || defaultFallbacks[category];

  const quotedFamily = fontFamily.includes(" ")
    ? `"${fontFamily}"`
    : fontFamily;
  return [quotedFamily, ...useFallbacks].join(", ");
}

/**
 * Generate CSS for font imports
 */
export function generateFontCSS(
  fonts: Array<{ family: string; weights?: string[] }>,
): string {
  const url = generateGoogleFontsUrl(fonts);
  return `@import url('${url}');`;
}

/**
 * Generate CSS custom properties for typography
 */
export function generateTypographyCSS(config: {
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  baseFontSize?: number;
  lineHeight?: number;
}): string {
  const {
    headingFont,
    bodyFont,
    monoFont,
    baseFontSize = 16,
    lineHeight = 1.5,
  } = config;

  return `
:root {
  --font-heading: ${generateFontFamily(headingFont)};
  --font-body: ${generateFontFamily(bodyFont)};
  --font-mono: ${generateFontFamily(monoFont)};
  --font-size-base: ${baseFontSize}px;
  --line-height-base: ${lineHeight};
}

body {
  font-family: var(--font-body);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

code, pre, kbd, samp {
  font-family: var(--font-mono);
}
`.trim();
}

/**
 * Check if a font is loaded
 */
export function isFontLoaded(fontFamily: string): boolean {
  if (typeof document === "undefined") return false;
  return document.fonts.check(`16px "${fontFamily}"`);
}

/**
 * Wait for fonts to be loaded
 */
export async function waitForFonts(fonts: string[]): Promise<void> {
  if (typeof document === "undefined") return;

  const promises = fonts.map((font) => document.fonts.load(`16px "${font}"`));

  await Promise.all(promises);
}

/**
 * Get system font stack
 */
export function getSystemFontStack(
  category: "sans-serif" | "serif" | "monospace",
): string {
  switch (category) {
    case "sans-serif":
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    case "serif":
      return 'Georgia, "Times New Roman", Times, serif';
    case "monospace":
      return 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  }
}

/**
 * Font preview text samples
 */
export const FONT_PREVIEW_SAMPLES = {
  pangram: "The quick brown fox jumps over the lazy dog",
  heading: "Welcome to Our Platform",
  paragraph:
    "Build beautiful, responsive, and accessible interfaces with our design system.",
  numbers: "0123456789",
  special: "!@#$%^&*()[]{}|;:,.<>?",
};
