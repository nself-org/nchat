/**
 * Cursor Highlighter
 *
 * Highlights and tracks cursor position during screen sharing.
 * Supports cursor animations, click effects, and multi-user cursors.
 */

// =============================================================================
// Types
// =============================================================================

export interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface CursorClick {
  x: number;
  y: number;
  userId: string;
  timestamp: number;
}

export interface CursorHighlighterOptions {
  canvas: HTMLCanvasElement;
  highlightColor?: string;
  highlightSize?: number;
  showClickEffect?: boolean;
  clickEffectDuration?: number;
  showUserName?: boolean;
  fadeOldCursors?: boolean;
  fadeTimeout?: number;
}

export interface CursorStyle {
  color: string;
  size: number;
  showRing: boolean;
  showLabel: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_HIGHLIGHT_COLOR = "#FF4500"; // Orange-red
const DEFAULT_HIGHLIGHT_SIZE = 30;
const DEFAULT_CLICK_DURATION = 500; // ms
const DEFAULT_FADE_TIMEOUT = 3000; // ms

const USER_COLORS = [
  "#FF4500", // Orange-red
  "#1E90FF", // Dodger blue
  "#32CD32", // Lime green
  "#FF1493", // Deep pink
  "#FFD700", // Gold
  "#9370DB", // Medium purple
  "#00CED1", // Dark turquoise
  "#FF6347", // Tomato
];

// =============================================================================
// Cursor Highlighter
// =============================================================================

export class CursorHighlighter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<CursorHighlighterOptions>;
  private cursors: Map<string, CursorPosition> = new Map();
  private clicks: CursorClick[] = [];
  private userColors: Map<string, string> = new Map();
  private colorIndex = 0;
  private animationFrameId: number | null = null;
  private lastRenderTime = 0;

  constructor(options: CursorHighlighterOptions) {
    this.canvas = options.canvas;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas 2D context");
    }
    this.ctx = ctx;

    this.options = {
      highlightColor: options.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR,
      highlightSize: options.highlightSize ?? DEFAULT_HIGHLIGHT_SIZE,
      showClickEffect: options.showClickEffect ?? true,
      clickEffectDuration:
        options.clickEffectDuration ?? DEFAULT_CLICK_DURATION,
      showUserName: options.showUserName ?? true,
      fadeOldCursors: options.fadeOldCursors ?? true,
      fadeTimeout: options.fadeTimeout ?? DEFAULT_FADE_TIMEOUT,
      canvas: this.canvas,
    };

    this.startRendering();
  }

  /**
   * Update cursor position
   */
  updateCursor(position: CursorPosition): void {
    // Assign color if new user
    if (!this.userColors.has(position.userId)) {
      this.userColors.set(
        position.userId,
        USER_COLORS[this.colorIndex % USER_COLORS.length],
      );
      this.colorIndex++;
    }

    this.cursors.set(position.userId, position);
  }

  /**
   * Add click effect
   */
  addClick(click: CursorClick): void {
    if (this.options.showClickEffect) {
      this.clicks.push(click);

      // Remove click after duration
      setTimeout(() => {
        const index = this.clicks.findIndex(
          (c) => c.userId === click.userId && c.timestamp === click.timestamp,
        );
        if (index !== -1) {
          this.clicks.splice(index, 1);
        }
      }, this.options.clickEffectDuration);
    }
  }

  /**
   * Remove cursor
   */
  removeCursor(userId: string): void {
    this.cursors.delete(userId);
    this.userColors.delete(userId);
  }

  /**
   * Clear all cursors
   */
  clearAllCursors(): void {
    this.cursors.clear();
    this.clicks = [];
    this.userColors.clear();
    this.colorIndex = 0;
  }

  /**
   * Start rendering loop
   */
  private startRendering(): void {
    const render = (timestamp: number) => {
      const deltaTime = timestamp - this.lastRenderTime;
      this.lastRenderTime = timestamp;

      this.render(timestamp, deltaTime);

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  /**
   * Stop rendering loop
   */
  private stopRendering(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render cursors and effects
   */
  private render(timestamp: number, deltaTime: number): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const now = Date.now();

    // Remove old cursors if fade enabled
    if (this.options.fadeOldCursors) {
      for (const [userId, cursor] of this.cursors.entries()) {
        if (now - cursor.timestamp > this.options.fadeTimeout) {
          this.cursors.delete(userId);
        }
      }
    }

    // Render cursors
    for (const cursor of this.cursors.values()) {
      this.renderCursor(cursor, now);
    }

    // Render click effects
    for (const click of this.clicks) {
      this.renderClickEffect(click, now);
    }
  }

  /**
   * Render cursor
   */
  private renderCursor(cursor: CursorPosition, now: number): void {
    const color =
      this.userColors.get(cursor.userId) ?? this.options.highlightColor;
    const { x, y } = cursor;

    // Calculate opacity based on age
    let opacity = 1;
    if (this.options.fadeOldCursors) {
      const age = now - cursor.timestamp;
      const fadeStart = this.options.fadeTimeout * 0.7;
      if (age > fadeStart) {
        opacity =
          1 - (age - fadeStart) / (this.options.fadeTimeout - fadeStart);
      }
    }

    // Draw cursor highlight ring
    this.ctx.save();
    this.ctx.globalAlpha = opacity * 0.3;

    // Outer ring
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.options.highlightSize, 0, 2 * Math.PI);
    this.ctx.stroke();

    // Inner ring (pulsing)
    const pulseScale = 1 + Math.sin(now / 300) * 0.2;
    this.ctx.beginPath();
    this.ctx.arc(
      x,
      y,
      this.options.highlightSize * 0.5 * pulseScale,
      0,
      2 * Math.PI,
    );
    this.ctx.stroke();

    // Center dot
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
    this.ctx.fill();

    // User name label
    if (this.options.showUserName) {
      this.ctx.globalAlpha = opacity;
      this.ctx.fillStyle = color;
      this.ctx.font = "12px Arial, sans-serif";
      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "top";

      // Background
      const text = cursor.userName;
      const metrics = this.ctx.measureText(text);
      const padding = 4;
      const labelX = x + this.options.highlightSize + 5;
      const labelY = y - 6;

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(
        labelX - padding,
        labelY - padding,
        metrics.width + padding * 2,
        16 + padding * 2,
      );

      // Text
      this.ctx.fillStyle = color;
      this.ctx.fillText(text, labelX, labelY);
    }

    this.ctx.restore();
  }

  /**
   * Render click effect
   */
  private renderClickEffect(click: CursorClick, now: number): void {
    const age = now - click.timestamp;
    const progress = age / this.options.clickEffectDuration;
    const opacity = 1 - progress;
    const radius = 10 + progress * 20;

    const color =
      this.userColors.get(click.userId) ?? this.options.highlightColor;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;

    // Outer ring
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(click.x, click.y, radius, 0, 2 * Math.PI);
    this.ctx.stroke();

    // Inner circle
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = opacity * 0.3;
    this.ctx.beginPath();
    this.ctx.arc(click.x, click.y, radius * 0.5, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Set highlight color
   */
  setHighlightColor(color: string): void {
    this.options.highlightColor = color;
  }

  /**
   * Set highlight size
   */
  setHighlightSize(size: number): void {
    this.options.highlightSize = size;
  }

  /**
   * Toggle user name display
   */
  setShowUserName(show: boolean): void {
    this.options.showUserName = show;
  }

  /**
   * Toggle click effects
   */
  setShowClickEffect(show: boolean): void {
    this.options.showClickEffect = show;
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Get cursor count
   */
  getCursorCount(): number {
    return this.cursors.size;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopRendering();
    this.clearAllCursors();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createCursorHighlighter(
  options: CursorHighlighterOptions,
): CursorHighlighter {
  return new CursorHighlighter(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Normalize cursor position to canvas coordinates
 */
export function normalizeCursorPosition(
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): { x: number; y: number } {
  return {
    x: (x / sourceWidth) * targetWidth,
    y: (y / sourceHeight) * targetHeight,
  };
}

/**
 * Detect cursor movement from mouse events
 */
export function createCursorTracker(
  element: HTMLElement,
  userId: string,
  userName: string,
  onCursorMove: (position: CursorPosition) => void,
  onCursorClick?: (click: CursorClick) => void,
): () => void {
  const handleMouseMove = (event: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onCursorMove({
      x,
      y,
      userId,
      userName,
      timestamp: Date.now(),
    });
  };

  const handleMouseClick = (event: MouseEvent) => {
    if (!onCursorClick) return;

    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    onCursorClick({
      x,
      y,
      userId,
      timestamp: Date.now(),
    });
  };

  element.addEventListener("mousemove", handleMouseMove);
  element.addEventListener("click", handleMouseClick);

  return () => {
    element.removeEventListener("mousemove", handleMouseMove);
    element.removeEventListener("click", handleMouseClick);
  };
}
