/**
 * MixerButton - Button component for mixer controls
 *
 * Professional mixer-style buttons for mute, solo, and other channel controls
 * Follows DAW design patterns with clear visual states
 */

import { cn } from "@/lib/utils";

interface MixerButtonProps {
    variant: "mute" | "solo" | "record" | "monitor";
    active: boolean;
    onClick: () => void;
    className?: string;
    disabled?: boolean;
}

export function MixerButton({ variant, active, onClick, className, disabled = false }: MixerButtonProps) {
    const baseStyles = "h-7 px-2 text-xs font-bold uppercase tracking-wide rounded transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantStyles = {
        mute: active
            ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50 hover:bg-orange-600"
            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border",
        solo: active
            ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/50 hover:bg-yellow-600"
            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border",
        record: active
            ? "bg-red-500 text-white shadow-lg shadow-red-500/50 hover:bg-red-600"
            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border",
        monitor: active
            ? "bg-green-500 text-white shadow-lg shadow-green-500/50 hover:bg-green-600"
            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border",
    };
    
    const labels = {
        mute: "M",
        solo: "S",
        record: "R",
        monitor: "Mon",
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(baseStyles, variantStyles[variant], className)}
        >
            {labels[variant]}
        </button>
    );
}

