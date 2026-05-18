"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  BaseModal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  type ModalSize,
} from "./base-modal";

export type InputType = "text" | "email" | "password" | "number" | "textarea";

export interface PromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: InputType;
  validation?: (value: string) => string | null;
  submitText?: string;
  cancelText?: string;
  onSubmit: (value: string) => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  size?: ModalSize;
  label?: string;
  helperText?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoFocus?: boolean;
}

export function PromptModal({
  open,
  onOpenChange,
  title,
  message,
  placeholder,
  defaultValue = "",
  inputType = "text",
  validation,
  submitText = "Submit",
  cancelText = "Cancel",
  onSubmit,
  onCancel,
  loading: externalLoading,
  size = "sm",
  label,
  helperText,
  required = false,
  minLength,
  maxLength,
  autoFocus = true,
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const loading = externalLoading ?? internalLoading;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
      setInternalLoading(false);
      // Focus input after a short delay for animation
      if (autoFocus) {
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 50);
      }
    }
  }, [open, defaultValue, autoFocus]);

  const validate = (val: string): string | null => {
    if (required && !val.trim()) {
      return "This field is required";
    }
    if (minLength !== undefined && val.length < minLength) {
      return `Must be at least ${minLength} characters`;
    }
    if (maxLength !== undefined && val.length > maxLength) {
      return `Must be no more than ${maxLength} characters`;
    }
    if (inputType === "email" && val) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return "Please enter a valid email address";
      }
    }
    if (validation) {
      return validation(val);
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate(value);
    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    if (externalLoading === undefined) {
      setInternalLoading(true);
    }

    try {
      await onSubmit(value);
      onOpenChange(false);
    } catch (err) {
      logger.error("Submit failed:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (externalLoading === undefined) {
        setInternalLoading(false);
      }
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputType !== "textarea") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const newValue = e.target.value;
    setValue(newValue);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const inputId = "prompt-input";

  return (
    <BaseModal
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleCancel();
        } else {
          onOpenChange(newOpen);
        }
      }}
      size={size}
      showCloseButton={false}
    >
      <ModalHeader>
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary">
            <Type className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1.5 pt-0.5">
            <ModalTitle>{title}</ModalTitle>
            {message && <ModalDescription>{message}</ModalDescription>}
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="pb-0 pt-4">
        <div className="space-y-2">
          {label && (
            <Label htmlFor={inputId} className="text-sm font-medium">
              {label}
              {required && <span className="ml-1 text-destructive">*</span>}
            </Label>
          )}

          {inputType === "textarea" ? (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              id={inputId}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={loading}
              className={cn(
                "min-h-[100px] resize-none",
                error && "border-destructive focus-visible:ring-destructive",
              )}
              maxLength={maxLength}
            />
          ) : (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              id={inputId}
              type={inputType}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={loading}
              className={cn(
                error && "border-destructive focus-visible:ring-destructive",
              )}
              maxLength={maxLength}
            />
          )}

          {/* Error or helper text */}
          <div className="min-h-[20px]">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : helperText ? (
              <p className="text-sm text-muted-foreground">{helperText}</p>
            ) : maxLength ? (
              <p className="text-right text-sm text-muted-foreground">
                {value.length}/{maxLength}
              </p>
            ) : null}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitText}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}

// Convenience component for rename operations
export interface RenameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  itemType?: string;
  onRename: (newName: string) => Promise<void> | void;
  loading?: boolean;
}

export function RenameModal({
  open,
  onOpenChange,
  currentName,
  itemType = "item",
  onRename,
  loading,
}: RenameModalProps) {
  return (
    <PromptModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Rename ${itemType}`}
      message={`Enter a new name for this ${itemType}`}
      placeholder="New name"
      defaultValue={currentName}
      onSubmit={onRename}
      submitText="Rename"
      loading={loading}
      required
      minLength={1}
      maxLength={100}
    />
  );
}

// Convenience component for creating new items
export interface CreateNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType?: string;
  placeholder?: string;
  onCreate: (name: string) => Promise<void> | void;
  loading?: boolean;
}

export function CreateNameModal({
  open,
  onOpenChange,
  itemType = "item",
  placeholder,
  onCreate,
  loading,
}: CreateNameModalProps) {
  return (
    <PromptModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Create ${itemType}`}
      message={`Enter a name for the new ${itemType}`}
      placeholder={placeholder ?? `${itemType} name`}
      onSubmit={onCreate}
      submitText="Create"
      loading={loading}
      required
      minLength={1}
      maxLength={100}
    />
  );
}
