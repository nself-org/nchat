/**
 * AvatarUploadStep — onboarding avatar upload / initials picker.
 *
 * Decoupled from app internals: all state via props.
 *
 * @module auth/avatar-upload-step
 */

import { useRef, useState, useCallback } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import type { OnboardingStepProps, AvatarUploadData } from './onboarding-types';

// ============================================================================
// Constants
// ============================================================================

const INITIALS_COLORS = [
  { bg: '#3b82f6', label: 'Blue' },
  { bg: '#8b5cf6', label: 'Purple' },
  { bg: '#10b981', label: 'Green' },
  { bg: '#ef4444', label: 'Red' },
  { bg: '#f59e0b', label: 'Amber' },
  { bg: '#06b6d4', label: 'Cyan' },
  { bg: '#ec4899', label: 'Pink' },
  { bg: '#6366f1', label: 'Indigo' },
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// ============================================================================
// Types
// ============================================================================

export interface AvatarUploadStepProps extends OnboardingStepProps {
  initialData?: Partial<AvatarUploadData>;
  userName?: string;
  onDataChange?: (data: AvatarUploadData) => void;
  /** Optional async upload handler — returns the uploaded image URL */
  onUpload?: (file: File) => Promise<string>;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

// ============================================================================
// AvatarUploadStep
// ============================================================================

/**
 * Avatar upload step — file upload with drag-and-drop or initials fallback.
 *
 * @example
 * ```tsx
 * <AvatarUploadStep
 *   onNext={handleNext}
 *   onPrev={handlePrev}
 *   isFirst={false}
 *   isLast={false}
 *   canSkip
 *   onSkip={handleSkip}
 *   userName="Alice Johnson"
 *   onDataChange={(data) => store.updateAvatar(data)}
 *   onUpload={async (file) => await uploadToStorage(file)}
 * />
 * ```
 */
export function AvatarUploadStep({
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  canSkip,
  initialData,
  userName = '',
  onDataChange,
  onUpload,
  className,
}: AvatarUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialData?.url ?? null);
  const [useInitials, setUseInitials] = useState(initialData?.useInitials ?? false);
  const [initialsColor, setInitialsColor] = useState(
    initialData?.initialsBackground ?? INITIALS_COLORS[0].bg
  );
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const initials = getInitials(userName);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG, GIF, and WebP images are allowed.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('Image must be smaller than 5 MB.');
        return;
      }

      // Local preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setUseInitials(false);

      // Optional remote upload
      if (onUpload) {
        try {
          setUploading(true);
          const url = await onUpload(file);
          onDataChange?.({ file, url, useInitials: false });
        } catch {
          setError('Upload failed. Please try again.');
        } finally {
          setUploading(false);
        }
      } else {
        onDataChange?.({ file, useInitials: false });
      }
    },
    [onUpload, onDataChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = () => {
    setPreview(null);
    setUseInitials(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onDataChange?.({ useInitials: true, initialsBackground: initialsColor });
  };

  const handleColorSelect = (bg: string) => {
    setInitialsColor(bg);
    onDataChange?.({ useInitials: true, initialsBackground: bg });
  };

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <h2 className="mb-1 text-2xl font-bold text-foreground">Profile Picture</h2>
      <p className="mb-6 text-muted-foreground">Upload a photo or use your initials.</p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Upload area */}
      {!preview && !useInitials && (
        <div
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload avatar image"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Camera className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-foreground">Click or drag to upload</p>
          <p className="mt-1 text-sm text-muted-foreground">JPEG, PNG, GIF, WebP · max 5 MB</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img
              src={preview}
              alt="Avatar preview"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow-sm transition-opacity hover:opacity-80"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading…</p>
          )}
        </div>
      )}

      {/* Initials fallback */}
      {useInitials && !preview && (
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow"
            style={{ backgroundColor: initialsColor }}
          >
            {initials || '?'}
          </div>
          <div>
            <p className="mb-2 text-center text-sm font-medium text-foreground">
              Pick a colour
            </p>
            <div className="flex gap-2">
              {INITIALS_COLORS.map(({ bg, label }) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => handleColorSelect(bg)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    initialsColor === bg && 'ring-2 ring-foreground ring-offset-2'
                  )}
                  style={{ backgroundColor: bg }}
                  aria-label={label}
                  aria-pressed={initialsColor === bg}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setUseInitials(false);
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Upload className="h-4 w-4" />
            Upload a photo instead
          </button>
        </div>
      )}

      {/* Toggle initials / upload */}
      {!preview && !useInitials && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setUseInitials(true);
              onDataChange?.({ useInitials: true, initialsBackground: initialsColor });
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Use my initials instead
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {canSkip && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!preview && !useInitials) {
                // Default to initials on continue without upload
                setUseInitials(true);
                onDataChange?.({ useInitials: true, initialsBackground: initialsColor });
              }
              onNext();
            }}
            disabled={uploading}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isLast ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarUploadStep;
