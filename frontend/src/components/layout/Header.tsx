/**
 * Header - Top status bar
 *
 * Sits to the right of NavSidebar. Does not contain the logo — the brand
 * mark lives in NavSidebar's brand area which aligns with this bar's height.
 *
 * Left:  CompositionSwitcher
 * Right: Engine indicators (CPU, Synths) · Separator · Icon buttons (AI, Settings)
 */

import { useState, useEffect } from "react";
import { Activity, Settings } from "lucide-react";
import { CompositionSwitcher } from "@/components/composition/CompositionSwitcher";
import { AIStatusIndicator } from "./AIStatusIndicator";
import { HeaderIconButton } from "@/components/ui/header-icon-button";
import { SettingsModal } from "@/components/settings";
import { LabelValue } from "@/components/ui/label-value";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
    isEngineRunning?: boolean;
    cpuUsage?:        number;
    activeSynths?:    number;
    showSettings?:    boolean;
}

export function Header({
    isEngineRunning = false,
    cpuUsage        = 0,
    activeSynths    = 0,
    showSettings    = true,
}: HeaderProps) {
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

    const cpuVariant = cpuUsage > 80 ? "danger" : cpuUsage > 50 ? "warning" : "default";

    return (
        <>
            <header className="bg-card border-border flex h-[60px] items-center justify-between border-b-2 px-4 flex-shrink-0">
                {/* Left: Composition switcher */}
                <CompositionSwitcher />

                {/* Right: Engine indicators + icon buttons */}
                <div className="flex items-center gap-4">

                    {/* Engine stats — only shown when SC is running */}
                    {isEngineRunning && (
                        <>
                            <LabelValue
                                label="CPU"
                                value={`${cpuUsage.toFixed(1)}%`}
                                variant={cpuVariant}
                                icon={Activity}
                            />
                            <LabelValue
                                label="Synths"
                                value={activeSynths}
                            />
                            <Separator orientation="vertical" className="h-4" />
                        </>
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
