/**
 * Track List Component
 * Displays list of tracks with controls for volume, pan, mute, solo, arm
 */
import { Volume2, Trash2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Track } from "@/types";

interface TrackListProps {
    tracks: Track[];
    selectedTrackId: string | null;
    onSelectTrack: (trackId: string) => void;
    onUpdateTrack: (trackId: string, updates: Partial<Track>) => void;
    onDeleteTrack: (trackId: string) => void;
}

export function TrackList({
    tracks,
    selectedTrackId,
    onSelectTrack,
    onUpdateTrack,
    onDeleteTrack,
}: TrackListProps) {
    if (tracks.length === 0) {
        return (
            <div className="border-primary/10 flex w-64 flex-col items-center justify-center border-r p-4">
                <Music className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-center text-sm">
                    No tracks yet.<br />Click "Add Track" to start.
                </p>
            </div>
        );
    }

    return (
        <div className="border-primary/10 w-64 flex-shrink-0 overflow-y-auto border-r">
            {tracks.map((track) => (
                <div
                    key={track.id}
                    className={`border-primary/10 cursor-pointer border-b p-3 transition-colors ${
                        selectedTrackId === track.id
                            ? "bg-primary/10"
                            : "hover:bg-primary/5"
                    }`}
                    onClick={() => onSelectTrack(track.id)}
                    style={{ height: `${track.height}px` }}
                >
                    {/* Track Header */}
                    <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: track.color }}
                            />
                            <span className="text-primary text-sm font-medium">
                                {track.name}
                            </span>
                        </div>
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTrack(track.id);
                            }}
                            size="sm"
                            variant="ghost"
                            className="hover:bg-destructive/20 h-6 w-6 p-0"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>

                    {/* Instrument */}
                    <div className="text-muted-foreground mb-2 text-xs">
                        {track.instrument}
                    </div>

                    {/* Volume Control */}
                    <div className="mb-2 flex items-center gap-2">
                        <Volume2 className="text-muted-foreground h-3 w-3" />
                        <Slider
                            value={track.volume * 100}
                            onChange={(value) =>
                                onUpdateTrack(track.id, { volume: value / 100 })
                            }
                            min={0}
                            max={200}
                            step={1}
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                        <span className="text-muted-foreground w-8 text-xs">
                            {Math.round(track.volume * 100)}%
                        </span>
                    </div>

                    {/* Pan Control */}
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">PAN</span>
                        <Slider
                            value={track.pan * 100}
                            onChange={(value) =>
                                onUpdateTrack(track.id, { pan: value / 100 })
                            }
                            min={-100}
                            max={100}
                            step={1}
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                        <span className="text-muted-foreground w-8 text-xs">
                            {track.pan > 0 ? "R" : track.pan < 0 ? "L" : "C"}
                        </span>
                    </div>

                    {/* Track Controls */}
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTrack(track.id, { is_muted: !track.is_muted });
                            }}
                            size="sm"
                            variant={track.is_muted ? "default" : "outline"}
                            className="h-6 flex-1 text-xs"
                        >
                            M
                        </Button>
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTrack(track.id, { is_solo: !track.is_solo });
                            }}
                            size="sm"
                            variant={track.is_solo ? "default" : "outline"}
                            className="h-6 flex-1 text-xs"
                        >
                            S
                        </Button>
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateTrack(track.id, { is_armed: !track.is_armed });
                            }}
                            size="sm"
                            variant={track.is_armed ? "default" : "outline"}
                            className="h-6 flex-1 text-xs"
                        >
                            R
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

