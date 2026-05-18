"use client";

import { ReactNode } from "react";
import { SettingsNav } from "./settings-nav";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 border-r bg-card md:block">
        <div className="sticky top-0 h-screen">
          <div className="flex h-14 items-center border-b px-6">
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-3.5rem)]">
            <SettingsNav />
          </ScrollArea>
        </div>
      </aside>

      {/* Mobile Navigation Header */}
      <div className="fixed inset-x-0 top-0 z-50 border-b bg-background md:hidden">
        <div className="flex h-14 items-center px-4">
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="container max-w-4xl py-6 md:py-8">
          {/* Mobile Nav */}
          <div className="mb-6 md:hidden">
            <ScrollArea className="w-full whitespace-nowrap">
              <SettingsNav variant="horizontal" />
            </ScrollArea>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
