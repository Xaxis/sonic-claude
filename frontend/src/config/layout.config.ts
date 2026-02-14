/**
 * Layout Configuration
 *
 * Central configuration for all layout-related settings:
 * - Default panel definitions
 * - Default tab structure
 * - Grid layout settings
 * - Storage keys
 *
 * ============================================================================
 * CRITICAL PANEL ARCHITECTURE PATTERN - READ THIS BEFORE CREATING PANELS!
 * ============================================================================
 *
 * 1. ALL panel components MUST wrap their content in <Panel> component
 * 2. Panel component handles: title, subtitle, drag handle, close button
 * 3. PanelGrid does NOT wrap panels - it renders panel.component directly
 * 4. Each panel manages its own Panel wrapper with DYNAMIC subtitle
 *
 * CORRECT PATTERN:
 * ```tsx
 * export function MyPanel() {
 *   const [activeTab, setActiveTab] = useState("tab1");
 *
 *   // Subtitle shows DYNAMIC STATUS - never static text!
 *   const getSubtitle = () => {
 *     return `${activeTab} • 5 items • Active`;
 *   };
 *
 *   return (
 *     <Panel title="MY PANEL" subtitle={getSubtitle()} draggable={true}>
 *       <SubPanel title="Section">
 *         {content}
 *       </SubPanel>
 *     </Panel>
 *   );
 * }
 * ```
 *
 * SUBTITLE EXAMPLES (show context, NOT title):
 * - INPUT: "Library • 1,247 samples loaded"
 * - LOOP: "Active • 120 BPM • 4/4 • Position: 8.2 beats"
 * - MIXER: "8 tracks • Master: -6.2 dB"
 * - AI AGENT: "Ready • 3 suggestions pending"
 *
 * ============================================================================
 */

import type { PanelConfig } from "@/components/layout";
import { InputPanel } from "@/modules/input";
import { LoopVisualizerPanel } from "@/modules/loop-visualizer";
import { SequencerPanel } from "@/modules/sequencer";
// TransportPanel removed - now integrated into SequencerPanel
// Commented out unused panel imports - uncomment when adding panels to DEFAULT_PANELS
// import { SynthesisPanel } from "@/components/features/synthesis";
// import { EffectsPanel } from "@/components/features/effects";
// import { MixerPanel } from "@/components/features/mixer";
// import { MeteringPanel } from "@/components/features/metering";
// import { PianoRollPanel } from "@/components/features/piano-roll";
// import { AIChatPanel } from "@/components/features/ai-chat";
// import { TranscriptionPanel } from "@/components/features/transcription";
// import { SpectralPanel } from "@/components/features/spectral";
// import { TimelinePanel } from "@/components/features/timeline";

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
    // Main workspace

    {
        id: "input",
        title: "INPUT",
        component: createElement(InputPanel),
        closeable: false,
        getSubtitle: () => "Library • 4 samples loaded",
        defaultLayout: { x: 0, y: 0, w: 3, h: 10 },
    },
    {
        id: "sequencer",
        title: "SEQUENCER",
        component: createElement(SequencerPanel),
        closeable: false,
        getSubtitle: () => "Timeline + Transport • 0 tracks • 0 clips",
        defaultLayout: { x: 3, y: 0, w: 6, h: 10 },
    },
    {
        id: "loop-visualizer",
        title: "LOOP",
        component: createElement(LoopVisualizerPanel),
        closeable: false,
        getSubtitle: () => "Active • 120 BPM • 4/4 • Position: 8.2 beats",
        defaultLayout: { x: 9, y: 0, w: 3, h: 10 },
    },
    // {
    //     id: "mixer",
    //     title: "MIXER",
    //     component: createElement(MixerPanel),
    //     closeable: false,
    //     getSubtitle: () => "8 tracks • Master: -6.2 dB",
    //     defaultLayout: { x: 8, y: 0, w: 4, h: 8 },
    // },
    // TRANSPORT PANEL REMOVED - Now integrated into Sequencer Panel
    // {
    //     id: "transport",
    //     title: "TRANSPORT",
    //     component: createElement(TransportPanel),
    //     closeable: false,
    //     getSubtitle: () => "Master playback controls",
    //     defaultLayout: { x: 0, y: 8, w: 2, h: 2 },
    // },
    // {
    //     id: "synthesis",
    //     title: "SYNTHESIS",
    //     component: createElement(SynthesisPanel),
    //     closeable: true,
    //     getSubtitle: () => "Synth voice management",
    //     defaultLayout: { x: 2, y: 8, w: 3, h: 2 },
    // },
    // {
    //     id: "effects",
    //     title: "EFFECTS",
    //     component: createElement(EffectsPanel),
    //     closeable: true,
    //     getSubtitle: () => "5 effects in chain • 4 active",
    //     defaultLayout: { x: 5, y: 8, w: 3, h: 2 },
    // },
    // {
    //     id: "metering",
    //     title: "METERING",
    //     component: createElement(MeteringPanel),
    //     closeable: true,
    //     getSubtitle: () => "Peak: -3.2 dB • RMS: -12.4 dB",
    //     defaultLayout: { x: 8, y: 8, w: 4, h: 2 },
    // },
    //
    // {
    //     id: "piano-roll",
    //     title: "PIANO ROLL",
    //     component: createElement(PianoRollPanel),
    //     closeable: true,
    //     getSubtitle: () => "Clip: Bass Line • 7 notes • C3-C6",
    //     defaultLayout: { x: 0, y: 10, w: 8, h: 6 },
    // },
    // {
    //     id: "ai-agent",
    //     title: "AI AGENT",
    //     component: createElement(AIChatPanel),
    //     closeable: true,
    //     getSubtitle: () => "Ready • 3 suggestions pending",
    //     defaultLayout: { x: 8, y: 10, w: 4, h: 6 },
    // },
    //
    // // ===== ANALYZE TAB =====
    // // Deep analysis and transcription
    // {
    //     id: "transcription",
    //     title: "TRANSCRIPTION",
    //     component: createElement(TranscriptionPanel),
    //     closeable: false,
    //     defaultLayout: { x: 0, y: 0, w: 6, h: 8 },
    // },
    // {
    //     id: "spectral",
    //     title: "SPECTRAL",
    //     component: createElement(SpectralPanel),
    //     closeable: true,
    //     defaultLayout: { x: 6, y: 0, w: 6, h: 8 },
    // },
    // {
    //     id: "timeline",
    //     title: "TIMELINE",
    //     component: createElement(TimelinePanel),
    //     closeable: true,
    //     defaultLayout: { x: 0, y: 8, w: 12, h: 4 },
    // },
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
        id: "compose",
        name: "COMPOSE",
        panelIds: [
            "input",
            "loop-visualizer",
            "sequencer",
        ],
    },
];

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
    LAYOUT: "sonic-claude-layout-v2", // v2: Added unified Sequencer Panel with integrated Transport
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
    activeTab: "compose",
    poppedOutTabs: [] as string[],
    layouts: {} as Record<string, Record<string, { x: number; y: number; w: number; h: number }>>,
};
