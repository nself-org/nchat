"use client";

/**
 * Screen Share Viewer Component
 *
 * Full-featured viewer for screen shares with:
 * - Full-screen mode
 * - Picture-in-Picture support
 * - Multiple fit modes (contain, cover, fill, none)
 * - Zoom controls with pan/drag
 * - Follow presenter pointer
 * - Presenter info overlay
 * - Viewer controls
 */

import * as React from "react";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Monitor,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Maximize2,
  RectangleHorizontal,
  Square,
  Scan,
  X,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Download,
  MousePointer,
} from "lucide-react";
import type { ScreenFitMode, ScreenShare } from "@/lib/webrtc/screen-capture";

// =============================================================================
// Types
// =============================================================================

export interface PresenterPointer {
  /** Normalized X position (0-1) */
  x: number;
  /** Normalized Y position (0-1) */
  y: number;
  /** Whether pointer is visible */
  visible: boolean;
  /** Pointer color */
  color?: string;
}

export interface ScreenShareViewerProps {
  /** Screen share data */
  share: ScreenShare;
  /** Additional class name */
  className?: string;
  /** Whether viewer is local user (has controls) */
  isLocal?: boolean;
  /** Show presenter overlay */
  showPresenterInfo?: boolean;
  /** Initial fit mode */
  initialFitMode?: ScreenFitMode;
  /** Initial zoom level (1 = 100%) */
  initialZoom?: number;
  /** Presenter pointer position (for follow mode) */
  presenterPointer?: PresenterPointer;
  /** Whether to auto-follow presenter pointer */
  followPresenter?: boolean;
  /** Callback when viewer is closed */
  onClose?: () => void;
  /** Callback when stop sharing is clicked */
  onStopSharing?: () => void;
  /** Callback when pause is toggled */
  onPauseToggle?: () => void;
  /** Callback when fit mode changes */
  onFitModeChange?: (mode: ScreenFitMode) => void;
  /** Callback when zoom changes */
  onZoomChange?: (zoom: number) => void;
  /** Callback to open annotation mode */
  onAnnotate?: () => void;
  /** Callback when follow presenter changes */
  onFollowPresenterChange?: (follow: boolean) => void;
}

const FIT_MODE_STYLES: Record<ScreenFitMode, string> = {
  contain: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
  none: "object-none",
};

const FIT_MODE_LABELS: Record<ScreenFitMode, string> = {
  contain: "Fit to window",
  cover: "Fill window",
  fill: "Stretch to fit",
  none: "Original size",
};

const FIT_MODE_ICONS: Record<ScreenFitMode, React.ReactNode> = {
  contain: <RectangleHorizontal className="h-4 w-4" />,
  cover: <Maximize2 className="h-4 w-4" />,
  fill: <Square className="h-4 w-4" />,
  none: <Scan className="h-4 w-4" />,
};

// =============================================================================
// Component
// =============================================================================

export function ScreenShareViewer({
  share,
  className,
  isLocal = false,
  showPresenterInfo = true,
  initialFitMode = "contain",
  initialZoom = 1,
  presenterPointer,
  followPresenter: initialFollowPresenter = false,
  onClose,
  onStopSharing,
  onPauseToggle,
  onFitModeChange,
  onZoomChange,
  onAnnotate,
  onFollowPresenterChange,
}: ScreenShareViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [fitMode, setFitMode] = useState<ScreenFitMode>(initialFitMode);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Zoom state
  const [zoom, setZoom] = useState(initialZoom);
  const [followPresenter, setFollowPresenter] = useState(
    initialFollowPresenter,
  );

  // Drag state for panning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

  // ==========================================================================
  // Attach stream to video element
  // ==========================================================================

  useEffect(() => {
    if (videoRef.current && share.stream) {
      videoRef.current.srcObject = share.stream;
      setVideoError(null);
    }
  }, [share.stream]);

  // ==========================================================================
  // Auto-hide controls
  // ==========================================================================

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = () => resetControlsTimeout();
    const handleMouseLeave = () => setShowControls(false);

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // ==========================================================================
  // Zoom handling
  // ==========================================================================

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + 0.25, 4);
      onZoomChange?.(newZoom);
      return newZoom;
    });
  }, [onZoomChange]);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.25, 0.25);
      onZoomChange?.(newZoom);
      return newZoom;
    });
  }, [onZoomChange]);

  const handleZoomChange = useCallback(
    (value: number[]) => {
      const newZoom = value[0];
      setZoom(newZoom);
      onZoomChange?.(newZoom);
    },
    [onZoomChange],
  );

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    onZoomChange?.(1);
  }, [onZoomChange]);

  // Drag to pan when zoomed
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1 || fitMode !== "none") return;

      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setScrollStart({
        x: scrollContainerRef.current?.scrollLeft ?? 0,
        y: scrollContainerRef.current?.scrollTop ?? 0,
      });
    },
    [zoom, fitMode],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !scrollContainerRef.current) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      scrollContainerRef.current.scrollLeft = scrollStart.x - dx;
      scrollContainerRef.current.scrollTop = scrollStart.y - dy;
    },
    [isDragging, dragStart, scrollStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Follow presenter pointer
  const handleToggleFollowPresenter = useCallback(() => {
    setFollowPresenter((prev) => {
      const newFollow = !prev;
      onFollowPresenterChange?.(newFollow);
      return newFollow;
    });
  }, [onFollowPresenterChange]);

  // Auto-scroll to follow presenter pointer
  useEffect(() => {
    if (
      !followPresenter ||
      !presenterPointer?.visible ||
      !scrollContainerRef.current
    )
      return;

    const container = scrollContainerRef.current;
    const { x, y } = presenterPointer;

    // Calculate target scroll position to center on pointer
    const targetX = x * container.scrollWidth - container.clientWidth / 2;
    const targetY = y * container.scrollHeight - container.clientHeight / 2;

    container.scrollTo({
      left: Math.max(0, targetX),
      top: Math.max(0, targetY),
      behavior: "smooth",
    });
  }, [followPresenter, presenterPointer]);

  // Save snapshot functionality
  const handleSaveSnapshot = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    const link = document.createElement("a");
    link.download = `screen-share-${share.userName}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [share.userName]);

  // Compute video style based on fit mode and zoom
  const videoStyle = useMemo(() => {
    if (fitMode === "none" && zoom !== 1) {
      return {
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        width: "auto",
        height: "auto",
      };
    }
    return {};
  }, [fitMode, zoom]);

  // ==========================================================================
  // Fullscreen handling
  // ==========================================================================

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // ==========================================================================
  // Picture-in-Picture handling
  // ==========================================================================

  const togglePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (!isPiP) {
        await videoRef.current.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiP(true);
    const handleLeavePiP = () => setIsPiP(false);

    video.addEventListener("enterpictureinpicture", handleEnterPiP);
    video.addEventListener("leavepictureinpicture", handleLeavePiP);

    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnterPiP);
      video.removeEventListener("leavepictureinpicture", handleLeavePiP);
    };
  }, []);

  const isPiPSupported =
    typeof document !== "undefined" && "pictureInPictureEnabled" in document
      ? document.pictureInPictureEnabled
      : false;

  // ==========================================================================
  // Fit mode handling
  // ==========================================================================

  const handleFitModeChange = (mode: ScreenFitMode) => {
    setFitMode(mode);
    onFitModeChange?.(mode);
  };

  // ==========================================================================
  // Audio handling
  // ==========================================================================

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // ==========================================================================
  // Video error handling
  // ==========================================================================

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error("Video error:", e);
    setVideoError("Failed to load screen share");
  };

  // ==========================================================================
  // Keyboard shortcuts
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "p":
        case "P":
          if (isPiPSupported) {
            e.preventDefault();
            togglePiP();
          }
          break;
        case "m":
        case "M":
          if (share.hasAudio) {
            e.preventDefault();
            toggleMute();
          }
          break;
        case "Escape":
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPiPSupported, share.hasAudio, isFullscreen]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden bg-black",
        isFullscreen && "fixed inset-0 z-50",
        className,
      )}
    >
      {/* Video Container with Scroll for Zoom */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "h-full w-full overflow-auto",
          zoom > 1 && fitMode === "none" && "cursor-grab",
          isDragging && "cursor-grabbing",
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Video Element */}
        {videoError ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <Monitor className="mb-4 h-16 w-16 text-gray-500" />
            <p className="text-gray-400">{videoError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (videoRef.current && share.stream) {
                  videoRef.current.srcObject = share.stream;
                  setVideoError(null);
                }
              }}
              className="mt-4"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted || !share.hasAudio}
            onError={handleVideoError}
            style={videoStyle}
            className={cn("h-full w-full", FIT_MODE_STYLES[fitMode])}
          />
        )}

        {/* Presenter Pointer Overlay */}
        {presenterPointer?.visible && (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: `${presenterPointer.x * 100}%`,
              top: `${presenterPointer.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="h-6 w-6 animate-pulse rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: presenterPointer.color ?? "#ff0000" }}
            />
          </div>
        )}
      </div>

      {/* Paused Overlay */}
      {share.isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center text-white">
            <Pause className="mx-auto mb-4 h-16 w-16" />
            <p className="text-lg font-medium">Screen share paused</p>
            {isLocal && (
              <Button
                variant="outline"
                onClick={onPauseToggle}
                className="mt-4"
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center justify-between">
          {/* Left: Presenter Info */}
          {showPresenterInfo && (
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white">
                <Monitor className="mr-1 h-3 w-3" />
                {share.userName} is presenting
              </Badge>
              <Badge
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                {share.type}
              </Badge>
              {share.hasAudio && (
                <Badge
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  <Volume2 className="mr-1 h-3 w-3" />
                  Audio
                </Badge>
              )}
            </div>
          )}

          {/* Center: Zoom Controls */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.25}
                    className="text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="w-20">
              <Slider
                value={[zoom]}
                onValueChange={handleZoomChange}
                min={0.25}
                max={4}
                step={0.25}
                className="[&_[role=slider]]:bg-white"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={zoom >= 4}
                    className="text-white hover:bg-white/20 disabled:opacity-50"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="text-xs text-white hover:bg-white/20"
            >
              {Math.round(zoom * 100)}%
            </Button>

            {/* Follow presenter toggle */}
            {presenterPointer && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={followPresenter ? "secondary" : "ghost"}
                      size="icon"
                      onClick={handleToggleFollowPresenter}
                      className={cn(
                        !followPresenter && "text-white hover:bg-white/20",
                      )}
                    >
                      <Crosshair className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {followPresenter
                      ? "Stop Following Presenter"
                      : "Follow Presenter"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Audio toggle */}
            {share.hasAudio && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* Snapshot download */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveSnapshot}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save Snapshot</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Annotate button */}
            {onAnnotate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAnnotate}
                      className="text-white hover:bg-white/20"
                    >
                      <MousePointer className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Annotate</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Fit mode dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  title="Screen fit mode"
                >
                  {FIT_MODE_ICONS[fitMode]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Fit Mode</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={fitMode}
                  onValueChange={(v) => handleFitModeChange(v as ScreenFitMode)}
                >
                  {Object.entries(FIT_MODE_LABELS).map(([mode, label]) => (
                    <DropdownMenuRadioItem key={mode} value={mode}>
                      <span className="mr-2">
                        {FIT_MODE_ICONS[mode as ScreenFitMode]}
                      </span>
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* PiP toggle */}
            {isPiPSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePiP}
                className="text-white hover:bg-white/20"
                title={
                  isPiP
                    ? "Exit Picture-in-Picture (P)"
                    : "Picture-in-Picture (P)"
                }
              >
                <PictureInPicture2
                  className={cn("h-5 w-5", isPiP && "text-blue-400")}
                />
              </Button>
            )}

            {/* Fullscreen toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
              title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>

            {/* Local controls */}
            {isLocal && (
              <>
                {/* Pause/Resume */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPauseToggle}
                  className="text-white hover:bg-white/20"
                  title={share.isPaused ? "Resume sharing" : "Pause sharing"}
                >
                  {share.isPaused ? (
                    <Play className="h-5 w-5" />
                  ) : (
                    <Pause className="h-5 w-5" />
                  )}
                </Button>

                {/* Stop sharing */}
                <Button variant="destructive" size="sm" onClick={onStopSharing}>
                  <X className="mr-1 h-4 w-4" />
                  Stop
                </Button>
              </>
            )}

            {/* Close button (for non-local) */}
            {!isLocal && onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20"
                title="Close viewer"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Top-right: Quality Badge */}
      <div
        className={cn(
          "absolute right-4 top-4 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        <Badge
          variant="outline"
          className="border-gray-600 bg-black/50 text-gray-300"
        >
          {share.quality.toUpperCase()} @ {share.frameRate}fps
        </Badge>
      </div>

      {/* Keyboard shortcuts hint */}
      {showControls && isFullscreen && (
        <div className="absolute left-4 top-4 text-xs text-gray-400">
          <kbd className="rounded bg-gray-700 px-1">F</kbd> Fullscreen{" "}
          <kbd className="ml-2 rounded bg-gray-700 px-1">P</kbd> PiP{" "}
          {share.hasAudio && (
            <>
              <kbd className="ml-2 rounded bg-gray-700 px-1">M</kbd> Mute
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ScreenShareViewer;
