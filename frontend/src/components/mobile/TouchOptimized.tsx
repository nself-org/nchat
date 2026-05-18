"use client";

import {
  forwardRef,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  memo,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ============================================================================
// Constants
// ============================================================================

// iOS Human Interface Guidelines: 44pt minimum
export const IOS_MIN_TAP_TARGET = 44;

// Android Material Design: 48dp minimum
export const ANDROID_MIN_TAP_TARGET = 48;

// Use the larger of the two for maximum compatibility
export const MIN_TAP_TARGET = ANDROID_MIN_TAP_TARGET;

// ============================================================================
// Touch-Optimized Button
// ============================================================================

const touchButtonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none touch-manipulation select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-12 px-4 py-2", // 48px height
        sm: "h-11 px-3", // 44px height (iOS minimum)
        lg: "h-14 px-6", // 56px height (extra large)
        icon: "h-12 w-12", // Square 48px
        "icon-sm": "h-11 w-11", // Square 44px
        "icon-lg": "h-14 w-14", // Square 56px
      },
      rounded: {
        default: "rounded-md",
        full: "rounded-full",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  },
);

export interface TouchButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof touchButtonVariants> {
  hapticFeedback?: boolean;
}

/**
 * Touch-optimized button component
 * Meets iOS (44pt) and Android (48dp) minimum tap target requirements
 *
 * @example
 * ```tsx
 * <TouchButton variant="default" size="default">
 *   Tap Me
 * </TouchButton>
 *
 * <TouchButton variant="ghost" size="icon" rounded="full">
 *   <Icon />
 * </TouchButton>
 * ```
 */
export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  function TouchButton(
    {
      className,
      variant,
      size,
      rounded,
      hapticFeedback = false,
      onClick,
      ...props
    },
    ref,
  ) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback if enabled
      if (hapticFeedback && "vibrate" in navigator) {
        navigator.vibrate(10);
      }

      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        className={cn(
          touchButtonVariants({ variant, size, rounded }),
          className,
        )}
        onClick={handleClick}
        style={{
          WebkitTapHighlightColor: "transparent",
        }}
        {...props}
      />
    );
  },
);

// ============================================================================
// Touch-Optimized Link
// ============================================================================

export interface TouchLinkProps
  extends
    AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof touchButtonVariants> {
  hapticFeedback?: boolean;
  children?: React.ReactNode;
}

/**
 * Touch-optimized link component
 * Meets minimum tap target requirements
 */
export const TouchLink = forwardRef<HTMLAnchorElement, TouchLinkProps>(
  function TouchLink(
    {
      className,
      variant = "link",
      size = "default",
      rounded,
      hapticFeedback = false,
      onClick,
      children,
      ...props
    },
    ref,
  ) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (hapticFeedback && "vibrate" in navigator) {
        navigator.vibrate(10);
      }

      onClick?.(e);
    };

    return (
      <a
        ref={ref}
        className={cn(
          touchButtonVariants({ variant, size, rounded }),
          className,
        )}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleClick(e as unknown as React.MouseEvent<HTMLAnchorElement>);
          }
        }}
        role="button"
        tabIndex={0}
        style={{
          WebkitTapHighlightColor: "transparent",
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
);

// ============================================================================
// Touch-Optimized Icon Button
// ============================================================================

export interface TouchIconButtonProps extends TouchButtonProps {
  icon: React.ReactNode;
  label: string; // Required for accessibility
  showLabel?: boolean;
}

/**
 * Touch-optimized icon button
 * Always meets 44pt/48dp minimum with proper aria-label
 *
 * @example
 * ```tsx
 * <TouchIconButton icon={<Heart />} label="Like" />
 * <TouchIconButton icon={<Share />} label="Share" showLabel />
 * ```
 */
export const TouchIconButton = memo(
  forwardRef<HTMLButtonElement, TouchIconButtonProps>(function TouchIconButton(
    { icon, label, showLabel = false, size = "icon", className, ...props },
    ref,
  ) {
    return (
      <TouchButton
        ref={ref}
        size={size}
        rounded="full"
        className={cn(showLabel && "gap-2", className)}
        aria-label={label}
        {...props}
      >
        {icon}
        {showLabel && <span className="text-sm">{label}</span>}
      </TouchButton>
    );
  }),
);

// ============================================================================
// Touch-Optimized List Item
// ============================================================================

export interface TouchListItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  className?: string;
  hapticFeedback?: boolean;
}

/**
 * Touch-optimized list item
 * Minimum 48dp height with proper touch feedback
 */
export const TouchListItem = memo(function TouchListItem({
  children,
  onClick,
  href,
  disabled = false,
  className,
  hapticFeedback = true,
}: TouchListItemProps) {
  const handleClick = () => {
    if (disabled) return;

    if (hapticFeedback && "vibrate" in navigator) {
      navigator.vibrate(10);
    }

    onClick?.();
  };

  const baseClassName = cn(
    "flex min-h-[48px] items-center gap-3 px-4 py-2",
    "touch-manipulation select-none",
    "transition-colors",
    !disabled && "hover:bg-accent active:bg-accent/80",
    disabled && "opacity-50 cursor-not-allowed",
    className,
  );

  const style = {
    WebkitTapHighlightColor: "transparent",
  };

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={baseClassName}
        style={style}
        onClick={handleClick}
        aria-label={typeof children === "string" ? children : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <div
      className={cn(baseClassName, onClick && !disabled && "cursor-pointer")}
      style={style}
      onClick={handleClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && !disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {children}
    </div>
  );
});

// ============================================================================
// Touch-Optimized Checkbox
// ============================================================================

export interface TouchCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Touch-optimized checkbox with large tap target
 */
export const TouchCheckbox = memo(function TouchCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: TouchCheckboxProps) {
  return (
    <label
      className={cn(
        "flex min-h-[48px] touch-manipulation select-none items-center gap-3",
        !disabled && "cursor-pointer",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-6 w-6 rounded border-2 border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
        style={{ WebkitTapHighlightColor: "transparent" }}
      />
      <span className="flex-1 text-sm">{label}</span>
    </label>
  );
});

// ============================================================================
// Touch-Optimized Radio
// ============================================================================

export interface TouchRadioProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  name: string;
  value: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Touch-optimized radio button with large tap target
 */
export const TouchRadio = memo(function TouchRadio({
  checked,
  onChange,
  label,
  name,
  value,
  disabled = false,
  className,
}: TouchRadioProps) {
  return (
    <label
      className={cn(
        "flex min-h-[48px] touch-manipulation select-none items-center gap-3",
        !disabled && "cursor-pointer",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-6 w-6 border-2 border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
        style={{ WebkitTapHighlightColor: "transparent" }}
      />
      <span className="flex-1 text-sm">{label}</span>
    </label>
  );
});

// ============================================================================
// Touch Area Wrapper
// ============================================================================

export interface TouchAreaProps {
  children: React.ReactNode;
  minHeight?: number;
  minWidth?: number;
  className?: string;
}

/**
 * Wrapper to ensure minimum touch target size
 * Useful for wrapping small elements to make them touch-friendly
 *
 * @example
 * ```tsx
 * <TouchArea>
 *   <SmallIcon />
 * </TouchArea>
 * ```
 */
export const TouchArea = memo(function TouchArea({
  children,
  minHeight = MIN_TAP_TARGET,
  minWidth = MIN_TAP_TARGET,
  className,
}: TouchAreaProps) {
  return (
    <div
      className={cn(
        "inline-flex touch-manipulation items-center justify-center",
        className,
      )}
      style={{
        minHeight,
        minWidth,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </div>
  );
});

export default TouchButton;
