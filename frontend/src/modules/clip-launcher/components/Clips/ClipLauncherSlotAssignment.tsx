/**
 * ClipLauncherSlotAssignment - ASSIGNMENT VIEW mode for clip slots
 *
 * Professional digital overlay interface for assigning clips to slots.
 * Inspired by Akai Force's ASSIGN mode and Ableton Live's Session View editing.
 *
 * Features:
 * - Clear visual indication of assigned vs empty slots
 * - Dropdown selector with clip previews
 * - Track color coding for visual organization
 * - Clip type icons (MIDI/Audio)
 * - Duration display
 * - Quick clear button
 */

import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import { Music, AudioWaveform, X, Plus } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// THEME-MATCHED COLOR PALETTE (same as PAD VIEW)
const HARDWARE_COLORS = [
    'hsl(187 85% 55%)',   // Cyan (primary)
    'hsl(280 85% 65%)',   // Magenta (secondary)
    'hsl(45 95% 60%)',    // Yellow (accent)
    'hsl(0 85% 60%)',     // Red
    'hsl(120 85% 55%)',   // Green
    'hsl(210 85% 60%)',   // Blue
    'hsl(30 90% 60%)',    // Orange
    'hsl(270 85% 65%)',   // Purple
    'hsl(160 85% 55%)',   // Teal
    'hsl(330 85% 65%)',   // Pink
    'hsl(60 90% 60%)',    // Lime
    'hsl(180 85% 60%)',   // Aqua
    'hsl(300 85% 65%)',   // Fuchsia
    'hsl(15 90% 60%)',    // Coral
    'hsl(240 85% 65%)',   // Indigo
    'hsl(90 85% 55%)',    // Chartreuse
];

interface ClipLauncherSlotAssignmentProps {
    trackIndex: number;
    slotIndex: number;
}

export function ClipLauncherSlotAssignment({ trackIndex, slotIndex }: ClipLauncherSlotAssignmentProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const clipSlots = useDAWStore(state => state.clipSlots);
    const selectedClipSlots = useDAWStore(state => state.selectedClipSlots);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const assignClipToSlot = useDAWStore(state => state.assignClipToSlot);
    const setSelectedClipSlot = useDAWStore(state => state.setSelectedClipSlot);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const track = tracks[trackIndex];
    if (!track) return null;

    // Get assigned clip ID from grid
    const assignedClipId = clipSlots[trackIndex]?.[slotIndex] || null;
    const assignedClip = assignedClipId ? clips.find(c => c.id === assignedClipId) : null;

    // Filter clips for this track only
    const trackClips = clips.filter(c => c.track_id === track.id);

    const isSelected = selectedClipSlots.get(trackIndex) === slotIndex;

    // Get hardware color for this track column (same as PAD VIEW)
    const trackColor = HARDWARE_COLORS[trackIndex % HARDWARE_COLORS.length];

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleSelect = () => {
        setSelectedClipSlot(trackIndex, slotIndex);
    };

    const handleAssignClip = async (clipId: string) => {
        await assignClipToSlot(trackIndex, slotIndex, clipId);
    };

    const handleClearSlot = async () => {
        await assignClipToSlot(trackIndex, slotIndex, null);
    };

    // ========================================================================
    // RENDER: Clean, minimal assignment interface (Akai Force style)
    // ========================================================================
    return (
        <div
            onClick={handleSelect}
            className={cn(
                "relative h-full w-full rounded transition-all cursor-pointer",
                "flex flex-col items-center justify-center gap-2 p-3"
            )}
            style={{
                backgroundColor: assignedClip ? `${trackColor}25` : '#1a1a1a',
                border: isSelected
                    ? `2px solid ${trackColor}`
                    : `2px solid ${assignedClip ? trackColor : '#2a2a2a'}`,
                boxShadow: isSelected ? `0 0 12px ${trackColor}` : 'none',
            }}
        >
            {/* Assigned Clip Display */}
            {assignedClip ? (
                <>
                    {/* Clip Icon */}
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${trackColor}40` }}
                    >
                        {assignedClip.type === 'midi' ? (
                            <Music size={16} style={{ color: trackColor }} />
                        ) : (
                            <AudioWaveform size={16} style={{ color: trackColor }} />
                        )}
                    </div>

                    {/* Clip Name */}
                    <div className="text-[10px] font-bold text-center truncate w-full" style={{ color: trackColor }}>
                        {assignedClip.name}
                    </div>

                    {/* Clear Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClearSlot();
                        }}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/50 hover:bg-destructive/80 flex items-center justify-center transition-colors"
                        title="Clear"
                    >
                        <X size={8} className="text-white" />
                    </button>
                </>
            ) : (
                <>
                    {/* Empty State - Dropdown Selector */}
                    <div className="flex flex-col items-center gap-2 w-full">
                        <Plus size={24} className="text-muted-foreground/50" />
                        <Select
                            value={assignedClipId || ""}
                            onValueChange={handleAssignClip}
                        >
                            <SelectTrigger
                                className="h-8 w-full text-xs border bg-background/50"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <SelectValue placeholder="Assign clip..." />
                            </SelectTrigger>
                            <SelectContent>
                                {trackClips.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-muted-foreground">
                                        No clips on this track
                                    </div>
                                ) : (
                                    trackClips.map(clip => (
                                        <SelectItem key={clip.id} value={clip.id}>
                                            <div className="flex items-center gap-2">
                                                {clip.type === 'midi' ? (
                                                    <Music size={14} className="text-primary" />
                                                ) : (
                                                    <AudioWaveform size={14} className="text-secondary" />
                                                )}
                                                <span className="text-xs font-medium">{clip.name}</span>
                                                <span className="text-[10px] text-muted-foreground ml-auto">
                                                    {clip.duration.toFixed(1)}b
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}
        </div>
    );
}

