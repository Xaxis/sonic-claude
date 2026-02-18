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

    const handleWheel = (e: React.WheelEvent) => {
        if (disabled) return;
        e.preventDefault();

        // Mouse wheel: scroll up = increase, scroll down = decrease
        // Use fine sensitivity when Shift is held
        const baseSensitivity = 1.0; // 1 dB per scroll
        const fineSensitivity = 0.1; // 0.1 dB per scroll with Shift
        const sensitivity = e.shiftKey ? fineSensitivity : baseSensitivity;

        const delta = -e.deltaY * 0.01 * sensitivity;
        const newValue = Math.max(min, Math.min(max, value + delta));

        onChange(Math.round(newValue * 10) / 10);
    };

    const updateValue = (e: React.PointerEvent) => {
        if (!trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;

        // Use fine sensitivity when Shift is held
        let percent;
        if (e.shiftKey) {
            // Fine mode: 10x slower
            const deltaY = y - (rect.height * (1 - valueToPercent(value)));
            const sensitivity = 0.1; // 10x slower
            percent = valueToPercent(value) - (deltaY / rect.height) * sensitivity;
        } else {
            // Normal mode: direct positioning
            percent = 1 - Math.max(0, Math.min(1, y / rect.height));
        }

        percent = Math.max(0, Math.min(1, percent));
        const newValue = percentToValue(percent);

        onChange(Math.round(newValue * 10) / 10); // Round to 0.1 dB
    };

    const percent = valueToPercent(value);
    const displayValue = value > -96 ? `${value > 0 ? "+" : ""}${value.toFixed(1)}` : "-∞";

    return (
        <div className={cn("flex h-full flex-col items-center gap-2", className)}>
            {/* Fader track */}
            <div
                ref={trackRef}
                className="relative flex-1 w-9 cursor-pointer rounded-sm border border-white/20 bg-gradient-to-b from-black/60 to-black/80 select-none shadow-inner"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
            >
                {/* dB Scale markers */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* 0dB marker (yellow) */}
                    {min < 0 && max > 0 && (
                        <div
                            className="absolute right-0 left-0 h-0.5 bg-yellow-500/60 shadow-[0_0_4px_rgba(234,179,8,0.4)]"
                            style={{ bottom: `${valueToPercent(0) * 100}%` }}
                        />
                    )}
                    {/* -12dB marker */}
                    {min < -12 && max > -12 && (
                        <div
                            className="absolute right-0 left-0 h-px bg-white/10"
                            style={{ bottom: `${valueToPercent(-12) * 100}%` }}
                        />
                    )}
                </div>

                {/* Fill */}
                <div
                    className="absolute right-0 bottom-0 left-0 rounded-b bg-gradient-to-t from-cyan-500/70 via-cyan-400/50 to-purple-500/60 transition-all duration-100 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    style={{ height: `${percent * 100}%` }}
                />

                {/* Thumb */}
                <div
                    className={cn(
                        "absolute left-1/2 h-4 w-11 -translate-x-1/2 rounded-sm border-2 transition-all shadow-lg",
                        isDragging
                            ? "border-cyan-300 bg-gradient-to-b from-cyan-400 to-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                            : "border-gray-500 bg-gradient-to-b from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 hover:border-gray-400"
                    )}
                    style={{ bottom: `calc(${percent * 100}% - 8px)` }}
                >
                    {/* Thumb grip lines */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 px-1.5">
                        <div className="h-px bg-white/30" />
                        <div className="h-px bg-white/30" />
                        <div className="h-px bg-white/30" />
                    </div>
                </div>
            </div>

            {/* Value display */}
            {label && (
                <div className="min-w-[3rem] text-center font-mono text-xs">
                    <div className="font-semibold text-cyan-400">{displayValue}</div>
                    <div className="text-muted-foreground mt-1">{label}</div>
                </div>
            )}
        </div>
    );
}
