/**
 * Header - Top status bar
 *
 * Sits to the right of NavSidebar. Does not contain the logo — the brand
 * mark lives in NavSidebar's brand area which aligns with this bar's height.
 *
 * Left:  CompositionSwitcher
 * Right: Engine indicators (CPU, Synths) · Icon buttons (AI activity, Settings)
 */

import { useState, useEffect } from "react";
import { Activity, Settings } from "lucide-react";
import { CompositionSwitcher } from "@/components/composition/CompositionSwitcher";
import { AIStatusIndicator } from "./AIStatusIndicator";
import { HeaderIconButton } from "@/components/ui/header-icon-button";
import { SettingsModal } from "@/components/settings";

interface HeaderProps {
    isEngineRunning?: boolean;
    cpuUsage?: number;
    activeSynths?: number;
    showSettings?: boolean;
}

export function Header({ isEngineRunning = false, cpuUsage = 0, activeSynths = 0, showSettings = true }: HeaderProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);

    // ⌘, / Ctrl+, keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === ",") {
                e.preventDefault();
                setSettingsOpen(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <>
            <header className="bg-card border-border flex h-[60px] items-center justify-between border-b-2 px-4 flex-shrink-0">
                {/* Left: Composition switcher */}
                <CompositionSwitcher />

                {/* Right: Engine indicators + icon buttons */}
                <div className="flex items-center gap-4">

                    {/* Engine status — only when SC is running */}
                    {isEngineRunning && (
                        <div className="flex items-center gap-1.5">
                            <Activity className="text-muted-foreground h-3.5 w-3.5" />
                            <span className="text-muted-foreground text-xs font-medium tracking-wider">CPU</span>
                            <span
                                className={`text-xs font-bold tracking-wider tabular-nums ${
                                    cpuUsage > 80
                                        ? "text-destructive"
                                        : cpuUsage > 50
                                            ? "text-yellow-500"
                                            : "text-primary"
                                }`}
                            >
                                {cpuUsage.toFixed(1)}%
                            </span>
                        </div>
                    )}

                    {isEngineRunning && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground text-xs font-medium tracking-wider">SYNTHS</span>
                            <span className="text-primary text-xs font-bold tracking-wider tabular-nums">{activeSynths}</span>
                        </div>
                    )}

                    {/* Separator between engine stats and icon buttons */}
                    {isEngineRunning && (
                        <div className="h-4 w-px bg-border/50" />
                    )}

                    {/* Icon buttons — AI activity + Settings, tight grouping */}
                    <div className="flex items-center gap-0.5">
                        <AIStatusIndicator />

                        {showSettings && (
                            <HeaderIconButton
                                icon={Settings}
                                label="Settings (⌘,)"
                                onClick={() => setSettingsOpen(true)}
                            />
                        )}
                    </div>
                </div>
            </header>

            {showSettings && <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />}
        </>
    );
}
