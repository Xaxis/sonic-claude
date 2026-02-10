/**
 * Mixer Panel
 *
 * Multi-track mixer with volume, pan, mute, solo controls.
 * Shows level meters and master fader.
 * Integrates with AudioEngineContext for real mixer state and real-time metering.
 *
 * Uses professional Fader (volume) and Knob (pan) components.
 */

import { useEffect } from "react";
import { Fader } from "@/components/ui/fader";
import { Knob } from "@/components/ui/knob";
import { Meter } from "@/components/ui/meter";
import { cn } from "@/lib/utils";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { Plus, Trash2 } from "lucide-react";

export function MixerPanel() {
    const {
        tracks,
        masterTrack,
        meters,
        loadTracks,
        createTrack,
        updateTrackVolume,
        updateTrackPan,
        muteTrack,
        soloTrack,
        deleteTrack,
    } = useAudioEngine();

    // Load tracks on mount
    useEffect(() => {
        loadTracks();
    }, [loadTracks]);

    // Convert dB to linear volume (0-2 range)
    const dbToLinear = (db: number): number => {
        if (db <= -96) return 0;
        return Math.pow(10, db / 20);
    };

    // Convert linear volume to dB
    const linearToDb = (linear: number): number => {
        if (linear === 0) return -96;
        return 20 * Math.log10(linear);
    };

    // Handle volume change (receives dB from Fader, converts to linear for API)
    const handleVolumeChange = async (trackId: string, db: number) => {
        const linear = dbToLinear(db);
        await updateTrackVolume(trackId, linear);
    };

    // Handle pan change (receives -1 to 1 from Knob)
    const handlePanChange = async (trackId: string, pan: number) => {
        await updateTrackPan(trackId, pan);
    };

    // Handle mute toggle
    const handleMuteToggle = async (trackId: string, currentMuted: boolean) => {
        await muteTrack(trackId, !currentMuted);
    };

    // Handle solo toggle
    const handleSoloToggle = async (trackId: string, currentSoloed: boolean) => {
        await soloTrack(trackId, !currentSoloed);
    };

    // Handle add track
    const handleAddTrack = async () => {
        await createTrack(`Track ${tracks.length + 1}`, "audio");
    };

    // Handle delete track
    const handleDeleteTrack = async (trackId: string) => {
        await deleteTrack(trackId);
    };

    // Get meter levels for a track (in dB)
    const getMeterLevels = (trackId: string) => {
        const meter = meters[trackId];
        if (!meter) {
            return { peakL: -96, peakR: -96, rmsL: -96, rmsR: -96 };
        }
        return {
            peakL: meter.peakL || -96,
            peakR: meter.peakR || -96,
            rmsL: meter.rmsL || -96,
            rmsR: meter.rmsR || -96,
        };
    };

    return (
        <div className="flex-1 flex gap-2 overflow-hidden h-full p-2">
            {/* Track Channels */}
            <div className="flex-1 flex gap-2 overflow-x-auto pb-2">
                {tracks.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <p className="text-sm mb-2">No tracks</p>
                            <button
                                onClick={handleAddTrack}
                                className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded text-xs flex items-center gap-1 mx-auto"
                            >
                                <Plus size={14} />
                                Add Track
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {tracks.map((track) => {
                            const meterLevels = getMeterLevels(track.id);
                            const volumeDb = linearToDb(track.volume);

                            return (
                                <div key={track.id} className="flex flex-col gap-2 w-24 flex-shrink-0 bg-muted/20 rounded-lg p-3 group relative">
                                    {/* Delete button (appears on hover) */}
                                    <button
                                        onClick={() => handleDeleteTrack(track.id)}
                                        className="absolute -top-1 -right-1 p-1 bg-destructive/80 hover:bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Delete track"
                                    >
                                        <Trash2 size={10} className="text-white" />
                                    </button>

                                    {/* Track Name */}
                                    <div className="text-xs font-semibold text-center truncate text-foreground">
                                        {track.name}
                                    </div>

                                    {/* Professional Meter Component */}
                                    <div className="flex justify-center">
                                        <Meter
                                            peak={meterLevels.peakL}
                                            rms={meterLevels.rmsL}
                                            stereo={true}
                                            peakRight={meterLevels.peakR}
                                            rmsRight={meterLevels.rmsR}
                                        />
                                    </div>

                                    {/* Professional Fader Component */}
                                    <div className="flex justify-center">
                                        <Fader
                                            value={volumeDb}
                                            onChange={(db) => handleVolumeChange(track.id, db)}
                                            min={-96}
                                            max={6}
                                        />
                                    </div>

                                    {/* Professional Knob Component for Pan */}
                                    <div className="flex justify-center">
                                        <Knob
                                            value={track.pan}
                                            onChange={(pan) => handlePanChange(track.id, pan)}
                                            label="Pan"
                                            format="pan"
                                            min={-1}
                                            max={1}
                                        />
                                    </div>

                                    {/* Mute/Solo Buttons */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleMuteToggle(track.id, track.is_muted)}
                                            className={cn(
                                                "flex-1 px-2 py-1 text-xs font-bold rounded transition-colors",
                                                track.is_muted
                                                    ? "bg-red-500 text-white"
                                                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                                            )}
                                        >
                                            M
                                        </button>
                                        <button
                                            onClick={() => handleSoloToggle(track.id, track.is_solo)}
                                            className={cn(
                                                "flex-1 px-2 py-1 text-xs font-bold rounded transition-colors",
                                                track.is_solo
                                                    ? "bg-yellow-500 text-black"
                                                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                                            )}
                                        >
                                            S
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Add Track Button */}
                        <button
                            onClick={handleAddTrack}
                            className="w-20 flex-shrink-0 border-2 border-dashed border-border hover:border-primary hover:bg-primary/10 rounded-lg transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                        >
                            <Plus size={20} />
                            <span className="text-xs">Add</span>
                        </button>
                    </>
                )}
            </div>

            {/* Master Channel */}
            {masterTrack && (
                <div className="w-28 flex flex-col gap-2 border-l-2 border-primary/30 pl-3 bg-primary/5 rounded-r-lg p-3">
                    <div className="text-xs font-bold text-center text-primary">
                        MASTER
                    </div>

                    {/* Professional Master Meter */}
                    <div className="flex justify-center">
                        <Meter
                            peak={getMeterLevels("master").peakL}
                            rms={getMeterLevels("master").rmsL}
                            stereo={true}
                            peakRight={getMeterLevels("master").peakR}
                            rmsRight={getMeterLevels("master").rmsR}
                        />
                    </div>

                    {/* Professional Master Fader */}
                    <div className="flex justify-center">
                        <Fader
                            value={linearToDb(masterTrack.volume)}
                            onChange={(db) => handleVolumeChange("master", db)}
                            min={-96}
                            max={6}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

