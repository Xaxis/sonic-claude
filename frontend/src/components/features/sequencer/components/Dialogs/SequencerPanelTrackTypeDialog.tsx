/**
 * SequencerPanelTrackTypeDialog - Dialog for selecting track type when adding a new track
 *
 * Allows user to choose between:
 * - MIDI Track (for synths & instruments)
 * - Sample Track (for audio samples & loops)
 */

import { Music, Disc3 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SequencerPanelTrackTypeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectMIDI: () => void;
    onSelectSample: () => void;
}

export function SequencerPanelTrackTypeDialog({
    isOpen,
    onClose,
    onSelectMIDI,
    onSelectSample,
}: SequencerPanelTrackTypeDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Track</DialogTitle>
                    <DialogDescription>
                        Choose the type of track you want to create
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <Button
                        onClick={onSelectMIDI}
                        variant="outline"
                        className="h-32 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary p-4"
                    >
                        <Music size={40} className="text-primary flex-shrink-0" />
                        <div className="text-center flex flex-col gap-1">
                            <div className="font-semibold text-sm">MIDI Track</div>
                            <div className="text-xs text-muted-foreground leading-tight">
                                Synths & instruments
                            </div>
                        </div>
                    </Button>
                    <Button
                        onClick={onSelectSample}
                        variant="outline"
                        className="h-32 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary p-4"
                    >
                        <Disc3 size={40} className="text-primary flex-shrink-0" />
                        <div className="text-center flex flex-col gap-1">
                            <div className="font-semibold text-sm">Sample Track</div>
                            <div className="text-xs text-muted-foreground leading-tight">
                                Audio samples & loops
                            </div>
                        </div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

