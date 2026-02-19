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
    tempo: number;
    is_playing: boolean;
    track_count: number;
    clip_count: number;
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
    timestamp: Date;
    actions_executed?: number;
}

export interface ChatRequest {
    message: string;
}

export interface ChatResponse {
    response: string;
    actions_executed: number;
}

// ============================================================================
// AUTONOMOUS MODE
// ============================================================================

export interface AutonomousStatus {
    enabled: boolean;
    interval: number;
    last_run: string | null;
}

