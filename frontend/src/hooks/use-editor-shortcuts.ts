"use client";

/**
 * Editor Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcuts for text formatting in the message editor.
 * Integrates with TipTap editor or can work with plain textareas.
 */

import { useCallback, RefObject } from "react";
import type { Editor } from "@tiptap/react";
import {
  useShortcut,
  useScopedKeyboard,
  useCustomShortcut,
} from "@/lib/keyboard";

import { logger } from "@/lib/logger";

// Type for editor with common formatting commands
// TipTap adds these methods through extensions
// Using a looser type to avoid conflicts with TipTap's complex chain() return type
interface EditorWithFormatting {
  chain: () => {
    focus: () => EditorChainMethods;
  };
  isActive: (name: string) => boolean;
  can: () => { undo: () => boolean; redo: () => boolean };
}

interface EditorChainMethods {
  toggleBold: () => EditorChainMethods;
  toggleItalic: () => EditorChainMethods;
  toggleUnderline: () => EditorChainMethods;
  toggleStrike: () => EditorChainMethods;
  toggleCode: () => EditorChainMethods;
  toggleCodeBlock: () => EditorChainMethods;
  toggleBlockquote: () => EditorChainMethods;
  toggleBulletList: () => EditorChainMethods;
  toggleOrderedList: () => EditorChainMethods;
  setLink: (options: { href: string }) => EditorChainMethods;
  clearNodes: () => EditorChainMethods;
  unsetAllMarks: () => EditorChainMethods;
  undo: () => EditorChainMethods;
  redo: () => EditorChainMethods;
  run: () => boolean;
}

// ============================================================================
// Types
// ============================================================================

export interface UseEditorShortcutsOptions {
  /** TipTap editor instance (for rich text editing) */
  editor?: Editor | null;
  /** Textarea ref (for plain text editing) */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Whether the editor is focused */
  isFocused?: boolean;
  /** Whether formatting shortcuts are enabled */
  enabled?: boolean;
  /** Callback when link insertion is requested */
  onInsertLink?: () => void;
  /** Callback when code block insertion is requested */
  onInsertCodeBlock?: () => void;
  /** Callback when file upload is requested */
  onUploadFile?: () => void;
}

export interface EditorFormatActions {
  bold: () => void;
  italic: () => void;
  underline: () => void;
  strikethrough: () => void;
  code: () => void;
  codeBlock: () => void;
  link: () => void;
  quote: () => void;
  bulletList: () => void;
  numberedList: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Register editor formatting keyboard shortcuts
 *
 * @param options - Configuration including editor instance and callbacks
 *
 * @example
 * ```tsx
 * function MessageEditor() {
 *   const editor = useEditor({...});
 *
 *   useEditorShortcuts({
 *     editor,
 *     isFocused: true,
 *     onInsertLink: () => setLinkDialogOpen(true),
 *   });
 *
 *   return <EditorContent editor={editor} />;
 * }
 * ```
 */
export function useEditorShortcuts(options: UseEditorShortcutsOptions) {
  const {
    editor,
    textareaRef,
    isFocused = false,
    enabled = true,
    onInsertLink,
    onInsertCodeBlock,
    onUploadFile,
  } = options;

  // Activate editor scope when focused
  useScopedKeyboard("editor", isFocused && enabled);

  // ============================================================================
  // TipTap Editor Formatting
  // ============================================================================

  // Helper to safely call editor chain methods
  const runEditorCommand = useCallback(
    (command: (chain: EditorChainMethods) => EditorChainMethods) => {
      if (editor) {
        try {
          // Cast to our extended type that includes formatting methods
          const editorWithFormatting =
            editor as unknown as EditorWithFormatting;
          command(editorWithFormatting.chain().focus()).run();
        } catch {
          // Command might not be available if extension isn't loaded
          logger.warn("Editor command not available");
        }
      }
    },
    [editor],
  );

  // Bold (Cmd+B)
  const handleBold = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleBold());
    } else if (textareaRef?.current) {
      wrapSelection(textareaRef.current, "**", "**");
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("BOLD", handleBold, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Italic (Cmd+I)
  const handleItalic = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleItalic());
    } else if (textareaRef?.current) {
      wrapSelection(textareaRef.current, "_", "_");
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("ITALIC", handleItalic, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Underline (Cmd+U)
  const handleUnderline = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleUnderline());
    } else if (textareaRef?.current) {
      // Markdown doesn't have native underline, use HTML
      wrapSelection(textareaRef.current, "<u>", "</u>");
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("UNDERLINE", handleUnderline, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Strikethrough (Cmd+Shift+X)
  const handleStrikethrough = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleStrike());
    } else if (textareaRef?.current) {
      wrapSelection(textareaRef.current, "~~", "~~");
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("STRIKETHROUGH", handleStrikethrough, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Inline Code (Cmd+Shift+C)
  const handleCode = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleCode());
    } else if (textareaRef?.current) {
      wrapSelection(textareaRef.current, "`", "`");
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("CODE", handleCode, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Code Block (Cmd+Shift+Enter)
  const handleCodeBlock = useCallback(() => {
    if (onInsertCodeBlock) {
      onInsertCodeBlock();
    } else if (editor) {
      runEditorCommand((chain) => chain.toggleCodeBlock());
    } else if (textareaRef?.current) {
      wrapSelection(textareaRef.current, "```\n", "\n```");
    }
  }, [editor, textareaRef, onInsertCodeBlock, runEditorCommand]);

  useShortcut("CODE_BLOCK", handleCodeBlock, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Insert Link (Cmd+Shift+U)
  const handleLink = useCallback(() => {
    if (onInsertLink) {
      onInsertLink();
    } else if (editor) {
      // If there's a selection, prompt for URL
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      if (selectedText) {
        // Would typically open a dialog here
        const url = window.prompt("Enter URL:");
        if (url) {
          runEditorCommand((chain) => chain.setLink({ href: url }));
        }
      }
    } else if (textareaRef?.current) {
      const selectedText = getSelectedText(textareaRef.current);
      if (selectedText) {
        wrapSelection(textareaRef.current, "[", "](url)");
      } else {
        insertAtCursor(textareaRef.current, "[link text](url)");
      }
    }
  }, [editor, textareaRef, onInsertLink, runEditorCommand]);

  useShortcut("LINK", handleLink, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Quote (Cmd+Shift+>)
  const handleQuote = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleBlockquote());
    } else if (textareaRef?.current) {
      prefixLines(textareaRef.current, "> ");
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("QUOTE", handleQuote, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Bullet List (Cmd+Shift+8)
  const handleBulletList = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleBulletList());
    } else if (textareaRef?.current) {
      prefixLines(textareaRef.current, "- ");
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("BULLET_LIST", handleBulletList, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // Numbered List (Cmd+Shift+7)
  const handleNumberedList = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.toggleOrderedList());
    } else if (textareaRef?.current) {
      prefixLinesNumbered(textareaRef.current);
    }
  }, [editor, textareaRef, runEditorCommand]);

  useShortcut("NUMBERED_LIST", handleNumberedList, {
    when: isFocused && enabled,
    ignoreScope: true,
  });

  // ============================================================================
  // Additional Editor Shortcuts (not in main SHORTCUTS)
  // ============================================================================

  // Clear formatting (Cmd+\)
  const handleClearFormatting = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.clearNodes().unsetAllMarks());
    }
  }, [editor, runEditorCommand]);

  useCustomShortcut("mod+\\", handleClearFormatting, {
    enabled: isFocused && enabled && !!editor,
    enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
  });

  // Undo (Cmd+Z)
  const handleUndo = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.undo());
    }
  }, [editor, runEditorCommand]);

  useCustomShortcut("mod+z", handleUndo, {
    enabled: isFocused && enabled && !!editor,
    enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
  });

  // Redo (Cmd+Shift+Z)
  const handleRedo = useCallback(() => {
    if (editor) {
      runEditorCommand((chain) => chain.redo());
    }
  }, [editor, runEditorCommand]);

  useCustomShortcut("mod+shift+z", handleRedo, {
    enabled: isFocused && enabled && !!editor,
    enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
  });

  // Return formatting actions for programmatic use
  const formatActions: EditorFormatActions = {
    bold: handleBold,
    italic: handleItalic,
    underline: handleUnderline,
    strikethrough: handleStrikethrough,
    code: handleCode,
    codeBlock: handleCodeBlock,
    link: handleLink,
    quote: handleQuote,
    bulletList: handleBulletList,
    numberedList: handleNumberedList,
  };

  return {
    formatActions,
    clearFormatting: handleClearFormatting,
    undo: handleUndo,
    redo: handleRedo,
  };
}

// ============================================================================
// Helper Functions for Plain Textarea
// ============================================================================

/**
 * Get the currently selected text in a textarea
 */
function getSelectedText(textarea: HTMLTextAreaElement): string {
  return textarea.value.substring(
    textarea.selectionStart,
    textarea.selectionEnd,
  );
}

/**
 * Wrap the current selection with prefix and suffix
 */
function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const newText = prefix + selectedText + suffix;

  textarea.setRangeText(newText, start, end, "select");

  // Update selection to be inside the wrap
  textarea.selectionStart = start + prefix.length;
  textarea.selectionEnd = end + prefix.length;

  // Trigger input event
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

/**
 * Insert text at the current cursor position
 */
function insertAtCursor(textarea: HTMLTextAreaElement, text: string): void {
  const start = textarea.selectionStart;

  textarea.setRangeText(text, start, start, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

/**
 * Prefix each line in the selection with the given prefix
 */
function prefixLines(textarea: HTMLTextAreaElement, prefix: string): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  const lines = selectedText.split("\n");
  const prefixedLines = lines.map((line) => {
    // Toggle: if already prefixed, remove it
    if (line.startsWith(prefix)) {
      return line.substring(prefix.length);
    }
    return prefix + line;
  });

  const newText = prefixedLines.join("\n");
  textarea.setRangeText(newText, start, end, "select");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

/**
 * Prefix each line with numbered list (1. 2. 3. etc.)
 */
function prefixLinesNumbered(textarea: HTMLTextAreaElement): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  const lines = selectedText.split("\n");
  const prefixedLines = lines.map((line, index) => {
    // Check if already numbered
    const numberedMatch = line.match(/^\d+\.\s/);
    if (numberedMatch) {
      return line.substring(numberedMatch[0].length);
    }
    return `${index + 1}. ${line}`;
  });

  const newText = prefixedLines.join("\n");
  textarea.setRangeText(newText, start, end, "select");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
}

// ============================================================================
// Simplified Hooks
// ============================================================================

/**
 * Hook for TipTap editor shortcuts only
 */
export function useTipTapShortcuts(editor: Editor | null, isFocused: boolean) {
  return useEditorShortcuts({
    editor,
    isFocused,
    enabled: !!editor,
  });
}

/**
 * Hook for plain textarea shortcuts only
 */
export function useTextareaShortcuts(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  isFocused: boolean,
) {
  return useEditorShortcuts({
    textareaRef,
    isFocused,
    enabled: true,
  });
}
