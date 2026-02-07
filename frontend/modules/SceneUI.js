/**
 * SceneUI Module - UI controls for scene management
 */

import { Logger } from './Logger.js';

export class SceneUI {
    constructor(sceneManager, stateManager) {
        this.sceneManager = sceneManager;
        this.stateManager = stateManager;
        this.logger = new Logger('SceneUI');
    }

    /**
     * Initialize scene UI
     */
    initialize() {
        this.logger.info('Initializing Scene UI');
        
        // Setup button listeners
        const saveBtn = document.getElementById('save-scene-btn');
        const loadBtn = document.getElementById('load-scene-btn');
        const prevBtn = document.getElementById('prev-scene-btn');
        const nextBtn = document.getElementById('next-scene-btn');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.promptSaveScene());
        }
        
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.showSceneList());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.sceneManager.previousScene());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.sceneManager.nextScene());
        }
        
        // Render scene list
        this.renderSceneList();
        
        this.logger.info('Scene UI initialized');
    }

    /**
     * Prompt user to save current scene
     */
    promptSaveScene() {
        const name = prompt('Enter scene name:');
        if (name) {
            const notes = prompt('Enter notes (optional):');
            this.sceneManager.saveScene(name, { notes });
            this.renderSceneList();
            this.logger.info(`Scene saved: ${name}`);
        }
    }

    /**
     * Show scene list for loading
     */
    showSceneList() {
        this.renderSceneList();
    }

    /**
     * Render scene list in UI
     */
    renderSceneList() {
        const sceneListEl = document.getElementById('scene-list');
        if (!sceneListEl) return;
        
        const scenes = this.sceneManager.getAllScenes();
        
        if (scenes.length === 0) {
            sceneListEl.innerHTML = '<p style="color: #888; padding: 1rem;">No scenes saved yet</p>';
            return;
        }
        
        sceneListEl.innerHTML = scenes.map(scene => `
            <div class="scene-item" style="
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 0.75rem;
                margin-bottom: 0.5rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border-left: 4px solid ${scene.metadata.color};
                cursor: pointer;
            " data-scene-id="${scene.id}">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${scene.name}</div>
                    <div style="font-size: 0.85rem; color: #888;">
                        BPM: ${Math.round(scene.state.bpm)} | 
                        Intensity: ${scene.state.intensity} | 
                        ${scene.state.key} ${scene.state.scale}
                    </div>
                    ${scene.metadata.notes ? `<div style="font-size: 0.8rem; color: #aaa; margin-top: 0.25rem;">${scene.metadata.notes}</div>` : ''}
                </div>
                <button class="delete-scene-btn" data-scene-id="${scene.id}" style="
                    background: rgba(255, 100, 100, 0.3);
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    color: white;
                    cursor: pointer;
                ">🗑️</button>
            </div>
        `).join('');
        
        // Add click handlers
        sceneListEl.querySelectorAll('.scene-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-scene-btn')) {
                    const sceneId = el.dataset.sceneId;
                    this.sceneManager.loadScene(sceneId);
                    this.logger.info(`Loading scene: ${sceneId}`);
                }
            });
        });
        
        // Add delete handlers
        sceneListEl.querySelectorAll('.delete-scene-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sceneId = btn.dataset.sceneId;
                if (confirm('Delete this scene?')) {
                    this.sceneManager.deleteScene(sceneId);
                    this.renderSceneList();
                    this.logger.info(`Scene deleted: ${sceneId}`);
                }
            });
        });
    }
}

