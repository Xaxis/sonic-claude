/**
 * EmptyState — Centered placeholder for empty content areas.
 *
 * Renders a vertically + horizontally centered block with an optional icon,
 * a required title, an optional description, and an optional action node.
 *
 * The component takes flex-1 so it fills its flex parent — callers do not
 * need to add centering wrappers.
 *
 * Usage:
 *   // With Lucide icon:
 *   <EmptyState
 *     icon={<Music size={32} />}
 *     title="No clips"
 *     description="Draw or drop a clip to get started"
 *   />
 *
 *   // Text + emoji icon:
 *   <EmptyState icon={<span className="text-2xl">⚡</span>} title="No Effects" />
 *
 *   // Minimal (title only):
 *   <EmptyState title="Nothing here yet" />
 *
 *   // With action button:
 *   <EmptyState
 *     icon={<FolderOpen size={32} />}
 *     title="No samples loaded"
 *     action={<Button size="xs" onClick={openBrowser}>Browse Samples</Button>}
 *   />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EmptyStateProps {
    /** Icon node — e.g. <Music size={32} /> or <span className="text-2xl">⚡</span> */
    icon?:        React.ReactNode;
    title:        string;
    description?: string;
    /** Optional CTA rendered below the description */
    action?:      React.ReactNode;
    className?:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center select-none",
                className,
            )}
        >
            {icon && (
                <div className="text-muted-foreground/30 flex items-center justify-center mb-0.5">
                    {icon}
                </div>
            )}

            <p className="text-xs text-muted-foreground font-medium">{title}</p>

            {description && (
                <p className="text-[10px] text-muted-foreground/50 leading-relaxed max-w-[180px]">
                    {description}
                </p>
            )}

            {action && <div className="mt-1">{action}</div>}
        </div>
    );
}
