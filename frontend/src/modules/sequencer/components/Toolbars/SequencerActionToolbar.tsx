/**
 * SequencerActionToolbar - Toolbar for sequencer operations
 *
 * Handles track management, zoom controls, and grid settings
 * Uses Zustand store for state management
 * Owns its own dialog state for track creation
 */

import { useState, useCallback } from "react";
import { Plus, ZoomIn, ZoomOut, Grid3x3, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { SequencerTrackTypeDialog } from "../Dialogs/SequencerTrackTypeDialog.tsx";
import { SequencerSampleBrowser } from "../Dialogs/SequencerSampleBrowser.tsx";

export function SequencerActionToolbar() {
    // Get state and actions from Zustand store
    const activeComposition = useDAWStore(state => state.activeComposition);
    const tracks = useDAWStore(state => state.tracks);
    const zoom = useDAWStore(state => state.zoom);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);
    const setZoom = useDAWStore(state => state.setZoom);
    const setSnapEnabled = useDAWStore(state => state.setSnapEnabled);
    const setGridSize = useDAWStore(state => state.setGridSize);
    const createTrack = useDAWStore(state => state.createTrack);

    // Undo/Redo actions
    const undo = useDAWStore(state => state.undo);
    const redo = useDAWStore(state => state.redo);
    const canUndo = useDAWStore(state => state.canUndo());
    const canRedo = useDAWStore(state => state.canRedo());

    // Local dialog state
    const [showTrackTypeDialog, setShowTrackTypeDialog] = useState(false);
    const [showSampleBrowser, setShowSampleBrowser] = useState(false);

    const hasComposition = !!activeComposition;

    const handleAddTrack = useCallback(() => {
        setShowTrackTypeDialog(true);
    }, []);

    const handleAddMIDITrack = useCallback(async () => {
        if (!activeComposition) return;
        const name = `Track ${tracks.length + 1}`;
        await createTrack(name, "midi", "sine");
        setShowTrackTypeDialog(false);
    }, [activeComposition, tracks.length, createTrack]);

    const handleAddSampleTrack = useCallback(() => {
        if (!activeComposition) return;
        setShowTrackTypeDialog(false);
        setShowSampleBrowser(true);
    }, [activeComposition]);

    const handleSampleSelected = useCallback((sample: any) => {
        if (!activeComposition) return;
        const name = sample.name || `Track ${tracks.length + 1}`;
        createTrack(name, "audio");
        setShowSampleBrowser(false);
    }, [activeComposition, tracks.length, createTrack]);

    const handleUndo = useCallback(async () => {
        await undo();
    }, [undo]);

    const handleRedo = useCallback(async () => {
        await redo();
    }, [redo]);

    return (
        <>
            <div className="flex items-center gap-2">

                {/* Add Track Button */}
                <div className="flex items-center gap-1 mr-2">
                    <Button onClick={handleAddTrack} size="sm" variant="default" disabled={!hasComposition}>
                        <Plus size={14} className="mr-1" />
                        Track
                    </Button>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-border" />

                {/* Undo/Redo Buttons */}
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={Undo2}
                        tooltip="Undo (Cmd/Ctrl+Z)"
                        onClick={handleUndo}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canUndo}
                    />
                    <IconButton
                        icon={Redo2}
                        tooltip="Redo (Cmd/Ctrl+Shift+Z)"
                        onClick={handleRedo}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canRedo}
                    />
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-border" />

                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={ZoomOut}
                        tooltip="Zoom out timeline"
                        onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!hasComposition || zoom <= 0.25}
                    />
                    <span className="text-xs text-muted-foreground w-12 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <IconButton
                        icon={ZoomIn}
                        tooltip="Zoom in timeline"
                        onClick={() => setZoom(Math.min(4, zoom + 0.25))}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!hasComposition || zoom >= 4}
                    />
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-border" />

                {/* Snap to Grid */}
                <div className="flex items-center gap-1 ml-2">
                    <IconButton
                        icon={Grid3x3}
                        tooltip={snapEnabled ? "Snap to grid: ON" : "Snap to grid: OFF"}
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        variant={snapEnabled ? "default" : "ghost"}
                        size="icon-sm"
                        className={snapEnabled ? "bg-primary/20 text-primary" : ""}
                        disabled={!hasComposition}
                    />
                </div>

                {/* Grid Size */}
                <div className="flex items-center gap-1 ml-2">
                    <Label htmlFor="grid-size-select" className="text-xs text-muted-foreground">
                        Grid
                    </Label>
                    <Select
                        value={gridSize.toString()}
                        onValueChange={(value) => setGridSize(parseInt(value))}
                        disabled={!hasComposition || !snapEnabled}
                    >
                        <SelectTrigger id="grid-size-select" className="w-20 h-7 text-sm">
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
                onSelectSample={handleAddSampleTrack}
            />

            <SequencerSampleBrowser
                isOpen={showSampleBrowser}
                onClose={() => setShowSampleBrowser(false)}
                onSelectSample={handleSampleSelected}
            />
        </>
    );
}

