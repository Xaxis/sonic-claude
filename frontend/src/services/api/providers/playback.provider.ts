/**
 * Playback API Provider
 * Thin HTTP client for playback transport controls
 *
 * Backend routes:
 * - POST /api/playback/play    - Play current composition
 * - POST /api/playback/stop    - Stop playback
 * - POST /api/playback/seek    - Seek to position
 * - PUT  /api/playback/tempo   - Set tempo
 * - PUT  /api/playback/loop    - Set loop points
 */

import { BaseAPIClient } from "../base";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface PlayRequest {
    position?: number;
}

export interface StopRequest {}

export interface SeekRequest {
    position: number;
    trigger_audio?: boolean;
}

export interface SetTempoRequest {
    tempo: number;
}

export interface SetLoopRequest {
    enabled: boolean;
    start?: number;
    end?: number;
}

// ============================================================================
// PLAYBACK PROVIDER (HTTP CLIENT ONLY - NO BUSINESS LOGIC)
// ============================================================================

export class PlaybackProvider extends BaseAPIClient {
    /**
     * Start playback
     * POST /api/playback/play
     */
    async play(request?: PlayRequest): Promise<any> {
        return this.post("/api/playback/play", request || { position: 0.0 });
    }

    /**
     * Stop playback
     * POST /api/playback/stop
     */
    async stop(): Promise<any> {
        return this.post("/api/playback/stop", {});
    }

    /**
     * Pause playback (keeps position)
     * POST /api/playback/pause
     */
    async pause(): Promise<any> {
        return this.post("/api/playback/pause", {});
    }

    /**
     * Resume playback from paused position
     * POST /api/playback/resume
     */
    async resume(): Promise<any> {
        return this.post("/api/playback/resume", {});
    }

    /**
     * Seek to position
     * POST /api/playback/seek
     */
    async seek(request: SeekRequest): Promise<any> {
        return this.post("/api/playback/seek", { position: request.position });
    }

    /**
     * Set tempo
     * PUT /api/playback/tempo
     */
    async setTempo(request: SetTempoRequest): Promise<any> {
        return this.put("/api/playback/tempo", request);
    }

    /**
     * Set loop points
     * PUT /api/playback/loop
     */
    async setLoop(enabled: boolean, start?: number, end?: number): Promise<any> {
        return this.put("/api/playback/loop", { enabled, start, end });
    }
}

