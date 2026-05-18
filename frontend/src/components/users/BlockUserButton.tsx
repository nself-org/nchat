"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Ban, Loader2, Check } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface BlockUserButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  userName: string;
  isBlocked?: boolean;
  onBlock: (userId: string) => Promise<void> | void;
  onUnblock?: (userId: string) => Promise<void> | void;
  showText?: boolean;
  requireConfirmation?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const BlockUserButton = React.forwardRef<
  HTMLButtonElement,
  BlockUserButtonProps
>(
  (
    {
      className,
      userId,
      userName,
      isBlocked = false,
      onBlock,
      onUnblock,
      showText = true,
      requireConfirmation = true,
      variant = "ghost",
      size = "default",
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const handleAction = async () => {
      setIsLoading(true);
      try {
        if (isBlocked && onUnblock) {
          await onUnblock(userId);
        } else {
          await onBlock(userId);
        }
      } finally {
        setIsLoading(false);
        setDialogOpen(false);
      }
    };

    const handleClick = async () => {
      if (requireConfirmation) {
        setDialogOpen(true);
      } else {
        await handleAction();
      }
    };

    const buttonContent = (
      <>
        {isLoading ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", showText && "mr-2")} />
        ) : isBlocked ? (
          <Check className={cn("h-4 w-4", showText && "mr-2")} />
        ) : (
          <Ban className={cn("h-4 w-4", showText && "mr-2")} />
        )}
        {showText &&
          (isLoading
            ? isBlocked
              ? "Unblocking..."
              : "Blocking..."
            : isBlocked
              ? "Unblock"
              : "Block")}
      </>
    );

    if (!requireConfirmation) {
      return (
        <Button
          ref={ref}
          variant={isBlocked ? "outline" : variant}
          size={size}
          className={cn(
            !isBlocked &&
              "hover:bg-destructive/10 text-destructive hover:text-destructive",
            className,
          )}
          onClick={handleClick}
          disabled={disabled || isLoading}
          {...props}
        >
          {buttonContent}
        </Button>
      );
    }

    return (
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            ref={ref}
            variant={isBlocked ? "outline" : variant}
            size={size}
            className={cn(
              !isBlocked &&
                "hover:bg-destructive/10 text-destructive hover:text-destructive",
              className,
            )}
            disabled={disabled || isLoading}
            {...props}
          >
            {buttonContent}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? "Unblock" : "Block"} {userName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked ? (
                <>
                  <strong>{userName}</strong> will be able to send you messages
                  and see your online status again. You can block them again at
                  any time.
                </>
              ) : (
                <>
                  <strong>{userName}</strong> won't be able to send you direct
                  messages or see your online status. They won't be notified
                  that you blocked them. You can unblock them at any time.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isLoading}
              className={cn(
                !isBlocked && "hover:bg-destructive/90 bg-destructive",
              )}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isBlocked ? "Unblock" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
);
BlockUserButton.displayName = "BlockUserButton";

export { BlockUserButton };
