/**
 * SequencerPanelSettingsDialog - Modal for editing sequence settings
 *
 * Provides UI for editing per-sequence settings:
 * - Name
 * - Tempo
 * - Time signature
 * - Loop settings
 * - Metadata (created/updated timestamps)
 */

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { Sequence } from "./types";

interface SequenceSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sequence: Sequence | null;
    onSave: (settings: SequenceSettings) => void;
}

export interface SequenceSettings {
    name: string;
    tempo: number;
    time_signature: string;
    loop_enabled: boolean;
    loop_start: number;
    loop_end: number;
}

export function SequencerPanelSettingsDialog({
    isOpen,
    onClose,
    sequence,
    onSave,
}: SequenceSettingsDialogProps) {
    const [name, setName] = useState("");
    const [tempo, setTempo] = useState("120");
    const [timeSignature, setTimeSignature] = useState("4/4");
    const [loopEnabled, setLoopEnabled] = useState(false);
    const [loopStart, setLoopStart] = useState("0");
    const [loopEnd, setLoopEnd] = useState("16");

    // Load sequence settings when dialog opens
    useEffect(() => {
        if (sequence) {
            setName(sequence.name);
            setTempo(sequence.tempo.toString());
            setTimeSignature(sequence.time_signature);
            setLoopEnabled(sequence.loop_enabled || false);
            setLoopStart((sequence.loop_start || 0).toString());
            setLoopEnd((sequence.loop_end || 16).toString());
        }
    }, [sequence]);

    const handleSave = () => {
        const settings: SequenceSettings = {
            name,
            tempo: parseFloat(tempo) || 120,
            time_signature: timeSignature,
            loop_enabled: loopEnabled,
            loop_start: parseFloat(loopStart) || 0,
            loop_end: parseFloat(loopEnd) || 16,
        };
        onSave(settings);
        onClose();
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return "N/A";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Sequence Settings</DialogTitle>
                    <DialogDescription>
                        Configure settings for this sequence
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Name */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="seq-name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="seq-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <Separator />

                    {/* Tempo */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="seq-tempo" className="text-right">
                            Tempo (BPM)
                        </Label>
                        <Input
                            id="seq-tempo"
                            type="number"
                            min="20"
                            max="999"
                            value={tempo}
                            onChange={(e) => setTempo(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    {/* Time Signature */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="seq-time-sig" className="text-right">
                            Time Signature
                        </Label>
                        <Input
                            id="seq-time-sig"
                            value={timeSignature}
                            onChange={(e) => setTimeSignature(e.target.value)}
                            placeholder="4/4"
                            className="col-span-3"
                        />
                    </div>

                    <Separator />

                    {/* Loop Settings */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="seq-loop" className="text-right">
                            Loop Enabled
                        </Label>
                        <div className="col-span-3">
                            <Switch
                                id="seq-loop"
                                checked={loopEnabled}
                                onCheckedChange={setLoopEnabled}
                            />
                        </div>
                    </div>

                    {loopEnabled && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="seq-loop-start" className="text-right">
                                    Loop Start (beats)
                                </Label>
                                <Input
                                    id="seq-loop-start"
                                    type="number"
                                    min="0"
                                    value={loopStart}
                                    onChange={(e) => setLoopStart(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="seq-loop-end" className="text-right">
                                    Loop End (beats)
                                </Label>
                                <Input
                                    id="seq-loop-end"
                                    type="number"
                                    min="0"
                                    value={loopEnd}
                                    onChange={(e) => setLoopEnd(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        </>
                    )}

                    <Separator />

                    {/* Metadata */}
                    <div className="grid grid-cols-4 items-center gap-4 text-sm text-muted-foreground">
                        <Label className="text-right">Created</Label>
                        <div className="col-span-3">{formatDate(sequence?.created_at)}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4 text-sm text-muted-foreground">
                        <Label className="text-right">Updated</Label>
                        <div className="col-span-3">{formatDate(sequence?.updated_at)}</div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

