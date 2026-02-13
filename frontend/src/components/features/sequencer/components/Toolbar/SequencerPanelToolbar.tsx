/**
 * SequencerPanelToolbar - Toolbar for sequencer operations
 *
 * Handles sequence selection, track management, and zoom controls
 */

import { Plus, ZoomIn, ZoomOut, Grid3x3, FolderOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Sequence {
    id: string;
    name: string;
}

interface SequencerPanelToolbarProps {
    sequences: Sequence[];
    activeSequenceId: string | null;
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;
    onSequenceChange: (sequenceId: string) => void;
    onAddSequence: () => void;
    onManageSequences: () => void; // Open sequence manager modal
    onSequenceSettings: () => void; // Open sequence settings dialog
    onAddTrack: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onSnapToggle: () => void;
    onGridSizeChange: (gridSize: number) => void;
}

export function SequencerPanelToolbar({
    sequences,
    activeSequenceId,
    zoom,
    snapEnabled,
    gridSize,
    onSequenceChange,
    onAddSequence,
    onManageSequences,
    onSequenceSettings,
    onAddTrack,
    onZoomIn,
    onZoomOut,
    onSnapToggle,
    onGridSizeChange,
}: SequencerPanelToolbarProps) {
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
                <Button onClick={onAddTrack} size="sm" variant="default">
                    <Plus size={14} className="mr-1" />
                    Track
                </Button>
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={ZoomOut}
                        tooltip="Zoom out timeline"
                        onClick={onZoomOut}
                        variant="ghost"
                        size="icon-sm"
                        disabled={zoom <= 0.25}
                    />
                    <span className="text-xs text-muted-foreground w-12 text-center">
                        {Math.round(zoom * 100)}%
                    </span>
                    <IconButton
                        icon={ZoomIn}
                        tooltip="Zoom in timeline"
                        onClick={onZoomIn}
                        variant="ghost"
                        size="icon-sm"
                        disabled={zoom >= 4}
                    />
                </div>
                <IconButton
                    icon={Grid3x3}
                    tooltip={snapEnabled ? "Snap to grid: ON" : "Snap to grid: OFF"}
                    onClick={onSnapToggle}
                    variant={snapEnabled ? "default" : "ghost"}
                    size="icon-sm"
                    className={snapEnabled ? "bg-primary/20 text-primary" : ""}
                />
                <div className="flex items-center gap-1">
                    <Label htmlFor="grid-size-select" className="text-xs text-muted-foreground">
                        Grid
                    </Label>
                    <Select
                        value={gridSize.toString()}
                        onValueChange={(value) => onGridSizeChange(parseInt(value))}
                        disabled={!snapEnabled}
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

