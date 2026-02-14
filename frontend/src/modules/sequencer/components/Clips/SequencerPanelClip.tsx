/**
 * SequencerPanelClip - Individual clip component with waveform
 * 
 * Displays a clip with waveform visualization, handles selection and actions
 */

import { useEffect, useRef, useState } from "react";
import { Copy, Trash2, Volume2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { cn } from "@/lib/utils.ts";

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
    isEditingInPianoRoll?: boolean; // True if this clip is currently open in piano roll
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
    isEditingInPianoRoll = false,
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

    // Drag state - use state instead of ref so it triggers re-renders
    const [dragState, setDragState] = useState<{ startTime: number; duration: number } | null>(null);

    // Clear drag state when backend syncs (clip props match drag state)
    useEffect(() => {
        if (dragState && !isDragging && !isResizing) {
            // Check if backend has synced (within tolerance)
            const startTimeMatches = Math.abs(clip.start_time - dragState.startTime) < 0.01;
            const durationMatches = Math.abs(clip.duration - dragState.duration) < 0.01;

            if (startTimeMatches && durationMatches) {
                setDragState(null);
            }
        }
    }, [clip.start_time, clip.duration, dragState, isDragging, isResizing]);

    // Calculate clip position and width (use drag state if dragging, otherwise use clip props)
    const displayStartTime = dragState?.startTime ?? clip.start_time;
    const displayDuration = dragState?.duration ?? clip.duration;
    const left = displayStartTime * pixelsPerBeat * zoom;
    const width = displayDuration * pixelsPerBeat * zoom;

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
        // Use displayStartTime/displayDuration which includes any pending drag state
        // This ensures we start from the current visual position, not the backend position
        setDragStartTime(displayStartTime);
        setDragStartDuration(displayDuration);

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

            if (isDragging) {
                // Calculate new position with snap
                let newStartTime = Math.max(0, dragStartTime + deltaBeats);
                if (snapEnabled) {
                    newStartTime = Math.round(newStartTime * gridSize) / gridSize;
                }
                // Update drag state for immediate visual feedback
                setDragState({
                    startTime: newStartTime,
                    duration: clip.duration,
                });
            } else if (isResizing === "left") {
                // Resize from left (changes both start time and duration)
                let newStartTime = Math.max(0, dragStartTime + deltaBeats);
                if (snapEnabled) {
                    newStartTime = Math.round(newStartTime * gridSize) / gridSize;
                }
                const newDuration = Math.max(0.25, dragStartDuration - (newStartTime - dragStartTime));
                setDragState({
                    startTime: newStartTime,
                    duration: newDuration,
                });
            } else if (isResizing === "right") {
                // Resize from right (changes only duration)
                let newDuration = Math.max(0.25, dragStartDuration + deltaBeats);
                if (snapEnabled) {
                    newDuration = Math.round(newDuration * gridSize) / gridSize;
                }
                setDragState({
                    startTime: clip.start_time,
                    duration: newDuration,
                });
            }
        };

        const handleMouseUp = () => {
            // Apply final values to backend on mouse up
            if (isDragging && onMove && dragState) {
                onMove(clip.id, dragState.startTime);
            } else if (isResizing === "left" && onResize && onMove && dragState) {
                onMove(clip.id, dragState.startTime);
                onResize(clip.id, dragState.duration);
            } else if (isResizing === "right" && onResize && dragState) {
                onResize(clip.id, dragState.duration);
            }

            // Clean up drag state
            setIsDragging(false);
            setIsResizing(null);

            // Don't clear dragState here - let the useEffect clear it when backend syncs
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
        <>
            {/* Snap guide - show where clip will land when dragging */}
            {(isDragging || isResizing) && snapEnabled && dragState && (
                <div
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-teal-400/60 pointer-events-none z-10"
                    style={{
                        left: `${dragState.startTime * pixelsPerBeat * zoom}px`,
                    }}
                />
            )}

            <div
                className={cn(
                    "absolute top-1 bottom-1 rounded border-2 cursor-move overflow-hidden transition-all",
                    isEditingInPianoRoll
                        ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)] ring-2 ring-cyan-400/50"
                        : isSelected
                            ? "border-white shadow-lg"
                            : "border-white/40",
                    isDragging && "opacity-70",
                    isResizing && "opacity-70"
                )}
                style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    backgroundColor: isEditingInPianoRoll
                        ? `${trackColor}60` // Brighter when editing
                        : `${trackColor}40`, // Track color with 25% opacity
                    borderColor: isEditingInPianoRoll ? "#22d3ee" : trackColor,
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
        </>
    );
}

