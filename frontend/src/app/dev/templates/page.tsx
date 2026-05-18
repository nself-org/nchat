"use client";

import { useState } from "react";
import {
  Palette,
  LogIn,
  Layout,
  Building2,
  Users2,
  Globe,
  ArrowRight,
  Check,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ComponentPreview,
  PreviewCard,
  PreviewGrid,
} from "@/components/dev/component-preview";
import { CodeBlock } from "@/components/dev/code-block";

// ============================================================================
// Template Definitions
// ============================================================================

const templates = [
  {
    id: "login-only",
    name: "Login Only",
    description:
      "Direct to login page, no landing page. Best for internal tools and private teams.",
    icon: LogIn,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    features: ["Simple", "Fast", "Secure"],
    bestFor: ["Internal tools", "Private teams", "Enterprise apps"],
    homepage: { mode: "redirect", redirectTo: "/auth/signin" },
    preview: {
      sections: ["Login Form"],
    },
  },
  {
    id: "simple-landing",
    name: "Simple Landing",
    description:
      "Basic landing page with hero section and CTA buttons. Quick to set up.",
    icon: Layout,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    features: ["Hero Section", "Feature List", "Contact Info"],
    bestFor: ["Startups", "Small teams", "Quick launches"],
    homepage: {
      mode: "landing",
      landingPages: { hero: true, features: true, contact: true },
    },
    preview: {
      sections: ["Hero", "Features", "CTA"],
    },
  },
  {
    id: "full-homepage",
    name: "Full Homepage",
    description:
      "Complete website with navigation, pricing, about, and contact pages.",
    icon: Globe,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    features: [
      "Full Navigation",
      "Pricing Plans",
      "About Page",
      "Contact Form",
    ],
    bestFor: ["SaaS products", "Public communities", "Marketing sites"],
    homepage: {
      mode: "landing",
      landingPages: {
        hero: true,
        features: true,
        pricing: true,
        about: true,
        contact: true,
      },
    },
    preview: {
      sections: ["Hero", "Features", "Pricing", "About", "Contact"],
    },
  },
  {
    id: "corporate",
    name: "Corporate",
    description:
      "Professional layout for business teams. Security-focused messaging.",
    icon: Building2,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    features: ["Professional Design", "Team Features", "Security Focus"],
    bestFor: ["Enterprises", "Consulting firms", "Legal teams"],
    homepage: {
      mode: "landing",
      landingPages: { hero: true, features: true, about: true },
    },
    preview: {
      sections: ["Hero", "Features", "Testimonials"],
    },
  },
  {
    id: "community",
    name: "Community",
    description:
      "Open community platform with documentation and blog integration.",
    icon: Users2,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    features: ["Open Source Feel", "Documentation", "Blog Integration"],
    bestFor: ["Open source projects", "Gaming communities", "Fan groups"],
    homepage: {
      mode: "landing",
      landingPages: { hero: true, features: true, docs: true, blog: true },
    },
    preview: {
      sections: ["Hero", "Features", "Docs", "Blog"],
    },
  },
];

// ============================================================================
// Code Examples
// ============================================================================

const templateConfigCode = `// src/config/app-config.ts

export interface AppConfig {
  // Landing Theme Templates
  landingTheme: 'login-only' | 'simple-landing' | 'full-homepage' | 'corporate' | 'community'

  // Homepage Configuration
  homepage: {
    mode: 'landing' | 'redirect' | 'chat'
    landingPages?: {
      hero: boolean
      features: boolean
      pricing: boolean
      about: boolean
      contact: boolean
      blog: boolean
      docs: boolean
    }
    redirectTo?: '/login' | '/chat' | '/signup'
  }
}`;

const templateUsageCode = `// Using in setup wizard or admin panel
import { landingThemeTemplates } from '@/config/app-config'

function TemplateSelector() {
  const { config, updateConfig } = useAppConfig()

  const handleTemplateChange = (templateId: string) => {
    const template = landingThemeTemplates[templateId]
    updateConfig({
      landingTheme: templateId,
      homepage: template.homepage
    })
  }

  return (
    <RadioGroup
      value={config.landingTheme}
      onValueChange={handleTemplateChange}
    >
      {Object.entries(landingThemeTemplates).map(([id, template]) => (
        <div key={id} className="flex items-start gap-3 p-4 rounded-lg border">
          <RadioGroupItem value={id} id={id} />
          <Label htmlFor={id}>
            <h3 className="font-medium">{template.name}</h3>
            <p className="text-sm text-muted-foreground">
              {template.description}
            </p>
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}`;

// ============================================================================
// Page Component
// ============================================================================

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState("simple-landing");
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-lg bg-pink-500/10 p-2">
            <Palette className="h-5 w-5 text-pink-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Landing Page Templates
          </h1>
        </div>
        <p className="text-muted-foreground">
          Choose from 5 pre-built landing page templates to customize your
          nself-chat deployment. Each template is fully customizable through the
          setup wizard.
        </p>
      </div>

      {/* Template Count */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-sm">
          {templates.length} templates
        </Badge>
        <Badge variant="outline" className="text-sm">
          White-label ready
        </Badge>
        <Badge variant="outline" className="text-sm">
          Mobile responsive
        </Badge>
      </div>

      <Separator />

      {/* Template Grid */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Choose a Template</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate === template.id;
            return (
              <Card
                key={template.id}
                className={cn(
                  "hover:border-primary/50 cursor-pointer transition-all",
                  isSelected && "ring-primary/20 border-primary ring-2",
                )}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={cn("rounded-lg p-2", template.bgColor)}>
                      <Icon className={cn("h-5 w-5", template.color)} />
                    </div>
                    {isSelected && (
                      <div className="rounded-full bg-primary p-1">
                        <Check className="text-primary-foreground h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {template.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="text-xs"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Template Details */}
      {currentTemplate && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Template Preview: {currentTemplate.name}
            </h2>
            <div className="bg-muted/30 flex items-center rounded-md border p-0.5">
              <Button
                variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewDevice("desktop")}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewDevice("tablet")}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewDevice("mobile")}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="bg-muted/30 rounded-lg border p-4">
            <div
              className={cn(
                "mx-auto overflow-hidden rounded-lg border bg-background transition-all",
                previewDevice === "desktop" && "w-full",
                previewDevice === "tablet" && "w-[768px]",
                previewDevice === "mobile" && "w-[375px]",
              )}
            >
              {/* Mock Browser Chrome */}
              <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="mx-4 flex-1">
                  <div className="rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
                    https://your-app.com
                  </div>
                </div>
              </div>

              {/* Preview Content */}
              <div className="h-96 overflow-y-auto">
                {currentTemplate.id === "login-only" ? (
                  <div className="flex h-full items-center justify-center p-8">
                    <div className="w-full max-w-sm space-y-6 text-center">
                      <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-lg">
                        <LogIn className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Welcome back</h2>
                        <p className="text-muted-foreground">
                          Sign in to continue
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-muted/30 h-10 rounded-md border" />
                        <div className="bg-muted/30 h-10 rounded-md border" />
                        <div className="h-10 rounded-md bg-primary" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12 p-8">
                    {/* Hero Section */}
                    <div className="space-y-4 text-center">
                      <h1 className="text-3xl font-bold">Your App Name</h1>
                      <p className="mx-auto max-w-md text-muted-foreground">
                        Team communication made simple. Connect, collaborate,
                        and build together.
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <Button>Get Started</Button>
                        <Button variant="outline">Learn More</Button>
                      </div>
                    </div>

                    {/* Features */}
                    {currentTemplate.homepage.landingPages?.features && (
                      <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="rounded-lg border p-4 text-center"
                          >
                            <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-muted" />
                            <div className="mx-auto mb-1 h-4 w-20 rounded bg-muted" />
                            <div className="bg-muted/50 h-3 w-full rounded" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pricing */}
                    {currentTemplate.homepage.landingPages?.pricing && (
                      <div className="grid grid-cols-3 gap-4">
                        {["Free", "Pro", "Enterprise"].map((plan) => (
                          <div
                            key={plan}
                            className="rounded-lg border p-4 text-center"
                          >
                            <h3 className="mb-2 font-semibold">{plan}</h3>
                            <div className="mx-auto mb-4 h-8 w-16 rounded bg-muted" />
                            <div className="space-y-2">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="bg-muted/50 h-3 w-full rounded"
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Docs/Blog */}
                    {(currentTemplate.homepage.landingPages?.docs ||
                      currentTemplate.homepage.landingPages?.blog) && (
                      <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="rounded-lg border p-3">
                            <div className="mb-2 h-3 w-24 rounded bg-muted" />
                            <div className="bg-muted/50 mb-1 h-2 w-full rounded" />
                            <div className="bg-muted/50 h-2 w-3/4 rounded" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Template Info */}
          <PreviewGrid cols={2}>
            <Card>
              <CardHeader>
                <CardTitle>Best For</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentTemplate.bestFor.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Included Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {currentTemplate.preview.sections.map((section) => (
                    <Badge key={section} variant="secondary">
                      {section}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </PreviewGrid>
        </section>
      )}

      <Separator />

      {/* Customization Guide */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Template Configuration</h2>

        <Card>
          <CardHeader>
            <CardTitle>AppConfig Interface</CardTitle>
            <CardDescription>
              Templates are configured through the AppConfig interface in your
              application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={templateConfigCode}
              language="typescript"
              filename="app-config.ts"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Using Templates</CardTitle>
            <CardDescription>
              Example of implementing a template selector in your setup wizard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={templateUsageCode}
              language="tsx"
              filename="template-selector.tsx"
            />
          </CardContent>
        </Card>
      </section>

      {/* Customization Tips */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Customization Guide</h2>
        <PreviewGrid cols={3}>
          <PreviewCard title="Branding">
            <p className="text-sm text-muted-foreground">
              Customize logo, app name, tagline, and colors through the setup
              wizard or programmatically via AppConfig.
            </p>
          </PreviewCard>
          <PreviewCard title="Theme Colors">
            <p className="text-sm text-muted-foreground">
              Choose from 25+ color presets or define custom colors. Templates
              automatically adapt to your theme.
            </p>
          </PreviewCard>
          <PreviewCard title="Content">
            <p className="text-sm text-muted-foreground">
              Update hero text, feature descriptions, and pricing through the
              admin panel or directly in code.
            </p>
          </PreviewCard>
        </PreviewGrid>
      </section>
    </div>
  );
}
