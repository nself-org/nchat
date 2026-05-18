"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { AppScreenshot } from "@/lib/app-directory/app-types";

interface AppScreenshotsProps {
  screenshots: AppScreenshot[];
  appName: string;
  className?: string;
}

export function AppScreenshots({
  screenshots,
  appName,
  className,
}: AppScreenshotsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const sortedScreenshots = [...screenshots].sort((a, b) => a.order - b.order);

  const handlePrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(
      selectedIndex > 0 ? selectedIndex - 1 : sortedScreenshots.length - 1,
    );
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(
      selectedIndex < sortedScreenshots.length - 1 ? selectedIndex + 1 : 0,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handlePrevious();
    } else if (e.key === "ArrowRight") {
      handleNext();
    } else if (e.key === "Escape") {
      setSelectedIndex(null);
    }
  };

  if (sortedScreenshots.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="font-semibold">Screenshots</h3>

      {/* Thumbnail Gallery */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-3">
          {sortedScreenshots.map((screenshot, index) => (
            <button
              key={screenshot.id}
              className="group relative flex-shrink-0 overflow-hidden rounded-lg border bg-muted"
              onClick={() => setSelectedIndex(index)}
            >
              <img
                src={screenshot.url}
                alt={screenshot.caption || `${appName} screenshot ${index + 1}`}
                className="h-40 w-auto object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  // Show placeholder on error
                  const target = e.target as HTMLImageElement;
                  target.src =
                    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="%23e5e7eb" width="200" height="150"/><text fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">Screenshot</text></svg>';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-6 w-6 text-white" />
              </div>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Lightbox Dialog */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={() => setSelectedIndex(null)}
      >
        <DialogContent
          className="max-w-5xl border-0 bg-black/95 p-0"
          onKeyDown={handleKeyDown}
        >
          <DialogClose className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20">
            <X className="h-5 w-5 text-white" />
          </DialogClose>

          {selectedIndex !== null && (
            <div className="relative flex min-h-[60vh] items-center justify-center p-8">
              {/* Previous Button */}
              {sortedScreenshots.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-50 rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {/* Image */}
              <div className="flex flex-col items-center gap-4">
                <img
                  src={sortedScreenshots[selectedIndex].url}
                  alt={
                    sortedScreenshots[selectedIndex].caption ||
                    `${appName} screenshot`
                  }
                  className="max-h-[70vh] max-w-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect fill="%23374151" width="600" height="400"/><text fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">Screenshot unavailable</text></svg>';
                  }}
                />
                {sortedScreenshots[selectedIndex].caption && (
                  <p className="max-w-2xl text-center text-white/80">
                    {sortedScreenshots[selectedIndex].caption}
                  </p>
                )}
              </div>

              {/* Next Button */}
              {sortedScreenshots.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-50 rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              {/* Pagination Dots */}
              {sortedScreenshots.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {sortedScreenshots.map((_, index) => (
                    <button
                      key={index}
                      className={cn(
                        "h-2 w-2 rounded-full transition-colors",
                        index === selectedIndex ? "bg-white" : "bg-white/40",
                      )}
                      onClick={() => setSelectedIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact screenshot preview for cards
interface ScreenshotPreviewProps {
  screenshots: AppScreenshot[];
  appName: string;
  className?: string;
}

export function ScreenshotPreview({
  screenshots,
  appName,
  className,
}: ScreenshotPreviewProps) {
  if (screenshots.length === 0) return null;

  const firstScreenshot = screenshots[0];

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg bg-muted", className)}
    >
      <img
        src={firstScreenshot.url}
        alt={firstScreenshot.caption || `${appName} preview`}
        className="h-full w-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
        }}
      />
      {screenshots.length > 1 && (
        <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          +{screenshots.length - 1} more
        </div>
      )}
    </div>
  );
}
