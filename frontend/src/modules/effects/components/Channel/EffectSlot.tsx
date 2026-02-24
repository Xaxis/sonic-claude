/**
 * EffectSlot - Individual effect instance component
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads effectDefinitions from Zustand store
 * - Calls actions directly from store
 * - Only receives effectId and drag/drop state props (local UI state managed by parent)
 *
 * Displays a single effect with professional DAW-style controls:
 * - Clean, spacious header with effect name and category
 * - Bypass toggle and delete button (hover-based)
 * - Expandable parameter controls using EffectParameterControl (sliders)
 * - Visual feedback for bypass state
 */

import { useState } from "react";
import { ChevronDown, Trash2, GripVertical } from "lucide-react";
import { useDAWStore } from '@/stores/dawStore';
import { EffectParameterControl } from "./EffectParameterControl";
import { cn } from "@/lib/utils";

interface EffectSlotProps {
    effectId: string; // ✅ Identifier - acceptable
    // Drag and drop props (local UI state managed by parent)
    isDragging?: boolean;
    isDragOver?: boolean;
    onDragStart?: (effectId: string) => void;
    onDragEnd?: () => void;
    onDragOver?: (effectId: string) => void;
    onDragLeave?: () => void;
    onDrop?: (effectId: string) => void;
}

export function EffectSlot({
    effectId,
    isDragging = false,
    isDragOver = false,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
}: EffectSlotProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const effectChains = useDAWStore(state => state.effectChains);
    const effectDefinitions = useDAWStore(state => state.effectDefinitions);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const updateEffectParameter = useDAWStore(state => state.updateEffectParameter);
    const toggleEffectBypass = useDAWStore(state => state.toggleEffectBypass);
    const deleteEffect = useDAWStore(state => state.deleteEffect);

    // ========================================================================
    // LOCAL STATE
    // ========================================================================
    const [isExpanded, setIsExpanded] = useState(false);

    // ========================================================================
    // DERIVED STATE: Find effect instance
    // ========================================================================
    let effect = null;
    for (const chain of Object.values(effectChains)) {
        const found = chain.effects.find(e => e.id === effectId);
        if (found) {
            effect = found;
            break;
        }
    }

    // Validation: effect must exist
    if (!effect) {
        return null;
    }

    // Find effect definition
    const effectDefinition = effectDefinitions.find(
        (def) => def.name === effect.effect_name
    );

    const handleParameterChange = (paramName: string, value: number) => {
        updateEffectParameter(effect.id, paramName, value);
    };

    // Drag handlers
    const handleDragStart = (e: React.DragEvent) => {
        // Only allow drag from the drag handle, not from buttons
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button')) {
            e.preventDefault();
            return;
        }

        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", effect.id);
        onDragStart?.(effect.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(effect.id);
    };

    const handleDragLeave = () => {
        onDragLeave?.();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        onDrop?.(effect.id);
    };

    const handleDragEnd = () => {
        onDragEnd?.();
    };

    return (
        <div
            draggable={true}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={cn(
                "rounded-lg border transition-all duration-200",
                effect.is_bypassed
                    ? "border-border/30 bg-background/5 opacity-50"
                    : "border-border/50 bg-gradient-to-b from-background/80 to-background/40 hover:border-primary/50",
                isDragging && "opacity-40 scale-95",
                isDragOver && "border-primary ring-2 ring-primary/50"
            )}
        >
            {/* Effect Header - Spacious and clean */}
            <div className="p-3.5 space-y-3">
                {/* Top Row: Drag Handle, Name and Category */}
                <div className="flex items-start gap-2">
                    {/* Drag Handle */}
                    <div className="flex-shrink-0 pt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} />
                    </div>

                    <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                        {/* Effect Name */}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground leading-tight mb-1" title={effect.display_name}>
                                {effect.display_name}
                            </div>
                        {/* Category Badge */}
                        {effectDefinition && (
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{
                                        backgroundColor: effectDefinition.category === "Filter" ? "#60a5fa" :
                                            effectDefinition.category === "EQ" ? "#4ade80" :
                                            effectDefinition.category === "Dynamics" ? "#facc15" :
                                            effectDefinition.category === "Time-Based" ? "#c084fc" :
                                            effectDefinition.category === "Distortion" ? "#f87171" :
                                            "#9ca3af"
                                    }}
                                />
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                    {effectDefinition.category}
                                </span>
                            </div>
                        )}
                        </div>

                        {/* Expand/Collapse Button */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            <ChevronDown size={16} className={cn(
                                "transition-transform duration-200",
                                isExpanded ? "rotate-180" : ""
                            )} />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Action Buttons - Always visible, MixerButton style */}
                <div className="flex gap-1.5">
                    {/* Bypass Button - MixerButton style */}
                    <button
                        onClick={() => toggleEffectBypass(effect.id)}
                        className={cn(
                            "flex-1 h-7 px-2 text-xs font-bold uppercase tracking-wide rounded transition-all duration-150",
                            effect.is_bypassed
                                ? "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
                                : "bg-orange-500 text-white shadow-lg shadow-orange-500/50 hover:bg-orange-600"
                        )}
                        title={effect.is_bypassed ? "Activate" : "Bypass"}
                    >
                        {effect.is_bypassed ? "Off" : "On"}
                    </button>

                    {/* Delete Button - Destructive style */}
                    <button
                        onClick={() => deleteEffect(effect.id)}
                        className="h-7 px-3 rounded transition-all duration-150 bg-muted text-muted-foreground hover:bg-destructive hover:text-white border border-border hover:border-destructive flex items-center gap-1.5"
                        title="Delete Effect"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Effect Parameters (Expandable) - Use EffectParameterControl */}
            {isExpanded && effectDefinition && (
                <div className="border-t border-border/30 px-3.5 py-3.5 space-y-2.5 bg-background/20">
                    {effectDefinition.parameters
                        .filter((param) => param.name !== "bypass")
                        .map((param) => {
                            const currentValue = effect.parameters[param.name] ?? param.default;

                            return (
                                <EffectParameterControl
                                    key={param.name}
                                    parameter={param}
                                    value={currentValue}
                                    onChange={(value) => handleParameterChange(param.name, value)}
                                    disabled={effect.is_bypassed}
                                />
                            );
                        })}
                </div>
            )}
        </div>
    );
}

