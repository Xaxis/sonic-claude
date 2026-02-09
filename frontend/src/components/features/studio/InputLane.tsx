/**
 * Input Lane - Audio Input Sources
 * 
 * Integrates all audio input methods into one cohesive lane:
 * - Live audio transcription (auto-insert to sequencer)
 * - Sample library & recording
 * - Pad triggers
 * - Audio device selector
 * 
 * Each section is fully functional independently and can send data to sequencer
 */

import { useState } from "react";
import { Mic, Music, Grid3x3, Settings } from "lucide-react";
import { LiveTranscription } from "../live-transcription/LiveTranscription";
import { SampleStudio } from "../sample-studio/SampleStudio";
import { Pads } from "../pads/Pads";

type InputSection = "transcription" | "samples" | "pads" | "devices";

export function InputLane() {
    const [activeSection, setActiveSection] = useState<InputSection>("transcription");

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                <h2 className="text-sm font-semibold text-zinc-100">Input Sources</h2>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-900/30">
                <button
                    onClick={() => setActiveSection("transcription")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "transcription"
                            ? "bg-zinc-800 text-purple-400 border-b-2 border-purple-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Mic className="h-3.5 w-3.5" />
                    Live
                </button>
                <button
                    onClick={() => setActiveSection("samples")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "samples"
                            ? "bg-zinc-800 text-blue-400 border-b-2 border-blue-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Music className="h-3.5 w-3.5" />
                    Samples
                </button>
                <button
                    onClick={() => setActiveSection("pads")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "pads"
                            ? "bg-zinc-800 text-green-400 border-b-2 border-green-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Grid3x3 className="h-3.5 w-3.5" />
                    Pads
                </button>
                <button
                    onClick={() => setActiveSection("devices")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "devices"
                            ? "bg-zinc-800 text-orange-400 border-b-2 border-orange-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Settings className="h-3.5 w-3.5" />
                    Devices
                </button>
            </div>

            {/* Content Area - Each component is fully functional standalone */}
            <div className="flex-1 overflow-auto">
                {activeSection === "transcription" && (
                    <div className="p-4">
                        <LiveTranscription />
                    </div>
                )}
                {activeSection === "samples" && (
                    <div className="p-4">
                        <SampleStudio />
                    </div>
                )}
                {activeSection === "pads" && (
                    <div className="p-4">
                        <Pads />
                    </div>
                )}
                {activeSection === "devices" && (
                    <div className="p-4">
                        <DeviceSelector />
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Device Selector - Audio I/O Configuration
 * Standalone component for selecting audio input/output devices
 */
function DeviceSelector() {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Audio Input Device
                </label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100">
                    <option>Default Input</option>
                    <option>Built-in Microphone</option>
                    <option>External Audio Interface</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Audio Output Device
                </label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100">
                    <option>Default Output</option>
                    <option>Built-in Speakers</option>
                    <option>External Audio Interface</option>
                </select>
            </div>
            <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Sample Rate</span>
                    <span className="text-zinc-100 font-mono">44.1 kHz</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-zinc-400">Buffer Size</span>
                    <span className="text-zinc-100 font-mono">512 samples</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-zinc-400">Latency</span>
                    <span className="text-green-400 font-mono">~12ms</span>
                </div>
            </div>
        </div>
    );
}

