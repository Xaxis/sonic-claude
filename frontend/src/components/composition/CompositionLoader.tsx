/**
 * Composition Loader Dialog
 *
 * First-run experience: "Create or Load Composition"
 * Shows when no composition is active
 */

import { useState, useEffect } from "react";
import { useDAWStore } from "@/stores/dawStore";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Plus, FolderOpen, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function CompositionLoader() {
    // Get state and actions from Zustand store
    const activeComposition = useDAWStore(state => state.activeComposition);
    const compositions = useDAWStore(state => state.compositions);
    const loadComposition = useDAWStore(state => state.loadComposition);
    const createComposition = useDAWStore(state => state.createComposition);
    const loadSynthDefs = useDAWStore(state => state.loadSynthDefs);
    const initialize = useDAWStore(state => state.initialize);

    const [newCompositionName, setNewCompositionName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    // Initialize: Load compositions list, SynthDefs, and auto-load last active composition
    useEffect(() => {
        const init = async () => {
            try {
                // Load SynthDefs (needed for instrument selector)
                await loadSynthDefs();

                // Initialize store (loads compositions + auto-loads last active)
                await initialize();
            } catch (error) {
                console.error("Failed to initialize compositions:", error);
            } finally {
                setIsInitializing(false);
            }
        };

        init();
    }, []); // Run once on mount

    // Dialog is open when no composition is active AND not initializing
    const isOpen = !activeComposition && !isInitializing;

    const handleCreate = async () => {
        if (!newCompositionName.trim()) return;

        setIsCreating(true);
        try {
            await createComposition(newCompositionName.trim());
            setNewCompositionName("");
            // Modal will close automatically when activeCompositionId is set
        } catch (error) {
            console.error("Failed to create composition:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleLoad = async (compositionId: string) => {
        await loadComposition(compositionId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-[600px]" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Music className="h-6 w-6" />
                        Welcome to Sonic Claude
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
                                        <Button
                                            key={comp.id}
                                            variant="outline"
                                            className="w-full justify-start h-auto py-3 px-4"
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
    );
}

