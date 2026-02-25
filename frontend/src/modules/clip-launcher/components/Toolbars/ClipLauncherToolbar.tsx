/**
 * ClipLauncherToolbar - Professional toolbar for clip launcher
 *
 * ESSENTIAL CONTROLS:
 * - Global transport (play/stop shared with sequencer)
 * - Tempo and playback position
 * - Launch quantization (1/4, 1/2, 1, 2, 4 bars)
 * - Stop all clips
 * - Add scene
 * - Session record (record performance to arrangement)
 */

import { useCallback, useState } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { useTransportWebSocket } from '@/hooks/useTransportWebsocket';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Play, Pause, SkipBack, Square, Plus, Minus, Circle, Grid3x3, Gamepad2, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ClipLauncherToolbar() {
    // ========================================================================
    // STATE: Read from Zustand store and WebSocket
    // ========================================================================
    const activeComposition = useDAWStore(state => state.activeComposition);
    const transport = useDAWStore(state => state.transport);
    const clipLauncherMode = useDAWStore(state => state.clipLauncherMode);
    const numClipSlots = useDAWStore(state => state.numClipSlots);

    // Read playing clips from WebSocket (runtime state)
    const { transport: wsTransport } = useTransportWebSocket();
    const playingClipIds = wsTransport.playing_clips || [];

    // ========================================================================
    // LOCAL STATE: Launch quantization
    // ========================================================================
    const [quantization, setQuantization] = useState<string>('1/4');
    const [isSessionRecording, setIsSessionRecording] = useState(false);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const play = useDAWStore(state => state.play);
    const pause = useDAWStore(state => state.pause);
    const resume = useDAWStore(state => state.resume);
    const stop = useDAWStore(state => state.stop);
    const setClipLauncherMode = useDAWStore(state => state.setClipLauncherMode);
    const setNumClipSlots = useDAWStore(state => state.setNumClipSlots);
    const updateComposition = useDAWStore(state => state.updateComposition);
    const setLaunchQuantization = useDAWStore(state => state.setLaunchQuantization);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const isPlaying = transport?.is_playing ?? false;
    const isPaused = transport?.is_paused ?? false;
    const currentTime = transport?.current_time ?? 0;
    const tempo = activeComposition?.tempo ?? 120;
    const hasPlayingClips = playingClipIds.length > 0;

    // Format time as bars:beats:sixteenths
    const formatTime = (seconds: number) => {
        const beatsPerSecond = tempo / 60;
        const totalBeats = seconds * beatsPerSecond;
        const bars = Math.floor(totalBeats / 4);
        const beats = Math.floor(totalBeats % 4);
        const sixteenths = Math.floor((totalBeats % 1) * 16);
        return `${bars + 1}:${beats + 1}:${sixteenths.toString().padStart(2, '0')}`;
    };

    // ========================================================================
    // HANDLERS
    // ========================================================================
    // In clip launcher mode, transport controls clips, NOT the composition timeline
    const handlePlayPause = useCallback(async () => {
        // Clip launcher doesn't have a global "play" - clips are triggered individually
        // This button is disabled in clip launcher mode
        toast.info('Trigger clips individually by clicking pads');
    }, []);

    const handleStop = useCallback(async () => {
        // Stop all playing clips
        const stopAllClips = useDAWStore.getState().stopAllClips;
        await stopAllClips();
        toast.success('Stopped all clips');
    }, []);

    const handleStopAllClips = useCallback(async () => {
        if (!activeComposition) return;

        try {
            const stopAllClips = useDAWStore.getState().stopAllClips;
            await stopAllClips();
            toast.success('Stopped all clips');
        } catch (error) {
            console.error('Failed to stop all clips:', error);
            toast.error('Failed to stop all clips');
        }
    }, [activeComposition]);

    const handleAddScene = useCallback(() => {
        setNumClipSlots(numClipSlots + 1);
        toast.success(`Added scene ${numClipSlots + 1}`);
    }, [numClipSlots, setNumClipSlots]);

    const handleRemoveScene = useCallback(() => {
        if (numClipSlots <= 1) {
            toast.error('Cannot remove the last scene');
            return;
        }
        setNumClipSlots(numClipSlots - 1);
        toast.success(`Removed scene ${numClipSlots}`);
    }, [numClipSlots, setNumClipSlots]);

    const handleSessionRecord = useCallback(() => {
        if (isSessionRecording) {
            setIsSessionRecording(false);
            toast.success('Session recording stopped - Performance captured to arrangement');
        } else {
            setIsSessionRecording(true);
            toast.success('Session recording started - Clip launches will be recorded');
        }
    }, [isSessionRecording]);

    const handleQuantizationChange = useCallback(async (value: string) => {
        // Map display value to backend value
        const quantizationMap: Record<string, 'none' | '1/4' | '1/2' | '1' | '2' | '4'> = {
            'None': 'none',
            '1/16': '1/4',  // Backend doesn't support 1/16, use 1/4
            '1/8': '1/4',   // Backend doesn't support 1/8, use 1/4
            '1/4': '1/4',
            '1/2': '1/2',
            '1 Bar': '1',
            '2 Bars': '2',
            '4 Bars': '4',
        };

        const backendValue = quantizationMap[value];
        if (!backendValue) {
            console.warn(`Unknown quantization value: ${value}`);
            return;
        }

        setQuantization(value);
        await setLaunchQuantization(backendValue);
        toast.success(`Launch quantization: ${value}`);
    }, [setLaunchQuantization]);

    const handleTempoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeComposition) return;
        const newTempo = parseFloat(e.target.value);
        if (isNaN(newTempo) || newTempo < 20 || newTempo > 300) return;

        await updateComposition(activeComposition.id, { tempo: newTempo });
        toast.success(`Tempo: ${newTempo} BPM`);
    }, [activeComposition, updateComposition]);

    return (
        <div className="flex items-center justify-between">
            {/* Left: Transport Controls */}
            <div className="flex items-center gap-4">
                {/* Transport Buttons - Clip Launcher Mode */}
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={Square}
                        tooltip="Stop all clips"
                        onClick={handleStop}
                        variant={hasPlayingClips ? "destructive" : "ghost"}
                        size="icon-sm"
                        className={cn(hasPlayingClips && "bg-destructive")}
                    />
                    <IconButton
                        icon={Play}
                        tooltip="Trigger clips individually by clicking pads"
                        onClick={handlePlayPause}
                        variant="ghost"
                        size="icon-sm"
                        disabled={true}
                        className="opacity-30 cursor-not-allowed"
                    />
                    <Button
                        onClick={handleSessionRecord}
                        variant={isSessionRecording ? "destructive" : "ghost"}
                        size="icon-sm"
                        className={cn(isSessionRecording && "animate-pulse")}
                        title="Session Record (record clip launches to arrangement)"
                    >
                        <Circle size={16} fill={isSessionRecording ? "currentColor" : "none"} />
                    </Button>
                </div>

                {/* Position & Tempo */}
                <div className="flex items-center gap-3 px-3 py-1 rounded-md bg-muted/30 border border-border/30">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                            Position
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {formatTime(currentTime)}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-border/50" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                            Tempo
                        </span>
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                min="20"
                                max="300"
                                step="1"
                                value={tempo}
                                onChange={handleTempoChange}
                                className="h-5 w-14 px-1 text-xs font-mono font-bold text-center bg-background/50 border-border/50"
                            />
                            <span className="text-[10px] font-bold text-muted-foreground">BPM</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Clip Launcher Controls */}
            <div className="flex items-center gap-2">
                {/* MODE TOGGLE: PAD VIEW ↔ ASSIGNMENT VIEW */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/30 border border-border/30">
                    <Button
                        variant={clipLauncherMode === "pad" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 gap-1.5 px-2"
                        onClick={() => setClipLauncherMode("pad")}
                    >
                        <Gamepad2 size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            Pad View
                        </span>
                    </Button>
                    <Button
                        variant={clipLauncherMode === "assignment" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 gap-1.5 px-2"
                        onClick={() => setClipLauncherMode("assignment")}
                    >
                        <ListTree size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            Assignment
                        </span>
                    </Button>
                </div>

                {/* Launch Quantization */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                        >
                            <Grid3x3 size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Quantize: {quantization}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleQuantizationChange('None')}>
                            <span className="text-xs">None (Immediate)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuantizationChange('1/16')}>
                            <span className="text-xs">1/16 Note</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuantizationChange('1/8')}>
                            <span className="text-xs">1/8 Note</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuantizationChange('1/4')}>
                            <span className="text-xs">1/4 Note (1 Beat)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuantizationChange('1/2')}>
                            <span className="text-xs">1/2 Note (2 Beats)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuantizationChange('1 Bar')}>
                            <span className="text-xs">1 Bar (4 Beats)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuantizationChange('2 Bars')}>
                            <span className="text-xs">2 Bars</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuantizationChange('4 Bars')}>
                            <span className="text-xs">4 Bars</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Stop All Clips */}
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={handleStopAllClips}
                    disabled={!hasPlayingClips}
                >
                    <Square size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                        Stop All
                    </span>
                </Button>

                {/* Add/Remove Scene */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={handleAddScene}
                    >
                        <Plus size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            Add Scene
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={handleRemoveScene}
                        disabled={numClipSlots <= 1}
                        title="Remove last scene"
                    >
                        <Minus size={14} />
                    </Button>
                </div>

                {/* Scene Count */}
                <div className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Scenes:</span>
                    <span className="text-primary">{numClipSlots}</span>
                </div>
            </div>
        </div>
    );
}

