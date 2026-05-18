/**
 * Screen Annotator
 *
 * Provides drawing and annotation tools for screen sharing.
 * Supports pen, arrow, shapes, text, and collaborative annotations.
 */

// =============================================================================
// Types
// =============================================================================

export type AnnotationTool =
  | "pen"
  | "arrow"
  | "line"
  | "rectangle"
  | "circle"
  | "text"
  | "eraser";

export type AnnotationColor = string;

export interface Point {
  x: number;
  y: number;
}

export interface AnnotationBase {
  id: string;
  tool: AnnotationTool;
  color: AnnotationColor;
  strokeWidth: number;
  userId: string;
  userName: string;
  createdAt: number;
}

export interface PenAnnotation extends AnnotationBase {
  tool: "pen";
  points: Point[];
}

export interface ArrowAnnotation extends AnnotationBase {
  tool: "arrow";
  start: Point;
  end: Point;
}

export interface LineAnnotation extends AnnotationBase {
  tool: "line";
  start: Point;
  end: Point;
}

export interface RectangleAnnotation extends AnnotationBase {
  tool: "rectangle";
  start: Point;
  end: Point;
  filled: boolean;
}

export interface CircleAnnotation extends AnnotationBase {
  tool: "circle";
  center: Point;
  radius: number;
  filled: boolean;
}

export interface TextAnnotation extends AnnotationBase {
  tool: "text";
  position: Point;
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface EraserAnnotation extends AnnotationBase {
  tool: "eraser";
  points: Point[];
}

export type Annotation =
  | PenAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | RectangleAnnotation
  | CircleAnnotation
  | TextAnnotation
  | EraserAnnotation;

export interface AnnotatorOptions {
  canvas: HTMLCanvasElement;
  userId: string;
  userName: string;
  onAnnotationAdded?: (annotation: Annotation) => void;
  onAnnotationsCleared?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export interface DrawingState {
  tool: AnnotationTool;
  color: AnnotationColor;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  filled: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_COLORS = [
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFFFFF", // White
  "#000000", // Black
  "#FFA500", // Orange
  "#800080", // Purple
];

const DEFAULT_STROKE_WIDTHS = [2, 4, 6, 8, 12, 16];

const DEFAULT_FONT_SIZES = [12, 16, 20, 24, 32, 48];

// =============================================================================
// Screen Annotator
// =============================================================================

export class ScreenAnnotator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private annotations: Annotation[] = [];
  private undoStack: Annotation[] = [];
  private currentAnnotation: Annotation | null = null;
  private isDrawing = false;
  private userId: string;
  private userName: string;
  private callbacks: {
    onAnnotationAdded?: (annotation: Annotation) => void;
    onAnnotationsCleared?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
  };

  // Drawing state
  private state: DrawingState = {
    tool: "pen",
    color: DEFAULT_COLORS[0],
    strokeWidth: 4,
    fontSize: 20,
    fontFamily: "Arial, sans-serif",
    filled: false,
  };

  constructor(options: AnnotatorOptions) {
    const { canvas, userId, userName, ...callbacks } = options;

    this.canvas = canvas;
    this.userId = userId;
    this.userName = userName;
    this.callbacks = callbacks;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas 2D context");
    }
    this.ctx = ctx;

    this.setupCanvas();
    this.attachEventListeners();
  }

  /**
   * Setup canvas
   */
  private setupCanvas(): void {
    // Make canvas transparent
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set default styles
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);

    // Touch events
    this.canvas.addEventListener("touchstart", this.handleTouchStart);
    this.canvas.addEventListener("touchmove", this.handleTouchMove);
    this.canvas.addEventListener("touchend", this.handleTouchEnd);
  }

  /**
   * Detach event listeners
   */
  private detachEventListeners(): void {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);

    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
  }

  /**
   * Get point from mouse event
   */
  private getPointFromEvent(event: MouseEvent | Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Handle mouse down
   */
  private handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
    this.startDrawing(this.getPointFromEvent(event));
  };

  /**
   * Handle mouse move
   */
  private handleMouseMove = (event: MouseEvent): void => {
    event.preventDefault();
    if (this.isDrawing) {
      this.continueDrawing(this.getPointFromEvent(event));
    }
  };

  /**
   * Handle mouse up
   */
  private handleMouseUp = (event: MouseEvent): void => {
    event.preventDefault();
    this.endDrawing();
  };

  /**
   * Handle mouse leave
   */
  private handleMouseLeave = (): void => {
    if (this.isDrawing) {
      this.endDrawing();
    }
  };

  /**
   * Handle touch start
   */
  private handleTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.startDrawing(this.getPointFromEvent(event.touches[0]));
    }
  };

  /**
   * Handle touch move
   */
  private handleTouchMove = (event: TouchEvent): void => {
    event.preventDefault();
    if (event.touches.length === 1 && this.isDrawing) {
      this.continueDrawing(this.getPointFromEvent(event.touches[0]));
    }
  };

  /**
   * Handle touch end
   */
  private handleTouchEnd = (event: TouchEvent): void => {
    event.preventDefault();
    this.endDrawing();
  };

  /**
   * Start drawing
   */
  private startDrawing(point: Point): void {
    this.isDrawing = true;

    const base: Omit<AnnotationBase, "tool"> = {
      id: `annotation-${Date.now()}-${Math.random()}`,
      color: this.state.color,
      strokeWidth: this.state.strokeWidth,
      userId: this.userId,
      userName: this.userName,
      createdAt: Date.now(),
    };

    switch (this.state.tool) {
      case "pen":
        this.currentAnnotation = {
          ...base,
          tool: "pen",
          points: [point],
        };
        break;

      case "arrow":
      case "line":
        this.currentAnnotation = {
          ...base,
          tool: this.state.tool,
          start: point,
          end: point,
        };
        break;

      case "rectangle":
        this.currentAnnotation = {
          ...base,
          tool: "rectangle",
          start: point,
          end: point,
          filled: this.state.filled,
        };
        break;

      case "circle":
        this.currentAnnotation = {
          ...base,
          tool: "circle",
          center: point,
          radius: 0,
          filled: this.state.filled,
        };
        break;

      case "text":
        // Text tool requires user input
        this.handleTextInput(point);
        this.isDrawing = false;
        break;

      case "eraser":
        this.currentAnnotation = {
          ...base,
          tool: "eraser",
          points: [point],
        };
        this.handleEraser(point);
        break;
    }
  }

  /**
   * Continue drawing
   */
  private continueDrawing(point: Point): void {
    if (!this.currentAnnotation) return;

    switch (this.currentAnnotation.tool) {
      case "pen":
        this.currentAnnotation.points.push(point);
        break;

      case "arrow":
      case "line":
        this.currentAnnotation.end = point;
        break;

      case "rectangle":
        this.currentAnnotation.end = point;
        break;

      case "circle": {
        const dx = point.x - this.currentAnnotation.center.x;
        const dy = point.y - this.currentAnnotation.center.y;
        this.currentAnnotation.radius = Math.sqrt(dx * dx + dy * dy);
        break;
      }

      case "eraser":
        this.currentAnnotation.points.push(point);
        this.handleEraser(point);
        break;
    }

    this.redraw();
  }

  /**
   * End drawing
   */
  private endDrawing(): void {
    if (!this.isDrawing) return;

    this.isDrawing = false;

    if (this.currentAnnotation && this.currentAnnotation.tool !== "eraser") {
      this.annotations.push(this.currentAnnotation);
      this.undoStack = []; // Clear redo stack on new annotation
      this.callbacks.onAnnotationAdded?.(this.currentAnnotation);
    }

    this.currentAnnotation = null;
    this.redraw();
  }

  /**
   * Handle text input
   */
  private handleTextInput(position: Point): void {
    const text = prompt("Enter text:");
    if (!text) return;

    const annotation: TextAnnotation = {
      id: `annotation-${Date.now()}-${Math.random()}`,
      tool: "text",
      color: this.state.color,
      strokeWidth: this.state.strokeWidth,
      userId: this.userId,
      userName: this.userName,
      createdAt: Date.now(),
      position,
      text,
      fontSize: this.state.fontSize,
      fontFamily: this.state.fontFamily,
    };

    this.annotations.push(annotation);
    this.undoStack = [];
    this.callbacks.onAnnotationAdded?.(annotation);
    this.redraw();
  }

  /**
   * Handle eraser
   */
  private handleEraser(point: Point): void {
    const eraserRadius = this.state.strokeWidth * 2;

    // Find annotations to remove
    const toRemove: string[] = [];

    for (const annotation of this.annotations) {
      if (this.isPointNearAnnotation(point, annotation, eraserRadius)) {
        toRemove.push(annotation.id);
      }
    }

    // Remove annotations
    if (toRemove.length > 0) {
      this.annotations = this.annotations.filter(
        (a) => !toRemove.includes(a.id),
      );
      this.redraw();
    }
  }

  /**
   * Check if point is near annotation
   */
  private isPointNearAnnotation(
    point: Point,
    annotation: Annotation,
    radius: number,
  ): boolean {
    switch (annotation.tool) {
      case "pen":
        return annotation.points.some((p) => this.distance(point, p) < radius);

      case "arrow":
      case "line":
        return (
          this.distance(point, annotation.start) < radius ||
          this.distance(point, annotation.end) < radius
        );

      case "rectangle": {
        const { start, end } = annotation;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        return (
          point.x >= minX - radius &&
          point.x <= maxX + radius &&
          point.y >= minY - radius &&
          point.y <= maxY + radius
        );
      }

      case "circle":
        return (
          Math.abs(
            this.distance(point, annotation.center) - annotation.radius,
          ) < radius
        );

      case "text":
        return this.distance(point, annotation.position) < radius;

      default:
        return false;
    }
  }

  /**
   * Calculate distance between two points
   */
  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Redraw all annotations
   */
  private redraw(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw all saved annotations
    this.annotations.forEach((annotation) => this.drawAnnotation(annotation));

    // Draw current annotation if drawing
    if (this.currentAnnotation && this.isDrawing) {
      this.drawAnnotation(this.currentAnnotation);
    }
  }

  /**
   * Draw annotation
   */
  private drawAnnotation(annotation: Annotation): void {
    this.ctx.strokeStyle = annotation.color;
    this.ctx.fillStyle = annotation.color;
    this.ctx.lineWidth = annotation.strokeWidth;

    switch (annotation.tool) {
      case "pen":
        this.drawPen(annotation);
        break;

      case "arrow":
        this.drawArrow(annotation);
        break;

      case "line":
        this.drawLine(annotation);
        break;

      case "rectangle":
        this.drawRectangle(annotation);
        break;

      case "circle":
        this.drawCircle(annotation);
        break;

      case "text":
        this.drawText(annotation);
        break;
    }
  }

  /**
   * Draw pen stroke
   */
  private drawPen(annotation: PenAnnotation): void {
    if (annotation.points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(annotation.points[0].x, annotation.points[0].y);

    for (let i = 1; i < annotation.points.length; i++) {
      this.ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
    }

    this.ctx.stroke();
  }

  /**
   * Draw arrow
   */
  private drawArrow(annotation: ArrowAnnotation): void {
    const { start, end } = annotation;
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Draw arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6),
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6),
    );
    this.ctx.stroke();
  }

  /**
   * Draw line
   */
  private drawLine(annotation: LineAnnotation): void {
    this.ctx.beginPath();
    this.ctx.moveTo(annotation.start.x, annotation.start.y);
    this.ctx.lineTo(annotation.end.x, annotation.end.y);
    this.ctx.stroke();
  }

  /**
   * Draw rectangle
   */
  private drawRectangle(annotation: RectangleAnnotation): void {
    const { start, end, filled } = annotation;
    const width = end.x - start.x;
    const height = end.y - start.y;

    if (filled) {
      this.ctx.fillRect(start.x, start.y, width, height);
    } else {
      this.ctx.strokeRect(start.x, start.y, width, height);
    }
  }

  /**
   * Draw circle
   */
  private drawCircle(annotation: CircleAnnotation): void {
    const { center, radius, filled } = annotation;

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);

    if (filled) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  /**
   * Draw text
   */
  private drawText(annotation: TextAnnotation): void {
    this.ctx.font = `${annotation.fontSize}px ${annotation.fontFamily}`;
    this.ctx.fillText(
      annotation.text,
      annotation.position.x,
      annotation.position.y,
    );
  }

  /**
   * Set tool
   */
  setTool(tool: AnnotationTool): void {
    this.state.tool = tool;
  }

  /**
   * Set color
   */
  setColor(color: AnnotationColor): void {
    this.state.color = color;
  }

  /**
   * Set stroke width
   */
  setStrokeWidth(width: number): void {
    this.state.strokeWidth = width;
  }

  /**
   * Set font size
   */
  setFontSize(size: number): void {
    this.state.fontSize = size;
  }

  /**
   * Set filled mode
   */
  setFilled(filled: boolean): void {
    this.state.filled = filled;
  }

  /**
   * Get current state
   */
  getState(): DrawingState {
    return { ...this.state };
  }

  /**
   * Undo last annotation
   */
  undo(): void {
    if (this.annotations.length === 0) return;

    const annotation = this.annotations.pop()!;
    this.undoStack.push(annotation);
    if (this.callbacks.onUndo) {
      this.callbacks.onUndo();
    }
    this.redraw();
  }

  /**
   * Redo last undone annotation
   */
  redo(): void {
    if (this.undoStack.length === 0) return;

    const annotation = this.undoStack.pop()!;
    this.annotations.push(annotation);
    if (this.callbacks.onRedo) {
      this.callbacks.onRedo();
    }
    this.redraw();
  }

  /**
   * Clear all annotations
   */
  clear(): void {
    this.annotations = [];
    this.undoStack = [];
    if (this.callbacks.onAnnotationsCleared) {
      this.callbacks.onAnnotationsCleared();
    }
    this.redraw();
  }

  /**
   * Add remote annotation
   */
  addRemoteAnnotation(annotation: Annotation): void {
    this.annotations.push(annotation);
    this.redraw();
  }

  /**
   * Get all annotations
   */
  getAnnotations(): Annotation[] {
    return [...this.annotations];
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.detachEventListeners();
    this.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createScreenAnnotator(
  options: AnnotatorOptions,
): ScreenAnnotator {
  return new ScreenAnnotator(options);
}

// =============================================================================
// Exports
// =============================================================================

export { DEFAULT_COLORS, DEFAULT_STROKE_WIDTHS, DEFAULT_FONT_SIZES };
