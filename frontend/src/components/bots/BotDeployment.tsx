"use client";

/**
 * Bot Deployment Component
 * Deploy and configure bot for production
 */

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BotBuilderDefinition } from "@/lib/bots";

// ============================================================================
// TYPES
// ============================================================================

interface BotDeploymentProps {
  bot: BotBuilderDefinition;
  onDeploy?: (config: DeployConfig) => void;
  className?: string;
}

interface DeployConfig {
  channels: string[];
  enabled: boolean;
  permissions: string[];
}

// ============================================================================
// PERMISSION OPTIONS
// ============================================================================

const PERMISSIONS = [
  {
    id: "read_messages",
    label: "Read Messages",
    description: "View messages in channels",
  },
  {
    id: "send_messages",
    label: "Send Messages",
    description: "Send messages to channels",
  },
  {
    id: "manage_messages",
    label: "Manage Messages",
    description: "Edit and delete messages",
  },
  {
    id: "add_reactions",
    label: "Add Reactions",
    description: "Add emoji reactions",
  },
  {
    id: "mention_users",
    label: "Mention Users",
    description: "Mention users in messages",
  },
  {
    id: "upload_files",
    label: "Upload Files",
    description: "Upload files and attachments",
  },
];

// ============================================================================
// MOCK CHANNELS
// ============================================================================

const MOCK_CHANNELS = [
  { id: "general", name: "general" },
  { id: "random", name: "random" },
  { id: "announcements", name: "announcements" },
  { id: "help", name: "help" },
  { id: "dev", name: "dev" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BotDeployment({
  bot,
  onDeploy,
  className,
}: BotDeploymentProps) {
  const [deployConfig, setDeployConfig] = useState<DeployConfig>({
    channels: [],
    enabled: true,
    permissions: ["read_messages", "send_messages"],
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);

  // Toggle channel
  const toggleChannel = (channelId: string) => {
    setDeployConfig((prev) => ({
      ...prev,
      channels: prev.channels.includes(channelId)
        ? prev.channels.filter((c) => c !== channelId)
        : [...prev.channels, channelId],
    }));
  };

  // Toggle all channels
  const toggleAllChannels = () => {
    setDeployConfig((prev) => ({
      ...prev,
      channels:
        prev.channels.length === MOCK_CHANNELS.length
          ? []
          : MOCK_CHANNELS.map((c) => c.id),
    }));
  };

  // Toggle permission
  const togglePermission = (permissionId: string) => {
    setDeployConfig((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  // Deploy bot
  const handleDeploy = async () => {
    setIsDeploying(true);

    // Simulate deployment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsDeploying(false);
    setIsDeployed(true);

    if (onDeploy) {
      onDeploy(deployConfig);
    }
  };

  if (isDeployed) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold">Bot Deployed!</h3>
        <p className="mb-6 text-muted-foreground">
          Your bot "{bot.name}" is now active and ready to use.
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Active in:{" "}
            {deployConfig.channels.length === 0
              ? "All channels"
              : deployConfig.channels.length + " channel(s)"}
          </p>
          <p>Triggers: {bot.triggers.length}</p>
          <p>Actions: {bot.actions.length}</p>
        </div>
        <Button className="mt-6" onClick={() => setIsDeployed(false)}>
          Edit Deployment
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary */}
      <Card className="p-4">
        <h4 className="mb-3 font-medium">Bot Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>
            <span className="ml-2 font-medium">{bot.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Triggers:</span>
            <span className="ml-2 font-medium">{bot.triggers.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Actions:</span>
            <span className="ml-2 font-medium">{bot.actions.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Commands:</span>
            <span className="ml-2 font-medium">
              {bot.actions.filter((a) => a.config.isCommand).length}
            </span>
          </div>
        </div>
      </Card>

      {/* Channel Selection */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-medium">Active Channels</h4>
          <Button variant="ghost" size="sm" onClick={toggleAllChannels}>
            {deployConfig.channels.length === MOCK_CHANNELS.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MOCK_CHANNELS.map((channel) => (
            <label
              key={channel.id}
              htmlFor={`channel-${channel.id}`}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border p-3 transition-colors",
                deployConfig.channels.includes(channel.id)
                  ? "bg-primary/5 border-primary"
                  : "hover:bg-muted/50 border-input",
              )}
            >
              <input
                id={`channel-${channel.id}`}
                type="checkbox"
                checked={deployConfig.channels.includes(channel.id)}
                onChange={() => toggleChannel(channel.id)}
              />
              <span>#{channel.name}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Leave empty to activate in all channels
        </p>
      </div>

      {/* Permissions */}
      <div>
        <h4 className="mb-3 font-medium">Permissions</h4>
        <div className="space-y-2">
          {PERMISSIONS.map((permission) => (
            // eslint-disable-next-line jsx-a11y/label-has-associated-control -- label has htmlFor pointing to input id
            <label
              key={permission.id}
              htmlFor={`permission-${permission.id}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                deployConfig.permissions.includes(permission.id)
                  ? "bg-primary/5 border-primary"
                  : "hover:bg-muted/50 border-input",
              )}
            >
              <input
                id={`permission-${permission.id}`}
                type="checkbox"
                checked={deployConfig.permissions.includes(permission.id)}
                onChange={() => togglePermission(permission.id)}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">{permission.label}</span>
                <p className="text-sm text-muted-foreground">
                  {permission.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Enable Toggle */}
      <Card className="p-4">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- label has htmlFor pointing to input id */}
        <label
          htmlFor="bot-enabled"
          className="flex cursor-pointer items-center justify-between"
        >
          <div>
            <span className="font-medium">Enable Bot</span>
            <p className="text-sm text-muted-foreground">
              Bot will start responding immediately after deployment
            </p>
          </div>
          <input
            id="bot-enabled"
            type="checkbox"
            checked={deployConfig.enabled}
            onChange={(e) =>
              setDeployConfig((prev) => ({
                ...prev,
                enabled: e.target.checked,
              }))
            }
            className="h-5 w-5"
          />
        </label>
      </Card>

      {/* Deploy Button */}
      <Button
        onClick={handleDeploy}
        disabled={isDeploying}
        className="w-full"
        size="lg"
      >
        {isDeploying ? (
          <>
            <svg
              className="-ml-1 mr-3 h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Deploying...
          </>
        ) : (
          "Deploy Bot"
        )}
      </Button>

      {/* Help */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          After deployment, you can manage this bot from the Bots section in
          Settings.
        </p>
      </div>
    </div>
  );
}

export default BotDeployment;
