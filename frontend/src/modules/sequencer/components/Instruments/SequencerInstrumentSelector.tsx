/**
 * SequencerInstrumentSelector Component
 *
 * Searchable dropdown for choosing a MIDI track's sound source.
 * Shows ALL available options in one list:
 *   - Drum kits (grouped by kit category: Classic, Electronic, Acoustic)
 *   - Synth instruments (grouped by synthdef category)
 *
 * Selection behaviour:
 *   - Picking a kit   → updateTrack({ kit_id })  — backend loads pads, clears instrument
 *   - Picking a synth → updateTrack({ instrument }) — backend clears kit, sets instrument
 *
 * Current value display:
 *   - Kit track  → shows kit name from collectionsStore (via track.kit_id)
 *   - Synth track → shows synthdef display_name (via track.instrument)
 */

import { Drumstick, Music } from "lucide-react";
import { useMemo } from "react";
import { SearchableDropdown, type SearchableDropdownItem } from "@/components/ui/searchable-dropdown";
import { useDAWStore } from "@/stores/dawStore";
import { useCollectionsStore } from "@/stores/collectionsStore";

// Internal value encoding: prefix distinguishes kits from synthdefs
const KIT_PREFIX = "kit:";
const SYNTH_PREFIX = "synth:";

interface SequencerInstrumentSelectorProps {
    trackId: string;
    disabled?: boolean;
}

export function SequencerInstrumentSelector({
    trackId,
    disabled = false,
}: SequencerInstrumentSelectorProps) {
    const synthDefs  = useCollectionsStore((s) => s.synthdefs);
    const drumKits   = useCollectionsStore((s) => s.drumkits);
    const tracks     = useDAWStore((s) => s.tracks);
    const updateTrack = useDAWStore((s) => s.updateTrack);

    const track = tracks.find((t) => t.id === trackId);

    // ── Build dropdown items ──────────────────────────────────────────────────

    const items: SearchableDropdownItem[] = useMemo(() => {
        const kitItems: SearchableDropdownItem[] = drumKits.map((kit) => ({
            value: `${KIT_PREFIX}${kit.id}`,
            label: kit.name,
            category: `Kits — ${kit.category}`,
            description: kit.description,
        }));

        const synthItems: SearchableDropdownItem[] = synthDefs.map((sd) => ({
            value: `${SYNTH_PREFIX}${sd.name}`,
            label: sd.display_name,
            category: sd.category,
            description: sd.description,
        }));

        return [...kitItems, ...synthItems];
    }, [drumKits, synthDefs]);

    // ── Determine currently selected value ───────────────────────────────────

    const currentValue = useMemo(() => {
        if (track?.kit_id) return `${KIT_PREFIX}${track.kit_id}`;
        if (track?.instrument) return `${SYNTH_PREFIX}${track.instrument}`;
        return undefined;
    }, [track?.kit_id, track?.instrument]);

    // ── Handle selection ─────────────────────────────────────────────────────

    const handleValueChange = (value: string) => {
        if (value.startsWith(KIT_PREFIX)) {
            updateTrack(trackId, { kit_id: value.slice(KIT_PREFIX.length) });
        } else if (value.startsWith(SYNTH_PREFIX)) {
            updateTrack(trackId, { instrument: value.slice(SYNTH_PREFIX.length) });
        }
    };

    // ── Empty state ───────────────────────────────────────────────────────────

    if (synthDefs.length === 0 && drumKits.length === 0) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                <Music size={12} />
                <span>Loading...</span>
            </div>
        );
    }

    // Use Drumstick icon when a kit is loaded, Music otherwise
    const icon = track?.kit_id ? Drumstick : Music;

    return (
        <SearchableDropdown
            items={items}
            value={currentValue}
            onValueChange={handleValueChange}
            placeholder="Select sound…"
            icon={icon}
            disabled={disabled}
            triggerClassName="w-36"
            searchPlaceholder="Search kits & instruments…"
            emptyMessage="No results"
        />
    );
}
