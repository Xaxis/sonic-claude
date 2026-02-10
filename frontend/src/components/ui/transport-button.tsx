/**
 * TransportButton Component
 *
 * Specialized button for transport controls (play, pause, stop, record).
 * Supports active state and different visual styles.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TransportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Whether button is in active state */
    active?: boolean;
    /** Button variant */
    variant?: "default" | "play" | "stop" | "record";
    /** Icon to display */
    icon?: React.ReactNode;
}

export const TransportButton = React.forwardRef<HTMLButtonElement, TransportButtonProps>(
    ({ active = false, variant = "default", icon, className, children, ...props }, ref) => {
        const variantStyles = {
            default: active
                ? "bg-cyan-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600",
            play: active
                ? "bg-green-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-green-600/50",
            stop: "bg-gray-700 text-gray-300 hover:bg-red-600/50",
            record: active
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-700 text-gray-300 hover:bg-red-600/50",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "flex items-center justify-center gap-2 rounded px-4 py-2 font-semibold transition-all",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    variantStyles[variant],
                    className
                )}
                {...props}
            >
                {icon}
                {children}
            </button>
        );
    }
);

TransportButton.displayName = "TransportButton";
