"use client";

/**
 * ConditionStep - Condition configuration component
 *
 * Configures branching conditions
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type {
  ConditionStep as ConditionStepType,
  Condition,
  ConditionOperator,
  ConditionLogic,
} from "@/lib/workflows/workflow-types";
import {
  conditionOperators,
  createCondition,
} from "@/lib/workflows/workflow-conditions";

interface ConditionStepPropertiesProps {
  step: ConditionStepType;
  onUpdate: (config: Record<string, unknown>) => void;
}

export function ConditionStepProperties({
  step,
  onUpdate,
}: ConditionStepPropertiesProps) {
  const config = step.config;

  const handleAddCondition = () => {
    const newCondition = createCondition("", "equals", "");
    onUpdate({
      conditions: [...(config.conditions || []), newCondition],
    });
  };

  const handleUpdateCondition = (
    index: number,
    updates: Partial<Condition>,
  ) => {
    const newConditions = [...(config.conditions || [])];
    newConditions[index] = { ...newConditions[index], ...updates } as Condition;
    onUpdate({ conditions: newConditions });
  };

  const handleDeleteCondition = (index: number) => {
    const newConditions =
      config.conditions?.filter((_, i) => i !== index) || [];
    onUpdate({ conditions: newConditions });
  };

  return (
    <div className="space-y-3">
      {/* Logic */}
      <div>
        <Label className="text-xs">Logic</Label>
        <Select
          value={config.logic}
          onValueChange={(value) =>
            onUpdate({ logic: value as ConditionLogic })
          }
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">
              AND - All conditions must be true
            </SelectItem>
            <SelectItem value="or">OR - Any condition can be true</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conditions */}
      <div className="border-t pt-2">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs">Conditions</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6"
            onClick={handleAddCondition}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>

        {!config.conditions || config.conditions.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No conditions added yet.
            <br />
            Without conditions, this will always return true.
          </p>
        ) : (
          <div className="space-y-2">
            {config.conditions.map((condition, index) => {
              // Type guard - only handle simple conditions, not groups
              if ("conditions" in condition) return null;

              return (
                <React.Fragment key={condition.id}>
                  {index > 0 && (
                    <div className="text-center text-[10px] uppercase text-muted-foreground">
                      {config.logic}
                    </div>
                  )}
                  <ConditionEditor
                    condition={condition as Condition}
                    onUpdate={(updates) =>
                      handleUpdateCondition(index, updates)
                    }
                    onDelete={() => handleDeleteCondition(index)}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="border-t pt-2">
        <p className="text-[10px] text-muted-foreground">
          <strong>True branch:</strong> Executes when conditions are met
          <br />
          <strong>False branch:</strong> Executes when conditions are not met
        </p>
      </div>
    </div>
  );
}

// Condition editor component
function ConditionEditor({
  condition,
  onUpdate,
  onDelete,
}: {
  condition: Condition;
  onUpdate: (updates: Partial<Condition>) => void;
  onDelete: () => void;
}) {
  const operatorOptions = Object.entries(conditionOperators).map(
    ([key, info]) => ({
      value: key as ConditionOperator,
      label: info.label,
    }),
  );

  const selectedOperator = conditionOperators[condition.operator];
  const showValue = selectedOperator?.valueRequired !== false;

  return (
    <div className="bg-muted/30 space-y-2 rounded border p-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          {/* Field */}
          <div>
            <Label className="text-[10px]">Field</Label>
            <Input
              value={condition.field}
              onChange={(e) => onUpdate({ field: e.target.value })}
              className="h-6 font-mono text-xs"
              placeholder="variables.myVar or message.content"
            />
          </div>

          {/* Operator */}
          <div>
            <Label className="text-[10px]">Operator</Label>
            <select
              value={condition.operator}
              onChange={(e) =>
                onUpdate({ operator: e.target.value as ConditionOperator })
              }
              className="h-6 w-full rounded border bg-background text-xs"
            >
              {operatorOptions.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value */}
          {showValue && (
            <div>
              <Label className="text-[10px]">Value</Label>
              <Input
                value={String(condition.value || "")}
                onChange={(e) => onUpdate({ value: e.target.value })}
                className="h-6 text-xs"
                placeholder="Compare value"
              />
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-4 h-6 w-6 p-0 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default ConditionStepProperties;
