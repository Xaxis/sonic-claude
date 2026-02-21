/**
 * Composition Switcher
 * 
 * Global header UI to switch between compositions
 * Shows active composition and allows switching
 */

import { useState } from "react";
import { useDAWStore } from "@/stores/dawStore";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, ChevronDown, Save, Clock } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export function CompositionSwitcher() {
    // Get state and actions from Zustand store
    const activeComposition = useDAWStore(state => state.activeComposition);
    const compositions = useDAWStore(state => state.compositions);
    const loadComposition = useDAWStore(state => state.loadComposition);
    const saveComposition = useDAWStore(state => state.saveComposition);
    const hasUnsavedChanges = useDAWStore(state => state.hasUnsavedChanges);

    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSwitch = async (compositionId: string) => {
        if (compositionId === activeComposition?.id) return;
        await loadComposition(compositionId);
        setIsOpen(false);
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (activeComposition) {
            setIsSaving(true);
            try {
                await saveComposition();
            } finally {
                setIsSaving(false);
            }
        }
    };

    if (!activeComposition) {
        return null; // CompositionLoader will handle this
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "gap-2 min-w-[200px] justify-between",
                        hasUnsavedChanges && "border-yellow-500/50"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        <span className="font-semibold">{activeComposition.name}</span>
                        {hasUnsavedChanges && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                                *
                            </Badge>
                        )}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Compositions</span>
                    {hasUnsavedChanges && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save className="h-3 w-3 mr-1" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Active Composition */}
                <DropdownMenuItem
                    className="bg-primary/10 font-semibold"
                    disabled
                >
                    <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            {activeComposition.name}
                            <Badge variant="default" className="text-xs ml-auto">
                                Active
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(activeComposition.created_at)}
                        </div>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Other Compositions */}
                {compositions
                    .filter((c) => c.id !== activeComposition?.id)
                    .map((comp) => (
                        <DropdownMenuItem
                            key={comp.id}
                            onClick={() => handleSwitch(comp.id)}
                        >
                            <div className="flex flex-col gap-1 w-full">
                                <div className="font-medium">{comp.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(comp.updated_at)}
                                </div>
                            </div>
                        </DropdownMenuItem>
                    ))}

                {compositions.length === 1 && (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                        No other compositions
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

