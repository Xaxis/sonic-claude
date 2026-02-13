/**
 * Metering Panel
 *
 * Real-time audio level metering with peak and RMS displays.
 * Integrates with AudioEngineContext for real-time WebSocket meter data.
 */

import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { useAudioEngine } from "@/contexts/AudioEngineContext.tsx";
import { Activity } from "lucide-react";

export function MeteringPanel() {
    const { meters, tracks, masterTrack } = useAudioEngine();

    // Convert linear amplitude (0-1) to dB
    const linearToDb = (linear: number): number => {
        if (linear === 0) return -Infinity;
        return 20 * Math.log10(linear);
    };

    // Convert dB to 0-1 range for display (-60dB to 0dB)
    const dbToLevel = (db: number): number => {
        if (!isFinite(db)) return 0;
        return Math.max(0, Math.min(1, (db + 60) / 60));
    };

    // Get all track IDs including master
    const allTrackIds = [...tracks.map((t) => t.id), ...(masterTrack ? ["master"] : [])];

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <SubPanel title="Level Meters" className="flex-1 overflow-auto">
                {allTrackIds.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center p-8">
                        <div className="text-muted-foreground text-center">
                            <Activity size={48} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No tracks to meter</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 p-3 md:grid-cols-3 lg:grid-cols-4">
                        {allTrackIds.map((trackId) => {
                            const meter = meters[trackId];
                            const track =
                                trackId === "master"
                                    ? masterTrack
                                    : tracks.find((t) => t.id === trackId);
                            const trackName = track?.name || trackId;

                            // Calculate peak and RMS in dB
                            const peakL = meter ? linearToDb(meter.peakL) : -Infinity;
                            const peakR = meter ? linearToDb(meter.peakR) : -Infinity;
                            const rmsL = meter ? linearToDb(meter.rmsL) : -Infinity;
                            const rmsR = meter ? linearToDb(meter.rmsR) : -Infinity;
                            const peakMax = Math.max(peakL, peakR);
                            const rmsAvg = (rmsL + rmsR) / 2;

                            return (
                                <div
                                    key={trackId}
                                    className="bg-muted/20 flex flex-col gap-2 rounded-lg p-2"
                                >
                                    {/* Meter Name */}
                                    <div
                                        className={`truncate text-center text-xs font-semibold uppercase ${trackId === "master" ? "text-primary" : "text-foreground"}`}
                                    >
                                        {trackName}
                                    </div>

                                    {/* Stereo Meter Bars */}
                                    <div className="flex h-32 gap-1">
                                        {/* Left Channel */}
                                        <div className="relative flex-1 overflow-hidden rounded bg-gray-900/50">
                                            {/* RMS Level (background) */}
                                            <div
                                                className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-green-600 via-yellow-600 to-red-600 opacity-40 transition-all duration-75"
                                                style={{ height: `${dbToLevel(rmsL) * 100}%` }}
                                            />
                                            {/* Peak Level (foreground) */}
                                            <div
                                                className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                                                style={{ height: `${dbToLevel(peakL) * 100}%` }}
                                            />
                                            {/* Clip indicator */}
                                            {peakL > -0.5 && (
                                                <div className="absolute top-0 right-0 left-0 h-1 animate-pulse bg-red-500" />
                                            )}
                                            <div className="absolute right-0 bottom-0 left-0 text-center text-[8px] font-bold text-white/50">
                                                L
                                            </div>
                                        </div>

                                        {/* Right Channel */}
                                        <div className="relative flex-1 overflow-hidden rounded bg-gray-900/50">
                                            {/* RMS Level (background) */}
                                            <div
                                                className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-green-600 via-yellow-600 to-red-600 opacity-40 transition-all duration-75"
                                                style={{ height: `${dbToLevel(rmsR) * 100}%` }}
                                            />
                                            {/* Peak Level (foreground) */}
                                            <div
                                                className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                                                style={{ height: `${dbToLevel(peakR) * 100}%` }}
                                            />
                                            {/* Clip indicator */}
                                            {peakR > -0.5 && (
                                                <div className="absolute top-0 right-0 left-0 h-1 animate-pulse bg-red-500" />
                                            )}
                                            <div className="absolute right-0 bottom-0 left-0 text-center text-[8px] font-bold text-white/50">
                                                R
                                            </div>
                                        </div>
                                    </div>

                                    {/* Peak/RMS Values */}
                                    <div className="space-y-0.5 text-center font-mono text-[10px]">
                                        <div
                                            className={`${peakMax > -0.5 ? "font-bold text-red-400" : "text-cyan-400"}`}
                                        >
                                            Peak: {isFinite(peakMax) ? peakMax.toFixed(1) : "-∞"} dB
                                        </div>
                                        <div className="text-muted-foreground">
                                            RMS: {isFinite(rmsAvg) ? rmsAvg.toFixed(1) : "-∞"} dB
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SubPanel>
        </div>
    );
}
