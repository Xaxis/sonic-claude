/**
 * Input Panel
 *
 * Unified input sources for the LOOP:
 * - Sample Library Browser
 * - Live Audio Input
 * - MIDI Input
 * - File Upload
 *
 * Everything that FEEDS the loop comes through here.
 */

import { Panel } from "@/components/ui/panel";
import { SubPanel } from "@/components/ui/sub-panel";
import { useState } from "react";

export function InputPanel() {
    const [activeTab, setActiveTab] = useState<"library" | "audio" | "midi">("library");

    return (
        <Panel title="INPUT" className="flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab Buttons */}
                <div className="flex gap-1 p-2 border-b border-border">
                    <button
                        onClick={() => setActiveTab("library")}
                        className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "library"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        LIBRARY
                    </button>
                    <button
                        onClick={() => setActiveTab("audio")}
                        className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "audio"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        AUDIO IN
                    </button>
                    <button
                        onClick={() => setActiveTab("midi")}
                        className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "midi"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        MIDI IN
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-2">
                    {activeTab === "library" && (
                        <SubPanel title="Sample Library">
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                Sample browser coming soon
                            </div>
                        </SubPanel>
                    )}

                    {activeTab === "audio" && (
                        <SubPanel title="Audio Input">
                            <div className="p-4 space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    <p className="mb-2">Select audio input device:</p>
                                    <select className="w-full bg-background border border-border rounded px-2 py-1 text-xs">
                                        <option>Default Audio Input</option>
                                    </select>
                                </div>
                                <div className="text-center text-sm text-muted-foreground">
                                    Audio input controls coming soon
                                </div>
                            </div>
                        </SubPanel>
                    )}

                    {activeTab === "midi" && (
                        <SubPanel title="MIDI Input">
                            <div className="p-4 space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    <p className="mb-2">Select MIDI input device:</p>
                                    <select className="w-full bg-background border border-border rounded px-2 py-1 text-xs">
                                        <option>No MIDI Devices</option>
                                    </select>
                                </div>
                                <div className="text-center text-sm text-muted-foreground">
                                    MIDI input controls coming soon
                                </div>
                            </div>
                        </SubPanel>
                    )}
                </div>
            </div>
        </Panel>
    );
}

