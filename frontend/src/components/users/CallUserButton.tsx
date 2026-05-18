"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Phone, Video, Loader2, ChevronDown } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type CallType = "audio" | "video";

export interface CallUserButtonProps extends Omit<ButtonProps, "onClick"> {
  userId: string;
  userName?: string;
  onCall: (userId: string, callType: CallType) => Promise<void> | void;
  showText?: boolean;
  defaultCallType?: CallType;
  showCallTypeSelector?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const CallUserButton = React.forwardRef<HTMLButtonElement, CallUserButtonProps>(
  (
    {
      className,
      userId,
      userName,
      onCall,
      showText = false,
      defaultCallType = "audio",
      showCallTypeSelector = true,
      variant = "outline",
      size = "default",
      disabled,
      ...props
    },
    ref,
  ) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [callType, setCallType] = React.useState<CallType>(defaultCallType);

    const handleCall = async (type: CallType = callType) => {
      setIsLoading(true);
      try {
        await onCall(userId, type);
      } finally {
        setIsLoading(false);
      }
    };

    const Icon = callType === "video" ? Video : Phone;
    const buttonText = `${callType === "video" ? "Video" : "Audio"} call${userName ? ` ${userName}` : ""}`;

    // Simple button without dropdown
    if (!showCallTypeSelector) {
      return (
        <Button
          ref={ref}
          variant={variant}
          size={size}
          className={cn(className)}
          onClick={() => handleCall()}
          disabled={disabled || isLoading}
          aria-label={buttonText}
          {...props}
        >
          {isLoading ? (
            <Loader2
              className={cn("h-4 w-4 animate-spin", showText && "mr-2")}
            />
          ) : (
            <Icon className={cn("h-4 w-4", showText && "mr-2")} />
          )}
          {showText && (isLoading ? "Calling..." : "Call")}
        </Button>
      );
    }

    // Button with dropdown for call type selection
    return (
      <div className={cn("flex", className)}>
        <Button
          ref={ref}
          variant={variant}
          size={size}
          className="rounded-r-none"
          onClick={() => handleCall()}
          disabled={disabled || isLoading}
          aria-label={buttonText}
          {...props}
        >
          {isLoading ? (
            <Loader2
              className={cn("h-4 w-4 animate-spin", showText && "mr-2")}
            />
          ) : (
            <Icon className={cn("h-4 w-4", showText && "mr-2")} />
          )}
          {showText && (isLoading ? "Calling..." : "Call")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className="rounded-l-none border-l-0 px-2"
              disabled={disabled || isLoading}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setCallType("audio");
                handleCall("audio");
              }}
            >
              <Phone className="mr-2 h-4 w-4" />
              Audio Call
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setCallType("video");
                handleCall("video");
              }}
            >
              <Video className="mr-2 h-4 w-4" />
              Video Call
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
);
CallUserButton.displayName = "CallUserButton";

export { CallUserButton };
