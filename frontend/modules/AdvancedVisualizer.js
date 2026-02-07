/**
 * AdvancedVisualizer Module - Stunning real-time audio visualizations
 * Spectrum analyzer, 3D waveforms, particle systems, shader effects
 */

import { Logger } from './Logger.js';

export class AdvancedVisualizer {
    constructor(canvasId, stateManager) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.stateManager = stateManager;
        this.logger = new Logger('AdvancedVisualizer');
        
        this.animationId = null;
        this.particles = [];
        this.maxParticles = 200;
        this.spectrumBars = 64;
        this.waveformPoints = 128;
        
        // Visualization modes
        this.modes = ['spectrum', 'waveform', 'particles', 'circular', 'bars3d'];
        this.currentMode = 0;
        
        // Audio context for real-time analysis
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = 0;
        
        // Visual state
        this.hue = 0;
        this.bassIntensity = 0;
        this.midIntensity = 0;
        this.highIntensity = 0;
    }

    /**
     * Initialize visualizer
     */
    async initialize() {
        if (!this.canvas || !this.ctx) {
            this.logger.error('Canvas element not found');
            return;
        }

        this.logger.info('Initializing Advanced Visualizer');
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Try to initialize Web Audio API
        await this.initAudioContext();
        
        // Start animation loop
        this.start();
        
        // Subscribe to state changes
        this.stateManager.subscribe('bpm', (bpm) => this.onBPMChange(bpm));
        this.stateManager.subscribe('intensity', (intensity) => this.onIntensityChange(intensity));
        
        this.logger.info('Advanced Visualizer initialized');
    }

    /**
     * Initialize Web Audio API for real-time analysis
     */
    async initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            // Try to capture system audio (requires user permission)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            this.logger.info('Web Audio API initialized with microphone input');
        } catch (error) {
            this.logger.warn('Could not initialize Web Audio API - using simulated data', error);
            // Fall back to simulated visualization
        }
    }

    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    /**
     * Start animation loop
     */
    start() {
        if (this.animationId) return;
        this.animate();
        this.logger.info('Visualization started');
    }

    /**
     * Stop animation loop
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
            this.logger.info('Visualization stopped');
        }
    }

    /**
     * Main animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Get audio data
        const audioData = this.getAudioData();
        
        // Clear canvas with fade effect
        this.ctx.fillStyle = 'rgba(10, 10, 20, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render current visualization mode
        const mode = this.modes[this.currentMode];
        switch (mode) {
            case 'spectrum':
                this.drawSpectrum(audioData);
                break;
            case 'waveform':
                this.drawWaveform(audioData);
                break;
            case 'particles':
                this.drawParticles(audioData);
                break;
            case 'circular':
                this.drawCircular(audioData);
                break;
            case 'bars3d':
                this.draw3DBars(audioData);
                break;
        }
        
        // Update hue for rainbow effect
        this.hue = (this.hue + 0.5) % 360;
    }

    /**
     * Get audio data from analyser or simulate
     */
    getAudioData() {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray;
        } else {
            // Simulate audio data based on state
            return this.simulateAudioData();
        }
    }

    /**
     * Simulate audio data when Web Audio API is not available
     */
    simulateAudioData() {
        const data = new Uint8Array(this.bufferLength || 128);
        const bpm = this.stateManager.getState('bpm') || 120;
        const intensity = this.stateManager.getState('intensity') || 5;
        const time = Date.now() / 1000;
        const beatPhase = (time * bpm / 60) % 1;

        for (let i = 0; i < data.length; i++) {
            const freq = i / data.length;
            const bass = Math.sin(time * 2 + freq * 10) * 50 * (intensity / 10);
            const mid = Math.sin(time * 4 + freq * 20) * 30 * (intensity / 10);
            const high = Math.sin(time * 8 + freq * 40) * 20 * (intensity / 10);
            const kick = beatPhase < 0.1 ? 100 * (1 - beatPhase / 0.1) : 0;

            data[i] = Math.max(0, Math.min(255, 128 + bass + mid + high + kick * (freq < 0.2 ? 1 : 0)));
        }

        return data;
    }

    /**
     * Draw spectrum analyzer
     */
    drawSpectrum(audioData) {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const barWidth = width / this.spectrumBars;

        for (let i = 0; i < this.spectrumBars; i++) {
            const dataIndex = Math.floor(i * audioData.length / this.spectrumBars);
            const value = audioData[dataIndex] / 255;
            const barHeight = value * height * 0.8;

            const hue = (this.hue + i * 360 / this.spectrumBars) % 360;
            const gradient = this.ctx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 1)`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);

            // Reflection
            this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${value * 0.3})`;
            this.ctx.fillRect(i * barWidth, height, barWidth - 2, barHeight * 0.3);
        }
    }

    /**
     * Draw waveform
     */
    drawWaveform(audioData) {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const centerY = height / 2;

        this.ctx.beginPath();
        this.ctx.lineWidth = 3;

        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `hsl(${this.hue}, 100%, 50%)`);
        gradient.addColorStop(0.5, `hsl(${(this.hue + 60) % 360}, 100%, 60%)`);
        gradient.addColorStop(1, `hsl(${(this.hue + 120) % 360}, 100%, 50%)`);
        this.ctx.strokeStyle = gradient;

        for (let i = 0; i < this.waveformPoints; i++) {
            const dataIndex = Math.floor(i * audioData.length / this.waveformPoints);
            const value = (audioData[dataIndex] / 255 - 0.5) * 2;
            const x = i * width / this.waveformPoints;
            const y = centerY + value * height * 0.4;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
    }

    /**
     * Draw particle system
     */
    drawParticles(audioData) {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;

        // Calculate average intensity
        const avgIntensity = audioData.reduce((sum, val) => sum + val, 0) / audioData.length / 255;

        // Spawn new particles based on intensity
        if (this.particles.length < this.maxParticles && Math.random() < avgIntensity) {
            this.particles.push({
                x: width / 2,
                y: height / 2,
                vx: (Math.random() - 0.5) * 10 * avgIntensity,
                vy: (Math.random() - 0.5) * 10 * avgIntensity,
                life: 1.0,
                size: Math.random() * 5 + 2,
                hue: this.hue + Math.random() * 60
            });
        }

        // Update and draw particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= 0.01;

            if (p.life <= 0) return false;

            this.ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life})`;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fill();

            return true;
        });
    }

    /**
     * Draw circular visualization
     */
    drawCircular(audioData) {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;

        this.ctx.save();
        this.ctx.translate(centerX, centerY);

        for (let i = 0; i < this.spectrumBars; i++) {
            const dataIndex = Math.floor(i * audioData.length / this.spectrumBars);
            const value = audioData[dataIndex] / 255;
            const angle = (i / this.spectrumBars) * Math.PI * 2;
            const barLength = value * radius;

            const hue = (this.hue + i * 360 / this.spectrumBars) % 360;
            this.ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
            this.ctx.lineWidth = 3;

            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            this.ctx.lineTo(Math.cos(angle) * (radius + barLength), Math.sin(angle) * (radius + barLength));
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /**
     * Draw 3D bars
     */
    draw3DBars(audioData) {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const barWidth = width / this.spectrumBars;
        const perspective = 0.6;

        for (let i = 0; i < this.spectrumBars; i++) {
            const dataIndex = Math.floor(i * audioData.length / this.spectrumBars);
            const value = audioData[dataIndex] / 255;
            const barHeight = value * height * 0.7;
            const x = i * barWidth;
            const y = height - barHeight;

            // 3D effect
            const depth = barWidth * perspective;
            const hue = (this.hue + i * 360 / this.spectrumBars) % 360;

            // Front face
            this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            this.ctx.fillRect(x, y, barWidth - 2, barHeight);

            // Top face
            this.ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + depth, y - depth);
            this.ctx.lineTo(x + barWidth - 2 + depth, y - depth);
            this.ctx.lineTo(x + barWidth - 2, y);
            this.ctx.fill();

            // Right face
            this.ctx.fillStyle = `hsl(${hue}, 100%, 30%)`;
            this.ctx.beginPath();
            this.ctx.moveTo(x + barWidth - 2, y);
            this.ctx.lineTo(x + barWidth - 2 + depth, y - depth);
            this.ctx.lineTo(x + barWidth - 2 + depth, height - depth);
            this.ctx.lineTo(x + barWidth - 2, height);
            this.ctx.fill();
        }
    }

    /**
     * Switch visualization mode
     */
    nextMode() {
        this.currentMode = (this.currentMode + 1) % this.modes.length;
        this.logger.info(`Switched to mode: ${this.modes[this.currentMode]}`);
    }

    /**
     * Handle BPM change
     */
    onBPMChange(bpm) {
        this.logger.debug(`BPM changed: ${bpm}`);
    }

    /**
     * Handle intensity change
     */
    onIntensityChange(intensity) {
        this.logger.debug(`Intensity changed: ${intensity}`);
    }
}

