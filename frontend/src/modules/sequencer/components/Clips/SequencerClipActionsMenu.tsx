/**
 * SequencerClipActionsMenu - Responsive dropdown menu for clip actions
 *
 * Provides a compact menu for clip actions when the clip is too narrow
 * to display inline buttons. Includes:
 * - Edit (rename)
 * - Copy
 * - Delete
 * - Volume slider
 * - Audio offset slider (for audio clips)
 *
 * This is a reusable pattern for any UI element that needs to collapse
 * into a menu when space is constrained.
 */

import { MoreVertical, Pencil, Copy, Trash2, Volume2, Scissors } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface SequencerClipActionsMenuProps {
    // Actions
    onEdit: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onVolumeChange: (value: number) => void;
    onAudioOffsetChange?: (value: number) => void;
    
    // Current values
    volume: number; // 0-2 (0-200%)
    audioOffset?: number; // seconds
    
    // Clip type
    clipType: "audio" | "midi";
    
    // Styling
    className?: string;
}

export function SequencerClipActionsMenu({
    onEdit,
    onCopy,
    onDelete,
    onVolumeChange,
    onAudioOffsetChange,
    volume,
    audioOffset,
    clipType,
    className,
}: SequencerClipActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "h-5 w-5 flex items-center justify-center rounded bg-black/60 hover:bg-black/80 transition-colors cursor-pointer",
                        className
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Clip actions"
                >
                    <MoreVertical size={12} className="text-white" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-56 bg-background/95 backdrop-blur-sm"
                align="end"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Edit/Rename */}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="cursor-pointer"
                >
                    <Pencil size={14} className="mr-2" />
                    <span>Rename</span>
                </DropdownMenuItem>

                {/* Copy */}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onCopy();
                    }}
                    className="cursor-pointer"
                >
                    <Copy size={14} className="mr-2" />
                    <span>Duplicate</span>
                </DropdownMenuItem>

                {/* Delete */}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="cursor-pointer text-red-400 focus:text-red-400"
                    variant="destructive"
                >
                    <Trash2 size={14} className="mr-2" />
                    <span>Delete</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Volume Control */}
                <div className="px-2 py-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Volume2 size={14} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Volume</span>
                        <span className="ml-auto text-xs text-white/80">
                            {Math.round(volume * 100)}%
                        </span>
                    </div>
                    <Slider
                        value={[volume * 100]}
                        onValueChange={(values) => {
                            onVolumeChange(values[0] / 100);
                        }}
                        min={0}
                        max={200}
                        step={1}
                        className="w-full"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>

                {/* Audio Offset Control (only for audio clips) */}
                {clipType === "audio" && onAudioOffsetChange && audioOffset !== undefined && (
                    <div className="px-2 py-2">
                        <div className="flex items-center gap-2 mb-1">
                            <Scissors size={14} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Offset</span>
                            <span className="ml-auto text-xs text-white/80">
                                {audioOffset.toFixed(1)}s
                            </span>
                        </div>
                        <Slider
                            value={[audioOffset * 10]}
                            onValueChange={(values) => {
                                onAudioOffsetChange(values[0] / 10);
                            }}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

