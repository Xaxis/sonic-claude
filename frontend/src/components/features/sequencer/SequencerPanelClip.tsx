/**
 * SequencerPanelClip - Individual clip component with waveform
 * 
 * Displays a clip with waveform visualization, handles selection and actions
 */

import { useEffect, useRef, useState } from "react";
import { Copy, Trash2, Volume2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface MIDIEvent {
    note: number;
    note_name: string;
    start_time: number;
    duration: number;
    velocity: number;
    channel: number;
}

interface Clip {
    id: string;
    name: string;
    track_id: string;
    start_time: number;
    duration: number;
    type: "midi" | "audio";
    audio_file_path?: string;
    audio_offset?: number; // seconds
    midi_events?: MIDIEvent[];
    gain: number;
}

interface SequencerPanelClipProps {
    clip: Clip;
    trackColor?: string; // Track color for clip background
    isSelected: boolean;
    zoom: number;
    pixelsPerBeat: number;
    snapEnabled: boolean;
    gridSize: number; // Grid size: 4 = 1/4 note, 8 = 1/8 note, etc.
    onSelect: (clipId: string) => void;
    onDuplicate: (clipId: string) => void;
    onDelete: (clipId: string) => void;
    onMove?: (clipId: string, newStartTime: number) => void; // Drag to move
    onResize?: (clipId: string, newDuration: number) => void; // Resize duration
    onUpdateClip?: (clipId: string, updates: { gain?: number; audio_offset?: number; midi_events?: MIDIEvent[] }) => void; // Update clip properties
    onOpenPianoRoll?: (clipId: string) => void; // Open piano roll for MIDI clips
}

export function SequencerPanelClip({
    clip,
    trackColor = "#3b82f6",
    isSelected,
    zoom,
    pixelsPerBeat,
    snapEnabled,
    gridSize,
    onSelect,
    onDuplicate,
    onDelete,
    onMove,
    onResize,
    onUpdateClip,
    onOpenPianoRoll,
}: SequencerPanelClipProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<"left" | "right" | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartTime, setDragStartTime] = useState(0);
    const [dragStartDuration, setDragStartDuration] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);

    // Calculate clip position and width
    const left = clip.start_time * pixelsPerBeat * zoom;
    const width = clip.duration * pixelsPerBeat * zoom;

    // Load waveform data for audio clips
    useEffect(() => {
        if (clip.type === "audio" && clip.audio_file_path) {
            loadWaveform(clip.audio_file_path);
        }
    }, [clip.type, clip.audio_file_path]);

    // Render waveform when data or canvas size changes
    useEffect(() => {
        if (waveformData.length > 0 && canvasRef.current) {
            renderWaveform();
        }
    }, [waveformData, width]);

    const loadWaveform = async (sampleId: string) => {
        try {
            // Fetch audio file using sample ID
            const url = `http://localhost:8000/api/samples/${sampleId}/download`;
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`Failed to fetch audio file: ${response.statusText}`);
                return;
            }

            const arrayBuffer = await response.arrayBuffer();

            // Decode audio
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            await audioContext.close();

            // Extract waveform data (downsample to ~200 points)
            const channelData = audioBuffer.getChannelData(0);
            const samples = 200;
            const blockSize = Math.floor(channelData.length / samples);
            const waveform: number[] = [];

            for (let i = 0; i < samples; i++) {
                const start = i * blockSize;
                const end = start + blockSize;
                let sum = 0;
                for (let j = start; j < end; j++) {
                    sum += Math.abs(channelData[j]);
                }
                waveform.push(sum / blockSize);
            }

            setWaveformData(waveform);
        } catch (error) {
            console.error("Failed to load waveform:", error);
        }
    };

    const renderWaveform = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { width: canvasWidth, height: canvasHeight } = canvas;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw waveform with better visibility
        const barWidth = canvasWidth / waveformData.length;
        const centerY = canvasHeight / 2;

        // Draw waveform bars
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"; // Increased opacity for better visibility

        waveformData.forEach((value, index) => {
            const barHeight = value * canvasHeight * 0.9; // Scale to 90% of height for padding
            const x = index * barWidth;
            const y = centerY - barHeight / 2;
            ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
        });
    };

    // Drag and resize handlers
    const handleMouseDown = (e: React.MouseEvent, action: "move" | "resize-left" | "resize-right") => {
        e.stopPropagation();
        setDragStartX(e.clientX);
        setDragStartTime(clip.start_time);
        setDragStartDuration(clip.duration);

        if (action === "move") {
            setIsDragging(true);
        } else if (action === "resize-left") {
            setIsResizing("left");
        } else if (action === "resize-right") {
            setIsResizing("right");
        }
    };

    // Add global mouse event listeners for drag/resize
    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            const deltaBeats = deltaX / (pixelsPerBeat * zoom);

            if (isDragging && onMove) {
                // During drag, don't snap - use exact position for smooth dragging
                const newStartTime = Math.max(0, dragStartTime + deltaBeats);
                onMove(clip.id, newStartTime);
            } else if (isResizing === "left" && onResize && onMove) {
                // Resize from left (changes both start time and duration)
                const newStartTime = Math.max(0, dragStartTime + deltaBeats);
                const newDuration = Math.max(0.25, dragStartDuration - (newStartTime - dragStartTime));
                onMove(clip.id, newStartTime);
                onResize(clip.id, newDuration);
            } else if (isResizing === "right" && onResize) {
                // Resize from right (changes only duration)
                const newDuration = Math.max(0.25, dragStartDuration + deltaBeats);
                onResize(clip.id, newDuration);
            }
        };

        const handleMouseUp = () => {
            // Apply snap on mouse up if snap is enabled (gridSize determines snap resolution)
            if (snapEnabled) {
                if (isDragging && onMove) {
                    const snappedStartTime = Math.round(clip.start_time * gridSize) / gridSize;
                    onMove(clip.id, snappedStartTime);
                } else if (isResizing === "left" && onResize && onMove) {
                    const snappedStartTime = Math.round(clip.start_time * gridSize) / gridSize;
                    const snappedDuration = Math.round(clip.duration * gridSize) / gridSize;
                    onMove(clip.id, snappedStartTime);
                    onResize(clip.id, snappedDuration);
                } else if (isResizing === "right" && onResize) {
                    const snappedDuration = Math.round(clip.duration * gridSize) / gridSize;
                    onResize(clip.id, snappedDuration);
                }
            }

            setIsDragging(false);
            setIsResizing(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isResizing, dragStartX, dragStartTime, dragStartDuration, pixelsPerBeat, zoom, snapEnabled, clip.id, clip.start_time, clip.duration, onMove, onResize]);

    const handleClick = () => {
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;

        // Double-click detection (within 300ms)
        if (timeSinceLastClick < 300 && clip.type === "midi" && onOpenPianoRoll) {
            onOpenPianoRoll(clip.id);
        } else {
            onSelect(clip.id);
        }

        setLastClickTime(now);
    };

    return (
        <div
            className={cn(
                "absolute top-1 bottom-1 rounded border-2 cursor-move overflow-hidden transition-shadow",
                isSelected ? "border-white shadow-lg" : "border-white/40",
                isDragging && "opacity-70",
                isResizing && "opacity-70"
            )}
            style={{
                left: `${left}px`,
                width: `${width}px`,
                backgroundColor: `${trackColor}40`, // Track color with 25% opacity
                borderColor: trackColor,
            }}
            onClick={handleClick}
            onMouseDown={(e) => handleMouseDown(e, "move")}
        >
            {/* Left resize handle */}
            {onResize && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20"
                    onMouseDown={(e) => handleMouseDown(e, "resize-left")}
                />
            )}

            {/* Right resize handle */}
            {onResize && (
                <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-20"
                    onMouseDown={(e) => handleMouseDown(e, "resize-right")}
                />
            )}

            {/* Waveform Canvas */}
            {clip.type === "audio" && (
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={60}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                />
            )}

            {/* Clip Info */}
            <div className="relative z-10 px-2 py-1 text-xs font-medium text-white truncate pointer-events-none">
                {clip.name}
            </div>

            {/* Actions (show on hover/select) */}
            {isSelected && (
                <div className="absolute top-1 right-1 flex gap-1 z-20">
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(clip.id);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 bg-background/80 hover:bg-background"
                    >
                        <Copy size={10} className="text-white" />
                    </Button>
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(clip.id);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 bg-background/80 hover:bg-background"
                    >
                        <Trash2 size={10} className="text-white" />
                    </Button>
                </div>
            )}

            {/* Audio Offset/Trim Control (show when selected, audio clip, and wide enough) */}
            {isSelected && width > 100 && onUpdateClip && clip.type === "audio" && (
                <div
                    className="absolute bottom-8 left-2 right-2 flex items-center gap-1 z-20 bg-background/90 rounded px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <Scissors size={12} className="text-white flex-shrink-0" />
                    <Slider
                        value={[(clip.audio_offset || 0) * 10]}
                        onValueChange={(values) => {
                            const newOffset = values[0] / 10;
                            onUpdateClip(clip.id, { audio_offset: newOffset });
                        }}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                    />
                    <span className="text-[10px] text-white/80 w-10 text-right flex-shrink-0">
                        {((clip.audio_offset || 0)).toFixed(1)}s
                    </span>
                </div>
            )}

            {/* Gain Control (show when selected and wide enough) */}
            {isSelected && width > 100 && onUpdateClip && (
                <div
                    className="absolute bottom-1 left-2 right-2 flex items-center gap-1 z-20 bg-background/90 rounded px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <Volume2 size={12} className="text-white flex-shrink-0" />
                    <Slider
                        value={[clip.gain * 100]}
                        onValueChange={(values) => {
                            const newGain = values[0] / 100;
                            onUpdateClip(clip.id, { gain: newGain });
                        }}
                        min={0}
                        max={200}
                        step={1}
                        className="flex-1"
                    />
                    <span className="text-[10px] text-white/80 w-8 text-right flex-shrink-0">
                        {Math.round(clip.gain * 100)}%
                    </span>
                </div>
            )}
        </div>
    );
}

