"use client";

/**
 * Live Stream Component
 * Provides live streaming functionality
 */

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Square, Users, Settings } from "lucide-react";

export interface LiveStreamProps {
  streamId?: string;
  title?: string;
  viewerCount?: number;
  onStart?: () => void;
  onStop?: () => void;
  className?: string;
}

export function LiveStream({
  streamId,
  title = "Live Stream",
  viewerCount = 0,
  onStart,
  onStop,
  className,
}: LiveStreamProps) {
  const [isStreaming, setIsStreaming] = useState(false);

  const handleToggle = () => {
    if (isStreaming) {
      setIsStreaming(false);
      onStop?.();
    } else {
      setIsStreaming(true);
      onStart?.();
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <Badge variant="destructive" className="animate-pulse">
              <Radio className="mr-1 h-3 w-3" />
              LIVE
            </Badge>
          )}
          <h2 className="font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {viewerCount}
          </span>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex aspect-video flex-1 items-center justify-center bg-black">
        {!isStreaming ? (
          <p className="text-white/60">Stream preview will appear here</p>
        ) : (
          <p className="text-white">Broadcasting...</p>
        )}
      </div>

      <div className="flex justify-center p-4">
        <Button
          variant={isStreaming ? "destructive" : "default"}
          size="lg"
          onClick={handleToggle}
        >
          {isStreaming ? (
            <>
              <Square className="mr-2 h-4 w-4" />
              Stop Stream
            </>
          ) : (
            <>
              <Radio className="mr-2 h-4 w-4" />
              Go Live
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default LiveStream;
