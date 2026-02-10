/**
 * Mixer Panel
 *
 * Multi-track mixer with volume, pan, mute, solo controls.
 * Shows level meters and master fader.
 * Integrates with AudioEngineContext for real mixer state and real-time metering.
 */

import { useEffect } from "react";
import { Slider } from "@/components/ui/slider";
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

    // Handle volume change
    const handleVolumeChange = async (trackId: string, volume: number) => {
        await updateTrackVolume(trackId, volume);
    };

    // Handle pan change
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

    // Get meter level for a track (0-1 range)
    const getMeterLevel = (trackId: string): number => {
        const meter = meters[trackId];
        if (!meter) return 0;
        // Use peak level (average of L/R)
        return (meter.peakL + meter.peakR) / 2;
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
                            const meterLevel = getMeterLevel(track.id);
                            return (
                                <div key={track.id} className="flex flex-col gap-1.5 w-20 flex-shrink-0 bg-muted/20 rounded-lg p-2 group relative">
                                    {/* Delete button (appears on hover) */}
                                    <button
                                        onClick={() => handleDeleteTrack(track.id)}
                                        className="absolute -top-1 -right-1 p-1 bg-destructive/80 hover:bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Delete track"
                                    >
                                        <Trash2 size={10} className="text-white" />
                                    </button>

                                    {/* Track Name */}
                                    <div className="text-xs font-semibold text-center truncate px-1 text-foreground">
                                        {track.name}
                                    </div>

                                    {/* Level Meter */}
                                    <div className="flex-1 bg-gray-900/50 rounded relative overflow-hidden min-h-[100px]">
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                                            style={{ height: `${Math.min(meterLevel * 100, 100)}%` }}
                                        />
                                        {/* Peak indicator line */}
                                        {meterLevel > 0.9 && (
                                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
                                        )}
                                    </div>

                                    {/* Volume Fader */}
                                    <div className="px-1">
                                        <Slider
                                            value={track.volume}
                                            onChange={(value: number) => handleVolumeChange(track.id, value)}
                                            min={0}
                                            max={2}
                                            step={0.01}
                                        />
                                    </div>

                                    {/* Volume Label (in dB) */}
                                    <div className="text-xs text-center text-muted-foreground font-mono">
                                        {track.volume === 0 ? "-∞" : (20 * Math.log10(track.volume)).toFixed(1)} dB
                                    </div>

                                    {/* Pan Control */}
                                    <div className="px-1">
                                        <Slider
                                            value={(track.pan + 1) / 2}
                                            onChange={(value: number) => handlePanChange(track.id, value * 2 - 1)}
                                            min={0}
                                            max={1}
                                            step={0.01}
                                        />
                                        <div className="text-xs text-center text-muted-foreground mt-0.5 font-mono">
                                            {track.pan === 0 ? "C" : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : `L${Math.round(Math.abs(track.pan) * 100)}`}
                                        </div>
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
                <div className="w-24 flex flex-col gap-1.5 border-l-2 border-primary/30 pl-2 bg-primary/5 rounded-r-lg p-2">
                    <div className="text-xs font-bold text-center text-primary">
                        MASTER
                    </div>

                    {/* Master Level Meter */}
                    <div className="flex-1 bg-gray-900/50 rounded relative overflow-hidden min-h-[100px]">
                        <div
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                            style={{ height: `${Math.min(getMeterLevel("master") * 100, 100)}%` }}
                        />
                        {getMeterLevel("master") > 0.9 && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
                        )}
                    </div>

                    {/* Master Fader */}
                    <div className="px-2">
                        <Slider
                            value={masterTrack.volume}
                            onChange={(value: number) => handleVolumeChange("master", value)}
                            min={0}
                            max={2}
                            step={0.01}
                        />
                    </div>

                    {/* Master Volume Label */}
                    <div className="text-xs text-center text-primary font-mono font-bold">
                        {masterTrack.volume === 0 ? "-∞" : (20 * Math.log10(masterTrack.volume)).toFixed(1)} dB
                    </div>
                </div>
            )}
        </div>
    );
}

