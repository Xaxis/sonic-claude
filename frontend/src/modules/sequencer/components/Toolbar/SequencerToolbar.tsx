/**
 * SequencerToolbar - Toolbar for sequencer operations
 *
 * Handles sequence selection, track management, and zoom controls
 * Uses SequencerContext for state management
 */

import { Plus, ZoomIn, ZoomOut, Grid3x3, FolderOpen, Settings } from "lucide-react";
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
import { useSequencer } from '@/contexts/SequencerContext';
import type { Sequence } from "../../types.ts";

interface SequencerToolbarProps {
    sequences: Sequence[];
    activeSequenceId: string | null;
    onSequenceChange: (sequenceId: string) => void;
    onAddSequence: () => void;
    onManageSequences: () => void; // Open sequence manager modal
    onSequenceSettings: () => void; // Open sequence settings dialog
    onAddTrack: () => void;
}

export function SequencerToolbar({
    sequences,
    activeSequenceId,
    onSequenceChange,
    onAddSequence,
    onManageSequences,
    onSequenceSettings,
    onAddTrack,
}: SequencerToolbarProps) {
    // Get state and actions from global context
    const { zoom, snapEnabled, gridSize, setZoom, setSnapEnabled, setGridSize } = useSequencer();

    return (
        <div className="flex items-center justify-between gap-4">
            {/* Left: Sequence Selector */}
            <div className="flex items-center gap-2">
                <Label htmlFor="sequence-select" className="text-xs text-muted-foreground">
                    Sequence
                </Label>
                <Select value={activeSequenceId || ""} onValueChange={onSequenceChange}>
                    <SelectTrigger id="sequence-select" className="w-40 h-7 text-sm">
                        <SelectValue placeholder="Select sequence" />
                    </SelectTrigger>
                    <SelectContent>
                        {sequences.map((seq) => (
                            <SelectItem key={seq.id} value={seq.id}>
                                {seq.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <IconButton
                    icon={Plus}
                    tooltip="Create new sequence"
                    onClick={onAddSequence}
                    variant="ghost"
                    size="icon-sm"
                />
                <IconButton
                    icon={FolderOpen}
                    tooltip="Manage sequences (rename, delete, versions)"
                    onClick={onManageSequences}
                    variant="ghost"
                    size="icon-sm"
                />
                <IconButton
                    icon={Settings}
                    tooltip="Sequence settings (tempo, time signature, loop)"
                    onClick={onSequenceSettings}
                    variant="ghost"
                    size="icon-sm"
                    disabled={!activeSequenceId}
                />
            </div>

            {/* Right: Track and Zoom Controls */}
            <div className="flex items-center gap-2">
                <Button onClick={onAddTrack} size="sm" variant="default" disabled={!activeSequenceId}>
                    <Plus size={14} className="mr-1" />
                    Track
                </Button>
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={ZoomOut}
                        tooltip="Zoom out timeline"
                        onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                        variant="ghost"
                        size="icon-sm"
                        disabled={!activeSequenceId || zoom <= 0.25}
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
                        disabled={!activeSequenceId || zoom >= 4}
                    />
                </div>
                <IconButton
                    icon={Grid3x3}
                    tooltip={snapEnabled ? "Snap to grid: ON" : "Snap to grid: OFF"}
                    onClick={() => setSnapEnabled(!snapEnabled)}
                    variant={snapEnabled ? "default" : "ghost"}
                    size="icon-sm"
                    className={snapEnabled ? "bg-primary/20 text-primary" : ""}
                    disabled={!activeSequenceId}
                />
                <div className="flex items-center gap-1">
                    <Label htmlFor="grid-size-select" className="text-xs text-muted-foreground">
                        Grid
                    </Label>
                    <Select
                        value={gridSize.toString()}
                        onValueChange={(value) => setGridSize(parseInt(value))}
                        disabled={!activeSequenceId || !snapEnabled}
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
        </div>
    );
}

