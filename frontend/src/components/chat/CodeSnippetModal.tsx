"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Code2, Send, Eye, FileCode, Loader2, Sparkles } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "@/lib/markdown/syntax-highlighter";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "./CodeBlock";
import {
  getSupportedLanguages,
  normalizeLanguage,
} from "@/lib/markdown/syntax-highlighter";

import { logger } from "@/lib/logger";

interface CodeSnippetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (snippet: CodeSnippet) => Promise<void>;
  defaultLanguage?: string;
  defaultCode?: string;
}

export interface CodeSnippet {
  title: string;
  language: string;
  code: string;
  description?: string;
}

/**
 * Code snippet modal for creating and sharing code snippets
 * Features:
 * - Title and description
 * - Language selector (100+ languages)
 * - Monaco-like code editor with TipTap
 * - Live preview with syntax highlighting
 * - Share snippet to channel
 */
export function CodeSnippetModal({
  open,
  onOpenChange,
  onShare,
  defaultLanguage = "javascript",
  defaultCode = "",
}: CodeSnippetModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Get supported languages
  const languages = getSupportedLanguages();

  // Group languages by category
  const languagesByCategory = languages.reduce(
    (acc, lang) => {
      if (!acc[lang.category]) {
        acc[lang.category] = [];
      }
      acc[lang.category].push(lang);
      return acc;
    },
    {} as Record<string, typeof languages>,
  );

  // Initialize TipTap editor with code block support
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: language,
        HTMLAttributes: {
          class: "hljs",
        },
      }),
    ],
    content: defaultCode
      ? `<pre><code class="language-${language}">${defaultCode}</code></pre>`
      : "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "focus:outline-none min-h-[300px] max-h-[500px] overflow-y-auto",
          "p-4 font-mono text-xs leading-relaxed",
        ),
      },
    },
  });

  // Update editor language when language changes
  useEffect(() => {
    if (editor && language) {
      const normalized = normalizeLanguage(language);
      editor.commands.updateAttributes("codeBlock", { language: normalized });
    }
  }, [editor, language]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!editor || !title.trim()) return;

    const code = editor.getText();
    if (!code.trim()) return;

    setIsSharing(true);

    try {
      await onShare({
        title: title.trim(),
        language: normalizeLanguage(language),
        code: code.trim(),
        description: description.trim() || undefined,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setLanguage("javascript");
      editor.commands.clearContent();
      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to share snippet:", error);
    } finally {
      setIsSharing(false);
    }
  }, [editor, title, description, language, onShare, onOpenChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleShare();
      }
    },
    [handleShare],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const canShare = title.trim() && editor?.getText().trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Create Code Snippet
          </DialogTitle>
          <DialogDescription>
            Share a code snippet with syntax highlighting and preview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="snippet-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="snippet-title"
              placeholder="e.g., User Authentication Hook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>

          {/* Language Selector */}
          <div className="space-y-2">
            <Label htmlFor="snippet-language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="snippet-language">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(languagesByCategory).map(
                  ([category, langs]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {category}
                      </div>
                      {langs.map((lang) => (
                        <SelectItem key={lang.name} value={lang.name}>
                          {lang.displayName}
                        </SelectItem>
                      ))}
                    </div>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="snippet-description">Description (Optional)</Label>
            <Input
              id="snippet-description"
              placeholder="Brief description of what this code does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Editor Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="edit" className="gap-2">
                  <FileCode className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              {/* Help text */}
              <span className="text-xs text-muted-foreground">
                <kbd className="rounded bg-muted px-1">Tab</kbd> to indent
              </span>
            </div>

            {/* Edit Tab */}
            <TabsContent value="edit" className="mt-4">
              <div className="bg-muted/30 rounded-lg border">
                <EditorContent
                  editor={editor}
                  className="code-editor-content"
                />
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-4">
              {editor?.getText().trim() ? (
                <CodeBlock
                  code={editor.getText()}
                  language={language}
                  filename={title || undefined}
                  showLineNumbers
                />
              ) : (
                <div className="bg-muted/30 flex h-[300px] items-center justify-center rounded-lg border text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Code2 className="h-12 w-12 opacity-50" />
                    <p className="text-sm">No code to preview</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={!canShare || isSharing}
            className="gap-2"
          >
            {isSharing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Share Snippet
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Keyboard shortcut hint */}
        <div className="text-center text-xs text-muted-foreground">
          Press <kbd className="rounded bg-muted px-1 font-mono">Cmd+Enter</kbd>{" "}
          or <kbd className="rounded bg-muted px-1 font-mono">Ctrl+Enter</kbd>{" "}
          to share
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * AI-powered code snippet suggestions (placeholder for future enhancement)
 */
export function CodeSnippetSuggestions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-primary/20 bg-primary/5 rounded-lg border p-3"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 flex-shrink-0 text-primary" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">AI Suggestions</p>
          <p className="text-xs text-muted-foreground">
            Get AI-powered code completion and suggestions while typing. (Coming
            soon)
          </p>
        </div>
      </div>
    </motion.div>
  );
}
