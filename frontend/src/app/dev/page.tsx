"use client";

import Link from "next/link";
import {
  Layers,
  MessageSquare,
  Hash,
  User,
  Palette,
  Flag,
  ArrowRight,
  Sparkles,
  Code2,
  Zap,
  Shield,
  Paintbrush,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Quick Links Configuration
// ============================================================================

const quickLinks = [
  {
    title: "Component Library",
    description: "Browse all UI components with interactive examples",
    href: "/dev/components",
    icon: Layers,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Message Components",
    description: "MessageList, MessageItem, MessageInput, and more",
    href: "/dev/components/messages",
    icon: MessageSquare,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Channel Components",
    description: "ChannelList, ChannelHeader, and channel management",
    href: "/dev/components/channels",
    icon: Hash,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "User Components",
    description: "Avatars, profile cards, and presence indicators",
    href: "/dev/components/users",
    icon: User,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Templates",
    description: "5 landing page templates for different use cases",
    href: "/dev/templates",
    icon: Palette,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    badge: "5 templates",
  },
  {
    title: "Feature Flags",
    description: "Configure and toggle application features",
    href: "/dev/features",
    icon: Flag,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

// ============================================================================
// Feature Highlights
// ============================================================================

const features = [
  {
    title: "Fully Typed",
    description:
      "Complete TypeScript support with comprehensive prop definitions",
    icon: Code2,
  },
  {
    title: "Performance First",
    description: "Virtualized lists, memoization, and optimized rendering",
    icon: Zap,
  },
  {
    title: "Accessible",
    description: "ARIA labels, keyboard navigation, and screen reader support",
    icon: Shield,
  },
  {
    title: "Themeable",
    description: "25+ theme presets with full customization options",
    icon: Paintbrush,
  },
];

// ============================================================================
// Component Categories
// ============================================================================

const categories = [
  {
    name: "Chat",
    count: 17,
    items: [
      "MessageList",
      "MessageItem",
      "MessageInput",
      "TypingIndicator",
      "MessageReactions",
    ],
  },
  {
    name: "Channel",
    count: 8,
    items: ["ChannelList", "ChannelHeader", "ChannelItem", "ChannelCategory"],
  },
  {
    name: "User",
    count: 6,
    items: ["UserAvatar", "UserProfileCard", "UserPresenceDot", "RoleBadge"],
  },
  {
    name: "UI",
    count: 20,
    items: ["Button", "Input", "Dialog", "Dropdown", "Tabs", "Card"],
  },
];

// ============================================================================
// Page Component
// ============================================================================

export default function DevHomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center">
        <div className="bg-muted/50 mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Developer Documentation</span>
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          nself-chat Component Library
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          Build beautiful, real-time team communication apps with our
          comprehensive component library. White-label ready with full
          customization.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/dev/components">
              Browse Components
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/dev/templates">View Templates</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-primary">50+</div>
            <div className="text-sm text-muted-foreground">Components</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-primary">25+</div>
            <div className="text-sm text-muted-foreground">Theme Presets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-primary">5</div>
            <div className="text-sm text-muted-foreground">
              Landing Templates
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-primary">100%</div>
            <div className="text-sm text-muted-foreground">TypeScript</div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Quick Links</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="hover:border-primary/50 h-full transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={cn("rounded-lg p-2", link.bgColor)}>
                        <Icon className={cn("h-5 w-5", link.color)} />
                      </div>
                      {link.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {link.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="flex items-center gap-2 transition-colors group-hover:text-primary">
                      {link.title}
                      <ArrowRight className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Key Features</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="bg-primary/10 mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-1 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Component Categories */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Component Categories</h2>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{category.name}</CardTitle>
                  <Badge variant="outline">{category.count} components</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {category.items.map((item) => (
                    <code
                      key={item}
                      className="rounded bg-muted px-2 py-1 font-mono text-xs"
                    >
                      {item}
                    </code>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Quick start guide for using nchat components in your project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-zinc-950 p-4 font-mono text-sm text-zinc-50">
              <div className="text-muted-foreground">
                # Install dependencies
              </div>
              <div>npm install</div>
              <div className="mt-4 text-muted-foreground">
                # Start development server
              </div>
              <div>npm run dev</div>
              <div className="mt-4 text-muted-foreground">
                # Start backend (first time)
              </div>
              <div>cd .backend && nself init && nself build && nself start</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Components are located in{" "}
              <code className="rounded bg-muted px-1">src/components/</code>.
              Each component is self-contained with its own types, styles, and
              tests.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
