/**
 * NumericScrubber
 *
 * Click-to-type, drag-to-scrub, scroll-to-adjust numeric input.
 * Displays a ValueDisplay in idle mode; switches to a text input on click.
 *
 * Behavior:
 *   Idle       — ValueDisplay with cursor-ew-resize
 *   Click      — enter edit mode, input auto-selected
 *   Drag       — increment/decrement by step per pixel (shift = fineStep)
 *   Scroll     — increment/decrement by step
 *   Enter/blur — parse → clamp → onCommit → exit edit
 *   Escape     — revert → exit edit
 *
 * Usage:
 *   <NumericScrubber value={tempo} onChange={setTempo} onCommit={commitTempo}
 *     min={20} max={999} step={1} fineStep={0.1}
 *     formatValue={(v) => `${v} BPM`} parseValue={(s) => parseFloat(s)} />
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ValueDisplay } from "@/components/ui/value-display";
import type { VariantProps } from "class-variance-authority";

// Re-use ValueDisplay variant types so callers share the same vocabulary
type Emphasis = "accent" | "primary" | "muted";
type Size     = "xs" | "sm" | "default" | "lg";
type Align    = "center" | "right" | "left";

export interface NumericScrubberProps {
    /** Current numeric value */
    value: number;
    /** Called on every change (drag/scroll) */
    onChange: (value: number) => void;
    /** Called once on drag-end or input commit */
    onCommit?: (value: number) => void;
    min?: number;
    max?: number;
    /** Step size for drag and scroll */
    step?: number;
    /** Step size when Shift is held; defaults to step / 10 */
    fineStep?: number;
    /** Format value for display and initial edit text */
    formatValue?: (v: number) => string;
    /** Parse edit text back to number */
    parseValue?: (s: string) => number;
    /** Optional label shown below the value */
    label?: string;
    /** ValueDisplay emphasis variant (default: "accent") */
    emphasis?: Emphasis;
    /** ValueDisplay size variant (default: "xs") */
    size?: Size;
    /** ValueDisplay text alignment (default: "center") */
    align?: Align;
    className?: string;
}

export function NumericScrubber({
    value,
    onChange,
    onCommit,
    min = -Infinity,
    max = Infinity,
    step = 1,
    fineStep,
    formatValue,
    parseValue,
    label,
    emphasis = "accent",
    size = "xs",
    align = "center",
    className,
}: NumericScrubberProps) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editText, setEditText] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    const clamp = (v: number) => Math.max(min, Math.min(max, v));
    const format = formatValue ?? String;
    const parse = parseValue ?? parseFloat;
    const effectiveFineStep = fineStep ?? step / 10;

    // Auto-focus and select all when entering edit mode
    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const commitEdit = React.useCallback(() => {
        const parsed = parse(editText);
        if (!isNaN(parsed)) {
            const clamped = clamp(parsed);
            onChange(clamped);
            onCommit?.(clamped);
        }
        setIsEditing(false);
    }, [editText, parse, clamp, onChange, onCommit]);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            commitEdit();
        } else if (e.key === "Escape") {
            setIsEditing(false);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing) return;

        const startX = e.clientX;
        const startValue = value;
        let lastValue = value;
        let hasDragged = false;

        const handleMouseMove = (ev: MouseEvent) => {
            const deltaX = ev.clientX - startX;
            if (Math.abs(deltaX) > 3) hasDragged = true;
            const s = ev.shiftKey ? effectiveFineStep : step;
            lastValue = clamp(startValue + deltaX * s);
            onChange(lastValue);
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);

            if (!hasDragged) {
                // Pure click → enter edit mode (value unchanged since no drag)
                setEditText(format(startValue));
                setIsEditing(true);
            } else {
                onCommit?.(lastValue);
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (isEditing) return;
        e.preventDefault();
        const s = e.shiftKey ? effectiveFineStep : step;
        const newValue = clamp(value + (-Math.sign(e.deltaY)) * s);
        onChange(newValue);
        onCommit?.(newValue);
    };

    if (isEditing) {
        return (
            <div className={cn("inline-flex flex-col items-center", className)}>
                <input
                    ref={inputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={commitEdit}
                    className={cn(
                        "bg-background border border-primary rounded px-1 w-full text-xs font-mono text-cyan-400 outline-none",
                        align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center",
                    )}
                />
                {label && <div className="text-muted-foreground mt-0.5 text-[10px]">{label}</div>}
            </div>
        );
    }

    return (
        <div
            className={cn("inline-flex flex-col items-center cursor-ew-resize select-none", className)}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
            <ValueDisplay value={format(value)} emphasis={emphasis} size={size} align={align} />
            {label && <div className="text-muted-foreground mt-0.5 text-[10px]">{label}</div>}
        </div>
    );
}
