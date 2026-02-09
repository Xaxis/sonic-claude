/**
 * Metering Panel
 *
 * Real-time audio level metering for all tracks and master.
 * Displays VU meters with peak and RMS levels.
 */

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { SubPanel } from "@/components/ui/sub-panel";
import { Meter } from "@/components/ui/meter";
import { useMeterWebSocket } from "@/hooks/useMeterWebsocket";
import { audioEngineService } from "@/services/api/audio-engine.service";

interface Track {
    id: string;
    name: string;
}

export function MeteringPanel() {
    const { meters, isConnected } = useMeterWebSocket();
    const [tracks, setTracks] = useState<Track[]>([]);

    // Load tracks
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
                }))
            );
        } catch (error) {
            console.error("Failed to load tracks:", error);
        }
    };

    return (
        <Panel title="METERING" className="flex flex-col">
            <div className="flex-1 p-4 overflow-auto">
                {/* Connection status */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                        TRACK METERS
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                        <div
                            className={`h-2 w-2 rounded-full ${
                                isConnected ? "bg-green-500" : "bg-red-500"
                            }`}
                        />
                        <span className="text-muted-foreground">
                            {isConnected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                </div>

                {/* Track meters */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {tracks.map((track) => {
                        const meterData = meters[track.id] || {
                            peakLeft: -96,
                            peakRight: -96,
                            rmsLeft: -96,
                            rmsRight: -96,
                        };

                        return (
                            <SubPanel key={track.id} title={track.name}>
                                <div className="flex flex-col items-center gap-2 p-3">
                                    <Meter
                                        peak={meterData.peakLeft}
                                        rms={meterData.rmsLeft}
                                        peakRight={meterData.peakRight}
                                        rmsRight={meterData.rmsRight}
                                        stereo
                                    />
                                    <div className="text-xs font-mono text-center">
                                        <div className="text-cyan-400">
                                            L: {meterData.peakLeft > -96 ? meterData.peakLeft.toFixed(1) : "-∞"}
                                        </div>
                                        <div className="text-purple-400">
                                            R: {meterData.peakRight > -96 ? meterData.peakRight.toFixed(1) : "-∞"}
                                        </div>
                                    </div>
                                </div>
                            </SubPanel>
                        );
                    })}
                </div>

                {/* Master meter */}
                {meters.master && (
                    <div className="mt-6">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                            MASTER
                        </h3>
                        <SubPanel title="MASTER OUTPUT" className="max-w-xs mx-auto">
                            <div className="flex flex-col items-center gap-2 p-4">
                                <Meter
                                    peak={meters.master.peakLeft}
                                    rms={meters.master.rmsLeft}
                                    peakRight={meters.master.peakRight}
                                    rmsRight={meters.master.rmsRight}
                                    stereo
                                    className="h-48"
                                />
                                <div className="text-sm font-mono text-center">
                                    <div className="text-cyan-400 font-bold">
                                        L: {meters.master.peakLeft > -96 ? meters.master.peakLeft.toFixed(1) : "-∞"} dB
                                    </div>
                                    <div className="text-purple-400 font-bold">
                                        R: {meters.master.peakRight > -96 ? meters.master.peakRight.toFixed(1) : "-∞"} dB
                                    </div>
                                </div>
                            </div>
                        </SubPanel>
                    </div>
                )}

                {/* Empty state */}
                {tracks.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <p className="text-sm">No tracks to meter</p>
                            <p className="text-xs mt-1">Create tracks in the Mixer panel</p>
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}

