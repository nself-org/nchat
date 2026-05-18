"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SettingsLayout } from "@/components/settings";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  Bell,
  Shield,
  Settings,
  Keyboard,
  Palette,
  ChevronRight,
} from "lucide-react";

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const settingsCards: SettingsCard[] = [
  {
    title: "Profile",
    description: "Update your personal information, avatar, and bio",
    href: "/settings/profile",
    icon: User,
  },
  {
    title: "Notifications",
    description: "Configure how and when you receive notifications",
    href: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "Privacy",
    description: "Control who can see your activity and contact you",
    href: "/settings/privacy",
    icon: Shield,
  },
  {
    title: "Account",
    description: "Manage your account settings and security",
    href: "/settings/account",
    icon: Settings,
  },
  {
    title: "Appearance",
    description: "Customize the look and feel of the app",
    href: "/settings/appearance",
    icon: Palette,
  },
  {
    title: "Keyboard Shortcuts",
    description: "View and customize keyboard shortcuts",
    href: "/settings/keyboard",
    icon: Keyboard,
  },
];

export default function SettingsPage() {
  const router = useRouter();

  // On larger screens, redirect to profile (first item)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    if (mediaQuery.matches) {
      router.replace("/settings/profile");
    }
  }, [router]);

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Mobile settings grid */}
        <div className="grid gap-4 md:hidden">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href}>
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center gap-4 p-4">
                    <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {card.description}
                      </CardDescription>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Desktop message - user will be redirected */}
        <div className="hidden md:block">
          <p className="text-muted-foreground">
            Select a settings category from the sidebar.
          </p>
        </div>
      </div>
    </SettingsLayout>
  );
}
