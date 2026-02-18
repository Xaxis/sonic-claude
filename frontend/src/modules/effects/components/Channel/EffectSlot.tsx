/**
 * EffectSlot - Individual effect instance component
 *
 * Displays a single effect with professional DAW-style controls:
 * - Effect name and category badge
 * - Bypass toggle (MixerButton pattern)
 * - Delete button (IconButton pattern)
 * - Expandable parameter controls (Knob components)
 * - Visual feedback for bypass state
 *
 * Follows established UI/UX patterns:
 * - Uses Knob for rotary parameters (cutoff, resonance, etc.)
 * - Uses IconButton for actions
 * - Uses consistent color scheme and spacing
 * - Matches mixer channel strip styling
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Knob } from "@/components/ui/knob";
import { cn } from "@/lib/utils";
import type { EffectInstance, EffectDefinition } from "@/services/effects";

interface EffectSlotProps {
    effect: EffectInstance;
    effectDefinition?: EffectDefinition;
    onParameterChange: (effectId: string, parameterName: string, value: number) => void;
    onToggleBypass: (effectId: string) => void;
    onDelete: (effectId: string) => void;
}

export function EffectSlot({
    effect,
    effectDefinition,
    onParameterChange,
    onToggleBypass,
    onDelete,
}: EffectSlotProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleParameterChange = (paramName: string, value: number) => {
        onParameterChange(effect.id, paramName, value);
    };

    // Get category color (matches design system)
    const getCategoryColor = (category?: string) => {
        switch (category) {
            case "Filter":
                return "text-blue-400 bg-blue-400/10 border-blue-400/30";
            case "EQ":
                return "text-green-400 bg-green-400/10 border-green-400/30";
            case "Dynamics":
                return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
            case "Time-Based":
                return "text-purple-400 bg-purple-400/10 border-purple-400/30";
            case "Distortion":
                return "text-red-400 bg-red-400/10 border-red-400/30";
            case "Utility":
                return "text-gray-400 bg-gray-400/10 border-gray-400/30";
            default:
                return "text-primary bg-primary/10 border-primary/30";
        }
    };

    // Format value for display with units
    const formatValue = (value: number, param: typeof effectDefinition.parameters[0]): string => {
        if (param.unit === "Hz") {
            if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
            return `${Math.round(value)}`;
        }
        if (param.unit === "dB") return `${value.toFixed(1)}`;
        if (param.unit === "ms") {
            if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
            return `${Math.round(value)}`;
        }
        if (param.unit === "%") return `${Math.round(value * 100)}`;
        if (param.unit === "ratio") return `${value.toFixed(1)}:1`;
        return value.toFixed(2);
    };

    const categoryColor = getCategoryColor(effectDefinition?.category);

    return (
        <div
            className={cn(
                "rounded-md border transition-all",
                effect.is_bypassed
                    ? "border-border/30 bg-background/20 opacity-50"
                    : "border-primary/30 bg-gradient-to-b from-primary/10 to-primary/5"
            )}
        >
            {/* Effect Header */}
            <div className="flex items-center gap-1.5 p-2">
                {/* Expand/Collapse Button */}
                <IconButton
                    icon={isExpanded ? ChevronUp : ChevronDown}
                    tooltip={isExpanded ? "Collapse" : "Expand"}
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setIsExpanded(!isExpanded)}
                />

                {/* Effect Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold truncate text-foreground" title={effect.display_name}>
                        {effect.display_name}
                    </div>
                    {effectDefinition && (
                        <div
                            className={cn(
                                "text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-block border mt-0.5",
                                categoryColor
                            )}
                        >
                            {effectDefinition.category}
                        </div>
                    )}
                </div>

                {/* Bypass Button (Mixer-style) */}
                <button
                    onClick={() => onToggleBypass(effect.id)}
                    className={cn(
                        "h-6 px-2 text-[9px] font-bold uppercase tracking-wide rounded transition-all duration-150",
                        effect.is_bypassed
                            ? "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                            : "bg-orange-500 text-white shadow-lg shadow-orange-500/50 hover:bg-orange-600"
                    )}
                    title={effect.is_bypassed ? "Activate" : "Bypass"}
                >
                    B
                </button>

                {/* Delete Button */}
                <IconButton
                    icon={Trash2}
                    tooltip="Delete Effect"
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(effect.id)}
                />
            </div>

            {/* Effect Parameters (Expandable) - Grid of Knobs */}
            {isExpanded && effectDefinition && (
                <div className="border-t border-border/30 p-3 bg-background/20">
                    <div className="grid grid-cols-2 gap-4">
                        {effectDefinition.parameters
                            .filter((param) => param.name !== "bypass") // Don't show bypass parameter
                            .map((param) => {
                                const currentValue = effect.parameters[param.name] ?? param.default;

                                return (
                                    <div key={param.name} className="flex flex-col items-center gap-1">
                                        {/* Knob */}
                                        <Knob
                                            value={currentValue}
                                            onChange={(value) => handleParameterChange(param.name, value)}
                                            min={param.min}
                                            max={param.max}
                                            disabled={effect.is_bypassed}
                                        />
                                        {/* Value Display with Units */}
                                        <div className="text-center">
                                            <div className="text-[10px] font-mono font-bold text-cyan-400">
                                                {formatValue(currentValue, param)}
                                                {param.unit && <span className="text-muted-foreground ml-0.5">{param.unit}</span>}
                                            </div>
                                            <div className="text-[9px] text-muted-foreground mt-0.5">
                                                {param.display_name}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
}

