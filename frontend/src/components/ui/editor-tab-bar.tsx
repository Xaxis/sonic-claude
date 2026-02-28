/**
 * EditorTabBar — Compact tab switcher for editor left-sidebar headers
 *
 * Designed to sit in the 32px corner-header cell of SequencerGridLayout
 * (or any similarly constrained horizontal space). Fills full width.
 *
 * Used by: SequencerPianoRoll (Keys | Clip), extensible to SequencerSampleEditor.
 *
 * Each tab: icon + short label. Active tab uses primary accent; inactive is muted.
 * No external tab library — just two styled buttons, zero deps.
 */

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditorTab<T extends string = string> {
    id: T;
    icon: LucideIcon;
    label: string;
}

export interface EditorTabBarProps<T extends string = string> {
    tabs: EditorTab<T>[];
    activeTab: T;
    onChange: (id: T) => void;
    className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EditorTabBar<T extends string = string>({
    tabs,
    activeTab,
    onChange,
    className,
}: EditorTabBarProps<T>) {
    return (
        <div className={cn("flex h-full w-full", className)}>
            {tabs.map((tab) => {
                const active = tab.id === activeTab;
                const Icon   = tab.icon;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            "flex flex-1 items-center justify-center gap-1.5 h-full",
                            "text-[10px] font-bold uppercase tracking-wider",
                            "border-b-2 transition-colors",
                            active
                                ? "text-primary border-b-primary bg-primary/5"
                                : "text-muted-foreground/50 border-b-transparent hover:text-muted-foreground hover:bg-muted/20",
                        )}
                        title={tab.label}
                    >
                        <Icon size={12} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
