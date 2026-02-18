/**
 * SequencerTracks - Track list container
 *
 * Renders track headers using the professional SequencerTrackHeader component.
 * Handles delete confirmation dialog.
 */

import { Volume2 } from "lucide-react";
import { useState } from "react";
import { SequencerTrackHeader } from "././SequencerTrackHeader.tsx";
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

interface SequencerTrackListProps {
    tracks: Track[];
    onToggleMute: (trackId: string) => void;
    onToggleSolo: (trackId: string) => void;
    onDeleteTrack?: (trackId: string) => void;
    onRenameTrack?: (trackId: string, newName: string) => void;
    onUpdateTrack?: (trackId: string, updates: { volume?: number; pan?: number; instrument?: string }) => void;
    expandedTracks?: Set<string>;
    onExpandedTracksChange?: (expandedTracks: Set<string>) => void;
}

export function SequencerTracks({
    tracks,
    onToggleMute,
    onToggleSolo,
    onDeleteTrack,
    onRenameTrack,
    onUpdateTrack,
    expandedTracks: externalExpandedTracks,
    onExpandedTracksChange,
}: SequencerTrackListProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [trackToDelete, setTrackToDelete] = useState<{ id: string; name: string } | null>(null);
    const [internalExpandedTracks, setInternalExpandedTracks] = useState<Set<string>>(new Set());

    // Use external state if provided, otherwise use internal state
    const expandedTracks = externalExpandedTracks ?? internalExpandedTracks;
    const setExpandedTracks = onExpandedTracksChange ?? setInternalExpandedTracks;

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

    const handleToggleExpand = (trackId: string) => {
        setExpandedTracks((prev) => {
            const next = new Set(prev);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            return next;
        });
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
                    <SequencerTrackHeader
                        key={track.id}
                        track={track}
                        onToggleMute={onToggleMute}
                        onToggleSolo={onToggleSolo}
                        onRename={onRenameTrack}
                        onDelete={onDeleteTrack ? handleDeleteClick : undefined}
                        onUpdateTrack={onUpdateTrack}
                        isExpanded={expandedTracks.has(track.id)}
                        onToggleExpand={handleToggleExpand}
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

