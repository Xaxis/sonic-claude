/**
 * Sequencer Panel
 *
 * Timeline-based sequencer for arranging clips, patterns, and automation.
 * Shows horizontal timeline with tracks, clips, and playhead position.
 * Integrates with AudioEngineContext for real sequencer state and playback.
 */

import { useEffect, useState } from "react";
import { Plus, Copy, Trash2, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

export function SequencerPanel() {
    const {
        sequences,
        activeSequenceId,
        currentPosition,
        tracks,
        loadSequences,
        createSequence,
        muteTrack,
        soloTrack,
        createTrack,
    } = useAudioEngine();

    const [selectedClip, setSelectedClip] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1); // Zoom level for timeline

    // Load sequences on mount
    useEffect(() => {
        loadSequences();
    }, [loadSequences]);

    // Get active sequence
    const activeSequence = sequences.find(s => s.id === activeSequenceId);
    const clips = activeSequence?.clips || [];

    // Handlers
    const handleAddTrack = async () => {
        await createTrack(`Track ${tracks.length + 1}`, "audio");
    };

    const handleAddSequence = async () => {
        await createSequence(`Sequence ${sequences.length + 1}`, 120);
    };

    const handleToggleMute = async (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            await muteTrack(trackId, !track.is_muted);
        }
    };

    const handleToggleSolo = async (trackId: string) => {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            await soloTrack(trackId, !track.is_solo);
        }
    };

    const handleDuplicateClip = (clipId: string) => {
        console.log("Duplicate clip:", clipId);
        // TODO: Implement clip duplication via API
    };

    const handleDeleteClip = (clipId: string) => {
        console.log("Delete clip:", clipId);
        // TODO: Implement clip deletion via API
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-full">
            {/* Timeline Header - Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                    {/* Sequence Selector */}
                    {sequences.length > 0 ? (
                        <select
                            value={activeSequenceId || ""}
                            onChange={(e) => {
                                // TODO: Set active sequence
                                console.log("Select sequence:", e.target.value);
                            }}
                            className="px-2 py-1 text-xs bg-muted rounded border border-border"
                        >
                            <option value="">Select Sequence</option>
                            {sequences.map((seq) => (
                                <option key={seq.id} value={seq.id}>
                                    {seq.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <button
                            onClick={handleAddSequence}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary rounded transition-colors"
                            title="Create sequence"
                        >
                            <Plus size={14} />
                            <span>Sequence</span>
                        </button>
                    )}

                    <button
                        onClick={handleAddTrack}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                        title="Add track"
                    >
                        <Plus size={14} />
                        <span>Track</span>
                    </button>
                    <button
                        onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
                        className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                        title="Zoom in"
                    >
                        +
                    </button>
                    <button
                        onClick={() => setZoom(Math.max(zoom / 1.2, 0.5))}
                        className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                        title="Zoom out"
                    >
                        -
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                        <Grid3x3 size={14} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Snap: 1/4</span>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                    {tracks.length} tracks • {clips.length} clips
                </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Track List (Left) */}
                <div className="w-48 border-r border-border flex flex-col">
                    {/* Track list header */}
                    <div className="h-8 border-b border-border bg-muted/30 flex items-center px-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Tracks</span>
                    </div>

                    {/* Track list */}
                    <div className="flex-1 overflow-y-auto">
                        {tracks.length === 0 ? (
                            <div className="flex items-center justify-center h-full p-4">
                                <div className="text-center text-muted-foreground">
                                    <p className="text-xs mb-2">No tracks</p>
                                    <button
                                        onClick={handleAddTrack}
                                        className="px-2 py-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary rounded"
                                    >
                                        Add Track
                                    </button>
                                </div>
                            </div>
                        ) : (
                            tracks.map((track) => {
                                // Generate color based on track ID
                                const colors = ["#ef4444", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"];
                                const colorIndex = parseInt(track.id.slice(-1), 16) % colors.length;
                                const trackColor = colors[colorIndex];

                                return (
                                    <div
                                        key={track.id}
                                        className="h-16 border-b border-border px-2 py-1 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: trackColor }}
                                            />
                                            <span className="text-xs font-mono truncate flex-1">{track.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleToggleMute(track.id)}
                                                className={cn(
                                                    "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                                                    track.is_muted
                                                        ? "bg-destructive/30 text-destructive"
                                                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                                )}
                                            >
                                                M
                                            </button>
                                            <button
                                                onClick={() => handleToggleSolo(track.id)}
                                                className={cn(
                                                    "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                                                    track.is_solo
                                                        ? "bg-primary/30 text-primary"
                                                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                                )}
                                            >
                                                S
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Timeline Grid (Right) */}
                <div className="flex-1 overflow-auto relative">
                    {/* Timeline ruler */}
                    <div className="h-8 border-b border-border bg-muted/30 sticky top-0 z-10">
                        <div className="relative h-full" style={{ width: `${32 * 16 * zoom}px` }}>
                            {Array.from({ length: 33 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 h-full border-l border-border"
                                    style={{ left: `${i * 32 * zoom}px` }}
                                >
                                    <span className="text-[10px] text-muted-foreground ml-1">{i * 4}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline tracks */}
                    <div className="relative" style={{ width: `${32 * 16 * zoom}px` }}>
                        {/* Playhead */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                            style={{ left: `${currentPosition * 8 * zoom}px` }}
                        >
                            <div className="absolute -top-8 -left-1.5 w-3 h-3 bg-primary rotate-45" />
                        </div>

                        {/* Track lanes */}
                        {tracks.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">
                                Add tracks to start sequencing
                            </div>
                        ) : (
                            tracks.map((track) => {
                                // Generate color based on track ID
                                const colors = ["#ef4444", "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"];
                                const colorIndex = parseInt(track.id.slice(-1), 16) % colors.length;
                                const trackColor = colors[colorIndex];

                                return (
                                    <div
                                        key={track.id}
                                        className="h-16 border-b border-border relative hover:bg-muted/10 transition-colors"
                                    >
                                        {/* Grid lines */}
                                        {Array.from({ length: 33 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-0 bottom-0 border-l border-border/30"
                                                style={{ left: `${i * 32 * zoom}px` }}
                                            />
                                        ))}

                                        {/* Clips */}
                                        {clips
                                            .filter((clip) => clip.track_id === track.id)
                                            .map((clip) => (
                                                <div
                                                    key={clip.id}
                                                    className={cn(
                                                        "absolute top-1 bottom-1 rounded px-2 py-1 cursor-pointer transition-all",
                                                        "hover:brightness-110 border border-white/20",
                                                        selectedClip === clip.id && "ring-2 ring-primary"
                                                    )}
                                                    style={{
                                                        left: `${clip.start_time * 8 * zoom}px`,
                                                        width: `${clip.duration * 8 * zoom}px`,
                                                        backgroundColor: trackColor,
                                                    }}
                                                    onClick={() => setSelectedClip(clip.id)}
                                                >
                                                    <div className="flex items-center justify-between h-full">
                                                        <span className="text-[10px] font-mono text-white truncate">
                                                            {clip.name}
                                                        </span>
                                                        {selectedClip === clip.id && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDuplicateClip(clip.id);
                                                                    }}
                                                                    className="p-0.5 hover:bg-white/20 rounded"
                                                                    title="Duplicate"
                                                                >
                                                                    <Copy size={10} className="text-white" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClip(clip.id);
                                                                    }}
                                                                    className="p-0.5 hover:bg-white/20 rounded"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={10} className="text-white" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

