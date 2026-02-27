/**
 * ClipLauncherScene - Scene trigger button
 *
 * PERFORMANCE INSTRUMENT VISION:
 * - Large, tactile scene triggers for live performance
 * - Clear visual feedback when scene is playing
 * - Vibrant colors that are VISIBLE
 * - Triggers entire row of clips at once
 *
 * NO PROP DRILLING - Reads from Zustand store
 */

import { useDAWStore } from '@/stores/dawStore';
import { useTransportWebSocket } from '@/hooks/useTransportWebsocket';
import { cn } from '@/lib/utils';
import { Play, Square } from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { CLIP_COLOR_PALETTE } from '@/config/theme.constants';

interface ClipLauncherSceneProps {
    sceneIndex: number;
}

export function ClipLauncherScene({ sceneIndex }: ClipLauncherSceneProps) {
    // ========================================================================
    // STATE: Read from WebSocket and Zustand
    // ========================================================================
    const { transport } = useTransportWebSocket();
    const playingClipIds = transport.playing_clips || [];
    const clipSlots = useDAWStore(state => state.clipSlots);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const triggerScene = useDAWStore(state => state.triggerScene);
    const stopScene = useDAWStore(state => state.stopScene);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    // A scene is "playing" if ANY clip in that row is playing
    const isPlaying = clipSlots.some((trackSlots, trackIndex) => {
        const clipId = trackSlots?.[sceneIndex];
        return clipId && playingClipIds.includes(clipId);
    });

    const sceneColor = CLIP_COLOR_PALETTE[sceneIndex % CLIP_COLOR_PALETTE.length];

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleClick = () => {
        triggerScene(sceneIndex);
    };

    // ========================================================================
    // RENDER: HARDWARE RGB PAD STYLE
    // ========================================================================
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={handleClick}
                    className={cn(
                        "relative h-full w-full rounded transition-all cursor-pointer",
                        "flex items-center justify-center",
                        "hover:brightness-125 active:scale-95"
                    )}
                    style={{
                        backgroundColor: isPlaying ? sceneColor : '#1a1a1a',
                        boxShadow: isPlaying
                            ? `0 0 20px ${sceneColor}, inset 0 0 10px ${sceneColor}40`
                            : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                        border: `1px solid ${isPlaying ? sceneColor : '#2a2a2a'}`,
                    }}
                >
                    {/* Play icon */}
                    <Play
                        size={16}
                        className={cn(
                            "transition-all",
                            isPlaying ? "text-white fill-white/30" : "text-zinc-600"
                        )}
                    />

                    {/* Pulse when playing */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 rounded animate-pulse"
                            style={{
                                background: `radial-gradient(circle at center, ${sceneColor} 0%, transparent 70%)`,
                                opacity: 0.5
                            }}
                        />
                    )}
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Rename Scene</ContextMenuItem>
                <ContextMenuItem>Insert Scene Above</ContextMenuItem>
                <ContextMenuItem>Insert Scene Below</ContextMenuItem>
                <ContextMenuItem className="text-destructive">Delete Scene</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

