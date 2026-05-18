"use client";

import { useState, useCallback } from "react";
import { Upload, X, Loader2, Check, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useStickerPacksManagement } from "@/hooks/use-sticker-packs";

interface StickerUploadProps {
  packId: string;
  onComplete?: () => void;
  className?: string;
}

interface StickerFile {
  file: File;
  preview: string;
  name: string;
  slug: string;
  keywords: string[];
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

/**
 * Sticker Upload Component
 * Upload multiple stickers to a pack
 */
export function StickerUpload({
  packId,
  onComplete,
  className,
}: StickerUploadProps) {
  const { toast } = useToast();
  const { addSticker, isLoading } = useStickerPacksManagement();
  const [stickers, setStickers] = useState<StickerFile[]>([]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newStickers: StickerFile[] = acceptedFiles.map((file) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const slug = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      return {
        file,
        preview: URL.createObjectURL(file),
        name: nameWithoutExt,
        slug,
        keywords: [],
        status: "pending" as const,
      };
    });

    setStickers((prev) => [...prev, ...newStickers]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/gif": [".gif"],
      "image/webp": [".webp"],
      "image/svg+xml": [".svg"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  // Update sticker property
  const updateSticker = (index: number, updates: Partial<StickerFile>) => {
    setStickers((prev) =>
      prev.map((sticker, i) =>
        i === index ? { ...sticker, ...updates } : sticker,
      ),
    );
  };

  // Remove sticker
  const removeSticker = (index: number) => {
    const sticker = stickers[index];
    if (sticker.preview) {
      URL.revokeObjectURL(sticker.preview);
    }
    setStickers((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload single sticker
  const uploadSticker = async (index: number) => {
    const sticker = stickers[index];
    updateSticker(index, { status: "uploading" });

    try {
      // In a real implementation, upload the file to storage first
      // For now, we'll use the preview URL (base64 data URL)
      const reader = new FileReader();
      const fileUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(sticker.file);
      });

      await addSticker({
        pack_id: packId,
        name: sticker.name,
        slug: sticker.slug,
        file_url: fileUrl,
        keywords: sticker.keywords,
      });

      updateSticker(index, { status: "success" });
    } catch (error) {
      updateSticker(index, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  };

  // Upload all pending stickers
  const uploadAll = async () => {
    const pendingIndices = stickers
      .map((sticker, index) => (sticker.status === "pending" ? index : -1))
      .filter((index) => index !== -1);

    for (const index of pendingIndices) {
      await uploadSticker(index);
    }

    const successCount = stickers.filter((s) => s.status === "success").length;
    const errorCount = stickers.filter((s) => s.status === "error").length;

    toast({
      title: "Upload Complete",
      description: `${successCount} stickers uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
    });

    if (errorCount === 0) {
      onComplete?.();
    }
  };

  const hasPending = stickers.some((s) => s.status === "pending");
  const hasStickers = stickers.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragActive
            ? "bg-primary/5 border-primary"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {isDragActive ? "Drop stickers here" : "Upload stickers"}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to select
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, GIF, WebP, or SVG • Max 5MB each
          </p>
        </div>
      </div>

      {/* Sticker list */}
      {hasStickers && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {stickers.length} sticker{stickers.length !== 1 ? "s" : ""}
            </p>
            {hasPending && (
              <Button onClick={uploadAll} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload All"
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {stickers.map((sticker, index) => (
              <div
                key={index}
                className="bg-muted/30 flex items-start gap-3 rounded-lg border p-3"
              >
                {/* Preview */}
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded border bg-background">
                  <img
                    src={sticker.preview}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Form */}
                <div className="flex-1 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`name-${index}`} className="text-xs">
                        Name
                      </Label>
                      <Input
                        id={`name-${index}`}
                        value={sticker.name}
                        onChange={(e) =>
                          updateSticker(index, { name: e.target.value })
                        }
                        disabled={sticker.status !== "pending"}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`slug-${index}`} className="text-xs">
                        Slug
                      </Label>
                      <Input
                        id={`slug-${index}`}
                        value={sticker.slug}
                        onChange={(e) =>
                          updateSticker(index, { slug: e.target.value })
                        }
                        disabled={sticker.status !== "pending"}
                        pattern="[a-z0-9-]+"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`keywords-${index}`} className="text-xs">
                      Keywords (comma-separated)
                    </Label>
                    <Input
                      id={`keywords-${index}`}
                      value={sticker.keywords.join(", ")}
                      onChange={(e) =>
                        updateSticker(index, {
                          keywords: e.target.value
                            .split(",")
                            .map((k) => k.trim())
                            .filter(Boolean),
                        })
                      }
                      disabled={sticker.status !== "pending"}
                      placeholder="happy, smile, emoji"
                    />
                  </div>

                  {sticker.error && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {sticker.error}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="flex flex-col items-end gap-2">
                  {sticker.status === "pending" && (
                    <Button
                      variant="ghost"
                      onClick={() => removeSticker(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {sticker.status === "uploading" && (
                    <Badge variant="secondary">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Uploading
                    </Badge>
                  )}
                  {sticker.status === "success" && (
                    <Badge variant="default">
                      <Check className="mr-1 h-3 w-3" />
                      Uploaded
                    </Badge>
                  )}
                  {sticker.status === "error" && (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Error
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
