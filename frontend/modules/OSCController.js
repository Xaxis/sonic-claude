/**
 * OSCController Module - Handle OSC message sending with validation
 */

import { Logger } from './Logger.js';

export class OSCController {
    constructor(apiUrl, stateManager) {
        this.apiUrl = apiUrl;
        this.stateManager = stateManager;
        this.logger = new Logger('OSC');
        this.pendingRequests = new Map();
    }

    /**
     * Send OSC message to Sonic Pi
     * @param {string} parameter - OSC parameter name
     * @param {*} value - Parameter value
     * @returns {Promise<Object>}
     */
    async send(parameter, value) {
        // Validate parameter
        if (!parameter || typeof parameter !== 'string') {
            this.logger.error('Invalid parameter', { parameter });
            throw new Error('Parameter must be a non-empty string');
        }

        const requestId = `${parameter}_${Date.now()}`;
        
        try {
            this.logger.debug(`Sending OSC: ${parameter} = ${value}`);
            
            const response = await fetch(`${this.apiUrl}/osc/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parameter, value })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${errorData.detail || response.statusText}`);
            }

            const data = await response.json();
            this.logger.info(`OSC sent successfully: ${parameter} = ${value}`);
            return data;

        } catch (error) {
            this.logger.error(`Failed to send OSC: ${parameter}`, error);
            throw error;
        }
    }

    /**
     * Send BPM update
     * @param {number} bpm - Beats per minute (60-180)
     */
    async setBPM(bpm) {
        const validated = Math.max(60, Math.min(180, parseInt(bpm)));
        this.stateManager.setState('bpm', validated);
        return this.send('bpm', validated);
    }

    /**
     * Send intensity update
     * @param {number} intensity - Intensity level (0-10)
     */
    async setIntensity(intensity) {
        const validated = Math.max(0, Math.min(10, parseFloat(intensity)));
        this.stateManager.setState('intensity', validated);
        return this.send('intensity', validated);
    }

    /**
     * Send filter cutoff update
     * @param {number} cutoff - Filter cutoff (40-130)
     */
    async setCutoff(cutoff) {
        const validated = Math.max(40, Math.min(130, parseInt(cutoff)));
        this.stateManager.setState('cutoff', validated);
        return this.send('cutoff', validated);
    }

    /**
     * Send reverb mix update
     * @param {number} reverb - Reverb mix (0-1)
     */
    async setReverb(reverb) {
        const validated = Math.max(0, Math.min(1, parseFloat(reverb)));
        this.stateManager.setState('reverb', validated);
        return this.send('reverb', validated);
    }

    /**
     * Send echo mix update
     * @param {number} echo - Echo mix (0-1)
     */
    async setEcho(echo) {
        const validated = Math.max(0, Math.min(1, parseFloat(echo)));
        this.stateManager.setState('echo', validated);
        return this.send('echo', validated);
    }

    /**
     * Send key update
     * @param {string} key - Musical key
     */
    async setKey(key) {
        this.stateManager.setState('key', key);
        return this.send('key', key);
    }

    /**
     * Send scale update
     * @param {string} scale - Musical scale
     */
    async setScale(scale) {
        this.stateManager.setState('scale', scale);
        return this.send('scale', scale);
    }

    /**
     * Send transport control
     * @param {string} command - Transport command (play/stop)
     */
    async transport(command) {
        return this.send('transport', command);
    }

    /**
     * Trigger sample
     * @param {string} sample - Sample name
     */
    async triggerSample(sample) {
        return this.send('trigger_sample', sample);
    }

    /**
     * Trigger synth
     * @param {string} synth - Synth name
     */
    async triggerSynth(synth) {
        return this.send('trigger_synth', synth);
    }
}

