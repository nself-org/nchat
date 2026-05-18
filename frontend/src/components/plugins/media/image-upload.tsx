/**
 * Image Upload Component
 * Upload interface with preview for Media Pipeline plugin
 */

"use client";

import { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMediaUpload } from "@/hooks/use-media-plugin";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUploadComplete?: (url: string, id: string) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export function ImageUpload({
  onUploadComplete,
  maxSizeMB = 10,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp", "image/gif"],
}: ImageUploadProps) {
  const { uploadImage, isUploading, uploadProgress, error } = useMediaUpload();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!acceptedFormats.includes(file.type)) {
        alert(
          `Invalid file type. Accepted formats: ${acceptedFormats.join(", ")}`,
        );
        return;
      }

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert(`File too large. Maximum size: ${maxSizeMB}MB`);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      const result = await uploadImage(file);
      if (result) {
        setUploadedUrl(result.url);
        onUploadComplete?.(result.url, result.id);
      }
    },
    [uploadImage, acceptedFormats, maxSizeMB, onUploadComplete],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleClear = () => {
    setPreview(null);
    setUploadedUrl(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed p-8 transition-colors",
            dragActive && "bg-primary/5 border-primary",
            !dragActive && "border-muted-foreground/25",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {!preview && !uploadedUrl ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="bg-primary/10 rounded-full p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Drag and drop an image, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Max {maxSizeMB}MB •{" "}
                  {acceptedFormats
                    .map((f) => f.split("/")[1].toUpperCase())
                    .join(", ")}
                </p>
              </div>
              <Button variant="secondary" asChild>
                <label>
                  <input
                    type="file"
                    className="hidden"
                    accept={acceptedFormats.join(",")}
                    onChange={handleChange}
                    disabled={isUploading}
                  />
                  Choose File
                </label>
              </Button>
            </div>
          ) : (
            <div className="relative">
              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="mx-auto max-h-96 rounded-lg"
                />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isUploading && (
            <div className="mt-4 space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-center text-xs text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 mt-4 rounded-md p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}

          {uploadedUrl && !isUploading && (
            <div className="bg-primary/10 mt-4 rounded-md p-3 text-sm text-primary">
              Upload complete! Image ready to use.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
