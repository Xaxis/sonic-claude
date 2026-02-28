/**
 * HeaderIconButton - Reusable icon button for the app header row
 *
 * Consistent styling with the Settings gear: same padding, hover state,
 * and active feedback. Supports an optional notification badge count.
 *
 * Usage:
 *   <HeaderIconButton icon={Settings} label="Settings (⌘,)" onClick={...} />
 *   <HeaderIconButton icon={Bell} badge={3} label="Notifications" onClick={...} />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface HeaderIconButtonProps {
    /** Lucide icon component to render */
    icon: React.ComponentType<{ className?: string }>;

    /** Tooltip text (native title attribute) */
    label?: string;

    /** Notification badge count. Hidden when 0 or undefined. */
    badge?: number;

    /** Badge colour variant */
    badgeVariant?: "primary" | "warning" | "danger";

    /** Whether the button is in an open / selected state */
    active?: boolean;

    /** Apply a cyan glow tint to the icon (e.g. when AI is running) */
    glowing?: boolean;

    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    className?: string;
}

export function HeaderIconButton({
    icon: Icon,
    label,
    badge,
    badgeVariant = "warning",
    active = false,
    glowing = false,
    onClick,
    className,
}: HeaderIconButtonProps) {
    return (
        <button
            onClick={onClick}
            title={label}
            aria-label={label}
            className={cn(
                "relative flex items-center justify-center",
                "text-muted-foreground hover:text-foreground transition-colors",
                "h-7 w-7 rounded hover:bg-muted/30",
                active && "bg-muted/40 text-foreground",
                className,
            )}
        >
            <Icon
                className={cn(
                    "h-4 w-4 transition-colors",
                    glowing && "text-cyan-400",
                )}
                style={glowing ? { filter: "drop-shadow(0 0 5px rgba(34,211,238,0.55))" } : undefined}
            />

            {/* Notification badge */}
            {badge !== undefined && badge > 0 && (
                <span
                    className={cn(
                        "absolute -top-0.5 -right-0.5",
                        "min-w-[14px] h-[14px] rounded-full",
                        "flex items-center justify-center px-0.5",
                        "text-[9px] font-bold leading-none",
                        badgeVariant === "warning" && "bg-yellow-500 text-black",
                        badgeVariant === "primary" && "bg-primary text-primary-foreground",
                        badgeVariant === "danger"  && "bg-destructive text-destructive-foreground",
                    )}
                >
                    {badge > 9 ? "9+" : badge}
                </span>
            )}
        </button>
    );
}
