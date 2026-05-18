/**
 * @fileoverview Tests for RTL (Right-to-Left) support
 *
 * Tests the RTL utilities including direction detection,
 * CSS helpers, and bidirectional text handling.
 */

import {
  isRTL,
  getDirection,
  getTextAlign,
  flipPosition,
  rtlClass,
  rtlStyles,
  rtlTransform,
  rtlFlexDirection,
  applyDocumentDirection,
  getRTLCSSVariables,
  rtlTailwind,
  isDocumentRTL,
  isolateBidi,
  logicalProperties,
} from "../rtl";

describe("rtl", () => {
  describe("isRTL", () => {
    it("should return true for Arabic", () => {
      expect(isRTL("ar")).toBe(true);
    });

    it("should return false for English", () => {
      expect(isRTL("en")).toBe(false);
    });

    it("should return false for Spanish", () => {
      expect(isRTL("es")).toBe(false);
    });

    it("should return false for French", () => {
      expect(isRTL("fr")).toBe(false);
    });

    it("should return false for German", () => {
      expect(isRTL("de")).toBe(false);
    });

    it("should return false for Chinese", () => {
      expect(isRTL("zh")).toBe(false);
    });

    it("should return false for Japanese", () => {
      expect(isRTL("ja")).toBe(false);
    });

    it("should return false for unknown locale", () => {
      expect(isRTL("unknown")).toBe(false);
    });
  });

  describe("getDirection", () => {
    it("should return rtl for Arabic", () => {
      expect(getDirection("ar")).toBe("rtl");
    });

    it("should return ltr for English", () => {
      expect(getDirection("en")).toBe("ltr");
    });

    it("should return ltr for Spanish", () => {
      expect(getDirection("es")).toBe("ltr");
    });

    it("should return ltr for French", () => {
      expect(getDirection("fr")).toBe("ltr");
    });

    it("should return ltr for German", () => {
      expect(getDirection("de")).toBe("ltr");
    });

    it("should return ltr for Chinese", () => {
      expect(getDirection("zh")).toBe("ltr");
    });

    it("should return ltr for Japanese", () => {
      expect(getDirection("ja")).toBe("ltr");
    });

    it("should return ltr for Portuguese", () => {
      expect(getDirection("pt")).toBe("ltr");
    });

    it("should return ltr for Russian", () => {
      expect(getDirection("ru")).toBe("ltr");
    });

    it("should return ltr for unknown locale", () => {
      expect(getDirection("unknown")).toBe("ltr");
    });
  });

  describe("getTextAlign", () => {
    it("should return center for center", () => {
      expect(getTextAlign("center", false)).toBe("center");
      expect(getTextAlign("center", true)).toBe("center");
    });

    it("should return left for start in LTR", () => {
      expect(getTextAlign("start", false)).toBe("left");
    });

    it("should return right for start in RTL", () => {
      expect(getTextAlign("start", true)).toBe("right");
    });

    it("should return right for end in LTR", () => {
      expect(getTextAlign("end", false)).toBe("right");
    });

    it("should return left for end in RTL", () => {
      expect(getTextAlign("end", true)).toBe("left");
    });

    it("should pass through left in LTR", () => {
      expect(getTextAlign("left", false)).toBe("left");
    });

    it("should pass through left in RTL", () => {
      expect(getTextAlign("left", true)).toBe("left");
    });

    it("should pass through right", () => {
      expect(getTextAlign("right", false)).toBe("right");
      expect(getTextAlign("right", true)).toBe("right");
    });
  });

  describe("flipPosition", () => {
    it("should not flip in LTR", () => {
      expect(flipPosition("left", false)).toBe("left");
      expect(flipPosition("right", false)).toBe("right");
    });

    it("should flip left to right in RTL", () => {
      expect(flipPosition("left", true)).toBe("right");
    });

    it("should flip right to left in RTL", () => {
      expect(flipPosition("right", true)).toBe("left");
    });
  });

  describe("rtlClass", () => {
    it("should return LTR class when not RTL", () => {
      expect(rtlClass("ml-4", "mr-4", false)).toBe("ml-4");
    });

    it("should return RTL class when RTL", () => {
      expect(rtlClass("ml-4", "mr-4", true)).toBe("mr-4");
    });
  });

  describe("rtlStyles", () => {
    it("should return LTR styles when not RTL", () => {
      const styles = rtlStyles(
        {
          common: { color: "black" },
          ltr: { marginLeft: 10 },
          rtl: { marginRight: 10 },
        },
        false,
      );

      expect(styles).toEqual({ color: "black", marginLeft: 10 });
    });

    it("should return RTL styles when RTL", () => {
      const styles = rtlStyles(
        {
          common: { color: "black" },
          ltr: { marginLeft: 10 },
          rtl: { marginRight: 10 },
        },
        true,
      );

      expect(styles).toEqual({ color: "black", marginRight: 10 });
    });

    it("should handle common styles only", () => {
      const styles = rtlStyles({ common: { padding: 5 } }, false);
      expect(styles).toEqual({ padding: 5 });
    });

    it("should handle empty styles", () => {
      const styles = rtlStyles({}, false);
      expect(styles).toEqual({});
    });
  });

  describe("rtlTransform", () => {
    it("should not modify transform in LTR", () => {
      expect(rtlTransform("translateX(10px)", false)).toBe("translateX(10px)");
    });

    it("should flip translateX in RTL", () => {
      expect(rtlTransform("translateX(10px)", true)).toBe("translateX(-10px)");
    });

    it("should flip negative translateX in RTL", () => {
      expect(rtlTransform("translateX(-10px)", true)).toBe("translateX(10px)");
    });

    it("should flip scaleX in RTL", () => {
      expect(rtlTransform("scaleX(1)", true)).toBe("scaleX(-1)");
    });

    it("should flip rotate in RTL", () => {
      expect(rtlTransform("rotate(45deg)", true)).toBe("rotate(-45deg)");
    });

    it("should handle multiple transforms", () => {
      const result = rtlTransform("translateX(10px) scaleX(1)", true);
      expect(result).toContain("translateX(-10px)");
      expect(result).toContain("scaleX(-1)");
    });

    it("should preserve non-flippable transforms", () => {
      const result = rtlTransform("translateY(10px)", true);
      expect(result).toBe("translateY(10px)");
    });
  });

  describe("rtlFlexDirection", () => {
    it("should not modify column directions", () => {
      expect(rtlFlexDirection("column", true)).toBe("column");
      expect(rtlFlexDirection("column-reverse", true)).toBe("column-reverse");
    });

    it("should flip row to row-reverse in RTL", () => {
      expect(rtlFlexDirection("row", true)).toBe("row-reverse");
    });

    it("should flip row-reverse to row in RTL", () => {
      expect(rtlFlexDirection("row-reverse", true)).toBe("row");
    });

    it("should not flip in LTR", () => {
      expect(rtlFlexDirection("row", false)).toBe("row");
      expect(rtlFlexDirection("row-reverse", false)).toBe("row-reverse");
    });
  });

  describe("applyDocumentDirection", () => {
    beforeEach(() => {
      document.documentElement.dir = "";
      document.documentElement.lang = "";
    });

    it("should set document direction for RTL locale", () => {
      applyDocumentDirection("ar");
      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("ar");
    });

    it("should set document direction for LTR locale", () => {
      applyDocumentDirection("en");
      expect(document.documentElement.dir).toBe("ltr");
      expect(document.documentElement.lang).toBe("en");
    });

    it("should update direction when locale changes", () => {
      applyDocumentDirection("en");
      expect(document.documentElement.dir).toBe("ltr");

      applyDocumentDirection("ar");
      expect(document.documentElement.dir).toBe("rtl");
    });
  });

  describe("getRTLCSSVariables", () => {
    it("should return LTR variables", () => {
      const vars = getRTLCSSVariables(false);
      expect(vars["--direction"]).toBe("ltr");
      expect(vars["--start"]).toBe("left");
      expect(vars["--end"]).toBe("right");
      expect(vars["--text-align"]).toBe("left");
      expect(vars["--flex-direction"]).toBe("row");
      expect(vars["--transform-scale-x"]).toBe("1");
    });

    it("should return RTL variables", () => {
      const vars = getRTLCSSVariables(true);
      expect(vars["--direction"]).toBe("rtl");
      expect(vars["--start"]).toBe("right");
      expect(vars["--end"]).toBe("left");
      expect(vars["--text-align"]).toBe("right");
      expect(vars["--flex-direction"]).toBe("row-reverse");
      expect(vars["--transform-scale-x"]).toBe("-1");
    });
  });

  describe("rtlTailwind", () => {
    it("should generate margin-left classes", () => {
      expect(rtlTailwind.ml("4")).toContain("ml-4");
      expect(rtlTailwind.ml("4")).toContain("rtl:mr-4");
    });

    it("should generate margin-right classes", () => {
      expect(rtlTailwind.mr("4")).toContain("mr-4");
      expect(rtlTailwind.mr("4")).toContain("rtl:ml-4");
    });

    it("should generate padding-left classes", () => {
      expect(rtlTailwind.pl("4")).toContain("pl-4");
      expect(rtlTailwind.pl("4")).toContain("rtl:pr-4");
    });

    it("should generate padding-right classes", () => {
      expect(rtlTailwind.pr("4")).toContain("pr-4");
      expect(rtlTailwind.pr("4")).toContain("rtl:pl-4");
    });

    it("should generate left position classes", () => {
      expect(rtlTailwind.left("0")).toContain("left-0");
      expect(rtlTailwind.left("0")).toContain("rtl:right-0");
    });

    it("should generate right position classes", () => {
      expect(rtlTailwind.right("0")).toContain("right-0");
      expect(rtlTailwind.right("0")).toContain("rtl:left-0");
    });

    it("should generate border-left classes", () => {
      expect(rtlTailwind.borderL("2")).toContain("border-l-2");
      expect(rtlTailwind.borderL("2")).toContain("rtl:border-r-2");
    });

    it("should generate border-right classes", () => {
      expect(rtlTailwind.borderR("2")).toContain("border-r-2");
      expect(rtlTailwind.borderR("2")).toContain("rtl:border-l-2");
    });

    it("should generate rounded corner classes", () => {
      expect(rtlTailwind.roundedL("lg")).toContain("rounded-l-lg");
      expect(rtlTailwind.roundedR("lg")).toContain("rounded-r-lg");
    });

    it("should have text alignment classes", () => {
      expect(rtlTailwind.textLeft).toContain("text-left");
      expect(rtlTailwind.textLeft).toContain("rtl:text-right");
      expect(rtlTailwind.textRight).toContain("text-right");
      expect(rtlTailwind.textRight).toContain("rtl:text-left");
    });

    it("should have flip class", () => {
      expect(rtlTailwind.flipX).toContain("scale-x-100");
      expect(rtlTailwind.flipX).toContain("rtl:-scale-x-100");
    });
  });

  describe("isDocumentRTL", () => {
    it("should return false by default", () => {
      document.documentElement.dir = "";
      expect(isDocumentRTL()).toBe(false);
    });

    it("should return true when document is RTL", () => {
      document.documentElement.dir = "rtl";
      expect(isDocumentRTL()).toBe(true);
    });

    it("should return false when document is LTR", () => {
      document.documentElement.dir = "ltr";
      expect(isDocumentRTL()).toBe(false);
    });
  });

  describe("isolateBidi", () => {
    it("should isolate text with LTR direction", () => {
      const result = isolateBidi("Hello", "ltr");
      expect(result).toContain("\u2066"); // LRI
      expect(result).toContain("\u2069"); // PDI
      expect(result).toContain("Hello");
    });

    it("should isolate text with RTL direction", () => {
      const result = isolateBidi("مرحبا", "rtl");
      expect(result).toContain("\u2067"); // RLI
      expect(result).toContain("\u2069"); // PDI
    });

    it("should isolate text with auto direction", () => {
      const result = isolateBidi("Hello", "auto");
      expect(result).toContain("\u2068"); // FSI
      expect(result).toContain("\u2069"); // PDI
    });

    it("should default to auto direction", () => {
      const result = isolateBidi("Hello");
      expect(result).toContain("\u2068"); // FSI
    });
  });

  describe("logicalProperties", () => {
    it("should map marginLeft to marginInlineStart", () => {
      expect(logicalProperties.marginLeft).toBe("marginInlineStart");
    });

    it("should map marginRight to marginInlineEnd", () => {
      expect(logicalProperties.marginRight).toBe("marginInlineEnd");
    });

    it("should map paddingLeft to paddingInlineStart", () => {
      expect(logicalProperties.paddingLeft).toBe("paddingInlineStart");
    });

    it("should map paddingRight to paddingInlineEnd", () => {
      expect(logicalProperties.paddingRight).toBe("paddingInlineEnd");
    });

    it("should map borderLeft to borderInlineStart", () => {
      expect(logicalProperties.borderLeft).toBe("borderInlineStart");
    });

    it("should map borderRight to borderInlineEnd", () => {
      expect(logicalProperties.borderRight).toBe("borderInlineEnd");
    });

    it("should map left to insetInlineStart", () => {
      expect(logicalProperties.left).toBe("insetInlineStart");
    });

    it("should map right to insetInlineEnd", () => {
      expect(logicalProperties.right).toBe("insetInlineEnd");
    });

    it("should map width to inlineSize", () => {
      expect(logicalProperties.width).toBe("inlineSize");
    });

    it("should map height to blockSize", () => {
      expect(logicalProperties.height).toBe("blockSize");
    });

    it("should map border radius properties", () => {
      expect(logicalProperties.borderTopLeftRadius).toBe(
        "borderStartStartRadius",
      );
      expect(logicalProperties.borderTopRightRadius).toBe(
        "borderStartEndRadius",
      );
      expect(logicalProperties.borderBottomLeftRadius).toBe(
        "borderEndStartRadius",
      );
      expect(logicalProperties.borderBottomRightRadius).toBe(
        "borderEndEndRadius",
      );
    });
  });
});
