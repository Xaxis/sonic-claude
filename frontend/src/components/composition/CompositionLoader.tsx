/**
 * Composition Loader Dialog
 *
 * First-run experience: "Create or Load Composition"
 * Shows when no composition is active
 */

import { useState } from "react";
import { useDAWStore } from "@/stores/dawStore";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Plus, FolderOpen, Clock, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CompositionLoaderProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CompositionLoader({ open: controlledOpen, onOpenChange }: CompositionLoaderProps = {}) {
    // Get state and actions from Zustand store
    const activeComposition = useDAWStore(state => state.activeComposition);
    const compositions = useDAWStore(state => state.compositions);
    const loadComposition = useDAWStore(state => state.loadComposition);
    const createComposition = useDAWStore(state => state.createComposition);
    const deleteComposition = useDAWStore(state => state.deleteComposition);

    const [newCompositionName, setNewCompositionName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [compositionToDelete, setCompositionToDelete] = useState<{ id: string; name: string } | null>(null);

    // Initialization is now handled once in App.tsx via dawStore.initialize().
    // We read _isInitialized from the store so the dialog stays closed while
    // the startup auto-load is in progress.
    const isInitialized = useDAWStore(state => state._isInitialized);

    // Dialog is open when:
    // - Controlled mode: use controlledOpen prop
    // - Auto mode: initialization is done AND no composition is active
    const isOpen = controlledOpen !== undefined ? controlledOpen : (isInitialized && !activeComposition);

    const handleOpenChange = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open);
        }
        // In auto mode, don't allow closing if no composition is active
    };

    const handleCreate = async () => {
        if (!newCompositionName.trim()) return;

        setIsCreating(true);
        try {
            await createComposition(newCompositionName.trim());
            setNewCompositionName("");
            // Close dialog if controlled
            if (onOpenChange) {
                onOpenChange(false);
            }
        } catch (error) {
            console.error("Failed to create composition:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleLoad = async (compositionId: string) => {
        await loadComposition(compositionId);
        // Close dialog if controlled
        if (onOpenChange) {
            onOpenChange(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, compositionId: string, compositionName: string) => {
        e.stopPropagation();
        setCompositionToDelete({ id: compositionId, name: compositionName });
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!compositionToDelete) return;

        try {
            await deleteComposition(compositionToDelete.id);
            setDeleteDialogOpen(false);
            setCompositionToDelete(null);
        } catch (error) {
            console.error("Failed to delete composition:", error);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setCompositionToDelete(null);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[600px]" showCloseButton={controlledOpen !== undefined}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <Music className="h-6 w-6" />
                            {controlledOpen !== undefined ? "Manage Compositions" : "Welcome to Sonic Claude"}
                        </DialogTitle>
                        <DialogDescription>
                            Create a new composition or load an existing one to get started
                        </DialogDescription>
                    </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Create New Composition */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold uppercase tracking-wide">
                            <Plus className="inline h-4 w-4 mr-1" />
                            Create New Composition
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter composition name..."
                                value={newCompositionName}
                                onChange={(e) => setNewCompositionName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate();
                                }}
                                disabled={isCreating}
                            />
                            <Button
                                onClick={handleCreate}
                                disabled={!newCompositionName.trim() || isCreating}
                            >
                                Create
                            </Button>
                        </div>
                    </div>

                    {/* Load Existing Composition */}
                    {compositions.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold uppercase tracking-wide">
                                <FolderOpen className="inline h-4 w-4 mr-1" />
                                Load Existing Composition
                            </Label>
                            <div className="h-[300px] rounded-md border overflow-y-auto">
                                <div className="p-2 space-y-2">
                                    {compositions.map((comp) => (
                                        <div
                                            key={comp.id}
                                            className="flex items-center gap-2 w-full"
                                        >
                                            <Button
                                                variant="outline"
                                                className="flex-1 justify-start h-auto py-3 px-4"
                                                onClick={() => handleLoad(comp.id)}
                                            >
                                                <div className="flex flex-col items-start gap-1 w-full">
                                                    <div className="font-semibold">{comp.name}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDate(comp.updated_at)}
                                                    </div>
                                                </div>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-auto py-3 px-3 hover:bg-destructive/10 hover:text-destructive shrink-0"
                                                onClick={(e) => handleDeleteClick(e, comp.id, comp.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {compositions.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            No existing compositions found. Create your first one above!
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Composition?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>"{compositionToDelete?.name}"</strong>?
                        <br />
                        <br />
                        This will permanently delete the composition and all its history. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

