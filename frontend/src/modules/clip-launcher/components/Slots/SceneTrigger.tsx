/**
 * SceneTrigger Component
 * 
 * Scene launch button in the clip launcher grid.
 * Triggers all clips in a horizontal row.
 * 
 * NO PROP DRILLING - Reads from Zustand store
 */

import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';

interface SceneTriggerProps {
    sceneIndex: number;
}

export function SceneTrigger({ sceneIndex }: SceneTriggerProps) {
    // Read from store (no prop drilling)
    const composition = useDAWStore((state) => state.activeComposition);
    const launchScene = useDAWStore((state) => state.launchScene);

    // Get scene data
    const scene = composition?.scenes?.[sceneIndex];

    if (!scene) {
        return (
            <div className="h-24 w-full rounded-lg border-2 border-dashed border-border/20 bg-background/20" />
        );
    }

    const handleClick = () => {
        console.log('SceneTrigger clicked:', { scene, sceneIndex });

        if (scene) {
            console.log('Launching scene:', scene.id, scene.name);
            launchScene(scene.id);
        } else {
            console.log('No scene at index:', sceneIndex);
        }
    };

    return (
        <button
            className={cn(
                "relative h-24 w-full rounded-lg border-2 cursor-pointer transition-all overflow-hidden",
                "bg-gradient-to-b from-card to-card/60 shadow-lg",
                "border-border/70 hover:border-border hover:shadow-xl"
            )}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick();
            }}
            onMouseDown={() => {
                console.log('MOUSE DOWN on scene trigger');
            }}
            style={{
                borderColor: `${scene.color}60`,
            }}
        >
            {/* Background gradient with scene color */}
            <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                    background: `linear-gradient(135deg, ${scene.color}60 0%, transparent 100%)`
                }}
            />

            {/* Scene content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3 gap-1.5 pointer-events-none">
                {/* Play icon */}
                <Play
                    className="w-5 h-5 drop-shadow-sm"
                    style={{ color: scene.color }}
                    fill={scene.color}
                />

                {/* Scene name */}
                <span
                    className="text-[11px] font-bold uppercase tracking-wider truncate w-full text-center drop-shadow-sm"
                    style={{ color: scene.color }}
                >
                    {scene.name}
                </span>

                {/* Tempo override */}
                {scene.tempo && (
                    <span className="text-[9px] text-muted-foreground font-mono">
                        {scene.tempo} BPM
                    </span>
                )}
            </div>
        </button>
    );
}

