/**
 * Lazy Loading Library for Images
 * Uses IntersectionObserver for progressive and lazy image loading
 */

// ============================================================================
// Types
// ============================================================================

export interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number | number[];
  placeholder?: string;
  errorImage?: string;
  fadeInDuration?: number;
  onLoad?: (element: HTMLImageElement) => void;
  onError?: (element: HTMLImageElement) => void;
}

export interface ProgressiveImageOptions extends LazyLoadOptions {
  lowQualityPlaceholder?: string; // LQIP (Low Quality Image Placeholder)
  blurAmount?: number;
  transitionDuration?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ROOT_MARGIN = "50px";
const DEFAULT_THRESHOLD = 0.01;
const DEFAULT_FADE_DURATION = 300;
const DEFAULT_BLUR_AMOUNT = 10;
const DEFAULT_TRANSITION_DURATION = 300;

// ============================================================================
// Lazy Loading Manager
// ============================================================================

class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images: Set<HTMLImageElement> = new Set();
  private options: LazyLoadOptions;

  constructor(options: LazyLoadOptions = {}) {
    this.options = {
      rootMargin: options.rootMargin || DEFAULT_ROOT_MARGIN,
      threshold: options.threshold || DEFAULT_THRESHOLD,
      fadeInDuration: options.fadeInDuration || DEFAULT_FADE_DURATION,
      ...options,
    };

    this.init();
  }

  /**
   * Initialize IntersectionObserver
   */
  private init(): void {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
          }
        });
      },
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold,
      },
    );
  }

  /**
   * Observe an image element
   */
  observe(img: HTMLImageElement): void {
    if (!this.observer) {
      // Fallback: load immediately if IntersectionObserver not supported
      this.loadImage(img);
      return;
    }

    this.images.add(img);
    this.observer.observe(img);
  }

  /**
   * Stop observing an image element
   */
  unobserve(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img);
    }
    this.images.delete(img);
  }

  /**
   * Load an image
   */
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src) return;

    // Set loading state
    img.classList.add("lazy-loading");

    const tempImg = new Image();

    tempImg.onload = () => {
      img.src = src;
      if (srcset) {
        img.srcset = srcset;
      }

      img.classList.remove("lazy-loading");
      img.classList.add("lazy-loaded");

      // Apply fade-in effect
      if (this.options.fadeInDuration && this.options.fadeInDuration > 0) {
        img.style.opacity = "0";
        img.style.transition = `opacity ${this.options.fadeInDuration}ms ease-in`;

        setTimeout(() => {
          img.style.opacity = "1";
        }, 10);
      }

      this.options.onLoad?.(img);
      this.unobserve(img);
    };

    tempImg.onerror = () => {
      img.classList.remove("lazy-loading");
      img.classList.add("lazy-error");

      if (this.options.errorImage) {
        img.src = this.options.errorImage;
      }

      this.options.onError?.(img);
      this.unobserve(img);
    };

    tempImg.src = src;
  }

  /**
   * Disconnect observer and clean up
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.images.clear();
  }
}

// ============================================================================
// Progressive Image Loading (LQIP - Low Quality Image Placeholder)
// ============================================================================

class ProgressiveImageLoader {
  private observer: IntersectionObserver | null = null;
  private images: Set<HTMLImageElement> = new Set();
  private options: ProgressiveImageOptions;

  constructor(options: ProgressiveImageOptions = {}) {
    this.options = {
      rootMargin: options.rootMargin || DEFAULT_ROOT_MARGIN,
      threshold: options.threshold || DEFAULT_THRESHOLD,
      blurAmount: options.blurAmount || DEFAULT_BLUR_AMOUNT,
      transitionDuration:
        options.transitionDuration || DEFAULT_TRANSITION_DURATION,
      ...options,
    };

    this.init();
  }

  /**
   * Initialize IntersectionObserver
   */
  private init(): void {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadHighResImage(img);
          }
        });
      },
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold,
      },
    );
  }

  /**
   * Observe an image element
   */
  observe(img: HTMLImageElement): void {
    if (!this.observer) {
      this.loadHighResImage(img);
      return;
    }

    // Load low-quality placeholder immediately
    const lqip = img.dataset.lqip || this.options.lowQualityPlaceholder;
    if (lqip && !img.src) {
      img.src = lqip;
      img.style.filter = `blur(${this.options.blurAmount}px)`;
      img.style.transform = "scale(1.1)"; // Slightly scale up to hide blur edges
    }

    this.images.add(img);
    this.observer.observe(img);
  }

  /**
   * Stop observing an image element
   */
  unobserve(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.unobserve(img);
    }
    this.images.delete(img);
  }

  /**
   * Load high-resolution image
   */
  private loadHighResImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;

    if (!src) return;

    const tempImg = new Image();

    tempImg.onload = () => {
      // Create transition
      img.style.transition = `filter ${this.options.transitionDuration}ms ease-out, transform ${this.options.transitionDuration}ms ease-out`;

      // Update source
      img.src = src;
      if (srcset) {
        img.srcset = srcset;
      }

      // Remove blur
      img.style.filter = "blur(0px)";
      img.style.transform = "scale(1)";

      img.classList.add("progressive-loaded");

      this.options.onLoad?.(img);
      this.unobserve(img);
    };

    tempImg.onerror = () => {
      img.classList.add("progressive-error");

      if (this.options.errorImage) {
        img.src = this.options.errorImage;
        img.style.filter = "blur(0px)";
        img.style.transform = "scale(1)";
      }

      this.options.onError?.(img);
      this.unobserve(img);
    };

    tempImg.src = src;
  }

  /**
   * Disconnect observer and clean up
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.images.clear();
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate LQIP (Low Quality Image Placeholder) as data URL
 */
export async function generateLQIP(
  imageFile: File | Blob,
  width: number = 20,
  quality: number = 0.1,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      const aspectRatio = img.width / img.height;
      const height = Math.round(width / aspectRatio);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Preload images in the background
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Resolve even on error
        img.src = url;
      });
    }),
  );
}

/**
 * Check if IntersectionObserver is supported
 */
export function isIntersectionObserverSupported(): boolean {
  return typeof window !== "undefined" && "IntersectionObserver" in window;
}

/**
 * Create a blur hash placeholder (simplified version)
 */
export function createBlurPlaceholder(
  width: number,
  height: number,
  color: string = "#e5e7eb",
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL("image/png");
}

// ============================================================================
// Exports
// ============================================================================

// Create singleton instances
let lazyLoader: LazyImageLoader | null = null;
let progressiveLoader: ProgressiveImageLoader | null = null;

/**
 * Get or create lazy loader instance
 */
export function getLazyLoader(options?: LazyLoadOptions): LazyImageLoader {
  if (!lazyLoader) {
    lazyLoader = new LazyImageLoader(options);
  }
  return lazyLoader;
}

/**
 * Get or create progressive loader instance
 */
export function getProgressiveLoader(
  options?: ProgressiveImageOptions,
): ProgressiveImageLoader {
  if (!progressiveLoader) {
    progressiveLoader = new ProgressiveImageLoader(options);
  }
  return progressiveLoader;
}

/**
 * Clean up loaders
 */
export function cleanup(): void {
  if (lazyLoader) {
    lazyLoader.disconnect();
    lazyLoader = null;
  }
  if (progressiveLoader) {
    progressiveLoader.disconnect();
    progressiveLoader = null;
  }
}

// Export classes for custom usage
export { LazyImageLoader, ProgressiveImageLoader };
