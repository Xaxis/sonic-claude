/**
 * SampleBrowser Module - Manage sample and synth catalog with search
 */

import { Logger } from './Logger.js';

export class SampleBrowser {
    constructor(apiUrl, stateManager, oscController) {
        this.apiUrl = apiUrl;
        this.stateManager = stateManager;
        this.oscController = oscController;
        this.logger = new Logger('SampleBrowser');
        this.samples = {};
        this.synths = [];
    }

    /**
     * Initialize sample browser
     */
    async initialize() {
        this.logger.info('Initializing sample browser');
        
        // Setup tab switching
        this._setupTabs();
        
        // Setup search
        this._setupSearch();
        
        // Load samples and synths
        await this.loadCatalog();
        
        this.logger.info('Sample browser initialized');
    }

    /**
     * Load sample and synth catalog from API
     */
    async loadCatalog() {
        try {
            this.logger.info('Loading sample catalog');
            
            const response = await fetch(`${this.apiUrl}/samples`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.samples = data.samples;
            this.synths = data.synths;
            
            this.stateManager.setState('samples', this.samples);
            this.stateManager.setState('synths', this.synths);
            
            this.logger.info('Catalog loaded', { 
                sampleCategories: Object.keys(this.samples).length,
                synthCount: this.synths.length 
            });
            
            this._populateSamples();
            this._populateSynths();
            
        } catch (error) {
            this.logger.error('Failed to load catalog', error);
        }
    }

    _setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`${tab}-tab`).classList.add('active');
                this.logger.debug(`Switched to tab: ${tab}`);
            });
        });
    }

    _setupSearch() {
        const sampleSearch = document.getElementById('sample-search');
        const synthSearch = document.getElementById('synth-search');
        
        if (sampleSearch) {
            sampleSearch.addEventListener('input', (e) => {
                this._filterSamples(e.target.value.toLowerCase());
            });
        }
        
        if (synthSearch) {
            synthSearch.addEventListener('input', (e) => {
                this._filterSynths(e.target.value.toLowerCase());
            });
        }
    }

    _populateSamples() {
        const container = document.getElementById('sample-categories');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (const [category, sampleList] of Object.entries(this.samples)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'sample-category';
            categoryDiv.setAttribute('data-category', category);
            categoryDiv.innerHTML = `<h4>${category}</h4>`;
            
            sampleList.forEach(sample => {
                const item = document.createElement('div');
                item.className = 'sample-item';
                item.textContent = sample;
                item.setAttribute('data-sample', sample);
                item.onclick = () => this._triggerSample(sample);
                categoryDiv.appendChild(item);
            });
            
            container.appendChild(categoryDiv);
        }
        
        this.logger.debug('Samples populated');
    }

    _populateSynths() {
        const container = document.getElementById('synth-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.synths.forEach(synth => {
            const item = document.createElement('div');
            item.className = 'synth-item';
            item.textContent = synth;
            item.setAttribute('data-synth', synth);
            item.onclick = () => this._triggerSynth(synth);
            container.appendChild(item);
        });
        
        this.logger.debug('Synths populated');
    }

    _filterSamples(query) {
        const categories = document.querySelectorAll('.sample-category');
        
        categories.forEach(category => {
            const items = category.querySelectorAll('.sample-item');
            let visibleCount = 0;
            
            items.forEach(item => {
                const sampleName = item.getAttribute('data-sample').toLowerCase();
                if (sampleName.includes(query)) {
                    item.style.display = 'block';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Hide category if no visible items
            category.style.display = visibleCount > 0 ? 'block' : 'none';
        });
    }

    _filterSynths(query) {
        const items = document.querySelectorAll('.synth-item');
        
        items.forEach(item => {
            const synthName = item.getAttribute('data-synth').toLowerCase();
            item.style.display = synthName.includes(query) ? 'block' : 'none';
        });
    }

    _triggerSample(sample) {
        this.logger.info(`Triggering sample: ${sample}`);
        this.oscController.triggerSample(sample).catch(err => {
            this.logger.error(`Failed to trigger sample: ${sample}`, err);
        });
    }

    _triggerSynth(synth) {
        this.logger.info(`Triggering synth: ${synth}`);
        this.oscController.triggerSynth(synth).catch(err => {
            this.logger.error(`Failed to trigger synth: ${synth}`, err);
        });
    }
}

