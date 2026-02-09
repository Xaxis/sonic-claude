/**
 * Audio Engine Service
 * Handles all SuperCollider audio engine API calls
 * Covers: Engine, Synthesis, Effects, Mixer, Sequencer (48 routes total)
 */

import { BaseAPIClient } from "./base";
import type { AudioEngineStatus } from "@/types";
import type {
    SynthDefInfo,
    Synth,
    CreateSynthRequest,
    UpdateSynthRequest,
} from "@/components/features/synthesis";
import type {
    EffectDefInfo,
    Effect,
    CreateEffectRequest,
    UpdateEffectRequest,
} from "@/components/features/effects";
import type {
    MixerTrack,
    CreateTrackRequest,
    UpdateTrackVolumeRequest,
    UpdateTrackPanRequest,
    SetSendLevelRequest,
    AddEffectToTrackRequest,
    SetTrackGroupRequest,
} from "@/components/features/mixer";
import type {
    Sequence,
    SequencerClip,
    CreateSequenceRequest,
    AddClipRequest,
    UpdateClipRequest,
    SetTempoRequest,
    SeekRequest,
} from "@/components/features/sequencer";

export class AudioEngineService extends BaseAPIClient {
    // ========================================================================
    // ENGINE ROUTES (4 routes)
    // ========================================================================

    /**
     * Start the audio engine
     */
    async startEngine(): Promise<{ status: string; message: string }> {
        return this.post("/engine/start");
    }

    /**
     * Stop the audio engine
     */
    async stopEngine(): Promise<{ status: string; message: string }> {
        return this.post("/engine/stop");
    }

    /**
     * Restart the audio engine
     */
    async restartEngine(): Promise<{ status: string; message: string }> {
        return this.post("/engine/restart");
    }

    /**
     * Get engine status
     */
    async getEngineStatus(): Promise<AudioEngineStatus> {
        return this.get("/engine/status");
    }

    // ========================================================================
    // SYNTHESIS ROUTES (5 routes)
    // ========================================================================

    /**
     * Get all available SynthDefs
     */
    async getSynthDefs(): Promise<SynthDefInfo[]> {
        return this.get("/synthesis/synthdefs");
    }

    /**
     * Create a new synth instance
     */
    async createSynth(request: CreateSynthRequest): Promise<Synth> {
        return this.post("/synthesis/synths", request);
    }

    /**
     * Get synth by ID
     */
    async getSynth(synthId: string): Promise<Synth> {
        return this.get(`/synthesis/synths/${synthId}`);
    }

    /**
     * Update synth parameters
     */
    async updateSynth(synthId: string, request: UpdateSynthRequest): Promise<Synth> {
        return this.put(`/synthesis/synths/${synthId}`, request);
    }

    /**
     * Free (delete) a synth
     */
    async freeSynth(synthId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/synthesis/synths/${synthId}`);
    }

    // ========================================================================
    // EFFECTS ROUTES (5 routes)
    // ========================================================================

    /**
     * Get all available EffectDefs
     */
    async getEffectDefs(): Promise<EffectDefInfo[]> {
        return this.get("/effects/effectdefs");
    }

    /**
     * Create a new effect instance
     */
    async createEffect(request: CreateEffectRequest): Promise<Effect> {
        return this.post("/effects/effects", request);
    }

    /**
     * Get effect by ID
     */
    async getEffect(effectId: string): Promise<Effect> {
        return this.get(`/effects/effects/${effectId}`);
    }

    /**
     * Update effect parameters
     */
    async updateEffect(effectId: string, request: UpdateEffectRequest): Promise<Effect> {
        return this.put(`/effects/effects/${effectId}`, request);
    }

    /**
     * Free (delete) an effect
     */
    async freeEffect(effectId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/effects/effects/${effectId}`);
    }

    // ========================================================================
    // MIXER ROUTES (17 routes)
    // ========================================================================

    /**
     * Create a new mixer track
     */
    async createTrack(request: CreateTrackRequest): Promise<MixerTrack> {
        return this.post("/mixer/tracks", request);
    }

    /**
     * Get all mixer tracks
     */
    async getTracks(): Promise<MixerTrack[]> {
        return this.get("/mixer/tracks");
    }

    /**
     * Get track by ID
     */
    async getTrack(trackId: string): Promise<MixerTrack> {
        return this.get(`/mixer/tracks/${trackId}`);
    }

    /**
     * Delete a track
     */
    async deleteTrack(trackId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/mixer/tracks/${trackId}`);
    }

    /**
     * Set track volume
     */
    async setTrackVolume(trackId: string, request: UpdateTrackVolumeRequest): Promise<MixerTrack> {
        return this.put(`/mixer/tracks/${trackId}/volume`, request);
    }

    /**
     * Set track pan
     */
    async setTrackPan(trackId: string, request: UpdateTrackPanRequest): Promise<MixerTrack> {
        return this.put(`/mixer/tracks/${trackId}/pan`, request);
    }

    /**
     * Mute a track
     */
    async muteTrack(trackId: string): Promise<MixerTrack> {
        return this.post(`/mixer/tracks/${trackId}/mute`);
    }

    /**
     * Unmute a track
     */
    async unmuteTrack(trackId: string): Promise<MixerTrack> {
        return this.post(`/mixer/tracks/${trackId}/unmute`);
    }

    /**
     * Solo a track
     */
    async soloTrack(trackId: string): Promise<MixerTrack> {
        return this.post(`/mixer/tracks/${trackId}/solo`);
    }

    /**
     * Unsolo a track
     */
    async unsoloTrack(trackId: string): Promise<MixerTrack> {
        return this.post(`/mixer/tracks/${trackId}/unsolo`);
    }

    /**
     * Set send level to aux track
     */
    async setSendLevel(trackId: string, request: SetSendLevelRequest): Promise<MixerTrack> {
        return this.put(`/mixer/tracks/${trackId}/sends`, request);
    }

    /**
     * Add effect to track
     */
    async addEffectToTrack(trackId: string, request: AddEffectToTrackRequest): Promise<MixerTrack> {
        return this.post(`/mixer/tracks/${trackId}/effects`, request);
    }

    /**
     * Remove effect from track
     */
    async removeEffectFromTrack(trackId: string, effectId: string): Promise<MixerTrack> {
        return this.delete(`/mixer/tracks/${trackId}/effects/${effectId}`);
    }

    /**
     * Reorder effects in track
     */
    async reorderTrackEffects(trackId: string, effectIds: string[]): Promise<MixerTrack> {
        return this.put(`/mixer/tracks/${trackId}/effects/order`, { effect_ids: effectIds });
    }

    /**
     * Set track group
     */
    async setTrackGroup(trackId: string, request: SetTrackGroupRequest): Promise<MixerTrack> {
        return this.put(`/mixer/tracks/${trackId}/group`, request);
    }

    /**
     * Get master track
     */
    async getMasterTrack(): Promise<MixerTrack> {
        return this.get("/mixer/master");
    }

    /**
     * Set master volume
     */
    async setMasterVolume(request: UpdateTrackVolumeRequest): Promise<MixerTrack> {
        return this.put("/mixer/master/volume", request);
    }

    /**
     * Set master pan
     */
    async setMasterPan(request: UpdateTrackPanRequest): Promise<MixerTrack> {
        return this.put("/mixer/master/pan", request);
    }

    // ========================================================================
    // SEQUENCER ROUTES (17 routes)
    // ========================================================================

    /**
     * Create a new sequence
     */
    async createSequence(request: CreateSequenceRequest): Promise<Sequence> {
        return this.post("/sequencer/sequences", request);
    }

    /**
     * Get all sequences
     */
    async getSequences(): Promise<Sequence[]> {
        return this.get("/sequencer/sequences");
    }

    /**
     * Get sequence by ID
     */
    async getSequence(sequenceId: string): Promise<Sequence> {
        return this.get(`/sequencer/sequences/${sequenceId}`);
    }

    /**
     * Delete a sequence
     */
    async deleteSequence(sequenceId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/sequencer/sequences/${sequenceId}`);
    }

    /**
     * Add clip to sequence
     */
    async addClip(sequenceId: string, request: AddClipRequest): Promise<SequencerClip> {
        return this.post(`/sequencer/sequences/${sequenceId}/clips`, request);
    }

    /**
     * Get clip by ID
     */
    async getClip(sequenceId: string, clipId: string): Promise<SequencerClip> {
        return this.get(`/sequencer/sequences/${sequenceId}/clips/${clipId}`);
    }

    /**
     * Update clip
     */
    async updateClip(sequenceId: string, clipId: string, request: UpdateClipRequest): Promise<SequencerClip> {
        return this.put(`/sequencer/sequences/${sequenceId}/clips/${clipId}`, request);
    }

    /**
     * Remove clip
     */
    async removeClip(sequenceId: string, clipId: string): Promise<{ status: string; message: string }> {
        return this.delete(`/sequencer/sequences/${sequenceId}/clips/${clipId}`);
    }

    /**
     * Play sequence
     */
    async playSequence(sequenceId: string): Promise<{ status: string; message: string }> {
        return this.post(`/sequencer/sequences/${sequenceId}/play`);
    }

    /**
     * Stop sequence
     */
    async stopSequence(sequenceId: string): Promise<{ status: string; message: string }> {
        return this.post(`/sequencer/sequences/${sequenceId}/stop`);
    }

    /**
     * Pause sequence
     */
    async pauseSequence(sequenceId: string): Promise<{ status: string; message: string }> {
        return this.post(`/sequencer/sequences/${sequenceId}/pause`);
    }

    /**
     * Resume sequence
     */
    async resumeSequence(sequenceId: string): Promise<{ status: string; message: string }> {
        return this.post(`/sequencer/sequences/${sequenceId}/resume`);
    }

    /**
     * Set tempo
     */
    async setTempo(sequenceId: string, request: SetTempoRequest): Promise<Sequence> {
        return this.put(`/sequencer/sequences/${sequenceId}/tempo`, request);
    }

    /**
     * Seek to position
     */
    async seek(sequenceId: string, request: SeekRequest): Promise<Sequence> {
        return this.put(`/sequencer/sequences/${sequenceId}/seek`, request);
    }

    /**
     * Get playback state
     */
    async getPlaybackState(sequenceId: string): Promise<{
        is_playing: boolean;
        current_position: number;
        tempo: number;
    }> {
        return this.get(`/sequencer/sequences/${sequenceId}/state`);
    }

    /**
     * Get all active sequences
     */
    async getActiveSequences(): Promise<Sequence[]> {
        return this.get("/sequencer/active");
    }

    /**
     * Stop all sequences
     */
    async stopAll(): Promise<{ status: string; message: string }> {
        return this.post("/sequencer/stop-all");
    }
}

// Export singleton instance
export const audioEngineService = new AudioEngineService();