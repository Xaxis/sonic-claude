/**
 * Grid Layout Types
 *
 * Type definitions for react-grid-layout to avoid confusion
 * between Layout (array) and LayoutItem (single item).
 */

// Single layout item for a panel
export interface GridLayoutItem {
    i: string; // Panel ID
    x: number; // X position in grid units
    y: number; // Y position in grid units
    w: number; // Width in grid units
    h: number; // Height in grid units
    minW?: number; // Minimum width
    minH?: number; // Minimum height
    maxW?: number; // Maximum width
    maxH?: number; // Maximum height
    static?: boolean; // Cannot be dragged or resized
    isDraggable?: boolean; // Can be dragged
    isResizable?: boolean; // Can be resized
}

// Array of layout items (what react-grid-layout calls "Layout")
export type GridLayout = GridLayoutItem[];

/**
 * Panel Attachment System Types
 *
 * Enables panels to "snap" to edges of other panels with user-controlled
 * attachment/detachment behavior (like magnetic window snapping in modern OSes).
 */

// Edge of a panel that can be snapped to
export type PanelEdge = "top" | "bottom" | "left" | "right";

// Snap target configuration - defines which panels this panel can snap to
export interface PanelSnapTarget {
    panelId: string; // ID of panel to snap to (e.g., "mixer")
    edges: PanelEdge[]; // Which edges can be snapped to (e.g., ["bottom"])
    snapDistance?: number; // Pixels to trigger snap zone (default: 20)
}

// Current attachment state for a panel
export interface PanelAttachment {
    attachedTo: string; // Panel ID this panel is attached to
    edge: PanelEdge; // Which edge it's attached to
    offset?: { x: number; y: number }; // Optional offset from edge
}

// Snap zone detection result
export interface SnapZone {
    targetPanelId: string; // Panel being snapped to
    edge: PanelEdge; // Edge being snapped to
    snapPosition: { x: number; y: number }; // Calculated snap position
    distance: number; // Distance from snap zone
}
