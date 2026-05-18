/**
 * Bot Editor Component
 *
 * Advanced bot code editor with TypeScript support, templates, testing,
 * and deployment capabilities.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Save,
  Play,
  Code,
  FileCode,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Download,
  Upload,
  History,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Bot, BotCommand, BotPermissionScope } from "@/types/bot";

interface BotEditorProps {
  bot?: Bot;
  onSave?: (bot: Partial<Bot>) => Promise<void>;
  onTest?: (code: string) => Promise<void>;
  onDeploy?: (code: string) => Promise<void>;
}

// Bot templates
const BOT_TEMPLATES = [
  {
    id: "blank",
    name: "Blank Bot",
    description: "Start from scratch",
    code: `/**
 * Custom Bot
 */

export class MyBot {
  readonly id = 'my-bot'
  readonly name = 'My Bot'
  readonly description = 'A custom bot'
  readonly version = '1.0.0'

  async onMessage(context, api) {
    // Handle incoming messages
    return null
  }

  async onCommand(command, args, context, api) {
    // Handle slash commands
    return {
      type: 'message',
      content: 'Command executed!'
    }
  }
}`,
  },
  {
    id: "echo",
    name: "Echo Bot",
    description: "Repeats messages back",
    code: `/**
 * Echo Bot - Repeats messages back to the user
 */

export class EchoBot {
  readonly id = 'echo-bot'
  readonly name = 'Echo Bot'
  readonly description = 'Repeats your messages'
  readonly version = '1.0.0'

  async onMessage(context, api) {
    if (context.isMention) {
      return {
        type: 'message',
        content: \`You said: "\${context.message.content}"\`,
        options: { reply: true }
      }
    }
    return null
  }

  async onCommand(command, args, context, api) {
    if (command === 'echo') {
      const message = args.join(' ') || 'Hello!'
      return {
        type: 'message',
        content: message
      }
    }
    return null
  }
}`,
  },
  {
    id: "welcome",
    name: "Welcome Bot",
    description: "Greets new members",
    code: `/**
 * Welcome Bot - Greets new channel members
 */

export class WelcomeBot {
  readonly id = 'welcome-bot'
  readonly name = 'Welcome Bot'
  readonly description = 'Welcomes new members'
  readonly version = '1.0.0'

  async onUserJoin(context, api) {
    const { user, channel } = context

    return {
      type: 'embed',
      embeds: [{
        title: '👋 Welcome!',
        description: \`Welcome to **\${channel.name}**, \${user.displayName}!\\n\\nWe're glad to have you here.\`,
        color: '#6366f1'
      }]
    }
  }

  async onCommand(command, args, context, api) {
    if (command === 'welcome') {
      return {
        type: 'message',
        content: 'Welcome message will be sent when a user joins!'
      }
    }
    return null
  }
}`,
  },
  {
    id: "moderation",
    name: "Moderation Bot",
    description: "Auto-moderation and filtering",
    code: `/**
 * Moderation Bot - Auto-moderation and content filtering
 */

export class ModerationBot {
  readonly id = 'moderation-bot'
  readonly name = 'Moderation Bot'
  readonly description = 'Auto-moderation bot'
  readonly version = '1.0.0'

  private bannedWords = ['spam', 'abuse']

  async onMessage(context, api) {
    const content = context.message.content.toLowerCase()

    // Check for banned words
    const hasBannedWord = this.bannedWords.some(word =>
      content.includes(word)
    )

    if (hasBannedWord) {
      // Delete the message
      await api.deleteMessage(context.message.messageId)

      // Send warning
      return {
        type: 'message',
        content: \`⚠️ \${context.user.displayName}, your message was removed for violating community guidelines.\`,
        options: { ephemeral: true }
      }
    }

    return null
  }
}`,
  },
];

// Available events
const AVAILABLE_EVENTS = [
  {
    id: "message_created",
    name: "Message Created",
    description: "Triggered when a message is sent",
  },
  {
    id: "message_edited",
    name: "Message Edited",
    description: "Triggered when a message is edited",
  },
  {
    id: "message_deleted",
    name: "Message Deleted",
    description: "Triggered when a message is deleted",
  },
  {
    id: "reaction_added",
    name: "Reaction Added",
    description: "Triggered when a reaction is added",
  },
  {
    id: "user_joined",
    name: "User Joined",
    description: "Triggered when a user joins a channel",
  },
  {
    id: "user_left",
    name: "User Left",
    description: "Triggered when a user leaves a channel",
  },
  {
    id: "mention",
    name: "Bot Mentioned",
    description: "Triggered when bot is mentioned",
  },
];

// Available permissions
const AVAILABLE_PERMISSIONS: {
  id: BotPermissionScope;
  name: string;
  description: string;
  dangerous?: boolean;
}[] = [
  {
    id: "messages.read",
    name: "Read Messages",
    description: "Read messages in channels",
  },
  {
    id: "messages.write",
    name: "Send Messages",
    description: "Send messages to channels",
  },
  {
    id: "messages.delete",
    name: "Delete Messages",
    description: "Delete bot messages",
    dangerous: true,
  },
  {
    id: "channels.read",
    name: "View Channels",
    description: "View channel information",
  },
  {
    id: "users.read",
    name: "View Users",
    description: "View user information",
  },
  {
    id: "reactions.write",
    name: "Add Reactions",
    description: "Add reactions to messages",
  },
  {
    id: "files.read",
    name: "View Files",
    description: "View file attachments",
  },
  {
    id: "files.write",
    name: "Upload Files",
    description: "Upload file attachments",
  },
];

export function BotEditor({ bot, onSave, onTest, onDeploy }: BotEditorProps) {
  const [name, setName] = useState(bot?.displayName || "");
  const [description, setDescription] = useState(bot?.description || "");
  const [code, setCode] = useState(bot?.webhookUrl || BOT_TEMPLATES[0].code);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [selectedPermissions, setSelectedPermissions] = useState<
    Set<BotPermissionScope>
  >(new Set(bot?.permissions.scopes || []));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [testMode, setTestMode] = useState(false);

  // Validate code
  const validateCode = useCallback(() => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push("Bot name is required");
    }

    if (!description.trim()) {
      errors.push("Bot description is required");
    }

    if (!code.trim()) {
      errors.push("Bot code is required");
    }

    if (selectedPermissions.size === 0) {
      errors.push("At least one permission is required");
    }

    // Basic TypeScript syntax check
    if (code.includes("function") && !code.includes("async")) {
      errors.push("Consider using async functions for better compatibility");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [name, description, code, selectedPermissions]);

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = BOT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setCode(template.code);
      setSelectedTemplate(templateId);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!validateCode()) return;

    setSaving(true);
    try {
      await onSave?.({
        displayName: name,
        description,
        webhookUrl: code,
        permissions: {
          scopes: Array.from(selectedPermissions),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle test
  const handleTest = async () => {
    if (!validateCode()) return;

    setTesting(true);
    try {
      await onTest?.(code);
    } finally {
      setTesting(false);
    }
  };

  // Handle deploy
  const handleDeploy = async () => {
    if (!validateCode()) return;

    setDeploying(true);
    try {
      await onDeploy?.(code);
    } finally {
      setDeploying(false);
    }
  };

  // Toggle event subscription
  const toggleEvent = (eventId: string) => {
    const newEvents = new Set(selectedEvents);
    if (newEvents.has(eventId)) {
      newEvents.delete(eventId);
    } else {
      newEvents.add(eventId);
    }
    setSelectedEvents(newEvents);
  };

  // Toggle permission
  const togglePermission = (permissionId: BotPermissionScope) => {
    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId);
    } else {
      newPermissions.add(permissionId);
    }
    setSelectedPermissions(newPermissions);
  };

  // Export bot code
  const exportCode = () => {
    const blob = new Blob([code], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {bot ? "Edit Bot" : "Create Bot"}
          </h2>
          <p className="text-muted-foreground">
            {bot
              ? "Modify your bot configuration and code"
              : "Build a new bot from scratch or use a template"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCode}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !validateCode()}
          >
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Test
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
          <Button onClick={handleDeploy} disabled={deploying || !bot}>
            {deploying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Deploy
          </Button>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Validation Errors</p>
              <ul className="mt-2 space-y-1 text-sm">
                {validationErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="code" className="space-y-4">
        <TabsList>
          <TabsTrigger value="code">
            <Code className="mr-2 h-4 w-4" />
            Code
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="mr-2 h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="events">
            <Zap className="mr-2 h-4 w-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <FileCode className="mr-2 h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Code Editor Tab */}
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bot Code</CardTitle>
                  <CardDescription>
                    Write your bot logic in TypeScript
                  </CardDescription>
                </div>
                <Select value={selectedTemplate} onValueChange={loadTemplate}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Load template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BOT_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your bot code here..."
                className="min-h-[500px] font-mono"
              />
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {code.split("\n").length} lines • {code.length} characters
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(code)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Configuration</CardTitle>
              <CardDescription>
                Configure your bot's basic settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Bot"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what your bot does..."
                  rows={3}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Test Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable test mode for debugging
                  </p>
                </div>
                <Switch checked={testMode} onCheckedChange={setTestMode} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Subscriptions</CardTitle>
              <CardDescription>
                Select which events your bot should respond to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AVAILABLE_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Switch
                      checked={selectedEvents.has(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bot Permissions</CardTitle>
              <CardDescription>
                Grant permissions required for your bot to function
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <Switch
                      checked={selectedPermissions.has(permission.id)}
                      onCheckedChange={() => togglePermission(permission.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{permission.name}</p>
                        {permission.dangerous && (
                          <Badge variant="destructive" className="text-xs">
                            Dangerous
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
