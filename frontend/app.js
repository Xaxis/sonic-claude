// SONIC CLAUDE - AI Performance System
console.log('🎵 SONIC CLAUDE initializing...');

const API_URL = 'http://localhost:8000';
let aiEnabled = false;
let brainVizCtx, spectrumCtx;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded');
    initializeApp();
});

function initializeApp() {
    // Initialize canvases
    const brainCanvas = document.getElementById('brain-viz');
    const spectrumCanvas = document.getElementById('spectrum-analyzer');

    if (brainCanvas) {
        brainVizCtx = brainCanvas.getContext('2d');
        startBrainVisualization();
    }

    if (spectrumCanvas) {
        spectrumCtx = spectrumCanvas.getContext('2d');
        startSpectrumVisualization();
    }

    // Setup all event listeners
    setupTransportControls();
    setupMixerControls();
    setupHarmonyControls();
    setupAIControls();

    // Start AI status polling
    startAIStatusPolling();

    console.log('✅ SONIC CLAUDE ready!');
}

// Transport Controls
function setupTransportControls() {
    const playBtn = document.getElementById('master-play');
    const stopBtn = document.getElementById('master-stop');
    const bpmInput = document.getElementById('bpm-input');
    const bpmSlider = document.getElementById('bpm-slider');

    playBtn?.addEventListener('click', () => {
        console.log('▶ PLAY');
        sendOSC('transport', 'play');
        playBtn.style.background = 'var(--accent-green)';
        playBtn.style.color = 'var(--bg-dark)';
    });

    stopBtn?.addEventListener('click', () => {
        console.log('⏹ STOP');
        sendOSC('transport', 'stop');
        playBtn.style.background = 'var(--bg-panel-light)';
        playBtn.style.color = 'white';
    });

    bpmInput?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        bpmSlider.value = val;
        sendOSC('bpm', val);
    });

    bpmSlider?.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        bpmInput.value = val;
        sendOSC('bpm', val);
    });
}

// Mixer Controls
function setupMixerControls() {
    const controls = [
        { id: 'intensity', address: 'intensity', display: 'intensity-val', decimals: 1 },
        { id: 'cutoff', address: 'cutoff', display: 'cutoff-val', decimals: 0 },
        { id: 'reverb', address: 'reverb', display: 'reverb-val', decimals: 2 },
        { id: 'echo', address: 'echo', display: 'echo-val', decimals: 2 }
    ];

    controls.forEach(ctrl => {
        const slider = document.getElementById(ctrl.id);
        const display = document.getElementById(ctrl.display);

        slider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (display) {
                display.textContent = val.toFixed(ctrl.decimals);
            }
            sendOSC(ctrl.address, val);
        });
    });
}

// Harmony Controls
function setupHarmonyControls() {
    const keySelect = document.getElementById('key');
    const scaleSelect = document.getElementById('scale');

    keySelect?.addEventListener('change', (e) => {
        sendOSC('key', e.target.value);
        document.getElementById('current-key').textContent = e.target.value;
    });

    scaleSelect?.addEventListener('change', (e) => {
        sendOSC('scale', e.target.value);
        document.getElementById('current-scale').textContent = e.target.value;
    });
}

// AI Controls
function setupAIControls() {
    const aiToggle = document.getElementById('ai-master-toggle');
    const sendBtn = document.getElementById('send-command');
    const commandInput = document.getElementById('ai-command');

    aiToggle?.addEventListener('click', toggleAI);

    sendBtn?.addEventListener('click', () => {
        console.log('💬 Send button clicked');
        sendAICommand();
    });

    commandInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('💬 Enter key pressed');
            sendAICommand();
        }
    });
}

// OSC Communication
async function sendOSC(parameter, value) {
    try {
        const response = await fetch(`${API_URL}/osc/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parameter, value })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OSC failed: ${response.status} - ${JSON.stringify(error)}`);
        }
        console.log(`📡 OSC: ${parameter} = ${value}`);
    } catch (error) {
        console.error('❌ OSC error:', error);
    }
}

// AI Functions


async function sendAICommand() {
    const input = document.getElementById('ai-command');
    const sendBtn = document.getElementById('send-command');
    const message = input.value.trim();

    if (!message) {
        console.log('⚠️ Empty message');
        return;
    }

    console.log('💬 Sending AI command:', message);

    // Disable input while processing
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.5';

    // Add user message to display
    addAIMessage('YOU', message, 'user');
    input.value = '';

    // Add thinking indicator
    const thinkingId = addThinkingIndicator();

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ AI response:', data.response);

        // Remove thinking indicator
        removeThinkingIndicator(thinkingId);

        // Add AI response to display
        addAIMessage('AI AGENT', data.response, 'ai');
    } catch (error) {
        console.error('❌ Chat error:', error);
        removeThinkingIndicator(thinkingId);
        addAIMessage('SYSTEM', `Error: ${error.message}`, 'error');
    } finally {
        // Re-enable input
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        input.focus();
    }
}

function addAIMessage(sender, content, type = 'ai') {
    const display = document.getElementById('command-display');
    if (!display) return;

    const now = new Date();
    const time = now.toTimeString().split(' ')[0];

    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${type}-message`;
    msgDiv.innerHTML = `
        <span class="msg-sender">${sender}</span>
        <span class="msg-time">${time}</span>
        <p class="msg-content">${content}</p>
    `;

    display.appendChild(msgDiv);
    display.scrollTop = display.scrollHeight;
}

function addThinkingIndicator() {
    const display = document.getElementById('command-display');
    if (!display) return null;

    const thinkingDiv = document.createElement('div');
    const thinkingId = 'thinking-' + Date.now();
    thinkingDiv.id = thinkingId;
    thinkingDiv.className = 'ai-message thinking';
    thinkingDiv.innerHTML = `
        <span class="msg-sender">AI AGENT</span>
        <span class="msg-time">${new Date().toTimeString().split(' ')[0]}</span>
        <p class="msg-content">
            <span class="thinking-dots">
                <span>●</span><span>●</span><span>●</span>
            </span>
        </p>
    `;

    display.appendChild(thinkingDiv);
    display.scrollTop = display.scrollHeight;

    return thinkingId;
}

function removeThinkingIndicator(thinkingId) {
    if (!thinkingId) return;
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) {
        thinkingEl.remove();
    }
}

// AI Status Polling
function startAIStatusPolling() {
    setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/ai/status`);
            const data = await response.json();

            // Always update UI with current status
            updateAIAnalytics(data);
        } catch (error) {
            console.error('❌ AI status polling error:', error);
        }
    }, 1000);
}

function updateAIAnalytics(data) {
    // Update AI status indicators
    const aiStateEl = document.getElementById('ai-state');
    const brainStateEl = document.getElementById('brain-state');
    const aiToggle = document.getElementById('ai-master-toggle');

    const isRunning = data.is_running || false;

    if (aiStateEl) {
        aiStateEl.textContent = isRunning ? 'ONLINE' : 'OFFLINE';
        aiStateEl.style.color = isRunning ? 'var(--accent-green)' : 'var(--text-secondary)';
    }

    if (brainStateEl) {
        brainStateEl.textContent = isRunning ? 'ACTIVE' : 'IDLE';
    }

    if (aiToggle) {
        if (isRunning) {
            aiToggle.classList.add('active');
        } else {
            aiToggle.classList.remove('active');
        }
    }

    // Return early if no audio data
    if (!data.audio_analysis || !data.current_state) {
        return;
    }

    const audio = data.audio_analysis;
    const state = data.current_state;

    // Update analytics cards
    const energyEl = document.getElementById('ai-energy');
    const brightnessEl = document.getElementById('ai-brightness');
    const rhythmEl = document.getElementById('ai-rhythm');
    const complexityEl = document.getElementById('ai-complexity');

    const energy = audio.energy || 0;
    const brightness = audio.brightness || 0;
    const rhythm = audio.rhythm || 0;

    if (energyEl) {
        energyEl.textContent = energy.toFixed(2);
        updateBar('energy-bar', energy * 100);
    }

    if (brightnessEl) {
        const brightnessHz = Math.round(brightness);
        brightnessEl.textContent = `${brightnessHz} Hz`;
        updateBar('brightness-bar', Math.min(brightnessHz / 50, 100));
    }

    if (rhythmEl) {
        rhythmEl.textContent = rhythm.toFixed(2);
        updateBar('rhythm-bar', rhythm * 100);
    }

    if (complexityEl) {
        complexityEl.textContent = state.complexity.toFixed(1);
        updateBar('complexity-bar', state.complexity * 10);
    }

    // Update musical state
    const bpmEl = document.getElementById('current-bpm');
    const intensityEl = document.getElementById('current-intensity');
    if (bpmEl) bpmEl.textContent = state.bpm;
    if (intensityEl) intensityEl.textContent = state.intensity.toFixed(1);

    // Update viz stats
    const energyStatEl = document.getElementById('energy-stat');
    const freqStatEl = document.getElementById('freq-stat');
    const rhythmStatEl = document.getElementById('rhythm-stat');

    if (energyStatEl) energyStatEl.textContent = energy.toFixed(2);
    if (freqStatEl) freqStatEl.textContent = `${Math.round(brightness)} Hz`;
    if (rhythmStatEl) rhythmStatEl.textContent = rhythm.toFixed(2);

    // Update decisions
    if (data.recent_decisions && data.recent_decisions.length > 0) {
        updateDecisions(data.recent_decisions);
    }
}

function updateBar(barId, percentage) {
    const bar = document.getElementById(barId);
    if (bar) {
        bar.style.width = `${Math.min(percentage, 100)}%`;
    }
}

function updateDecisions(decisions) {
    const grid = document.getElementById('decision-grid');
    if (!grid) return;

    grid.innerHTML = decisions.slice(0, 5).map(d => `
        <div class="decision-item">
            <span class="decision-param">
                <strong>${d.parameter}:</strong> ${d.new_value}
                <span style="color: var(--accent-cyan);">(${Math.round(d.confidence * 100)}%)</span>
                <br><small>${d.reason}</small>
            </span>
        </div>
    `).join('');
}

// Brain Visualization
function startBrainVisualization() {
    const canvas = document.getElementById('brain-viz');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let angle = 0;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw pulsing circles
        for (let i = 0; i < 3; i++) {
            const radius = 20 + i * 15 + Math.sin(angle + i) * 5;
            const alpha = 0.3 - i * 0.1;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 245, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw rotating nodes
        for (let i = 0; i < 6; i++) {
            const nodeAngle = angle + (i * Math.PI / 3);
            const x = centerX + Math.cos(nodeAngle) * 40;
            const y = centerY + Math.sin(nodeAngle) * 40;

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
            ctx.fill();
        }

        angle += 0.02;
        requestAnimationFrame(animate);
    }

    animate();
}

// Spectrum Visualization
function startSpectrumVisualization() {
    const canvas = document.getElementById('spectrum-analyzer');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const bars = 100;
    let dataArray = new Array(bars).fill(0);

    function animate() {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = canvas.width / bars;

        for (let i = 0; i < bars; i++) {
            // Simulate audio data (replace with real data later)
            dataArray[i] = dataArray[i] * 0.9 + Math.random() * 100;

            const barHeight = (dataArray[i] / 100) * canvas.height;
            const x = i * barWidth;
            const y = canvas.height - barHeight;

            // Gradient color
            const hue = (i / bars) * 180 + 180;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x, y, barWidth - 2, barHeight);
        }

        requestAnimationFrame(animate);
    }

    animate();
}

async function toggleAI() {
    try {
        const response = await fetch(`${API_URL}/ai/toggle`, {
            method: 'POST'
        });
        const data = await response.json();
        aiEnabled = data.enabled;

        const aiToggle = document.getElementById('ai-master-toggle');
        const aiState = document.getElementById('ai-state');
        const brainState = document.getElementById('brain-state');

        if (aiEnabled) {
            aiToggle.classList.add('active');
            aiState.textContent = 'ONLINE';
            brainState.textContent = 'ACTIVE';
        } else {
            aiToggle.classList.remove('active');
            aiState.textContent = 'OFFLINE';
            brainState.textContent = 'IDLE';
        }

        console.log(`🧠 AI ${aiEnabled ? 'ENABLED' : 'DISABLED'}`);
    } catch (error) {
        console.error('❌ AI toggle error:', error);
    }
}

console.log('✅ App.js loaded');

