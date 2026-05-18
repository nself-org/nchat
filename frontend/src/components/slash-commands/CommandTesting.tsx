"use client";

/**
 * CommandTesting - Test command sandbox
 */

import { useState, useCallback } from "react";
import {
  Play,
  Terminal,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  CommandDraft,
  CommandResult,
  ParsedCommand,
} from "@/lib/slash-commands/command-types";
import { parseCommand } from "@/lib/slash-commands";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface CommandTestingProps {
  command: CommandDraft;
}

interface TestResult {
  id: string;
  input: string;
  parsed: ParsedCommand | null;
  result: CommandResult | null;
  timestamp: Date;
  duration: number;
}

// ============================================================================
// Component
// ============================================================================

export function CommandTesting({ command }: CommandTestingProps) {
  const [input, setInput] = useState(`/${command.trigger || "command"}`);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  // Update input when trigger changes
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  // Run test
  const handleTest = useCallback(async () => {
    if (!command.trigger) return;

    setIsRunning(true);
    const startTime = Date.now();

    // Create a full command for parsing
    const fullCommand = {
      ...command,
      id: command.id || "test-command",
      name: command.name || command.trigger,
      description: command.description || "",
      category: command.category || "custom",
      arguments: command.arguments || [],
      permissions: command.permissions || {
        minRole: "member",
        allowGuests: false,
      },
      channels: command.channels || {
        allowedTypes: ["public", "private", "direct", "group"],
        allowInThreads: true,
      },
      responseConfig: command.responseConfig || {
        type: "ephemeral",
        ephemeral: true,
        showTyping: false,
      },
      actionType: command.actionType || "message",
      action: command.action || { type: "message" },
      isEnabled: true,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "test",
    } as const;

    try {
      // Parse the command
      const parsed = parseCommand(input, fullCommand as any);
      const duration = Date.now() - startTime;

      // Create mock result (actual execution would require full context)
      const result: CommandResult = parsed.isValid
        ? {
            success: true,
            response: {
              type: command.responseConfig?.type || "ephemeral",
              content:
                "Command parsed successfully. In production, this would execute the configured action.",
              ephemeral: true,
            },
          }
        : {
            success: false,
            error: parsed.errors.map((e) => e.message).join("\n"),
          };

      const testResult: TestResult = {
        id: `test-${Date.now()}`,
        input,
        parsed,
        result,
        timestamp: new Date(),
        duration,
      };

      setResults((prev) => [testResult, ...prev.slice(0, 9)]);
    } catch (error) {
      const testResult: TestResult = {
        id: `test-${Date.now()}`,
        input,
        parsed: null,
        result: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        timestamp: new Date(),
        duration: Date.now() - startTime,
      };

      setResults((prev) => [testResult, ...prev.slice(0, 9)]);
    } finally {
      setIsRunning(false);
    }
  }, [command, input]);

  // Clear results
  const handleClear = useCallback(() => {
    setResults([]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Test Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Test Input</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Terminal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`/${command.trigger || "command"} [args...]`}
                className="pl-9 font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleTest();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleTest}
              disabled={isRunning || !command.trigger}
            >
              {isRunning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Press Enter or click Test to run. Results show parsing and
            validation, not actual execution.
          </p>
        </div>

        {/* Quick Examples */}
        <div className="space-y-2">
          <Label className="text-xs">Quick Examples</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput(`/${command.trigger || "command"}`)}
            >
              Basic
            </Button>
            {command.arguments?.some((a) => a.required) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const args = command.arguments
                    ?.filter((a) => a.required && a.position !== undefined)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((a) =>
                      a.type === "user"
                        ? "@user"
                        : a.type === "number"
                          ? "42"
                          : "test",
                    )
                    .join(" ");
                  setInput(`/${command.trigger || "command"} ${args}`);
                }}
              >
                With Required Args
              </Button>
            )}
            {command.arguments?.some((a) => a.flag) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const flag = command.arguments?.find((a) => a.flag);
                  setInput(
                    `/${command.trigger || "command"} --${flag?.flag} value`,
                  );
                }}
              >
                With Flag
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setInput(`/${command.trigger || "command"} invalid @#$%`)
              }
            >
              Invalid Input
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Test Results</Label>
          {results.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Terminal className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No test results yet. Enter a command and click Test.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-lg border">
            <div className="space-y-3 p-4">
              {results.map((result) => (
                <TestResultCard key={result.id} result={result} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Test Result Card
// ============================================================================

function TestResultCard({ result }: { result: TestResult }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={cn(
        "rounded-lg border",
        result.result?.success
          ? "border-green-500/20 bg-green-500/5"
          : "border-red-500/20 bg-red-500/5",
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {result.result?.success ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <div className="min-w-0 flex-1">
          <code className="block truncate font-mono text-sm">
            {result.input}
          </code>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{result.timestamp.toLocaleTimeString()}</span>
            <span>-</span>
            <span>{result.duration}ms</span>
          </div>
        </div>
        <Badge variant={result.result?.success ? "outline" : "destructive"}>
          {result.result?.success ? "Passed" : "Failed"}
        </Badge>
      </button>

      {/* Details */}
      {isExpanded && (
        <div className="space-y-3 border-t p-3">
          {/* Parsing Results */}
          {result.parsed && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase text-muted-foreground">
                Parsing
              </h4>
              <div className="bg-muted/50 rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Valid:</span>
                  <span
                    className={
                      result.parsed.isValid ? "text-green-500" : "text-red-500"
                    }
                  >
                    {result.parsed.isValid ? "Yes" : "No"}
                  </span>
                </div>
                {result.parsed.args.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">
                      Arguments:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {result.parsed.args.map((arg, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {arg.definition.name}: {String(arg.value)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(result.parsed.flags).length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">
                      Flags:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(result.parsed.flags).map(
                        ([flag, arg]) => (
                          <Badge
                            key={flag}
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            --{flag}: {String(arg.value)}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Errors */}
          {result.parsed?.errors && result.parsed.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase text-muted-foreground">
                Errors
              </h4>
              <div className="rounded bg-red-500/10 p-2">
                <ul className="list-disc pl-4 text-sm text-red-600">
                  {result.parsed.errors.map((error, i) => (
                    <li key={i}>{error.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Result */}
          {result.result?.error && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase text-muted-foreground">
                Error
              </h4>
              <div className="rounded bg-red-500/10 p-2">
                <pre className="whitespace-pre-wrap text-sm text-red-600">
                  {result.result.error}
                </pre>
              </div>
            </div>
          )}

          {result.result?.success && result.result.response && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase text-muted-foreground">
                Response Preview
              </h4>
              <div className="rounded bg-green-500/10 p-2">
                <p className="text-sm">{result.result.response.content}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    Type: {result.result.response.type}
                  </Badge>
                  {result.result.response.ephemeral && (
                    <Badge variant="secondary" className="text-xs">
                      Ephemeral
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CommandTesting;
