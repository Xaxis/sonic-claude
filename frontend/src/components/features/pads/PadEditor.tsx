/**
 * PadEditor - Settings panel for selected pad
 */

import { Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { PadConfig, PlaybackMode } from "@/types";

interface PadEditorProps {
    pad: PadConfig;
    onUpdate: (padId: string, updates: Partial<PadConfig>) => void;
    onClear: (padId: string) => void;
}

export function PadEditor({ pad, onUpdate, onClear }: PadEditorProps) {
    return (
        <div className="space-y-3">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.15em] uppercase">
                <div className="flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5" />
                    Pad Settings - {pad.keyboardKey?.toUpperCase() || pad.id}
                </div>
                {pad.state !== "empty" && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onClear(pad.id)}
                        className="h-6 gap-1 text-xs"
                    >
                        <Trash2 className="h-3 w-3" />
                        Clear
                    </Button>
                )}
            </div>
            <div className="bg-accent/5 border-accent/10 space-y-3 rounded-lg border p-3">
                {/* Playback Mode */}
                <div className="space-y-2">
                    <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        Playback Mode
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                        {(["one-shot", "loop", "gate", "toggle", "reverse"] as PlaybackMode[]).map(
                            (mode) => (
                                <Button
                                    key={mode}
                                    size="sm"
                                    variant={pad.playbackMode === mode ? "default" : "outline"}
                                    onClick={() => onUpdate(pad.id, { playbackMode: mode })}
                                    className="h-7 text-[10px] uppercase"
                                >
                                    {mode}
                                </Button>
                            )
                        )}
                    </div>
                </div>

                {/* Volume */}
                <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs tracking-wider uppercase">
                        Volume
                    </label>
                    <Slider
                        value={pad.volume}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => onUpdate(pad.id, { volume: value })}
                    />
                    <div className="text-accent text-center font-mono text-xs font-bold">
                        {Math.round(pad.volume * 100)}%
                    </div>
                </div>

                {/* Pitch */}
                <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs tracking-wider uppercase">
                        Pitch (Semitones)
                    </label>
                    <Slider
                        value={pad.pitch}
                        min={-12}
                        max={12}
                        step={1}
                        onChange={(value) => onUpdate(pad.id, { pitch: value })}
                    />
                    <div className="text-accent text-center font-mono text-xs font-bold">
                        {pad.pitch > 0 ? "+" : ""}
                        {pad.pitch}
                    </div>
                </div>

                {/* Pan */}
                <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs tracking-wider uppercase">
                        Pan
                    </label>
                    <Slider
                        value={pad.pan}
                        min={-1}
                        max={1}
                        step={0.01}
                        onChange={(value) => onUpdate(pad.id, { pan: value })}
                    />
                    <div className="text-accent text-center font-mono text-xs font-bold">
                        {pad.pan < 0 ? "L" : pad.pan > 0 ? "R" : "C"}
                        {pad.pan !== 0 && ` ${Math.abs(Math.round(pad.pan * 100))}`}
                    </div>
                </div>

                {/* Attack */}
                <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs tracking-wider uppercase">
                        Attack
                    </label>
                    <Slider
                        value={pad.attack}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => onUpdate(pad.id, { attack: value })}
                    />
                    <div className="text-accent text-center font-mono text-xs font-bold">
                        {(pad.attack * 1000).toFixed(0)}ms
                    </div>
                </div>

                {/* Release */}
                <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs tracking-wider uppercase">
                        Release
                    </label>
                    <Slider
                        value={pad.release}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => onUpdate(pad.id, { release: value })}
                    />
                    <div className="text-accent text-center font-mono text-xs font-bold">
                        {(pad.release * 1000).toFixed(0)}ms
                    </div>
                </div>

                {/* Choke Group */}
                <div className="space-y-2">
                    <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        Choke Group
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                        <Button
                            size="sm"
                            variant={pad.chokeGroup === null ? "default" : "outline"}
                            onClick={() => onUpdate(pad.id, { chokeGroup: null })}
                            className="h-7 text-xs"
                        >
                            None
                        </Button>
                        {[1, 2, 3, 4].map((group) => (
                            <Button
                                key={group}
                                size="sm"
                                variant={pad.chokeGroup === group ? "default" : "outline"}
                                onClick={() => onUpdate(pad.id, { chokeGroup: group })}
                                className="h-7 text-xs"
                            >
                                {group}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

