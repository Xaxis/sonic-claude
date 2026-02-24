/**
 * TabHeader Component
 * 
 * Reusable tab navigation header with consistent styling across the application.
 * Provides a clean, professional tab interface following the DAW theme.
 * 
 * Features:
 * - Gradient background with border
 * - Active/inactive button states
 * - Optional icons for tabs
 * - Consistent spacing and sizing
 * - Follows theme color palette
 * 
 * Usage:
 * ```tsx
 * <TabHeader
 *   tabs={[
 *     { id: "chat", label: "CHAT" },
 *     { id: "analysis", label: "ANALYSIS" }
 *   ]}
 *   activeTab="chat"
 *   onTabChange={(id) => setActiveTab(id)}
 * />
 * ```
 * 
 * With icons:
 * ```tsx
 * <TabHeader
 *   tabs={[
 *     { id: "audio", label: "AUDIO IN", icon: <Mic size={14} /> },
 *     { id: "midi", label: "MIDI IN", icon: <Piano size={14} /> }
 *   ]}
 *   activeTab="audio"
 *   onTabChange={(id) => setActiveTab(id)}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Tab {
    /** Unique identifier for the tab */
    id: string;
    /** Display label for the tab */
    label: string;
    /** Optional icon element to display before label */
    icon?: React.ReactNode;
    /** Optional disabled state */
    disabled?: boolean;
}

export interface TabHeaderProps {
    /** Array of tab configurations */
    tabs: Tab[];
    /** Currently active tab ID */
    activeTab: string;
    /** Callback when tab is clicked */
    onTabChange: (tabId: string) => void;
    /** Additional CSS classes for the container */
    className?: string;
}

/**
 * TabHeader - Consistent tab navigation component
 * 
 * Provides a professional tab interface with gradient background,
 * proper spacing, and theme-consistent styling.
 */
export function TabHeader({ tabs, activeTab, onTabChange, className }: TabHeaderProps) {
    return (
        <div 
            className={cn(
                "border-b-2 border-border/70 bg-gradient-to-b from-muted/30 to-muted/10 px-4 py-2.5 flex-shrink-0 shadow-sm",
                className
            )}
        >
            <div className="flex gap-2">
                {tabs.map((tab) => (
                    <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onTabChange(tab.id)}
                        disabled={tab.disabled}
                    >
                        {tab.icon}
                        {tab.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}

