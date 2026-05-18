"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2, Check } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface AddToContactsButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  userName?: string;
  isContact?: boolean;
  onAdd: (userId: string) => Promise<void> | void;
  onRemove?: (userId: string) => Promise<void> | void;
  showText?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const AddToContactsButton = React.forwardRef<
  HTMLButtonElement,
  AddToContactsButtonProps
>(
  (
    {
      className,
      userId,
      userName,
      isContact = false,
      onAdd,
      onRemove,
      showText = true,
      variant = "outline",
      size = "default",
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [justAdded, setJustAdded] = React.useState(false);

    const handleClick = async () => {
      setIsLoading(true);
      try {
        if (isContact && onRemove) {
          await onRemove(userId);
        } else {
          await onAdd(userId);
          setJustAdded(true);
          // Reset the "just added" state after a delay
          setTimeout(() => setJustAdded(false), 2000);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const getIcon = () => {
      if (isLoading) {
        return (
          <Loader2 className={cn("h-4 w-4 animate-spin", showText && "mr-2")} />
        );
      }
      if (justAdded) {
        return (
          <Check className={cn("h-4 w-4 text-green-500", showText && "mr-2")} />
        );
      }
      if (isContact) {
        return <UserMinus className={cn("h-4 w-4", showText && "mr-2")} />;
      }
      return <UserPlus className={cn("h-4 w-4", showText && "mr-2")} />;
    };

    const getText = () => {
      if (isLoading) {
        return isContact ? "Removing..." : "Adding...";
      }
      if (justAdded) {
        return "Added!";
      }
      if (isContact) {
        return "Remove Contact";
      }
      return "Add to Contacts";
    };

    const ariaLabel = isContact
      ? `Remove ${userName || "user"} from contacts`
      : `Add ${userName || "user"} to contacts`;

    return (
      <Button
        ref={ref}
        variant={isContact ? "ghost" : variant}
        size={size}
        className={cn(
          justAdded && "border-green-500 text-green-500",
          className,
        )}
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-label={ariaLabel}
        {...props}
      >
        {getIcon()}
        {showText && getText()}
      </Button>
    );
  },
);
AddToContactsButton.displayName = "AddToContactsButton";

export { AddToContactsButton };
