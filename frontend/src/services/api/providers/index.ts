/**
 * API Providers - Barrel Export
 *
 * Providers are thin HTTP clients that map 1:1 to backend API routes.
 * They extend BaseAPIClient and contain NO business logic.
 */

export { CompositionsProvider } from "./compositions.provider";
export { SequencerProvider } from "./sequencer.provider";
export { MixerProvider } from "./mixer.provider";
export { EffectsProvider } from "./effects.provider";
export { AudioProvider } from "./audio.provider";
export { AIProvider } from "./ai.provider";
export { SamplesProvider } from "./samples.provider";

// Re-export types
export type {
    CreateCompositionRequest,
    UpdateCompositionRequest,
    CompositionMetadata,
    CompositionListResponse,
    CompositionCreatedResponse,
    CompositionSavedResponse,
    CompositionDeletedResponse,
    LoadAllCompositionsResponse,
    CompositionHistoryEntry,
    ListHistoryResponse,
    ChatMessage,
    ChatHistoryResponse,
} from "./compositions.provider";

export type {
    CreateSequenceRequest,
    UpdateSequenceRequest,
    SetTempoRequest,
    SeekRequest,
    PlaySequenceRequest,
    AddClipRequest,
    UpdateClipRequest,
    CreateTrackRequest,
    UpdateTrackRequest,
    RenameTrackRequest,
    MuteTrackRequest,
    SoloTrackRequest,
    MetronomeVolumeRequest,
    PreviewNoteRequest,
} from "./sequencer.provider";

export type {
    CreateChannelRequest,
    UpdateChannelRequest,
    UpdateMasterRequest,
} from "./mixer.provider";

export type {
    // Domain types
    EffectParameter,
    EffectDefinition,
    EffectInstance,
    TrackEffectChain,
    // Request/Response types
    CreateEffectRequest,
    UpdateEffectRequest,
    MoveEffectRequest,
    EffectListResponse,
    TrackEffectChainResponse,
} from "./effects.provider";

export type {
    CreateSynthRequest,
    SetSynthParamRequest,
    SetInputDeviceRequest,
    SetInputGainRequest,
    SynthInfo,
    InputStatus,
} from "./audio.provider";

export type {
    ChatRequest,
    ChatResponse,
    GetStateRequest,
    GetStateResponse,
    DAWAction,
    ActionResult,
    BatchActionRequest,
    BatchActionResponse,
} from "./ai.provider";

export type {
    SampleMetadata,
    SampleResponse,
    SampleListResponse,
    UpdateSampleRequest,
    UpdateDurationRequest,
} from "./samples.provider";

