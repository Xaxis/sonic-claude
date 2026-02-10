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
    const activeSequence = sequences.find((s) => s.id === activeSequenceId);
    const clips = activeSequence?.clips || [];

    // Handlers
    const handleAddTrack = async () => {
        await createTrack(`Track ${tracks.length + 1}`, "audio");
    };

    const handleAddSequence = async () => {
        await createSequence(`Sequence ${sequences.length + 1}`, 120);
    };

    const handleToggleMute = async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) {
            await muteTrack(trackId, !track.is_muted);
        }
    };

    const handleToggleSolo = async (trackId: string) => {
        const track = tracks.find((t) => t.id === trackId);
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
        <div className="flex h-full flex-1 flex-col overflow-hidden">
            {/* Timeline Header - Toolbar */}
            <div className="border-border bg-muted/20 flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                    {/* Sequence Selector */}
                    {sequences.length > 0 ? (
                        <select
                            value={activeSequenceId || ""}
                            onChange={(e) => {
                                // TODO: Set active sequence
                                console.log("Select sequence:", e.target.value);
                            }}
                            className="bg-muted border-border rounded border px-2 py-1 text-xs"
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
                            className="bg-primary/20 hover:bg-primary/30 text-primary flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                            title="Create sequence"
                        >
                            <Plus size={14} />
                            <span>Sequence</span>
                        </button>
                    )}

                    <button
                        onClick={handleAddTrack}
                        className="bg-muted hover:bg-muted/80 flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                        title="Add track"
                    >
                        <Plus size={14} />
                        <span>Track</span>
                    </button>
                    <button
                        onClick={() => setZoom(Math.min(zoom * 1.2, 3))}
                        className="bg-muted hover:bg-muted/80 rounded px-2 py-1 text-xs transition-colors"
                        title="Zoom in"
                    >
                        +
                    </button>
                    <button
                        onClick={() => setZoom(Math.max(zoom / 1.2, 0.5))}
                        className="bg-muted hover:bg-muted/80 rounded px-2 py-1 text-xs transition-colors"
                        title="Zoom out"
                    >
                        -
                    </button>
                    <div className="ml-2 flex items-center gap-1">
                        <Grid3x3 size={14} className="text-muted-foreground" />
                        <span className="text-muted-foreground text-xs">Snap: 1/4</span>
                    </div>
                </div>
                <div className="text-muted-foreground font-mono text-xs">
                    {tracks.length} tracks • {clips.length} clips
                </div>
            </div>

            {/* Timeline Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Track List (Left) */}
                <div className="border-border flex w-48 flex-col border-r">
                    {/* Track list header */}
                    <div className="border-border bg-muted/30 flex h-8 items-center border-b px-2">
                        <span className="text-muted-foreground text-xs font-bold uppercase">
                            Tracks
                        </span>
                    </div>

                    {/* Track list */}
                    <div className="flex-1 overflow-y-auto">
                        {tracks.length === 0 ? (
                            <div className="flex h-full items-center justify-center p-4">
                                <div className="text-muted-foreground text-center">
                                    <p className="mb-2 text-xs">No tracks</p>
                                    <button
                                        onClick={handleAddTrack}
                                        className="bg-primary/20 hover:bg-primary/30 text-primary rounded px-2 py-1 text-xs"
                                    >
                                        Add Track
                                    </button>
                                </div>
                            </div>
                        ) : (
                            tracks.map((track) => {
                                // Generate color based on track ID
                                const colors = [
                                    "#ef4444",
                                    "#3b82f6",
                                    "#8b5cf6",
                                    "#10b981",
                                    "#f59e0b",
                                    "#ec4899",
                                ];
                                const colorIndex = parseInt(track.id.slice(-1), 16) % colors.length;
                                const trackColor = colors[colorIndex];

                                return (
                                    <div
                                        key={track.id}
                                        className="border-border hover:bg-muted/30 h-16 border-b px-2 py-1 transition-colors"
                                    >
                                        <div className="mb-1 flex items-center gap-2">
                                            <div
                                                className="h-2 w-2 flex-shrink-0 rounded-full"
                                                style={{ backgroundColor: trackColor }}
                                            />
                                            <span className="flex-1 truncate font-mono text-xs">
                                                {track.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleToggleMute(track.id)}
                                                className={cn(
                                                    "rounded px-1.5 py-0.5 text-[10px] transition-colors",
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
                                                    "rounded px-1.5 py-0.5 text-[10px] transition-colors",
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
                <div className="relative flex-1 overflow-auto">
                    {/* Timeline ruler */}
                    <div className="border-border bg-muted/30 sticky top-0 z-10 h-8 border-b">
                        <div className="relative h-full" style={{ width: `${32 * 16 * zoom}px` }}>
                            {Array.from({ length: 33 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="border-border absolute top-0 h-full border-l"
                                    style={{ left: `${i * 32 * zoom}px` }}
                                >
                                    <span className="text-muted-foreground ml-1 text-[10px]">
                                        {i * 4}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline tracks */}
                    <div className="relative" style={{ width: `${32 * 16 * zoom}px` }}>
                        {/* Playhead */}
                        <div
                            className="bg-primary pointer-events-none absolute top-0 bottom-0 z-20 w-0.5"
                            style={{ left: `${currentPosition * 8 * zoom}px` }}
                        >
                            <div className="bg-primary absolute -top-8 -left-1.5 h-3 w-3 rotate-45" />
                        </div>

                        {/* Track lanes */}
                        {tracks.length === 0 ? (
                            <div className="text-muted-foreground flex h-32 items-center justify-center text-xs">
                                Add tracks to start sequencing
                            </div>
                        ) : (
                            tracks.map((track) => {
                                // Generate color based on track ID
                                const colors = [
                                    "#ef4444",
                                    "#3b82f6",
                                    "#8b5cf6",
                                    "#10b981",
                                    "#f59e0b",
                                    "#ec4899",
                                ];
                                const colorIndex = parseInt(track.id.slice(-1), 16) % colors.length;
                                const trackColor = colors[colorIndex];

                                return (
                                    <div
                                        key={track.id}
                                        className="border-border hover:bg-muted/10 relative h-16 border-b transition-colors"
                                    >
                                        {/* Grid lines */}
                                        {Array.from({ length: 33 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="border-border/30 absolute top-0 bottom-0 border-l"
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
                                                        "absolute top-1 bottom-1 cursor-pointer rounded px-2 py-1 transition-all",
                                                        "border border-white/20 hover:brightness-110",
                                                        selectedClip === clip.id &&
                                                            "ring-primary ring-2"
                                                    )}
                                                    style={{
                                                        left: `${clip.start_time * 8 * zoom}px`,
                                                        width: `${clip.duration * 8 * zoom}px`,
                                                        backgroundColor: trackColor,
                                                    }}
                                                    onClick={() => setSelectedClip(clip.id)}
                                                >
                                                    <div className="flex h-full items-center justify-between">
                                                        <span className="truncate font-mono text-[10px] text-white">
                                                            {clip.name}
                                                        </span>
                                                        {selectedClip === clip.id && (
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDuplicateClip(
                                                                            clip.id
                                                                        );
                                                                    }}
                                                                    className="rounded p-0.5 hover:bg-white/20"
                                                                    title="Duplicate"
                                                                >
                                                                    <Copy
                                                                        size={10}
                                                                        className="text-white"
                                                                    />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClip(clip.id);
                                                                    }}
                                                                    className="rounded p-0.5 hover:bg-white/20"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2
                                                                        size={10}
                                                                        className="text-white"
                                                                    />
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
