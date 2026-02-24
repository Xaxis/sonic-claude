/**
 * InputsPanel Component
 *
 * Main panel for managing all input sources: audio, MIDI, and sample library.
 * Provides tabbed interface for switching between different input types.
 *
 * State Management:
 * - Local state: Tab selection (audio/midi/library)
 * - Hook state: Each section manages its own state via custom hooks
 * - Global state: Samples are synced with DAW store
 *
 * Data Flow:
 * 1. User selects tab → InputsPanel updates local state
 * 2. Section component uses hook → Hook manages device/library state
 * 3. Hook calls API → Backend handles audio/MIDI/sample operations
 * 4. Recording complete → Upload to backend → Switch to library tab
 */

import { TabHeader, type Tab } from "@/components/ui/tab-header";
import { Mic, Piano, Folder } from "lucide-react";
import { InputsAudioInputSection } from "./components/Layouts/InputsAudioInputSection";
import { InputsSampleLibrarySection } from "./components/Layouts/InputsSampleLibrarySection";
import { InputsMidiInputSection } from "./components/Layouts/InputsMidiInputSection";
import { useDAWStore } from "@/stores/dawStore";

export function InputsPanel() {
    // Read tab state from Zustand store
    const activeInputsTab = useDAWStore(state => state.activeInputsTab);
    const setActiveInputsTab = useDAWStore(state => state.setActiveInputsTab);

    // Tab configuration
    const tabs: Tab[] = [
        {
            id: "audio",
            label: "AUDIO IN",
            icon: <Mic size={14} />,
        },
        {
            id: "midi",
            label: "MIDI IN",
            icon: <Piano size={14} />,
        },
        {
            id: "library",
            label: "LIBRARY",
            icon: <Folder size={14} />,
        },
    ];

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <div className="flex-1 min-h-0 flex flex-col">
                {/* Tab Navigation */}
                <TabHeader
                    tabs={tabs}
                    activeTab={activeInputsTab}
                    onTabChange={(tabId) => setActiveInputsTab(tabId as "audio" | "midi" | "library")}
                />

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-background/95">
                    <div className="h-full overflow-auto p-2">
                        {activeInputsTab === "audio" && <InputsAudioInputSection />}
                        {activeInputsTab === "library" && <InputsSampleLibrarySection />}
                        {activeInputsTab === "midi" && <InputsMidiInputSection />}
                    </div>
                </div>
            </div>
        </div>
    );
}
