"use client";

import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BaseModal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  type ModalSize,
} from "./base-modal";

export type AlertIcon = "warning" | "error" | "success" | "info";

export interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string | React.ReactNode;
  icon?: AlertIcon;
  customIcon?: React.ReactNode;
  buttonText?: string;
  onClose?: () => void;
  size?: ModalSize;
  children?: React.ReactNode;
}

const ICON_CONFIG: Record<
  AlertIcon,
  {
    Icon: LucideIcon;
    bgColor: string;
    iconColor: string;
  }
> = {
  warning: {
    Icon: AlertTriangle,
    bgColor: "bg-yellow-500/10",
    iconColor: "text-yellow-600 dark:text-yellow-500",
  },
  error: {
    Icon: AlertCircle,
    bgColor: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  success: {
    Icon: CheckCircle2,
    bgColor: "bg-green-500/10",
    iconColor: "text-green-600 dark:text-green-500",
  },
  info: {
    Icon: Info,
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
};

export function AlertModal({
  open,
  onOpenChange,
  title,
  message,
  icon = "info",
  customIcon,
  buttonText = "OK",
  onClose,
  size = "sm",
  children,
}: AlertModalProps) {
  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  const config = ICON_CONFIG[icon];
  const IconComponent = config.Icon;

  return (
    <BaseModal
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleClose();
        } else {
          onOpenChange(newOpen);
        }
      }}
      size={size}
      showCloseButton={false}
    >
      <ModalHeader>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              config.bgColor,
              config.iconColor,
            )}
          >
            {customIcon || <IconComponent className="h-5 w-5" />}
          </div>
          <div className="flex-1 space-y-1.5 pt-0.5">
            <ModalTitle>{title}</ModalTitle>
            {typeof message === "string" ? (
              <ModalDescription>{message}</ModalDescription>
            ) : (
              <div className="text-sm text-muted-foreground">{message}</div>
            )}
          </div>
        </div>
      </ModalHeader>

      {children && <ModalBody className="pb-0 pt-4">{children}</ModalBody>}

      <ModalFooter className="pt-6">
        <Button onClick={handleClose} className="w-full sm:w-auto">
          {buttonText}
        </Button>
      </ModalFooter>
    </BaseModal>
  );
}

// Convenience components for specific alert types
export function WarningAlert({
  open,
  onOpenChange,
  title,
  message,
  buttonText = "OK",
  onClose,
}: Omit<AlertModalProps, "icon">) {
  return (
    <AlertModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      icon="warning"
      buttonText={buttonText}
      onClose={onClose}
    />
  );
}

export function ErrorAlert({
  open,
  onOpenChange,
  title,
  message,
  buttonText = "OK",
  onClose,
}: Omit<AlertModalProps, "icon">) {
  return (
    <AlertModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      icon="error"
      buttonText={buttonText}
      onClose={onClose}
    />
  );
}

export function SuccessAlert({
  open,
  onOpenChange,
  title,
  message,
  buttonText = "OK",
  onClose,
}: Omit<AlertModalProps, "icon">) {
  return (
    <AlertModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      icon="success"
      buttonText={buttonText}
      onClose={onClose}
    />
  );
}

export function InfoAlert({
  open,
  onOpenChange,
  title,
  message,
  buttonText = "OK",
  onClose,
}: Omit<AlertModalProps, "icon">) {
  return (
    <AlertModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={message}
      icon="info"
      buttonText={buttonText}
      onClose={onClose}
    />
  );
}
