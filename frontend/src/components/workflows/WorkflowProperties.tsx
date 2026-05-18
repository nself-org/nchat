"use client";

/**
 * WorkflowProperties - Properties panel for selected step
 *
 * Displays and edits configuration for the currently selected workflow step
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  useWorkflowBuilderStore,
  selectSelectedStep,
  selectSelectedEdge,
} from "@/stores/workflow-builder-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Info } from "lucide-react";
import type { WorkflowStep } from "@/lib/workflows/workflow-types";

// Import step-specific property editors
import { TriggerStepProperties } from "./steps/TriggerStep";
import { MessageStepProperties } from "./steps/MessageStep";
import { FormStepProperties } from "./steps/FormStep";
import { ConditionStepProperties } from "./steps/ConditionStep";
import { DelayStepProperties } from "./steps/DelayStep";
import { WebhookStepProperties } from "./steps/WebhookStep";
import { ApprovalStepProperties } from "./steps/ApprovalStep";

interface WorkflowPropertiesProps {
  className?: string;
}

export function WorkflowProperties({ className }: WorkflowPropertiesProps) {
  const selectedStep = useWorkflowBuilderStore(selectSelectedStep);
  const selectedEdge = useWorkflowBuilderStore(selectSelectedEdge);
  const { updateStep, deleteStep, deleteEdge, setPropertiesPanelOpen } =
    useWorkflowBuilderStore();

  const handleClose = () => {
    setPropertiesPanelOpen(false);
  };

  // No selection
  if (!selectedStep && !selectedEdge) {
    return (
      <div className={cn("flex flex-col bg-card", className)}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Properties</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Info className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">Select a step to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  // Edge selected
  if (selectedEdge && !selectedStep) {
    return (
      <div className={cn("flex flex-col bg-card", className)}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Connection Properties</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            <div>
              <Label className="text-xs">Type</Label>
              <p className="mt-1 text-sm">{selectedEdge.type}</p>
            </div>
            {selectedEdge.label && (
              <div>
                <Label className="text-xs">Label</Label>
                <p className="mt-1 text-sm">{selectedEdge.label}</p>
              </div>
            )}
            <div className="pt-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => deleteEdge(selectedEdge.id)}
              >
                Delete Connection
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Step selected
  if (!selectedStep) return null;

  return (
    <div className={cn("flex flex-col bg-card", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Step Properties</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* Common properties */}
          <div>
            <Label className="text-xs">Step Name</Label>
            <Input
              value={selectedStep.name}
              onChange={(e) =>
                updateStep(selectedStep.id, { name: e.target.value })
              }
              className="mt-1 h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={selectedStep.description || ""}
              onChange={(e) =>
                updateStep(selectedStep.id, { description: e.target.value })
              }
              className="mt-1 min-h-[60px] text-sm"
              placeholder="Optional description..."
            />
          </div>

          {/* Step-specific properties */}
          <div className="border-t pt-2">
            <StepSpecificProperties
              step={selectedStep}
              onUpdate={(config) =>
                updateStep(selectedStep.id, {
                  config: { ...selectedStep.config, ...config },
                })
              }
            />
          </div>

          {/* Delete button */}
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => deleteStep(selectedStep.id)}
            >
              Delete Step
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// Render step-specific properties based on type
function StepSpecificProperties({
  step,
  onUpdate,
}: {
  step: WorkflowStep;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  switch (step.type) {
    case "trigger":
      return <TriggerStepProperties step={step} onUpdate={onUpdate} />;
    case "message":
      return <MessageStepProperties step={step} onUpdate={onUpdate} />;
    case "form":
      return <FormStepProperties step={step} onUpdate={onUpdate} />;
    case "condition":
      return <ConditionStepProperties step={step} onUpdate={onUpdate} />;
    case "delay":
      return <DelayStepProperties step={step} onUpdate={onUpdate} />;
    case "webhook":
      return <WebhookStepProperties step={step} onUpdate={onUpdate} />;
    case "approval":
      return <ApprovalStepProperties step={step} onUpdate={onUpdate} />;
    case "action":
      return <ActionStepProperties step={step} onUpdate={onUpdate} />;
    case "loop":
      return <LoopStepProperties step={step} onUpdate={onUpdate} />;
    case "parallel":
      return <ParallelStepProperties step={step} onUpdate={onUpdate} />;
    case "end":
      return <EndStepProperties step={step} onUpdate={onUpdate} />;
    default:
      return (
        <p className="text-xs text-muted-foreground">
          No configuration available for this step type.
        </p>
      );
  }
}

// Simple property editors for action, loop, parallel, and end steps
function ActionStepProperties({
  step,
  onUpdate,
}: {
  step: WorkflowStep;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = step.config as {
    actionType?: string;
    variableName?: string;
    variableValue?: unknown;
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Action Type</Label>
        <Select
          value={config.actionType || "set_variable"}
          onValueChange={(value) => onUpdate({ actionType: value })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="set_variable">Set Variable</SelectItem>
            <SelectItem value="add_reaction">Add Reaction</SelectItem>
            <SelectItem value="pin_message">Pin Message</SelectItem>
            <SelectItem value="create_channel">Create Channel</SelectItem>
            <SelectItem value="invite_user">Invite User</SelectItem>
            <SelectItem value="notify">Send Notification</SelectItem>
            <SelectItem value="log">Log Message</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.actionType === "set_variable" && (
        <>
          <div>
            <Label className="text-xs">Variable Name</Label>
            <Input
              value={config.variableName || ""}
              onChange={(e) => onUpdate({ variableName: e.target.value })}
              className="mt-1 h-8 font-mono text-sm"
              placeholder="myVariable"
            />
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              value={String(config.variableValue || "")}
              onChange={(e) => onUpdate({ variableValue: e.target.value })}
              className="mt-1 h-8 text-sm"
              placeholder="Value or {{variable}}"
            />
          </div>
        </>
      )}
    </div>
  );
}

function LoopStepProperties({
  step,
  onUpdate,
}: {
  step: WorkflowStep;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = step.config as {
    loopType?: string;
    collection?: string;
    count?: number;
    maxIterations?: number;
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Loop Type</Label>
        <Select
          value={config.loopType || "for_each"}
          onValueChange={(value) => onUpdate({ loopType: value })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="for_each">For Each</SelectItem>
            <SelectItem value="count">Count</SelectItem>
            <SelectItem value="while">While</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.loopType === "for_each" && (
        <div>
          <Label className="text-xs">Collection Variable</Label>
          <Input
            value={config.collection || ""}
            onChange={(e) => onUpdate({ collection: e.target.value })}
            className="mt-1 h-8 font-mono text-sm"
            placeholder="items"
          />
        </div>
      )}

      {config.loopType === "count" && (
        <div>
          <Label className="text-xs">Iterations</Label>
          <Input
            type="number"
            value={config.count || 1}
            onChange={(e) => onUpdate({ count: parseInt(e.target.value) })}
            className="mt-1 h-8 text-sm"
            min={1}
          />
        </div>
      )}

      <div>
        <Label className="text-xs">Max Iterations (safety limit)</Label>
        <Input
          type="number"
          value={config.maxIterations || 100}
          onChange={(e) =>
            onUpdate({ maxIterations: parseInt(e.target.value) })
          }
          className="mt-1 h-8 text-sm"
          min={1}
          max={1000}
        />
      </div>
    </div>
  );
}

function ParallelStepProperties({
  step,
  onUpdate,
}: {
  step: WorkflowStep;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = step.config as { waitForAll?: boolean };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs">Wait for All Branches</Label>
          <p className="text-[10px] text-muted-foreground">
            Wait for all branches to complete before continuing
          </p>
        </div>
        <Switch
          checked={config.waitForAll !== false}
          onCheckedChange={(checked) => onUpdate({ waitForAll: checked })}
        />
      </div>
    </div>
  );
}

function EndStepProperties({
  step,
  onUpdate,
}: {
  step: WorkflowStep;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const config = step.config as { status?: string; message?: string };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">End Status</Label>
        <Select
          value={config.status || "success"}
          onValueChange={(value) => onUpdate({ status: value })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">End Message</Label>
        <Textarea
          value={config.message || ""}
          onChange={(e) => onUpdate({ message: e.target.value })}
          className="mt-1 min-h-[60px] text-sm"
          placeholder="Optional completion message..."
        />
      </div>
    </div>
  );
}

export default WorkflowProperties;
