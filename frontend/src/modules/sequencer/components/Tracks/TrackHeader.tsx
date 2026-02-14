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
import { Volume2, VolumeX, Radio, Trash2, Edit2, Check, X, MoreVertical, Copy, Settings } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { cn } from "@/lib/utils.ts";
import { InstrumentSelector } from "../Instruments/InstrumentSelector.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

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
            className="relative flex flex-col gap-1.5 px-2 py-1.5 border-b border-border hover:bg-muted/30 transition-colors group h-20"
            style={{ borderLeftColor: track.color, borderLeftWidth: "3px" }}
        >
            {/* Hover Action Menu - Top Right */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-0.5 rounded hover:bg-muted transition-colors">
                            <MoreVertical size={12} className="text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={handleStartEdit} className="text-xs py-1">
                            <Edit2 size={10} className="mr-1.5" />
                            Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs py-1">
                            <Copy size={10} className="mr-1.5" />
                            Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs py-1">
                            <Settings size={10} className="mr-1.5" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDelete?.(track.id)}
                            className="text-xs py-1 text-red-500 focus:text-red-500"
                        >
                            <Trash2 size={10} className="mr-1.5" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* ROW 1: IDENTITY - Track name, type, instrument */}
            <div className="flex items-center gap-1.5 pr-4">
                {/* Type Badge */}
                <div className={typeBadgeClass}>{track.type}</div>

                {/* Track Name - Editable - ALWAYS VISIBLE */}
                <div className="min-w-[80px] max-w-[120px]">
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
                                className="w-full px-1.5 py-0.5 text-xs font-medium bg-background border border-primary rounded"
                            />
                            <IconButton icon={Check} onClick={handleSaveEdit} size="icon-xs" variant="ghost" tooltip="Save" />
                            <IconButton icon={X} onClick={handleCancelEdit} size="icon-xs" variant="ghost" tooltip="Cancel" />
                        </div>
                    ) : (
                        <div className="text-xs font-medium truncate" title={track.name}>{track.name}</div>
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
            </div>

            {/* ROW 2: TRANSPORT - Mute, Solo, Arm */}
            <div className="flex items-center gap-1">
                {/* Mute */}
                <button
                    onClick={() => onToggleMute(track.id)}
                    className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide transition-all",
                        "border hover:border-yellow-500/50",
                        track.is_muted
                            ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50"
                            : "bg-muted/50 text-muted-foreground border-border"
                    )}
                    title={track.is_muted ? "Unmute track" : "Mute track"}
                >
                    M
                </button>

                {/* Solo */}
                <button
                    onClick={() => onToggleSolo(track.id)}
                    className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide transition-all",
                        "border hover:border-blue-500/50",
                        track.is_solo
                            ? "bg-blue-500/20 text-blue-500 border-blue-500/50"
                            : "bg-muted/50 text-muted-foreground border-border"
                    )}
                    title={track.is_solo ? "Unsolo track" : "Solo track"}
                >
                    S
                </button>

                {/* Arm (placeholder for future MIDI recording) */}
                <button
                    disabled
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-muted/30 text-muted-foreground/50 border border-border cursor-not-allowed"
                    title="Record arm (coming soon)"
                >
                    R
                </button>
            </div>

            {/* ROW 3: MIXING - Volume and Pan */}
            {onUpdateTrack && (
                <div className="flex items-center gap-2 text-[9px]">
                    {/* Volume Slider */}
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-muted-foreground w-5 flex-shrink-0 font-medium">Vol</span>
                        <Slider
                            value={[track.volume * 100]}
                            onValueChange={(values) => {
                                onUpdateTrack(track.id, { volume: values[0] / 100 });
                            }}
                            min={0}
                            max={200}
                            step={1}
                            className="flex-1 min-w-0"
                        />
                        <span className="text-muted-foreground w-8 text-right flex-shrink-0 font-mono text-[8px]">
                            {Math.round(track.volume * 100)}%
                        </span>
                    </div>

                    {/* Pan Slider */}
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-muted-foreground w-5 flex-shrink-0 font-medium">Pan</span>
                        <Slider
                            value={[track.pan * 100]}
                            onValueChange={(values) => {
                                onUpdateTrack(track.id, { pan: values[0] / 100 });
                            }}
                            min={-100}
                            max={100}
                            step={1}
                            className="flex-1 min-w-0"
                        />
                        <span className="text-muted-foreground w-7 text-right flex-shrink-0 font-mono text-[8px]">
                            {track.pan === 0 ? "C" : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : `L${Math.round(Math.abs(track.pan) * 100)}`}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}


