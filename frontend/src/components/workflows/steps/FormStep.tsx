"use client";

/**
 * FormStep - Form configuration component
 *
 * Configures data collection forms
 */

import * as React from "react";
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
import { Plus, Trash2, GripVertical } from "lucide-react";
import type {
  FormStep as FormStepType,
  FormField,
  FormFieldType,
  MessageTarget,
} from "@/lib/workflows/workflow-types";

interface FormStepPropertiesProps {
  step: FormStepType;
  onUpdate: (config: Record<string, unknown>) => void;
}

export function FormStepProperties({
  step,
  onUpdate,
}: FormStepPropertiesProps) {
  const config = step.config;

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: `field_${(config.fields?.length || 0) + 1}`,
      label: "New Field",
      type: "text",
      required: false,
    };
    onUpdate({ fields: [...(config.fields || []), newField] });
  };

  const handleUpdateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...(config.fields || [])];
    newFields[index] = { ...newFields[index], ...updates };
    onUpdate({ fields: newFields });
  };

  const handleDeleteField = (index: number) => {
    const newFields = config.fields?.filter((_, i) => i !== index) || [];
    onUpdate({ fields: newFields });
  };

  return (
    <div className="space-y-3">
      {/* Form title */}
      <div>
        <Label className="text-xs">Form Title</Label>
        <Input
          value={config.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="mt-1 h-8 text-sm"
          placeholder="Form title"
        />
      </div>

      {/* Form description */}
      <div>
        <Label className="text-xs">Description</Label>
        <Textarea
          value={config.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="mt-1 min-h-[60px] text-sm"
          placeholder="Optional form description..."
        />
      </div>

      {/* Send To */}
      <div>
        <Label className="text-xs">Send To</Label>
        <Select
          value={config.target}
          onValueChange={(value) =>
            onUpdate({ target: value as MessageTarget })
          }
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trigger_source">Trigger Source</SelectItem>
            <SelectItem value="user">Specific User</SelectItem>
            <SelectItem value="channel">Channel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeout */}
      <div>
        <Label className="text-xs">Timeout (seconds)</Label>
        <Input
          type="number"
          value={config.timeoutSeconds || 300}
          onChange={(e) =>
            onUpdate({ timeoutSeconds: parseInt(e.target.value) })
          }
          className="mt-1 h-8 text-sm"
          min={30}
          max={86400}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          How long to wait for a response
        </p>
      </div>

      {/* Fields */}
      <div className="border-t pt-2">
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-xs">Form Fields</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6"
            onClick={handleAddField}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Field
          </Button>
        </div>

        {!config.fields || config.fields.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No fields added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {config.fields.map((field, index) => (
              <FieldEditor
                key={field.id}
                field={field}
                onUpdate={(updates) => handleUpdateField(index, updates)}
                onDelete={() => handleDeleteField(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit button label */}
      <div className="border-t pt-2">
        <Label className="text-xs">Submit Button Label</Label>
        <Input
          value={config.submitLabel || "Submit"}
          onChange={(e) => onUpdate({ submitLabel: e.target.value })}
          className="mt-1 h-8 text-sm"
        />
      </div>
    </div>
  );
}

// Field editor component
function FieldEditor({
  field,
  onUpdate,
  onDelete,
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const fieldTypes: { value: FormFieldType; label: string }[] = [
    { value: "text", label: "Text" },
    { value: "textarea", label: "Textarea" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "select", label: "Dropdown" },
    { value: "multiselect", label: "Multi-select" },
    { value: "checkbox", label: "Checkbox" },
    { value: "radio", label: "Radio" },
    { value: "date", label: "Date" },
    { value: "datetime", label: "Date & Time" },
    { value: "user_select", label: "User Select" },
    { value: "channel_select", label: "Channel Select" },
  ];

  return (
    <div className="bg-muted/30 rounded border p-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 cursor-move text-muted-foreground" />
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="h-6 flex-1 text-xs"
          placeholder="Field label"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "-" : "+"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-2 space-y-2 pl-6">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Name (variable)</Label>
              <Input
                value={field.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="h-6 font-mono text-xs"
                placeholder="fieldName"
              />
            </div>
            <div>
              <Label className="text-[10px]">Type</Label>
              <select
                value={field.type}
                onChange={(e) =>
                  onUpdate({ type: e.target.value as FormFieldType })
                }
                className="h-6 w-full rounded border bg-background text-xs"
              >
                {fieldTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-[10px]">Placeholder</Label>
            <Input
              value={field.placeholder || ""}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              className="h-6 text-xs"
              placeholder="Placeholder text"
            />
          </div>

          {/* Options for select/radio */}
          {["select", "multiselect", "radio"].includes(field.type) && (
            <div>
              <Label className="text-[10px]">Options (one per line)</Label>
              <Textarea
                value={
                  field.options
                    ?.map((o) => `${o.value}:${o.label}`)
                    .join("\n") || ""
                }
                onChange={(e) => {
                  const options = e.target.value
                    .split("\n")
                    .map((line) => {
                      const [value, label] = line.split(":");
                      return {
                        value: value?.trim() || "",
                        label: label?.trim() || value?.trim() || "",
                      };
                    })
                    .filter((o) => o.value);
                  onUpdate({ options });
                }}
                className="min-h-[60px] font-mono text-xs"
                placeholder="value:Label&#10;option2:Option 2"
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1 text-[10px]">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => onUpdate({ required: e.target.checked })}
                className="h-3 w-3"
              />
              Required
            </label>
          </div>

          {field.helpText !== undefined && (
            <div>
              <Label className="text-[10px]">Help Text</Label>
              <Input
                value={field.helpText || ""}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                className="h-6 text-xs"
                placeholder="Help text shown below field"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FormStepProperties;
