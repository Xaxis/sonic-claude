/**
 * STUDIO - Unified Composition Interface
 * 
 * A cohesive mega-panel that integrates all audio engine capabilities into one elegant workflow.
 * Features 4 integrated lanes:
 * - LEFT (20%): Input Sources (transcription, samples, pads, device selector)
 * - CENTER (40%): Sequencer/Timeline (multi-track, clips, piano roll, transport)
 * - RIGHT (25%): Synthesis & Effects (active synths, effect chains, mixer strips)
 * - BOTTOM (15% height): AI Agent (chat, reasoning, quick actions) - OPTIONAL
 * 
 * Design Principles:
 * - Each lane is a fully functional standalone component
 * - Can be used independently OR as part of unified workflow
 * - Direct manual control is always available (AI is optional)
 * - Drag-and-drop between lanes for seamless workflow
 */

import { useState } from "react";
import { InputLane } from "./InputLane";
import { SequencerLane } from "./SequencerLane";
import { SynthesisLane } from "./SynthesisLane";
import { AILane } from "./AILane";
import { ChevronDown, ChevronUp } from "lucide-react";

export function Studio() {
    const [isAILaneVisible, setIsAILaneVisible] = useState(true);

    return (
        <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100">
            {/* Main Composition Area - 3 Vertical Lanes */}
            <div className={`flex flex-1 gap-2 p-2 ${isAILaneVisible ? 'h-[85%]' : 'h-full'}`}>
                {/* LEFT LANE: Input Sources (20%) */}
                <div className="w-[20%] flex flex-col gap-2">
                    <InputLane />
                </div>

                {/* CENTER LANE: Sequencer/Timeline (40%) */}
                <div className="w-[40%] flex flex-col gap-2">
                    <SequencerLane />
                </div>

                {/* RIGHT LANE: Synthesis & Effects (25%) */}
                <div className="w-[25%] flex flex-col gap-2">
                    <SynthesisLane />
                </div>
            </div>

            {/* BOTTOM LANE: AI Agent (15% height) - OPTIONAL & COLLAPSIBLE */}
            {isAILaneVisible && (
                <div className="h-[15%] border-t border-zinc-800">
                    <AILane onToggle={() => setIsAILaneVisible(false)} />
                </div>
            )}

            {/* AI Lane Toggle Button (when collapsed) */}
            {!isAILaneVisible && (
                <button
                    onClick={() => setIsAILaneVisible(true)}
                    className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-colors"
                >
                    <ChevronUp className="h-4 w-4" />
                    Show AI Assistant
                </button>
            )}
        </div>
    );
}

