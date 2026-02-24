/**
 * Sequencer Panel - REFACTORED to Zustand Best Practices
 *
 * PURE ORCHESTRATOR COMPONENT:
 * - No prop drilling - child components read from store directly
 * - No handler wrappers - child components call store actions directly
 * - Only manages local UI state (tempo input, settings dialog)
 * - Only passes scroll refs to child components
 *
 * Main orchestrator component for the sequencer.
 * Uses Zustand store for all state and actions.
 */

import { useState, useRef } from "react";
import { useDAWStore } from '@/stores/dawStore';
import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { SequencerSettingsDialog } from "./components/Dialogs/SequencerSettingsDialog.tsx";
import { SequencerEmptyState } from "./components/States/SequencerEmptyState.tsx";
import { SequencerTransport } from "./components/Transport/SequencerTransport.tsx";
import { SequencerToolbar } from "./components/Toolbar/SequencerToolbar.tsx";
import { SequencerSplitLayout } from "./layouts/SequencerSplitLayout.tsx";
import { toast } from "sonner";

export function SequencerPanel() {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const activeComposition = useDAWStore(state => state.activeComposition);

    // ========================================================================
    // LOCAL UI STATE: Settings dialog only
    // ========================================================================
    const [showSequenceSettings, setShowSequenceSettings] = useState(false);

    // ========================================================================
    // SCROLL REFS: For auto-scroll functionality
    // ========================================================================
    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const pianoRollScrollRef = useRef<HTMLDivElement>(null);
    const sampleEditorScrollRef = useRef<HTMLDivElement>(null);

    // ========================================================================
    // DERIVED STATE
    // ========================================================================
    const hasNoComposition = !activeComposition;

    // ========================================================================
    // RENDER
    // ========================================================================

    // Show empty state if no composition
    if (hasNoComposition) {
        return (
            <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
                <SequencerEmptyState
                    onCreateSequence={() => toast.info("Use File > New to create a new composition")}
                    onOpenSequenceManager={() => toast.info("Use File > Open to load a composition")}
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Combined Transport and Toolbar */}
            <div className="flex-shrink-0">
                <SubPanel title="TRANSPORT" showHeader={false}>
                    <div className="px-4 py-3 bg-gradient-to-r from-muted/20 to-muted/10 flex items-center justify-between">
                        {/* Left: Transport Controls - NO PROPS! Reads from Zustand directly */}
                        <SequencerTransport />

                        {/* Right: Toolbar Controls */}
                        <SequencerToolbar />
                    </div>
                </SubPanel>
            </div>

            {/* Main Content Area - NO PROP DRILLING! */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <SubPanel title="SEQUENCER" showHeader={false} contentOverflow="hidden">
                    <SequencerSplitLayout
                        timelineScrollRef={timelineScrollRef}
                        pianoRollScrollRef={pianoRollScrollRef}
                        sampleEditorScrollRef={sampleEditorScrollRef}
                    />
                </SubPanel>
            </div>

            {/* Dialogs */}
            {showSequenceSettings && activeComposition && (
                <SequencerSettingsDialog
                    isOpen={showSequenceSettings}
                    composition={activeComposition}
                    onClose={() => setShowSequenceSettings(false)}
                    onSave={async () => {
                        // TODO: Implement composition settings update
                        toast.info("Composition settings update not yet implemented");
                        setShowSequenceSettings(false);
                    }}
                />
            )}
        </div>
    );
}
