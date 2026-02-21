/**
 * SequencerInstrumentSelector Component
 * 
 * Dropdown selector for choosing MIDI track instruments (SynthDefs).
 * Displays instrument name with category grouping.
 * 
 * Architecture:
 * - Fetches available SynthDefs from API
 * - Groups instruments by category
 * - Updates track instrument via API on selection
 * - Shows current instrument or placeholder
 */

import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
} from "@/components/ui/select.tsx";
import { api } from "@/services/api";
import type { SynthDefInfo } from "../../types.ts";

interface SequencerInstrumentSelectorProps {
    trackId: string;
    currentInstrument?: string;
    onInstrumentChange: (trackId: string, instrument: string) => void;
    disabled?: boolean;
}

export function SequencerInstrumentSelector({
    trackId,
    currentInstrument,
    onInstrumentChange,
    disabled = false,
}: SequencerInstrumentSelectorProps) {
    const [synthDefs, setSynthDefs] = useState<SynthDefInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load available SynthDefs on mount
    useEffect(() => {
        const loadSynthDefs = async () => {
            try {
                setIsLoading(true);
                const defs = await api.sequencer.getSynthDefs();
                setSynthDefs(defs);
            } catch (error) {
                console.error("Failed to load SynthDefs:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSynthDefs();
    }, []);

    // Group SynthDefs by category
    const groupedSynthDefs = synthDefs.reduce((acc, synthDef) => {
        if (!acc[synthDef.category]) {
            acc[synthDef.category] = [];
        }
        acc[synthDef.category].push(synthDef);
        return acc;
    }, {} as Record<string, SynthDefInfo[]>);

    // Get display name for current instrument
    const currentSynthDef = synthDefs.find((def) => def.name === currentInstrument);
    const displayValue = currentSynthDef?.display_name || currentInstrument || "Instrument";

    const handleValueChange = (value: string) => {
        onInstrumentChange(trackId, value);
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                <Music size={12} />
                <span>Loading...</span>
            </div>
        );
    }

    return (
        <Select
            value={currentInstrument || ""}
            onValueChange={handleValueChange}
            disabled={disabled}
        >
            <SelectTrigger className="h-7 w-32 text-xs border-border/50 hover:border-border transition-colors min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden">
                    <Music size={12} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate text-xs">{displayValue}</span>
                </div>
            </SelectTrigger>
            <SelectContent className="max-h-80 z-[9999]" align="start" position="popper" sideOffset={4}>
                {Object.entries(groupedSynthDefs).map(([category, defs]) => (
                    <SelectGroup key={category}>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">
                            {category}
                        </SelectLabel>
                        {defs.map((synthDef) => (
                            <SelectItem
                                key={synthDef.name}
                                value={synthDef.name}
                                className="text-xs"
                            >
                                <div className="flex flex-col">
                                    <span className="font-medium">{synthDef.display_name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {synthDef.description}
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

