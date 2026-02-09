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
            return value < 0 ? `L${Math.abs(value * 100).toFixed(0)}` : `R${(value * 100).toFixed(0)}`;
        }
        if (format === "percent") {
            return `${(value * 100).toFixed(0)}%`;
        }
        return value.toFixed(2);
    };

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            {/* Knob */}
            <div className="relative w-12 h-12">
                {/* Background circle */}
                <svg className="w-full h-full" viewBox="0 0 48 48">
                    {/* Track arc */}
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
                    {/* Value arc */}
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
                    <defs>
                        <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="rgb(6, 182, 212)" />
                            <stop offset="100%" stopColor="rgb(168, 85, 247)" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Knob body */}
                <div
                    className={cn(
                        "absolute inset-2 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 cursor-pointer select-none",
                        isDragging ? "border-cyan-400" : "border-gray-600 hover:border-gray-500"
                    )}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                >
                    {/* Indicator line */}
                    <div
                        className="absolute top-1 left-1/2 w-0.5 h-3 bg-cyan-400 rounded-full"
                        style={{ transform: `translateX(-50%) rotate(${angle}deg)`, transformOrigin: "50% 16px" }}
                    />
                </div>
            </div>

            {/* Value display */}
            <div className="text-xs font-mono text-center min-w-[3rem]">
                <div className="text-cyan-400 font-semibold">{formatValue()}</div>
                {label && <div className="text-muted-foreground mt-1">{label}</div>}
            </div>
        </div>
    );
}

