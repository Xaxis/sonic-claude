/**
 * SequencerInstrumentSelector Component
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads track from Zustand directly (no prop drilling)
 * - Only receives trackId (identifier) and disabled (local UI state)
 *
 * Dropdown selector for choosing MIDI track instruments (SynthDefs).
 * Displays instrument name with category grouping.
 *
 * Architecture:
 * - Reads available SynthDefs from Zustand store
 * - Reads track from Zustand store to get current instrument
 * - Groups instruments by category
 * - Updates track instrument via Zustand action
 * - Shows current instrument or placeholder
 */

import { Music } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
} from "@/components/ui/select.tsx";
import { useDAWStore } from "@/stores/dawStore";
import type { SynthDefInfo } from "../../types.ts";

interface SequencerInstrumentSelectorProps {
    trackId: string;    // Identifier - acceptable to pass
    disabled?: boolean; // Local UI state - acceptable to pass
}

export function SequencerInstrumentSelector({
    trackId,
    disabled = false,
}: SequencerInstrumentSelectorProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const synthDefs = useDAWStore(state => state.synthDefs);
    const tracks = useDAWStore(state => state.tracks);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const updateTrack = useDAWStore(state => state.updateTrack);

    // ========================================================================
    // DERIVED STATE: Find track and get current instrument
    // ========================================================================
    const track = tracks.find(t => t.id === trackId);
    const currentInstrument = track?.instrument;

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

    // Handle selection - call Zustand action directly
    const handleValueChange = (value: string) => {
        updateTrack(trackId, { instrument: value });
    };

    // Show placeholder if no synthDefs loaded yet
    if (synthDefs.length === 0) {
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

