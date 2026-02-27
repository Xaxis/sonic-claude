/**
 * SequencerTransportTempoToolbar - BPM slider component for transport
 *
 * Professional DAW-style tempo control with slider and numeric display.
 * Follows established UI/UX patterns with Zustand store integration.
 */

import { ControlRow } from "@/components/ui/control-row.tsx";
import { useDAWStore } from '@/stores/dawStore.ts';

export function SequencerTransportTempoToolbar() {
    const tempo    = useDAWStore((state) => state.activeComposition?.tempo ?? 120);
    const setTempo = useDAWStore((state) => state.setTempo);

    return (
        <div className="min-w-[180px]">
            <ControlRow
                label="BPM"
                value={tempo}
                min={20}
                max={300}
                step={1}
                formatValue={v => Math.round(v).toString()}
                onChange={setTempo}
                labelWidth="w-9"
                valueWidth="w-8"
            />
        </div>
    );
}
