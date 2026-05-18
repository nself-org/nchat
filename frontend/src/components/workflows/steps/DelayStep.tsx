"use client";

/**
 * DelayStep - Delay configuration component
 *
 * Configures wait/delay steps
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DelayStep as DelayStepType,
  DelayType,
} from "@/lib/workflows/workflow-types";

interface DelayStepPropertiesProps {
  step: DelayStepType;
  onUpdate: (config: Record<string, unknown>) => void;
}

export function DelayStepProperties({
  step,
  onUpdate,
}: DelayStepPropertiesProps) {
  const config = step.config;

  return (
    <div className="space-y-3">
      {/* Delay type */}
      <div>
        <Label className="text-xs">Delay Type</Label>
        <Select
          value={config.delayType}
          onValueChange={(value) => onUpdate({ delayType: value as DelayType })}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Duration</SelectItem>
            <SelectItem value="until_time">Until Specific Time</SelectItem>
            <SelectItem value="until_condition">Until Condition Met</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fixed duration */}
      {config.delayType === "fixed" && (
        <div>
          <Label className="text-xs">Duration</Label>
          <div className="mt-1 flex gap-2">
            <Input
              type="number"
              value={config.duration || 60}
              onChange={(e) => onUpdate({ duration: parseInt(e.target.value) })}
              className="h-8 flex-1 text-sm"
              min={1}
            />
            <Select
              value={config.durationUnit || "seconds"}
              onValueChange={(value) => onUpdate({ durationUnit: value })}
            >
              <SelectTrigger className="h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">Seconds</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration presets */}
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              { label: "30s", duration: 30, unit: "seconds" },
              { label: "1m", duration: 1, unit: "minutes" },
              { label: "5m", duration: 5, unit: "minutes" },
              { label: "15m", duration: 15, unit: "minutes" },
              { label: "1h", duration: 1, unit: "hours" },
              { label: "24h", duration: 24, unit: "hours" },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onUpdate({
                    duration: preset.duration,
                    durationUnit: preset.unit,
                  })
                }
                className="hover:bg-muted/80 rounded bg-muted px-2 py-0.5 text-[10px]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Until specific time */}
      {config.delayType === "until_time" && (
        <div>
          <Label className="text-xs">Wait Until</Label>
          <Input
            type="datetime-local"
            value={config.untilTime?.slice(0, 16) || ""}
            onChange={(e) =>
              onUpdate({ untilTime: new Date(e.target.value).toISOString() })
            }
            className="mt-1 h-8 text-sm"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Workflow will pause until this time
          </p>
        </div>
      )}

      {/* Until condition */}
      {config.delayType === "until_condition" && (
        <div>
          <p className="text-xs text-muted-foreground">
            Configure the condition that must be met to continue. The workflow
            will check periodically until the condition is true.
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Note: Configure conditions in a linked Condition step.
          </p>
        </div>
      )}

      {/* Max wait duration (for until_condition) */}
      {config.delayType === "until_condition" && (
        <div>
          <Label className="text-xs">Maximum Wait Duration (ms)</Label>
          <Input
            type="number"
            value={config.maxWaitDuration || 3600000}
            onChange={(e) =>
              onUpdate({ maxWaitDuration: parseInt(e.target.value) })
            }
            className="mt-1 h-8 text-sm"
            min={1000}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Failsafe: max time to wait before continuing anyway
          </p>
        </div>
      )}

      {/* Info */}
      <div className="border-t pt-2">
        <p className="text-[10px] text-muted-foreground">
          {config.delayType === "fixed" && (
            <>
              The workflow will pause for the specified duration before
              continuing to the next step.
            </>
          )}
          {config.delayType === "until_time" && (
            <>
              The workflow will pause until the specified date and time. If the
              time has already passed, it will continue immediately.
            </>
          )}
          {config.delayType === "until_condition" && (
            <>
              The workflow will poll periodically until the condition is met or
              the max wait duration is reached.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default DelayStepProperties;
