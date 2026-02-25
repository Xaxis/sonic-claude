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

// Same hardware color palette as PAD VIEW for consistency
const HARDWARE_COLORS = [
    'hsl(187 100% 50%)',  // Cyan
    'hsl(330 100% 60%)',  // Magenta
    'hsl(45 100% 55%)',   // Yellow
    'hsl(0 100% 60%)',    // Red
    'hsl(120 100% 45%)',  // Green
    'hsl(210 100% 55%)',  // Blue
    'hsl(30 100% 55%)',   // Orange
    'hsl(280 100% 65%)',  // Purple
    'hsl(160 100% 50%)',  // Teal
    'hsl(350 100% 65%)',  // Pink
    'hsl(270 100% 60%)',  // Violet
    'hsl(50 100% 60%)',   // Gold
    'hsl(10 100% 60%)',   // Coral
    'hsl(140 100% 50%)',  // Lime
    'hsl(200 100% 50%)',  // Sky Blue
    'hsl(300 100% 60%)',  // Fuchsia
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
    const selectedClipSlot = useDAWStore(state => state.selectedClipSlot);

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

    const isSelected = selectedClipSlot?.trackIndex === trackIndex && selectedClipSlot?.slotIndex === slotIndex;

    // Get hardware color for this track column (same as PAD VIEW)
    const trackColor = HARDWARE_COLORS[trackIndex % HARDWARE_COLORS.length];

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleSelect = () => {
        setSelectedClipSlot({ trackIndex, slotIndex });
    };

    const handleAssignClip = async (clipId: string) => {
        await assignClipToSlot(trackIndex, slotIndex, clipId);
    };

    const handleClearSlot = async () => {
        await assignClipToSlot(trackIndex, slotIndex, null);
    };

    // ========================================================================
    // RENDER: Professional assignment interface with track color coding
    // ========================================================================
    return (
        <div
            onClick={handleSelect}
            className={cn(
                "relative h-full w-full rounded transition-all cursor-pointer overflow-hidden",
                "flex flex-col",
                isSelected
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    : "hover:brightness-110"
            )}
            style={{
                backgroundColor: assignedClip ? `${trackColor}20` : '#1a1a1a',
                border: assignedClip
                    ? `2px solid ${trackColor}60`
                    : '2px solid #2a2a2a',
            }}
        >
            {/* Track Color Header Bar */}
            <div
                className="h-1 w-full"
                style={{ backgroundColor: trackColor }}
            />

            {/* Content */}
            <div className="flex flex-col p-2 gap-2 flex-1">
                {/* Slot Label + Clear Button */}
                <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Slot {slotIndex + 1}
                    </span>
                    {assignedClip && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClearSlot();
                            }}
                            title="Clear slot"
                        >
                            <X size={10} />
                        </Button>
                    )}
                </div>

                {/* Clip Selector Dropdown */}
                <Select
                    value={assignedClipId || ""}
                    onValueChange={handleAssignClip}
                >
                    <SelectTrigger
                        className="h-9 text-xs font-medium border-2"
                        style={{
                            borderColor: assignedClip ? `${trackColor}80` : 'hsl(var(--border))',
                            backgroundColor: assignedClip ? `${trackColor}10` : 'hsl(var(--background))',
                        }}
                    >
                        <SelectValue placeholder={
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Plus size={12} />
                                <span>Assign clip...</span>
                            </div>
                        } />
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

                {/* Assigned Clip Preview */}
                {assignedClip ? (
                    <div
                        className="flex flex-col gap-1.5 p-2 rounded-md border-2 flex-1 min-h-0"
                        style={{
                            backgroundColor: `${trackColor}15`,
                            borderColor: `${trackColor}60`,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            {assignedClip.type === 'midi' ? (
                                <Music size={12} className="text-primary flex-shrink-0" />
                            ) : (
                                <AudioWaveform size={12} className="text-secondary flex-shrink-0" />
                            )}
                            <span className="text-[11px] font-bold truncate">{assignedClip.name}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                            {assignedClip.duration.toFixed(2)} beats
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center flex-1 min-h-0 p-2 rounded-md border-2 border-dashed border-border/30">
                        <span className="text-[10px] text-muted-foreground">Empty slot</span>
                    </div>
                )}
            </div>
        </div>
    );
}

