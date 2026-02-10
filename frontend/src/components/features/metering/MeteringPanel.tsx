/**
 * Metering Panel
 *
 * Real-time audio level metering with peak and RMS displays.
 * Integrates with AudioEngineContext for real-time WebSocket meter data.
 */

import { SubPanel } from "@/components/ui/sub-panel";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
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
    const allTrackIds = [...tracks.map(t => t.id), ...(masterTrack ? ["master"] : [])];

    return (
        <div className="flex-1 flex flex-col gap-2 overflow-hidden h-full p-2">
            <SubPanel title="Level Meters" className="flex-1 overflow-auto">
                {allTrackIds.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center text-muted-foreground">
                            <Activity size={48} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No tracks to meter</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {allTrackIds.map((trackId) => {
                            const meter = meters[trackId];
                            const track = trackId === "master" ? masterTrack : tracks.find(t => t.id === trackId);
                            const trackName = track?.name || trackId;

                            // Calculate peak and RMS in dB
                            const peakL = meter ? linearToDb(meter.peakL) : -Infinity;
                            const peakR = meter ? linearToDb(meter.peakR) : -Infinity;
                            const rmsL = meter ? linearToDb(meter.rmsL) : -Infinity;
                            const rmsR = meter ? linearToDb(meter.rmsR) : -Infinity;
                            const peakMax = Math.max(peakL, peakR);
                            const rmsAvg = (rmsL + rmsR) / 2;

                            return (
                                <div key={trackId} className="flex flex-col gap-2 bg-muted/20 rounded-lg p-2">
                                    {/* Meter Name */}
                                    <div className={`text-xs font-semibold uppercase text-center truncate ${trackId === "master" ? "text-primary" : "text-foreground"}`}>
                                        {trackName}
                                    </div>

                                    {/* Stereo Meter Bars */}
                                    <div className="flex gap-1 h-32">
                                        {/* Left Channel */}
                                        <div className="flex-1 bg-gray-900/50 rounded relative overflow-hidden">
                                            {/* RMS Level (background) */}
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 via-yellow-600 to-red-600 opacity-40 transition-all duration-75"
                                                style={{ height: `${dbToLevel(rmsL) * 100}%` }}
                                            />
                                            {/* Peak Level (foreground) */}
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                                                style={{ height: `${dbToLevel(peakL) * 100}%` }}
                                            />
                                            {/* Clip indicator */}
                                            {peakL > -0.5 && (
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] text-white/50 font-bold">
                                                L
                                            </div>
                                        </div>

                                        {/* Right Channel */}
                                        <div className="flex-1 bg-gray-900/50 rounded relative overflow-hidden">
                                            {/* RMS Level (background) */}
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 via-yellow-600 to-red-600 opacity-40 transition-all duration-75"
                                                style={{ height: `${dbToLevel(rmsR) * 100}%` }}
                                            />
                                            {/* Peak Level (foreground) */}
                                            <div
                                                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                                                style={{ height: `${dbToLevel(peakR) * 100}%` }}
                                            />
                                            {/* Clip indicator */}
                                            {peakR > -0.5 && (
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] text-white/50 font-bold">
                                                R
                                            </div>
                                        </div>
                                    </div>

                                    {/* Peak/RMS Values */}
                                    <div className="text-[10px] font-mono text-center space-y-0.5">
                                        <div className={`${peakMax > -0.5 ? "text-red-400 font-bold" : "text-cyan-400"}`}>
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

