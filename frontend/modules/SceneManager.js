/**
 * SceneManager Module - Scene/Cue system for live performance
 * Manages complete musical states, setlists, and smooth transitions
 */

import { Logger } from './Logger.js';

export class SceneManager {
    constructor(stateManager, oscController) {
        this.stateManager = stateManager;
        this.oscController = oscController;
        this.logger = new Logger('SceneManager');
        
        this.scenes = new Map();
        this.currentScene = null;
        this.setlist = [];
        this.currentSetlistIndex = -1;
        this.transitionDuration = 4000; // 4 beats at 120 BPM
        this.isTransitioning = false;
    }

    /**
     * Save current state as a scene
     * @param {string} name - Scene name
     * @param {Object} metadata - Optional metadata (color, notes, etc.)
     */
    saveScene(name, metadata = {}) {
        const scene = {
            id: `scene_${Date.now()}`,
            name,
            timestamp: new Date().toISOString(),
            state: this.stateManager.getAllState(),
            metadata: {
                color: metadata.color || this._generateRandomColor(),
                notes: metadata.notes || '',
                tags: metadata.tags || [],
                ...metadata
            }
        };
        
        this.scenes.set(scene.id, scene);
        this.logger.info(`Scene saved: ${name}`, scene);
        
        // Persist to localStorage
        this._saveToStorage();
        
        return scene;
    }

    /**
     * Load a scene with smooth transition
     * @param {string} sceneId - Scene ID
     * @param {boolean} instant - Skip transition if true
     */
    async loadScene(sceneId, instant = false) {
        const scene = this.scenes.get(sceneId);
        if (!scene) {
            this.logger.error(`Scene not found: ${sceneId}`);
            return;
        }

        if (this.isTransitioning) {
            this.logger.warn('Transition already in progress');
            return;
        }

        this.logger.info(`Loading scene: ${scene.name}`, { instant });
        
        if (instant) {
            await this._applyScene(scene);
        } else {
            await this._transitionToScene(scene);
        }
        
        this.currentScene = sceneId;
    }

    /**
     * Smooth transition between scenes
     * @param {Object} targetScene - Target scene object
     */
    async _transitionToScene(targetScene) {
        this.isTransitioning = true;
        
        const currentState = this.stateManager.getAllState();
        const targetState = targetScene.state;
        const bpm = currentState.bpm;
        
        // Calculate transition duration based on BPM (4 beats)
        const beatDuration = (60 / bpm) * 1000;
        const transitionTime = beatDuration * 4;
        
        this.logger.info(`Transitioning over ${transitionTime}ms (4 beats at ${bpm} BPM)`);
        
        // Send transition start command
        await this.oscController.send('transition_start', transitionTime / 1000);
        
        // Interpolate numeric parameters
        const steps = 16; // 16 steps over 4 beats = 1 step per 1/4 beat
        const stepDuration = transitionTime / steps;
        
        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            
            // Interpolate each numeric parameter
            const interpolatedState = {};
            for (const [key, targetValue] of Object.entries(targetState)) {
                if (typeof targetValue === 'number' && typeof currentState[key] === 'number') {
                    interpolatedState[key] = currentState[key] + (targetValue - currentState[key]) * progress;
                }
            }
            
            // Apply interpolated values
            for (const [key, value] of Object.entries(interpolatedState)) {
                this.stateManager.setState(key, value);
                await this.oscController.send(key, value);
            }
            
            await this._sleep(stepDuration);
        }
        
        // Apply final state (non-numeric values)
        await this._applyScene(targetScene);
        
        // Send transition end command
        await this.oscController.send('transition_end', 1);
        
        this.isTransitioning = false;
        this.logger.info('Transition complete');
    }

    /**
     * Apply scene state immediately
     * @param {Object} scene - Scene object
     */
    async _applyScene(scene) {
        const updates = scene.state;
        
        for (const [key, value] of Object.entries(updates)) {
            this.stateManager.setState(key, value);
            
            // Send to Sonic Pi if it's a controllable parameter
            if (['bpm', 'intensity', 'cutoff', 'reverb', 'echo', 'key', 'scale'].includes(key)) {
                await this.oscController.send(key, value);
            }
        }
    }

    /**
     * Delete a scene
     * @param {string} sceneId - Scene ID
     */
    deleteScene(sceneId) {
        if (this.scenes.delete(sceneId)) {
            this.logger.info(`Scene deleted: ${sceneId}`);
            this._saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Get all scenes
     * @returns {Array} Array of scene objects
     */
    getAllScenes() {
        return Array.from(this.scenes.values());
    }

    /**
     * Create setlist from scene IDs
     * @param {Array<string>} sceneIds - Array of scene IDs
     */
    createSetlist(sceneIds) {
        this.setlist = sceneIds.filter(id => this.scenes.has(id));
        this.currentSetlistIndex = -1;
        this.logger.info(`Setlist created with ${this.setlist.length} scenes`);
        this._saveToStorage();
    }

    /**
     * Go to next scene in setlist
     */
    async nextScene() {
        if (this.setlist.length === 0) {
            this.logger.warn('No setlist loaded');
            return;
        }

        this.currentSetlistIndex = (this.currentSetlistIndex + 1) % this.setlist.length;
        const sceneId = this.setlist[this.currentSetlistIndex];
        await this.loadScene(sceneId);
    }

    /**
     * Go to previous scene in setlist
     */
    async previousScene() {
        if (this.setlist.length === 0) {
            this.logger.warn('No setlist loaded');
            return;
        }

        this.currentSetlistIndex = (this.currentSetlistIndex - 1 + this.setlist.length) % this.setlist.length;
        const sceneId = this.setlist[this.currentSetlistIndex];
        await this.loadScene(sceneId);
    }

    /**
     * Save scenes and setlist to localStorage
     */
    _saveToStorage() {
        try {
            const data = {
                scenes: Array.from(this.scenes.entries()),
                setlist: this.setlist
            };
            localStorage.setItem('sonic-claude-scenes', JSON.stringify(data));
            this.logger.debug('Scenes saved to localStorage');
        } catch (error) {
            this.logger.error('Failed to save to localStorage', error);
        }
    }

    /**
     * Load scenes and setlist from localStorage
     */
    loadFromStorage() {
        try {
            const data = JSON.parse(localStorage.getItem('sonic-claude-scenes'));
            if (data) {
                this.scenes = new Map(data.scenes);
                this.setlist = data.setlist || [];
                this.logger.info(`Loaded ${this.scenes.size} scenes from storage`);
            }
        } catch (error) {
            this.logger.error('Failed to load from localStorage', error);
        }
    }

    /**
     * Generate random color for scene
     */
    _generateRandomColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Sleep utility
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

