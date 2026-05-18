/**
 * Document Preview Service
 *
 * Provides configuration and utilities for previewing various document types
 * including PDFs, code files, office documents, and plain text.
 * Platform-aware: adapts preview capabilities based on the active skin preset.
 */

import type { PlatformPreset } from "./media-parity";

// ============================================================================
// Types
// ============================================================================

export type DocumentType =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "text"
  | "markdown"
  | "csv"
  | "code"
  | "json"
  | "xml"
  | "rtf"
  | "unknown";

export type PreviewMode =
  | "native" // Browser native rendering (PDF, text)
  | "rendered" // Rendered preview (markdown, code with syntax highlighting)
  | "thumbnail" // Static thumbnail/first page
  | "metadata" // Show file metadata only
  | "external" // External service (Google Docs viewer, etc.)
  | "none"; // No preview available

export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"
  | "ruby"
  | "php"
  | "swift"
  | "kotlin"
  | "html"
  | "css"
  | "scss"
  | "json"
  | "xml"
  | "yaml"
  | "sql"
  | "bash"
  | "markdown"
  | "plaintext";

export interface DocumentPreviewConfig {
  /** Document type classification */
  documentType: DocumentType;
  /** How the preview should be rendered */
  previewMode: PreviewMode;
  /** Whether the document can be previewed inline */
  canPreviewInline: boolean;
  /** Whether the document can be rendered in full */
  canRenderFull: boolean;
  /** Icon name for the document type */
  icon: string;
  /** Label for the document type */
  label: string;
  /** Color associated with the document type */
  color: string;
  /** Code language for syntax highlighting (if applicable) */
  codeLanguage: CodeLanguage | null;
  /** Maximum file size for inline preview (bytes) */
  maxPreviewSize: number;
  /** Whether text content can be selected/copied */
  selectable: boolean;
  /** Whether the file can be searched within */
  searchable: boolean;
  /** Number of lines to show in compact preview */
  compactPreviewLines: number;
  /** Whether page navigation is available */
  paginatable: boolean;
}

export interface DocumentPreviewResult {
  /** Whether preview generation was successful */
  success: boolean;
  /** The preview content (text, HTML, or URL) */
  content: string | null;
  /** Content type of the preview */
  contentType: "text" | "html" | "url" | "image";
  /** Detected language (for code files) */
  language: CodeLanguage | null;
  /** Number of lines in the content */
  lineCount: number;
  /** Number of pages (for paginated documents) */
  pageCount: number;
  /** File encoding detected */
  encoding: string;
  /** Error message if preview failed */
  error: string | null;
  /** Metadata extracted from the document */
  metadata: DocPreviewMetadata;
}

export interface DocPreviewMetadata {
  title: string | null;
  author: string | null;
  createdDate: string | null;
  modifiedDate: string | null;
  pageCount: number | null;
  wordCount: number | null;
  characterCount: number | null;
  lineCount: number | null;
  language: string | null;
  encoding: string | null;
  fileSize: number;
}

export interface PDFPreviewConfig {
  /** Render mode for PDF */
  renderMode: "canvas" | "svg" | "text";
  /** Default zoom level (1.0 = 100%) */
  defaultZoom: number;
  /** Minimum zoom level */
  minZoom: number;
  /** Maximum zoom level */
  maxZoom: number;
  /** Whether to show page thumbnails sidebar */
  showThumbnails: boolean;
  /** Whether to enable text selection */
  enableTextSelection: boolean;
  /** Whether to show annotation tools */
  enableAnnotations: boolean;
  /** Maximum pages to render at once (for performance) */
  maxRenderedPages: number;
  /** Page fit mode */
  fitMode: "width" | "height" | "page" | "auto";
  /** Whether to show search bar */
  enableSearch: boolean;
  /** Whether to show print button */
  enablePrint: boolean;
}

export interface CodePreviewConfig {
  /** Theme for syntax highlighting */
  theme: "light" | "dark" | "auto";
  /** Whether to show line numbers */
  showLineNumbers: boolean;
  /** Whether to enable line wrapping */
  wordWrap: boolean;
  /** Tab size for indentation */
  tabSize: number;
  /** Whether to show minimap */
  showMinimap: boolean;
  /** Maximum lines to render */
  maxLines: number;
  /** Whether to highlight current line */
  highlightActiveLine: boolean;
  /** Whether to show invisible characters */
  showInvisibles: boolean;
  /** Font size in pixels */
  fontSize: number;
  /** Font family */
  fontFamily: string;
}

export interface OfficePreviewConfig {
  /** Preview provider */
  provider: "native" | "google" | "microsoft" | "libreoffice" | "none";
  /** Google Docs viewer URL template */
  googleViewerUrl: string;
  /** Microsoft Office Online viewer URL template */
  microsoftViewerUrl: string;
  /** Maximum file size for online preview (bytes) */
  maxOnlinePreviewSize: number;
  /** Whether to show document outline/TOC */
  showOutline: boolean;
  /** Whether to show comments */
  showComments: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_TEXT_PREVIEW_SIZE = 5 * 1024 * 1024; // 5MB for text preview
const MAX_CODE_PREVIEW_SIZE = 2 * 1024 * 1024; // 2MB for code preview
const MAX_PDF_PREVIEW_SIZE = 50 * 1024 * 1024; // 50MB for PDF preview
const MAX_OFFICE_PREVIEW_SIZE = 25 * 1024 * 1024; // 25MB for office preview

const COMPACT_PREVIEW_LINES = 20;
const FULL_PREVIEW_MAX_LINES = 10000;

/** Map file extensions to document types */
export const EXTENSION_TO_DOCUMENT_TYPE: Record<string, DocumentType> = {
  pdf: "pdf",
  doc: "word",
  docx: "word",
  odt: "word",
  xls: "excel",
  xlsx: "excel",
  ods: "excel",
  csv: "csv",
  ppt: "powerpoint",
  pptx: "powerpoint",
  odp: "powerpoint",
  txt: "text",
  log: "text",
  md: "markdown",
  markdown: "markdown",
  rtf: "rtf",
  json: "json",
  xml: "xml",
  html: "code",
  htm: "code",
  css: "code",
  scss: "code",
  sass: "code",
  less: "code",
  js: "code",
  jsx: "code",
  ts: "code",
  tsx: "code",
  py: "code",
  rb: "code",
  java: "code",
  c: "code",
  cpp: "code",
  h: "code",
  hpp: "code",
  cs: "code",
  go: "code",
  rs: "code",
  swift: "code",
  kt: "code",
  php: "code",
  sh: "code",
  bash: "code",
  zsh: "code",
  sql: "code",
  yaml: "code",
  yml: "code",
  toml: "code",
  ini: "code",
  cfg: "code",
  conf: "code",
  env: "code",
  dockerfile: "code",
  makefile: "code",
  cmake: "code",
  r: "code",
  lua: "code",
  perl: "code",
  scala: "code",
  clj: "code",
  ex: "code",
  exs: "code",
  dart: "code",
  vue: "code",
  svelte: "code",
};

/** Map file extensions to code languages */
export const EXTENSION_TO_LANGUAGE: Record<string, CodeLanguage> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  swift: "swift",
  kt: "kotlin",
  php: "php",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  json: "json",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  md: "markdown",
  markdown: "markdown",
  txt: "plaintext",
  log: "plaintext",
};

/** MIME type to document type mapping */
export const MIME_TO_DOCUMENT_TYPE: Record<string, DocumentType> = {
  "application/pdf": "pdf",
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "word",
  "application/vnd.oasis.opendocument.text": "word",
  "application/vnd.ms-excel": "excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
  "application/vnd.oasis.opendocument.spreadsheet": "excel",
  "text/csv": "csv",
  "application/vnd.ms-powerpoint": "powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "powerpoint",
  "application/vnd.oasis.opendocument.presentation": "powerpoint",
  "text/plain": "text",
  "text/markdown": "markdown",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "application/json": "json",
  "application/xml": "xml",
  "text/xml": "xml",
  "text/html": "code",
  "text/css": "code",
  "text/javascript": "code",
  "application/javascript": "code",
  "application/typescript": "code",
  "text/x-python": "code",
  "text/x-java-source": "code",
};

/** Document type icon and color mapping */
export const DOCUMENT_TYPE_STYLES: Record<
  DocumentType,
  { icon: string; label: string; color: string }
> = {
  pdf: { icon: "FileText", label: "PDF Document", color: "#F44336" },
  word: { icon: "FileText", label: "Word Document", color: "#2196F3" },
  excel: { icon: "Table", label: "Spreadsheet", color: "#4CAF50" },
  powerpoint: { icon: "Presentation", label: "Presentation", color: "#FF5722" },
  text: { icon: "FileText", label: "Text File", color: "#607D8B" },
  markdown: { icon: "FileText", label: "Markdown", color: "#607D8B" },
  csv: { icon: "Table", label: "CSV File", color: "#4CAF50" },
  code: { icon: "Code", label: "Source Code", color: "#FFC107" },
  json: { icon: "Code", label: "JSON", color: "#FFC107" },
  xml: { icon: "Code", label: "XML", color: "#FF9800" },
  rtf: { icon: "FileText", label: "Rich Text", color: "#2196F3" },
  unknown: { icon: "File", label: "Document", color: "#9E9E9E" },
};

// ============================================================================
// Document Type Detection
// ============================================================================

/**
 * Detect document type from file extension
 */
export function getDocumentTypeFromExtension(filename: string): DocumentType {
  const ext = filename.toLowerCase().split(".").pop() || "";
  return EXTENSION_TO_DOCUMENT_TYPE[ext] || "unknown";
}

/**
 * Detect document type from MIME type
 */
export function getDocumentTypeFromMime(mimeType: string): DocumentType {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  return MIME_TO_DOCUMENT_TYPE[normalized] || "unknown";
}

/**
 * Detect document type from either MIME type or filename
 */
export function detectDocumentType(
  mimeType: string,
  filename: string,
): DocumentType {
  // Try MIME type first
  const mimeResult = getDocumentTypeFromMime(mimeType);
  if (mimeResult !== "unknown") return mimeResult;

  // Fall back to extension
  return getDocumentTypeFromExtension(filename);
}

/**
 * Get code language from filename
 */
export function getCodeLanguage(filename: string): CodeLanguage {
  const ext = filename.toLowerCase().split(".").pop() || "";
  return EXTENSION_TO_LANGUAGE[ext] || "plaintext";
}

// ============================================================================
// Preview Configuration
// ============================================================================

/**
 * Get preview configuration for a document
 */
export function getDocumentPreviewConfig(
  mimeType: string,
  filename: string,
  fileSize: number,
): DocumentPreviewConfig {
  const docType = detectDocumentType(mimeType, filename);
  const style = DOCUMENT_TYPE_STYLES[docType];
  const language = docType === "code" ? getCodeLanguage(filename) : null;

  switch (docType) {
    case "pdf":
      return {
        documentType: "pdf",
        previewMode: fileSize <= MAX_PDF_PREVIEW_SIZE ? "native" : "thumbnail",
        canPreviewInline: true,
        canRenderFull: fileSize <= MAX_PDF_PREVIEW_SIZE,
        icon: style.icon,
        label: style.label,
        color: style.color,
        codeLanguage: null,
        maxPreviewSize: MAX_PDF_PREVIEW_SIZE,
        selectable: true,
        searchable: true,
        compactPreviewLines: 1, // First page
        paginatable: true,
      };

    case "code":
    case "json":
    case "xml":
      return {
        documentType: docType,
        previewMode:
          fileSize <= MAX_CODE_PREVIEW_SIZE ? "rendered" : "metadata",
        canPreviewInline: fileSize <= MAX_CODE_PREVIEW_SIZE,
        canRenderFull: fileSize <= MAX_CODE_PREVIEW_SIZE,
        icon: style.icon,
        label: style.label,
        color: style.color,
        codeLanguage:
          language ||
          (docType === "json"
            ? "json"
            : docType === "xml"
              ? "xml"
              : "plaintext"),
        maxPreviewSize: MAX_CODE_PREVIEW_SIZE,
        selectable: true,
        searchable: true,
        compactPreviewLines: COMPACT_PREVIEW_LINES,
        paginatable: false,
      };

    case "text":
    case "csv":
      return {
        documentType: docType,
        previewMode: fileSize <= MAX_TEXT_PREVIEW_SIZE ? "native" : "metadata",
        canPreviewInline: fileSize <= MAX_TEXT_PREVIEW_SIZE,
        canRenderFull: fileSize <= MAX_TEXT_PREVIEW_SIZE,
        icon: style.icon,
        label: style.label,
        color: style.color,
        codeLanguage: null,
        maxPreviewSize: MAX_TEXT_PREVIEW_SIZE,
        selectable: true,
        searchable: true,
        compactPreviewLines: COMPACT_PREVIEW_LINES,
        paginatable: false,
      };

    case "markdown":
      return {
        documentType: "markdown",
        previewMode:
          fileSize <= MAX_TEXT_PREVIEW_SIZE ? "rendered" : "metadata",
        canPreviewInline: fileSize <= MAX_TEXT_PREVIEW_SIZE,
        canRenderFull: fileSize <= MAX_TEXT_PREVIEW_SIZE,
        icon: style.icon,
        label: style.label,
        color: style.color,
        codeLanguage: "markdown",
        maxPreviewSize: MAX_TEXT_PREVIEW_SIZE,
        selectable: true,
        searchable: true,
        compactPreviewLines: COMPACT_PREVIEW_LINES,
        paginatable: false,
      };

    case "word":
    case "powerpoint":
    case "rtf":
      return {
        documentType: docType,
        previewMode:
          fileSize <= MAX_OFFICE_PREVIEW_SIZE ? "external" : "metadata",
        canPreviewInline: false,
        canRenderFull: false,
        icon: style.icon,
        label: style.label,
        color: style.color,
        codeLanguage: null,
        maxPreviewSize: MAX_OFFICE_PREVIEW_SIZE,
        selectable: false,
        searchable: false,
        compactPreviewLines: 0,
        paginatable: docType !== "rtf",
      };

    case "excel":
      return {
        documentType: "excel",
        previewMode:
          fileSize <= MAX_OFFICE_PREVIEW_SIZE ? "external" : "metadata",
        canPreviewInline: false,
        canRenderFull: false,
        icon: style.icon,
        label: style.label,
        color: style.color,
        codeLanguage: null,
        maxPreviewSize: MAX_OFFICE_PREVIEW_SIZE,
        selectable: false,
        searchable: false,
        compactPreviewLines: 0,
        paginatable: true,
      };

    default:
      return {
        documentType: "unknown",
        previewMode: "metadata",
        canPreviewInline: false,
        canRenderFull: false,
        icon: "File",
        label: "Document",
        color: "#9E9E9E",
        codeLanguage: null,
        maxPreviewSize: 0,
        selectable: false,
        searchable: false,
        compactPreviewLines: 0,
        paginatable: false,
      };
  }
}

// ============================================================================
// Preview Capability Checks
// ============================================================================

/**
 * Check if a document can be previewed
 */
export function canPreviewDocument(
  mimeType: string,
  filename: string,
  fileSize: number,
): boolean {
  const config = getDocumentPreviewConfig(mimeType, filename, fileSize);
  return config.previewMode !== "metadata" && config.previewMode !== "none";
}

/**
 * Get preview capabilities for a document
 */
export function getPreviewCapabilities(
  mimeType: string,
  filename: string,
  fileSize: number,
): {
  canPreview: boolean;
  canSearch: boolean;
  canSelect: boolean;
  canPaginate: boolean;
  previewMode: PreviewMode;
  language: CodeLanguage | null;
} {
  const config = getDocumentPreviewConfig(mimeType, filename, fileSize);
  return {
    canPreview:
      config.previewMode !== "metadata" && config.previewMode !== "none",
    canSearch: config.searchable,
    canSelect: config.selectable,
    canPaginate: config.paginatable,
    previewMode: config.previewMode,
    language: config.codeLanguage,
  };
}

/**
 * Check if a file is a code file
 */
export function isCodeFile(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop() || "";
  return EXTENSION_TO_DOCUMENT_TYPE[ext] === "code";
}

/**
 * Check if a file is a text-based file that can be read as text
 */
export function isTextBasedFile(mimeType: string, filename: string): boolean {
  const docType = detectDocumentType(mimeType, filename);
  return ["text", "code", "json", "xml", "markdown", "csv"].includes(docType);
}

// ============================================================================
// PDF Preview Configuration
// ============================================================================

/**
 * Get default PDF preview configuration
 */
export function getDefaultPDFConfig(): PDFPreviewConfig {
  return {
    renderMode: "canvas",
    defaultZoom: 1.0,
    minZoom: 0.25,
    maxZoom: 5.0,
    showThumbnails: true,
    enableTextSelection: true,
    enableAnnotations: false,
    maxRenderedPages: 10,
    fitMode: "width",
    enableSearch: true,
    enablePrint: true,
  };
}

/**
 * Get PDF config adjusted for platform
 */
export function getPlatformPDFConfig(
  platform: PlatformPreset,
): PDFPreviewConfig {
  const base = getDefaultPDFConfig();

  switch (platform) {
    case "whatsapp":
      return {
        ...base,
        showThumbnails: false,
        enableAnnotations: false,
        maxRenderedPages: 5,
        fitMode: "width",
      };
    case "telegram":
      return {
        ...base,
        showThumbnails: true,
        maxRenderedPages: 20,
        enableSearch: true,
      };
    case "discord":
      return {
        ...base,
        showThumbnails: false,
        maxRenderedPages: 3,
        enableTextSelection: false,
        enableSearch: false,
        enablePrint: false,
      };
    case "slack":
      return {
        ...base,
        showThumbnails: true,
        maxRenderedPages: 15,
        enableSearch: true,
        enablePrint: true,
      };
    default:
      return base;
  }
}

// ============================================================================
// Code Preview Configuration
// ============================================================================

/**
 * Get default code preview configuration
 */
export function getDefaultCodeConfig(): CodePreviewConfig {
  return {
    theme: "auto",
    showLineNumbers: true,
    wordWrap: false,
    tabSize: 2,
    showMinimap: false,
    maxLines: FULL_PREVIEW_MAX_LINES,
    highlightActiveLine: true,
    showInvisibles: false,
    fontSize: 13,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Source Code Pro', monospace",
  };
}

/**
 * Get code config adjusted for platform
 */
export function getPlatformCodeConfig(
  platform: PlatformPreset,
): CodePreviewConfig {
  const base = getDefaultCodeConfig();

  switch (platform) {
    case "whatsapp":
      return {
        ...base,
        showLineNumbers: false,
        maxLines: 50,
        showMinimap: false,
        fontSize: 12,
      };
    case "telegram":
      return {
        ...base,
        showLineNumbers: true,
        maxLines: 200,
        wordWrap: true,
      };
    case "discord":
      return {
        ...base,
        theme: "dark",
        showLineNumbers: true,
        maxLines: 100,
        fontSize: 14,
      };
    case "slack":
      return {
        ...base,
        showLineNumbers: true,
        maxLines: 500,
        showMinimap: true,
      };
    default:
      return base;
  }
}

// ============================================================================
// Office Document Preview Configuration
// ============================================================================

/**
 * Get default office preview configuration
 */
export function getDefaultOfficeConfig(): OfficePreviewConfig {
  return {
    provider: "google",
    googleViewerUrl: "https://docs.google.com/gview?url={url}&embedded=true",
    microsoftViewerUrl:
      "https://view.officeapps.live.com/op/embed.aspx?src={url}",
    maxOnlinePreviewSize: MAX_OFFICE_PREVIEW_SIZE,
    showOutline: true,
    showComments: false,
  };
}

/**
 * Generate an office document preview URL
 */
export function getOfficePreviewUrl(
  fileUrl: string,
  config?: Partial<OfficePreviewConfig>,
): string | null {
  const mergedConfig = { ...getDefaultOfficeConfig(), ...config };
  const encodedUrl = encodeURIComponent(fileUrl);

  switch (mergedConfig.provider) {
    case "google":
      return mergedConfig.googleViewerUrl.replace("{url}", encodedUrl);
    case "microsoft":
      return mergedConfig.microsoftViewerUrl.replace("{url}", encodedUrl);
    case "none":
      return null;
    default:
      return null;
  }
}

// ============================================================================
// Preview Result Generation
// ============================================================================

/**
 * Create an empty/default preview result
 */
export function createEmptyPreviewResult(
  fileSize: number,
  error?: string,
): DocumentPreviewResult {
  return {
    success: !error,
    content: null,
    contentType: "text",
    language: null,
    lineCount: 0,
    pageCount: 0,
    encoding: "utf-8",
    error: error || null,
    metadata: {
      title: null,
      author: null,
      createdDate: null,
      modifiedDate: null,
      pageCount: null,
      wordCount: null,
      characterCount: null,
      lineCount: null,
      language: null,
      encoding: null,
      fileSize,
    },
  };
}

/**
 * Create a text preview result from content
 */
export function createTextPreviewResult(
  content: string,
  fileSize: number,
  language?: CodeLanguage,
): DocumentPreviewResult {
  const lines = content.split("\n");
  const words = content.split(/\s+/).filter(Boolean);

  return {
    success: true,
    content,
    contentType: "text",
    language: language || null,
    lineCount: lines.length,
    pageCount: 1,
    encoding: "utf-8",
    error: null,
    metadata: {
      title: null,
      author: null,
      createdDate: null,
      modifiedDate: null,
      pageCount: 1,
      wordCount: words.length,
      characterCount: content.length,
      lineCount: lines.length,
      language: language || null,
      encoding: "utf-8",
      fileSize,
    },
  };
}

/**
 * Truncate preview content to a maximum number of lines
 */
export function truncatePreview(
  content: string,
  maxLines: number,
): {
  truncated: string;
  isTruncated: boolean;
  totalLines: number;
} {
  const lines = content.split("\n");
  const isTruncated = lines.length > maxLines;
  const truncated = lines.slice(0, maxLines).join("\n");

  return {
    truncated: isTruncated ? truncated + "\n..." : truncated,
    isTruncated,
    totalLines: lines.length,
  };
}
