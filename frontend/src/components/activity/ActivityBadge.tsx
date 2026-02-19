/**
 * ActivityBadge - Shows AI activity indicator on tabs
 *
 * Displays a pulsing badge when AI is performing actions in a tab.
 * Visible in both direct view and x-ray mode.
 */

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface ActivityBadgeProps {
    count: number; // Number of active activities
    className?: string;
}

export function ActivityBadge({ count, className }: ActivityBadgeProps) {
    if (count === 0) return null;

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-2 py-1 border border-cyan-500/50",
                "glow-cyan animate-pulse",
                className
            )}
        >
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400">{count}</span>
        </div>
    );
}

