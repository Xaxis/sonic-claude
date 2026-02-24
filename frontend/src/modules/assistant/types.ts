/**
 * AI Module Types
 * 
 * Type definitions for AI integration
 */

// ============================================================================
// DAW STATE
// ============================================================================

export interface CompactMIDINote {
    n: number;  // MIDI note number
    s: number;  // Start time in beats
    d: number;  // Duration in beats
    v: number;  // Velocity
}

export interface CompactClip {
    id: string;
    name: string;
    track: string;  // Track ID
    type: "midi" | "audio";
    start: number;  // Start time in beats
    dur: number;    // Duration in beats
    muted: boolean;
    notes?: CompactMIDINote[] | null;  // MIDI-specific
    file?: string | null;  // Audio-specific
}

export interface CompactTrack {
    id: string;
    name: string;
    type: "midi" | "audio" | "sample";
    instrument?: string | null;  // For MIDI tracks
    vol: number;  // Volume (0.0-2.0)
    pan: number;  // Pan (-1.0 to 1.0)
    muted: boolean;
    solo: boolean;
}

export interface CompactSequence {
    id: string;
    name: string;
    tempo: number;
    time_sig: string;
    tracks: CompactTrack[];
    clips: CompactClip[];
}

export interface AudioFeatures {
    energy: number;
    brightness: number;
    loudness_db: number;
    is_playing: boolean;
}

export interface MusicalContext {
    key: string | null;
    scale: string | null;
    note_density: number;
    pitch_range: [number, number];
    complexity: number;
}

export interface DAWStateSnapshot {
    timestamp: string;
    playing: boolean;
    position: number;
    tempo: number;
    sequence: CompactSequence | null;
    audio: AudioFeatures | null;
    musical: MusicalContext | null;
    state_hash: string | null;
}

// ============================================================================
// AI ACTIONS
// ============================================================================

export interface DAWAction {
    action: string;
    parameters: Record<string, any>;
}

export interface ActionResult {
    success: boolean;
    action: string;
    message: string;
    error?: string;
    data?: Record<string, any>;
}

// ============================================================================
// CHAT
// ============================================================================

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    actions_executed?: ActionResult[];
}

export interface ChatRequest {
    message: string;
    context?: string;
}

export interface ChatResponse {
    response: string;
    actions_taken?: ActionResult[];
    context?: string;
}

export interface AnalysisEvent {
    id: string;
    timestamp: string;
    type: "system_prompt" | "context" | "user_message" | "llm_response" | "tool_call" | "action_result" | "action";
    message?: string;
    content?: string;
    metadata?: Record<string, any>;
}

