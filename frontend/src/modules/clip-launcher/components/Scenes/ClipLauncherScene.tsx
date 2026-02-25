/**
 * ClipLauncherScene - Scene trigger button
 *
 * NO PROP DRILLING - Reads from Zustand store
 * Uses theme colors (primary, secondary, accent) for vibrant scene colors
 * Professional styling matching Ableton Live
 */

import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ClipLauncherSceneProps {
    sceneIndex: number;
}

// Scene colors using theme colors
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
        if (isPlaying) {
            stopScene(sceneIndex);
        } else {
            triggerScene(sceneIndex);
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={handleClick}
                    className={cn(
                        "relative h-full w-full rounded-md cursor-pointer transition-all overflow-hidden group",
                        "shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-95",
                        isPlaying && "ring-2 ring-white/60 scale-[1.01]",
                    )}
                    style={{
                        backgroundColor: `color-mix(in srgb, ${sceneColor} 25%, var(--color-background))`,
                        border: `1px solid color-mix(in srgb, ${sceneColor} 60%, transparent)`,
                    }}
                >
                    {/* Background glow */}
                    <div
                        className="absolute inset-0 opacity-30"
                        style={{
                            background: `radial-gradient(circle at center, ${sceneColor}40 0%, transparent 70%)`,
                        }}
                    />

                    {/* Content */}
                    <div className="relative h-full flex flex-col items-center justify-center gap-1">
                        {/* Play icon */}
                        <Play
                            size={16}
                            fill="currentColor"
                            className={cn(
                                "transition-all",
                                isPlaying ? "text-white animate-pulse" : "text-muted-foreground"
                            )}
                        />

                        {/* Scene number */}
                        <div
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: sceneColor }}
                        >
                            Scene {sceneIndex + 1}
                        </div>
                    </div>

                    {/* Playing indicator */}
                    {isPlaying && (
                        <div
                            className="absolute inset-0 border-2 border-white/40 rounded-md animate-pulse"
                            style={{
                                boxShadow: `0 0 20px ${sceneColor}80`,
                            }}
                        />
                    )}
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleClick}>
                    {isPlaying ? 'Stop Scene' : 'Trigger Scene'}
                </ContextMenuItem>
                <ContextMenuItem>Rename Scene</ContextMenuItem>
                <ContextMenuItem>Insert Scene Above</ContextMenuItem>
                <ContextMenuItem>Insert Scene Below</ContextMenuItem>
                <ContextMenuItem className="text-destructive">Delete Scene</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

