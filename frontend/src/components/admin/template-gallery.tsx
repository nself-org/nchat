"use client";

// ===============================================================================
// Template Gallery Component
// ===============================================================================
//
// Visual template selection gallery with:
// - Template preview cards
// - Feature comparison
// - One-click switching
// - Preview mode
//
// ===============================================================================

import { useState, useCallback } from "react";
import { useTemplate } from "@/templates/hooks/use-template";
import { getAvailableTemplates, loadTemplate } from "@/templates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Check, Eye, Download, Sparkles } from "lucide-react";
import type { TemplateId } from "@/templates/types";

import { logger } from "@/lib/logger";

// -------------------------------------------------------------------------------
// Template Card Component
// -------------------------------------------------------------------------------

interface TemplateCardProps {
  id: TemplateId;
  name: string;
  description: string;
  preview?: string;
  isActive: boolean;
  onSelect: (id: TemplateId) => void;
  onPreview: (id: TemplateId) => void;
}

function TemplateCard({
  id,
  name,
  description,
  preview,
  isActive,
  onSelect,
  onPreview,
}: TemplateCardProps) {
  return (
    <Card className={isActive ? "ring-2 ring-primary" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{name}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {isActive && (
            <Badge variant="default" className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Preview Image */}
        <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-muted">
          {preview ? (
            <img
              src={preview}
              alt={`${name} preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              Preview Coming Soon
            </div>
          )}
        </div>

        {/* Key Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Features</h4>
          <div className="flex flex-wrap gap-1">
            {getTemplateFeatures(id).map((feature) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant={isActive ? "secondary" : "default"}
          className="flex-1"
          onClick={() => onSelect(id)}
          disabled={isActive}
        >
          {isActive ? "Current Template" : "Use Template"}
        </Button>
        <Button variant="outline" size="icon" onClick={() => onPreview(id)}>
          <Eye className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// -------------------------------------------------------------------------------
// Feature Tags by Template
// -------------------------------------------------------------------------------

function getTemplateFeatures(id: TemplateId): string[] {
  const features: Record<TemplateId, string[]> = {
    default: [
      "All Features",
      "Threads",
      "Voice Channels",
      "E2E Encryption",
      "Bots",
      "Webhooks",
    ],
    whatsapp: [
      "Chat Bubbles",
      "Read Receipts ✓✓",
      "Voice Messages",
      "Status/Stories",
      "Simple & Clean",
    ],
    telegram: [
      "Chat Folders",
      "Secret Chats",
      "Bots",
      "Scheduled Messages",
      "Cloud Sync",
    ],
    slack: [
      "Thread Panel",
      "Workspace Switcher",
      "Huddles",
      "App Integrations",
      "Workflows",
    ],
    discord: [
      "Server List",
      "Voice Channels",
      "Role Colors",
      "Rich Embeds",
      "Member List",
    ],
  };

  return features[id] || [];
}

// -------------------------------------------------------------------------------
// Feature Comparison Table
// -------------------------------------------------------------------------------

function FeatureComparisonTable() {
  const features = [
    {
      name: "Threads",
      default: true,
      whatsapp: false,
      telegram: false,
      slack: true,
      discord: true,
    },
    {
      name: "Voice Messages",
      default: true,
      whatsapp: true,
      telegram: true,
      slack: false,
      discord: false,
    },
    {
      name: "Read Receipts",
      default: true,
      whatsapp: true,
      telegram: true,
      slack: false,
      discord: false,
    },
    {
      name: "Chat Bubbles",
      default: false,
      whatsapp: true,
      telegram: true,
      slack: false,
      discord: false,
    },
    {
      name: "Voice Channels",
      default: true,
      whatsapp: false,
      telegram: true,
      slack: false,
      discord: true,
    },
    {
      name: "Bots",
      default: true,
      whatsapp: false,
      telegram: true,
      slack: true,
      discord: true,
    },
    {
      name: "Webhooks",
      default: true,
      whatsapp: false,
      telegram: false,
      slack: true,
      discord: true,
    },
    {
      name: "E2E Encryption",
      default: true,
      whatsapp: true,
      telegram: true,
      slack: false,
      discord: false,
    },
    {
      name: "Stories/Status",
      default: true,
      whatsapp: true,
      telegram: false,
      slack: false,
      discord: false,
    },
    {
      name: "Code Blocks",
      default: true,
      whatsapp: false,
      telegram: true,
      slack: true,
      discord: true,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left font-medium">Feature</th>
            <th className="p-3 text-center font-medium">ɳChat</th>
            <th className="p-3 text-center font-medium">WhatsApp</th>
            <th className="p-3 text-center font-medium">Telegram</th>
            <th className="p-3 text-center font-medium">Slack</th>
            <th className="p-3 text-center font-medium">Discord</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.name} className="border-b">
              <td className="p-3">{feature.name}</td>
              <td className="p-3 text-center">
                {feature.default ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3 text-center">
                {feature.whatsapp ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3 text-center">
                {feature.telegram ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3 text-center">
                {feature.slack ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="p-3 text-center">
                {feature.discord ? (
                  <Check className="mx-auto h-5 w-5 text-green-500" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------------------------
// Template Gallery Component
// -------------------------------------------------------------------------------

export function TemplateGallery() {
  const { templateId, switchTemplate, isLoading } = useTemplate();
  const [previewTemplate, setPreviewTemplate] = useState<TemplateId | null>(
    null,
  );
  const [showComparison, setShowComparison] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [originalTemplate, setOriginalTemplate] = useState<TemplateId | null>(
    null,
  );

  const templates = getAvailableTemplates();

  // Handle template selection
  const handleSelectTemplate = useCallback(
    async (id: TemplateId) => {
      if (id === templateId) return;

      try {
        await switchTemplate(id);
        if (isPreviewMode) {
          setIsPreviewMode(false);
          setOriginalTemplate(null);
        }
      } catch (error) {
        logger.error("Failed to switch template:", error);
      }
    },
    [templateId, switchTemplate, isPreviewMode],
  );

  // Handle preview mode
  const handlePreviewTemplate = useCallback(
    async (id: TemplateId) => {
      if (id === templateId) return;

      setPreviewTemplate(id);

      try {
        // Load template details for preview dialog
        const template = await loadTemplate(id);
        // You could display more details here
      } catch (error) {
        logger.error("Failed to load template preview:", error);
      }
    },
    [templateId],
  );

  // Enter preview mode
  const handleEnterPreviewMode = useCallback(
    async (id: TemplateId) => {
      setOriginalTemplate(templateId);
      setIsPreviewMode(true);
      await switchTemplate(id);
      setPreviewTemplate(null);
    },
    [templateId, switchTemplate],
  );

  // Exit preview mode
  const handleExitPreviewMode = useCallback(async () => {
    if (originalTemplate) {
      await switchTemplate(originalTemplate);
    }
    setIsPreviewMode(false);
    setOriginalTemplate(null);
  }, [originalTemplate, switchTemplate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Gallery</h2>
          <p className="text-muted-foreground">
            Choose a template that matches your preferred chat platform
          </p>
        </div>
        <div className="flex gap-2">
          {isPreviewMode && (
            <Button variant="outline" onClick={handleExitPreviewMode}>
              Exit Preview Mode
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? "Hide" : "Show"} Comparison
          </Button>
        </div>
      </div>

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-primary/10 flex items-center justify-between rounded-lg border border-primary p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-medium">Preview Mode Active</h3>
              <p className="text-sm text-muted-foreground">
                You're previewing a template. Click "Apply" to make it permanent
                or "Exit" to go back.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExitPreviewMode}>
              Cancel
            </Button>
            <Button onClick={() => setIsPreviewMode(false)}>
              Apply Template
            </Button>
          </div>
        </div>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            id={template.id}
            name={template.name}
            description={template.description}
            preview={template.preview}
            isActive={templateId === template.id && !isPreviewMode}
            onSelect={handleSelectTemplate}
            onPreview={handlePreviewTemplate}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>
              Compare features across all available templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeatureComparisonTable />
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewTemplate !== null}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {templates.find((t) => t.id === previewTemplate)?.name} Template
            </DialogTitle>
            <DialogDescription>
              {templates.find((t) => t.id === previewTemplate)?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview Image */}
            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
              {templates.find((t) => t.id === previewTemplate)?.preview ? (
                <img
                  src={templates.find((t) => t.id === previewTemplate)?.preview}
                  alt="Template preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  Preview Coming Soon
                </div>
              )}
            </div>

            {/* Key Features */}
            <div>
              <h4 className="mb-2 font-medium">Key Features</h4>
              <div className="flex flex-wrap gap-2">
                {previewTemplate &&
                  getTemplateFeatures(previewTemplate).map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="mb-2 font-medium">About This Template</h4>
              <p className="text-sm text-muted-foreground">
                {getTemplateDescription(previewTemplate as TemplateId)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                previewTemplate && handleEnterPreviewMode(previewTemplate)
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Mode
            </Button>
            <Button
              onClick={() => {
                if (previewTemplate) {
                  handleSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }
              }}
            >
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="rounded-lg bg-card p-6 shadow-lg">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading template...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------------------

function getTemplateDescription(id: TemplateId): string {
  const descriptions: Record<TemplateId, string> = {
    default:
      "The ɳChat default template showcases all platform capabilities with a modern, clean interface. Perfect for teams that want full feature access without limitations.",
    whatsapp:
      "Experience the familiar WhatsApp interface with chat bubbles, read receipts (double checkmarks), and a clean, mobile-first design. Great for personal and small team communication.",
    telegram:
      "Get Telegram's fast, cloud-based messaging experience with chat folders, bots, and scheduled messages. Ideal for large communities and power users.",
    slack:
      "Recreate Slack's workspace-focused interface with thread panels, huddles, and app integrations. Perfect for professional team collaboration.",
    discord:
      "Enjoy Discord's server-based structure with voice channels, role colors, and rich embeds. Best for gaming communities and large groups.",
  };

  return descriptions[id] || "";
}

export default TemplateGallery;
