import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-background border-border h-8 w-full min-w-0 rounded border px-2 py-1 text-xs transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:border-primary focus-visible:ring-primary/50 focus-visible:ring-2",
                "hover:border-primary/50",
                className
            )}
            {...props}
        />
    );
}

export { Input };
