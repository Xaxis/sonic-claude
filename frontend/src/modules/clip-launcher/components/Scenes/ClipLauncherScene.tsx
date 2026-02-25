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
import { cn } from '@/lib/utils';
import { Play, Square } from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ClipLauncherSceneProps {
    sceneIndex: number;
}

// Vibrant scene colors (cycling through theme colors)
const SCENE_COLORS = [
    'hsl(187 85% 55%)',  // primary (cyan)
    'hsl(280 85% 65%)',  // secondary (purple)
    'hsl(45 95% 60%)',   // accent (yellow)
    'hsl(0 85% 60%)',    // destructive (red)
    'hsl(120 85% 55%)',  // green
    'hsl(30 95% 60%)',   // orange
    'hsl(200 85% 60%)',  // blue
    'hsl(330 85% 65%)',  // pink
];

export function ClipLauncherScene({ sceneIndex }: ClipLauncherSceneProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const playingScenes = useDAWStore(state => state.playingScenes);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const triggerScene = useDAWStore(state => state.triggerScene);
    const stopScene = useDAWStore(state => state.stopScene);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const isPlaying = playingScenes.includes(sceneIndex);
    const sceneColor = SCENE_COLORS[sceneIndex % SCENE_COLORS.length];

    // ========================================================================
    // HANDLERS
    // ========================================================================
    const handleClick = () => {
        triggerScene(sceneIndex);
    };

    // ========================================================================
    // RENDER: PERFORMANCE INSTRUMENT
    // ========================================================================
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={handleClick}
                    className={cn(
                        "relative h-full w-full rounded-lg border-2 transition-all cursor-pointer overflow-hidden",
                        "flex flex-col items-center justify-center group",
                        "hover:scale-[1.02] active:scale-98",
                        isPlaying && "scale-[1.02]"
                    )}
                    style={{
                        borderColor: isPlaying
                            ? sceneColor
                            : `color-mix(in srgb, ${sceneColor} 60%, transparent)`,
                        backgroundColor: `color-mix(in srgb, ${sceneColor} 30%, var(--color-background))`,
                        boxShadow: isPlaying
                            ? `0 0 24px ${sceneColor}70, inset 0 0 20px ${sceneColor}25`
                            : `0 0 8px ${sceneColor}30`,
                    }}
                >
                    {/* Background glow when playing */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 opacity-40 animate-pulse"
                            style={{
                                background: `radial-gradient(circle at center, ${sceneColor}80 0%, transparent 70%)`,
                            }}
                        />
                    )}

                    {/* Content */}
                    <div className="relative flex flex-col items-center justify-center gap-2">
                        {/* Play/Stop icon */}
                        {isPlaying ? (
                            <Square
                                size={20}
                                className="text-white/95 fill-white/20"
                            />
                        ) : (
                            <Play
                                size={20}
                                className="text-white/80 fill-white/10"
                            />
                        )}

                        {/* Scene number */}
                        <div className="text-xs font-bold text-white/95 uppercase tracking-wider">
                            {sceneIndex + 1}
                        </div>
                    </div>

                    {/* Playing ring */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 rounded-lg border-2 animate-pulse pointer-events-none"
                            style={{
                                borderColor: `${sceneColor}90`,
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

