"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { errorShake, successCheckmark } from "@/lib/animations";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  success?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, ...props }, ref) => {
    const [shouldShake, setShouldShake] = React.useState(false);

    React.useEffect(() => {
      if (error) {
        setShouldShake(true);
        const timer = setTimeout(() => setShouldShake(false), 400);
        return () => clearTimeout(timer);
      }
    }, [error]);

    // Extract conflicting event handlers that have different signatures in React vs Framer Motion
    const {
      onDrag,
      onDragEnd,
      onDragStart,
      onAnimationStart,
      "aria-invalid": ariaInvalid,
      ...safeProps
    } = props as InputProps & {
      onDrag?: unknown;
      onDragEnd?: unknown;
      onDragStart?: unknown;
      onAnimationStart?: unknown;
    };

    return (
      <div className="relative w-full">
        <motion.input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive pr-10 focus-visible:ring-destructive",
            success && "border-green-500 pr-10 focus-visible:ring-green-500",
            className,
          )}
          ref={ref}
          aria-invalid={!!error || ariaInvalid === true}
          variants={shouldShake ? errorShake : undefined}
          animate={shouldShake ? "animate" : "initial"}
          {...safeProps}
        />

        {/* Error icon */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive"
          >
            <AlertCircle className="h-4 w-4" />
          </motion.div>
        )}

        {/* Success icon */}
        {success && !error && (
          <motion.div
            variants={successCheckmark}
            initial="initial"
            animate="animate"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
          >
            <CheckCircle2 className="h-4 w-4" />
          </motion.div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
