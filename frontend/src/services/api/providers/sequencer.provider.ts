/**
 * Sequencer API Provider
 * Thin HTTP client mapping to /api/sequencer/* routes
 * 
 * Backend routes:
 * - POST   /api/sequencer/sequences                      (sequences.py)
 * - GET    /api/sequencer/sequences                      (sequences.py)
 * - GET    /api/sequencer/sequences/{id}                 (sequences.py)
 * - PATCH  /api/sequencer/sequences/{id}                 (sequences.py)
 * - DELETE /api/sequencer/sequences/{id}                 (sequences.py)
 * - POST   /api/sequencer/sequences/{id}/play            (playback.py)
 * - POST   /api/sequencer/sequences/{id}/stop            (playback.py)
 * - POST   /api/sequencer/sequences/{id}/pause           (playback.py)
 * - POST   /api/sequencer/sequences/{id}/resume          (playback.py)
 * - POST   /api/sequencer/sequences/{id}/tempo           (playback.py)
 * - POST   /api/sequencer/sequences/{id}/seek            (playback.py)
 * - GET    /api/sequencer/sequences/{id}/state           (playback.py)
 * - POST   /api/sequencer/clips                          (clips.py)
 * - GET    /api/sequencer/clips/{id}                     (clips.py)
 * - PATCH  /api/sequencer/clips/{id}                     (clips.py)
 * - DELETE /api/sequencer/clips/{id}                     (clips.py)
 * - POST   /api/sequencer/tracks                         (tracks.py)
 * - GET    /api/sequencer/tracks/{id}                    (tracks.py)
 * - PATCH  /api/sequencer/tracks/{id}                    (tracks.py)
 * - POST   /api/sequencer/tracks/{id}/rename             (tracks.py)
 * - POST   /api/sequencer/tracks/{id}/mute               (tracks.py)
 * - POST   /api/sequencer/tracks/{id}/solo               (tracks.py)
 * - GET    /api/sequencer/synthdefs                      (synthdefs.py)
 * - POST   /api/sequencer/metronome/toggle               (metronome.py)
 * - POST   /api/sequencer/metronome/volume               (metronome.py)
 * - POST   /api/sequencer/preview                        (preview.py)
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSequenceRequest {
    name: string;
    tempo?: number;
    time_signature_num?: number;
    time_signature_den?: number;
}

export interface UpdateSequenceRequest {
    name?: string;
    tempo?: number;
    time_signature_num?: number;
    time_signature_den?: number;
    loop_enabled?: boolean;
    loop_start?: number;
    loop_end?: number;
}

export interface SetTempoRequest {
    tempo: number;
}

export interface SeekRequest {
    position: number;
    trigger_audio?: boolean;
}

export interface PlaySequenceRequest {
    position?: number;
}

export interface AddClipRequest {
    sequence_id: string;  // Used to construct URL, not sent in body
    clip_type: "midi" | "audio";
    track_id: string;
    start_time: number;  // Backend uses start_time, not start_beat
    duration: number;    // Backend uses duration, not duration_beats
    midi_events?: any[];
    audio_file_path?: string;
    name?: string;
}

export interface UpdateClipRequest {
    start_time?: number;
    duration?: number;
    midi_events?: any[];
    is_muted?: boolean;
    is_looped?: boolean;
    gain?: number;
    audio_offset?: number;
}

export interface CreateTrackRequest {
    sequence_id: string;
    name: string;
    type: "midi" | "audio" | "sample";  // Backend uses 'type', not 'track_type'
    instrument?: string;  // For MIDI tracks
}

export interface UpdateTrackRequest {
    name?: string;
    volume?: number;  // 0.0-2.0, 1.0 = unity
    pan?: number;     // -1.0 to 1.0
    instrument?: string;  // For MIDI tracks
}

export interface RenameTrackRequest {
    name: string;
}

export interface MuteTrackRequest {
    muted: boolean;
}

export interface SoloTrackRequest {
    soloed: boolean;
}

export interface MetronomeVolumeRequest {
    volume: number;
}

export interface PreviewNoteRequest {
    note: number;
    velocity?: number;
    duration?: number;
    synthdef?: string;
}

// ============================================================================
// SEQUENCER PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class SequencerProvider extends BaseAPIClient {
    // === SEQUENCES ===
    async createSequence(request: CreateSequenceRequest): Promise<any> {
        return this.post("/api/sequencer/sequences", request);
    }

    async getSequences(): Promise<any[]> {
        return this.get("/api/sequencer/sequences");
    }

    async getSequence(id: string): Promise<any> {
        return this.get(`/api/sequencer/sequences/${id}`);
    }

    async updateSequence(id: string, request: UpdateSequenceRequest): Promise<any> {
        return this.patch(`/api/sequencer/sequences/${id}`, request);
    }

    async deleteSequence(id: string): Promise<any> {
        return this.delete(`/api/sequencer/sequences/${id}`);
    }

    // === PLAYBACK ===
    async play(id: string, request?: PlaySequenceRequest): Promise<any> {
        return this.post(`/api/sequencer/sequences/${id}/play`, request || {});
    }

    async stop(id: string): Promise<any> {
        return this.post(`/api/sequencer/sequences/${id}/stop`, {});
    }

    async pause(id: string): Promise<any> {
        return this.post(`/api/sequencer/sequences/${id}/pause`, {});
    }

    async resume(id: string): Promise<any> {
        return this.post(`/api/sequencer/sequences/${id}/resume`, {});
    }

    async setTempo(id: string, request: SetTempoRequest): Promise<any> {
        return this.post(`/api/sequencer/sequences/${id}/tempo`, request);
    }

    async seek(id: string, request: SeekRequest): Promise<any> {
        return this.post(`/api/sequencer/sequences/${id}/seek`, request);
    }

    async getState(id: string): Promise<any> {
        return this.get(`/api/sequencer/sequences/${id}/state`);
    }

    // === CLIPS ===
    async addClip(request: AddClipRequest): Promise<any> {
        const { sequence_id, ...body } = request;
        return this.post(`/api/sequencer/sequences/${sequence_id}/clips`, body);
    }

    async getClip(id: string): Promise<any> {
        return this.get(`/api/sequencer/clips/${id}`);
    }

    async updateClip(id: string, request: UpdateClipRequest): Promise<any> {
        return this.patch(`/api/sequencer/clips/${id}`, request);
    }

    async deleteClip(id: string): Promise<any> {
        return this.delete(`/api/sequencer/clips/${id}`);
    }

    async duplicateClip(sequenceId: string, clipId: string): Promise<any> {
        return this.post(`/api/sequencer/sequences/${sequenceId}/clips/${clipId}/duplicate`, {});
    }

    // === TRACKS ===
    async createTrack(request: CreateTrackRequest): Promise<any> {
        return this.post("/api/sequencer/tracks", request);
    }

    async getTrack(id: string): Promise<any> {
        return this.get(`/api/sequencer/tracks/${id}`);
    }

    async updateTrack(id: string, request: UpdateTrackRequest): Promise<any> {
        return this.put(`/api/sequencer/tracks/${id}`, request);
    }

    async renameTrack(id: string, request: RenameTrackRequest): Promise<any> {
        return this.post(`/api/sequencer/tracks/${id}/rename`, request);
    }

    async muteTrack(id: string, request: MuteTrackRequest): Promise<any> {
        return this.post(`/api/sequencer/tracks/${id}/mute`, request);
    }

    async soloTrack(id: string, request: SoloTrackRequest): Promise<any> {
        return this.post(`/api/sequencer/tracks/${id}/solo`, request);
    }

    async deleteTrack(id: string): Promise<any> {
        return this.delete(`/api/sequencer/tracks/${id}`);
    }

    // === SYNTHDEFS ===
    async getSynthDefs(): Promise<any[]> {
        return this.get("/api/sequencer/synthdefs");
    }

    // === METRONOME ===
    async toggleMetronome(): Promise<any> {
        return this.post("/api/sequencer/metronome/toggle", {});
    }

    async setMetronomeVolume(request: MetronomeVolumeRequest): Promise<any> {
        return this.post("/api/sequencer/metronome/volume", request);
    }

    // === PREVIEW ===
    async previewNote(request: PreviewNoteRequest): Promise<any> {
        return this.post("/api/sequencer/preview", request);
    }
}

