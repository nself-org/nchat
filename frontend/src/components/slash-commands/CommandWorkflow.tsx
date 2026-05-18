"use client";

/**
 * CommandWorkflow - Configure workflow trigger
 */

import { useState } from "react";
import { Workflow, Plus, X, ArrowRight } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { CommandWorkflow as CommandWorkflowType } from "@/lib/slash-commands/command-types";

// ============================================================================
// Types
// ============================================================================

interface CommandWorkflowProps {
  workflow?: Partial<CommandWorkflowType>;
  onChange: (workflow: Partial<CommandWorkflowType>) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CommandWorkflow({
  workflow = {},
  onChange,
}: CommandWorkflowProps) {
  const [newMappingArg, setNewMappingArg] = useState("");
  const [newMappingInput, setNewMappingInput] = useState("");

  const handleAddMapping = () => {
    if (!newMappingArg.trim() || !newMappingInput.trim()) return;
    const mapping = workflow.inputMapping || {};
    onChange({
      ...workflow,
      inputMapping: {
        ...mapping,
        [newMappingInput.trim()]: newMappingArg.trim(),
      },
    });
    setNewMappingArg("");
    setNewMappingInput("");
  };

  const handleRemoveMapping = (key: string) => {
    const mapping = { ...workflow.inputMapping };
    delete mapping[key];
    onChange({ ...workflow, inputMapping: mapping });
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Workflow Configuration</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Trigger an automation workflow when this command is executed.
        </p>
      </div>

      {/* Workflow ID */}
      <div className="space-y-2">
        <Label>Workflow ID</Label>
        <Input
          value={workflow.workflowId || ""}
          onChange={(e) =>
            onChange({ ...workflow, workflowId: e.target.value })
          }
          placeholder="my-workflow-id"
        />
        <p className="text-xs text-muted-foreground">
          The unique identifier of the workflow to trigger
        </p>
      </div>

      {/* Input Mapping */}
      <div className="space-y-3">
        <Label>Input Mapping</Label>
        <p className="text-xs text-muted-foreground">
          Map command arguments to workflow input variables
        </p>

        {workflow.inputMapping &&
          Object.keys(workflow.inputMapping).length > 0 && (
            <div className="space-y-2">
              {Object.entries(workflow.inputMapping).map(
                ([inputKey, argKey]) => (
                  <div
                    key={inputKey}
                    className="bg-muted/30 flex items-center gap-2 rounded border px-3 py-2"
                  >
                    <code className="text-sm font-medium">{argKey}</code>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <code className="text-sm">{inputKey}</code>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveMapping(inputKey)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ),
              )}
            </div>
          )}

        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Command Arg</Label>
            <Input
              value={newMappingArg}
              onChange={(e) => setNewMappingArg(e.target.value)}
              placeholder="argName"
              className="font-mono text-sm"
            />
          </div>
          <ArrowRight className="mt-6 h-4 w-4 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Workflow Input</Label>
            <Input
              value={newMappingInput}
              onChange={(e) => setNewMappingInput(e.target.value)}
              placeholder="inputName"
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMapping();
                }
              }}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="mt-6"
            onClick={handleAddMapping}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Wait for Completion */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Wait for Completion</Label>
          <p className="text-xs text-muted-foreground">
            Wait for the workflow to complete before responding
          </p>
        </div>
        <Switch
          checked={workflow.waitForCompletion ?? false}
          onCheckedChange={(checked) =>
            onChange({ ...workflow, waitForCompletion: checked })
          }
        />
      </div>

      {/* Timeout */}
      {workflow.waitForCompletion && (
        <div className="space-y-2">
          <Label>Timeout (ms)</Label>
          <Input
            type="number"
            min={1000}
            max={60000}
            value={workflow.timeout || ""}
            onChange={(e) =>
              onChange({
                ...workflow,
                timeout: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="30000"
          />
          <p className="text-xs text-muted-foreground">
            Maximum time to wait for workflow completion. Default: 30 seconds.
          </p>
        </div>
      )}

      {/* Preview */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Workflow Trigger Summary</h4>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {workflow.workflowId ? (
            <li>
              - Will trigger workflow: <strong>{workflow.workflowId}</strong>
            </li>
          ) : (
            <li className="text-destructive">- No workflow ID configured</li>
          )}
          {workflow.inputMapping &&
            Object.keys(workflow.inputMapping).length > 0 && (
              <li>
                - {Object.keys(workflow.inputMapping).length} input(s) mapped
              </li>
            )}
          <li>
            - {workflow.waitForCompletion ? "Will wait" : "Will not wait"} for
            completion
          </li>
          {workflow.waitForCompletion && workflow.timeout && (
            <li>- Timeout: {workflow.timeout}ms</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default CommandWorkflow;
