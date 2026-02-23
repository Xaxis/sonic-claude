/**
 * App.tsx
 *
 * Main application component.
 */

import { Header } from "@/components/layout/Header";
import { TabbedWrapper } from "@/components/layout/TabbedWrapper";
import { ActivityContainer } from "@/components/activity";
import { CompositionLoader } from "@/components/composition/CompositionLoader";
import { useLayout } from "@/contexts/LayoutContext";
import { useDAWStore } from "@/stores/dawStore";
import { useAutosave } from "@/hooks/useAutosave";
import { DEFAULT_PANELS } from "@/config/layout.config";

export default function App() {
    const { tabs, activeTab, setActiveTab, createTab, deleteTab, popoutTab } = useLayout();

    // Enable autosave
    useAutosave();

    // Get state from Zustand store
    const analytics = useDAWStore(state => state.analytics);
    const activeSynths = useDAWStore(state => state.activeSynths);

    const isEngineRunning = analytics !== null;
    const cpuUsage = analytics?.cpu_usage || 0;
    const activeSynthsCount = Object.keys(activeSynths).length;

    return (
        <div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
            {/* Composition Loader - First-run experience */}
            <CompositionLoader />

            {/* Header - Always visible */}
            <Header
                isEngineRunning={isEngineRunning}
                cpuUsage={cpuUsage}
                activeSynths={activeSynthsCount}
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

            {/* AI Activity Animations - Global overlay */}
            <ActivityContainer />
        </div>
    );
}
