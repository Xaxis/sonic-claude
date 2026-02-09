import { Music } from "lucide-react";

interface HeaderProps {
    isAIOnline: boolean;
    sonicPiStatus: string;
    audioEngineStatus: string;
}

export function Header({ isAIOnline, sonicPiStatus, audioEngineStatus }: HeaderProps) {
    return (
        <header className="bg-card border-border flex h-[100px] items-center justify-between border-b-2 px-8 py-4">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
                <Music className="text-primary h-10 w-10" />
                <div>
                    <h1 className="text-primary text-glow-cyan text-2xl font-bold tracking-[0.3em]">
                        SONIC CLAUDE
                    </h1>
                    <p className="text-muted-foreground text-xs tracking-[0.2em]">
                        AGENTIC MUSIC COMPOSITION
                    </p>
                </div>
            </div>

            {/* Center: Brain Visualization */}
            <div className="flex flex-1 justify-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                    <div className="border-secondary absolute h-8 w-8 animate-pulse rounded-full border-2" />
                    <div className="border-secondary absolute h-12 w-12 animate-pulse rounded-full border-2 [animation-delay:300ms]" />
                    <div className="border-secondary absolute h-16 w-16 animate-pulse rounded-full border-2 [animation-delay:600ms]" />
                </div>
            </div>

            {/* Right: Status Badges */}
            <div className="flex gap-6">
                <StatusBadge
                    label="AI AGENT"
                    value={isAIOnline ? "ONLINE" : "OFFLINE"}
                    online={isAIOnline}
                />
                <StatusBadge label="SONIC PI" value={sonicPiStatus} />
                <StatusBadge label="AUDIO ENGINE" value={audioEngineStatus} />
            </div>
        </header>
    );
}

interface StatusBadgeProps {
    label: string;
    value: string;
    online?: boolean;
}

function StatusBadge({ label, value, online }: StatusBadgeProps) {
    return (
        <div className="flex flex-col items-end gap-1">
            <span className="text-muted-foreground text-[0.65rem] tracking-[0.15em]">{label}</span>
            <span
                className={`text-sm font-bold tracking-wider ${
                    online === true
                        ? "text-primary text-glow-cyan"
                        : online === false
                          ? "text-destructive"
                          : "text-foreground"
                }`}
            >
                {value}
            </span>
        </div>
    );
}
