import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center justify-center border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
                secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
                destructive:
                    "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
                outline:
                    "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
                ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
                link: "text-primary underline-offset-4 [a&]:hover:underline",
                // Track type variants
                midi: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
                audio: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
                sample: "bg-green-500/20 text-green-400 border border-green-500/30",
            },
            rounded: {
                full: "rounded-full",
                default: "rounded",
            },
        },
        defaultVariants: {
            variant: "default",
            rounded: "full",
        },
    }
);

function Badge({
    className,
    variant = "default",
    rounded = "full",
    asChild = false,
    ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot.Root : "span";

    return (
        <Comp
            data-slot="badge"
            data-variant={variant}
            data-rounded={rounded}
            className={cn(badgeVariants({ variant, rounded }), className)}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
