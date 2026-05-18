/**
 * EditorToolbar Component
 *
 * Formatting toolbar for the rich text editor with:
 * - Bold, italic, underline, strikethrough buttons
 * - Code, code block buttons
 * - Link button (opens dialog)
 * - List buttons (bullet, ordered)
 * - Quote button
 * - Active state indicators
 * - Optional visibility
 */

"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Code2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { LinkDialog, type LinkData } from "./link-dialog";

// ============================================================================
// Types
// ============================================================================

export interface EditorToolbarProps {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Whether the toolbar is visible */
  visible?: boolean;
  /** Whether to show the link button */
  showLink?: boolean;
  /** Whether to show the code block button */
  showCodeBlock?: boolean;
  /** Whether to show list buttons */
  showLists?: boolean;
  /** Whether to show quote button */
  showQuote?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Toolbar size */
  size?: "sm" | "default";
}

// ============================================================================
// Toolbar Button Component
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: "sm" | "default";
}

function ToolbarButton({
  icon,
  label,
  shortcut,
  isActive,
  disabled,
  onClick,
  size = "default",
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "transition-colors",
            size === "sm" ? "h-7 w-7" : "h-8 w-8",
            isActive && "text-accent-foreground bg-accent",
          )}
        >
          {icon}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EditorToolbar({
  editor,
  visible = true,
  showLink = true,
  showCodeBlock = true,
  showLists = true,
  showQuote = true,
  className,
  size = "default",
}: EditorToolbarProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  // Get selected text for link dialog
  const getSelectedText = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, "");
  }, [editor]);

  // Get existing link data if cursor is on a link
  const getExistingLinkData = useCallback(() => {
    if (!editor) return undefined;
    const attrs = editor.getAttributes("link");
    if (attrs.href) {
      return {
        url: attrs.href,
        text: getSelectedText() || undefined,
      };
    }
    return undefined;
  }, [editor, getSelectedText]);

  // Handle link submission
  const handleLinkSubmit = useCallback(
    (data: LinkData) => {
      if (!editor) return;

      const { url, text } = data;

      if (text) {
        // Insert link with custom text
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .insertContent(text)
          .run();
      } else {
        // Set link on selection
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: url })
          .run();
      }
    },
    [editor],
  );

  // Handle link removal
  const handleLinkRemove = useCallback(() => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }, [editor]);

  // Toggle handlers
  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const toggleCode = useCallback(() => {
    editor?.chain().focus().toggleCode().run();
  }, [editor]);

  const toggleCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const openLinkDialog = useCallback(() => {
    setLinkDialogOpen(true);
  }, []);

  if (!visible || !editor) return null;

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const isLink = editor.isActive("link");
  const existingLinkData = getExistingLinkData();

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "bg-background/95 flex items-center gap-0.5 rounded-lg border p-1 backdrop-blur",
          className,
        )}
        role="toolbar"
        aria-label="Text formatting"
      >
        {/* Text formatting */}
        <ToolbarButton
          icon={<Bold className={iconSize} />}
          label="Bold"
          shortcut="Ctrl+B"
          isActive={editor.isActive("bold")}
          onClick={toggleBold}
          size={size}
        />
        <ToolbarButton
          icon={<Italic className={iconSize} />}
          label="Italic"
          shortcut="Ctrl+I"
          isActive={editor.isActive("italic")}
          onClick={toggleItalic}
          size={size}
        />
        <ToolbarButton
          icon={<UnderlineIcon className={iconSize} />}
          label="Underline"
          shortcut="Ctrl+U"
          isActive={editor.isActive("underline")}
          onClick={toggleUnderline}
          size={size}
        />
        <ToolbarButton
          icon={<Strikethrough className={iconSize} />}
          label="Strikethrough"
          shortcut="Ctrl+Shift+S"
          isActive={editor.isActive("strike")}
          onClick={toggleStrike}
          size={size}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Code */}
        <ToolbarButton
          icon={<Code className={iconSize} />}
          label="Inline Code"
          shortcut="Ctrl+E"
          isActive={editor.isActive("code")}
          onClick={toggleCode}
          size={size}
        />
        {showCodeBlock && (
          <ToolbarButton
            icon={<Code2 className={iconSize} />}
            label="Code Block"
            shortcut="Ctrl+Shift+E"
            isActive={editor.isActive("codeBlock")}
            onClick={toggleCodeBlock}
            size={size}
          />
        )}

        {/* Link */}
        {showLink && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              icon={<LinkIcon className={iconSize} />}
              label={isLink ? "Edit Link" : "Insert Link"}
              shortcut="Ctrl+K"
              isActive={isLink}
              onClick={openLinkDialog}
              size={size}
            />
          </>
        )}

        {/* Lists */}
        {showLists && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              icon={<List className={iconSize} />}
              label="Bullet List"
              isActive={editor.isActive("bulletList")}
              onClick={toggleBulletList}
              size={size}
            />
            <ToolbarButton
              icon={<ListOrdered className={iconSize} />}
              label="Numbered List"
              isActive={editor.isActive("orderedList")}
              onClick={toggleOrderedList}
              size={size}
            />
          </>
        )}

        {/* Quote */}
        {showQuote && (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <ToolbarButton
              icon={<Quote className={iconSize} />}
              label="Blockquote"
              isActive={editor.isActive("blockquote")}
              onClick={toggleBlockquote}
              size={size}
            />
          </>
        )}

        {/* Link Dialog */}
        {showLink && (
          <LinkDialog
            open={linkDialogOpen}
            onOpenChange={setLinkDialogOpen}
            initialData={existingLinkData}
            selectedText={getSelectedText()}
            onSubmit={handleLinkSubmit}
            onRemove={isLink ? handleLinkRemove : undefined}
            isEditing={isLink}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Floating Toolbar Component
// ============================================================================

export interface FloatingToolbarProps extends EditorToolbarProps {
  /** Position of the toolbar */
  position?: { top: number; left: number };
}

export function FloatingToolbar({ position, ...props }: FloatingToolbarProps) {
  if (!position) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 50,
        transform: "translateX(-50%)",
      }}
    >
      <EditorToolbar {...props} />
    </div>
  );
}

// ============================================================================
// Compact Toolbar Component
// ============================================================================

export function CompactToolbar(props: Omit<EditorToolbarProps, "size">) {
  return <EditorToolbar {...props} size="sm" />;
}

export default EditorToolbar;
