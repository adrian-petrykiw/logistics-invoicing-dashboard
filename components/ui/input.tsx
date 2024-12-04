// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/utils/styling";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-sm border border-neutral-200 bg-background px-3 py-1 text-sm",
          "transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-neutral-500",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-gray-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-neutral-800 dark:file:text-neutral-50 dark:placeholder:text-neutral-400",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
