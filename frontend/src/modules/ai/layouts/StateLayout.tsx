/**
 * State Layout
 *
 * Live readout of what the AI sees - the complete DAW state snapshot.
 * Auto-refreshes every 2 seconds to show real-time state.
 */

import { useAIContext } from "../contexts/AIContext";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { RefreshCw } from "lucide-react";

export function StateLayout() {
    const { dawState, handlers, state, actions } = useAIContext();

    if (!dawState) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No DAW state available
            </div>
        );
    }

    const lastUpdate = new Date(dawState.timestamp).toLocaleTimeString();

    return (
        <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
                {/* Header with refresh controls */}
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="text-xs text-muted-foreground">
                        Last updated: {lastUpdate}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={actions.toggleAutoRefresh}
                        >
                            <Badge variant={state.autoRefreshEnabled ? "default" : "outline"} className="text-[10px]">
                                Auto-refresh {state.autoRefreshEnabled ? "ON" : "OFF"}
                            </Badge>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlers.handleRefreshState}
                            disabled={state.isLoadingState}
                        >
                            <RefreshCw size={14} className={state.isLoadingState ? "animate-spin" : ""} />
                        </Button>
                    </div>
                </div>

                {/* Global State */}
                <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Global State
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tempo:</span>
                            <span className="font-mono">{dawState.tempo} BPM</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Playing:</span>
                            <Badge variant={dawState.playing ? "default" : "outline"} className="text-[10px]">
                                {dawState.playing ? "YES" : "NO"}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Position:</span>
                            <span className="font-mono">{dawState.position.toFixed(2)} beats</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tracks:</span>
                            <span className="font-mono">{dawState.sequence?.tracks.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Clips:</span>
                            <span className="font-mono">{dawState.sequence?.clips.length || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Audio Features */}
                {dawState.audio && (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Audio Analysis
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Energy:</span>
                                <span className="font-mono">{dawState.audio.energy.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Brightness:</span>
                                <span className="font-mono">{dawState.audio.brightness.toFixed(3)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Loudness:</span>
                                <span className="font-mono">{dawState.audio.loudness_db.toFixed(1)} dB</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Is Playing:</span>
                                <Badge variant={dawState.audio.is_playing ? "default" : "outline"} className="text-[10px]">
                                    {dawState.audio.is_playing ? "YES" : "NO"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* Musical Context */}
                {dawState.musical && (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Musical Context
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Key:</span>
                                <span className="font-mono">{dawState.musical.key || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Scale:</span>
                                <span className="font-mono">{dawState.musical.scale || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Note Density:</span>
                                <span className="font-mono">{dawState.musical.note_density.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Complexity:</span>
                                <span className="font-mono">{dawState.musical.complexity.toFixed(2)}</span>
                            </div>
                            {dawState.musical.pitch_range && (
                                <div className="flex justify-between col-span-2">
                                    <span className="text-muted-foreground">Pitch Range:</span>
                                    <span className="font-mono">
                                        {dawState.musical.pitch_range[0]} - {dawState.musical.pitch_range[1]}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tracks */}
                {dawState.sequence && dawState.sequence.tracks.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Tracks ({dawState.sequence.tracks.length})
                        </div>
                        <div className="space-y-2">
                            {dawState.sequence.tracks.map((track) => (
                                <div key={track.id} className="rounded border border-border/50 p-2 text-xs">
                                    <div className="font-medium mb-1">{track.name}</div>
                                    <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                                        <div>Type: {track.type}</div>
                                        <div>Instrument: {track.instrument || "N/A"}</div>
                                        <div>Volume: {track.vol.toFixed(2)}</div>
                                        <div>Pan: {track.pan.toFixed(2)}</div>
                                        <div>
                                            <Badge variant={track.muted ? "destructive" : "outline"} className="text-[9px]">
                                                {track.muted ? "MUTED" : "ACTIVE"}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Badge variant={track.solo ? "default" : "outline"} className="text-[9px]">
                                                {track.solo ? "SOLO" : ""}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

