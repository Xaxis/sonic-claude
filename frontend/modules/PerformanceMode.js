/**
 * PerformanceMode Module - Fullscreen performance interface for live shows
 * Large visual feedback, minimal distractions, quick access to critical controls
 */

import { Logger } from './Logger.js';

export class PerformanceMode {
    constructor(stateManager, oscController, sceneManager, visualizer) {
        this.stateManager = stateManager;
        this.oscController = oscController;
        this.sceneManager = sceneManager;
        this.visualizer = visualizer;
        this.logger = new Logger('PerformanceMode');
        
        this.isActive = false;
        this.performanceContainer = null;
        this.hotkeys = new Map();
    }

    /**
     * Initialize performance mode
     */
    initialize() {
        this.logger.info('Initializing Performance Mode');
        
        // Create performance mode container
        this.createPerformanceUI();
        
        // Setup hotkeys
        this.setupHotkeys();
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        
        this.logger.info('Performance Mode initialized');
    }

    /**
     * Create performance mode UI
     */
    createPerformanceUI() {
        this.performanceContainer = document.createElement('div');
        this.performanceContainer.id = 'performance-mode';
        this.performanceContainer.className = 'performance-mode hidden';
        
        this.performanceContainer.innerHTML = `
            <div class="performance-header">
                <div class="performance-title">
                    <h1>🎵 SONIC CLAUDE</h1>
                    <div class="performance-status">
                        <span class="status-indicator"></span>
                        <span class="status-text">LIVE</span>
                    </div>
                </div>
                <div class="performance-clock">
                    <span id="perf-time">00:00:00</span>
                </div>
            </div>
            
            <div class="performance-main">
                <div class="performance-visualizer">
                    <canvas id="perf-visualizer" width="1920" height="1080"></canvas>
                </div>
                
                <div class="performance-controls">
                    <div class="bpm-display">
                        <div class="bpm-value" id="perf-bpm">120</div>
                        <div class="bpm-label">BPM</div>
                    </div>
                    
                    <div class="intensity-display">
                        <div class="intensity-bars" id="perf-intensity">
                            ${Array(10).fill(0).map((_, i) => `<div class="intensity-bar" data-level="${i+1}"></div>`).join('')}
                        </div>
                        <div class="intensity-label">INTENSITY</div>
                    </div>
                    
                    <div class="key-display">
                        <div class="key-value" id="perf-key">A</div>
                        <div class="key-scale" id="perf-scale">minor</div>
                    </div>
                </div>
                
                <div class="performance-scenes">
                    <div class="scene-list" id="perf-scene-list">
                        <!-- Populated dynamically -->
                    </div>
                    <div class="scene-controls">
                        <button class="scene-btn" id="perf-prev-scene">◀ PREV</button>
                        <button class="scene-btn" id="perf-next-scene">NEXT ▶</button>
                    </div>
                </div>
            </div>
            
            <div class="performance-footer">
                <div class="hotkey-hints">
                    <span><kbd>F</kbd> Fullscreen</span>
                    <span><kbd>V</kbd> Viz Mode</span>
                    <span><kbd>←</kbd><kbd>→</kbd> Scenes</span>
                    <span><kbd>↑</kbd><kbd>↓</kbd> Intensity</span>
                    <span><kbd>ESC</kbd> Exit</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.performanceContainer);
    }

    /**
     * Setup keyboard hotkeys
     */
    setupHotkeys() {
        // F - Toggle fullscreen
        this.hotkeys.set('f', () => this.toggleFullscreen());
        
        // V - Switch visualization mode
        this.hotkeys.set('v', () => this.visualizer.nextMode());
        
        // Arrow keys - Scene navigation and intensity
        this.hotkeys.set('ArrowLeft', () => this.sceneManager.previousScene());
        this.hotkeys.set('ArrowRight', () => this.sceneManager.nextScene());
        this.hotkeys.set('ArrowUp', () => this.adjustIntensity(1));
        this.hotkeys.set('ArrowDown', () => this.adjustIntensity(-1));
        
        // Number keys 1-9 - Load scenes
        for (let i = 1; i <= 9; i++) {
            this.hotkeys.set(i.toString(), () => this.loadSceneByIndex(i - 1));
        }
        
        // Space - Play/Pause
        this.hotkeys.set(' ', () => this.togglePlayback());
        
        // ESC - Exit performance mode
        this.hotkeys.set('Escape', () => this.deactivate());
        
        // Global hotkey listener
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            const handler = this.hotkeys.get(e.key);
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
        
        this.logger.info('Hotkeys configured');
    }

    /**
     * Activate performance mode
     */
    async activate() {
        if (this.isActive) return;
        
        this.logger.info('Activating Performance Mode');
        this.isActive = true;
        
        // Show performance UI
        this.performanceContainer.classList.remove('hidden');
        
        // Hide main UI
        document.querySelector('.container').style.display = 'none';
        
        // Update displays
        this.updateDisplays();
        
        // Load scenes into UI
        this.loadSceneList();
        
        // Start clock
        this.startClock();
        
        // Subscribe to state changes
        this.subscribeToState();
        
        // Enter fullscreen
        await this.enterFullscreen();
        
        this.logger.info('Performance Mode activated');
    }

    /**
     * Deactivate performance mode
     */
    async deactivate() {
        if (!this.isActive) return;

        this.logger.info('Deactivating Performance Mode');
        this.isActive = false;

        // Exit fullscreen
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        }

        // Hide performance UI
        this.performanceContainer.classList.add('hidden');

        // Show main UI
        document.querySelector('.container').style.display = 'block';

        // Stop clock
        this.stopClock();

        this.logger.info('Performance Mode deactivated');
    }

    /**
     * Toggle fullscreen
     */
    async toggleFullscreen() {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await this.enterFullscreen();
        }
    }

    /**
     * Enter fullscreen
     */
    async enterFullscreen() {
        try {
            await this.performanceContainer.requestFullscreen();
            this.logger.info('Entered fullscreen');
        } catch (error) {
            this.logger.error('Failed to enter fullscreen', error);
        }
    }

    /**
     * Handle fullscreen change
     */
    onFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;
        this.logger.info(`Fullscreen: ${isFullscreen}`);
    }

    /**
     * Update all displays
     */
    updateDisplays() {
        const bpm = this.stateManager.getState('bpm');
        const intensity = this.stateManager.getState('intensity');
        const key = this.stateManager.getState('key');
        const scale = this.stateManager.getState('scale');

        document.getElementById('perf-bpm').textContent = Math.round(bpm);
        document.getElementById('perf-key').textContent = key;
        document.getElementById('perf-scale').textContent = scale;

        // Update intensity bars
        const bars = document.querySelectorAll('.intensity-bar');
        bars.forEach((bar, i) => {
            bar.classList.toggle('active', i < intensity);
        });
    }

    /**
     * Load scene list into performance UI
     */
    loadSceneList() {
        const scenes = this.sceneManager.getAllScenes();
        const sceneList = document.getElementById('perf-scene-list');

        sceneList.innerHTML = scenes.map((scene, i) => `
            <div class="perf-scene" data-scene-id="${scene.id}" style="border-left: 4px solid ${scene.metadata.color}">
                <div class="scene-number">${i + 1}</div>
                <div class="scene-name">${scene.name}</div>
            </div>
        `).join('');

        // Add click handlers
        sceneList.querySelectorAll('.perf-scene').forEach(el => {
            el.addEventListener('click', () => {
                this.sceneManager.loadScene(el.dataset.sceneId);
            });
        });
    }

    /**
     * Subscribe to state changes
     */
    subscribeToState() {
        this.stateManager.subscribe('bpm', () => this.updateDisplays());
        this.stateManager.subscribe('intensity', () => this.updateDisplays());
        this.stateManager.subscribe('key', () => this.updateDisplays());
        this.stateManager.subscribe('scale', () => this.updateDisplays());
    }

    /**
     * Start performance clock
     */
    startClock() {
        this.clockInterval = setInterval(() => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('perf-time').textContent = `${hours}:${minutes}:${seconds}`;
        }, 1000);
    }

    /**
     * Stop performance clock
     */
    stopClock() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
    }

    /**
     * Adjust intensity
     */
    async adjustIntensity(delta) {
        const current = this.stateManager.getState('intensity');
        const newValue = Math.max(0, Math.min(10, current + delta));
        await this.oscController.setIntensity(newValue);
    }

    /**
     * Load scene by index
     */
    async loadSceneByIndex(index) {
        const scenes = this.sceneManager.getAllScenes();
        if (index < scenes.length) {
            await this.sceneManager.loadScene(scenes[index].id);
        }
    }

    /**
     * Toggle playback
     */
    async togglePlayback() {
        // This would need to track play state
        await this.oscController.transport('play');
    }
}

