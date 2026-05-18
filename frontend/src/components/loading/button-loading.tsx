"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { InlineSpinner } from "./spinner";
import { Check, X } from "lucide-react";

type LoadingState = "idle" | "loading" | "success" | "error";

interface ButtonLoadingProps extends ButtonProps {
  /** Current loading state */
  loadingState?: LoadingState;
  /** Text to show while loading */
  loadingText?: string;
  /** Text to show on success */
  successText?: string;
  /** Text to show on error */
  errorText?: string;
  /** Duration to show success/error state before returning to idle (ms) */
  stateDuration?: number;
  /** Show spinner only (no text change) */
  spinnerOnly?: boolean;
  /** Hide children while loading */
  hideChildrenWhenLoading?: boolean;
}

/**
 * Button with loading, success, and error states
 * Provides visual feedback during async operations
 */
export const ButtonLoading = forwardRef<HTMLButtonElement, ButtonLoadingProps>(
  (
    {
      loadingState = "idle",
      loadingText,
      successText = "Done",
      errorText = "Error",
      spinnerOnly = false,
      hideChildrenWhenLoading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isLoading = loadingState === "loading";
    const isSuccess = loadingState === "success";
    const isError = loadingState === "error";

    const getContent = () => {
      if (isLoading) {
        if (spinnerOnly) {
          return (
            <>
              <InlineSpinner className="mr-2" />
              {!hideChildrenWhenLoading && children}
            </>
          );
        }
        return (
          <>
            <InlineSpinner className="mr-2" />
            {loadingText ?? children}
          </>
        );
      }

      if (isSuccess) {
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            {successText}
          </>
        );
      }

      if (isError) {
        return (
          <>
            <X className="mr-2 h-4 w-4" />
            {errorText}
          </>
        );
      }

      return children;
    };

    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          isSuccess && "bg-green-600 hover:bg-green-600",
          isError && "bg-red-600 hover:bg-red-600",
          className,
        )}
        {...props}
      >
        {getContent()}
      </Button>
    );
  },
);
ButtonLoading.displayName = "ButtonLoading";

interface LoadingButtonProps extends ButtonProps {
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Text to show while loading */
  loadingText?: string;
}

/**
 * Simple loading button (just loading/idle states)
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading = false, loadingText, disabled, children, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={disabled || isLoading} {...props}>
        {isLoading ? (
          <>
            <InlineSpinner className="mr-2" />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
LoadingButton.displayName = "LoadingButton";

interface IconButtonLoadingProps extends Omit<ButtonProps, "children"> {
  /** Icon to display */
  icon: React.ReactNode;
  /** Whether the button is loading */
  isLoading?: boolean;
  /** Accessible label */
  "aria-label": string;
}

/**
 * Icon-only button with loading state
 */
export const IconButtonLoading = forwardRef<
  HTMLButtonElement,
  IconButtonLoadingProps
>(({ icon, isLoading = false, disabled, className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      disabled={disabled || isLoading}
      className={cn("relative", className)}
      {...props}
    >
      <span className={cn("transition-opacity", isLoading && "opacity-0")}>
        {icon}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <InlineSpinner />
        </span>
      )}
    </Button>
  );
});
IconButtonLoading.displayName = "IconButtonLoading";

interface SubmitButtonProps extends ButtonProps {
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Text while submitting */
  submittingText?: string;
}

/**
 * Form submit button with submitting state
 */
export const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  (
    {
      isSubmitting = false,
      submittingText = "Submitting...",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        type="submit"
        disabled={disabled || isSubmitting}
        {...props}
      >
        {isSubmitting ? (
          <>
            <InlineSpinner className="mr-2" />
            {submittingText}
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
SubmitButton.displayName = "SubmitButton";

interface AsyncActionButtonProps extends ButtonProps {
  /** Async action to perform on click */
  onAction: () => Promise<void>;
  /** Text while action is in progress */
  actionText?: string;
  /** Show success state after action completes */
  showSuccess?: boolean;
  /** Duration to show success state (ms) */
  successDuration?: number;
}

/**
 * Button that handles async actions with automatic loading state
 */
export const AsyncActionButton = forwardRef<
  HTMLButtonElement,
  AsyncActionButtonProps
>(
  (
    {
      onAction,
      actionText,
      showSuccess = true,
      successDuration = 1500,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const [state, setState] = React.useState<LoadingState>("idle");

    const handleClick = async () => {
      setState("loading");
      try {
        await onAction();
        if (showSuccess) {
          setState("success");
          setTimeout(() => setState("idle"), successDuration);
        } else {
          setState("idle");
        }
      } catch {
        setState("error");
        setTimeout(() => setState("idle"), successDuration);
      }
    };

    return (
      <ButtonLoading
        ref={ref}
        loadingState={state}
        loadingText={actionText}
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        {children}
      </ButtonLoading>
    );
  },
);
AsyncActionButton.displayName = "AsyncActionButton";

// Import React for useState
import * as React from "react";
