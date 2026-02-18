/**
 * Mixer Module Types
 * 
 * Type definitions for the mixer module following professional DAW patterns.
 * Supports channel strips, sends, returns, groups, and routing.
 */

export interface MixerChannel {
    id: string;
    name: string;
    color: string;
    type: "audio" | "instrument" | "aux" | "group" | "master";
    
    // Input
    input_source: string | null; // Audio input, sequencer track, etc.
    input_gain: number; // dB (-60 to +12)
    phase_invert: boolean;
    
    // Insert Effects (pre-fader)
    inserts: InsertSlot[];
    
    // EQ
    eq_enabled: boolean;
    eq_high_gain: number; // dB
    eq_high_freq: number; // Hz
    eq_mid_gain: number;
    eq_mid_freq: number;
    eq_mid_q: number;
    eq_low_gain: number;
    eq_low_freq: number;
    
    // Sends (pre or post fader)
    sends: SendLevel[];
    
    // Channel Strip
    pan: number; // -1.0 (left) to 1.0 (right)
    fader: number; // dB (-inf to +12)
    mute: boolean;
    solo: boolean;
    
    // Routing
    output_bus: string; // "master", "group_1", etc.
    group_id: string | null;
    
    // Metering
    meter_peak_left: number; // dB
    meter_peak_right: number; // dB
    meter_rms_left: number; // dB
    meter_rms_right: number; // dB
    
    // State
    armed: boolean; // For recording
    monitoring: boolean; // Input monitoring
    
    // SuperCollider
    sc_node_id: number | null;
    sc_bus_index: number | null;
}

export interface InsertSlot {
    id: string;
    slot_number: number; // 1-4
    effect_id: string | null;
    enabled: boolean;
    pre_fader: boolean;
}

export interface SendLevel {
    id: string;
    send_bus_id: string;
    level: number; // dB (-inf to +12)
    enabled: boolean;
    pre_fader: boolean;
}

export interface SendBus {
    id: string;
    name: string;
    color: string;
    
    // Return channel
    return_channel_id: string;
    
    // Routing
    output_bus: string; // Usually "master"
    
    // SuperCollider
    sc_bus_index: number | null;
}

export interface GroupChannel extends MixerChannel {
    type: "group";
    member_channel_ids: string[];
}

export interface MasterChannel extends MixerChannel {
    type: "master";
    
    // Master-specific
    limiter_enabled: boolean;
    limiter_threshold: number; // dB
    limiter_release: number; // ms
    
    // Headroom
    headroom_warning_threshold: number; // dB (e.g., -3dB)
}

export interface MixerState {
    channels: MixerChannel[];
    send_buses: SendBus[];
    groups: GroupChannel[];
    master: MasterChannel;
    
    // View settings
    show_meters: boolean;
    show_sends: boolean;
    show_inserts: boolean;
    show_eq: boolean;
    meter_mode: "peak" | "rms" | "both";
    
    // Selection
    selected_channel_id: string | null;
    solo_mode: "pfl" | "afl"; // Pre-fader listen or After-fader listen
}

export interface MixerSnapshot {
    id: string;
    name: string;
    timestamp: string;
    state: MixerState;
}

// API Request/Response types
export interface CreateChannelRequest {
    name: string;
    type: "audio" | "instrument" | "aux" | "group";
    color?: string;
}

export interface UpdateChannelRequest {
    name?: string;
    color?: string;
    input_gain?: number;
    pan?: number;
    fader?: number;
    mute?: boolean;
    solo?: boolean;
    output_bus?: string;
}

export interface CreateSendBusRequest {
    name: string;
    color?: string;
}

export interface UpdateSendRequest {
    level?: number;
    enabled?: boolean;
    pre_fader?: boolean;
}

