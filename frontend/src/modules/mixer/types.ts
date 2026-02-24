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
    input_source?: string | null; // Audio input, sequencer track, etc.
    input_gain?: number; // dB (-60 to +12)
    phase_invert?: boolean;
    
    // Insert Effects (pre-fader) - Future feature
    inserts?: InsertSlot[];

    // EQ - Future feature
    eq_enabled?: boolean;
    eq_high_gain?: number; // dB
    eq_high_freq?: number; // Hz
    eq_mid_gain?: number;
    eq_mid_freq?: number;
    eq_mid_q?: number;
    eq_low_gain?: number;
    eq_low_freq?: number;

    // Sends (pre or post fader) - Future feature
    sends?: SendLevel[];
    
    // Channel Strip
    pan: number; // -1.0 (left) to 1.0 (right)
    fader: number; // dB (-inf to +12)
    mute: boolean;
    solo: boolean;
    
    // Routing
    output_bus?: string; // "master", "group_1", etc.
    group_id?: string | null;

    // Metering
    meter_peak_left: number; // dB
    meter_peak_right: number; // dB
    meter_rms_left?: number; // dB - Future feature
    meter_rms_right?: number; // dB - Future feature

    // State
    armed?: boolean; // For recording - Future feature
    monitoring?: boolean; // Input monitoring - Future feature

    // SuperCollider
    sc_node_id?: number | null;
    sc_bus_index?: number | null;

    // Timestamps
    created_at: string;
    updated_at: string;
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

export interface MasterChannel {
    id: string;
    name: string;
    color: string;
    type: "master";

    // Channel Strip
    fader: number; // dB
    mute: boolean;

    // Metering
    meter_peak_left: number; // dB
    meter_peak_right: number; // dB

    // Master-specific
    limiter_enabled: boolean;
    limiter_threshold: number; // dB
    limiter_release?: number; // ms - Future feature

    // Headroom - Future feature
    headroom_warning_threshold?: number; // dB (e.g., -3dB)

    // SuperCollider
    sc_bus_index: number;

    // Timestamps
    created_at: string;
    updated_at: string;
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

