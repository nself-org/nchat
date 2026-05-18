/**
 * Font loading and management utilities for the branding system
 */

export interface FontOption {
  name: string;
  value: string;
  category: "sans-serif" | "serif" | "monospace" | "display" | "handwriting";
  weights: number[];
  google?: boolean;
  fallback: string;
}

/**
 * Available font options
 */
export const fontOptions: FontOption[] = [
  // Sans-serif fonts
  {
    name: "Inter",
    value: "Inter",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800, 900],
    google: true,
    fallback: "system-ui, -apple-system, sans-serif",
  },
  {
    name: "Roboto",
    value: "Roboto",
    category: "sans-serif",
    weights: [300, 400, 500, 700, 900],
    google: true,
    fallback: "Arial, sans-serif",
  },
  {
    name: "Open Sans",
    value: "Open Sans",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    google: true,
    fallback: "Arial, sans-serif",
  },
  {
    name: "Poppins",
    value: "Poppins",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800, 900],
    google: true,
    fallback: "system-ui, sans-serif",
  },
  {
    name: "Montserrat",
    value: "Montserrat",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800, 900],
    google: true,
    fallback: "Verdana, sans-serif",
  },
  {
    name: "Lato",
    value: "Lato",
    category: "sans-serif",
    weights: [300, 400, 700, 900],
    google: true,
    fallback: "Arial, sans-serif",
  },
  {
    name: "Nunito",
    value: "Nunito",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    google: true,
    fallback: "sans-serif",
  },
  {
    name: "Raleway",
    value: "Raleway",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800, 900],
    google: true,
    fallback: "sans-serif",
  },
  {
    name: "Work Sans",
    value: "Work Sans",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700, 800],
    google: true,
    fallback: "sans-serif",
  },
  {
    name: "DM Sans",
    value: "DM Sans",
    category: "sans-serif",
    weights: [400, 500, 700],
    google: true,
    fallback: "sans-serif",
  },
  {
    name: "Space Grotesk",
    value: "Space Grotesk",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700],
    google: true,
    fallback: "system-ui, sans-serif",
  },
  {
    name: "Ubuntu",
    value: "Ubuntu",
    category: "sans-serif",
    weights: [300, 400, 500, 700],
    google: true,
    fallback: "system-ui, sans-serif",
  },
  {
    name: "Source Sans 3",
    value: "Source Sans 3",
    category: "sans-serif",
    weights: [300, 400, 500, 600, 700],
    google: true,
    fallback: "sans-serif",
  },
  // Serif fonts
  {
    name: "Playfair Display",
    value: "Playfair Display",
    category: "serif",
    weights: [400, 500, 600, 700, 800, 900],
    google: true,
    fallback: "Georgia, serif",
  },
  {
    name: "Merriweather",
    value: "Merriweather",
    category: "serif",
    weights: [300, 400, 700, 900],
    google: true,
    fallback: "Georgia, serif",
  },
  {
    name: "Lora",
    value: "Lora",
    category: "serif",
    weights: [400, 500, 600, 700],
    google: true,
    fallback: "Georgia, serif",
  },
  {
    name: "PT Serif",
    value: "PT Serif",
    category: "serif",
    weights: [400, 700],
    google: true,
    fallback: "Times New Roman, serif",
  },
  {
    name: "Crimson Text",
    value: "Crimson Text",
    category: "serif",
    weights: [400, 600, 700],
    google: true,
    fallback: "Georgia, serif",
  },
  // Display fonts
  {
    name: "Bebas Neue",
    value: "Bebas Neue",
    category: "display",
    weights: [400],
    google: true,
    fallback: "Impact, sans-serif",
  },
  {
    name: "Oswald",
    value: "Oswald",
    category: "display",
    weights: [300, 400, 500, 600, 700],
    google: true,
    fallback: "Impact, sans-serif",
  },
  {
    name: "Archivo Black",
    value: "Archivo Black",
    category: "display",
    weights: [400],
    google: true,
    fallback: "Impact, sans-serif",
  },
  // Monospace fonts
  {
    name: "JetBrains Mono",
    value: "JetBrains Mono",
    category: "monospace",
    weights: [400, 500, 700],
    google: true,
    fallback: "monospace",
  },
  {
    name: "Fira Code",
    value: "Fira Code",
    category: "monospace",
    weights: [300, 400, 500, 600, 700],
    google: true,
    fallback: "monospace",
  },
  {
    name: "Source Code Pro",
    value: "Source Code Pro",
    category: "monospace",
    weights: [300, 400, 500, 600, 700],
    google: true,
    fallback: "monospace",
  },
  // System fonts
  {
    name: "System UI",
    value: "system-ui",
    category: "sans-serif",
    weights: [400, 500, 600, 700],
    google: false,
    fallback: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
];

/**
 * Load a Google Font dynamically
 */
export function loadGoogleFont(
  fontFamily: string,
  weights: number[] = [400, 700],
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existingLink = document.querySelector(
      `link[data-font="${fontFamily}"]`,
    );
    if (existingLink) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.setAttribute("data-font", fontFamily);
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      fontFamily,
    )}:wght@${weights.join(";")}&display=swap`;

    link.onload = () => resolve();
    link.onerror = () =>
      reject(new Error(`Failed to load font: ${fontFamily}`));

    document.head.appendChild(link);
  });
}

/**
 * Load multiple Google Fonts
 */
export async function loadGoogleFonts(
  fonts: Array<{ family: string; weights?: number[] }>,
): Promise<void> {
  await Promise.all(
    fonts.map((font) => loadGoogleFont(font.family, font.weights)),
  );
}

/**
 * Preconnect to Google Fonts for faster loading
 */
export function preconnectGoogleFonts(): void {
  if (typeof document === "undefined") return;

  const existingPreconnect = document.querySelector(
    'link[href="https://fonts.googleapis.com"][rel="preconnect"]',
  );
  if (existingPreconnect) return;

  const preconnect1 = document.createElement("link");
  preconnect1.rel = "preconnect";
  preconnect1.href = "https://fonts.googleapis.com";
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement("link");
  preconnect2.rel = "preconnect";
  preconnect2.href = "https://fonts.gstatic.com";
  preconnect2.crossOrigin = "anonymous";
  document.head.appendChild(preconnect2);
}

/**
 * Get the full font-family string with fallbacks
 */
export function getFontFamilyString(fontName: string): string {
  const font = fontOptions.find((f) => f.value === fontName);
  if (!font) {
    return `${fontName}, system-ui, sans-serif`;
  }
  return `'${font.value}', ${font.fallback}`;
}

/**
 * Get available weights for a font
 */
export function getFontWeights(fontName: string): number[] {
  const font = fontOptions.find((f) => f.value === fontName);
  return font?.weights || [400, 700];
}

/**
 * Get font by name
 */
export function getFont(fontName: string): FontOption | undefined {
  return fontOptions.find((f) => f.value === fontName);
}

/**
 * Get fonts by category
 */
export function getFontsByCategory(
  category: FontOption["category"],
): FontOption[] {
  return fontOptions.filter((f) => f.category === category);
}

/**
 * Weight name mapping
 */
export const weightNames: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

/**
 * Get weight name
 */
export function getWeightName(weight: number): string {
  return weightNames[weight] || `Weight ${weight}`;
}

/**
 * Generate Google Fonts URL for multiple fonts
 */
export function generateGoogleFontsUrl(
  fonts: Array<{ family: string; weights?: number[] }>,
): string {
  const familyParams = fonts
    .map((font) => {
      const weights = font.weights || [400, 700];
      return `family=${encodeURIComponent(font.family)}:wght@${weights.join(";")}`;
    })
    .join("&");

  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}

/**
 * Generate @font-face CSS for custom fonts
 */
export function generateFontFace(options: {
  family: string;
  src: string;
  weight?: number;
  style?: "normal" | "italic";
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
}): string {
  return `
@font-face {
  font-family: '${options.family}';
  src: url('${options.src}');
  font-weight: ${options.weight || 400};
  font-style: ${options.style || "normal"};
  font-display: ${options.display || "swap"};
}
`.trim();
}

/**
 * Apply font to an element
 */
export function applyFont(
  element: HTMLElement,
  fontFamily: string,
  weight?: number,
): void {
  element.style.fontFamily = getFontFamilyString(fontFamily);
  if (weight) {
    element.style.fontWeight = String(weight);
  }
}

/**
 * Apply font to document root
 */
export function setGlobalFont(fontFamily: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty(
    "--font-family",
    getFontFamilyString(fontFamily),
  );
}

/**
 * Check if a font is loaded
 */
export async function isFontLoaded(fontFamily: string): Promise<boolean> {
  if (typeof document === "undefined") return false;

  try {
    await document.fonts.load(`16px "${fontFamily}"`);
    return document.fonts.check(`16px "${fontFamily}"`);
  } catch {
    return false;
  }
}

/**
 * Wait for font to load
 */
export async function waitForFont(
  fontFamily: string,
  timeout = 3000,
): Promise<boolean> {
  if (typeof document === "undefined") return false;

  return Promise.race([
    document.fonts.load(`16px "${fontFamily}"`).then(() => true),
    new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), timeout),
    ),
  ]);
}
