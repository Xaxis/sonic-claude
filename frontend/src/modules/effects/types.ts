/**
 * Effects Module Types
 *
 * Type definitions for the effects module following MixerPanel pattern.
 * Re-exports types from the API providers for module use.
 */

// Re-export provider types for convenience
export type {
    EffectDefinition,
    EffectParameter,
    EffectInstance,
    TrackEffectChain,
    CreateEffectRequest,
    UpdateEffectRequest,
} from "@/services/api/providers";
