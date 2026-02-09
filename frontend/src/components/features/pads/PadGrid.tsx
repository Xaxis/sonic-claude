/**
 * PadGrid - 4x4 grid of programmable pads
 */

import { Play, Pause, Repeat, RotateCcw, Hand, ToggleLeft } from "lucide-react";
import type { PadConfig, Sample } from "@/types";

interface PadGridProps {
    pads: PadConfig[];
    selectedPadId: string | null;
    draggedSample: Sample | null;
    onPadClick: (pad: PadConfig) => void;
    onPadMouseDown: (pad: PadConfig) => void;
    onPadMouseUp: (pad: PadConfig) => void;
    onPadTouchStart: (pad: PadConfig) => void;
    onPadTouchEnd: (pad: PadConfig) => void;
    onPadDrop: (padId: string) => void;
    onPadDragOver: (e: React.DragEvent) => void;
}

// Helper to convert HSL to HSLA
const hslToHsla = (hsl: string, alpha: number): string => {
    const match = hsl.match(/hsl\(([^)]+)\)/);
    if (match) {
        return `hsla(${match[1]}, ${alpha})`;
    }
    return hsl;
};

// Get pad style based on state
const getPadStyle = (pad: PadConfig, isSelected: boolean) => {
    const baseColor = pad.color;
    
    if (pad.state === "playing") {
        return {
            backgroundColor: hslToHsla(baseColor, 0.2),
            borderColor: baseColor,
            boxShadow: `0 0 20px ${hslToHsla(baseColor, 0.5)}`,
        };
    }
    
    if (pad.state === "loaded") {
        return {
            backgroundColor: hslToHsla(baseColor, 0.1),
            borderColor: hslToHsla(baseColor, 0.5),
        };
    }
    
    // Empty state - subtle hint of color
    return {
        backgroundColor: hslToHsla(baseColor, 0.03),
        borderColor: hslToHsla(baseColor, 0.15),
    };
};

export function PadGrid({
    pads,
    selectedPadId,
    draggedSample,
    onPadClick,
    onPadMouseDown,
    onPadMouseUp,
    onPadTouchStart,
    onPadTouchEnd,
    onPadDrop,
    onPadDragOver,
}: PadGridProps) {
    return (
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">
            {pads.map((pad) => {
                const isSelected = selectedPadId === pad.id;
                const style = getPadStyle(pad, isSelected);

                return (
                    <div
                        key={pad.id}
                        onClick={() => onPadClick(pad)}
                        onMouseDown={() => onPadMouseDown(pad)}
                        onMouseUp={() => onPadMouseUp(pad)}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            onPadTouchStart(pad);
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            onPadTouchEnd(pad);
                        }}
                        onDrop={() => onPadDrop(pad.id)}
                        onDragOver={onPadDragOver}
                        className={`relative flex aspect-square max-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 transition-all ${
                            isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                        } ${
                            pad.state === "playing" ? "animate-pulse" : ""
                        } ${
                            draggedSample ? "hover:scale-105" : ""
                        }`}
                        style={style}
                    >
                        {/* Keyboard Key */}
                        <div className="absolute left-1 top-1 text-[10px] font-mono opacity-40">
                            {pad.keyboardKey?.toUpperCase()}
                        </div>

                        {/* Sample Name or Empty State */}
                        <div className="text-center">
                            {pad.state !== "empty" ? (
                                <>
                                    {pad.state === "playing" ? (
                                        <Pause className="mx-auto h-5 w-5 mb-1" />
                                    ) : (
                                        <Play className="mx-auto h-5 w-5 mb-1" />
                                    )}
                                    <div className="text-[10px] font-medium px-1 line-clamp-2">
                                        {pad.sampleName}
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted-foreground text-[10px] opacity-30">
                                    Empty
                                </div>
                            )}
                        </div>

                        {/* Playback Mode Indicator */}
                        {pad.state !== "empty" && (
                            <div className="absolute bottom-1 right-1">
                                {pad.playbackMode === "loop" && (
                                    <Repeat className="h-3 w-3 opacity-50" />
                                )}
                                {pad.playbackMode === "reverse" && (
                                    <RotateCcw className="h-3 w-3 opacity-50" />
                                )}
                                {pad.playbackMode === "gate" && (
                                    <Hand className="h-3 w-3 opacity-50" />
                                )}
                                {pad.playbackMode === "toggle" && (
                                    <ToggleLeft className="h-3 w-3 opacity-50" />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

