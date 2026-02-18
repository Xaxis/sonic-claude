/**
 * Effects Module Types
 *
 * Type definitions for the effects module following MixerPanel pattern.
 * Re-exports types from the effects service for module use.
 */

// Re-export service types for convenience
export type {
    EffectDefinition,
    EffectParameter,
    EffectInstance,
    TrackEffectChain,
    CreateEffectRequest,
    UpdateEffectParameterRequest,
} from "@/services/effects";
