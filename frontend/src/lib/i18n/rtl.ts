/**
 * RTL (Right-to-Left) Support
 *
 * Utilities for handling RTL languages like Arabic and Hebrew.
 */

import { RTL_LOCALES, SUPPORTED_LOCALES, type LocaleCode } from "./locales";

/**
 * Check if a locale is RTL
 */
export function isRTL(localeCode: string): boolean {
  return RTL_LOCALES.includes(localeCode);
}

/**
 * Get text direction for a locale
 */
export function getDirection(localeCode: string): "ltr" | "rtl" {
  const config = SUPPORTED_LOCALES[localeCode];
  return config?.direction || "ltr";
}

/**
 * CSS logical property mappings for RTL support
 * Maps physical properties to logical properties for CSS-in-JS
 */
export const logicalProperties = {
  // Margins
  marginLeft: "marginInlineStart",
  marginRight: "marginInlineEnd",
  // Paddings
  paddingLeft: "paddingInlineStart",
  paddingRight: "paddingInlineEnd",
  // Borders
  borderLeft: "borderInlineStart",
  borderRight: "borderInlineEnd",
  borderLeftWidth: "borderInlineStartWidth",
  borderRightWidth: "borderInlineEndWidth",
  borderLeftColor: "borderInlineStartColor",
  borderRightColor: "borderInlineEndColor",
  borderLeftStyle: "borderInlineStartStyle",
  borderRightStyle: "borderInlineEndStyle",
  // Border radius
  borderTopLeftRadius: "borderStartStartRadius",
  borderTopRightRadius: "borderStartEndRadius",
  borderBottomLeftRadius: "borderEndStartRadius",
  borderBottomRightRadius: "borderEndEndRadius",
  // Position
  left: "insetInlineStart",
  right: "insetInlineEnd",
  // Size
  width: "inlineSize",
  height: "blockSize",
  minWidth: "minInlineSize",
  maxWidth: "maxInlineSize",
  minHeight: "minBlockSize",
  maxHeight: "maxBlockSize",
  // Text
  textAlign: "textAlign", // Use 'start' and 'end' values
} as const;

/**
 * Get RTL-aware value for text-align
 */
export function getTextAlign(
  align: "left" | "right" | "center" | "start" | "end",
  isRtl: boolean = false,
): "left" | "right" | "center" {
  if (align === "center") return "center";
  if (align === "start") return isRtl ? "right" : "left";
  if (align === "end") return isRtl ? "left" : "right";
  return align;
}

/**
 * Flip a horizontal position for RTL
 */
export function flipPosition(
  position: "left" | "right",
  isRtl: boolean = false,
): "left" | "right" {
  if (!isRtl) return position;
  return position === "left" ? "right" : "left";
}

/**
 * RTL-aware CSS class helper
 * Returns appropriate class based on direction
 */
export function rtlClass(
  ltrClass: string,
  rtlClass: string,
  isRtl: boolean,
): string {
  return isRtl ? rtlClass : ltrClass;
}

/**
 * Generate RTL-aware inline styles
 */
export function rtlStyles(
  styles: {
    ltr?: React.CSSProperties;
    rtl?: React.CSSProperties;
    common?: React.CSSProperties;
  },
  isRtl: boolean,
): React.CSSProperties {
  return {
    ...styles.common,
    ...(isRtl ? styles.rtl : styles.ltr),
  };
}

/**
 * RTL-aware transform helper
 */
export function rtlTransform(transform: string, isRtl: boolean): string {
  if (!isRtl) return transform;

  // Flip scaleX and translateX values
  return transform
    .replace(/scaleX\(([^)]+)\)/g, (_, value) => {
      const num = parseFloat(value);
      return `scaleX(${-num})`;
    })
    .replace(/translateX\(([^)]+)\)/g, (_, value) => {
      const match = value.match(/^(-?\d+(?:\.\d+)?)(.*)/);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2];
        return `translateX(${-num}${unit})`;
      }
      return `translateX(${value})`;
    })
    .replace(/rotate\(([^)]+)\)/g, (_, value) => {
      const match = value.match(/^(-?\d+(?:\.\d+)?)(.*)/);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2];
        return `rotate(${-num}${unit})`;
      }
      return `rotate(${value})`;
    });
}

/**
 * RTL-aware flexbox direction
 */
export function rtlFlexDirection(
  direction: "row" | "row-reverse" | "column" | "column-reverse",
  isRtl: boolean,
): "row" | "row-reverse" | "column" | "column-reverse" {
  if (!isRtl) return direction;

  switch (direction) {
    case "row":
      return "row-reverse";
    case "row-reverse":
      return "row";
    default:
      return direction;
  }
}

/**
 * Apply direction attribute to document
 */
export function applyDocumentDirection(localeCode: string): void {
  if (typeof document === "undefined") return;

  const direction = getDirection(localeCode);
  document.documentElement.dir = direction;
  document.documentElement.lang = localeCode;
}

/**
 * Get CSS custom properties for RTL support
 */
export function getRTLCSSVariables(isRtl: boolean): Record<string, string> {
  return {
    "--direction": isRtl ? "rtl" : "ltr",
    "--start": isRtl ? "right" : "left",
    "--end": isRtl ? "left" : "right",
    "--text-align": isRtl ? "right" : "left",
    "--flex-direction": isRtl ? "row-reverse" : "row",
    "--transform-scale-x": isRtl ? "-1" : "1",
  };
}

/**
 * Tailwind CSS class helpers for RTL
 * Returns classes with RTL variants
 */
export const rtlTailwind = {
  // Margins
  ml: (value: string) => `ml-${value} rtl:mr-${value} rtl:ml-0`,
  mr: (value: string) => `mr-${value} rtl:ml-${value} rtl:mr-0`,
  // Paddings
  pl: (value: string) => `pl-${value} rtl:pr-${value} rtl:pl-0`,
  pr: (value: string) => `pr-${value} rtl:pl-${value} rtl:pr-0`,
  // Positions
  left: (value: string) => `left-${value} rtl:right-${value} rtl:left-auto`,
  right: (value: string) => `right-${value} rtl:left-${value} rtl:right-auto`,
  // Borders
  borderL: (value: string) =>
    `border-l-${value} rtl:border-r-${value} rtl:border-l-0`,
  borderR: (value: string) =>
    `border-r-${value} rtl:border-l-${value} rtl:border-r-0`,
  // Border radius
  roundedL: (value: string) =>
    `rounded-l-${value} rtl:rounded-r-${value} rtl:rounded-l-none`,
  roundedR: (value: string) =>
    `rounded-r-${value} rtl:rounded-l-${value} rtl:rounded-r-none`,
  roundedTl: (value: string) =>
    `rounded-tl-${value} rtl:rounded-tr-${value} rtl:rounded-tl-none`,
  roundedTr: (value: string) =>
    `rounded-tr-${value} rtl:rounded-tl-${value} rtl:rounded-tr-none`,
  roundedBl: (value: string) =>
    `rounded-bl-${value} rtl:rounded-br-${value} rtl:rounded-bl-none`,
  roundedBr: (value: string) =>
    `rounded-br-${value} rtl:rounded-bl-${value} rtl:rounded-br-none`,
  // Text alignment
  textLeft: "text-left rtl:text-right",
  textRight: "text-right rtl:text-left",
  // Transforms
  flipX: "scale-x-100 rtl:-scale-x-100",
};

/**
 * Check if the current document direction is RTL
 */
export function isDocumentRTL(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dir === "rtl";
}

/**
 * Bidirectional text isolation helper
 * Wraps text in a span with dir attribute to isolate it from surrounding text
 */
export function isolateBidi(
  text: string,
  direction: "ltr" | "rtl" | "auto" = "auto",
): string {
  // Unicode directional isolate characters
  const LRI = "\u2066"; // Left-to-Right Isolate
  const RLI = "\u2067"; // Right-to-Left Isolate
  const FSI = "\u2068"; // First Strong Isolate (auto)
  const PDI = "\u2069"; // Pop Directional Isolate

  const startChar = direction === "ltr" ? LRI : direction === "rtl" ? RLI : FSI;
  return `${startChar}${text}${PDI}`;
}
