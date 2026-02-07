/**
 * AudioVisualizer Module - Real-time audio visualization with Web Audio API
 */

import { Logger } from './Logger.js';

export class AudioVisualizer {
    constructor(canvasId, stateManager) {
        this.canvasId = canvasId;
        this.stateManager = stateManager;
        this.logger = new Logger('Visualizer');
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        this.isAudioEnabled = false;
    }

    /**
     * Initialize visualizer
     */
    initialize() {
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) {
            this.logger.error(`Canvas element not found: ${this.canvasId}`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.logger.info('Visualizer initialized');
        
        // Start with procedural visualization
        this.startProceduralVisualization();
    }

    /**
     * Start procedural visualization (no audio input)
     * Note: This is a visual effect based on BPM/intensity, not actual audio analysis
     * Sonic Pi audio output cannot be captured by browser Web Audio API
     */
    startProceduralVisualization() {
        this.logger.info('Starting procedural visualization (visual effect, not actual audio)');
        this._drawProceduralWaveform();
    }

    /**
     * Enable Web Audio API visualization
     * Note: Requires user interaction to start
     */
    async enableAudioVisualization() {
        try {
            this.logger.info('Enabling Web Audio API visualization');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            this.isAudioEnabled = true;
            this.logger.info('Audio visualization enabled');
            
            // Stop procedural and start audio visualization
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this._drawAudioWaveform();
            
        } catch (error) {
            this.logger.error('Failed to enable audio visualization', error);
            this.logger.info('Falling back to procedural visualization');
        }
    }

    /**
     * Draw procedural waveform (animated sine waves)
     */
    _drawProceduralWaveform() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear with fade effect
        this.ctx.fillStyle = 'rgba(15, 12, 41, 0.1)';
        this.ctx.fillRect(0, 0, width, height);

        const time = Date.now() / 1000;
        const intensity = this.stateManager.getState('intensity') / 10;

        // First layer - primary wave
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const y = height / 2 +
                Math.sin(x * 0.02 + time * 2) * 30 * intensity +
                Math.sin(x * 0.05 + time * 3) * 20 * intensity +
                Math.sin(x * 0.03 + time * 1.5) * 15 * intensity;

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Second layer - secondary wave
        this.ctx.strokeStyle = '#f093fb';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();

        for (let x = 0; x < width; x++) {
            const y = height / 2 +
                Math.sin(x * 0.03 + time * 2.5) * 25 * intensity +
                Math.cos(x * 0.04 + time * 1.8) * 18 * intensity;

            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        this.animationId = requestAnimationFrame(() => this._drawProceduralWaveform());
    }

    /**
     * Draw real-time audio waveform
     */
    _drawAudioWaveform() {
        if (!this.isAudioEnabled || !this.analyser) {
            return;
        }

        const width = this.canvas.width;
        const height = this.canvas.height;

        this.analyser.getByteTimeDomainData(this.dataArray);

        this.ctx.fillStyle = 'rgba(15, 12, 41, 0.2)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#667eea';
        this.ctx.beginPath();

        const sliceWidth = width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * height / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();

        this.animationId = requestAnimationFrame(() => this._drawAudioWaveform());
    }

    /**
     * Stop visualization
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.logger.info('Visualizer stopped');
    }
}

