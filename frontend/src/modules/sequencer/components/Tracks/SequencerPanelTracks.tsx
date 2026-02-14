/**
 * SequencerPanelTracks - Track headers with controls
 *
 * Displays track names and mute/solo/arm controls
 */

import { Volume2, VolumeX, Radio, Trash2, Edit2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { cn } from "@/lib/utils.ts";
import { useState } from "react";
import { InstrumentSelector } from "../Instruments/InstrumentSelector.tsx";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";

interface Track {
    id: string;
    name: string;
    is_muted: boolean;
    is_solo: boolean;
    is_armed: boolean;
    volume: number;
    pan: number;
    type?: string;
    sample_name?: string;
    instrument?: string; // MIDI track instrument (SynthDef name)
}

interface SequencerPanelTrackListProps {
    tracks: Track[];
    onToggleMute: (trackId: string) => void;
    onToggleSolo: (trackId: string) => void;
    onDeleteTrack?: (trackId: string) => void;
    onRenameTrack?: (trackId: string, newName: string) => void;
    onUpdateTrack?: (trackId: string, updates: { volume?: number; pan?: number; instrument?: string }) => void;
}

export function SequencerPanelTracks({
    tracks,
    onToggleMute,
    onToggleSolo,
    onDeleteTrack,
    onRenameTrack,
    onUpdateTrack,
}: SequencerPanelTrackListProps) {
    const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [trackToDelete, setTrackToDelete] = useState<{ id: string; name: string } | null>(null);

    const handleStartRename = (track: Track) => {
        setEditingTrackId(track.id);
        setEditingName(track.name);
    };

    const handleFinishRename = (trackId: string) => {
        if (editingName.trim() && onRenameTrack) {
            onRenameTrack(trackId, editingName.trim());
        }
        setEditingTrackId(null);
        setEditingName("");
    };

    const handleDeleteClick = (trackId: string, trackName: string) => {
        setTrackToDelete({ id: trackId, name: trackName });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (trackToDelete && onDeleteTrack) {
            onDeleteTrack(trackToDelete.id);
        }
        setDeleteDialogOpen(false);
        setTrackToDelete(null);
    };

    return (
        <div className="flex flex-col">
            {tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-muted-foreground">
                        <Volume2 size={48} className="mx-auto mb-4 opacity-20" />
                        <div className="text-base font-medium mb-1">No tracks yet</div>
                        <div className="text-xs text-muted-foreground/70">
                            Add a track to start sequencing
                        </div>
                    </div>
                </div>
            ) : (
                tracks.map((track) => (
                    <div
                        key={track.id}
                        className="flex flex-col gap-1 px-3 py-2 border-b border-border flex-shrink-0 hover:bg-muted/30 transition-colors group h-20"
                    >
                        {/* Top Row: Name and Controls */}
                        <div className="flex items-center gap-2">
                            {/* Track Name - Editable */}
                            <div className="flex-1 min-w-0">
                                {editingTrackId === track.id ? (
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={() => handleFinishRename(track.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleFinishRename(track.id);
                                            if (e.key === "Escape") setEditingTrackId(null);
                                        }}
                                        autoFocus
                                        className="w-full px-1 py-0.5 text-sm font-medium bg-background border border-primary rounded"
                                    />
                                ) : (
                                    <div className="text-sm font-medium truncate">{track.name}</div>
                                )}
                                {track.type === "sample" && track.sample_name && (
                                    <div className="text-xs text-muted-foreground truncate">
                                        {track.sample_name}
                                    </div>
                                )}
                            </div>

                            {/* Instrument Selector - MIDI tracks only */}
                            {track.type === "midi" && onUpdateTrack && (
                                <InstrumentSelector
                                    trackId={track.id}
                                    currentInstrument={track.instrument}
                                    onInstrumentChange={(trackId, instrument) => {
                                        onUpdateTrack(trackId, { instrument });
                                    }}
                                />
                            )}

                            {/* Controls */}
                            <div className="flex items-center gap-1">
                                {/* Mute */}
                                <IconButton
                                    icon={track.is_muted ? VolumeX : Volume2}
                                    tooltip={track.is_muted ? "Unmute track" : "Mute track"}
                                    onClick={() => onToggleMute(track.id)}
                                    variant="ghost"
                                    size="icon-sm"
                                    className={cn(
                                        track.is_muted && "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                                    )}
                                />

                                {/* Solo */}
                                <IconButton
                                    icon={Radio}
                                    tooltip={track.is_solo ? "Unsolo track" : "Solo track"}
                                    onClick={() => onToggleSolo(track.id)}
                                    variant="ghost"
                                    size="icon-sm"
                                    className={cn(
                                        track.is_solo && "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                                    )}
                                />

                                {/* Rename */}
                                <IconButton
                                    icon={Edit2}
                                    tooltip="Rename track"
                                    onClick={() => handleStartRename(track)}
                                    variant="ghost"
                                    size="icon-sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                />

                                {/* Delete */}
                                {onDeleteTrack && (
                                    <IconButton
                                        icon={Trash2}
                                        tooltip="Delete track"
                                        onClick={() => handleDeleteClick(track.id, track.name)}
                                        variant="ghost"
                                        size="icon-sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-500"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Bottom Row: Volume and Pan Sliders */}
                        {onUpdateTrack && (
                            <div className="flex items-center gap-2 text-xs">
                                {/* Volume Slider */}
                                <div className="flex items-center gap-1 flex-1">
                                    <span className="text-muted-foreground w-8 flex-shrink-0">Vol</span>
                                    <Slider
                                        value={[track.volume * 100]}
                                        onValueChange={(values) => {
                                            onUpdateTrack(track.id, { volume: values[0] / 100 });
                                        }}
                                        min={0}
                                        max={200}
                                        step={1}
                                        className="flex-1"
                                    />
                                    <span className="text-muted-foreground w-10 text-right flex-shrink-0">
                                        {Math.round(track.volume * 100)}%
                                    </span>
                                </div>

                                {/* Pan Slider */}
                                <div className="flex items-center gap-1 flex-1">
                                    <span className="text-muted-foreground w-8 flex-shrink-0">Pan</span>
                                    <Slider
                                        value={[track.pan * 100]}
                                        onValueChange={(values) => {
                                            onUpdateTrack(track.id, { pan: values[0] / 100 });
                                        }}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        className="flex-1"
                                    />
                                    <span className="text-muted-foreground w-10 text-right flex-shrink-0">
                                        {track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : 'C'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Track</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete track "{trackToDelete?.name}"? This will also delete all clips on this track. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

