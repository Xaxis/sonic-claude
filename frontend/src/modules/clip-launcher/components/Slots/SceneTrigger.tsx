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

// Professional muted color palette for scenes
const SCENE_COLORS = [
    '#d97706', // Amber (default)
    '#dc2626', // Red
    '#7c3aed', // Violet
    '#2563eb', // Blue
    '#0891b2', // Cyan
    '#059669', // Emerald
    '#ca8a04', // Yellow
    '#ea580c', // Orange
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
            <div className="h-32 w-full rounded-md border border-border/30 bg-black/40" />
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

    // PROFESSIONAL VIBRANT SCENE BUTTON - Like Ableton/APC hardware
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    className={cn(
                        "relative h-32 w-full rounded-md cursor-pointer transition-all overflow-hidden group",
                        "shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
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
                        // Professional muted background
                        backgroundColor: `${scene.color}99`,
                        border: `1px solid ${scene.color}`,
                        boxShadow: `0 2px 6px rgba(0,0,0,0.2)`,
                    }}
                >
                    {/* Dark overlay for contrast */}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 pointer-events-none transition-opacity" />

                    {/* Scene content - HIGH CONTRAST */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 gap-2">
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
                                    className="w-full bg-background/90 text-white rounded px-2 py-1 text-xs font-bold text-center border border-primary/50 focus:outline-none focus:border-primary"
                                    placeholder="Scene name"
                                />
                            </div>
                        ) : (
                            /* NORMAL DISPLAY MODE */
                            <>
                                {/* Play icon - LARGE AND PROMINENT */}
                                <Play
                                    className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none"
                                    fill="white"
                                />

                                {/* Scene name - BOLD AND READABLE */}
                                <span className="text-xs font-black uppercase tracking-wide truncate w-full text-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-none">
                                    {scene.name}
                                </span>

                                {/* Tempo override */}
                                {scene.tempo && (
                                    <span className="text-[10px] font-mono text-white/80 drop-shadow-lg pointer-events-none">
                                        {scene.tempo} BPM
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* Hover glow effect */}
                    <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                        style={{
                            boxShadow: `inset 0 0 20px ${scene.color}`,
                        }}
                    />

                    {/* Color picker overlay */}
                    {showColorPicker && (
                        <div
                            className="absolute inset-0 bg-black/80 flex items-center justify-center p-2 pointer-events-auto z-20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-4 gap-2">
                                {SCENE_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        className="w-8 h-8 rounded-md border-2 border-white/20 hover:border-white transition-all hover:scale-110"
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

