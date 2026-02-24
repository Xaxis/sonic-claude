/**
 * Input Panel
 *
 * Main orchestrator component for input sources.
 * Manages tab state and renders appropriate section components.
 *
 * Architecture:
 * - Tab management (audio, midi, library)
 * - Delegates to section components:
 *   - AudioInputSection (audio input + recording)
 *   - SampleLibrarySection (sample browsing + upload)
 *   - MidiInputSection (MIDI device + settings)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Mic, Piano, Folder } from "lucide-react";
import { AudioInputSection } from "@/modules/input/components/Layouts/AudioInputSection.tsx";
import { SampleLibrarySection } from "@/modules/input/components/Layouts/SampleLibrarySection.tsx";
import { MidiInputSection } from "@/modules/input/components/Layouts/MidiInputSection.tsx";

export function InputPanel() {
    // Tab state
    const [activeTab, setActiveTab] = useState<"audio" | "midi" | "library">("audio");

    // Handle recording completion - switch to library tab
    const handleRecordingComplete = () => {
        setActiveTab("library");
    };

    // Handle switching to library tab
    const handleSwitchToLibrary = () => {
        setActiveTab("library");
    };

    return (
        <div className="flex h-full flex-1 flex-col overflow-hidden">
            {/* Tab Buttons */}
            <div className="border-border flex gap-1 border-b p-2">
                <Button
                    onClick={() => setActiveTab("audio")}
                    variant={activeTab === "audio" ? "default" : "ghost"}
                    size="xs"
                >
                    <Mic size={12} />
                    AUDIO IN
                </Button>
                <Button
                    onClick={() => setActiveTab("midi")}
                    variant={activeTab === "midi" ? "default" : "ghost"}
                    size="xs"
                >
                    <Piano size={12} />
                    MIDI IN
                </Button>
                <Button
                    onClick={() => setActiveTab("library")}
                    variant={activeTab === "library" ? "default" : "ghost"}
                    size="xs"
                >
                    <Folder size={12} />
                    LIBRARY
                </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-2 overflow-auto p-2">
                {activeTab === "audio" && (
                    <AudioInputSection
                        onRecordingComplete={handleRecordingComplete}
                        onSwitchToLibrary={handleSwitchToLibrary}
                    />
                )}

                {activeTab === "library" && <SampleLibrarySection />}

                {activeTab === "midi" && <MidiInputSection />}
            </div>
        </div>
    );
}
