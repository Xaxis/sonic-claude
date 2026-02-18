/**
 * MixerToolbar - Toolbar for mixer operations
 *
 * Handles meter controls and view options
 * Uses MixerContext for state management
 */

import { Activity } from "lucide-react";
import { Label } from "@/components/ui/label.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { useMixerContext } from "../../contexts/MixerContext.tsx";

export function MixerToolbar() {
    const { state, actions, tracks } = useMixerContext();
    const { showMeters, meterMode } = state;
    const { setShowMeters, setMeterMode } = actions;

    return (
        <div className="flex items-center justify-between gap-4">
            {/* Left: Track Count */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                    {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                </span>
            </div>

            {/* Right: Meter Controls */}
            <div className="flex items-center gap-3">
                <Toggle
                    pressed={showMeters}
                    onPressedChange={setShowMeters}
                    size="sm"
                    aria-label="Toggle meters"
                >
                    <Activity size={14} className="mr-1.5" />
                    Meters
                </Toggle>
                <div className="flex items-center gap-2">
                    <Label htmlFor="meter-mode-select" className="text-xs text-muted-foreground">
                        Mode
                    </Label>
                    <Select
                        value={meterMode}
                        onValueChange={(value: "peak" | "rms" | "both") => setMeterMode(value)}
                        disabled={!showMeters}
                    >
                        <SelectTrigger id="meter-mode-select" className="w-20 h-7 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="peak">Peak</SelectItem>
                            <SelectItem value="rms">RMS</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

