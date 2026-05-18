/**
 * LinkDialog Component
 *
 * Dialog for inserting and editing links with:
 * - URL input with validation
 * - Optional text input
 * - Link preview
 * - Open in new tab option
 */

"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link as LinkIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================================
// Types
// ============================================================================

export interface LinkData {
  url: string;
  text?: string;
}

export interface LinkDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Initial link data for editing */
  initialData?: LinkData;
  /** Selected text from the editor */
  selectedText?: string;
  /** Callback when link is submitted */
  onSubmit: (data: LinkData) => void;
  /** Callback when link is removed (for editing mode) */
  onRemove?: () => void;
  /** Whether we're editing an existing link */
  isEditing?: boolean;
}

// ============================================================================
// URL Validation
// ============================================================================

function isValidUrl(string: string): boolean {
  try {
    // First check if it looks like a URL
    if (!string.match(/^https?:\/\//i)) {
      // Try adding https://
      string = `https://${string}`;
    }
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  // Add https:// if no protocol specified
  if (!url.match(/^https?:\/\//i)) {
    return `https://${url}`;
  }
  return url;
}

function extractDomain(url: string): string {
  try {
    const normalized = normalizeUrl(url);
    const urlObj = new URL(normalized);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

// ============================================================================
// Component
// ============================================================================

export function LinkDialog({
  open,
  onOpenChange,
  initialData,
  selectedText,
  onSubmit,
  onRemove,
  isEditing = false,
}: LinkDialogProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setUrl(initialData?.url || "");
      setText(initialData?.text || selectedText || "");
      setError(null);
    }
  }, [open, initialData, selectedText]);

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setUrl(value);
      if (error) setError(null);
    },
    [error],
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Validate URL
      if (!url.trim()) {
        setError("URL is required");
        return;
      }

      if (!isValidUrl(url)) {
        setError("Please enter a valid URL");
        return;
      }

      // Normalize and submit
      const normalizedUrl = normalizeUrl(url);
      onSubmit({
        url: normalizedUrl,
        text: text.trim() || undefined,
      });
      onOpenChange(false);
    },
    [url, text, onSubmit, onOpenChange],
  );

  const handleRemove = useCallback(() => {
    onRemove?.();
    onOpenChange(false);
  }, [onRemove, onOpenChange]);

  const domain = url ? extractDomain(url) : null;
  const previewUrl = url && isValidUrl(url) ? normalizeUrl(url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {isEditing ? "Edit Link" : "Insert Link"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the link URL or display text."
              : "Add a link to your message."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* URL Input */}
            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={handleUrlChange}
                className={cn(error && "border-destructive")}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {/* Text Input */}
            <div className="grid gap-2">
              <Label htmlFor="link-text">Display Text (optional)</Label>
              <Input
                id="link-text"
                type="text"
                placeholder="Link text"
                value={text}
                onChange={handleTextChange}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to display the URL
              </p>
            </div>

            {/* Link Preview */}
            {previewUrl && (
              <div className="bg-muted/50 rounded-lg border p-3">
                <p className="text-sm font-medium">Preview</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-primary hover:underline"
                  >
                    {text || previewUrl}
                  </a>
                </div>
                {domain && (
                  <p className="mt-1 text-xs text-muted-foreground">{domain}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing && onRemove && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                className="mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Link
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Update Link" : "Insert Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Link Preview Component
// ============================================================================

export interface LinkPreviewProps {
  /** The URL to preview */
  url: string;
  /** Optional title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Optional image URL */
  image?: string;
  /** Additional CSS class */
  className?: string;
}

export function LinkPreview({
  url,
  title,
  description,
  image,
  className,
}: LinkPreviewProps) {
  const domain = extractDomain(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "hover:bg-accent/50 block rounded-lg border bg-card p-3 transition-colors",
        className,
      )}
    >
      <div className="flex gap-3">
        {/* Preview image */}
        {image && (
          <div className="flex-shrink-0">
            <img
              src={image}
              alt={title || "Link preview"}
              className="h-16 w-16 rounded object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          {title && <p className="line-clamp-1 text-sm font-medium">{title}</p>}
          {description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <span className="truncate">{domain}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

// ============================================================================
// Inline Link Component
// ============================================================================

export interface InlineLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function InlineLink({
  href,
  children,
  className,
  onClick,
}: InlineLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "decoration-primary/30 text-primary underline underline-offset-2 transition-colors hover:decoration-primary",
        className,
      )}
    >
      {children}
    </a>
  );
}

export default LinkDialog;
