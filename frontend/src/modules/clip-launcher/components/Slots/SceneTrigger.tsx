/**
 * SceneTrigger Component
 *
 * Scene launch button in the clip launcher grid.
 * Triggers all clips in a horizontal row.
 *
 * NO PROP DRILLING - Reads from Zustand store
 *
 * FEATURES:
 * - Left-click to launch scene
 * - Right-click for context menu (rename, change color, delete)
 * - Double-click for inline editing
 */

import { useState } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { cn } from '@/lib/utils';
import { Play, Pencil, Trash2, Palette } from 'lucide-react';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface SceneTriggerProps {
    sceneIndex: number;
}

// Professional vibrant color palette for scenes (matching our theme)
const SCENE_COLORS = [
    'hsl(187 85% 55%)', // Primary - Cyan
    'hsl(280 85% 65%)', // Secondary - Magenta
    'hsl(45 95% 60%)',  // Accent - Yellow
    'hsl(0 85% 60%)',   // Destructive - Red
    'hsl(220 85% 60%)', // Blue
    'hsl(160 85% 55%)', // Emerald
    'hsl(30 95% 60%)',  // Orange
    'hsl(270 85% 65%)', // Purple
];

export function SceneTrigger({ sceneIndex }: SceneTriggerProps) {
    // Read from store (no prop drilling)
    const composition = useDAWStore((state) => state.activeComposition);
    const launchScene = useDAWStore((state) => state.launchScene);
    const updateScene = useDAWStore((state) => state.updateScene);
    const deleteScene = useDAWStore((state) => state.deleteScene);

    // Local state for inline editing
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Get scene data
    const scene = composition?.scenes?.[sceneIndex];

    if (!scene) {
        return (
            <div className="h-20 w-full rounded-lg border-2 border-dashed border-border/20 bg-background/30" />
        );
    }

    const handleLaunch = () => {
        if (!isEditing) {
            launchScene(scene.id);
        }
    };

    const handleStartEdit = () => {
        setEditName(scene.name);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== scene.name) {
            updateScene(scene.id, trimmed, undefined, undefined);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditName('');
    };

    const handleChangeColor = (color: string) => {
        updateScene(scene.id, undefined, color, undefined);
        setShowColorPicker(false);
    };

    const handleDelete = () => {
        if (confirm(`Delete scene "${scene.name}"?`)) {
            deleteScene(scene.id);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            handleCancelEdit();
        }
    };

    // PROFESSIONAL SCENE TRIGGER - Like Ableton Live
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    className={cn(
                        "relative h-20 w-full rounded-lg cursor-pointer transition-all overflow-hidden group",
                        "shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-95"
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLaunch();
                    }}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStartEdit();
                    }}
                    style={{
                        // Vibrant background with glow
                        backgroundColor: scene.color,
                        boxShadow: `0 0 24px ${scene.color}, 0 6px 16px rgba(0,0,0,0.6)`,
                    }}
                >
                    {/* Dark overlay for contrast */}
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 pointer-events-none transition-opacity" />

                    {/* Scene content - COMPACT */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-2 gap-1.5">
                        {isEditing ? (
                            /* INLINE EDITING MODE */
                            <div className="w-full pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleSaveEdit}
                                    autoFocus
                                    className="w-full bg-background/95 text-white rounded px-2 py-1 text-xs font-bold text-center border-2 border-primary/70 focus:outline-none focus:border-primary shadow-lg"
                                    placeholder="Scene name"
                                />
                            </div>
                        ) : (
                            <>
                                {/* Play icon - PROMINENT */}
                                <Play
                                    className="w-7 h-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] pointer-events-none"
                                    fill="white"
                                />

                                {/* Scene name - BOLD */}
                                <span className="text-[10px] font-black uppercase tracking-wider truncate w-full text-center text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] pointer-events-none">
                                    {scene.name}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Hover glow effect */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                        style={{
                            boxShadow: `inset 0 0 30px ${scene.color}`,
                        }}
                    />

                    {/* Color picker overlay */}
                    {showColorPicker && (
                        <div
                            className="absolute inset-0 bg-black/90 flex items-center justify-center p-2 pointer-events-auto z-20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-4 gap-1.5">
                                {SCENE_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        className="w-7 h-7 rounded-md border-2 border-white/30 hover:border-white transition-all hover:scale-110 shadow-lg"
                                        style={{ backgroundColor: color }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleChangeColor(color);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </button>
            </ContextMenuTrigger>

            {/* Context Menu */}
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={handleStartEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename Scene
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setShowColorPicker(true)}>
                    <Palette className="mr-2 h-4 w-4" />
                    Change Color
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Scene
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

