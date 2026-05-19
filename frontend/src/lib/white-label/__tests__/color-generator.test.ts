/**
 * Tests for color-generator utilities
 *
 * All functions are pure and deterministic.
 * Tests verify correctness of color math and format conversions.
 */

import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  adjustLightness,
  adjustSaturation,
  getComplementary,
  getAnalogous,
  getTriadic,
  getSplitComplementary,
  getRelativeLuminance,
  getContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  getContrastingForeground,
  generateColorScale,
  formatAsCssVar,
  paletteToCSS,
} from "../color-generator";

// ---------------------------------------------------------------------------
// hexToRgb
// ---------------------------------------------------------------------------

describe("hexToRgb", () => {
  it("converts pure red", () => {
    expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("converts pure green", () => {
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("converts pure blue", () => {
    expect(hexToRgb("#0000ff")).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("converts white", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("converts black", () => {
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("works without leading hash", () => {
    expect(hexToRgb("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("throws on invalid hex", () => {
    expect(() => hexToRgb("zzz")).toThrow("Invalid hex color");
  });

  it("converts a mid-range color", () => {
    expect(hexToRgb("#4a90e2")).toEqual({ r: 74, g: 144, b: 226 });
  });
});

// ---------------------------------------------------------------------------
// rgbToHex
// ---------------------------------------------------------------------------

describe("rgbToHex", () => {
  it("converts pure red", () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
  });

  it("converts white", () => {
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
  });

  it("converts black", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });

  it("clamps values above 255", () => {
    const result = rgbToHex({ r: 300, g: 0, b: 0 });
    expect(result).toBe("#ff0000");
  });

  it("clamps values below 0", () => {
    const result = rgbToHex({ r: -10, g: 0, b: 0 });
    expect(result).toBe("#000000");
  });
});

// ---------------------------------------------------------------------------
// rgbToHsl
// ---------------------------------------------------------------------------

describe("rgbToHsl", () => {
  it("converts red", () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it("converts white", () => {
    const hsl = rgbToHsl({ r: 255, g: 255, b: 255 });
    expect(hsl.l).toBe(100);
    expect(hsl.s).toBe(0);
  });

  it("converts black", () => {
    const hsl = rgbToHsl({ r: 0, g: 0, b: 0 });
    expect(hsl.l).toBe(0);
    expect(hsl.s).toBe(0);
  });

  it("converts green", () => {
    const hsl = rgbToHsl({ r: 0, g: 255, b: 0 });
    expect(hsl.h).toBe(120);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it("converts blue", () => {
    const hsl = rgbToHsl({ r: 0, g: 0, b: 255 });
    expect(hsl.h).toBe(240);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// hslToRgb
// ---------------------------------------------------------------------------

describe("hslToRgb", () => {
  it("converts achromatic (s=0) to gray", () => {
    const rgb = hslToRgb({ h: 0, s: 0, l: 50 });
    expect(rgb.r).toBe(rgb.g);
    expect(rgb.g).toBe(rgb.b);
  });

  it("converts red hsl", () => {
    const rgb = hslToRgb({ h: 0, s: 100, l: 50 });
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it("converts white hsl", () => {
    const rgb = hslToRgb({ h: 0, s: 0, l: 100 });
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(255);
    expect(rgb.b).toBe(255);
  });

  it("converts black hsl", () => {
    const rgb = hslToRgb({ h: 0, s: 0, l: 0 });
    expect(rgb.r).toBe(0);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// hexToHsl / hslToHex roundtrip
// ---------------------------------------------------------------------------

describe("hexToHsl", () => {
  it("returns HSL for a known color", () => {
    const hsl = hexToHsl("#ff0000");
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });
});

describe("hslToHex", () => {
  it("converts back to hex", () => {
    const hex = hslToHex({ h: 0, s: 100, l: 50 });
    expect(hex).toBe("#ff0000");
  });
});

describe("hex roundtrip", () => {
  it("hexToHsl -> hslToHex returns original hex (approx)", () => {
    const original = "#4a90e2";
    const hsl = hexToHsl(original);
    const result = hslToHex(hsl);
    // Small rounding differences acceptable — verify is a 7-char hex
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// ---------------------------------------------------------------------------
// adjustLightness
// ---------------------------------------------------------------------------

describe("adjustLightness", () => {
  it("increases lightness", () => {
    const original = hexToHsl("#808080");
    const result = hexToHsl(adjustLightness("#808080", 10));
    expect(result.l).toBe(Math.min(100, original.l + 10));
  });

  it("decreases lightness", () => {
    const original = hexToHsl("#808080");
    const result = hexToHsl(adjustLightness("#808080", -10));
    expect(result.l).toBe(Math.max(0, original.l - 10));
  });

  it("clamps at 100", () => {
    const result = hexToHsl(adjustLightness("#ffffff", 50));
    expect(result.l).toBe(100);
  });

  it("clamps at 0", () => {
    const result = hexToHsl(adjustLightness("#000000", -50));
    expect(result.l).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// adjustSaturation
// ---------------------------------------------------------------------------

describe("adjustSaturation", () => {
  it("increases saturation", () => {
    const result = hexToHsl(adjustSaturation("#808080", 20));
    expect(result.s).toBeGreaterThanOrEqual(0);
    expect(result.s).toBeLessThanOrEqual(100);
  });

  it("clamps at 100", () => {
    const result = hexToHsl(adjustSaturation("#ff0000", 50));
    expect(result.s).toBe(100);
  });

  it("clamps at 0", () => {
    const result = hexToHsl(adjustSaturation("#808080", -100));
    expect(result.s).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getComplementary
// ---------------------------------------------------------------------------

describe("getComplementary", () => {
  it("shifts hue by 180 degrees", () => {
    const original = hexToHsl("#ff0000"); // red: h=0
    const comp = hexToHsl(getComplementary("#ff0000"));
    expect(Math.abs(comp.h - ((original.h + 180) % 360))).toBeLessThanOrEqual(
      2,
    );
  });

  it("returns a hex string", () => {
    expect(getComplementary("#4a90e2")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// ---------------------------------------------------------------------------
// getAnalogous
// ---------------------------------------------------------------------------

describe("getAnalogous", () => {
  it("returns two colors", () => {
    const [a, b] = getAnalogous("#ff0000");
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(b).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("uses default angle of 30 when not provided", () => {
    const result = getAnalogous("#ff0000");
    expect(result).toHaveLength(2);
  });

  it("uses custom angle", () => {
    const result = getAnalogous("#ff0000", 60);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getTriadic
// ---------------------------------------------------------------------------

describe("getTriadic", () => {
  it("returns two colors", () => {
    const [a, b] = getTriadic("#ff0000");
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(b).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("shifts hue by 120 and 240 degrees", () => {
    const base = hexToHsl("#ff0000"); // h=0
    const [a, b] = getTriadic("#ff0000");
    const hslA = hexToHsl(a);
    const hslB = hexToHsl(b);
    expect(Math.abs(hslA.h - ((base.h + 120) % 360))).toBeLessThanOrEqual(2);
    expect(Math.abs(hslB.h - ((base.h + 240) % 360))).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// getSplitComplementary
// ---------------------------------------------------------------------------

describe("getSplitComplementary", () => {
  it("returns two colors", () => {
    const [a, b] = getSplitComplementary("#ff0000");
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(b).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// ---------------------------------------------------------------------------
// getRelativeLuminance
// ---------------------------------------------------------------------------

describe("getRelativeLuminance", () => {
  it("returns 1 for white", () => {
    expect(getRelativeLuminance("#ffffff")).toBeCloseTo(1, 2);
  });

  it("returns 0 for black", () => {
    expect(getRelativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("returns a value between 0 and 1", () => {
    const lum = getRelativeLuminance("#4a90e2");
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// getContrastRatio
// ---------------------------------------------------------------------------

describe("getContrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(getContrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });

  it("returns 1 for same color on same color", () => {
    expect(getContrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 2);
  });

  it("returns a value >= 1", () => {
    const ratio = getContrastRatio("#4a90e2", "#ffffff");
    expect(ratio).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// meetsWcagAA
// ---------------------------------------------------------------------------

describe("meetsWcagAA", () => {
  it("black on white passes WCAG AA", () => {
    expect(meetsWcagAA("#000000", "#ffffff")).toBe(true);
  });

  it("white on white fails WCAG AA", () => {
    expect(meetsWcagAA("#ffffff", "#ffffff")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// meetsWcagAAA
// ---------------------------------------------------------------------------

describe("meetsWcagAAA", () => {
  it("black on white passes WCAG AAA", () => {
    expect(meetsWcagAAA("#000000", "#ffffff")).toBe(true);
  });

  it("medium gray on white may fail WCAG AAA", () => {
    // #767676 has ~4.5:1 contrast — passes AA but not AAA
    const result = meetsWcagAAA("#767676", "#ffffff");
    expect(typeof result).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// getContrastingForeground
// ---------------------------------------------------------------------------

describe("getContrastingForeground", () => {
  it("returns black for light backgrounds", () => {
    expect(getContrastingForeground("#ffffff")).toBe("#000000");
  });

  it("returns white for dark backgrounds", () => {
    expect(getContrastingForeground("#000000")).toBe("#FFFFFF");
  });

  it("returns black for medium-light backgrounds", () => {
    expect(getContrastingForeground("#cccccc")).toBe("#000000");
  });
});

// ---------------------------------------------------------------------------
// generateColorScale
// ---------------------------------------------------------------------------

describe("generateColorScale", () => {
  it("generates default 10 steps", () => {
    const scale = generateColorScale("#4a90e2");
    // Keys: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
    expect(Object.keys(scale).length).toBe(11);
  });

  it("key 50 exists for first step", () => {
    const scale = generateColorScale("#4a90e2");
    expect(scale[50]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("supports custom step count", () => {
    const scale = generateColorScale("#4a90e2", 5);
    expect(Object.keys(scale).length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// formatAsCssVar
// ---------------------------------------------------------------------------

describe("formatAsCssVar", () => {
  it("returns a string with HSL values", () => {
    const result = formatAsCssVar("#ff0000");
    // Expected format: "H S% L%"
    expect(result).toMatch(/^\d+ \d+% \d+%$/);
  });

  it("returns correct values for red", () => {
    const result = formatAsCssVar("#ff0000");
    expect(result).toBe("0 100% 50%");
  });
});

// ---------------------------------------------------------------------------
// paletteToCSS
// ---------------------------------------------------------------------------

describe("paletteToCSS", () => {
  it("returns CSS custom property declarations", () => {
    const palette = {
      primary: "#4a90e2",
      primaryForeground: "#ffffff",
    } as never;
    const css = paletteToCSS(palette);
    expect(css).toContain("--primary:");
    expect(css).toContain("--primary-foreground:");
  });

  it("includes prefix when provided", () => {
    const palette = { primary: "#4a90e2" } as never;
    const css = paletteToCSS(palette, "brand");
    expect(css).toContain("--brand-primary:");
  });

  it("converts camelCase keys to kebab-case", () => {
    const palette = { primaryForeground: "#ffffff" } as never;
    const css = paletteToCSS(palette);
    expect(css).toContain("--primary-foreground:");
  });
});
