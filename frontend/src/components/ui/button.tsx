import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-xs font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(0,245,255,0.3)] hover:shadow-[0_0_15px_rgba(0,245,255,0.5)]",
                destructive:
                    "bg-destructive text-white hover:bg-destructive/90 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:shadow-[0_0_15px_rgba(239,68,68,0.5)]",
                outline:
                    "border border-border bg-background hover:bg-muted hover:border-primary/50",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_0_10px_rgba(192,132,252,0.3)] hover:shadow-[0_0_15px_rgba(192,132,252,0.5)]",
                ghost: "hover:bg-muted hover:text-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-8 px-3 py-1.5 has-[>svg]:px-2.5",
                xs: "h-6 gap-1 rounded px-2 py-1 has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-7 rounded gap-1.5 px-2.5 has-[>svg]:px-2",
                lg: "h-9 rounded px-4 has-[>svg]:px-3.5",
                icon: "size-8",
                "icon-xs": "size-6 rounded [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-7",
                "icon-lg": "size-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

function Button({
    className,
    variant = "default",
    size = "default",
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot.Root : "button";

    return (
        <Comp
            data-slot="button"
            data-variant={variant}
            data-size={size}
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
