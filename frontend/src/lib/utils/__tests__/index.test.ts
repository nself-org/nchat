/**
 * Tests for utils/index.ts (barrel module)
 *
 * The barrel re-exports every utility from the utils sub-modules. Importing
 * this barrel and running spot-checks on a handful of the re-exported symbols
 * is enough to get the ~253 re-export lines covered.
 *
 * We do NOT re-test the full behaviour of each utility here — each sub-module
 * has its own dedicated test file. These are lightweight smoke-tests that
 * confirm the barrel is wired up correctly.
 */

// Import from the barrel — this covers all re-export lines
import {
  // format
  formatDate,
  formatFileSize,
  // validation
  validateEmail,
  validatePassword,
  // string
  truncate,
  slugify,
  capitalize,
  // array
  groupBy,
  chunk,
  // object
  pick,
  omit,
  deepClone,
  isEqual,
  // URL
  isValidUrl,
  joinPath,
  // color
  hexToRgb,
  isValidHex,
  getContrastRatio,
  // keyboard
  isMacPlatform,
  formatShortcut,
  // media
  isImageFile,
  isVideoFile,
  isAudioFile,
  getMediaType,
  calculateDisplayDimensions,
  dataUrlToBlob,
  // crypto
  generateId,
  simpleHash,
  base64Encode,
  base64Decode,
} from "../index";

// ---------------------------------------------------------------------------
// Smoke tests — verify re-exported symbols are the real functions
// ---------------------------------------------------------------------------

describe("utils/index barrel exports", () => {
  describe("format", () => {
    it("exports formatFileSize as a function", () => {
      expect(typeof formatFileSize).toBe("function");
    });

    it("formatFileSize works for bytes", () => {
      expect(formatFileSize(1024)).toContain("K");
    });

    it("exports formatDate as a function", () => {
      expect(typeof formatDate).toBe("function");
    });
  });

  describe("validation", () => {
    it("exports validateEmail as a function", () => {
      expect(typeof validateEmail).toBe("function");
    });

    it("validateEmail rejects plaintext", () => {
      const result = validateEmail("notanemail");
      expect(result.valid).toBe(false);
    });

    it("validateEmail accepts a valid address", () => {
      const result = validateEmail("user@example.com");
      expect(result.valid).toBe(true);
    });

    it("exports validatePassword as a function", () => {
      expect(typeof validatePassword).toBe("function");
    });
  });

  describe("string", () => {
    it("exports truncate as a function", () => {
      expect(typeof truncate).toBe("function");
    });

    it("truncate works", () => {
      expect(truncate("hello world", { length: 5 })).toBe("he...");
    });

    it("exports slugify as a function", () => {
      expect(typeof slugify).toBe("function");
    });

    it("slugify works", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("exports capitalize as a function", () => {
      expect(typeof capitalize).toBe("function");
    });

    it("capitalize works", () => {
      expect(capitalize("hello")).toBe("Hello");
    });
  });

  describe("array", () => {
    it("exports groupBy as a function", () => {
      expect(typeof groupBy).toBe("function");
    });

    it("groupBy works", () => {
      const items = [{ type: "a" }, { type: "b" }, { type: "a" }];
      const grouped = groupBy(items, (i) => i.type);
      expect(grouped["a"]).toHaveLength(2);
      expect(grouped["b"]).toHaveLength(1);
    });

    it("exports chunk as a function", () => {
      expect(typeof chunk).toBe("function");
    });

    it("chunk works", () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe("object", () => {
    it("exports pick as a function", () => {
      expect(typeof pick).toBe("function");
    });

    it("pick works", () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
    });

    it("exports omit as a function", () => {
      expect(typeof omit).toBe("function");
    });

    it("omit works", () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ["b"])).toEqual({ a: 1, c: 3 });
    });

    it("exports deepClone as a function", () => {
      expect(typeof deepClone).toBe("function");
    });

    it("deepClone produces a distinct copy", () => {
      const obj = { x: { y: 1 } };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    it("exports isEqual as a function", () => {
      expect(typeof isEqual).toBe("function");
    });

    it("isEqual returns true for equal plain objects", () => {
      expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
    });
  });

  describe("URL", () => {
    it("exports isValidUrl as a function", () => {
      expect(typeof isValidUrl).toBe("function");
    });

    it("isValidUrl accepts https URL", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("isValidUrl rejects empty string", () => {
      expect(isValidUrl("")).toBe(false);
    });

    it("exports joinPath as a function", () => {
      expect(typeof joinPath).toBe("function");
    });

    it("joinPath joins segments", () => {
      expect(joinPath("api", "users", "123")).toBe("api/users/123");
    });
  });

  describe("color", () => {
    it("exports hexToRgb as a function", () => {
      expect(typeof hexToRgb).toBe("function");
    });

    it("hexToRgb converts #ffffff", () => {
      expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    });

    it("exports isValidHex as a function", () => {
      expect(typeof isValidHex).toBe("function");
    });

    it("isValidHex accepts #fff", () => {
      expect(isValidHex("#fff")).toBe(true);
    });

    it("isValidHex accepts #123456", () => {
      expect(isValidHex("#123456")).toBe(true);
    });

    it("isValidHex rejects 'red'", () => {
      expect(isValidHex("red")).toBe(false);
    });

    it("exports getContrastRatio as a function", () => {
      expect(typeof getContrastRatio).toBe("function");
    });
  });

  describe("keyboard", () => {
    it("exports isMacPlatform as a function", () => {
      expect(typeof isMacPlatform).toBe("function");
    });

    it("isMacPlatform returns a boolean", () => {
      expect(typeof isMacPlatform()).toBe("boolean");
    });

    it("exports formatShortcut as a function", () => {
      expect(typeof formatShortcut).toBe("function");
    });
  });

  describe("media", () => {
    const jpeg = new File([""], "photo.jpg", { type: "image/jpeg" });
    const mp4 = new File([""], "clip.mp4", { type: "video/mp4" });
    const mp3 = new File([""], "song.mp3", { type: "audio/mpeg" });

    it("exports isImageFile as a function", () => {
      expect(typeof isImageFile).toBe("function");
    });

    it("isImageFile works via barrel", () => {
      expect(isImageFile(jpeg)).toBe(true);
    });

    it("exports isVideoFile as a function", () => {
      expect(typeof isVideoFile).toBe("function");
    });

    it("isVideoFile works via barrel", () => {
      expect(isVideoFile(mp4)).toBe(true);
    });

    it("exports isAudioFile as a function", () => {
      expect(typeof isAudioFile).toBe("function");
    });

    it("isAudioFile works via barrel", () => {
      expect(isAudioFile(mp3)).toBe(true);
    });

    it("exports getMediaType as a function", () => {
      expect(typeof getMediaType).toBe("function");
    });

    it("getMediaType returns 'image' via barrel", () => {
      expect(getMediaType(jpeg)).toBe("image");
    });

    it("exports calculateDisplayDimensions as a function", () => {
      expect(typeof calculateDisplayDimensions).toBe("function");
    });

    it("calculateDisplayDimensions works via barrel", () => {
      const dims = calculateDisplayDimensions(800, 600, 400, 300, "contain");
      expect(dims.width).toBe(400);
      expect(dims.height).toBe(300);
    });

    it("exports dataUrlToBlob as a function", () => {
      expect(typeof dataUrlToBlob).toBe("function");
    });
  });

  describe("crypto", () => {
    it("exports generateId as a function", () => {
      expect(typeof generateId).toBe("function");
    });

    it("generateId returns a non-empty string", () => {
      const id = generateId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("exports simpleHash as a function", () => {
      expect(typeof simpleHash).toBe("function");
    });

    it("simpleHash returns a string", () => {
      expect(typeof simpleHash("hello")).toBe("string");
    });

    it("exports base64Encode and base64Decode as functions", () => {
      expect(typeof base64Encode).toBe("function");
      expect(typeof base64Decode).toBe("function");
    });

    it("base64Encode round-trips through base64Decode", () => {
      const original = "test string";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });
  });
});
