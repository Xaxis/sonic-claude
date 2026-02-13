/**
 * useSequencerKeyboard Hook
 * 
 * Handles all keyboard shortcuts for the sequencer.
 * Separates keyboard event handling from main component logic.
 * 
 * Keyboard Shortcuts:
 * - Delete/Backspace: Delete selected clip
 * - Cmd+C / Ctrl+C: Copy selected clip
 * - Cmd+V / Ctrl+V: Paste clip
 * - Cmd+D / Ctrl+D: Duplicate selected clip
 * - Escape: Deselect clip
 */

import { useEffect } from "react";
import { toast } from "sonner";
import type { Clip } from "@/types/sequencer";

interface UseSequencerKeyboardProps {
    // State
    selectedClip: string | null;
    clipboardClip: Clip | null;
    activeSequenceId: string | null;
    clips: Clip[];
    
    // Actions
    setSelectedClip: (clipId: string | null) => void;
    setClipboardClip: (clip: Clip | null) => void;
    
    // Handlers
    handleDeleteClip: (clipId: string) => Promise<void>;
    handleDuplicateClip: (clipId: string) => Promise<void>;
    handlePasteClip: () => Promise<void>;
}

export function useSequencerKeyboard(props: UseSequencerKeyboardProps) {
    const {
        selectedClip,
        clipboardClip,
        activeSequenceId,
        clips,
        setSelectedClip,
        setClipboardClip,
        handleDeleteClip,
        handleDuplicateClip,
        handlePasteClip,
    } = props;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete selected clip (Delete or Backspace)
            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedClip && activeSequenceId) {
                    e.preventDefault();
                    handleDeleteClip(selectedClip);
                }
            }
            
            // Copy selected clip (Cmd+C or Ctrl+C)
            if ((e.metaKey || e.ctrlKey) && e.key === "c") {
                if (selectedClip && activeSequenceId) {
                    e.preventDefault();
                    const clip = clips.find((c) => c.id === selectedClip);
                    if (clip) {
                        setClipboardClip(clip);
                        toast.success("Clip copied");
                    }
                }
            }
            
            // Paste clip (Cmd+V or Ctrl+V)
            if ((e.metaKey || e.ctrlKey) && e.key === "v") {
                if (clipboardClip && activeSequenceId) {
                    e.preventDefault();
                    handlePasteClip();
                }
            }
            
            // Duplicate selected clip (Cmd+D or Ctrl+D)
            if ((e.metaKey || e.ctrlKey) && e.key === "d") {
                if (selectedClip && activeSequenceId) {
                    e.preventDefault();
                    handleDuplicateClip(selectedClip);
                }
            }
            
            // Deselect clip (Escape)
            if (e.key === "Escape") {
                setSelectedClip(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        selectedClip,
        clipboardClip,
        activeSequenceId,
        clips,
        setSelectedClip,
        setClipboardClip,
        handleDeleteClip,
        handleDuplicateClip,
        handlePasteClip,
    ]);
}

