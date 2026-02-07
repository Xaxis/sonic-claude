/**
 * AI Agent UI Module
 * Displays real-time AI status, audio analysis, and decisions
 */

export class AIAgentUI {
    constructor(stateManager, logger, apiUrl) {
        this.stateManager = stateManager;
        this.logger = logger;
        this.apiUrl = apiUrl;
        this.updateInterval = null;
        this.isAIRunning = false;
    }

    initialize() {
        this.logger.info('Initializing AI Agent UI');
        
        // Get elements
        this.aiToggleBtn = document.getElementById('ai-toggle-btn');
        this.aiEnergy = document.getElementById('ai-energy');
        this.aiBrightness = document.getElementById('ai-brightness');
        this.aiRhythm = document.getElementById('ai-rhythm');
        this.aiComplexity = document.getElementById('ai-complexity');
        this.aiDecisions = document.getElementById('ai-decisions');
        
        // Setup event listeners
        this.aiToggleBtn.addEventListener('click', () => this.toggleAI());
        
        // Start updating AI status
        this.startUpdating();
        
        this.logger.info('AI Agent UI initialized');
    }

    async toggleAI() {
        try {
            const response = await fetch(`${this.apiUrl}/ai/toggle`, {
                method: 'POST'
            });
            
            const data = await response.json();
            this.isAIRunning = data.is_running;
            
            // Update button
            this.aiToggleBtn.textContent = this.isAIRunning ? '🧠 AI: ON' : '🧠 AI: OFF';
            this.aiToggleBtn.className = this.isAIRunning ? 'btn btn-success' : 'btn btn-secondary';
            
            this.logger.info(`AI Agent ${data.status}`);
            
        } catch (error) {
            this.logger.error('Failed to toggle AI', error);
        }
    }

    startUpdating() {
        // Update every second
        this.updateInterval = setInterval(() => this.updateStatus(), 1000);
    }

    async updateStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/ai/status`);
            const status = await response.json();
            
            // Update audio analysis display
            if (status.audio_analysis) {
                const { energy, brightness, rhythm } = status.audio_analysis;
                
                this.aiEnergy.textContent = `${(energy * 100).toFixed(0)}%`;
                this.aiBrightness.textContent = `${brightness.toFixed(0)} Hz`;
                this.aiRhythm.textContent = `${(rhythm * 100).toFixed(0)}%`;
            }
            
            // Update current state
            if (status.current_state) {
                this.aiComplexity.textContent = `${(status.current_state.complexity * 100).toFixed(0)}%`;
            }
            
            // Update recent decisions
            if (status.recent_decisions && status.recent_decisions.length > 0) {
                this.updateDecisions(status.recent_decisions);
            }
            
        } catch (error) {
            // Silently fail - don't spam console
        }
    }

    updateDecisions(decisions) {
        // Show last 3 decisions
        const recentDecisions = decisions.slice(-3).reverse();
        
        let html = '';
        recentDecisions.forEach(decision => {
            const confidence = (decision.confidence * 100).toFixed(0);
            html += `
                <div style="padding: 0.3rem; margin: 0.2rem 0; background: rgba(0,242,254,0.1); border-left: 2px solid #00f2fe; border-radius: 3px;">
                    <strong style="color: #4facfe;">${decision.parameter}</strong> → ${decision.value}
                    <div style="font-size: 0.75rem; color: #888;">${decision.reason} (${confidence}%)</div>
                </div>
            `;
        });
        
        this.aiDecisions.innerHTML = html;
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

