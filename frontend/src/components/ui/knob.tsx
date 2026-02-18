/**
 * Knob Component
 *
 * Rotary knob control for pan, send amounts, and other parameters.
 * Professional DAW-style knob with arc visualization.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface KnobProps {
    /** Current value (-1 to 1 for pan, 0 to 1 for others) */
    value: number;
    /** Callback when value changes */
    onChange: (value: number) => void;
    /** Label displayed below knob */
    label?: string;
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Whether knob is disabled */
    disabled?: boolean;
    /** Display format (e.g., "pan" shows L/R, "percent" shows %) */
    format?: "default" | "pan" | "percent";
    /** Additional CSS classes */
    className?: string;
}

export function Knob({
    value,
    onChange,
    label,
    min = -1,
    max = 1,
    disabled = false,
    format = "default",
    className,
}: KnobProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const startYRef = React.useRef(0);
    const startValueRef = React.useRef(0);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled) return;
        setIsDragging(true);
        startYRef.current = e.clientY;
        startValueRef.current = value;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || disabled) return;

        // Drag UP to increase, drag DOWN to decrease (standard DAW knob behavior)
        const deltaY = startYRef.current - e.clientY;
        const sensitivity = 0.005;
        const delta = deltaY * sensitivity * (max - min);
        const newValue = Math.max(min, Math.min(max, startValueRef.current + delta));

        onChange(Math.round(newValue * 100) / 100);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    // Convert value to angle (270 degrees total range, -135 to +135)
    const percent = (value - min) / (max - min);
    const angle = -135 + percent * 270;

    // Format display value
    const formatValue = () => {
        if (format === "pan") {
            if (Math.abs(value) < 0.01) return "C";
            return value < 0
                ? `L${Math.abs(value * 100).toFixed(0)}`
                : `R${(value * 100).toFixed(0)}`;
        }
        if (format === "percent") {
            return `${(value * 100).toFixed(0)}%`;
        }
        return value.toFixed(2);
    };

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            {/* Knob */}
            <div className="relative h-12 w-12">
                <svg
                    className="h-full w-full cursor-pointer select-none"
                    viewBox="0 0 48 48"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    <defs>
                        <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgb(6, 182, 212)" />
                            <stop offset="100%" stopColor="rgb(168, 85, 247)" />
                        </linearGradient>
                    </defs>

                    {/* Track arc (background) */}
                    <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="3"
                        strokeDasharray="94.2 31.4"
                        strokeDashoffset="15.7"
                        transform="rotate(-135 24 24)"
                    />

                    {/* Value arc (filled portion) */}
                    <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="url(#knobGradient)"
                        strokeWidth="3"
                        strokeDasharray={`${94.2 * percent} ${94.2 * (1 - percent) + 31.4}`}
                        strokeDashoffset="15.7"
                        transform="rotate(-135 24 24)"
                        strokeLinecap="round"
                    />

                    {/* Knob body circle */}
                    <circle
                        cx="24"
                        cy="24"
                        r="18"
                        fill="url(#knobBodyGradient)"
                        stroke={isDragging ? "rgb(6, 182, 212)" : "rgb(75, 85, 99)"}
                        strokeWidth="2"
                        className="transition-all"
                    />

                    {/* Indicator line - rotates around center (24, 24) */}
                    <line
                        x1="24"
                        y1="8"
                        x2="24"
                        y2="16"
                        stroke="rgb(6, 182, 212)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        transform={`rotate(${angle} 24 24)`}
                    />

                    <defs>
                        <linearGradient id="knobBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgb(55, 65, 81)" />
                            <stop offset="100%" stopColor="rgb(17, 24, 39)" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Value display */}
            <div className="min-w-[3rem] text-center font-mono text-xs">
                <div className="font-semibold text-cyan-400">{formatValue()}</div>
                {label && <div className="text-muted-foreground mt-1">{label}</div>}
            </div>
        </div>
    );
}
