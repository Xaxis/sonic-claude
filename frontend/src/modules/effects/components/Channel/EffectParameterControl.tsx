/**
 * EffectParameterControl - Individual effect parameter control
 *
 * Displays a slider for controlling effect parameters with:
 * - Parameter name and current value
 * - Slider with min/max range
 * - Unit display (Hz, dB, %, etc.)
 * - Real-time value updates
 */

import { Slider } from "@/components/ui/slider";
import type { EffectParameter } from "@/services/effects";

interface EffectParameterControlProps {
    parameter: EffectParameter;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function EffectParameterControl({
    parameter,
    value,
    onChange,
    disabled = false,
}: EffectParameterControlProps) {
    // Format value for display
    const formatValue = (val: number): string => {
        // Handle different parameter types
        if (parameter.unit === "Hz") {
            if (val >= 1000) {
                return `${(val / 1000).toFixed(1)}kHz`;
            }
            return `${Math.round(val)}Hz`;
        }
        if (parameter.unit === "dB") {
            return `${val.toFixed(1)}dB`;
        }
        if (parameter.unit === "ms") {
            if (val >= 1000) {
                return `${(val / 1000).toFixed(2)}s`;
            }
            return `${Math.round(val)}ms`;
        }
        if (parameter.unit === "%") {
            return `${Math.round(val * 100)}%`;
        }
        if (parameter.unit === "ratio") {
            return `${val.toFixed(1)}:1`;
        }
        
        // Default: show 2 decimal places
        return val.toFixed(2);
    };

    // Calculate step size based on range
    const getStepSize = (): number => {
        const range = parameter.max - parameter.min;
        if (range > 1000) return 10;
        if (range > 100) return 1;
        if (range > 10) return 0.1;
        return 0.01;
    };

    return (
        <div className="space-y-1">
            {/* Parameter Name and Value */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground">
                    {parameter.display_name}
                </span>
                <span className="text-[10px] font-mono font-bold text-foreground">
                    {formatValue(value)}
                </span>
            </div>

            {/* Slider */}
            <Slider
                value={[value]}
                onValueChange={(values) => onChange(values[0])}
                min={parameter.min}
                max={parameter.max}
                step={getStepSize()}
                disabled={disabled}
                className="w-full"
            />
        </div>
    );
}

