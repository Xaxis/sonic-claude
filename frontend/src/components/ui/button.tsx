import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-30 touch-manipulation",
    {
        variants: {
            variant: {
                default:
                    "bg-transparent border-2 border-border text-foreground hover:border-primary hover:text-primary hover:shadow-[0_0_10px_rgba(0,245,255,0.5)]",
                primary:
                    "bg-primary text-background border-2 border-primary hover:shadow-[0_0_10px_rgba(0,245,255,0.5)]",
                destructive:
                    "border-2 border-destructive text-destructive hover:shadow-[0_0_10px_rgba(255,51,102,0.5)]",
                outline:
                    "border-2 border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                ghost: "hover:bg-accent hover:text-accent-foreground",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 px-3",
                lg: "h-12 px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
