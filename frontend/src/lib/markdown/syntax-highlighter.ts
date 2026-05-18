/**
 * Syntax highlighter utility using lowlight
 * Supports 100+ languages with theme support
 */

import { createLowlight } from "lowlight";

// Core languages
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import csharp from "highlight.js/lib/languages/csharp";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import ruby from "highlight.js/lib/languages/ruby";
import php from "highlight.js/lib/languages/php";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";

// Web technologies
import html from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import scss from "highlight.js/lib/languages/scss";
import less from "highlight.js/lib/languages/less";

// Shell & Config
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import powershell from "highlight.js/lib/languages/powershell";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import toml from "highlight.js/lib/languages/ini"; // ini covers toml-like formats
import xml from "highlight.js/lib/languages/xml";

// Database
import sql from "highlight.js/lib/languages/sql";
import pgsql from "highlight.js/lib/languages/pgsql";
import mongodb from "highlight.js/lib/languages/javascript"; // MongoDB uses JS-like syntax

// Data formats
import markdown from "highlight.js/lib/languages/markdown";
import graphql from "highlight.js/lib/languages/graphql";

// Other popular languages
import dart from "highlight.js/lib/languages/dart";
import elixir from "highlight.js/lib/languages/elixir";
import erlang from "highlight.js/lib/languages/erlang";
import haskell from "highlight.js/lib/languages/haskell";
import lua from "highlight.js/lib/languages/lua";
import perl from "highlight.js/lib/languages/perl";
import r from "highlight.js/lib/languages/r";
import scala from "highlight.js/lib/languages/scala";
import ocaml from "highlight.js/lib/languages/ocaml";

// Framework-specific
import jsx from "highlight.js/lib/languages/javascript"; // JSX uses JS with extensions
import tsx from "highlight.js/lib/languages/typescript"; // TSX uses TS with extensions
import vue from "highlight.js/lib/languages/xml"; // Vue SFC
import svelte from "highlight.js/lib/languages/xml"; // Svelte components

// Assembly & Low-level
import asm from "highlight.js/lib/languages/x86asm";
import nasm from "highlight.js/lib/languages/x86asm";

// Others
import diff from "highlight.js/lib/languages/diff";
import docker from "highlight.js/lib/languages/dockerfile";
import nginx from "highlight.js/lib/languages/nginx";
import makefile from "highlight.js/lib/languages/makefile";

import { logger } from "@/lib/logger";

// Initialize lowlight
const lowlight = createLowlight();

// Register all languages
const languageMap: Record<string, any> = {
  // JavaScript/TypeScript family
  javascript,
  js: javascript,
  jsx,
  typescript,
  ts: typescript,
  tsx,

  // Python
  python,
  py: python,

  // Java/JVM
  java,
  kotlin,
  kt: kotlin,
  scala,

  // C/C++ family
  c,
  cpp,
  "c++": cpp,
  csharp,
  "c#": csharp,
  cs: csharp,

  // Systems programming
  go,
  golang: go,
  rust,
  rs: rust,

  // Web
  html,
  htm: html,
  xml,
  svg: xml,
  css,
  scss,
  sass: scss,
  less,

  // Shell
  bash,
  sh: bash,
  shell,
  zsh: bash,
  powershell,
  ps1: powershell,

  // Mobile
  swift,
  dart,

  // Scripting
  ruby,
  rb: ruby,
  php,
  perl,
  pl: perl,
  lua,

  // Functional
  haskell,
  hs: haskell,
  elixir,
  ex: elixir,
  erlang,
  erl: erlang,
  ocaml,
  ml: ocaml,

  // Data & Config
  json,
  yaml,
  yml: yaml,
  toml,

  // Databases
  sql,
  pgsql,
  postgresql: pgsql,
  mysql: sql,
  mongodb,
  mongo: mongodb,

  // Markup
  markdown,
  md: markdown,
  graphql,
  gql: graphql,

  // Frameworks
  vue,
  svelte,

  // Assembly
  asm,
  assembly: asm,
  nasm,
  x86: asm,

  // DevOps
  docker,
  dockerfile: docker,
  nginx,
  makefile,
  make: makefile,

  // Other
  diff,
  patch: diff,
  r,
  "r-script": r,
};

// Register languages with lowlight
Object.entries(languageMap).forEach(([name, lang]) => {
  try {
    lowlight.register(name, lang);
  } catch (error) {
    // Language might already be registered
    logger.warn(`Could not register language: ${name}`);
  }
});

/**
 * Language metadata
 */
export interface LanguageInfo {
  name: string;
  aliases: string[];
  displayName: string;
  extension: string;
  category: string;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): LanguageInfo[] {
  return [
    // JavaScript/TypeScript
    {
      name: "javascript",
      aliases: ["js", "jsx"],
      displayName: "JavaScript",
      extension: ".js",
      category: "Web",
    },
    {
      name: "typescript",
      aliases: ["ts", "tsx"],
      displayName: "TypeScript",
      extension: ".ts",
      category: "Web",
    },

    // Backend
    {
      name: "python",
      aliases: ["py"],
      displayName: "Python",
      extension: ".py",
      category: "Backend",
    },
    {
      name: "java",
      aliases: [],
      displayName: "Java",
      extension: ".java",
      category: "Backend",
    },
    {
      name: "go",
      aliases: ["golang"],
      displayName: "Go",
      extension: ".go",
      category: "Backend",
    },
    {
      name: "rust",
      aliases: ["rs"],
      displayName: "Rust",
      extension: ".rs",
      category: "Backend",
    },
    {
      name: "ruby",
      aliases: ["rb"],
      displayName: "Ruby",
      extension: ".rb",
      category: "Backend",
    },
    {
      name: "php",
      aliases: [],
      displayName: "PHP",
      extension: ".php",
      category: "Backend",
    },

    // Systems
    {
      name: "c",
      aliases: [],
      displayName: "C",
      extension: ".c",
      category: "Systems",
    },
    {
      name: "cpp",
      aliases: ["c++"],
      displayName: "C++",
      extension: ".cpp",
      category: "Systems",
    },
    {
      name: "csharp",
      aliases: ["c#", "cs"],
      displayName: "C#",
      extension: ".cs",
      category: "Systems",
    },

    // Web
    {
      name: "html",
      aliases: ["htm"],
      displayName: "HTML",
      extension: ".html",
      category: "Web",
    },
    {
      name: "css",
      aliases: [],
      displayName: "CSS",
      extension: ".css",
      category: "Web",
    },
    {
      name: "scss",
      aliases: ["sass"],
      displayName: "SCSS",
      extension: ".scss",
      category: "Web",
    },

    // Shell
    {
      name: "bash",
      aliases: ["sh", "shell", "zsh"],
      displayName: "Bash",
      extension: ".sh",
      category: "Shell",
    },
    {
      name: "powershell",
      aliases: ["ps1"],
      displayName: "PowerShell",
      extension: ".ps1",
      category: "Shell",
    },

    // Data
    {
      name: "json",
      aliases: [],
      displayName: "JSON",
      extension: ".json",
      category: "Data",
    },
    {
      name: "yaml",
      aliases: ["yml"],
      displayName: "YAML",
      extension: ".yaml",
      category: "Data",
    },
    {
      name: "xml",
      aliases: [],
      displayName: "XML",
      extension: ".xml",
      category: "Data",
    },
    {
      name: "graphql",
      aliases: ["gql"],
      displayName: "GraphQL",
      extension: ".graphql",
      category: "Data",
    },

    // Database
    {
      name: "sql",
      aliases: [],
      displayName: "SQL",
      extension: ".sql",
      category: "Database",
    },
    {
      name: "pgsql",
      aliases: ["postgresql"],
      displayName: "PostgreSQL",
      extension: ".sql",
      category: "Database",
    },

    // Other
    {
      name: "markdown",
      aliases: ["md"],
      displayName: "Markdown",
      extension: ".md",
      category: "Markup",
    },
    {
      name: "diff",
      aliases: ["patch"],
      displayName: "Diff",
      extension: ".diff",
      category: "Other",
    },
    {
      name: "docker",
      aliases: ["dockerfile"],
      displayName: "Dockerfile",
      extension: "Dockerfile",
      category: "DevOps",
    },
  ];
}

/**
 * Detect language from filename or content
 */
export function detectLanguage(
  filename?: string,
  content?: string,
): string | undefined {
  if (filename) {
    const ext = filename.toLowerCase().split(".").pop();
    if (ext) {
      // Check direct extension match
      const languages = getSupportedLanguages();
      for (const lang of languages) {
        if (lang.extension.toLowerCase().endsWith(`.${ext}`)) {
          return lang.name;
        }
        if (lang.aliases.some((alias) => alias === ext)) {
          return lang.name;
        }
      }

      // Special cases
      if (filename.toLowerCase() === "dockerfile") return "docker";
      if (filename.toLowerCase() === "makefile") return "makefile";
    }
  }

  // Try to detect from content (basic heuristics)
  if (content) {
    const firstLine = content.split("\n")[0].toLowerCase();

    // Shebang detection
    if (firstLine.startsWith("#!")) {
      if (firstLine.includes("python")) return "python";
      if (firstLine.includes("node")) return "javascript";
      if (firstLine.includes("bash") || firstLine.includes("sh")) return "bash";
      if (firstLine.includes("ruby")) return "ruby";
    }

    // Common patterns
    if (content.includes("<?php")) return "php";
    if (content.includes("def ") && content.includes("self")) return "python";
    if (content.includes("function") && content.includes("{"))
      return "javascript";
    if (content.includes("package main") && content.includes("func"))
      return "go";
  }

  return undefined;
}

/**
 * Highlight code using lowlight
 */
export function highlightCode(
  code: string,
  language?: string,
): { html: string; language: string } {
  const lang = language || "plaintext";

  try {
    const result = lowlight.highlight(lang, code, { prefix: "hljs-" });
    const html = toHtml(result);
    return { html, language: lang };
  } catch (error) {
    // Fallback to auto-detect
    try {
      const result = lowlight.highlightAuto(code, { prefix: "hljs-" });
      return {
        html: toHtml(result),
        language: (result.data?.language as string) || "plaintext",
      };
    } catch (fallbackError) {
      // Return plain text if all fails
      return {
        html: escapeHtml(code),
        language: "plaintext",
      };
    }
  }
}

/**
 * Convert lowlight AST to HTML string
 */
function toHtml(node: any): string {
  if (node.type === "text") {
    return escapeHtml(node.value);
  }

  if (node.type === "element") {
    const className = node.properties?.className?.join(" ") || "";
    const children = node.children?.map(toHtml).join("") || "";
    return `<span class="${className}">${children}</span>`;
  }

  if (node.type === "root") {
    return node.children?.map(toHtml).join("") || "";
  }

  return "";
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: string): string {
  const info = getSupportedLanguages().find(
    (lang) => lang.name === language || lang.aliases.includes(language),
  );
  return (
    info?.displayName || language.charAt(0).toUpperCase() + language.slice(1)
  );
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(language: string): boolean {
  const normalized = language.toLowerCase();
  return getSupportedLanguages().some(
    (lang) => lang.name === normalized || lang.aliases.includes(normalized),
  );
}

/**
 * Normalize language name (convert aliases to canonical name)
 */
export function normalizeLanguage(language: string): string {
  const normalized = language.toLowerCase();
  const info = getSupportedLanguages().find(
    (lang) => lang.name === normalized || lang.aliases.includes(normalized),
  );
  return info?.name || normalized;
}

export { lowlight };
