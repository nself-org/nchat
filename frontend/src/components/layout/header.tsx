"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Search, SlidersHorizontal } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  // Extract channel name from pathname
  const channelName = pathname.includes("/channel/")
    ? pathname.split("/channel/")[1]
    : "general";

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold">
          <span className="text-muted-foreground">#</span> {channelName}
        </h2>
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Filter">
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
        <NotificationBell />
      </div>
    </header>
  );
}
