/**
 * PresetManager Module - Manage and load presets
 */

import { Logger } from './Logger.js';

export class PresetManager {
    constructor(stateManager, oscController, uiManager) {
        this.stateManager = stateManager;
        this.oscController = oscController;
        this.uiManager = uiManager;
        this.logger = new Logger('PresetManager');
        
        this.presets = {
            'melodic-house': {
                name: 'Melodic House',
                bpm: 124,
                intensity: 6,
                cutoff: 100,
                reverb: 0.4,
                echo: 0.3,
                key: 'A',
                scale: 'minor'
            },
            'ambient': {
                name: 'Ambient',
                bpm: 90,
                intensity: 3,
                cutoff: 80,
                reverb: 0.7,
                echo: 0.5,
                key: 'E',
                scale: 'major'
            },
            'techno': {
                name: 'Techno',
                bpm: 135,
                intensity: 8,
                cutoff: 110,
                reverb: 0.2,
                echo: 0.2,
                key: 'C',
                scale: 'minor'
            },
            'dnb': {
                name: 'Drum & Bass',
                bpm: 174,
                intensity: 9,
                cutoff: 120,
                reverb: 0.3,
                echo: 0.4,
                key: 'D',
                scale: 'minor'
            },
            'downtempo': {
                name: 'Downtempo',
                bpm: 95,
                intensity: 4,
                cutoff: 85,
                reverb: 0.5,
                echo: 0.4,
                key: 'G',
                scale: 'major'
            },
            'progressive': {
                name: 'Progressive',
                bpm: 128,
                intensity: 7,
                cutoff: 105,
                reverb: 0.35,
                echo: 0.35,
                key: 'F',
                scale: 'minor'
            },
            'trance': {
                name: 'Trance',
                bpm: 138,
                intensity: 8,
                cutoff: 115,
                reverb: 0.45,
                echo: 0.25,
                key: 'Bb',
                scale: 'minor'
            },
            'chill': {
                name: 'Chill',
                bpm: 85,
                intensity: 2,
                cutoff: 75,
                reverb: 0.6,
                echo: 0.55,
                key: 'C',
                scale: 'major'
            }
        };
    }

    /**
     * Initialize preset manager
     */
    initialize() {
        this.logger.info('Initializing preset manager');
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const presetId = btn.dataset.preset;
                this.loadPreset(presetId);
            });
        });
        
        this.logger.info('Preset manager initialized');
    }

    /**
     * Load a preset
     * @param {string} presetId - Preset identifier
     */
    async loadPreset(presetId) {
        const preset = this.presets[presetId];
        if (!preset) {
            this.logger.error(`Preset not found: ${presetId}`);
            return;
        }

        this.logger.info(`Loading preset: ${preset.name}`);
        
        try {
            // Update UI controls
            this.uiManager.updateControls(preset);
            
            // Send all OSC messages
            await Promise.all([
                this.oscController.setBPM(preset.bpm),
                this.oscController.setIntensity(preset.intensity),
                this.oscController.setCutoff(preset.cutoff),
                this.oscController.setReverb(preset.reverb),
                this.oscController.setEcho(preset.echo),
                this.oscController.setKey(preset.key),
                this.oscController.setScale(preset.scale)
            ]);
            
            this.stateManager.setState('currentPreset', presetId);
            this.logger.info(`Preset loaded successfully: ${preset.name}`);
            
        } catch (error) {
            this.logger.error(`Failed to load preset: ${preset.name}`, error);
        }
    }

    /**
     * Get all available presets
     * @returns {Object} Presets object
     */
    getPresets() {
        return { ...this.presets };
    }

    /**
     * Add custom preset
     * @param {string} id - Preset ID
     * @param {Object} config - Preset configuration
     */
    addPreset(id, config) {
        this.presets[id] = config;
        this.logger.info(`Added custom preset: ${id}`);
    }
}

