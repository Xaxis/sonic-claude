/**
 * EffectSelector - Effect browser/selector component
 *
 * Allows users to browse and add effects to a track.
 * Displays effects grouped by category with search functionality.
 *
 * Follows established UI/UX patterns:
 * - Uses Select component (like instrument selector)
 * - Groups effects by category
 * - Shows effect descriptions
 * - Consistent styling with rest of app
 */

import { Plus } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { EffectDefinition } from "@/services/api/providers";

interface EffectSelectorProps {
    effectDefinitions: EffectDefinition[];
    onEffectSelected: (effectName: string) => void;
    disabled?: boolean;
}

export function EffectSelector({
    effectDefinitions,
    onEffectSelected,
    disabled = false,
}: EffectSelectorProps) {
    // Group effects by category
    const groupedEffects = effectDefinitions.reduce((acc, effect) => {
        if (!acc[effect.category]) {
            acc[effect.category] = [];
        }
        acc[effect.category].push(effect);
        return acc;
    }, {} as Record<string, EffectDefinition[]>);

    // Sort categories
    const categoryOrder = ["Filter", "EQ", "Dynamics", "Time-Based", "Distortion", "Utility"];
    const sortedCategories = Object.keys(groupedEffects).sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a);
        const bIndex = categoryOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });

    return (
        <Select
            value=""
            onValueChange={(value) => {
                if (value) {
                    onEffectSelected(value);
                }
            }}
            disabled={disabled}
        >
            <SelectTrigger className="h-7 w-full text-xs border-border/50 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden">
                    <Plus size={12} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-xs">Effects</span>
                </div>
            </SelectTrigger>
            <SelectContent className="max-h-80 z-[9999]" align="start" position="popper" sideOffset={4}>
                {sortedCategories.map((category) => (
                    <SelectGroup key={category}>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">
                            {category}
                        </SelectLabel>
                        {groupedEffects[category].map((effect) => (
                            <SelectItem
                                key={effect.name}
                                value={effect.name}
                                className="text-xs"
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{effect.display_name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {effect.description}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
}

