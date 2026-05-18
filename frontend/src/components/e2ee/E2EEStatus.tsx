/**
 * E2EE Status Component
 * Shows encryption status in message UI
 */

"use client";

import { Lock, LockOpen, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface E2EEStatusProps {
  isEncrypted: boolean;
  isVerified?: boolean;
  variant?: "badge" | "icon" | "inline";
  className?: string;
}

export function E2EEStatus({
  isEncrypted,
  isVerified = false,
  variant = "icon",
  className,
}: E2EEStatusProps) {
  if (variant === "badge") {
    return (
      <Badge
        variant={isEncrypted ? "default" : "secondary"}
        className={cn("gap-1", className)}
      >
        {isEncrypted ? (
          <>
            <Lock className="h-3 w-3" />
            {isVerified ? "Verified E2EE" : "Encrypted"}
          </>
        ) : (
          <>
            <LockOpen className="h-3 w-3" />
            Not Encrypted
          </>
        )}
      </Badge>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "flex items-center gap-1 text-xs text-muted-foreground",
          className,
        )}
      >
        {isEncrypted ? (
          <>
            <Lock className="h-3 w-3" />
            <span>End-to-end encrypted</span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            <span>Not encrypted</span>
          </>
        )}
      </span>
    );
  }

  // Icon variant (default)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex", className)}>
            {isEncrypted ? (
              <Lock
                className={cn(
                  "h-4 w-4",
                  isVerified ? "text-green-500" : "text-primary",
                )}
              />
            ) : (
              <LockOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isEncrypted ? (
            <div className="space-y-1">
              <p className="font-semibold">End-to-end encrypted</p>
              {isVerified ? (
                <p className="text-xs">Identity verified</p>
              ) : (
                <p className="text-xs">Verify identity to ensure security</p>
              )}
            </div>
          ) : (
            <p>This conversation is not encrypted</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default E2EEStatus;
