/**
 * Bot Manager Component
 * Admin interface for managing bots
 */

"use client";

import React, { useState } from "react";
import { useBots, useCreateBot, useDeleteBot } from "@/hooks/use-bots";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bot, Settings, Trash2 } from "lucide-react";

export function BotManager() {
  const { bots, loading, refetch } = useBots();
  const { createBot, loading: creating } = useCreateBot();
  const { deleteBot, loading: deleting } = useDeleteBot();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatarUrl: "",
    botType: "custom" as "custom" | "integration" | "system",
  });

  const handleCreateBot = async () => {
    try {
      await createBot(formData);
      toast({
        title: "Bot created",
        description: "Bot has been created successfully",
      });
      setShowCreateDialog(false);
      setFormData({
        name: "",
        description: "",
        avatarUrl: "",
        botType: "custom",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create bot",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this bot? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await deleteBot(botId);
      toast({
        title: "Bot deleted",
        description: "Bot has been deleted successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bot",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading bots...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bot Management</h1>
          <p className="text-muted-foreground">
            Manage API bots and integrations
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Bot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bot</DialogTitle>
              <DialogDescription>
                Create a new bot to integrate with your application via the API
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="My Bot"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What does this bot do?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
                <Input
                  id="avatarUrl"
                  value={formData.avatarUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, avatarUrl: e.target.value })
                  }
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              <div>
                <Label htmlFor="botType">Bot Type</Label>
                <Select
                  value={formData.botType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, botType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBot}
                disabled={creating || !formData.name}
              >
                {creating ? "Creating..." : "Create Bot"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No bots yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first bot to start building integrations
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Bot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot: any) => (
            <Card key={bot.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {bot.avatar_url ? (
                      <img
                        src={bot.avatar_url}
                        alt={bot.name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{bot.name}</CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant={bot.is_active ? "default" : "secondary"}
                        >
                          {bot.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{bot.bot_type}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {bot.description && (
                  <CardDescription className="mt-2">
                    {bot.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tokens</span>
                    <span className="font-medium">
                      {bot._aggregate_tokens?.aggregate?.count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Webhooks</span>
                    <span className="font-medium">
                      {bot._aggregate_webhooks?.aggregate?.count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Permissions</span>
                    <span className="font-medium">
                      {bot._aggregate_permissions?.aggregate?.count || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedBot(bot.id)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBot(bot.id)}
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedBot && (
        <Dialog open={!!selectedBot} onOpenChange={() => setSelectedBot(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Bot Management</DialogTitle>
              <DialogDescription>
                Manage tokens, webhooks, and permissions for this bot
              </DialogDescription>
            </DialogHeader>
            {/* Bot details management components would go here */}
            <div className="p-4 text-center text-muted-foreground">
              Select Tokens, Webhooks, or Permissions tabs to manage this bot
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
