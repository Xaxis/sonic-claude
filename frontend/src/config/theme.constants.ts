/**
 * Theme Constants
 *
 * Centralized color values for programmatic use (canvas, SVG, inline styles).
 * These mirror the CSS custom properties defined in globals.css.
 *
 * Note: Use Tailwind utility classes (bg-primary, text-accent, etc.) in JSX
 * wherever possible. Import these constants only when you need raw color strings
 * (canvas 2D, SVG attributes, WebGL, etc.).
 */

// ============================================================================
// SEMANTIC THEME COLORS (HSL — match globals.css variables)
// ============================================================================

export const THEME_PRIMARY_HSL    = "hsl(187 85% 55%)";  // Cyan
export const THEME_SECONDARY_HSL  = "hsl(280 85% 65%)";  // Magenta
export const THEME_ACCENT_HSL     = "hsl(45 95% 60%)";   // Yellow
export const THEME_DESTRUCTIVE_HSL= "hsl(0 85% 60%)";    // Red
export const THEME_BACKGROUND_HSL = "hsl(220 15% 6%)";
export const THEME_BORDER_HSL     = "hsl(220 15% 15%)";

// ============================================================================
// WAVEFORM RENDERING COLORS (RGBA — used in canvas / WaveformDisplay)
// ============================================================================

/** Left channel waveform color (cyan) */
export const WAVEFORM_COLOR_LEFT  = "rgba(6, 182, 212, 0.9)";

/** Right channel waveform color (magenta/purple) */
export const WAVEFORM_COLOR_RIGHT = "rgba(192, 132, 252, 0.9)";

// ============================================================================
// PERFORMANCE PAD / CLIP COLOR PALETTE
// ============================================================================

/**
 * 16-color hardware-pad palette — Akai Force / Ableton Live style.
 * High-saturation HSL values tuned for the dark app theme.
 *
 * Used by ClipLauncherSlot (full palette) and ClipLauncherScene (cycles through).
 * Index 0-3 align with primary, secondary, accent, destructive semantics.
 */
export const CLIP_COLOR_PALETTE = [
    "hsl(187 85% 55%)",  // 0  Cyan      (primary)
    "hsl(280 85% 65%)",  // 1  Magenta   (secondary)
    "hsl(45 95% 60%)",   // 2  Yellow    (accent)
    "hsl(0 85% 60%)",    // 3  Red       (destructive)
    "hsl(120 85% 55%)",  // 4  Green
    "hsl(210 85% 60%)",  // 5  Blue
    "hsl(30 90% 60%)",   // 6  Orange
    "hsl(270 85% 65%)",  // 7  Purple
    "hsl(160 85% 55%)",  // 8  Teal
    "hsl(330 85% 65%)",  // 9  Pink
    "hsl(60 90% 60%)",   // 10 Lime
    "hsl(180 85% 60%)",  // 11 Aqua
    "hsl(300 85% 65%)",  // 12 Fuchsia
    "hsl(15 90% 60%)",   // 13 Coral
    "hsl(240 85% 65%)",  // 14 Indigo
    "hsl(90 85% 55%)",   // 15 Chartreuse
] as const;
