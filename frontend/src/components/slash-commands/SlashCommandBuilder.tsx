"use client";

/**
 * SlashCommandBuilder - Main builder interface for creating/editing slash commands
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";

import { CommandInfo } from "./CommandInfo";
import { CommandTrigger } from "./CommandTrigger";
import { CommandArguments } from "./CommandArguments";
import { CommandAction } from "./CommandAction";
import { CommandPreview } from "./CommandPreview";
import { CommandTesting } from "./CommandTesting";
import { CommandPermissions } from "./CommandPermissions";
import { CommandChannels } from "./CommandChannels";
import { CommandResponse } from "./CommandResponse";
import { CommandWebhook } from "./CommandWebhook";
import { CommandWorkflow } from "./CommandWorkflow";

import { useSlashCommandsStore } from "@/stores/slash-commands-store";
import { validateCommand } from "@/lib/slash-commands";
import type {
  CommandDraft,
  CommandValidation,
} from "@/lib/slash-commands/command-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface SlashCommandBuilderProps {
  commandId?: string;
  onSave?: (command: CommandDraft) => void;
  onCancel?: () => void;
  className?: string;
}

type BuilderTab =
  | "info"
  | "arguments"
  | "action"
  | "permissions"
  | "channels"
  | "response"
  | "preview"
  | "test";

// ============================================================================
// Component
// ============================================================================

export function SlashCommandBuilder({
  commandId,
  onSave,
  onCancel,
  className,
}: SlashCommandBuilderProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<BuilderTab>("info");
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<CommandValidation | null>(null);

  const {
    editingCommand,
    startEditing,
    updateDraft,
    saveDraft,
    cancelEditing,
    commands,
  } = useSlashCommandsStore();

  // Initialize editing state
  useEffect(() => {
    if (commandId) {
      const existing = commands.get(commandId);
      if (existing) {
        startEditing({
          ...existing,
        });
      }
    } else if (!editingCommand) {
      startEditing();
    }
  }, [commandId, commands, startEditing, editingCommand]);

  // Validate on changes
  useEffect(() => {
    if (editingCommand) {
      const result = validateCommand(editingCommand, {
        existingCommandId: commandId,
      });
      setValidation(result);
    }
  }, [editingCommand, commandId]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!editingCommand || !validation?.isValid) return;

    setIsSaving(true);
    try {
      const saved = saveDraft(user?.id || "anonymous");
      if (saved) {
        onSave?.(editingCommand);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editingCommand, validation, saveDraft, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancelEditing();
    onCancel?.();
  }, [cancelEditing, onCancel]);

  // Tab navigation
  const tabs: { id: BuilderTab; label: string }[] = [
    { id: "info", label: "Basic Info" },
    { id: "arguments", label: "Arguments" },
    { id: "action", label: "Action" },
    { id: "permissions", label: "Permissions" },
    { id: "channels", label: "Channels" },
    { id: "response", label: "Response" },
    { id: "preview", label: "Preview" },
    { id: "test", label: "Test" },
  ];

  const currentIndex = tabs.findIndex((t) => t.id === activeTab);
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < tabs.length - 1;

  if (!editingCommand) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {commandId ? "Edit Command" : "Create Command"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {commandId
              ? `Editing /${editingCommand.trigger || "..."}`
              : "Create a new custom slash command"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!validation?.isValid || isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Command
          </Button>
        </div>
      </div>

      {/* Validation Status */}
      <AnimatePresence mode="wait">
        {validation && !validation.isValid && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Validation Errors:</strong>
                <ul className="mt-1 list-disc pl-4">
                  {validation.errors.slice(0, 3).map((error, i) => (
                    <li key={i}>{error.message}</li>
                  ))}
                  {validation.errors.length > 3 && (
                    <li>... and {validation.errors.length - 3} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {validation?.warnings && validation.warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warnings:</strong>
                <ul className="mt-1 list-disc pl-4">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Editor Tabs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-0">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as BuilderTab)}
              >
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="text-xs"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "info" && (
                    <div className="space-y-6">
                      <CommandTrigger
                        value={editingCommand.trigger}
                        aliases={editingCommand.aliases}
                        onChange={(trigger, aliases) =>
                          updateDraft({ trigger, aliases })
                        }
                      />
                      <CommandInfo
                        name={editingCommand.name}
                        description={editingCommand.description}
                        helpText={editingCommand.helpText}
                        usage={editingCommand.usage}
                        category={editingCommand.category}
                        icon={editingCommand.icon}
                        onChange={(updates) => updateDraft(updates)}
                      />
                    </div>
                  )}

                  {activeTab === "arguments" && (
                    <CommandArguments
                      arguments={editingCommand.arguments || []}
                      onChange={(args) => updateDraft({ arguments: args })}
                    />
                  )}

                  {activeTab === "action" && (
                    <div className="space-y-6">
                      <CommandAction
                        actionType={editingCommand.actionType}
                        action={editingCommand.action}
                        onChange={(actionType, action) =>
                          updateDraft({ actionType, action })
                        }
                      />
                      {editingCommand.actionType === "webhook" && (
                        <CommandWebhook
                          webhook={editingCommand.webhook}
                          onChange={(webhook) =>
                            updateDraft({
                              webhook: webhook as typeof editingCommand.webhook,
                            })
                          }
                        />
                      )}
                      {editingCommand.actionType === "workflow" && (
                        <CommandWorkflow
                          workflow={editingCommand.workflow}
                          onChange={(workflow) =>
                            updateDraft({
                              workflow:
                                workflow as typeof editingCommand.workflow,
                            })
                          }
                        />
                      )}
                    </div>
                  )}

                  {activeTab === "permissions" && (
                    <CommandPermissions
                      permissions={editingCommand.permissions}
                      onChange={(permissions) =>
                        updateDraft({
                          permissions:
                            permissions as typeof editingCommand.permissions,
                        })
                      }
                    />
                  )}

                  {activeTab === "channels" && (
                    <CommandChannels
                      channels={editingCommand.channels}
                      onChange={(channels) =>
                        updateDraft({
                          channels: channels as typeof editingCommand.channels,
                        })
                      }
                    />
                  )}

                  {activeTab === "response" && (
                    <CommandResponse
                      responseConfig={editingCommand.responseConfig}
                      onChange={(responseConfig) =>
                        updateDraft({
                          responseConfig:
                            responseConfig as typeof editingCommand.responseConfig,
                        })
                      }
                    />
                  )}

                  {activeTab === "preview" && (
                    <CommandPreview command={editingCommand} />
                  )}

                  {activeTab === "test" && (
                    <CommandTesting command={editingCommand} />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Tab Navigation */}
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab(tabs[currentIndex - 1].id)}
                  disabled={!canGoBack}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {tabs.map((tab, i) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "h-2 w-2 rounded-full transition-colors",
                        i === currentIndex
                          ? "bg-primary"
                          : "hover:bg-muted-foreground/50 bg-muted",
                      )}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab(tabs[currentIndex + 1].id)}
                  disabled={!canGoNext}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <CommandPreview command={editingCommand} compact />

              {/* Validation Summary */}
              <div className="mt-4 border-t pt-4">
                <h4 className="mb-2 text-sm font-medium">Status</h4>
                {validation?.isValid ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Ready to save
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {validation?.errors.length || 0} errors
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SlashCommandBuilder;
