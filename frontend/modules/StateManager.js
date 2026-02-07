/**
 * StateManager Module - Centralized state management with observers
 */

import { Logger } from './Logger.js';

export class StateManager {
    constructor() {
        this.logger = new Logger('StateManager');
        this.state = {
            connected: false,
            bpm: 120,
            intensity: 5,
            cutoff: 100,
            reverb: 0.3,
            echo: 0.3,
            key: 'A',
            scale: 'minor',
            samples: {},
            synths: [],
            currentPreset: null
        };
        this.observers = new Map();
    }

    /**
     * Subscribe to state changes
     * @param {string} key - State key to observe
     * @param {Function} callback - Callback function
     */
    subscribe(key, callback) {
        if (!this.observers.has(key)) {
            this.observers.set(key, []);
        }
        this.observers.get(key).push(callback);
        this.logger.debug(`Subscribed to state key: ${key}`);
    }

    /**
     * Update state and notify observers
     * @param {string} key - State key
     * @param {*} value - New value
     */
    setState(key, value) {
        const oldValue = this.state[key];
        this.state[key] = value;
        
        this.logger.debug(`State updated: ${key}`, { oldValue, newValue: value });
        
        // Notify observers
        if (this.observers.has(key)) {
            this.observers.get(key).forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    this.logger.error(`Error in observer callback for ${key}`, error);
                }
            });
        }
    }

    /**
     * Get current state value
     * @param {string} key - State key
     * @returns {*} State value
     */
    getState(key) {
        return this.state[key];
    }

    /**
     * Get entire state object
     * @returns {Object} Complete state
     */
    getAllState() {
        return { ...this.state };
    }

    /**
     * Update multiple state values at once
     * @param {Object} updates - Object with key-value pairs
     */
    setMultiple(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.setState(key, value);
        });
    }
}

