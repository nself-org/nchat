"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface SendMessageButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  userName?: string;
  onSendMessage: (userId: string) => Promise<void> | void;
  showText?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const SendMessageButton = React.forwardRef<
  HTMLButtonElement,
  SendMessageButtonProps
>(
  (
    {
      className,
      userId,
      userName,
      onSendMessage,
      showText = true,
      variant = "default",
      size = "default",
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleClick = async () => {
      setIsLoading(true);
      try {
        await onSendMessage(userId);
      } finally {
        setIsLoading(false);
      }
    };

    const buttonText = userName ? `Message ${userName}` : "Message";

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(className)}
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-label={buttonText}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", showText && "mr-2")} />
        ) : (
          <MessageSquare className={cn("h-4 w-4", showText && "mr-2")} />
        )}
        {showText && (isLoading ? "Opening..." : "Message")}
      </Button>
    );
  },
);
SendMessageButton.displayName = "SendMessageButton";

export { SendMessageButton };
