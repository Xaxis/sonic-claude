/**
 * UI Density Constants
 *
 * Canonical sizing tokens for DAW UI components. These complement the
 * html font-size density system: Tailwind rem utilities scale automatically,
 * but hardcoded `size=` props on Lucide icons and inline style values need
 * explicit tokens.
 *
 * Usage:
 *   import { ICON_SIZE } from "@/config/ui-density.constants";
 *   <Pencil size={ICON_SIZE.sm} />
 *
 * Rule: Use Tailwind classes (text-xs, h-7, p-2) in JSX markup — these scale
 * with font-size automatically. Import these constants only for numeric props
 * (Lucide size=, SVG dimensions) where a class string cannot be used.
 */

/** Canonical Lucide icon size= prop values (pixels — intentionally px, stay crisp) */
export const ICON_SIZE = {
    xs:      10,
    sm:      12,
    default: 14,
    lg:      16,
    xl:      20,
} as const;

/**
 * Canonical component height Tailwind classes.
 * These use rem so they scale with the html font-size density setting.
 */
export const COMPONENT_H = {
    xs:      'h-5',       // 1.25rem — ultra-compact row controls
    sm:      'h-6',       // 1.5rem  — compact controls
    default: 'h-7',       // 1.75rem — standard DAW control
    md:      'h-8',       // 2rem    — comfortable
    lg:      'h-9',       // 2.25rem
    toolbar: 'h-10',      // 2.5rem  — toolbars
    header:  'h-[60px]',  // 60px    — fixed header strip (intentionally px)
} as const;

/** Standard panel interior spacing (applied to direct children of Panel/SubPanel) */
export const PANEL_INNER = 'p-2 gap-2' as const;

/**
 * UI Density presets shown in the Appearance settings section.
 * Value is the CSS --ui-density multiplier (applied to 16px html font-size).
 */
export const DENSITY_PRESETS = [
    { label: 'Dense',     value: 0.75,  description: '12px base — maximum information density' },
    { label: 'Compact',   value: 0.875, description: '14px base — DAW feel (recommended)'      },
    { label: 'Standard',  value: 1.0,   description: '16px base — standard web sizing'         },
] as const;
