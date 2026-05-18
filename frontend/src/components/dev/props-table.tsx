"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

export interface PropDefinition {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string;
}

export interface PropsTableProps {
  props: PropDefinition[];
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function PropsTable({ props, className }: PropsTableProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-4 py-3 text-left font-semibold">Prop</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">Default</th>
            <th className="px-4 py-3 text-left font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop, index) => (
            <tr
              key={prop.name}
              className={cn(
                "border-b last:border-0",
                index % 2 === 0 ? "bg-background" : "bg-muted/20",
              )}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <code className="bg-primary/10 rounded px-1.5 py-0.5 font-mono text-primary">
                    {prop.name}
                  </code>
                  {prop.required && (
                    <Badge
                      variant="destructive"
                      className="h-4 px-1 text-[10px]"
                    >
                      required
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {prop.type}
                </code>
              </td>
              <td className="px-4 py-3">
                {prop.default ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {prop.default}
                  </code>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {prop.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Simple Props List (for compact display)
// ============================================================================

export function PropsList({ props, className }: PropsTableProps) {
  return (
    <dl className={cn("space-y-3", className)}>
      {props.map((prop) => (
        <div key={prop.name} className="flex flex-col gap-1">
          <dt className="flex items-center gap-2">
            <code className="bg-primary/10 rounded px-1.5 py-0.5 font-mono text-sm text-primary">
              {prop.name}
            </code>
            <code className="text-xs text-muted-foreground">{prop.type}</code>
            {prop.required && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                required
              </Badge>
            )}
          </dt>
          <dd className="pl-2 text-sm text-muted-foreground">
            {prop.description}
            {prop.default && (
              <span className="ml-2 text-xs">
                (default:{" "}
                <code className="rounded bg-muted px-1">{prop.default}</code>)
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
