"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  proTips,
  getRandomProTip,
  type ProTip as ProTipType,
} from "@/lib/onboarding/feature-discovery";

interface ProTipProps {
  tip?: ProTipType;
  onDismiss?: () => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
  seenTipIds?: string[];
  className?: string;
}

export function ProTip({
  tip: externalTip,
  onDismiss,
  onRefresh,
  showRefresh = true,
  seenTipIds = [],
  className,
}: ProTipProps) {
  const [tip, setTip] = useState<ProTipType | null>(
    externalTip ?? getRandomProTip(seenTipIds),
  );
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (externalTip) {
      setTip(externalTip);
    }
  }, [externalTip]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 200);
  }, [onDismiss]);

  const handleRefresh = useCallback(() => {
    const newTip = getRandomProTip([...seenTipIds, tip?.id ?? ""]);
    if (newTip) {
      setTip(newTip);
      onRefresh?.();
    }
  }, [seenTipIds, tip?.id, onRefresh]);

  if (!isVisible || !tip) return null;

  const categoryColors = {
    productivity: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    communication: "from-green-500/10 to-green-600/5 border-green-500/20",
    organization: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
    advanced: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
  };

  const categoryIcons = {
    productivity: "\u26A1", // Lightning
    communication: "\U0001F4AC", // Speech bubble
    organization: "\U0001F4C1", // Folder
    advanced: "\U0001F3AF", // Target
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        "bg-gradient-to-r",
        categoryColors[tip.category],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-black/20">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Pro Tip
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  "bg-white/50 text-zinc-600 dark:bg-black/20 dark:text-zinc-400",
                )}
              >
                {tip.category}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {showRefresh && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded p-1 transition-colors hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                  title="Show another tip"
                >
                  <RefreshCw className="h-4 w-4 text-zinc-500" />
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded p-1 transition-colors hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
                >
                  <X className="h-4 w-4 text-zinc-500" />
                </button>
              )}
            </div>
          </div>

          <h4 className="mt-2 font-semibold text-zinc-900 dark:text-white">
            {tip.title}
          </h4>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {tip.description}
          </p>
        </div>
      </div>
    </div>
  );
}
