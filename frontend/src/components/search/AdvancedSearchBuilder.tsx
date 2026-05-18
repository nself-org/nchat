"use client";

/**
 * AdvancedSearchBuilder - Visual query builder with boolean operators
 *
 * Features:
 * - Visual query builder UI
 * - Boolean operators (AND, OR, NOT)
 * - Field-specific search (from:user, in:channel, has:link)
 * - Query preview in real-time
 * - Drag and drop query parts
 * - Export/import queries
 */

import * as React from "react";
import {
  Plus,
  X,
  Code,
  Eye,
  Copy,
  Download,
  Upload,
  Trash2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface AdvancedSearchBuilderProps {
  /** Initial query parts */
  initialParts?: QueryPart[];
  /** Callback when query changes */
  onChange?: (query: string, parts: QueryPart[]) => void;
  /** Callback when search is executed */
  onSearch?: (query: string) => void;
  /** Additional class names */
  className?: string;
}

export type BooleanOperator = "AND" | "OR" | "NOT";

export type QueryField =
  | "text"
  | "from"
  | "in"
  | "has"
  | "is"
  | "before"
  | "after"
  | "on";

export interface QueryPart {
  id: string;
  field: QueryField;
  operator: BooleanOperator;
  value: string;
  exact?: boolean;
}

// ============================================================================
// Field Configuration
// ============================================================================

const fieldConfig: Record<QueryField, { label: string; placeholder: string }> =
  {
    text: { label: "Text", placeholder: "Search text" },
    from: { label: "From User", placeholder: "Username or ID" },
    in: { label: "In Channel", placeholder: "Channel name or ID" },
    has: { label: "Has", placeholder: "link, file, image, code, mention" },
    is: { label: "Is", placeholder: "pinned, starred, thread, unread" },
    before: { label: "Before Date", placeholder: "YYYY-MM-DD" },
    after: { label: "After Date", placeholder: "YYYY-MM-DD" },
    on: { label: "On Date", placeholder: "YYYY-MM-DD" },
  };

// ============================================================================
// Main Component
// ============================================================================

export function AdvancedSearchBuilder({
  initialParts = [],
  onChange,
  onSearch,
  className,
}: AdvancedSearchBuilderProps) {
  const [queryParts, setQueryParts] = React.useState<QueryPart[]>(
    initialParts.length > 0
      ? initialParts
      : [
          {
            id: crypto.randomUUID(),
            field: "text",
            operator: "AND",
            value: "",
            exact: false,
          },
        ],
  );
  const [activeTab, setActiveTab] = React.useState<"visual" | "code">("visual");
  const [queryString, setQueryString] = React.useState("");

  // Build query string from parts
  React.useEffect(() => {
    const built = buildQueryString(queryParts);
    setQueryString(built);
    onChange?.(built, queryParts);
  }, [queryParts, onChange]);

  const addQueryPart = () => {
    setQueryParts([
      ...queryParts,
      {
        id: crypto.randomUUID(),
        field: "text",
        operator: "AND",
        value: "",
        exact: false,
      },
    ]);
  };

  const updateQueryPart = (id: string, updates: Partial<QueryPart>) => {
    setQueryParts((parts) =>
      parts.map((part) => (part.id === id ? { ...part, ...updates } : part)),
    );
  };

  const removeQueryPart = (id: string) => {
    setQueryParts((parts) => parts.filter((part) => part.id !== id));
  };

  const handleSearch = () => {
    onSearch?.(queryString);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(queryParts, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "search-query.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parts = JSON.parse(e.target?.result as string);
          setQueryParts(parts);
        } catch (error) {
          logger.error("Failed to import query:", error);
          alert("Failed to import query. Please check the file format.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(queryString);
  };

  const handleClear = () => {
    setQueryParts([
      {
        id: crypto.randomUUID(),
        field: "text",
        operator: "AND",
        value: "",
        exact: false,
      },
    ]);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="visual">Visual Builder</TabsTrigger>
            <TabsTrigger value="code">Query Code</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label>
                <Upload className="mr-2 h-4 w-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Visual Builder */}
        <TabsContent value="visual" className="space-y-4">
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-3">
              {queryParts.map((part, index) => (
                <QueryPartEditor
                  key={part.id}
                  part={part}
                  index={index}
                  showOperator={index > 0}
                  onChange={(updates) => updateQueryPart(part.id, updates)}
                  onRemove={() => removeQueryPart(part.id)}
                />
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addQueryPart}
                className="w-full border-dashed"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add condition
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Code View */}
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Query Code</span>
                <Button variant="ghost" size="sm" onClick={handleCopyQuery}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </CardTitle>
              <CardDescription>
                The generated search query based on your conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="rounded-md bg-muted p-4 text-sm">
                <code>{queryString || "(empty query)"}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Query Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>
                <code className="rounded bg-muted px-1">from:alice</code> -
                Messages from user alice
              </div>
              <div>
                <code className="rounded bg-muted px-1">in:general</code> -
                Messages in #general channel
              </div>
              <div>
                <code className="rounded bg-muted px-1">has:link</code> -
                Messages containing links
              </div>
              <div>
                <code className="rounded bg-muted px-1">is:pinned</code> -
                Pinned messages
              </div>
              <div>
                <code className="rounded bg-muted px-1">
                  &quot;exact phrase&quot;
                </code>{" "}
                - Match exact phrase
              </div>
              <div>
                <code className="rounded bg-muted px-1">term1 AND term2</code> -
                Both terms must appear
              </div>
              <div>
                <code className="rounded bg-muted px-1">term1 OR term2</code> -
                Either term can appear
              </div>
              <div>
                <code className="rounded bg-muted px-1">NOT term</code> -
                Exclude term
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Query Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Query Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md bg-muted p-3">
            <Code className="h-4 w-4 shrink-0 text-muted-foreground" />
            <code className="flex-1 text-sm">
              {queryString || "(empty query)"}
            </code>
            <Button onClick={handleSearch} size="sm">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Query Part Editor
// ============================================================================

interface QueryPartEditorProps {
  part: QueryPart;
  index: number;
  showOperator: boolean;
  onChange: (updates: Partial<QueryPart>) => void;
  onRemove: () => void;
}

function QueryPartEditor({
  part,
  index,
  showOperator,
  onChange,
  onRemove,
}: QueryPartEditorProps) {
  return (
    <div className="hover:border-primary/50 group relative rounded-lg border bg-card p-4 transition-colors">
      {/* Drag Handle */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="ml-6 space-y-3">
        {/* Operator (for subsequent parts) */}
        {showOperator && (
          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs">Operator</Label>
            <Select
              value={part.operator}
              onValueChange={(value: BooleanOperator) =>
                onChange({ operator: value })
              }
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
                <SelectItem value="NOT">NOT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Field and Value */}
        <div className="flex items-center gap-2">
          <Label className="w-20 text-xs">Field</Label>
          <Select
            value={part.field}
            onValueChange={(value: QueryField) => onChange({ field: value })}
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(fieldConfig).map(([field, config]) => (
                <SelectItem key={field} value={field}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={part.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={fieldConfig[part.field].placeholder}
            className="h-8 flex-1"
          />

          {part.field === "text" && (
            <Button
              variant={part.exact ? "secondary" : "outline"}
              size="sm"
              onClick={() => onChange({ exact: !part.exact })}
              className="h-8"
              title="Exact phrase match"
            >
              &quot;&quot;
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="hover:bg-destructive/10 h-8 w-8 text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Value Preview */}
        {part.value && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Code className="h-3 w-3" />
            <code className="rounded bg-muted px-1">
              {buildSinglePartQuery(part)}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Query Building Helpers
// ============================================================================

function buildSinglePartQuery(part: QueryPart): string {
  if (!part.value) return "";

  let query = "";

  if (part.field === "text") {
    query = part.exact ? `"${part.value}"` : part.value;
  } else {
    query = `${part.field}:${part.value}`;
  }

  return query;
}

function buildQueryString(parts: QueryPart[]): string {
  const validParts = parts.filter((part) => part.value);

  if (validParts.length === 0) return "";

  return validParts
    .map((part, index) => {
      const partQuery = buildSinglePartQuery(part);

      if (index === 0) {
        return part.operator === "NOT" ? `NOT ${partQuery}` : partQuery;
      }

      return `${part.operator} ${partQuery}`;
    })
    .join(" ");
}

export default AdvancedSearchBuilder;
