/**
 * SequencerPanelTracks - Track list container
 *
 * Renders track headers using the professional TrackHeader component.
 * Handles delete confirmation dialog.
 */

import { Volume2 } from "lucide-react";
import { useState } from "react";
import { TrackHeader } from "./TrackHeader.tsx";
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
    type: "midi" | "audio" | "sample";
    is_muted: boolean;
    is_solo: boolean;
    is_armed: boolean;
    volume: number;
    pan: number;
    color?: string;
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [trackToDelete, setTrackToDelete] = useState<{ id: string; name: string } | null>(null);

    const handleDeleteClick = (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) {
            setTrackToDelete({ id: track.id, name: track.name });
            setDeleteDialogOpen(true);
        }
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
                    <TrackHeader
                        key={track.id}
                        track={track}
                        onToggleMute={onToggleMute}
                        onToggleSolo={onToggleSolo}
                        onRename={onRenameTrack}
                        onDelete={onDeleteTrack ? handleDeleteClick : undefined}
                        onUpdateTrack={onUpdateTrack}
                    />
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

