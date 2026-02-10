/**
 * MixerChannel Component
 *
 * Single channel strip for the mixer.
 * Contains fader, pan, meter, mute/solo buttons.
 */

import { SubPanel } from "@/components/ui/sub-panel";
import { Fader } from "@/components/ui/fader";
import { Knob } from "@/components/ui/knob";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";

export interface MixerChannelProps {
    /** Track ID */
    trackId: string;
    /** Track name */
    name: string;
    /** Volume in dB */
    volume: number;
    /** Pan (-1 to 1) */
    pan: number;
    /** Mute state */
    muted: boolean;
    /** Solo state */
    soloed: boolean;
    /** Peak level in dB */
    peak: number;
    /** RMS level in dB */
    rms: number;
    /** Callbacks */
    onVolumeChange: (volume: number) => void;
    onPanChange: (pan: number) => void;
    onMuteToggle: () => void;
    onSoloToggle: () => void;
}

export function MixerChannel({
    name,
    volume,
    pan,
    muted,
    soloed,
    peak,
    rms,
    onVolumeChange,
    onPanChange,
    onMuteToggle,
    onSoloToggle,
}: MixerChannelProps) {
    return (
        <SubPanel className="w-24 flex-shrink-0">
            <div className="flex flex-col items-center gap-3 p-3">
                {/* Track name */}
                <div className="text-muted-foreground w-full truncate text-center text-xs font-semibold">
                    {name}
                </div>

                {/* Meter */}
                <Meter peak={peak} rms={rms} />

                {/* Fader */}
                <Fader value={volume} onChange={onVolumeChange} min={-96} max={6} />

                {/* Pan knob */}
                <Knob
                    value={pan}
                    onChange={onPanChange}
                    label="PAN"
                    min={-1}
                    max={1}
                    format="pan"
                />

                {/* Mute/Solo buttons */}
                <div className="flex w-full gap-1">
                    <button
                        onClick={onMuteToggle}
                        className={cn(
                            "flex-1 rounded px-2 py-1 text-xs font-bold transition-colors",
                            muted
                                ? "bg-red-500 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        )}
                    >
                        M
                    </button>
                    <button
                        onClick={onSoloToggle}
                        className={cn(
                            "flex-1 rounded px-2 py-1 text-xs font-bold transition-colors",
                            soloed
                                ? "bg-yellow-500 text-black"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        )}
                    >
                        S
                    </button>
                </div>
            </div>
        </SubPanel>
    );
}
