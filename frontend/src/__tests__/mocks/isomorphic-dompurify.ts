/**
 * Isomorphic DOMPurify Mock for Jest Tests
 *
 * Mocks the isomorphic-dompurify package to avoid ESM compatibility issues
 */

// Default allowed tags (similar to DOMPurify defaults)
const defaultAllowedTags = [
  "a",
  "abbr",
  "address",
  "article",
  "aside",
  "b",
  "bdi",
  "bdo",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "dd",
  "del",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "main",
  "mark",
  "nav",
  "ol",
  "p",
  "pre",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
  "wbr",
];

interface SanitizeConfig {
  allowTags?: string[];
  ALLOWED_TAGS?: string[];
  ADD_TAGS?: string[];
  FORBID_TAGS?: string[];
}

// Mock sanitize function - mimics DOMPurify behavior
const sanitize = jest.fn((dirty: string, config?: SanitizeConfig) => {
  if (!dirty) return "";

  // Determine allowed tags
  let allowedTags = defaultAllowedTags;
  if (config?.allowTags) {
    allowedTags = [...defaultAllowedTags, ...config.allowTags];
  }
  if (config?.ALLOWED_TAGS) {
    allowedTags = config.ALLOWED_TAGS;
  }
  if (config?.ADD_TAGS) {
    allowedTags = [...allowedTags, ...config.ADD_TAGS];
  }
  if (config?.FORBID_TAGS) {
    allowedTags = allowedTags.filter(
      (tag) => !config.FORBID_TAGS?.includes(tag),
    );
  }

  let result = dirty;

  // Always remove dangerous tags
  result = result
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove dangerous URL schemes
  result = result.replace(/javascript\s*:/gi, "");
  result = result.replace(/vbscript\s*:/gi, "");

  // Remove data: URLs (commonly used for XSS)
  result = result.replace(/href\s*=\s*["']?\s*data:/gi, 'href="');
  result = result.replace(/src\s*=\s*["']?\s*data:/gi, 'src="');

  // Remove event handlers (completely strip the attribute and value)
  result = result.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  result = result.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");

  // Remove tags not in allowed list (video, audio, embed, object, iframe by default)
  const disallowedTags = [
    "video",
    "audio",
    "embed",
    "object",
    "iframe",
    "form",
    "input",
    "button",
  ];
  for (const tag of disallowedTags) {
    if (!allowedTags.includes(tag)) {
      // Remove opening tags (self-closing and paired)
      result = result.replace(
        new RegExp(`<${tag}\\b[^>]*(?:/>|>[^<]*</${tag}>|>)`, "gi"),
        "",
      );
      // Remove any remaining closing tags
      result = result.replace(new RegExp(`</${tag}>`, "gi"), "");
    }
  }

  return result;
});

// Mock isValidAttribute function
const isValidAttribute = jest.fn(
  (_tag: string, _attr: string, _value: string) => true,
);

// Mock setConfig function
const setConfig = jest.fn((_config: unknown) => {});

// Mock clearConfig function
const clearConfig = jest.fn(() => {});

// Mock addHook function
const addHook = jest.fn(
  (
    _entryPoint: string,
    _hookFunction: (node: unknown, data: unknown) => unknown,
  ) => {},
);

// Mock removeHook function
const removeHook = jest.fn((_entryPoint: string) => {});

// Mock removeHooks function
const removeHooks = jest.fn((_entryPoint: string) => {});

// Mock removeAllHooks function
const removeAllHooks = jest.fn(() => {});

// DOMPurify-like interface
const DOMPurify = {
  sanitize,
  isValidAttribute,
  setConfig,
  clearConfig,
  addHook,
  removeHook,
  removeHooks,
  removeAllHooks,
  isSupported: true,
  version: "3.0.0-mock",
};

export default DOMPurify;
export {
  sanitize,
  isValidAttribute,
  setConfig,
  clearConfig,
  addHook,
  removeHook,
  removeHooks,
  removeAllHooks,
};
