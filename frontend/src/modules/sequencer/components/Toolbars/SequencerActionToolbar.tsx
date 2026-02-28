/**
 * SequencerActionToolbar - Toolbar for sequencer operations
 *
 * Unified pill strip — mirrors the transport toolbar visual language.
 * Four logical sections separated by hairline dividers:
 *   [+ Track] | [Undo · Redo] | [Zoom −·%·+] | [Snap] | [Grid ──]
 *
 * Active state convention: bg-primary/20 + text-primary
 */

import { useState, useCallback } from "react";
import { Plus, ZoomIn, ZoomOut, Grid3x3, Undo2, Redo2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { cn } from "@/lib/utils.ts";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { SequencerTrackTypeDialog } from "../Dialogs/SequencerTrackTypeDialog.tsx";

/** Thin full-height hairline divider between strip sections */
function StripDivider() {
    return <div className="w-px self-stretch bg-border/30 flex-shrink-0" />;
}

export function SequencerActionToolbar() {
    const activeComposition = useDAWStore(state => state.activeComposition);
    const tracks            = useDAWStore(state => state.tracks);
    const zoom              = useDAWStore(state => state.zoom);
    const snapEnabled       = useDAWStore(state => state.snapEnabled);
    const gridSize          = useDAWStore(state => state.gridSize);
    const setZoom           = useDAWStore(state => state.setZoom);
    const setSnapEnabled    = useDAWStore(state => state.setSnapEnabled);
    const setGridSize       = useDAWStore(state => state.setGridSize);
    const createTrack       = useDAWStore(state => state.createTrack);
    const undo              = useDAWStore(state => state.undo);
    const redo              = useDAWStore(state => state.redo);
    const canUndo           = useDAWStore(state => state.canUndo);
    const canRedo           = useDAWStore(state => state.canRedo);

    const [showTrackTypeDialog, setShowTrackTypeDialog] = useState(false);
    const hasComposition = !!activeComposition;

    const handleAddTrack = useCallback(() => { setShowTrackTypeDialog(true); }, []);

    const handleAddMIDITrack = useCallback(async () => {
        if (!activeComposition) return;
        const midiCount = tracks.filter(t => t.type === "midi").length;
        await createTrack(`MIDI ${midiCount + 1}`, "midi", "sine");
        setShowTrackTypeDialog(false);
    }, [activeComposition, tracks, createTrack]);

    const handleAddAudioTrack = useCallback(async () => {
        if (!activeComposition) return;
        const audioCount = tracks.filter(t => t.type === "audio").length;
        await createTrack(`Audio ${audioCount + 1}`, "audio");
        setShowTrackTypeDialog(false);
    }, [activeComposition, tracks, createTrack]);

    const handleUndo = useCallback(async () => { await undo(); }, [undo]);
    const handleRedo = useCallback(async () => { await redo(); }, [redo]);

    return (
        <>
            {/* ── Single unified pill ──────────────────────────────────────────── */}
            <div className="flex items-center h-10 rounded-lg border border-border/30 bg-background/80 overflow-hidden">

                {/* 1. Add Track ──────────────────────────────────────────────────── */}
                <div className="flex items-center px-2.5 h-full">
                    <button
                        onClick={handleAddTrack}
                        disabled={!hasComposition}
                        className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium",
                            "bg-primary/15 text-primary hover:bg-primary/25 transition-colors",
                            "disabled:opacity-40 disabled:pointer-events-none"
                        )}
                    >
                        <Plus size={12} />
                        Track
                    </button>
                </div>

                <StripDivider />

                {/* 2. Undo · Redo ────────────────────────────────────────────────── */}
                <div className="flex items-center px-1.5 gap-0.5">
                    <IconButton
                        icon={Undo2}
                        tooltip="Undo (Cmd/Ctrl+Z)"
                        onClick={handleUndo}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canUndo}
                        className="rounded-sm"
                    />
                    <IconButton
                        icon={Redo2}
                        tooltip="Redo (Cmd/Ctrl+Shift+Z)"
                        onClick={handleRedo}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canRedo}
                        className="rounded-sm"
                    />
                </div>

                <StripDivider />

                {/* 3. Zoom − · % · + ─────────────────────────────────────────────── */}
                <div className="flex items-center px-1.5 gap-0.5">
                    <IconButton
                        icon={ZoomOut}
                        tooltip="Zoom out timeline"
                        onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!hasComposition || zoom <= 0.25}
                        className="rounded-sm"
                    />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground/70 w-10 text-center select-none">
                        {Math.round(zoom * 100)}%
                    </span>
                    <IconButton
                        icon={ZoomIn}
                        tooltip="Zoom in timeline"
                        onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!hasComposition || zoom >= 4}
                        className="rounded-sm"
                    />
                </div>

                <StripDivider />

                {/* 4. Snap toggle ─────────────────────────────────────────────────── */}
                <div className="flex items-center px-1.5">
                    <IconButton
                        icon={Grid3x3}
                        tooltip={snapEnabled ? "Snap to grid: ON" : "Snap to grid: OFF"}
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!hasComposition}
                        className={cn("rounded-sm", snapEnabled && "bg-primary/20 text-primary")}
                    />
                </div>

                <StripDivider />

                {/* 5. Grid size select ────────────────────────────────────────────── */}
                <div className="flex items-center px-2 gap-1.5 h-full">
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider select-none">
                        Grid
                    </span>
                    <Select
                        value={gridSize.toString()}
                        onValueChange={(value) => setGridSize(parseInt(value))}
                        disabled={!hasComposition || !snapEnabled}
                    >
                        <SelectTrigger className="h-6 w-14 border-0 bg-transparent shadow-none text-xs focus:ring-0 px-1 rounded-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1/1</SelectItem>
                            <SelectItem value="2">1/2</SelectItem>
                            <SelectItem value="4">1/4</SelectItem>
                            <SelectItem value="8">1/8</SelectItem>
                            <SelectItem value="16">1/16</SelectItem>
                            <SelectItem value="32">1/32</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Dialogs owned by toolbar */}
            <SequencerTrackTypeDialog
                isOpen={showTrackTypeDialog}
                onClose={() => setShowTrackTypeDialog(false)}
                onSelectMIDI={handleAddMIDITrack}
                onSelectAudio={handleAddAudioTrack}
            />
        </>
    );
}
