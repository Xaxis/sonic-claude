/**
 * App.tsx
 *
 * Main application component.
 */

import { useEffect } from "react";
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

    // Get undo/redo actions from store
    const undo = useDAWStore(state => state.undo);
    const redo = useDAWStore(state => state.redo);
    const canUndo = useDAWStore(state => state.canUndo);
    const canRedo = useDAWStore(state => state.canRedo);

    // Global keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if we're in an input field (don't trigger undo/redo while typing)
            const target = e.target as HTMLElement;
            const isInputField = target.tagName === 'INPUT' ||
                                target.tagName === 'TEXTAREA' ||
                                target.isContentEditable;

            if (isInputField) return;

            // Cmd/Ctrl + Z = Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                if (canUndo) {
                    e.preventDefault();
                    undo();
                }
            }
            // Cmd/Ctrl + Shift + Z = Redo
            else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
                if (canRedo) {
                    e.preventDefault();
                    redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

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
