/**
 * Bot Templates Gallery Component
 *
 * Pre-built bot templates with preview, installation, and customization.
 */

"use client";

import { useState } from "react";
import {
  Sparkles,
  Download,
  Eye,
  Code,
  Zap,
  MessageSquare,
  Shield,
  Calendar,
  TrendingUp,
  Users,
  Bot,
  CheckCircle,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BotTemplate {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: any;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  code: string;
  features: string[];
  permissions: string[];
  installCount: number;
  rating: number;
}

interface BotTemplatesProps {
  onInstall?: (template: BotTemplate) => void;
  onPreview?: (template: BotTemplate) => void;
}

// Template definitions
const TEMPLATES: BotTemplate[] = [
  {
    id: "welcome-bot",
    name: "Welcome Bot",
    description: "Greet new members joining your channels",
    longDescription:
      "Automatically welcomes new members when they join a channel with customizable greeting messages and embed cards.",
    icon: Users,
    category: "engagement",
    difficulty: "beginner",
    code: `export class WelcomeBot {
  async onUserJoin(context, api) {
    return {
      type: 'embed',
      embeds: [{
        title: '👋 Welcome!',
        description: \`Welcome to **\${context.channel.name}**, \${context.user.displayName}!\`,
        color: '#6366f1'
      }]
    }
  }
}`,
    features: [
      "Custom welcome messages",
      "Embed support",
      "Channel-specific greetings",
      "User mention support",
    ],
    permissions: ["messages.write", "users.read", "channels.read"],
    installCount: 1234,
    rating: 4.8,
  },
  {
    id: "poll-bot",
    name: "Poll Bot",
    description: "Create and manage polls with voting",
    longDescription:
      "Advanced polling system with multiple choice options, anonymous voting, time limits, and real-time results.",
    icon: TrendingUp,
    category: "productivity",
    difficulty: "intermediate",
    code: `export class PollBot {
  async onCommand(command, args, context, api) {
    if (command === 'poll') {
      // Create poll logic
      return {
        type: 'embed',
        embeds: [{
          title: '📊 Poll',
          description: 'Vote using reactions below'
        }]
      }
    }
  }
}`,
    features: [
      "Multiple choice polls",
      "Anonymous voting",
      "Timed polls",
      "Real-time results",
      "Vote tracking",
    ],
    permissions: ["messages.write", "messages.read", "reactions.write"],
    installCount: 892,
    rating: 4.6,
  },
  {
    id: "reminder-bot",
    name: "Reminder Bot",
    description: "Schedule reminders and notifications",
    longDescription:
      "Set up one-time or recurring reminders for yourself or channels with flexible scheduling options.",
    icon: Calendar,
    category: "productivity",
    difficulty: "intermediate",
    code: `export class ReminderBot {
  async onCommand(command, args, context, api) {
    if (command === 'remind') {
      const [time, ...message] = args
      // Schedule reminder
      await api.scheduleMessage(
        context.channel.id,
        { content: message.join(' ') },
        parseTime(time)
      )
    }
  }
}`,
    features: [
      "One-time reminders",
      "Recurring reminders",
      "Natural language parsing",
      "Channel and DM support",
      "Reminder management",
    ],
    permissions: ["messages.write", "messages.read"],
    installCount: 756,
    rating: 4.7,
  },
  {
    id: "moderation-bot",
    name: "Auto-Moderation Bot",
    description: "Automated content moderation and filtering",
    longDescription:
      "Protect your community with automated content filtering, spam detection, and rule enforcement.",
    icon: Shield,
    category: "moderation",
    difficulty: "advanced",
    code: `export class ModerationBot {
  async onMessage(context, api) {
    // Check for violations
    if (containsBannedContent(context.message.content)) {
      await api.deleteMessage(context.message.messageId)
      return {
        type: 'message',
        content: 'Message removed',
        options: { ephemeral: true }
      }
    }
  }
}`,
    features: [
      "Content filtering",
      "Spam detection",
      "Auto-ban/timeout",
      "Whitelist/blacklist",
      "Audit logging",
    ],
    permissions: ["messages.read", "messages.delete", "users.read"],
    installCount: 543,
    rating: 4.9,
  },
  {
    id: "faq-bot",
    name: "FAQ Bot",
    description: "Automated FAQ responses",
    longDescription:
      "Automatically answer frequently asked questions with keyword detection and customizable responses.",
    icon: MessageSquare,
    category: "support",
    difficulty: "beginner",
    code: `export class FAQBot {
  async onMessage(context, api) {
    const faqs = {
      'how to': 'Check our docs at...',
      pricing: 'Our pricing is...',
    }

    for (const [keyword, answer] of Object.entries(faqs)) {
      if (context.message.content.toLowerCase().includes(keyword)) {
        return { content: answer }
      }
    }
  }
}`,
    features: [
      "Keyword matching",
      "Multiple FAQs",
      "Rich text responses",
      "Link embeds",
      "Search functionality",
    ],
    permissions: ["messages.read", "messages.write"],
    installCount: 678,
    rating: 4.5,
  },
  {
    id: "analytics-bot",
    name: "Analytics Bot",
    description: "Channel analytics and insights",
    longDescription:
      "Track channel activity, user engagement, and generate detailed analytics reports.",
    icon: TrendingUp,
    category: "analytics",
    difficulty: "advanced",
    code: `export class AnalyticsBot {
  async onCommand(command, args, context, api) {
    if (command === 'stats') {
      const stats = await this.getChannelStats(context.channel.id)
      return {
        type: 'embed',
        embeds: [{
          title: '📊 Channel Analytics',
          fields: stats
        }]
      }
    }
  }
}`,
    features: [
      "Message analytics",
      "User activity tracking",
      "Engagement metrics",
      "Custom reports",
      "Export data",
    ],
    permissions: ["messages.read", "users.read", "channels.read"],
    installCount: 421,
    rating: 4.7,
  },
];

const CATEGORIES = [
  { id: "all", name: "All Templates", icon: Sparkles },
  { id: "engagement", name: "Engagement", icon: Users },
  { id: "productivity", name: "Productivity", icon: Zap },
  { id: "moderation", name: "Moderation", icon: Shield },
  { id: "support", name: "Support", icon: MessageSquare },
  { id: "analytics", name: "Analytics", icon: TrendingUp },
];

export function BotTemplates({ onInstall, onPreview }: BotTemplatesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  // Filter templates
  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle preview
  const handlePreview = (template: BotTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
    onPreview?.(template);
  };

  // Handle install
  const handleInstall = (template: BotTemplate) => {
    onInstall?.(template);
    setPreviewOpen(false);
  };

  // Get difficulty badge
  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      beginner: "default",
      intermediate: "secondary",
      advanced: "destructive",
    } as const;
    return (
      <Badge variant={variants[difficulty as keyof typeof variants]}>
        {difficulty}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6" />
          Bot Templates
        </h2>
        <p className="text-muted-foreground">
          Choose from pre-built templates to quickly create powerful bots
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {template.name}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        {getDifficultyBadge(template.difficulty)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Download className="h-3 w-3" />
                    {template.installCount.toLocaleString()} installs
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-yellow-500">★</span>
                    <span>{template.rating}/5</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePreview(template)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleInstall(template)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Install
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bot className="mb-2 h-12 w-12" />
          <p>No templates found</p>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = selectedTemplate.icon;
                    return (
                      <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    );
                  })()}
                  <div>
                    <DialogTitle>{selectedTemplate.name}</DialogTitle>
                    <DialogDescription>
                      {selectedTemplate.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                  <TabsTrigger value="permissions">Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div>
                    <h4 className="mb-2 font-semibold">About</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.longDescription}
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold">Features</h4>
                    <ul className="space-y-1">
                      {selectedTemplate.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <Badge>{selectedTemplate.category}</Badge>
                    {getDifficultyBadge(selectedTemplate.difficulty)}
                    <span className="text-muted-foreground">
                      {selectedTemplate.installCount.toLocaleString()} installs
                    </span>
                    <span className="text-muted-foreground">
                      ★ {selectedTemplate.rating}/5
                    </span>
                  </div>
                </TabsContent>

                <TabsContent value="code">
                  <ScrollArea className="h-[400px]">
                    <pre className="rounded-lg bg-black/95 p-4 text-sm text-white">
                      <code>{selectedTemplate.code}</code>
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="permissions" className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This template requires the following permissions:
                  </p>
                  <div className="space-y-2">
                    {selectedTemplate.permissions.map((permission) => (
                      <div
                        key={permission}
                        className="flex items-center gap-2 rounded-lg border p-3"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <code className="text-sm">{permission}</code>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleInstall(selectedTemplate)}>
                  <Download className="mr-2 h-4 w-4" />
                  Install Template
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
