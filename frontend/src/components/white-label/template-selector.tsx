/**
 * Template Selector Component
 *
 * Allows users to select and preview different platform templates
 * (WhatsApp, Telegram, Slack, Discord, Default/nself)
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  MessageCircle,
  Send,
  Hash,
  Globe,
  Sparkles,
} from "lucide-react";
import type { TemplateId } from "@/templates/types";
import { templateRegistry, loadTemplate } from "@/templates";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
  currentTemplateId?: TemplateId;
  onSelect?: (templateId: TemplateId) => void;
  onPreview?: (templateId: TemplateId) => void;
  className?: string;
}

const TEMPLATE_METADATA = {
  default: {
    icon: Sparkles,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    features: [
      "Modern, clean interface",
      "Best of Slack, Discord, Telegram",
      "Flexible layout options",
      "Advanced collaboration tools",
      "Full feature set",
    ],
    bestFor: "Teams wanting modern, professional communication platform",
  },
  slack: {
    icon: Hash,
    color: "text-purple-700",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    features: [
      "Channel-based organization",
      "Thread conversations",
      "App integrations",
      "Workspace structure",
      "Professional aesthetic",
    ],
    bestFor: "Professional teams and enterprises",
  },
  discord: {
    icon: MessageCircle,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950",
    features: [
      "Server & channel hierarchy",
      "Voice channels",
      "Rich embeds",
      "Role-based permissions",
      "Community focus",
    ],
    bestFor: "Gaming communities and social groups",
  },
  telegram: {
    icon: Send,
    color: "text-sky-500",
    bgColor: "bg-sky-50 dark:bg-sky-950",
    features: [
      "Fast, lightweight interface",
      "Secret chats",
      "Channels & groups",
      "Bot integration",
      "Cloud sync",
    ],
    bestFor: "Privacy-focused teams and communities",
  },
  whatsapp: {
    icon: MessageCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950",
    features: [
      "Bubble-style messages",
      "End-to-end encryption",
      "Voice messages",
      "Status updates",
      "Double checkmarks",
    ],
    bestFor: "Personal and small team communication",
  },
} as const;

export function TemplateSelector({
  currentTemplateId = "default",
  onSelect,
  onPreview,
  className,
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateId>(currentTemplateId);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateId | null>(
    null,
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateId | null>(
    null,
  );

  const handleSelectTemplate = (templateId: TemplateId) => {
    setSelectedTemplate(templateId);
  };

  const handleApplyTemplate = (templateId: TemplateId) => {
    if (templateId !== currentTemplateId) {
      setPendingTemplate(templateId);
      setShowConfirmDialog(true);
    }
  };

  const confirmTemplateChange = () => {
    if (pendingTemplate) {
      onSelect?.(pendingTemplate);
      setShowConfirmDialog(false);
      setPendingTemplate(null);
    }
  };

  const handlePreview = (templateId: TemplateId) => {
    setPreviewTemplate(templateId);
    onPreview?.(templateId);
  };

  return (
    <>
      <div className={cn("space-y-6", className)}>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Choose Your Platform Template</h2>
          <p className="text-muted-foreground">
            Select a pre-built template that matches your preferred
            communication style. Each template includes authentic colors,
            layouts, and features.
          </p>
        </div>

        <Tabs
          value={selectedTemplate}
          onValueChange={(v) => handleSelectTemplate(v as TemplateId)}
        >
          <TabsList className="grid w-full grid-cols-5">
            {Object.keys(templateRegistry).map((templateId) => {
              const entry = templateRegistry[templateId as TemplateId];
              const metadata = TEMPLATE_METADATA[templateId as TemplateId];
              const Icon = metadata.icon;

              return (
                <TabsTrigger
                  key={templateId}
                  value={templateId}
                  className="relative"
                >
                  <Icon className={cn("mr-2 h-4 w-4", metadata.color)} />
                  {entry.name}
                  {currentTemplateId === templateId && (
                    <Check className="absolute right-1 top-1 h-3 w-3 text-green-600" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.keys(templateRegistry).map((templateId) => {
            const entry = templateRegistry[templateId as TemplateId];
            const metadata = TEMPLATE_METADATA[templateId as TemplateId];
            const Icon = metadata.icon;
            const isActive = currentTemplateId === templateId;

            return (
              <TabsContent key={templateId} value={templateId} className="mt-6">
                <Card className={cn(metadata.bgColor, "border-2")}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("rounded-lg p-2", metadata.bgColor)}>
                          <Icon className={cn("h-6 w-6", metadata.color)} />
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {entry.name}
                            {isActive && (
                              <Badge
                                variant="outline"
                                className="bg-green-100 text-green-700"
                              >
                                Active
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{entry.description}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="mb-3 font-semibold">Key Features</h4>
                      <ul className="grid gap-2">
                        {metadata.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-background/50 rounded-lg p-4">
                      <p className="text-sm">
                        <span className="font-semibold">Best for:</span>{" "}
                        {metadata.bestFor}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handlePreview(templateId as TemplateId)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Globe className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        onClick={() =>
                          handleApplyTemplate(templateId as TemplateId)
                        }
                        disabled={isActive}
                        className="flex-1"
                      >
                        {isActive ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Currently Active
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Apply Template
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Feature Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>
              Compare features across all templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="p-2 text-left font-semibold">Feature</th>
                    {Object.keys(templateRegistry).map((templateId) => (
                      <th
                        key={templateId}
                        className="p-2 text-center font-semibold"
                      >
                        {templateRegistry[templateId as TemplateId].name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Threads", key: "threads" },
                    { name: "Reactions", key: "reactions" },
                    { name: "Voice Messages", key: "voiceMessages" },
                    { name: "Code Blocks", key: "codeBlocks" },
                    { name: "Link Previews", key: "linkPreviews" },
                    { name: "Read Receipts", key: "readReceipts" },
                    { name: "Typing Indicators", key: "typing" },
                  ].map((feature) => (
                    <tr key={feature.key} className="border-b">
                      <td className="p-2">{feature.name}</td>
                      {Object.keys(templateRegistry).map((templateId) => (
                        <td key={templateId} className="p-2 text-center">
                          <Check className="mx-auto h-4 w-4 text-green-600" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Template?</DialogTitle>
            <DialogDescription>
              Switching templates will change your interface layout, colors, and
              available features. Your data and customizations will be
              preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 rounded-lg bg-muted p-4">
            <p className="text-sm">
              <span className="font-semibold">Current:</span>{" "}
              {templateRegistry[currentTemplateId].name}
            </p>
            <p className="mt-2 text-sm">
              <span className="font-semibold">New:</span>{" "}
              {pendingTemplate && templateRegistry[pendingTemplate].name}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmTemplateChange}>
              <Sparkles className="mr-2 h-4 w-4" />
              Switch Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
