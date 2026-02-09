import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, value, min = 0, max = 100, step = 1, onChange, ...props }, ref) => {
        const internalRef = React.useRef<HTMLInputElement>(null);
        const sliderRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;
        const isDraggingRef = React.useRef(false);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(Number(e.target.value));
        };

        // Calculate value from touch/mouse position
        const calculateValueFromPosition = React.useCallback(
            (clientX: number) => {
                if (!sliderRef.current) return;

                const rect = sliderRef.current.getBoundingClientRect();
                const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                const range = max - min;
                const rawValue = min + percentage * range;

                // Round to nearest step
                const steppedValue = Math.round(rawValue / step) * step;
                const clampedValue = Math.max(min, Math.min(max, steppedValue));

                onChange?.(clampedValue);
            },
            [min, max, step, onChange, sliderRef]
        );

        // Touch event handlers
        const handleTouchStart = React.useCallback(
            (e: React.TouchEvent<HTMLInputElement>) => {
                e.preventDefault(); // Prevent scrolling while dragging
                isDraggingRef.current = true;
                const touch = e.touches[0];
                calculateValueFromPosition(touch.clientX);
            },
            [calculateValueFromPosition]
        );

        const handleTouchMove = React.useCallback(
            (e: React.TouchEvent<HTMLInputElement>) => {
                if (!isDraggingRef.current) return;
                e.preventDefault(); // Prevent scrolling while dragging
                const touch = e.touches[0];
                calculateValueFromPosition(touch.clientX);
            },
            [calculateValueFromPosition]
        );

        const handleTouchEnd = React.useCallback(
            (e: React.TouchEvent<HTMLInputElement>) => {
                e.preventDefault();
                isDraggingRef.current = false;
            },
            []
        );

        return (
            <input
                type="range"
                ref={sliderRef}
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={handleChange}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={cn(
                    "bg-border h-1 w-full cursor-pointer appearance-none rounded-lg touch-none",
                    // Larger touch target for better mobile UX (44px minimum)
                    "[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,245,255,0.5)]",
                    "[&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
                    // Add padding to increase touch target area
                    "py-2",
                    className
                )}
                {...props}
            />
        );
    }
);
Slider.displayName = "Slider";

export { Slider };
