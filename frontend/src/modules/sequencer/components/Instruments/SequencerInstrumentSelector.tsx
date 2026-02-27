/**
 * SequencerInstrumentSelector Component
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads track from Zustand directly (no prop drilling)
 * - Only receives trackId (identifier) and disabled (local UI state)
 *
 * Searchable dropdown selector for choosing MIDI track instruments (SynthDefs).
 * Displays instrument name with category grouping and search filtering.
 *
 * Architecture:
 * - Reads available SynthDefs from Zustand store
 * - Reads track from Zustand store to get current instrument
 * - Groups instruments by category
 * - Updates track instrument via Zustand action
 * - Shows current instrument or placeholder
 */

import { Music } from "lucide-react";
import { SearchableDropdown, type SearchableDropdownItem } from "@/components/ui/searchable-dropdown";
import { useDAWStore } from "@/stores/dawStore";

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

    // Map SynthDefs to SearchableDropdownItem format
    const items: SearchableDropdownItem[] = synthDefs.map(synthDef => ({
        value: synthDef.name,
        label: synthDef.display_name,
        category: synthDef.category,
        description: synthDef.description,
    }));

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
        <SearchableDropdown
            items={items}
            value={currentInstrument}
            onValueChange={handleValueChange}
            placeholder="Instrument"
            icon={Music}
            disabled={disabled}
            triggerClassName="w-32"
            searchPlaceholder="Search instruments..."
            emptyMessage="No instruments found"
        />
    );
}
