/**
 * Sequencer Panel Sequence Manager
 *
 * Provides UI for:
 * - Creating new sequences
 * - Loading existing sequences
 * - Saving sequences (manual save + create version)
 * - Version history and rollback
 * - Autosave recovery
 * - Deleting sequences
 */

import { useState, useEffect } from "react";
import { Save, FolderOpen, Plus, Trash2, History, RotateCcw, Clock, Edit2, Check, X as XIcon, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
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
import { cn } from "@/lib/utils.ts";
import { audioEngineService } from "@/services/api/audio-engine.service.ts";
import { toast } from "sonner";

interface SequencerPanelSequenceManagerProps {
    isOpen: boolean;
    onClose: () => void;
    currentSequenceId: string | null;
    onSequenceChange: (sequenceId: string) => void;
}

interface SequenceInfo {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

interface VersionInfo {
    version: number;
    timestamp: string;
    file_path: string;
}

export function SequencerPanelSequenceManager({
    isOpen,
    onClose,
    currentSequenceId,
    onSequenceChange,
}: SequencerPanelSequenceManagerProps) {
    const [sequences, setSequences] = useState<SequenceInfo[]>([]);
    const [versions, setVersions] = useState<VersionInfo[]>([]);
    const [newSequenceName, setNewSequenceName] = useState("");
    const [selectedTab, setSelectedTab] = useState<"sequences" | "versions">("sequences");
    const [isLoading, setIsLoading] = useState(false);
    const [editingSequenceId, setEditingSequenceId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [sequenceToDelete, setSequenceToDelete] = useState<string | null>(null);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [versionToRestore, setVersionToRestore] = useState<number | null>(null);
    const [recoverDialogOpen, setRecoverDialogOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSequences();
            if (currentSequenceId) {
                loadVersions(currentSequenceId);
            }
        }
    }, [isOpen, currentSequenceId]);

    const loadSequences = async () => {
        try {
            const seqs = await audioEngineService.getSequences();
            setSequences(seqs as any[]);
        } catch (error) {
            console.error("Failed to load sequences:", error);
            toast.error("Failed to load sequences");
        }
    };

    const loadVersions = async (sequenceId: string) => {
        try {
            const response = await fetch(
                `http://localhost:8000/api/audio-engine/audio/sequencer/sequences/${sequenceId}/versions`
            );
            const data = await response.json();
            setVersions(data.versions || []);
        } catch (error) {
            console.error("Failed to load versions:", error);
        }
    };

    const handleCreateSequence = async () => {
        if (!newSequenceName.trim()) {
            toast.error("Please enter a sequence name");
            return;
        }

        setIsLoading(true);
        try {
            const sequence = await audioEngineService.createSequence({
                name: newSequenceName,
                tempo: 120,
                time_signature: "4/4",
            });
            toast.success(`Created sequence: ${newSequenceName}`);
            setNewSequenceName("");
            await loadSequences();
            onSequenceChange(sequence.id);
        } catch (error) {
            console.error("Failed to create sequence:", error);
            toast.error("Failed to create sequence");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSequence = async (createVersion: boolean = false) => {
        if (!currentSequenceId) {
            toast.error("No sequence selected");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(
                `http://localhost:8000/api/audio-engine/audio/sequencer/sequences/${currentSequenceId}/save?create_version=${createVersion}`,
                { method: "POST" }
            );
            const data = await response.json();

            if (createVersion) {
                toast.success("Sequence saved with new version");
                await loadVersions(currentSequenceId);
            } else {
                toast.success("Sequence saved");
            }
        } catch (error) {
            console.error("Failed to save sequence:", error);
            toast.error("Failed to save sequence");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRenameSequence = async (sequenceId: string, newName: string) => {
        if (!newName.trim()) {
            toast.error("Sequence name cannot be empty");
            return;
        }

        setIsLoading(true);
        try {
            await audioEngineService.updateSequence(sequenceId, { name: newName });
            toast.success("Sequence renamed");
            await loadSequences();
            setEditingSequenceId(null);
        } catch (error) {
            console.error("Failed to rename sequence:", error);
            toast.error("Failed to rename sequence");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSequence = async () => {
        if (!sequenceToDelete) return;

        setIsLoading(true);
        try {
            await audioEngineService.deleteSequence(sequenceToDelete);
            toast.success("Sequence deleted");
            await loadSequences();
            if (sequenceToDelete === currentSequenceId && sequences.length > 1) {
                const nextSeq = sequences.find((s) => s.id !== sequenceToDelete);
                if (nextSeq) {
                    onSequenceChange(nextSeq.id);
                }
            }
        } catch (error) {
            console.error("Failed to delete sequence:", error);
            toast.error("Failed to delete sequence");
        } finally {
            setIsLoading(false);
            setDeleteDialogOpen(false);
            setSequenceToDelete(null);
        }
    };

    const handleRestoreVersion = async () => {
        if (!currentSequenceId || versionToRestore === null) return;

        setIsLoading(true);
        try {
            const response = await fetch(
                `http://localhost:8000/api/audio-engine/audio/sequencer/sequences/${currentSequenceId}/versions/${versionToRestore}/restore`,
                { method: "POST" }
            );
            const data = await response.json();
            toast.success(`Restored to version ${versionToRestore}`);
            await loadVersions(currentSequenceId);
            window.location.reload(); // Reload to refresh sequence data
        } catch (error) {
            console.error("Failed to restore version:", error);
            toast.error("Failed to restore version");
        } finally {
            setIsLoading(false);
            setRestoreDialogOpen(false);
            setVersionToRestore(null);
        }
    };

    const handleRecoverAutosave = async () => {
        if (!currentSequenceId) return;

        setIsLoading(true);
        try {
            const response = await fetch(
                `http://localhost:8000/api/audio-engine/audio/sequencer/sequences/${currentSequenceId}/recover`,
                { method: "POST" }
            );
            const data = await response.json();
            toast.success("Recovered from autosave");
            window.location.reload(); // Reload to refresh sequence data
        } catch (error) {
            console.error("Failed to recover autosave:", error);
            toast.error("No autosave found or recovery failed");
        } finally {
            setIsLoading(false);
            setRecoverDialogOpen(false);
        }
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background border-border w-full max-w-3xl rounded-lg border shadow-lg">
                {/* Header */}
                <div className="border-border flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-bold">Sequence Manager</h2>
                    <Button onClick={onClose} variant="ghost" size="icon-sm">
                        <XIcon size={16} />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="border-border flex border-b">
                    <button
                        onClick={() => setSelectedTab("sequences")}
                        className={cn(
                            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                            selectedTab === "sequences"
                                ? "border-primary bg-muted border-b-2"
                                : "text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        <FolderOpen className="mr-2 inline" size={16} />
                        Sequences
                    </button>
                    <button
                        onClick={() => setSelectedTab("versions")}
                        className={cn(
                            "flex-1 px-4 py-2 text-sm font-medium transition-colors",
                            selectedTab === "versions"
                                ? "border-primary bg-muted border-b-2"
                                : "text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        <History className="mr-2 inline" size={16} />
                        Version History
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto p-4">
                    {selectedTab === "sequences" ? (
                        <div className="space-y-4">
                            {/* Create New Sequence */}
                            <div className="bg-muted/30 rounded-lg p-4">
                                <Label className="mb-2 block text-sm font-bold">Create New Sequence</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newSequenceName}
                                        onChange={(e) => setNewSequenceName(e.target.value)}
                                        placeholder="Sequence name..."
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleCreateSequence();
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={handleCreateSequence}
                                        disabled={isLoading || !newSequenceName.trim()}
                                    >
                                        <Plus size={16} className="mr-1" />
                                        Create
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* Sequence List */}
                            <div>
                                <Label className="mb-2 block text-sm font-bold">Existing Sequences</Label>
                                {sequences.length === 0 ? (
                                    <div className="text-muted-foreground text-center text-sm py-8">
                                        No sequences yet. Create one above to get started.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {sequences.map((seq) => (
                                            <div
                                                key={seq.id}
                                                className={cn(
                                                    "border-border hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-3 transition-colors",
                                                    seq.id === currentSequenceId && "bg-primary/10 border-primary"
                                                )}
                                            >
                                                {/* Name (editable) */}
                                                <div className="flex-1 min-w-0">
                                                    {editingSequenceId === seq.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                value={editingName}
                                                                onChange={(e) => setEditingName(e.target.value)}
                                                                className="h-7 text-sm"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        handleRenameSequence(seq.id, editingName);
                                                                    } else if (e.key === "Escape") {
                                                                        setEditingSequenceId(null);
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                onClick={() => handleRenameSequence(seq.id, editingName)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0"
                                                            >
                                                                <Check size={14} />
                                                            </Button>
                                                            <Button
                                                                onClick={() => setEditingSequenceId(null)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0"
                                                            >
                                                                <XIcon size={14} />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="font-medium truncate">{seq.name}</div>
                                                            <div className="text-muted-foreground text-xs">
                                                                Updated: {formatDate(seq.updated_at)}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {editingSequenceId !== seq.id && (
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <Button
                                                            onClick={() => {
                                                                setEditingSequenceId(seq.id);
                                                                setEditingName(seq.name);
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                            title="Rename"
                                                        >
                                                            <Edit2 size={14} />
                                                        </Button>
                                                        <Button
                                                            onClick={() => onSequenceChange(seq.id)}
                                                            variant={seq.id === currentSequenceId ? "default" : "ghost"}
                                                            size="sm"
                                                            className="h-7 w-7 p-0"
                                                            title="Load"
                                                        >
                                                            <FolderOpen size={14} />
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                setSequenceToDelete(seq.id);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Save Actions */}
                            <div className="bg-muted/30 rounded-lg p-4">
                                <Label className="mb-2 block text-sm font-bold">Save Current Sequence</Label>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleSaveSequence(false)}
                                        disabled={isLoading || !currentSequenceId}
                                        variant="default"
                                    >
                                        <Save size={16} className="mr-1" />
                                        Save
                                    </Button>
                                    <Button
                                        onClick={() => handleSaveSequence(true)}
                                        disabled={isLoading || !currentSequenceId}
                                        variant="secondary"
                                    >
                                        <History size={16} className="mr-1" />
                                        Save as Version
                                    </Button>
                                    <Button
                                        onClick={() => setRecoverDialogOpen(true)}
                                        disabled={isLoading || !currentSequenceId}
                                        variant="outline"
                                    >
                                        <RotateCcw size={16} className="mr-1" />
                                        Recover Autosave
                                    </Button>
                                </div>
                            </div>

                            <Separator />

                            {/* Version List */}
                            <div>
                                <Label className="mb-2 block text-sm font-bold">Version History</Label>
                                {versions.length === 0 ? (
                                    <div className="text-muted-foreground text-center text-sm">
                                        No versions saved yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {versions.reverse().map((version) => (
                                            <div
                                                key={version.version}
                                                className="border-border hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium">Version {version.version}</div>
                                                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                                        <Clock size={12} />
                                                        {formatDate(version.timestamp)}
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => {
                                                        setVersionToRestore(version.version);
                                                        setRestoreDialogOpen(true);
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <RotateCcw size={14} className="mr-1" />
                                                    Restore
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-border border-t p-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <HardDrive size={14} />
                        Sequences are automatically saved. Use "Save as Version" to create restore points.
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this sequence? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSequence} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Restore Version Confirmation Dialog */}
            <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restore Version</AlertDialogTitle>
                        <AlertDialogDescription>
                            Restore sequence to version {versionToRestore}? Current state will be saved as a new version.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestoreVersion}>
                            Restore
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Recover Autosave Confirmation Dialog */}
            <AlertDialog open={recoverDialogOpen} onOpenChange={setRecoverDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Recover Autosave</AlertDialogTitle>
                        <AlertDialogDescription>
                            Recover sequence from autosave? Current state will be saved as a version.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRecoverAutosave}>
                            Recover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
