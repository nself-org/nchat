"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Info, AlertCircle } from "lucide-react";
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

export type ConfirmVariant = "default" | "destructive" | "warning";

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  loading?: boolean;
  size?: ModalSize;
  children?: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    buttonVariant: "default" | "destructive" | "secondary" | "outline";
  }
> = {
  default: {
    icon: <Info className="h-5 w-5" />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    buttonVariant: "default",
  },
  destructive: {
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    buttonVariant: "destructive",
  },
  warning: {
    icon: <AlertCircle className="h-5 w-5" />,
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-600 dark:text-yellow-500",
    buttonVariant: "default",
  },
};

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon,
  onConfirm,
  onCancel,
  loading: externalLoading,
  size = "sm",
  children,
}: ConfirmModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = externalLoading ?? internalLoading;

  // Reset loading state when modal closes
  useEffect(() => {
    if (!open) {
      setInternalLoading(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (externalLoading === undefined) {
      setInternalLoading(true);
    }
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      logger.error("Confirmation action failed:", error);
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

  const config = VARIANT_CONFIG[variant];

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      size={size}
      showCloseButton={false}
    >
      <ModalHeader>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              config.iconBg,
              config.iconColor,
            )}
          >
            {icon || config.icon}
          </div>
          <div className="flex-1 space-y-1.5 pt-0.5">
            <ModalTitle>{title}</ModalTitle>
            {message && typeof message === "string" ? (
              <ModalDescription>{message}</ModalDescription>
            ) : (
              message && (
                <div className="text-sm text-muted-foreground">{message}</div>
              )
            )}
          </div>
        </div>
      </ModalHeader>

      {children && <ModalBody className="pb-0 pt-4">{children}</ModalBody>}

      <ModalFooter className="pt-6">
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={config.buttonVariant}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {confirmText}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}

// Pre-configured delete confirmation modal
export interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  itemName?: string;
  title?: string;
  message?: string;
  loading?: boolean;
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  itemName = "this item",
  title,
  message,
  loading,
}: DeleteConfirmModalProps) {
  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title={title || `Delete ${itemName}?`}
      message={
        message ||
        `Are you sure you want to delete ${itemName}? This action cannot be undone.`
      }
      confirmText="Delete"
      variant="destructive"
      loading={loading}
    />
  );
}

// Pre-configured unsaved changes modal
export interface UnsavedChangesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void> | void;
  onDiscard?: () => void;
  loading?: boolean;
}

export function UnsavedChangesModal({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  loading,
}: UnsavedChangesModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const actualLoading = loading ?? isLoading;

  const handleSave = async () => {
    if (loading === undefined) {
      setIsLoading(true);
    }
    try {
      await onSave();
      onOpenChange(false);
    } catch (error) {
      logger.error("Save failed:", error);
    } finally {
      if (loading === undefined) {
        setIsLoading(false);
      }
    }
  };

  const handleDiscard = () => {
    onDiscard?.();
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      showCloseButton={false}
    >
      <ModalHeader>
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 pt-0.5">
            <ModalTitle>Unsaved changes</ModalTitle>
            <ModalDescription>
              You have unsaved changes. Do you want to save them before leaving?
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalFooter className="flex-col pt-6 sm:flex-row">
        {onDiscard && (
          <Button
            variant="ghost"
            onClick={handleDiscard}
            disabled={actualLoading}
            className="text-muted-foreground sm:mr-auto"
          >
            Discard
          </Button>
        )}
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={actualLoading}
            className="flex-1 sm:flex-initial"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={actualLoading}
            className="flex-1 sm:flex-initial"
          >
            {actualLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </ModalFooter>
    </BaseModal>
  );
}
