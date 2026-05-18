"use client";

/**
 * Animated Sticker Component
 *
 * Renders animated stickers using Lottie or native browser support.
 * Supports Lottie JSON, APNG, GIF, and WebM formats.
 */

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Loader2, AlertCircle, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sticker, StickerFormat, StickerType } from "@/types/sticker";

// ============================================================================
// Types
// ============================================================================

interface AnimatedStickerProps {
  /** Sticker data */
  sticker: Sticker;
  /** Sticker URL (overrides sticker.url) */
  src?: string;
  /** Width in pixels or CSS value */
  width?: number | string;
  /** Height in pixels or CSS value */
  height?: number | string;
  /** Whether to autoplay */
  autoplay?: boolean;
  /** Whether to loop */
  loop?: boolean;
  /** Playback speed (1 = normal, 2 = 2x speed) */
  speed?: number;
  /** Whether to show play/pause controls */
  showControls?: boolean;
  /** Callback when sticker loads */
  onLoad?: () => void;
  /** Callback when sticker fails to load */
  onError?: (error: Error) => void;
  /** Callback when sticker is clicked */
  onClick?: () => void;
  /** Whether the sticker is visible (for lazy loading) */
  isVisible?: boolean;
  /** Custom class name */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
}

interface LottiePlayerRef {
  play: () => void;
  pause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  setDirection: (direction: 1 | -1) => void;
  goToAndPlay: (value: number, isFrame?: boolean) => void;
  goToAndStop: (value: number, isFrame?: boolean) => void;
  destroy: () => void;
}

// ============================================================================
// Lottie Animation Component
// ============================================================================

interface LottieAnimationProps {
  src: string;
  autoplay: boolean;
  loop: boolean;
  speed: number;
  width: number | string;
  height: number | string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

const LottieAnimation = memo(function LottieAnimation({
  src,
  autoplay,
  loop,
  speed,
  width,
  height,
  onLoad,
  onError,
  className,
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<LottiePlayerRef | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLottie = async () => {
      try {
        // Dynamically import lottie-web
        const lottie = await import("lottie-web");

        if (!isMounted || !containerRef.current) return;

        // Destroy existing animation
        if (playerRef.current) {
          playerRef.current.destroy();
        }

        // Load animation data
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`Failed to fetch Lottie: ${response.statusText}`);
        }
        const animationData = await response.json();

        if (!isMounted || !containerRef.current) return;

        // Create animation
        const animation = lottie.default.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay,
          animationData,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid slice",
            progressiveLoad: true,
          },
        });

        // Set speed
        animation.setSpeed(speed);

        // Store reference
        playerRef.current = {
          play: () => animation.play(),
          pause: () => animation.pause(),
          stop: () => animation.stop(),
          setSpeed: (s) => animation.setSpeed(s),
          setDirection: (d) => animation.setDirection(d),
          goToAndPlay: (v, isFrame) => animation.goToAndPlay(v, isFrame),
          goToAndStop: (v, isFrame) => animation.goToAndStop(v, isFrame),
          destroy: () => animation.destroy(),
        };

        // Handle events
        animation.addEventListener("DOMLoaded", () => {
          if (isMounted) {
            setIsLoading(false);
            onLoad?.();
          }
        });

        animation.addEventListener("error", () => {
          if (isMounted) {
            const err = new Error("Lottie animation error");
            setError(err);
            setIsLoading(false);
            onError?.(err);
          }
        });
      } catch (err) {
        if (isMounted) {
          const error =
            err instanceof Error ? err : new Error("Failed to load Lottie");
          setError(error);
          setIsLoading(false);
          onError?.(error);
        }
      }
    };

    loadLottie();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [src, autoplay, loop, speed, onLoad, onError]);

  if (error) {
    return (
      <div
        className={cn(
          "bg-muted/30 flex items-center justify-center rounded",
          className,
        )}
        style={{ width, height }}
      >
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div
        ref={containerRef}
        className={cn("h-full w-full", isLoading && "opacity-0")}
      />
    </div>
  );
});

// ============================================================================
// Image Animation Component (APNG, GIF, WebM)
// ============================================================================

interface ImageAnimationProps {
  src: string;
  format: StickerFormat;
  width: number | string;
  height: number | string;
  autoplay: boolean;
  loop: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onClick?: () => void;
  className?: string;
  alt?: string;
}

const ImageAnimation = memo(function ImageAnimation({
  src,
  format,
  width,
  height,
  autoplay,
  loop,
  onLoad,
  onError,
  onClick,
  className,
  alt,
}: ImageAnimationProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);

  const isVideo = format === "webm";

  // Handle video playback
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    if (isPlaying) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isVideo]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    const err = new Error(`Failed to load ${format} sticker`);
    setError(err);
    setIsLoading(false);
    onError?.(err);
  }, [format, onError]);

  const togglePlayback = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  if (error) {
    return (
      <div
        className={cn(
          "bg-muted/30 flex items-center justify-center rounded",
          className,
        )}
        style={{ width, height }}
      >
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (isVideo) {
    const handleVideoClick = onClick || togglePlayback;
    return (
      <div
        className={cn("relative", className)}
        style={{ width, height }}
        role="button"
        tabIndex={0}
        onClick={handleVideoClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleVideoClick?.();
          }
        }}
      >
        {isLoading && (
          <div className="bg-muted/30 absolute inset-0 flex items-center justify-center rounded">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <video
          ref={videoRef}
          src={src}
          width={typeof width === "number" ? width : undefined}
          height={typeof height === "number" ? height : undefined}
          autoPlay={autoplay}
          loop={loop}
          muted
          playsInline
          onLoadedData={handleLoad}
          onError={handleError}
          className={cn(
            "h-full w-full object-contain",
            isLoading && "opacity-0",
          )}
        />
      </div>
    );
  }

  // GIF or APNG (use img tag)
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  const imgElement = (
    <>
      {isLoading && (
        <div className="bg-muted/30 absolute inset-0 flex items-center justify-center rounded">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt || "Animated sticker"}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        onLoad={handleLoad}
        onError={handleError}
        className={cn("h-full w-full object-contain", isLoading && "opacity-0")}
        loading="lazy"
      />
    </>
  );

  if (onClick) {
    return (
      <div
        className={cn("relative", className)}
        style={{ width, height }}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        {imgElement}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      {imgElement}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const AnimatedSticker = memo(function AnimatedSticker({
  sticker,
  src,
  width = 128,
  height = 128,
  autoplay = true,
  loop = true,
  speed = 1,
  showControls = false,
  onLoad,
  onError,
  onClick,
  isVisible = true,
  className,
  alt,
}: AnimatedStickerProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isLoaded, setIsLoaded] = useState(false);

  const stickerUrl = src || sticker.url;
  const format = sticker.format;

  // Define callbacks before any conditional returns
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(
    (error: Error) => {
      onError?.(error);
    },
    [onError],
  );

  const togglePlayback = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  // Don't render if not visible (lazy loading)
  if (!isVisible) {
    return (
      <div
        className={cn("bg-muted/30 rounded", className)}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: typeof height === "number" ? `${height}px` : height,
        }}
      />
    );
  }

  // Render based on format
  const renderSticker = () => {
    if (format === "lottie") {
      return (
        <LottieAnimation
          src={stickerUrl}
          autoplay={isPlaying}
          loop={loop}
          speed={speed}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          className="h-full w-full"
        />
      );
    }

    // For GIF, APNG, WebM, WebP
    return (
      <ImageAnimation
        src={stickerUrl}
        format={format}
        width={width}
        height={height}
        autoplay={isPlaying}
        loop={loop}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        alt={alt || sticker.name}
        className="h-full w-full"
      />
    );
  };

  const containerStyle = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  const playPauseControls = showControls && isLoaded && (
    <button
      onClick={togglePlayback}
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        "bg-black/0 transition-colors hover:bg-black/20",
        "opacity-0 hover:opacity-100 focus:opacity-100",
        "rounded",
      )}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause className="h-8 w-8 text-white drop-shadow-lg" />
      ) : (
        <Play className="h-8 w-8 text-white drop-shadow-lg" />
      )}
    </button>
  );

  // Interactive clickable version
  if (!showControls && onClick) {
    return (
      <div
        className={cn(
          "relative inline-flex cursor-pointer items-center justify-center",
          className,
        )}
        style={containerStyle}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {renderSticker()}
        {playPauseControls}
      </div>
    );
  }

  // Non-interactive version
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={containerStyle}
    >
      {renderSticker()}
      {playPauseControls}
    </div>
  );
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a sticker format is animated
 */
export function isAnimatedFormat(format: StickerFormat): boolean {
  return ["lottie", "gif", "apng", "webm"].includes(format);
}

/**
 * Get the appropriate component for a sticker type
 */
export function getStickerComponent(
  sticker: Sticker,
): typeof AnimatedSticker | "img" {
  if (sticker.type === "animated" || sticker.type === "video") {
    return AnimatedSticker;
  }
  return "img";
}

export default AnimatedSticker;
