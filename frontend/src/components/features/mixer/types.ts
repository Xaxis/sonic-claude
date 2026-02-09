/**
 * Mixer Feature Types
 */

export interface MixerTrack {
    id: string;
    name: string;
    volume: number;  // 0.0-2.0
    pan: number;  // -1.0 to 1.0
    is_muted: boolean;
    is_solo: boolean;
    send_levels: Record<string, number>;  // aux_track_id -> level
    effect_chain: string[];  // effect_ids
    group_id: string | null;
    bus_index: number;
}

export interface CreateTrackRequest {
    name: string;
    volume?: number;
    pan?: number;
}

export interface UpdateTrackVolumeRequest {
    volume: number;
}

export interface UpdateTrackPanRequest {
    pan: number;
}

export interface SetSendLevelRequest {
    aux_track_id: string;
    level: number;
}

export interface AddEffectToTrackRequest {
    effect_id: string;
    position?: number;
}

export interface SetTrackGroupRequest {
    group_id: string | null;
}

