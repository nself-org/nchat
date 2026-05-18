"use client";

/**
 * ImageLazy Component
 * Lazy-loaded image with progressive loading and blur placeholder
 */

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getLazyLoader, getProgressiveLoader } from "@/lib/media/lazy-loading";

// ============================================================================
// Types
// ============================================================================

export interface ImageLazyProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  lowQualitySrc?: string; // LQIP for progressive loading
  progressive?: boolean;
  fadeInDuration?: number;
  blurAmount?: number;
  errorPlaceholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ImageLazy({
  src,
  lowQualitySrc,
  progressive = false,
  fadeInDuration = 300,
  blurAmount = 10,
  errorPlaceholder,
  onLoad,
  onError,
  className,
  alt = "",
  ...props
}: ImageLazyProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  /**
   * Set up lazy loading observer
   */
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Set data attributes
    img.dataset.src = src;
    if (lowQualitySrc) {
      img.dataset.lqip = lowQualitySrc;
    }

    // Observe with appropriate loader
    if (progressive && lowQualitySrc) {
      const loader = getProgressiveLoader({
        fadeInDuration,
        blurAmount,
        lowQualityPlaceholder: lowQualitySrc,
        onLoad: () => {
          setIsLoaded(true);
          onLoad?.();
        },
        onError: () => {
          setHasError(true);
          onError?.();
        },
      });
      loader.observe(img);

      return () => {
        loader.unobserve(img);
      };
    } else {
      const loader = getLazyLoader({
        fadeInDuration,
        placeholder: lowQualitySrc,
        errorImage: errorPlaceholder,
        onLoad: () => {
          setIsLoaded(true);
          onLoad?.();
        },
        onError: () => {
          setHasError(true);
          onError?.();
        },
      });
      loader.observe(img);

      return () => {
        loader.unobserve(img);
      };
    }
  }, [src, lowQualitySrc, progressive, fadeInDuration, blurAmount]);

  return (
    <img
      ref={imgRef}
      alt={alt}
      className={cn(
        "transition-opacity duration-300",
        !isLoaded && "opacity-0",
        isLoaded && "opacity-100",
        progressive && lowQualitySrc && !isLoaded && "scale-110 blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export default ImageLazy;
