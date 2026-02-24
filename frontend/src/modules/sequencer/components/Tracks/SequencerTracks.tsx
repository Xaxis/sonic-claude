/**
 * SequencerTracks - Track list container
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads tracks directly from store (no prop drilling)
 * - Calls track actions directly from store (no handler props)
 * - Only receives expandedTracks as prop (local UI state, not in Zustand)
 *
 * Renders track headers using the professional SequencerTrackHeader component.
 * Handles delete confirmation dialog.
 */

import { Volume2 } from "lucide-react";
import { useState } from "react";
import { SequencerTrackHeader } from "././SequencerTrackHeader.tsx";
import { useDAWStore } from '@/stores/dawStore';
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

interface SequencerTrackListProps {
    expandedTracks?: Set<string>; // Local UI state, not in Zustand
    onExpandedTracksChange?: (expandedTracks: Set<string>) => void;
}

export function SequencerTracks({
    expandedTracks: externalExpandedTracks,
    onExpandedTracksChange,
}: SequencerTrackListProps) {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const muteTrack = useDAWStore(state => state.muteTrack);
    const soloTrack = useDAWStore(state => state.soloTrack);
    const deleteTrack = useDAWStore(state => state.deleteTrack);
    const renameTrack = useDAWStore(state => state.renameTrack);
    const updateTrack = useDAWStore(state => state.updateTrack);

    // ========================================================================
    // LOCAL UI STATE: Delete dialog and track expansion
    // ========================================================================
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [trackToDelete, setTrackToDelete] = useState<{ id: string; name: string } | null>(null);
    const [internalExpandedTracks, setInternalExpandedTracks] = useState<Set<string>>(new Set());

    // Use external state if provided, otherwise use internal state
    const expandedTracks = externalExpandedTracks ?? internalExpandedTracks;
    const setExpandedTracks = onExpandedTracksChange ?? setInternalExpandedTracks;

    // ========================================================================
    // HANDLERS: Adapt store actions to component callbacks
    // ========================================================================
    const handleDeleteClick = (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) {
            setTrackToDelete({ id: track.id, name: track.name });
            setDeleteDialogOpen(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (trackToDelete) {
            await deleteTrack(trackToDelete.id);
        }
        setDeleteDialogOpen(false);
        setTrackToDelete(null);
    };

    const handleToggleExpand = (trackId: string) => {
        if (typeof setExpandedTracks === 'function') {
            const current = expandedTracks;
            const next = new Set(current);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            setExpandedTracks(next);
        }
    };

    const handleRenameTrack = async (trackId: string, newName: string) => {
        await renameTrack(trackId, newName);
    };

    const handleUpdateTrack = async (trackId: string, updates: { volume?: number; pan?: number; instrument?: string }) => {
        await updateTrack(trackId, updates);
    };

    const handleToggleMute = async (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            await muteTrack(trackId, !track.is_muted);
        }
    };

    const handleToggleSolo = async (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            await soloTrack(trackId, !track.is_solo);
        }
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
                        onToggleMute={handleToggleMute}
                        onToggleSolo={handleToggleSolo}
                        onRename={handleRenameTrack}
                        onDelete={handleDeleteClick}
                        onUpdateTrack={handleUpdateTrack}
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

