/**
 * Fader Component
 *
 * Vertical fader control for volume, send levels, etc.
 * Professional DAW-style fader with dB scale and precise control.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FaderProps {
    /** Current value in dB (-96 to +6) */
    value: number;
    /** Callback when value changes */
    onChange: (value: number) => void;
    /** Label displayed below fader */
    label?: string;
    /** Minimum value in dB */
    min?: number;
    /** Maximum value in dB */
    max?: number;
    /** Whether fader is disabled */
    disabled?: boolean;
    /** Additional CSS classes */
    className?: string;
}

export function Fader({
    value,
    onChange,
    label,
    min = -96,
    max = 6,
    disabled = false,
    className,
}: FaderProps) {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    // Convert dB to percentage (0-1)
    const valueToPercent = (db: number) => {
        return (db - min) / (max - min);
    };

    // Convert percentage to dB
    const percentToValue = (percent: number) => {
        return min + percent * (max - min);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled) return;
        setIsDragging(true);
        updateValue(e);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || disabled) return;
        updateValue(e);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const updateValue = (e: React.PointerEvent) => {
        if (!trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percent = 1 - Math.max(0, Math.min(1, y / rect.height));
        const newValue = percentToValue(percent);

        onChange(Math.round(newValue * 10) / 10); // Round to 0.1 dB
    };

    const percent = valueToPercent(value);
    const displayValue = value > -96 ? `${value > 0 ? "+" : ""}${value.toFixed(1)}` : "-∞";

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            {/* Fader track */}
            <div
                ref={trackRef}
                className="relative h-32 w-8 cursor-pointer rounded border border-white/10 bg-black/40 select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* Fill */}
                <div
                    className="absolute right-0 bottom-0 left-0 rounded-b bg-gradient-to-t from-cyan-500/60 to-purple-500/60 transition-all"
                    style={{ height: `${percent * 100}%` }}
                />

                {/* Thumb */}
                <div
                    className={cn(
                        "absolute left-1/2 h-3 w-10 -translate-x-1/2 rounded border-2 transition-colors",
                        isDragging
                            ? "border-cyan-300 bg-cyan-400"
                            : "border-gray-500 bg-gray-700 hover:bg-gray-600"
                    )}
                    style={{ bottom: `calc(${percent * 100}% - 6px)` }}
                />

                {/* 0dB marker */}
                {min < 0 && max > 0 && (
                    <div
                        className="absolute right-0 left-0 h-px bg-yellow-500/50"
                        style={{ bottom: `${valueToPercent(0) * 100}%` }}
                    />
                )}
            </div>

            {/* Value display */}
            <div className="min-w-[3rem] text-center font-mono text-xs">
                <div className="font-semibold text-cyan-400">{displayValue}</div>
                {label && <div className="text-muted-foreground mt-1">{label}</div>}
            </div>
        </div>
    );
}
