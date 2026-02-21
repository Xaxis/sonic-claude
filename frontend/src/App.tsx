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
import { useDAWState } from "@/contexts/DAWStateContext";
import { useSynthesis } from "@/contexts/SynthesisContext";
import { DEFAULT_PANELS } from "@/config/layout.config";

export default function App() {
    const { tabs, activeTab, setActiveTab, createTab, deleteTab, popoutTab } = useLayout();

    const { isEngineRunning, engineStatus } = useDAWState();
    const { activeSynths } = useSynthesis();

    return (
        <div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
            {/* Composition Loader - First-run experience */}
            <CompositionLoader />

            {/* Header - Always visible */}
            <Header
                isEngineRunning={isEngineRunning}
                cpuUsage={engineStatus?.cpu_usage || 0}
                activeSynths={Object.keys(activeSynths).length}
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
