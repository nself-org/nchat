"use client";

/**
 * Bot Builder Component
 * A wizard for creating and configuring custom bots
 */

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BotCommands } from "./BotCommands";
import { BotTriggers } from "./BotTriggers";
import { BotResponses } from "./BotResponses";
import { BotTesting } from "./BotTesting";
import { BotDeployment } from "./BotDeployment";
import type {
  BotBuilderDefinition,
  BotBuilderTrigger,
  BotBuilderAction,
} from "@/lib/bots";

// ============================================================================
// TYPES
// ============================================================================

interface BotBuilderProps {
  onSave?: (bot: BotBuilderDefinition) => void;
  onCancel?: () => void;
  initialBot?: Partial<BotBuilderDefinition>;
  className?: string;
}

type BuilderStep =
  | "info"
  | "triggers"
  | "responses"
  | "commands"
  | "test"
  | "deploy";

interface StepConfig {
  id: BuilderStep;
  label: string;
  description: string;
  icon: string;
}

// ============================================================================
// STEPS CONFIGURATION
// ============================================================================

const STEPS: StepConfig[] = [
  {
    id: "info",
    label: "Basic Info",
    description: "Name and description",
    icon: "Info",
  },
  {
    id: "triggers",
    label: "Triggers",
    description: "When to respond",
    icon: "Zap",
  },
  {
    id: "responses",
    label: "Responses",
    description: "What to say",
    icon: "MessageSquare",
  },
  {
    id: "commands",
    label: "Commands",
    description: "Slash commands",
    icon: "Terminal",
  },
  {
    id: "test",
    label: "Test",
    description: "Try it out",
    icon: "Play",
  },
  {
    id: "deploy",
    label: "Deploy",
    description: "Go live",
    icon: "Rocket",
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BotBuilder({
  onSave,
  onCancel,
  initialBot,
  className,
}: BotBuilderProps) {
  // Current step
  const [currentStep, setCurrentStep] = useState<BuilderStep>("info");
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Bot state
  const [bot, setBot] = useState<Partial<BotBuilderDefinition>>({
    id: initialBot?.id || `bot_${Date.now()}`,
    name: initialBot?.name || "",
    description: initialBot?.description || "",
    icon: initialBot?.icon,
    triggers: initialBot?.triggers || [],
    actions: initialBot?.actions || [],
    conditions: initialBot?.conditions || [],
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update bot field
  const updateBot = useCallback(
    <K extends keyof BotBuilderDefinition>(
      key: K,
      value: BotBuilderDefinition[K],
    ) => {
      setBot((prev) => ({ ...prev, [key]: value }));
      // Clear error when field is updated
      if (errors[key]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [errors],
  );

  // Add trigger
  const addTrigger = useCallback((trigger: BotBuilderTrigger) => {
    setBot((prev) => ({
      ...prev,
      triggers: [...(prev.triggers || []), trigger],
    }));
  }, []);

  // Remove trigger
  const removeTrigger = useCallback((triggerId: string) => {
    setBot((prev) => ({
      ...prev,
      triggers: (prev.triggers || []).filter((t) => t.id !== triggerId),
    }));
  }, []);

  // Add action
  const addAction = useCallback((action: BotBuilderAction) => {
    setBot((prev) => ({
      ...prev,
      actions: [...(prev.actions || []), action],
    }));
  }, []);

  // Remove action
  const removeAction = useCallback((actionId: string) => {
    setBot((prev) => ({
      ...prev,
      actions: (prev.actions || []).filter((a) => a.id !== actionId),
    }));
  }, []);

  // Validate current step
  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case "info":
        if (!bot.name?.trim()) {
          newErrors.name = "Bot name is required";
        }
        if (!bot.description?.trim()) {
          newErrors.description = "Description is required";
        }
        break;

      case "triggers":
        if (!bot.triggers?.length) {
          newErrors.triggers = "At least one trigger is required";
        }
        break;

      case "responses":
        if (!bot.actions?.length) {
          newErrors.actions = "At least one response action is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, bot]);

  // Navigate to next step
  const goNext = useCallback(() => {
    if (!validateStep()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex, validateStep]);

  // Navigate to previous step
  const goPrev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  // Jump to specific step
  const goToStep = useCallback(
    (step: BuilderStep) => {
      const targetIndex = STEPS.findIndex((s) => s.id === step);
      // Only allow jumping to completed or current steps
      if (targetIndex <= currentStepIndex) {
        setCurrentStep(step);
      }
    },
    [currentStepIndex],
  );

  // Save bot
  const handleSave = useCallback(() => {
    if (onSave && bot.id && bot.name && bot.description) {
      onSave(bot as BotBuilderDefinition);
    }
  }, [bot, onSave]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "info":
        return (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="bot-name"
                className="mb-1 block text-sm font-medium"
              >
                Bot Name
              </label>
              <input
                id="bot-name"
                type="text"
                value={bot.name || ""}
                onChange={(e) => updateBot("name", e.target.value)}
                placeholder="My Custom Bot"
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2",
                  errors.name ? "border-destructive" : "border-input",
                )}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="bot-description"
                className="mb-1 block text-sm font-medium"
              >
                Description
              </label>
              <textarea
                id="bot-description"
                value={bot.description || ""}
                onChange={(e) => updateBot("description", e.target.value)}
                placeholder="What does this bot do?"
                rows={3}
                className={cn(
                  "w-full resize-none rounded-md border bg-background px-3 py-2",
                  errors.description ? "border-destructive" : "border-input",
                )}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="bot-icon"
                className="mb-1 block text-sm font-medium"
              >
                Icon (optional)
              </label>
              <input
                id="bot-icon"
                type="text"
                value={bot.icon || ""}
                onChange={(e) => updateBot("icon", e.target.value)}
                placeholder="robot"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter an icon name (e.g., robot, bot, star)
              </p>
            </div>
          </div>
        );

      case "triggers":
        return (
          <BotTriggers
            triggers={bot.triggers || []}
            onAdd={addTrigger}
            onRemove={removeTrigger}
            error={errors.triggers}
          />
        );

      case "responses":
        return (
          <BotResponses
            actions={bot.actions || []}
            onAdd={addAction}
            onRemove={removeAction}
            error={errors.actions}
          />
        );

      case "commands":
        return (
          <BotCommands
            actions={bot.actions || []}
            onAdd={addAction}
            onRemove={removeAction}
          />
        );

      case "test":
        return <BotTesting bot={bot as BotBuilderDefinition} />;

      case "deploy":
        return (
          <BotDeployment
            bot={bot as BotBuilderDefinition}
            onDeploy={handleSave}
          />
        );
    }
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-semibold">Bot Builder</h2>
        <p className="text-sm text-muted-foreground">
          Create a custom bot for your channels
        </p>
      </div>

      {/* Progress */}
      <div className="border-b px-6 py-3">
        <Progress value={progress} className="h-2" />
        <div className="mt-2 flex justify-between">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => goToStep(step.id)}
              disabled={index > currentStepIndex}
              className={cn(
                "text-xs transition-colors",
                index === currentStepIndex
                  ? "font-medium text-primary"
                  : index < currentStepIndex
                    ? "cursor-pointer text-foreground hover:text-primary"
                    : "cursor-not-allowed text-muted-foreground",
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Card className="p-6">
          <h3 className="mb-1 text-lg font-medium">
            {STEPS[currentStepIndex].label}
          </h3>
          <p className="mb-6 text-sm text-muted-foreground">
            {STEPS[currentStepIndex].description}
          </p>

          {renderStepContent()}
        </Card>
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t px-6 py-4">
        <div>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={goPrev}>
              Previous
            </Button>
          )}

          {currentStepIndex < STEPS.length - 1 ? (
            <Button onClick={goNext}>Next</Button>
          ) : (
            <Button onClick={handleSave}>Save Bot</Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BotBuilder;
