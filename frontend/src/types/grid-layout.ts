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
