/**
 * MixerToolbar - Toolbar for mixer operations
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (tracks, showMeters, meterMode)
 * - Calls actions directly from store
 * - No props needed
 *
 * Handles meter controls and view options
 */

import { Activity, Sliders } from "lucide-react";
import { Label } from "@/components/ui/label.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils";

export function MixerToolbar() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const showMeters = useDAWStore(state => state.showMeters);
    const meterMode = useDAWStore(state => state.meterMode);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const setShowMeters = useDAWStore(state => state.setShowMeters);
    const setMeterMode = useDAWStore(state => state.setMeterMode);

    // Count active tracks (not muted)
    const activeTracks = tracks.filter(t => !t.is_muted).length;
    const soloedTracks = tracks.filter(t => t.is_solo).length;

    return (
        <div className="flex items-center justify-between gap-4">
            {/* Left: Track Info */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                        {tracks.length} {tracks.length === 1 ? "Channel" : "Channels"}
                    </span>
                </div>

                {activeTracks < tracks.length && (
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                        {activeTracks} Active
                    </Badge>
                )}

                {soloedTracks > 0 && (
                    <Badge variant="default" className="text-[10px] font-semibold bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                        {soloedTracks} Solo
                    </Badge>
                )}
            </div>

            {/* Right: Meter Controls */}
            <div className="flex items-center gap-4">
                <Button
                    onClick={() => setShowMeters(!showMeters)}
                    variant={showMeters ? "default" : "outline"}
                    size="sm"
                    className={cn(
                        "gap-1.5",
                        showMeters && "shadow-[0_0_10px_rgba(0,245,255,0.5)]"
                    )}
                >
                    <Activity size={14} />
                    <span className="font-semibold">Meters</span>
                </Button>

                {showMeters && (
                    <div className="flex items-center gap-2">
                        <Label htmlFor="meter-mode-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Mode
                        </Label>
                        <Select
                            value={meterMode}
                            onValueChange={(value: "peak" | "rms" | "both") => setMeterMode(value)}
                        >
                            <SelectTrigger id="meter-mode-select" className="w-20 h-7 text-xs font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="peak">Peak</SelectItem>
                                <SelectItem value="rms">RMS</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
        </div>
    );
}

