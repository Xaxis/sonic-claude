/**
 * App.tsx
 *
 * Main application component.
 *
 * Architecture:
 * - LayoutProvider manages all tabs, panels, and window state
 * - AudioEngineProvider wraps everything for global audio state
 * - Header is always visible
 * - TabbedWrapper manages tabs and their panels
 * - Each tab contains panels (draggable/resizable)
 * - Panels contain SubPanels for feature organization
 * - State syncs across all tabs/windows via BroadcastChannel
 */

import { Header } from "@/components/layout/Header";
import { TabbedWrapper } from "@/components/layout/TabbedWrapper";
import { useLayout } from "@/contexts/LayoutContext";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { DEFAULT_PANELS } from "@/config/layout.config";
import { Toaster } from "sonner";

export default function App() {
    const {
        tabs,
        activeTab,
        setActiveTab,
        createTab,
        deleteTab,
        popoutTab,
    } = useLayout();

    const { isEngineRunning, engineStatus, activeSynths } = useAudioEngine();

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
            {/* Toast Notifications */}
            <Toaster
                position="top-right"
                theme="dark"
                toastOptions={{
                    style: {
                        background: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--foreground))',
                    },
                    className: 'font-mono',
                }}
            />

            {/* Header - Always visible */}
            <Header
                isEngineRunning={isEngineRunning}
                cpuUsage={engineStatus?.cpu_usage || 0}
                activeSynths={activeSynths.length}
            />

            {/* Main Content - Tabbed Layout */}
            <div className="flex-1 overflow-hidden">
                <TabbedWrapper
                    panels={DEFAULT_PANELS}
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onTabCreate={() => {
                        createTab("NEW TAB", []);
                    }}
                    onTabDelete={deleteTab}
                    onTabPopout={popoutTab}
                />
            </div>
        </div>
    );
}
