/**
 * Sequencer Empty State
 * 
 * Displayed when no sequences exist yet
 */

import { Button } from "@/components/ui/button";
import { Music, Plus, FolderOpen } from "lucide-react";

interface SequencerEmptyStateProps {
    onCreateSequence: () => void;
    onOpenSequenceManager: () => void;
}

export function SequencerEmptyState({ onCreateSequence, onOpenSequenceManager }: SequencerEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 p-8">
            {/* Icon */}
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <div className="relative bg-muted/50 p-8 rounded-full border-2 border-primary/20">
                    <Music className="w-16 h-16 text-primary/60" />
                </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-2 max-w-md">
                <h3 className="text-2xl font-bold text-foreground">
                    No Sequences Yet
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    Create your first sequence to start composing. Sequences contain tracks, clips, and automation for your musical ideas.
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    onClick={onCreateSequence}
                    size="lg"
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Sequence
                </Button>
                <Button
                    onClick={onOpenSequenceManager}
                    size="lg"
                    variant="outline"
                    className="gap-2"
                >
                    <FolderOpen className="w-4 h-4" />
                    Manage Sequences
                </Button>
            </div>

            {/* Hint */}
            <div className="text-xs text-muted-foreground/60 mt-4">
                Tip: You can also create sequences from the toolbar above
            </div>
        </div>
    );
}

