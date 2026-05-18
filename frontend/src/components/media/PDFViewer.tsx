"use client";

/**
 * PDFViewer - PDF document viewer with navigation and zoom
 *
 * Uses PDF.js from CDN to render PDF documents with full navigation,
 * zoom controls, and page thumbnails.
 */

import * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MediaItem } from "@/lib/media/media-types";
import { formatFileSize } from "@/lib/media/media-manager";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileText,
  Loader2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface PDFViewerProps {
  item: MediaItem;
  initialPage?: number;
  initialZoom?: number;
  showThumbnails?: boolean;
  showControls?: boolean;
  onDownload?: () => void;
  className?: string;
}

interface PDFPage {
  pageNumber: number;
  canvas: HTMLCanvasElement | null;
  thumbnail: string | null;
}

// ============================================================================
// PDF.js Type Definitions
// ============================================================================

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: {
        workerSrc: string;
      };
      getDocument: (url: string | Uint8Array) => {
        promise: Promise<PDFDocument>;
      };
    };
  }
}

interface PDFDocument {
  numPages: number;
  getPage: (num: number) => Promise<PDFPage_>;
  getMetadata: () => Promise<{ info: unknown; metadata: unknown }>;
}

interface PDFPage_ {
  getViewport: (params: { scale: number; rotation?: number }) => PDFViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }) => {
    promise: Promise<void>;
  };
}

interface PDFViewport {
  width: number;
  height: number;
  scale: number;
}

// ============================================================================
// Constants
// ============================================================================

const PDFJS_CDN_VERSION = "4.0.379";
const PDFJS_LIB_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_CDN_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_CDN_VERSION}/pdf.worker.min.js`;

const DEFAULT_SCALE = 1.5;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

// ============================================================================
// Component
// ============================================================================

export function PDFViewer({
  item,
  initialPage = 1,
  initialZoom = DEFAULT_SCALE,
  showThumbnails = false,
  showControls = true,
  onDownload,
  className,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(initialZoom);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  // Load PDF.js library
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already loaded
    if (window.pdfjsLib) {
      setPdfLoaded(true);
      return;
    }

    // Load PDF.js from CDN
    const script = document.createElement("script");
    script.src = PDFJS_LIB_URL;
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        setPdfLoaded(true);
      }
    };
    script.onerror = () => {
      setError("Failed to load PDF.js library");
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!pdfLoaded || !window.pdfjsLib) return;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = window.pdfjsLib!.getDocument(item.url);
        const pdfDoc = await loadingTask.promise;

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setIsLoading(false);
      } catch (err) {
        logger.error("Failed to load PDF:", err);
        setError("Failed to load PDF document");
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [item.url, pdfLoaded]);

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        setIsRendering(true);

        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d")!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        setIsRendering(false);
      } catch (err) {
        logger.error("Failed to render page:", err);
        setError("Failed to render page");
        setIsRendering(false);
      }
    };

    renderPage();
  }, [pdf, currentPage, scale]);

  // Navigation handlers
  const goToPage = useCallback(
    (pageNum: number) => {
      if (pageNum >= 1 && pageNum <= numPages) {
        setCurrentPage(pageNum);
      }
    },
    [numPages],
  );

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - SCALE_STEP, MIN_SCALE));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(DEFAULT_SCALE);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") previousPage();
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetZoom();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previousPage, nextPage, zoomIn, zoomOut, resetZoom]);

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className,
        )}
      >
        <div className="text-center">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Failed to Load PDF</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          {onDownload && (
            <Button onClick={onDownload} className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className,
        )}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/20 flex h-full w-full flex-col", className)}>
      {/* Header with controls */}
      {showControls && (
        <div className="flex items-center justify-between border-b bg-background px-4 py-3">
          {/* File info */}
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-red-500" />
            <div className="min-w-0">
              <h3 className="truncate font-medium">{item.fileName}</h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.fileSize)} • {numPages} pages
              </p>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={previousPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1 px-2 text-sm">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-12 rounded border bg-background px-2 py-1 text-center text-sm"
                />
                <span className="text-muted-foreground">/ {numPages}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={nextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-4 w-px bg-border" />

            {/* Zoom controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={scale <= MIN_SCALE}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <span className="min-w-[50px] text-center text-sm">
                {Math.round(scale * 100)}%
              </span>

              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={scale >= MAX_SCALE}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" onClick={resetZoom}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {onDownload && (
              <>
                <div className="h-4 w-px bg-border" />
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* PDF canvas */}
      <div className="relative flex-1 overflow-auto">
        <ScrollArea className="h-full w-full">
          <div
            ref={containerRef}
            className="flex min-h-full items-center justify-center p-8"
          >
            {isRendering && (
              <div className="bg-background/50 absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="shadow-2xl"
              style={{ display: "block" }}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default PDFViewer;
