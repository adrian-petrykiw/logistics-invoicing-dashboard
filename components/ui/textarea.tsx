// components/ui/textarea.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-neutral-200 bg-background px-3 py-2 text-sm",
          "placeholder:text-neutral-500",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-gray-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-neutral-800 dark:placeholder:text-neutral-400",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
