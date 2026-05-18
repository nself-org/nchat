"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  BaseModal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  type ModalSize,
} from "./base-modal";

export type SettingType = "text" | "number" | "boolean" | "select" | "color";

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: SettingType;
  defaultValue?: unknown;
  options?: SettingOption[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface SettingsSection {
  title?: string;
  description?: string;
  settings: SettingDefinition[];
}

export interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  sections: SettingsSection[];
  initialValues?: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  size?: ModalSize;
  showResetButton?: boolean;
  onReset?: () => void;
}

export function SettingsModal({
  open,
  onOpenChange,
  title = "Settings",
  description,
  sections,
  initialValues = {},
  onSave,
  onCancel,
  loading: externalLoading,
  size = "md",
  showResetButton = false,
  onReset,
}: SettingsModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [internalLoading, setInternalLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loading = externalLoading ?? internalLoading;

  // Initialize values when modal opens
  useEffect(() => {
    if (open) {
      // Build initial values from defaults and provided values
      const defaults: Record<string, unknown> = {};
      sections.forEach((section) => {
        section.settings.forEach((setting) => {
          if (setting.defaultValue !== undefined) {
            defaults[setting.key] = setting.defaultValue;
          }
        });
      });
      setValues({ ...defaults, ...initialValues });
      setHasChanges(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleValueChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (externalLoading === undefined) {
      setInternalLoading(true);
    }

    try {
      await onSave(values);
      onOpenChange(false);
    } catch (error) {
      logger.error("Save settings failed:", error);
    } finally {
      if (externalLoading === undefined) {
        setInternalLoading(false);
      }
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaults: Record<string, unknown> = {};
    sections.forEach((section) => {
      section.settings.forEach((setting) => {
        if (setting.defaultValue !== undefined) {
          defaults[setting.key] = setting.defaultValue;
        }
      });
    });
    setValues(defaults);
    setHasChanges(true);
    onReset?.();
  };

  const renderSetting = (setting: SettingDefinition) => {
    const value = values[setting.key];

    switch (setting.type) {
      case "boolean":
        return (
          <div className="flex items-center justify-between" key={setting.key}>
            <div className="space-y-0.5">
              <Label htmlFor={setting.key} className="text-sm font-medium">
                {setting.label}
              </Label>
              {setting.description && (
                <p className="text-xs text-muted-foreground">
                  {setting.description}
                </p>
              )}
            </div>
            <Switch
              id={setting.key}
              checked={Boolean(value)}
              onCheckedChange={(checked) =>
                handleValueChange(setting.key, checked)
              }
              disabled={loading}
            />
          </div>
        );

      case "select":
        return (
          <div className="space-y-2" key={setting.key}>
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
            </Label>
            {setting.description && (
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
            )}
            <Select
              value={String(value ?? "")}
              onValueChange={(v) => handleValueChange(setting.key, v)}
              disabled={loading}
            >
              <SelectTrigger id={setting.key}>
                <SelectValue placeholder={setting.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {setting.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "number":
        return (
          <div className="space-y-2" key={setting.key}>
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
            </Label>
            {setting.description && (
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
            )}
            <Input
              id={setting.key}
              type="number"
              value={(value as number) ?? ""}
              onChange={(e) =>
                handleValueChange(setting.key, e.target.valueAsNumber || 0)
              }
              placeholder={setting.placeholder}
              min={setting.min}
              max={setting.max}
              step={setting.step}
              disabled={loading}
            />
          </div>
        );

      case "color":
        return (
          <div className="space-y-2" key={setting.key}>
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
            </Label>
            {setting.description && (
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <div
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: String(value || "#000000") }}
              />
              <Input
                id={setting.key}
                type="color"
                value={String(value || "#000000")}
                onChange={(e) => handleValueChange(setting.key, e.target.value)}
                className="h-10 w-full"
                disabled={loading}
              />
            </div>
          </div>
        );

      case "text":
      default:
        return (
          <div className="space-y-2" key={setting.key}>
            <Label htmlFor={setting.key} className="text-sm font-medium">
              {setting.label}
            </Label>
            {setting.description && (
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
            )}
            <Input
              id={setting.key}
              type="text"
              value={String(value ?? "")}
              onChange={(e) => handleValueChange(setting.key, e.target.value)}
              placeholder={setting.placeholder}
              disabled={loading}
            />
          </div>
        );
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen && hasChanges) {
          // Could show unsaved changes warning here
        }
        onOpenChange(newOpen);
      }}
      size={size}
      showCloseButton
    >
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <ModalTitle>{title}</ModalTitle>
            {description && <ModalDescription>{description}</ModalDescription>}
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold">{section.title}</h4>
                  {section.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {section.settings.map((setting) => renderSetting(setting))}
              </div>

              {sectionIndex < sections.length - 1 && (
                <Separator className="mt-6" />
              )}
            </div>
          ))}
        </div>
      </ModalBody>

      <ModalFooter>
        {showResetButton && (
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={loading}
            className="mr-auto"
          >
            Reset to defaults
          </Button>
        )}
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading || !hasChanges}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}

// Quick settings modal for simple on/off toggles
export interface QuickSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  settings: Array<{
    key: string;
    label: string;
    description?: string;
    value: boolean;
  }>;
  onSave: (values: Record<string, boolean>) => Promise<void> | void;
  loading?: boolean;
}

export function QuickSettingsModal({
  open,
  onOpenChange,
  title = "Quick Settings",
  settings,
  onSave,
  loading,
}: QuickSettingsModalProps) {
  const sections: SettingsSection[] = [
    {
      settings: settings.map((s) => ({
        key: s.key,
        label: s.label,
        description: s.description,
        type: "boolean" as const,
        defaultValue: s.value,
      })),
    },
  ];

  const initialValues = settings.reduce(
    (acc, s) => ({ ...acc, [s.key]: s.value }),
    {} as Record<string, boolean>,
  );

  return (
    <SettingsModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      sections={sections}
      initialValues={initialValues}
      onSave={onSave as (values: Record<string, unknown>) => Promise<void>}
      loading={loading}
      size="sm"
    />
  );
}
