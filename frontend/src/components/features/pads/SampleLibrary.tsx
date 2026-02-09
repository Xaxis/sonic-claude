/**
 * SampleLibrary - Draggable sample library for pads
 */

import { Music, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Sample, PadConfig } from "@/types";

interface SampleLibraryProps {
    samples: Sample[];
    selectedPad: PadConfig | null;
    activePads: PadConfig[];
    onDragStart: (sample: Sample) => void;
    onDragEnd: () => void;
    onAssignSample: (sample: Sample) => void;
}

export function SampleLibrary({
    samples,
    selectedPad,
    activePads,
    onDragStart,
    onDragEnd,
    onAssignSample,
}: SampleLibraryProps) {
    return (
        <div className="space-y-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                <Music className="h-3.5 w-3.5" />
                Sample Library
            </div>
            <div className="bg-primary/5 border-primary/10 max-h-60 space-y-1 overflow-y-auto rounded-lg border p-2">
                {samples.length === 0 ? (
                    <div className="text-muted-foreground p-4 text-center text-xs">
                        No samples available. Record samples in the Studio tab.
                    </div>
                ) : (
                    samples.map((sample) => (
                        <div
                            key={sample.id}
                            draggable
                            onDragStart={() => onDragStart(sample)}
                            onDragEnd={onDragEnd}
                            onTouchStart={(e) => {
                                // Touch support for dragging
                                e.preventDefault();
                                onDragStart(sample);
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                onDragEnd();
                            }}
                            className="bg-background/50 hover:bg-background flex cursor-move items-center justify-between rounded border border-transparent p-2 transition-colors hover:border-primary/30"
                        >
                            <div className="flex-1">
                                <div className="text-xs font-medium">{sample.name}</div>
                                <div className="text-muted-foreground text-[10px]">
                                    {sample.duration.toFixed(2)}s • {sample.sample_rate}Hz
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onAssignSample(sample)}
                                className="h-6 gap-1 text-xs"
                            >
                                <Copy className="h-3 w-3" />
                                Assign
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

