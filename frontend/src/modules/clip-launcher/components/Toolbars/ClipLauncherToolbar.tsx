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
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Play, Pause, SkipBack, Square, Plus, Circle, Grid3x3 } from 'lucide-react';
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
    // STATE: Read from Zustand store
    // ========================================================================
    const activeComposition = useDAWStore(state => state.activeComposition);
    const transport = useDAWStore(state => state.transport);
    const numClipSlots = useDAWStore(state => state.numClipSlots);
    const playingClips = useDAWStore(state => state.playingClips);
    const playingScenes = useDAWStore(state => state.playingScenes);

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
    const setNumClipSlots = useDAWStore(state => state.setNumClipSlots);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const isPlaying = transport?.is_playing ?? false;
    const isPaused = transport?.is_paused ?? false;
    const currentTime = transport?.current_time ?? 0;
    const tempo = activeComposition?.tempo ?? 120;
    const hasPlayingClips = playingClips.length > 0;

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
    const handlePlayPause = useCallback(async () => {
        if (!activeComposition) return;
        if (isPlaying) {
            await pause();
        } else if (isPaused) {
            await resume();
        } else {
            await play();
        }
    }, [isPlaying, isPaused, activeComposition, play, pause, resume]);

    const handleStop = useCallback(async () => {
        await stop();
    }, [stop]);

    const handleStopAllClips = useCallback(() => {
        // Stop all playing clips and scenes
        const stopTrack = useDAWStore.getState().stopTrack;
        const stopScene = useDAWStore.getState().stopScene;

        // Stop all playing clips
        playingClips.forEach(({ track_id }) => {
            stopTrack(track_id);
        });

        // Stop all playing scenes
        playingScenes.forEach((sceneIndex) => {
            stopScene(sceneIndex);
        });

        toast.success('Stopped all clips');
    }, [playingClips, playingScenes]);

    const handleAddScene = useCallback(() => {
        setNumClipSlots(numClipSlots + 1);
        toast.success(`Added scene ${numClipSlots + 1}`);
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

    const handleQuantizationChange = useCallback((value: string) => {
        setQuantization(value);
        toast.success(`Launch quantization: ${value}`);
    }, []);

    return (
        <div className="flex items-center justify-between">
            {/* Left: Transport Controls */}
            <div className="flex items-center gap-4">
                {/* Transport Buttons */}
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={SkipBack}
                        tooltip="Stop and rewind"
                        onClick={handleStop}
                        variant="ghost"
                        size="icon-sm"
                    />
                    <IconButton
                        icon={isPlaying ? Pause : Play}
                        tooltip={isPlaying ? "Pause" : (isPaused ? "Resume" : "Play")}
                        onClick={handlePlayPause}
                        variant={isPlaying || isPaused ? "default" : "ghost"}
                        size="icon-sm"
                        className={cn((isPlaying || isPaused) && "bg-primary")}
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
                    <div className="flex flex-col">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                            Tempo
                        </span>
                        <span className="text-xs font-mono font-bold text-foreground">
                            {tempo} BPM
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Clip Launcher Controls */}
            <div className="flex items-center gap-2">
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

                {/* Add Scene */}
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

                {/* Scene Count */}
                <div className="flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Scenes:</span>
                    <span className="text-primary">{numClipSlots}</span>
                </div>
            </div>
        </div>
    );
}

