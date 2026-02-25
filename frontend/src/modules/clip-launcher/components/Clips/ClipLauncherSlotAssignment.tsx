/**
 * ClipLauncherSlotAssignment - ASSIGNMENT VIEW mode for clip slots
 *
 * Digital overlay interface for assigning clips to slots.
 * Shows clip selector dropdown with preview.
 */

import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import { Music, AudioWaveform, X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
    // RENDER
    // ========================================================================
    return (
        <div
            onClick={handleSelect}
            className={cn(
                "relative h-full w-full rounded-md transition-all cursor-pointer",
                "flex flex-col p-2 gap-2",
                "bg-card border",
                isSelected
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-border/50 hover:border-border"
            )}
        >
            {/* Slot Label */}
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Slot {slotIndex + 1}
                </span>
                {assignedClip && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-4 w-4 p-0"
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

            {/* Clip Selector */}
            <Select
                value={assignedClipId || ""}
                onValueChange={handleAssignClip}
            >
                <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select clip..." />
                </SelectTrigger>
                <SelectContent>
                    {trackClips.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No clips on this track
                        </div>
                    ) : (
                        trackClips.map(clip => (
                            <SelectItem key={clip.id} value={clip.id}>
                                <div className="flex items-center gap-2">
                                    {clip.type === 'midi' ? (
                                        <Music size={12} className="text-primary" />
                                    ) : (
                                        <AudioWaveform size={12} className="text-secondary" />
                                    )}
                                    <span className="text-xs">{clip.name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        ({clip.duration.toFixed(1)}b)
                                    </span>
                                </div>
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>

            {/* Assigned Clip Info */}
            {assignedClip && (
                <div className="flex flex-col gap-1 p-1.5 rounded bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-1.5">
                        {assignedClip.type === 'midi' ? (
                            <Music size={10} className="text-primary" />
                        ) : (
                            <AudioWaveform size={10} className="text-secondary" />
                        )}
                        <span className="text-[10px] font-bold truncate">{assignedClip.name}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                        Duration: {assignedClip.duration.toFixed(2)} beats
                    </div>
                </div>
            )}
        </div>
    );
}

