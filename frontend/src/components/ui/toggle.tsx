import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToggleProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function Toggle({
    checked = false,
    onCheckedChange,
    disabled = false,
    className = "",
}: ToggleProps) {
    const handleClick = () => {
        if (!disabled && onCheckedChange) {
            onCheckedChange(!checked);
        }
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "bg-primary shadow-[0_0_10px_rgba(0,245,255,0.5)]" : "bg-border",
                className
            )}
        >
            <span
                className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-background transition-transform shadow-md",
                    checked ? "translate-x-6" : "translate-x-1"
                )}
            />
        </button>
    );
}

