import { Music, Activity } from "lucide-react";
import { CompositionSwitcher } from "@/components/composition/CompositionSwitcher";
import { AIStatusIndicator } from "./AIStatusIndicator";

interface HeaderProps {
    isEngineRunning?: boolean;
    cpuUsage?: number;
    activeSynths?: number;
}

export function Header({ isEngineRunning = false, cpuUsage = 0, activeSynths = 0 }: HeaderProps) {
    return (
        <header className="bg-card border-border flex h-[60px] items-center justify-between border-b-2 px-6 py-2">
            {/* Left: Logo + Composition Switcher */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <Music className="text-primary h-7 w-7" />
                    <div>
                        <h1 className="text-primary text-glow-cyan text-lg font-bold tracking-[0.3em]">
                            SONIC CLAUDE
                        </h1>
                    </div>
                </div>
                <CompositionSwitcher />
            </div>

            {/* Right: Status Indicators */}
            <div className="flex items-center gap-6">
                {/* AI Status - Primary indicator */}
                <AIStatusIndicator />

                {/* CPU Usage */}
                {isEngineRunning && (
                    <div className="flex items-center gap-2">
                        <Activity className="text-muted-foreground h-3.5 w-3.5" />
                        <span className="text-muted-foreground text-xs font-medium tracking-wider">
                            CPU
                        </span>
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

                {/* Active Synths */}
                {isEngineRunning && (
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium tracking-wider">
                            SYNTHS
                        </span>
                        <span className="text-primary text-xs font-bold tracking-wider">
                            {activeSynths}
                        </span>
                    </div>
                )}
            </div>
        </header>
    );
}
