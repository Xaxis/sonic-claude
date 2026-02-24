/**
 * ClipLauncherToolbar - Toolbar for clip launcher operations
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (composition, scenes, quantization)
 * - Calls actions directly from store
 * - No props needed
 *
 * Handles global clip launcher controls
 */

import { Square, Plus, Trash2, Grid3x3 } from "lucide-react";
import { Label } from "@/components/ui/label.tsx";
import { Button } from "@/components/ui/button.tsx";
import { IconButton } from "@/components/ui/icon-button.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { Badge } from "@/components/ui/badge.tsx";

const QUANTIZATION_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: '1/4', label: '1/4' },
    { value: '1/2', label: '1/2' },
    { value: '1', label: '1 Bar' },
    { value: '2', label: '2 Bars' },
    { value: '4', label: '4 Bars' },
] as const;

export function ClipLauncherToolbar() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const composition = useDAWStore(state => state.activeComposition);
    const tracks = composition?.tracks ?? [];
    const clipLaunchStates = useDAWStore(state => state.clipLaunchStates);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const stopAllClips = useDAWStore(state => state.stopAllClips);
    const setLaunchQuantization = useDAWStore(state => state.setLaunchQuantization);
    const createScene = useDAWStore(state => state.createScene);
    const deleteScene = useDAWStore(state => state.deleteScene);

    const quantization = composition?.launch_quantization || '1';
    const numScenes = composition?.scenes?.length || 0;
    
    // Count playing clips
    const playingClips = Object.values(clipLaunchStates).filter(s => s.state === 'playing').length;

    const handleStopAll = () => {
        stopAllClips();
    };

    const handleQuantizationChange = (value: 'none' | '1/4' | '1/2' | '1' | '2' | '4') => {
        setLaunchQuantization(value);
    };

    const handleAddScene = () => {
        const sceneName = `Scene ${numScenes + 1}`;
        createScene(sceneName);
    };

    const handleDeleteLastScene = () => {
        if (numScenes > 0 && composition?.scenes) {
            const lastScene = composition.scenes[numScenes - 1];
            if (lastScene) {
                deleteScene(lastScene.id);
            }
        }
    };

    return (
        <div className="flex items-center justify-between gap-4">
            {/* Left: Info */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <Grid3x3 size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                        {tracks.length} {tracks.length === 1 ? "Track" : "Tracks"}
                    </span>
                </div>

                {numScenes > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                        {numScenes} {numScenes === 1 ? "Scene" : "Scenes"}
                    </Badge>
                )}

                {playingClips > 0 && (
                    <Badge variant="default" className="text-[10px] font-semibold bg-primary/20 text-primary border-primary/30">
                        {playingClips} Playing
                    </Badge>
                )}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-4">
                {/* Stop All Clips */}
                <Button
                    onClick={handleStopAll}
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    disabled={playingClips === 0}
                >
                    <Square size={14} fill="currentColor" />
                    <span className="font-semibold">Stop All</span>
                </Button>

                {/* Quantization */}
                <div className="flex items-center gap-2">
                    <Label htmlFor="quantization-select" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Quantize
                    </Label>
                    <Select
                        value={quantization}
                        onValueChange={handleQuantizationChange}
                    >
                        <SelectTrigger id="quantization-select" className="w-24 h-7 text-xs font-semibold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {QUANTIZATION_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Scene Management */}
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={Plus}
                        tooltip="Add scene"
                        onClick={handleAddScene}
                        variant="ghost"
                        size="icon-sm"
                    />
                    <IconButton
                        icon={Trash2}
                        tooltip="Delete last scene"
                        onClick={handleDeleteLastScene}
                        variant="ghost"
                        size="icon-sm"
                        disabled={numScenes === 0}
                    />
                </div>
            </div>
        </div>
    );
}

