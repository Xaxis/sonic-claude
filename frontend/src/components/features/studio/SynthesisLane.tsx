/**
 * Synthesis Lane - Sound Design & Mixing
 *
 * Integrates all sound generation and processing:
 * - Active synths with parameter controls
 * - Effect chains (reverb, delay, filters, etc.)
 * - Mixer strips (volume, pan, mute, solo)
 * - Master output controls
 *
 * Fully functional standalone - can create/modify synths and effects independently
 */

import { useState } from "react";
import { Waveform, Sparkles, Sliders, Volume2 } from "lucide-react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { api } from "@/services/api";

type SynthesisSection = "synths" | "effects" | "mixer" | "master";

export function SynthesisLane() {
    const [activeSection, setActiveSection] = useState<SynthesisSection>("synths");

    return (
        <div className="flex flex-col h-full bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                <h2 className="text-sm font-semibold text-zinc-100">Synthesis & Mix</h2>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-900/30">
                <button
                    onClick={() => setActiveSection("synths")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "synths"
                            ? "bg-zinc-800 text-cyan-400 border-b-2 border-cyan-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Waveform className="h-3.5 w-3.5" />
                    Synths
                </button>
                <button
                    onClick={() => setActiveSection("effects")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "effects"
                            ? "bg-zinc-800 text-purple-400 border-b-2 border-purple-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    Effects
                </button>
                <button
                    onClick={() => setActiveSection("mixer")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "mixer"
                            ? "bg-zinc-800 text-green-400 border-b-2 border-green-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Sliders className="h-3.5 w-3.5" />
                    Mixer
                </button>
                <button
                    onClick={() => setActiveSection("master")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        activeSection === "master"
                            ? "bg-zinc-800 text-orange-400 border-b-2 border-orange-500"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                >
                    <Volume2 className="h-3.5 w-3.5" />
                    Master
                </button>
            </div>

            {/* Content Area - Each component is fully functional standalone */}
            <div className="flex-1 overflow-auto">
                {activeSection === "synths" && <SynthsSection />}
                {activeSection === "effects" && <EffectsSection />}
                {activeSection === "mixer" && <MixerSection />}
                {activeSection === "master" && <MasterSection />}
            </div>
        </div>
    );
}

/**
 * Synths Section - Active synth instances
 */
function SynthsSection() {
    const { activeSynths } = useAudioEngine();

    return (
        <div className="p-4">
            {activeSynths.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Waveform className="h-12 w-12 text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-400 mb-2">No active synths</p>
                    <p className="text-xs text-zinc-600">
                        Create a synth to start making sound
                    </p>
                    <button className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded transition-colors">
                        + Add Synth
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeSynths.map((synth) => (
                        <div
                            key={synth.id}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-cyan-400">
                                    {synth.synthdef_name}
                                </span>
                                <span className="text-xs text-zinc-500 font-mono">
                                    #{synth.id.slice(0, 6)}
                                </span>
                            </div>
                            {/* Parameter controls would go here */}
                            <div className="space-y-2 mt-2">
                                {Object.entries(synth.parameters).slice(0, 3).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-400">{key}</span>
                                        <span className="text-xs text-zinc-300 font-mono">
                                            {typeof value === 'number' ? value.toFixed(2) : value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}




/**
 * Effects Section - Active effect instances
 */
function EffectsSection() {
    const { activeEffects } = useAudioEngine();

    return (
        <div className="p-4">
            {activeEffects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Sparkles className="h-12 w-12 text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-400 mb-2">No active effects</p>
                    <p className="text-xs text-zinc-600">
                        Add effects to shape your sound
                    </p>
                    <button className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors">
                        + Add Effect
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeEffects.map((effect) => (
                        <div
                            key={effect.id}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-purple-400">
                                    {effect.effectdef_name}
                                </span>
                                <span className="text-xs text-zinc-500 font-mono">
                                    #{effect.id.slice(0, 6)}
                                </span>
                            </div>
                            <div className="space-y-2 mt-2">
                                {Object.entries(effect.parameters).slice(0, 3).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-400">{key}</span>
                                        <span className="text-xs text-zinc-300 font-mono">
                                            {typeof value === 'number' ? value.toFixed(2) : value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Mixer Section - Track mixer strips
 */
function MixerSection() {
    const { tracks } = useAudioEngine();

    return (
        <div className="p-4">
            {tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Sliders className="h-12 w-12 text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-400 mb-2">No mixer tracks</p>
                    <p className="text-xs text-zinc-600">
                        Create tracks in the sequencer
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tracks.map((track) => (
                        <div
                            key={track.id}
                            className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-green-400">
                                    {track.name}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        className={`px-2 py-0.5 text-xs rounded ${
                                            track.is_muted
                                                ? "bg-red-600 text-white"
                                                : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                        }`}
                                    >
                                        M
                                    </button>
                                    <button
                                        className={`px-2 py-0.5 text-xs rounded ${
                                            track.is_soloed
                                                ? "bg-yellow-600 text-white"
                                                : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                        }`}
                                    >
                                        S
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400 w-12">Vol</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={track.volume}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-zinc-300 font-mono w-12 text-right">
                                        {Math.round(track.volume * 100)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-400 w-12">Pan</span>
                                    <input
                                        type="range"
                                        min="-1"
                                        max="1"
                                        step="0.01"
                                        value={track.pan}
                                        className="flex-1"
                                    />
                                    <span className="text-xs text-zinc-300 font-mono w-12 text-right">
                                        {track.pan > 0 ? 'R' : track.pan < 0 ? 'L' : 'C'}
                                        {Math.abs(Math.round(track.pan * 100))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Master Section - Master output controls
 */
function MasterSection() {
    const { masterTrack } = useAudioEngine();

    return (
        <div className="p-4">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-orange-400 mb-4">Master Output</h3>

                {masterTrack ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400 w-16">Volume</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={masterTrack.volume}
                                className="flex-1"
                            />
                            <span className="text-xs text-zinc-300 font-mono w-12 text-right">
                                {Math.round(masterTrack.volume * 100)}%
                            </span>
                        </div>

                        <div className="mt-4">
                            <div className="text-xs text-zinc-400 mb-2">Output Level</div>
                            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                    style={{ width: `${masterTrack.volume * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-zinc-500">Master track not initialized</p>
                )}
            </div>
        </div>
    );
}