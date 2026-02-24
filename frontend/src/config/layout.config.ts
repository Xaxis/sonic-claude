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
import { VisualizerPanel } from "@/modules/visualizer";
import { SequencerPanel } from "@/modules/sequencer";
import { MixerPanel } from "@/modules/mixer";
import { EffectsPanel } from "@/modules/effects";
import { AssistantPanel } from "@/modules/assistant";

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
        defaultLayout: { x: 0, y: 0, w: 6, h: 10 },
    },
    {
        id: "loop-visualizer",
        title: "LOOP",
        component: createElement(VisualizerPanel),
        closeable: false,
        getSubtitle: () => "Active • 120 BPM • 4/4 • Position: 8.2 beats",
        defaultLayout: { x: 6, y: 0, w: 6, h: 10 },
    },
    {
        id: "sequencer",
        title: "SEQUENCER",
        component: createElement(SequencerPanel),
        closeable: false,
        getSubtitle: () => "Timeline + Transport • 0 tracks • 0 clips",
        defaultLayout: { x: 0, y: 6, w: 12, h: 12 },
    },
    {
        id: "mixer",
        title: "MIXER",
        component: createElement(MixerPanel),
        closeable: false,
        getSubtitle: () => "0 channels • Master: 0.0 dB",
        defaultLayout: { x: 0, y: 12, w: 12, h: 14 },
    },
    {
        id: "effects",
        title: "EFFECTS",
        component: createElement(EffectsPanel),
        closeable: false,
        getSubtitle: () => "Track FX • 0 effects",
        defaultLayout: { x: 0, y: 26, w: 12, h: 12 },
        snapTargets: [
            {
                panelId: "mixer",
                edges: ["bottom"],
                snapDistance: 20,
            },
        ],
    },
    {
        id: "ai",
        title: "ASSISTANT",
        component: createElement(AssistantPanel),
        closeable: false,
        getSubtitle: () => "Chat • State Viewer • Autonomous: Off",
        defaultLayout: { x: 0, y: 38, w: 12, h: 16 },
    },

];

/**
 * Default Tab Structure
 *
 * Initial tab configuration on first load.
 */
export const DEFAULT_TABS = [
    {
        id: "compose",
        name: "COMPOSE",
        panelIds: [
            "sequencer",
            "mixer",
            "effects",
        ],
    },
    {
        id: "interact",
        name: "INTERACT",
        panelIds: [
            "input",
            "loop-visualizer",
            "ai"
        ],
    },
];

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
    LAYOUT: "sonic-claude-layout-v2",
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
    xrayEnabled: false,
    xraySourceTab: null,
    xrayTargetTab: null,
    xrayOpacity: 0.5,
};
