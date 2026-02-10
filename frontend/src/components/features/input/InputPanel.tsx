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

import { SubPanel } from "@/components/ui/sub-panel";
import { useState } from "react";
import { Upload, Search, Folder, Music, Mic, Piano } from "lucide-react";

// Placeholder data
const SAMPLE_CATEGORIES = ["All", "Drums", "Bass", "Synth", "Vocals", "FX", "Loops"];
const MOCK_SAMPLES = [
    { id: 1, name: "Kick_808.wav", category: "Drums", duration: "0:02", size: "1.2 MB" },
    { id: 2, name: "Bass_Sub.wav", category: "Bass", duration: "0:04", size: "2.1 MB" },
    { id: 3, name: "Synth_Lead.wav", category: "Synth", duration: "0:08", size: "3.4 MB" },
    { id: 4, name: "Vocal_Chop.wav", category: "Vocals", duration: "0:01", size: "0.8 MB" },
];

export function InputPanel() {
    const [activeTab, setActiveTab] = useState<"library" | "audio" | "midi">("library");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [audioDevice, setAudioDevice] = useState("Default Audio Input");
    const [midiDevice, setMidiDevice] = useState("No MIDI Devices");
    const [isRecording, setIsRecording] = useState(false);

    // Placeholder functions
    const handleSampleDragStart = (sampleId: number) => {
        console.log("Drag sample:", sampleId);
    };

    const handleFileUpload = () => {
        console.log("Upload files");
    };

    const handleStartRecording = () => {
        setIsRecording(!isRecording);
        console.log("Toggle recording:", !isRecording);
    };

    // Filter samples
    const filteredSamples = MOCK_SAMPLES.filter(sample => {
        const matchesCategory = selectedCategory === "All" || sample.category === selectedCategory;
        const matchesSearch = sample.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Tab Buttons */}
                <div className="flex gap-1 p-2 border-b border-border">
                    <button
                        onClick={() => setActiveTab("library")}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "library"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <Folder size={12} />
                        LIBRARY
                    </button>
                    <button
                        onClick={() => setActiveTab("audio")}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "audio"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <Mic size={12} />
                        AUDIO IN
                    </button>
                    <button
                        onClick={() => setActiveTab("midi")}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded transition-colors ${
                            activeTab === "midi"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                        <Piano size={12} />
                        MIDI IN
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-2 space-y-2">
                    {activeTab === "library" && (
                        <>
                            {/* Search and Upload */}
                            <SubPanel title="Search">
                                <div className="p-2 space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search samples..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-background border border-border rounded pl-8 pr-2 py-1 text-xs"
                                        />
                                    </div>
                                    <button
                                        onClick={handleFileUpload}
                                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-mono hover:bg-primary/90"
                                    >
                                        <Upload size={12} />
                                        UPLOAD FILES
                                    </button>
                                </div>
                            </SubPanel>

                            {/* Categories */}
                            <SubPanel title="Categories">
                                <div className="p-2 flex flex-wrap gap-1">
                                    {SAMPLE_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                selectedCategory === cat
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </SubPanel>

                            {/* Sample List */}
                            <SubPanel title="Samples">
                                <div className="divide-y divide-border">
                                    {filteredSamples.map(sample => (
                                        <div
                                            key={sample.id}
                                            draggable
                                            onDragStart={() => handleSampleDragStart(sample.id)}
                                            className="p-2 hover:bg-muted/50 cursor-move transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Music size={14} className="text-muted-foreground flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-mono truncate">{sample.name}</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {sample.category} • {sample.duration} • {sample.size}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SubPanel>
                        </>
                    )}

                    {activeTab === "audio" && (
                        <>
                            {/* Device Selection */}
                            <SubPanel title="Audio Device">
                                <div className="p-2 space-y-2">
                                    <select
                                        value={audioDevice}
                                        onChange={(e) => setAudioDevice(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                                    >
                                        <option>Default Audio Input</option>
                                        <option>Built-in Microphone</option>
                                        <option>USB Audio Interface</option>
                                    </select>
                                </div>
                            </SubPanel>

                            {/* Input Level */}
                            <SubPanel title="Input Level">
                                <div className="p-2 space-y-2">
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 h-4 bg-background border border-border rounded overflow-hidden">
                                            <div className="h-full bg-green-500" style={{ width: "45%" }} />
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground">-12 dB</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Gain:</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            defaultValue="50"
                                            className="flex-1"
                                        />
                                        <span className="text-xs font-mono">+0 dB</span>
                                    </div>
                                </div>
                            </SubPanel>

                            {/* Recording Controls */}
                            <SubPanel title="Recording">
                                <div className="p-2 space-y-2">
                                    <button
                                        onClick={handleStartRecording}
                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-mono transition-colors ${
                                            isRecording
                                                ? "bg-red-500 text-white hover:bg-red-600"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-red-500"}`} />
                                        {isRecording ? "STOP RECORDING" : "START RECORDING"}
                                    </button>
                                    {isRecording && (
                                        <div className="text-center text-xs text-muted-foreground">
                                            Recording: 00:05.2
                                        </div>
                                    )}
                                </div>
                            </SubPanel>

                            {/* Monitoring */}
                            <SubPanel title="Monitoring">
                                <div className="p-2 space-y-2">
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" defaultChecked />
                                        <span>Enable input monitoring</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" />
                                        <span>Auto-normalize</span>
                                    </label>
                                </div>
                            </SubPanel>
                        </>
                    )}

                    {activeTab === "midi" && (
                        <>
                            {/* Device Selection */}
                            <SubPanel title="MIDI Device">
                                <div className="p-2 space-y-2">
                                    <select
                                        value={midiDevice}
                                        onChange={(e) => setMidiDevice(e.target.value)}
                                        className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                                    >
                                        <option>No MIDI Devices</option>
                                        <option>USB MIDI Keyboard</option>
                                        <option>Virtual MIDI Bus</option>
                                    </select>
                                </div>
                            </SubPanel>

                            {/* MIDI Activity */}
                            <SubPanel title="MIDI Activity">
                                <div className="p-2 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Last Note:</span>
                                        <span className="font-mono">C4 (60)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Velocity:</span>
                                        <span className="font-mono">87</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Channel:</span>
                                        <span className="font-mono">1</span>
                                    </div>
                                    <div className="h-8 bg-background border border-border rounded flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    </div>
                                </div>
                            </SubPanel>

                            {/* MIDI Settings */}
                            <SubPanel title="Settings">
                                <div className="p-2 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Channel:</span>
                                        <select className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs">
                                            <option>All Channels</option>
                                            {Array.from({ length: 16 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    Channel {i + 1}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" defaultChecked />
                                        <span>Enable MIDI thru</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs">
                                        <input type="checkbox" />
                                        <span>Quantize input</span>
                                    </label>
                                </div>
                            </SubPanel>
                        </>
                    )}
                </div>
        </div>
    );
}
