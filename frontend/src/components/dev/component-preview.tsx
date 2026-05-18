"use client";

import { useState, useCallback, ReactNode } from "react";
import { Check, Copy, Code, Eye, Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "./code-block";

// ============================================================================
// Types
// ============================================================================

export interface ComponentPreviewProps {
  title?: string;
  description?: string;
  children: ReactNode;
  code?: string;
  language?: string;
  showModeToggle?: boolean;
  defaultMode?: "light" | "dark" | "system";
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ComponentPreview({
  title,
  description,
  children,
  code,
  language = "tsx",
  showModeToggle = true,
  defaultMode = "dark",
  className,
}: ComponentPreviewProps) {
  const [mode, setMode] = useState<"light" | "dark" | "system">(defaultMode);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  // Determine the actual theme class based on mode
  const themeClass = mode === "system" ? "" : mode;

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="border-b px-4 py-3">
          {title && <h3 className="font-semibold">{title}</h3>}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-muted/30 flex items-center justify-between border-b px-4 py-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "preview" | "code")}
        >
          <TabsList className="h-8">
            <TabsTrigger value="preview" className="h-6 gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
            {code && (
              <TabsTrigger value="code" className="h-6 gap-1.5 text-xs">
                <Code className="h-3.5 w-3.5" />
                Code
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {showModeToggle && activeTab === "preview" && (
            <div className="flex items-center rounded-md border bg-background p-0.5">
              <Button
                variant={mode === "light" ? "secondary" : "ghost"}
                size="icon"
                className="h-6 w-6"
                onClick={() => setMode("light")}
              >
                <Sun className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={mode === "dark" ? "secondary" : "ghost"}
                size="icon"
                className="h-6 w-6"
                onClick={() => setMode("dark")}
              >
                <Moon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={mode === "system" ? "secondary" : "ghost"}
                size="icon"
                className="h-6 w-6"
                onClick={() => setMode("system")}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {code && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === "preview" ? (
        <div
          className={cn(
            "p-6",
            themeClass === "dark" && "dark bg-zinc-950",
            themeClass === "light" && "bg-white",
          )}
        >
          <div className={cn(themeClass === "dark" && "text-zinc-50")}>
            {children}
          </div>
        </div>
      ) : (
        code && <CodeBlock code={code} language={language} showLineNumbers />
      )}
    </div>
  );
}

// ============================================================================
// Simple Preview Card (without tabs)
// ============================================================================

export function PreviewCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      {title && (
        <div className="bg-muted/30 border-b px-4 py-2">
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

// ============================================================================
// Preview Grid
// ============================================================================

export function PreviewGrid({
  children,
  cols = 3,
  className,
}: {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", colsClass[cols], className)}>
      {children}
    </div>
  );
}
