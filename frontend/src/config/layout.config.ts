/**
 * Layout Configuration
 * 
 * Central configuration for all layout-related settings:
 * - Default panel definitions
 * - Default tab structure
 * - Grid layout settings
 * - Storage keys
 */

import type { PanelConfig } from "@/components/layout";
import { InputPanel } from "@/components/features/input";
import { LoopVisualizerPanel } from "@/components/features/loop-visualizer";
import { SequencerPanel } from "@/components/features/sequencer";
import { TransportPanel } from "@/components/features/transport";
import { SynthesisPanel } from "@/components/features/synthesis";
import { EffectsPanel } from "@/components/features/effects";
import { MixerPanel } from "@/components/features/mixer";
import { MeteringPanel } from "@/components/features/metering";
import { PianoRollPanel } from "@/components/features/piano-roll";
import { AIChatPanel } from "@/components/features/ai-chat";
import { TranscriptionPanel } from "@/components/features/transcription";
import { SpectralPanel } from "@/components/features/spectral";
import { TimelinePanel } from "@/components/features/timeline";

/**
 * Grid Layout Settings
 */
export const GRID_CONFIG = {
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
    rowHeight: 60,
    margin: [8, 8] as [number, number],
    containerPadding: [8, 8] as [number, number],
    compactType: "vertical" as const,
};

/**
 * Default Panel Definitions
 * 
 * All available panels in the application.
 * Components consume these via LayoutContext.
 */
// Note: Components are created as JSX elements, not function calls
import { createElement } from "react";

export const DEFAULT_PANELS: PanelConfig[] = [
    // ===== LOOP TAB =====
    // The feedback loop workspace - where everything happens

    // INPUT SECTION (Left - 3 cols)
    {
        id: "input",
        title: "INPUT",
        component: createElement(InputPanel),
        closeable: false,
        defaultLayout: { x: 0, y: 0, w: 3, h: 12 },
    },

    // LOOP CORE (Center - 6 cols)
    {
        id: "loop-visualizer",
        title: "LOOP",
        component: createElement(LoopVisualizerPanel),
        closeable: false,
        defaultLayout: { x: 3, y: 0, w: 6, h: 6 },
    },
    {
        id: "sequencer",
        title: "SEQUENCER",
        component: createElement(SequencerPanel),
        closeable: false,
        defaultLayout: { x: 3, y: 6, w: 6, h: 4 },
    },
    {
        id: "transport",
        title: "TRANSPORT",
        component: createElement(TransportPanel),
        closeable: false,
        defaultLayout: { x: 3, y: 10, w: 6, h: 2 },
    },

    // PROCESSING SECTION (Right - 3 cols)
    {
        id: "synthesis",
        title: "SYNTHESIS",
        component: createElement(SynthesisPanel),
        closeable: true,
        defaultLayout: { x: 9, y: 0, w: 3, h: 4 },
    },
    {
        id: "effects",
        title: "EFFECTS",
        component: createElement(EffectsPanel),
        closeable: true,
        defaultLayout: { x: 9, y: 4, w: 3, h: 4 },
    },
    {
        id: "mixer",
        title: "MIXER",
        component: createElement(MixerPanel),
        closeable: false,
        defaultLayout: { x: 9, y: 8, w: 3, h: 4 },
    },

    // OPTIONAL PANELS
    {
        id: "metering",
        title: "METERING",
        component: createElement(MeteringPanel),
        closeable: true,
        defaultLayout: { x: 0, y: 12, w: 4, h: 3 },
    },
    {
        id: "piano-roll",
        title: "PIANO ROLL",
        component: createElement(PianoRollPanel),
        closeable: true,
        defaultLayout: { x: 4, y: 12, w: 8, h: 6 },
    },
    {
        id: "ai-agent",
        title: "AI AGENT",
        component: createElement(AIChatPanel),
        closeable: true,
        defaultLayout: { x: 0, y: 15, w: 12, h: 4 },
    },

    // ===== ANALYZE TAB =====
    // Deep analysis and transcription
    {
        id: "transcription",
        title: "TRANSCRIPTION",
        component: createElement(TranscriptionPanel),
        closeable: false,
        defaultLayout: { x: 0, y: 0, w: 6, h: 8 },
    },
    {
        id: "spectral",
        title: "SPECTRAL",
        component: createElement(SpectralPanel),
        closeable: true,
        defaultLayout: { x: 6, y: 0, w: 6, h: 8 },
    },
    {
        id: "timeline",
        title: "TIMELINE",
        component: createElement(TimelinePanel),
        closeable: true,
        defaultLayout: { x: 0, y: 8, w: 12, h: 4 },
    },
];

/**
 * Default Tab Structure
 *
 * Initial tab configuration on first load.
 *
 * LOOP - The feedback loop workspace (composition + performance unified)
 * ANALYZE - Audio analysis & transcription
 */
export const DEFAULT_TABS = [
    {
        id: "loop",
        name: "LOOP",
        panelIds: [
            "input",
            "loop-visualizer",
            "sequencer",
            "transport",
            "synthesis",
            "effects",
            "mixer",
            "metering",
            "piano-roll",
            "ai-agent",
        ],
    },
    {
        id: "analyze",
        name: "ANALYZE",
        panelIds: ["transcription", "spectral", "timeline"],
    },
];

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
    LAYOUT: "sonic-claude-layout",
    WINDOW_STATE: "sonic-claude-window-state",
} as const;

/**
 * BroadcastChannel Keys
 */
export const BROADCAST_KEYS = {
    LAYOUT: "layout",
    POPOUT_OPENED: "popout-opened",
    POPOUT_CLOSED: "popout-closed",
} as const;

/**
 * Default Layout State
 */
export const DEFAULT_LAYOUT_STATE = {
    tabs: DEFAULT_TABS,
    activeTab: "loop",
    poppedOutTabs: [] as string[],
    layouts: {} as Record<string, Record<string, { x: number; y: number; w: number; h: number }>>,
};

