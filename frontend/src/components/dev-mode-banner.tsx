"use client";

import { useAuth } from "@/contexts/auth-context";
import { authConfig } from "@/config/auth.config";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

export function DevModeBanner() {
  const { user, switchUser, isDevMode } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  if (!isDevMode || !isVisible) return null;

  return (
    <div className="bg-yellow-500 px-4 py-2 text-sm text-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold">🚧 Dev Mode</span>
          <span>
            Current: <strong>{user?.email}</strong> ({user?.role})
          </span>
          <div className="flex items-center gap-2">
            <span>Quick switch:</span>
            {authConfig.devAuth.availableUsers.slice(0, 5).map((testUser) => (
              <Button
                key={testUser.id}
                size="sm"
                variant="secondary"
                className="h-6 text-xs"
                onClick={() => switchUser?.(testUser.id)}
                disabled={user?.id === testUser.id}
              >
                {testUser.role}
              </Button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="rounded p-1 hover:bg-yellow-600"
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
