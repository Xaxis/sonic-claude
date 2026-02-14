/**
 * TrackHeader Component
 * 
 * Professional DAW-style track header with clean hierarchical organization.
 * 
 * Layout Pattern (3 rows):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Row 1: IDENTITY                                             │
 * │   [Track Name] [Type Badge] [Instrument Selector] [Actions] │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Row 2: TRANSPORT                                            │
 * │   [M] [S] [R]                                               │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Row 3: MIXING                                               │
 * │   Vol [━━━━━━━] 100%    Pan [◉] C                          │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Architecture:
 * - Follows UI_DESIGN_SYSTEM.md patterns
 * - Uses Fader for volume (vertical in mixer, horizontal in sequencer)
 * - Uses Knob for pan (rotary control)
 * - Clean separation of concerns
 */

import { useState } from "react";
import { Volume2, VolumeX, Radio, Trash2, Edit2, Check, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { cn } from "@/lib/utils.ts";
import { InstrumentSelector } from "../Instruments/InstrumentSelector.tsx";

interface TrackHeaderProps {
    track: {
        id: string;
        name: string;
        type: "midi" | "audio" | "sample";
        is_muted: boolean;
        is_solo: boolean;
        is_armed: boolean;
        volume: number; // 0.0-2.0
        pan: number; // -1.0 to 1.0
        instrument?: string; // MIDI only
        sample_name?: string; // Sample only
        color?: string;
    };
    onToggleMute: (trackId: string) => void;
    onToggleSolo: (trackId: string) => void;
    onRename?: (trackId: string, newName: string) => void;
    onDelete?: (trackId: string) => void;
    onUpdateTrack?: (trackId: string, updates: { volume?: number; pan?: number; instrument?: string }) => void;
}

export function TrackHeader({
    track,
    onToggleMute,
    onToggleSolo,
    onRename,
    onDelete,
    onUpdateTrack,
}: TrackHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(track.name);

    const handleStartEdit = () => {
        setEditName(track.name);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (editName.trim() && onRename) {
            onRename(track.id, editName.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditName(track.name);
        setIsEditing(false);
    };

    // Type badge styling
    const typeBadgeClass = cn(
        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        track.type === "midi" && "bg-purple-500/20 text-purple-400 border border-purple-500/30",
        track.type === "audio" && "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        track.type === "sample" && "bg-green-500/20 text-green-400 border border-green-500/30"
    );

    return (
        <div
            className="flex flex-col gap-2 px-3 py-2.5 border-b border-border hover:bg-muted/30 transition-colors group"
            style={{ borderLeftColor: track.color, borderLeftWidth: "3px" }}
        >
            {/* ROW 1: IDENTITY - Track name, type, instrument */}
            <div className="flex items-center gap-2">
                {/* Type Badge */}
                <div className={typeBadgeClass}>{track.type}</div>

                {/* Track Name - Editable */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveEdit();
                                    if (e.key === "Escape") handleCancelEdit();
                                }}
                                autoFocus
                                className="flex-1 px-1.5 py-0.5 text-sm font-medium bg-background border border-primary rounded"
                            />
                            <IconButton icon={Check} onClick={handleSaveEdit} size="icon-xs" variant="ghost" />
                            <IconButton icon={X} onClick={handleCancelEdit} size="icon-xs" variant="ghost" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium truncate">{track.name}</div>
                            {onRename && (
                                <IconButton
                                    icon={Edit2}
                                    onClick={handleStartEdit}
                                    size="icon-xs"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            )}
                        </div>
                    )}
                    {/* Subtitle: Sample name or instrument */}
                    {track.type === "sample" && track.sample_name && (
                        <div className="text-[10px] text-muted-foreground truncate">{track.sample_name}</div>
                    )}
                </div>

                {/* Instrument Selector - MIDI tracks only */}
                {track.type === "midi" && onUpdateTrack && (
                    <InstrumentSelector
                        trackId={track.id}
                        currentInstrument={track.instrument}
                        onInstrumentChange={(trackId, instrument) => {
                            onUpdateTrack(trackId, { instrument });
                        }}
                    />
                )}

