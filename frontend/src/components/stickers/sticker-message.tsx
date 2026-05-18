"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Play, Pause, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { StickerService } from "@/lib/stickers/sticker-service";
import type { Sticker, StickerPack } from "@/graphql/stickers";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface StickerMessageProps {
  sticker: Sticker;
  onClick?: (sticker: Sticker) => void;
  onPackClick?: (packId: string) => void;
  size?: "sm" | "md" | "lg";
  showPackInfo?: boolean;
  packInfo?: Pick<StickerPack, "id" | "name" | "thumbnail_url">;
  className?: string;
}

export interface StickerMessageBubbleProps extends StickerMessageProps {
  isOwn?: boolean;
  timestamp?: string | Date;
  senderName?: string;
  showSender?: boolean;
}

// ============================================================================
// SIZE CONFIG
// ============================================================================

const sizeConfig = {
  sm: {
    container: "max-w-[120px]",
    image: 112,
    packIcon: "h-3 w-3",
    packText: "text-[10px]",
  },
  md: {
    container: "max-w-[180px]",
    image: 168,
    packIcon: "h-4 w-4",
    packText: "text-xs",
  },
  lg: {
    container: "max-w-[240px]",
    image: 224,
    packIcon: "h-4 w-4",
    packText: "text-xs",
  },
};

// ============================================================================
// LOTTIE PLAYER (for animated stickers in messages)
// ============================================================================

interface MessageLottiePlayerProps {
  src: string;
  size: number;
  autoplay?: boolean;
  loop?: boolean;
  className?: string;
}

function MessageLottiePlayer({
  src,
  size,
  autoplay = true,
  loop = true,
  className,
}: MessageLottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<unknown>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    import("lottie-web")
      .then((lottie) => {
        if (!containerRef.current || !isMounted) return;

        // Clear any existing animation
        if (animationRef.current) {
          (animationRef.current as { destroy: () => void }).destroy();
        }

        try {
          animationRef.current = lottie.default.loadAnimation({
            container: containerRef.current,
            renderer: "svg",
            loop,
            autoplay: isPlaying,
            path: src,
          });

          const anim = animationRef.current as {
            addEventListener: (event: string, cb: () => void) => void;
          };

          anim.addEventListener("DOMLoaded", () => {
            if (isMounted) {
              setLoaded(true);
            }
          });
        } catch (err) {
          logger.error("Failed to load Lottie animation:", err);
          if (isMounted) {
            setError(true);
          }
        }
      })
      .catch((err) => {
        logger.error("Failed to import lottie-web:", err);
        if (isMounted) {
          setError(true);
        }
      });

    return () => {
      isMounted = false;
      if (animationRef.current) {
        (animationRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [src, loop, isPlaying]);

  const togglePlay = useCallback(() => {
    if (!animationRef.current) return;

    const anim = animationRef.current as {
      play: () => void;
      pause: () => void;
    };

    if (isPlaying) {
      anim.pause();
    } else {
      anim.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-muted",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-muted-foreground">Error loading</span>
      </div>
    );
  }

  return (
    <div
      className={cn("group relative", className)}
      style={{ width: size, height: size }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && (
        <div className="bg-muted/50 absolute inset-0 flex animate-pulse items-center justify-center rounded-lg">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {loaded && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={isPlaying ? "Pause animation" : "Play animation"}
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// STICKER MESSAGE COMPONENT
// ============================================================================

export function StickerMessage({
  sticker,
  onClick,
  onPackClick,
  size = "md",
  showPackInfo = false,
  packInfo,
  className,
}: StickerMessageProps) {
  const [imageError, setImageError] = useState(false);
  const config = sizeConfig[size];

  const isAnimated = StickerService.isAnimatedSticker(sticker);
  const stickerType = StickerService.getStickerType(sticker);

  const handleClick = useCallback(() => {
    onClick?.(sticker);
  }, [onClick, sticker]);

  const handlePackClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPackClick?.(sticker.pack_id);
    },
    [onPackClick, sticker.pack_id],
  );

  return (
    <div
      className={cn(
        "inline-block",
        config.container,
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {/* Sticker Image/Animation */}
      <div className="relative">
        {isAnimated && stickerType === "lottie" ? (
          <MessageLottiePlayer
            src={sticker.url}
            size={config.image}
            className="rounded-lg"
          />
        ) : imageError ? (
          <div
            className="flex items-center justify-center rounded-lg bg-muted"
            style={{ width: config.image, height: config.image }}
          >
            <span className="text-xs text-muted-foreground">
              Failed to load
            </span>
          </div>
        ) : (
          <Image
            src={sticker.url}
            alt={sticker.name || "Sticker"}
            width={config.image}
            height={config.image}
            className="object-contain"
            onError={() => setImageError(true)}
            unoptimized={stickerType === "gif"}
            priority
          />
        )}
      </div>

      {/* Pack Info */}
      {showPackInfo && packInfo && (
        <button
          type="button"
          onClick={handlePackClick}
          className={cn(
            "mt-1 flex items-center gap-1 rounded-md px-2 py-1",
            "text-muted-foreground hover:bg-accent hover:text-foreground",
            "transition-colors",
            config.packText,
          )}
        >
          {packInfo.thumbnail_url ? (
            <Image
              src={packInfo.thumbnail_url}
              alt={packInfo.name}
              width={16}
              height={16}
              className="rounded object-cover"
            />
          ) : (
            <Package className={config.packIcon} />
          )}
          <span className="truncate">{packInfo.name}</span>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// STICKER MESSAGE BUBBLE (styled like a chat bubble)
// ============================================================================

export function StickerMessageBubble({
  sticker,
  onClick,
  onPackClick,
  size = "md",
  showPackInfo = false,
  packInfo,
  isOwn = false,
  timestamp,
  senderName,
  showSender = true,
  className,
}: StickerMessageBubbleProps) {
  const formattedTime = timestamp
    ? typeof timestamp === "string"
      ? new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={cn("flex flex-col gap-1", isOwn && "items-end", className)}>
      {/* Sender Name */}
      {showSender && senderName && !isOwn && (
        <span className="text-foreground/80 ml-1 text-xs font-medium">
          {senderName}
        </span>
      )}

      {/* Sticker */}
      <div
        className={cn(
          "relative rounded-2xl p-2",
          isOwn ? "bg-primary/5" : "bg-muted/50",
        )}
      >
        <StickerMessage
          sticker={sticker}
          onClick={onClick}
          onPackClick={onPackClick}
          size={size}
          showPackInfo={showPackInfo}
          packInfo={packInfo}
        />
      </div>

      {/* Timestamp */}
      {formattedTime && (
        <span
          className={cn(
            "text-[10px] text-muted-foreground",
            isOwn ? "mr-1" : "ml-1",
          )}
        >
          {formattedTime}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// STICKER MESSAGE PREVIEW (for message input preview)
// ============================================================================

export interface StickerMessagePreviewProps {
  sticker: Sticker;
  onRemove?: () => void;
  className?: string;
}

export function StickerMessagePreview({
  sticker,
  onRemove,
  className,
}: StickerMessagePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const stickerType = StickerService.getStickerType(sticker);

  return (
    <div
      className={cn(
        "bg-muted/50 relative inline-flex items-center gap-2 rounded-lg border p-2",
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-12 w-12 overflow-hidden rounded bg-muted">
        {imageError ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[10px] text-muted-foreground">Error</span>
          </div>
        ) : (
          <Image
            src={sticker.thumbnail_url || sticker.url}
            alt={sticker.name || "Sticker"}
            fill
            className="object-contain"
            onError={() => setImageError(true)}
            unoptimized={stickerType === "gif"}
          />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {sticker.name || "Sticker"}
        </p>
        <p className="text-xs text-muted-foreground">
          {sticker.width}x{sticker.height}
        </p>
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "rounded-full p-1 text-muted-foreground hover:text-foreground",
            "transition-colors hover:bg-background",
          )}
          aria-label="Remove sticker"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// STICKER MESSAGE SKELETON
// ============================================================================

export function StickerMessageSkeleton({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const config = sizeConfig[size];

  return (
    <div className={cn("inline-block", config.container, className)}>
      <div
        className="animate-pulse rounded-lg bg-muted"
        style={{ width: config.image, height: config.image }}
      />
    </div>
  );
}

export default StickerMessage;
