/**
 * SequencerTrackHeader Component
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads track from Zustand directly (no prop drilling)
 * - Calls all Zustand actions directly (no callback props)
 * - Only receives trackId (identifier) and local UI state/callbacks
 *
 * Professional DAW-style track header with clean hierarchical organization.
 */

import { useState } from "react";
import {  Trash2, Edit2, Check, X, MoreVertical, Copy, Settings, ChevronDown } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { SequencerInstrumentSelector } from "../Instruments/SequencerInstrumentSelector.tsx";
import { SequencerTrackButton } from "././SequencerTrackButton.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useDAWStore } from "@/stores/dawStore";

interface SequencerTrackHeaderProps {
    trackId: string;
    isExpanded?: boolean;
    onToggleExpand?: (trackId: string) => void;
    onDeleteClick?: (trackId: string) => void;
}

export function SequencerTrackHeader({
    trackId,
    isExpanded = false,
    onToggleExpand,
    onDeleteClick,
}: SequencerTrackHeaderProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const muteTrack = useDAWStore(state => state.muteTrack);
    const soloTrack = useDAWStore(state => state.soloTrack);
    const renameTrack = useDAWStore(state => state.renameTrack);
    const updateTrack = useDAWStore(state => state.updateTrack);

    // ========================================================================
    // DERIVED STATE: Find track by ID
    // ========================================================================
    const track = tracks.find(t => t.id === trackId);

    // ========================================================================
    // LOCAL UI STATE: Track name editing
    // ========================================================================
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(track?.name || "");

    // Guard: If track not found, render nothing
    if (!track) {
        return null;
    }

    // ========================================================================
    // HANDLERS: Track name editing
    // ========================================================================
    const handleStartEdit = () => {
        setEditName(track.name);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (editName.trim()) {
            await renameTrack(track.id, editName.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditName(track.name);
        setIsEditing(false);
    };

    // ========================================================================
    // HANDLERS: Track actions (call Zustand actions directly)
    // ========================================================================
    const handleToggleMute = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        await muteTrack(track.id, !track.is_muted);
    };

    const handleToggleSolo = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        await soloTrack(track.id, !track.is_solo);
    };

    const handleUpdateVolume = async (volume: number) => {
        await updateTrack(track.id, { volume });
    };

    const handleUpdatePan = async (pan: number) => {
        await updateTrack(track.id, { pan });
    };

    return (
        <div
            className={cn(
                "relative flex flex-col border-b border-border bg-background hover:bg-muted/30 transition-all group",
                isExpanded ? "h-32 px-3 py-2 gap-2" : "h-16 px-2 py-1 gap-1"
            )}
            style={{ borderLeftColor: track.color, borderLeftWidth: "3px" }}
            onContextMenu={(e) => {
                e.preventDefault();
                // Context menu will be handled by the dropdown
            }}
        >
            {/* Hover Action Menu - Top Right */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-0.5 rounded hover:bg-muted transition-colors">
                            <MoreVertical size={12} className="text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 mr-2">
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
                            onClick={() => onDeleteClick?.(track.id)}
                            className="text-xs py-1 text-red-500 focus:text-red-500"
                        >
                            <Trash2 size={10} className="mr-1.5" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* MINIMIZED MODE - Single row with essentials */}
            {!isExpanded && (
                <div className="flex items-center gap-2 h-full">
                    {/* Type Badge */}
                    <Badge variant={track.type} rounded="default" className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {track.type}
                    </Badge>

                    {/* Track Name - Always visible, click to expand */}
                    <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onToggleExpand?.(track.id)}
                        title="Click to expand track controls"
                    >
                        {isEditing ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveEdit();
                                    if (e.key === "Escape") handleCancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="w-full px-1.5 py-0.5 text-xs font-medium bg-background border border-primary rounded"
                            />
                        ) : (
                            <div className="text-sm font-medium truncate">{track.name}</div>
                        )}
                    </div>

                    {/* Mute/Solo - Always visible */}
                    <SequencerTrackButton
                        variant="mute"
                        active={track.is_muted}
                        onClick={handleToggleMute}
                        size="xs"
                    >
                        M
                    </SequencerTrackButton>

                    <SequencerTrackButton
                        variant="solo"
                        active={track.is_solo}
                        onClick={handleToggleSolo}
                        size="xs"
                    >
                        S
                    </SequencerTrackButton>
                </div>
            )}

            {/* EXPANDED MODE - Full controls */}
            {isExpanded && (
                <>
                    {/* ROW 1: IDENTITY */}
                    <div className="flex items-center gap-2">
                        {/* Collapse Button */}
                        <button
                            onClick={() => onToggleExpand?.(track.id)}
                            className="p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0"
                            title="Minimize track header"
                        >
                            <ChevronDown size={14} className="text-muted-foreground" />
                        </button>

                        <Badge variant={track.type} rounded="default" className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {track.type}
                        </Badge>

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
                                    <IconButton icon={Check} onClick={handleSaveEdit} size="icon-xs" variant="ghost" tooltip="Save" />
                                    <IconButton icon={X} onClick={handleCancelEdit} size="icon-xs" variant="ghost" tooltip="Cancel" />
                                </div>
                            ) : (
                                <div className="text-sm font-medium truncate">
                                    {track.name}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ROW 2: INSTRUMENT & TRANSPORT - Instrument, Mute, Solo, Arm */}
                    <div className="flex items-center gap-2">
                        {track.type === "midi" && (
                            <div className="flex items-center gap-2">
                                <SequencerInstrumentSelector
                                    trackId={track.id}
                                />
                            </div>
                        )}

                        {/* TRANSPORT - Mute, Solo, Arm */}
                        <div className="flex items-center gap-1.5">
                            <SequencerTrackButton
                                variant="mute"
                                active={track.is_muted}
                                onClick={handleToggleMute}
                                size="sm"
                                bordered
                            >
                                M
                            </SequencerTrackButton>

                            <SequencerTrackButton
                                variant="solo"
                                active={track.is_solo}
                                onClick={handleToggleSolo}
                                size="sm"
                                bordered
                            >
                                S
                            </SequencerTrackButton>

                            <SequencerTrackButton
                                variant="arm"
                                active={track.is_armed}
                                disabled
                                size="sm"
                                bordered
                            >
                                R
                            </SequencerTrackButton>
                        </div>
                    </div>

                    {/* ROW 3: MIXING - Volume and Pan */}
                    <div className="flex items-center gap-3 text-[10px]">
                        <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-muted-foreground w-7 flex-shrink-0">Vol</span>
                            <Slider
                                value={[track.volume * 100]}
                                onValueChange={async (values) => {
                                    await handleUpdateVolume(values[0] / 100);
                                }}
                                min={0}
                                max={200}
                                step={1}
                                className="flex-1"
                            />
                            <span className="text-muted-foreground w-10 text-right flex-shrink-0 font-mono">
                                {Math.round(track.volume * 100)}%
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-muted-foreground w-7 flex-shrink-0">Pan</span>
                            <Slider
                                value={[track.pan * 100]}
                                onValueChange={async (values) => {
                                    await handleUpdatePan(values[0] / 100);
                                }}
                                min={-100}
                                max={100}
                                step={1}
                                className="flex-1"
                            />
                            <span className="text-muted-foreground w-9 text-right flex-shrink-0 font-mono">
                                {track.pan === 0 ? "C" : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : `L${Math.round(Math.abs(track.pan) * 100)}`}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}


