/**
 * Mixer Panel
 *
 * Multi-track mixer with volume, pan, mute, solo, and send controls.
 * Integrates with SuperCollider audio engine for real-time mixing.
 */

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { MixerChannel } from "./MixerChannel";
import { audioEngineService } from "@/services/api/audio-engine.service";
import { Plus } from "lucide-react";

interface Track {
    id: string;
    name: string;
    volume: number;
    pan: number;
    muted: boolean;
    soloed: boolean;
    peak: number;
    rms: number;
}

export function MixerPanel() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load tracks from backend
    useEffect(() => {
        loadTracks();
    }, []);

    const loadTracks = async () => {
        try {
            const response = await audioEngineService.getTracks();
            setTracks(
                response.map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    volume: volumeToDb(t.volume), // Convert 0-2 to dB
                    pan: t.pan,
                    muted: t.is_muted || false,
                    soloed: t.is_solo || false,
                    peak: -96, // Will be updated by WebSocket
                    rms: -96,
                }))
            );
        } catch (error) {
            console.error("Failed to load tracks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Convert linear volume (0-2) to dB (-96 to +6)
    const volumeToDb = (linear: number): number => {
        if (linear <= 0) return -96;
        return 20 * Math.log10(linear);
    };

    // Convert dB to linear volume
    const dbToVolume = (db: number): number => {
        if (db <= -96) return 0;
        return Math.pow(10, db / 20);
    };

    const handleVolumeChange = async (trackId: string, db: number) => {
        try {
            const linear = dbToVolume(db);
            await audioEngineService.setTrackVolume(trackId, { volume: linear });
            setTracks((prev) =>
                prev.map((t) => (t.id === trackId ? { ...t, volume: db } : t))
            );
        } catch (error) {
            console.error("Failed to set volume:", error);
        }
    };

    const handlePanChange = async (trackId: string, pan: number) => {
        try {
            await audioEngineService.setTrackPan(trackId, { pan });
            setTracks((prev) =>
                prev.map((t) => (t.id === trackId ? { ...t, pan } : t))
            );
        } catch (error) {
            console.error("Failed to set pan:", error);
        }
    };

    const handleMuteToggle = async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (!track) return;

        try {
            if (track.muted) {
                await audioEngineService.unmuteTrack(trackId);
            } else {
                await audioEngineService.muteTrack(trackId);
            }
            setTracks((prev) =>
                prev.map((t) =>
                    t.id === trackId ? { ...t, muted: !t.muted } : t
                )
            );
        } catch (error) {
            console.error("Failed to toggle mute:", error);
        }
    };

    const handleSoloToggle = async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (!track) return;

        try {
            if (track.soloed) {
                await audioEngineService.unsoloTrack(trackId);
            } else {
                await audioEngineService.soloTrack(trackId);
            }
            setTracks((prev) =>
                prev.map((t) =>
                    t.id === trackId ? { ...t, soloed: !t.soloed } : t
                )
            );
        } catch (error) {
            console.error("Failed to toggle solo:", error);
        }
    };

    const handleAddTrack = async () => {
        try {
            const newTrack = await audioEngineService.createTrack({
                name: `Track ${tracks.length + 1}`,
            });
            setTracks((prev) => [
                ...prev,
                {
                    id: newTrack.id,
                    name: newTrack.name,
                    volume: volumeToDb(newTrack.volume),
                    pan: newTrack.pan,
                    muted: newTrack.is_muted || false,
                    soloed: newTrack.is_solo || false,
                    peak: -96,
                    rms: -96,
                },
            ]);
        } catch (error) {
            console.error("Failed to create track:", error);
        }
    };

    return (
        <Panel
            title="MIXER"
            className="flex flex-col"
            headerActions={
                <button
                    onClick={handleAddTrack}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                    title="Add Track"
                >
                    <Plus className="h-4 w-4" />
                </button>
            }
        >
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-sm text-muted-foreground">
                            Loading tracks...
                        </div>
                    </div>
                ) : tracks.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                                No tracks yet
                            </p>
                            <button
                                onClick={handleAddTrack}
                                className="px-3 py-1 text-xs bg-primary/20 hover:bg-primary/30 rounded transition-colors"
                            >
                                Add Track
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 p-4 h-full">
                        {tracks.map((track) => (
                            <MixerChannel
                                key={track.id}
                                trackId={track.id}
                                name={track.name}
                                volume={track.volume}
                                pan={track.pan}
                                muted={track.muted}
                                soloed={track.soloed}
                                peak={track.peak}
                                rms={track.rms}
                                onVolumeChange={(vol) =>
                                    handleVolumeChange(track.id, vol)
                                }
                                onPanChange={(pan) =>
                                    handlePanChange(track.id, pan)
                                }
                                onMuteToggle={() => handleMuteToggle(track.id)}
                                onSoloToggle={() => handleSoloToggle(track.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Panel>
    );
}

