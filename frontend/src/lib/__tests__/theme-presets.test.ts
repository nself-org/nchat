/**
 * Tests for theme-presets.ts
 *
 * This file verifies the structural integrity of the 27 theme preset objects.
 * theme-presets.ts is a large (1121 line) pure data file — exercising every
 * preset and all color fields gives a big coverage gain for minimal test code.
 *
 * Coverage intent: validate that every preset has the expected shape and that
 * the exported themePresets map can be consumed safely at runtime.
 */

import {
  themePresets,
  type ThemePreset,
  type ThemeColors,
} from "../theme-presets";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_PRESET_KEYS = [
  "nself",
  "slack",
  "discord",
  "ocean",
  "sunset",
  "midnight",
  "slate",
  "gray",
  "zinc",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

const COLOR_FIELDS: Array<keyof ThemeColors> = [
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "surfaceColor",
  "textColor",
  "mutedColor",
  "borderColor",
  "buttonPrimaryBg",
  "buttonPrimaryText",
  "buttonSecondaryBg",
  "buttonSecondaryText",
  "successColor",
  "warningColor",
  "errorColor",
  "infoColor",
];

// ---------------------------------------------------------------------------
// Helper: verify a ThemeColors object has all 16 color fields as strings
// ---------------------------------------------------------------------------

function expectValidThemeColors(colors: ThemeColors, context: string) {
  for (const field of COLOR_FIELDS) {
    const value = colors[field];
    expect(typeof value).toBe(
      "string",
      `${context}.${field} should be a string`,
    );
    expect((value as string).length).toBeGreaterThan(
      0,
      `${context}.${field} should not be empty`,
    );
  }
}

// ---------------------------------------------------------------------------
// Top-level structure
// ---------------------------------------------------------------------------

describe("themePresets map", () => {
  it("is exported as a non-null object", () => {
    expect(themePresets).toBeDefined();
    expect(typeof themePresets).toBe("object");
    expect(themePresets).not.toBeNull();
  });

  it("contains exactly 27 theme presets", () => {
    expect(Object.keys(themePresets)).toHaveLength(27);
  });

  it("contains all expected preset keys", () => {
    for (const key of ALL_PRESET_KEYS) {
      expect(themePresets).toHaveProperty(key);
    }
  });

  it("has no unexpected keys", () => {
    const keys = Object.keys(themePresets).sort();
    const expected = [...ALL_PRESET_KEYS].sort();
    expect(keys).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// Per-preset structural validation
// ---------------------------------------------------------------------------

describe("each theme preset has correct shape", () => {
  for (const key of ALL_PRESET_KEYS) {
    describe(`preset: ${key}`, () => {
      let preset: ThemePreset;

      beforeAll(() => {
        preset = themePresets[key];
      });

      it("has a non-empty name string", () => {
        expect(typeof preset.name).toBe("string");
        expect(preset.name.length).toBeGreaterThan(0);
      });

      it("has a preset field matching the record key", () => {
        expect(preset.preset).toBe(key);
      });

      it("has a light theme with all 16 color fields as non-empty strings", () => {
        expectValidThemeColors(preset.light, `${key}.light`);
      });

      it("has a dark theme with all 16 color fields as non-empty strings", () => {
        expectValidThemeColors(preset.dark, `${key}.dark`);
      });

      it("light and dark themes are distinct objects", () => {
        expect(preset.light).not.toBe(preset.dark);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Color format validation (hex or rgba)
// ---------------------------------------------------------------------------

describe("color value format", () => {
  // Hex colors: #RGB, #RRGGBB, #RRGGBBAA (3, 6, or 8 hex digits)
  // Some border colors use rgba() format
  const hexOrRgba = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/;

  for (const key of ALL_PRESET_KEYS) {
    it(`${key}: all light color values are valid hex or rgba`, () => {
      const preset = themePresets[key];
      for (const field of COLOR_FIELDS) {
        const value = preset.light[field];
        expect(value).toMatch(hexOrRgba);
      }
    });

    it(`${key}: all dark color values are valid hex or rgba`, () => {
      const preset = themePresets[key];
      for (const field of COLOR_FIELDS) {
        const value = preset.dark[field];
        expect(value).toMatch(hexOrRgba);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Spot-checks on specific presets
// ---------------------------------------------------------------------------

describe("nself preset spot-checks", () => {
  const preset = themePresets.nself;

  it("has the nself signature cyan as primary in light", () => {
    expect(preset.light.primaryColor).toBe("#00D4FF");
  });

  it("has the nself signature cyan as primary in dark", () => {
    expect(preset.dark.primaryColor).toBe("#00D4FF");
  });

  it("has protocol-white background in light", () => {
    expect(preset.light.backgroundColor).toBe("#FFFFFF");
  });

  it("has protocol-dark background in dark", () => {
    expect(preset.dark.backgroundColor).toBe("#18181B");
  });
});

describe("slack preset spot-checks", () => {
  const preset = themePresets.slack;

  it("is named 'Slack'", () => {
    expect(preset.name).toBe("Slack");
  });

  it("has preset key 'slack'", () => {
    expect(preset.preset).toBe("slack");
  });
});

describe("discord preset spot-checks", () => {
  const preset = themePresets.discord;

  it("is named 'Discord'", () => {
    expect(preset.name).toBe("Discord");
  });

  it("has preset key 'discord'", () => {
    expect(preset.preset).toBe("discord");
  });
});

// ---------------------------------------------------------------------------
// Tailwind colour palette presets — name correspondence
// ---------------------------------------------------------------------------

describe("tailwind color palette presets have correct names", () => {
  const tailwindPalette: Array<[string, string]> = [
    ["gray", "Gray"],
    ["zinc", "Zinc"],
    ["stone", "Stone"],
    ["red", "Red"],
    ["orange", "Orange"],
    ["amber", "Amber"],
    ["yellow", "Yellow"],
    ["lime", "Lime"],
    ["green", "Green"],
    ["emerald", "Emerald"],
    ["teal", "Teal"],
    ["cyan", "Cyan"],
    ["sky", "Sky"],
    ["blue", "Blue"],
    ["indigo", "Indigo"],
    ["violet", "Violet"],
    ["purple", "Purple"],
    ["fuchsia", "Fuchsia"],
    ["pink", "Pink"],
    ["rose", "Rose"],
  ];

  for (const [key, expectedName] of tailwindPalette) {
    it(`${key} preset is named '${expectedName}'`, () => {
      expect(themePresets[key].name).toBe(expectedName);
    });
  }
});

// ---------------------------------------------------------------------------
// ThemeColors interface completeness
// ---------------------------------------------------------------------------

describe("ThemeColors interface", () => {
  it("has exactly 16 color fields", () => {
    expect(COLOR_FIELDS).toHaveLength(16);
  });

  it("covers all fields present in the nself light theme", () => {
    const actualFields = Object.keys(themePresets.nself.light);
    expect(actualFields.sort()).toEqual([...COLOR_FIELDS].sort());
  });
});

// ---------------------------------------------------------------------------
// Iteration helpers — verify themePresets is safely iterable
// ---------------------------------------------------------------------------

describe("themePresets iterability", () => {
  it("Object.values returns an array of ThemePreset objects", () => {
    const presets = Object.values(themePresets);
    expect(Array.isArray(presets)).toBe(true);
    expect(presets).toHaveLength(27);
    for (const p of presets) {
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("preset");
      expect(p).toHaveProperty("light");
      expect(p).toHaveProperty("dark");
    }
  });

  it("Object.entries returns [key, preset] pairs", () => {
    const entries = Object.entries(themePresets);
    expect(entries).toHaveLength(27);
    for (const [key, preset] of entries) {
      expect(typeof key).toBe("string");
      expect(preset.preset).toBe(key);
    }
  });

  it("can look up any preset by key without undefined", () => {
    for (const key of ALL_PRESET_KEYS) {
      expect(themePresets[key]).toBeDefined();
    }
  });
});
