/**
 * BrowserPreviewStrip
 *
 * Fixed bottom strip that shows the selected item and provides:
 *   - Play / Stop preview button
 *   - For instruments: note selector (C2-C6) + velocity
 *   - "Create Track" button (creates a new track in the active composition)
 *
 * Empty state shown when nothing is selected.
 */

import { Play, Square, Plus, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrowserItem } from "../types";
import { PREVIEW_NOTES } from "../types";

interface BrowserPreviewStripProps {
    item: BrowserItem | null;
    isPreviewing: boolean;
    previewNote: number;
    onPlayToggle: () => void;
    onPreviewNoteChange: (midi: number) => void;
    onCreateTrack: () => void;
    isCreating?: boolean;
}

export function BrowserPreviewStrip({
    item,
    isPreviewing,
    previewNote,
    onPlayToggle,
    onPreviewNoteChange,
    onCreateTrack,
    isCreating = false,
}: BrowserPreviewStripProps) {

    if (!item) {
        return (
            <div className="flex items-center justify-center h-[68px] border-t border-border/30 bg-muted/5 flex-shrink-0">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/30">
                    Select an item to preview
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 px-3 h-[68px] border-t border-border/30 bg-muted/5 flex-shrink-0">

            {/* Play / Stop */}
            <button
                onClick={onPlayToggle}
                className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors border",
                    isPreviewing
                        ? "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
                        : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
                )}
                title={isPreviewing ? "Stop preview" : "Play preview"}
            >
                {isPreviewing
                    ? <Square size={12} />
                    : <Play  size={12} className="translate-x-px" />
                }
            </button>

            {/* Item info */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-xs font-semibold truncate leading-none">
                    {item.displayName}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 truncate leading-none">
                    {item.subcategory}
                    {item.description ? ` · ${item.description}` : ""}
                </span>
            </div>

            {/* Note selector — instruments only */}
            {item.type === "instrument" && (
                <div className="flex flex-col gap-0.5 flex-shrink-0 items-center">
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 leading-none">
                        Note
                    </span>
                    <select
                        value={previewNote}
                        onChange={(e) => onPreviewNoteChange(Number(e.target.value))}
                        className="h-6 px-1 text-[10px] font-mono font-bold bg-background border border-border/40 rounded text-center cursor-pointer"
                    >
                        {PREVIEW_NOTES.map((n) => (
                            <option key={n.midi} value={n.midi}>
                                {n.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Create Track / Add to Composition */}
            <button
                onClick={onCreateTrack}
                disabled={isCreating || item.type === "sample"}
                title={
                    item.type === "sample"
                        ? "Drag sample to an audio track in the sequencer"
                        : "Create a new MIDI track with this instrument"
                }
                className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded border text-[10px] font-bold uppercase tracking-wider transition-colors",
                    item.type === "instrument"
                        ? "border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer"
                        : "border-border/20 text-muted-foreground/30 cursor-not-allowed opacity-40",
                )}
            >
                {item.type === "instrument"
                    ? <><Plus size={10} /> Add Track</>
                    : <><Music size={10} /> Drag to Track</>
                }
            </button>

        </div>
    );
}
