/**
 * Header - Top status bar
 *
 * Sits to the right of NavSidebar. Does not contain the logo — the brand
 * mark lives in NavSidebar's brand area which aligns with this bar's height.
 *
 * Left:  CompositionSwitcher
 * Right: AI status, CPU usage, active synth count
 */

import { Activity } from "lucide-react";
import { CompositionSwitcher } from "@/components/composition/CompositionSwitcher";
import { AIStatusIndicator } from "./AIStatusIndicator";

interface HeaderProps {
    isEngineRunning?: boolean;
    cpuUsage?: number;
    activeSynths?: number;
}

export function Header({ isEngineRunning = false, cpuUsage = 0, activeSynths = 0 }: HeaderProps) {
    return (
        <header className="bg-card border-border flex h-[60px] items-center justify-between border-b-2 px-4 flex-shrink-0">
            {/* Left: Composition switcher */}
            <CompositionSwitcher />

            {/* Right: Status indicators */}
            <div className="flex items-center gap-6">
                <AIStatusIndicator />

                {isEngineRunning && (
                    <div className="flex items-center gap-2">
                        <Activity className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="text-muted-foreground text-xs font-medium tracking-wider">CPU</span>
                        <span
                            className={`text-xs font-bold tracking-wider ${
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
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium tracking-wider">SYNTHS</span>
                        <span className="text-primary text-xs font-bold tracking-wider">{activeSynths}</span>
                    </div>
                )}
            </div>
        </header>
    );
}
