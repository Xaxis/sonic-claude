"""
AI Agent - Intelligent Music Composition System
Listens to Sonic Pi output, analyzes audio in real-time, makes musical decisions
"""

import numpy as np
import asyncio
import logging
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime
import json

logger = logging.getLogger("ai-agent")

@dataclass
class AudioAnalysis:
    """Real-time audio analysis results"""
    timestamp: float
    rms_energy: float  # Overall loudness
    spectral_centroid: float  # Brightness (Hz)
    spectral_rolloff: float  # High frequency content
    zero_crossing_rate: float  # Noisiness/texture
    tempo_estimate: float  # Detected BPM
    dominant_frequency: float  # Main pitch (Hz)
    harmonic_content: List[float]  # Harmonic series strengths
    rhythm_strength: float  # How rhythmic (0-1)
    
@dataclass
class MusicalState:
    """Current musical state"""
    bpm: int
    intensity: float
    cutoff: float
    reverb: float
    echo: float
    key: str
    scale: str
    energy_level: float  # 0-1
    complexity: float  # 0-1
    
@dataclass
class AIDecision:
    """AI's decision about what to change"""
    parameter: str
    new_value: float
    reason: str
    confidence: float  # 0-1
    

class MusicTheoryEngine:
    """Understands music theory and makes intelligent decisions"""
    
    def __init__(self):
        self.scales = {
            'major': [0, 2, 4, 5, 7, 9, 11],
            'minor': [0, 2, 3, 5, 7, 8, 10],
            'dorian': [0, 2, 3, 5, 7, 9, 10],
            'phrygian': [0, 1, 3, 5, 7, 8, 10],
            'lydian': [0, 2, 4, 6, 7, 9, 11],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10],
            'pentatonic': [0, 2, 4, 7, 9]
        }
        
        self.keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
        
    def analyze_harmony(self, dominant_freq: float) -> Dict:
        """Analyze if current harmony fits the key"""
        # Convert frequency to note
        # A4 = 440Hz
        if dominant_freq < 20:
            return {'in_key': True, 'note': 'unknown'}
            
        semitones_from_a4 = 12 * np.log2(dominant_freq / 440.0)
        note_number = int(round(semitones_from_a4)) % 12
        
        return {
            'in_key': True,  # Simplified for now
            'note_number': note_number,
            'frequency': dominant_freq
        }
        
    def suggest_key_change(self, current_key: str, energy: float) -> Optional[str]:
        """Suggest a key change based on energy level"""
        if energy > 0.8:
            # High energy - try brighter keys (C, D, E)
            bright_keys = ['c', 'd', 'e']
            return np.random.choice([k for k in bright_keys if k != current_key])
        elif energy < 0.3:
            # Low energy - try darker keys (A, F, G)
            dark_keys = ['a', 'f', 'g']
            return np.random.choice([k for k in dark_keys if k != current_key])
        return None
        
    def suggest_scale_change(self, current_scale: str, complexity: float) -> Optional[str]:
        """Suggest scale change based on complexity"""
        if complexity > 0.7 and current_scale == 'pentatonic':
            return 'minor'  # More complex
        elif complexity < 0.3 and current_scale != 'pentatonic':
            return 'pentatonic'  # Simpler
        return None


class IntelligentAgent:
    """The AI brain that makes musical decisions"""
    
    def __init__(self, osc_controller):
        self.osc_controller = osc_controller
        self.music_theory = MusicTheoryEngine()
        self.current_state = MusicalState(
            bpm=120, intensity=5, cutoff=100, reverb=0.5,
            echo=0.3, key='a', scale='minor',
            energy_level=0.5, complexity=0.5
        )
        self.analysis_history: List[AudioAnalysis] = []
        self.decision_history: List[AIDecision] = []
        self.user_intent = ""
        self.is_running = True  # Start ONLINE by default
        
    async def set_user_intent(self, intent: str):
        """User tells the AI what they want"""
        self.user_intent = intent.lower()
        logger.info(f"AI received user intent: {intent}")
        
        # Immediate response to user intent
        decisions = self._interpret_intent(intent)
        for decision in decisions:
            await self._execute_decision(decision)
            
    def _interpret_intent(self, intent: str) -> List[AIDecision]:
        """Convert user's words into musical decisions"""
        decisions = []
        
        if 'faster' in intent or 'speed up' in intent:
            new_bpm = min(200, self.current_state.bpm + 10)
            decisions.append(AIDecision(
                'bpm', new_bpm, 
                f"User wants faster tempo", 0.9
            ))
            
        if 'slower' in intent or 'slow down' in intent:
            new_bpm = max(60, self.current_state.bpm - 10)
            decisions.append(AIDecision(
                'bpm', new_bpm,
                f"User wants slower tempo", 0.9
            ))
            
        if 'intense' in intent or 'heavy' in intent or 'drop' in intent:
            decisions.append(AIDecision(
                'intensity', 9,
                "User wants high intensity", 0.95
            ))
            
        if 'chill' in intent or 'ambient' in intent or 'calm' in intent:
            decisions.append(AIDecision(
                'intensity', 2,
                "User wants low intensity/ambient", 0.95
            ))
            decisions.append(AIDecision(
                'reverb', 0.8,
                "More reverb for ambient feel", 0.8
            ))
            
        return decisions

    async def analyze_and_decide(self, analysis: AudioAnalysis) -> List[AIDecision]:
        """Analyze audio and make intelligent musical decisions"""
        self.analysis_history.append(analysis)
        if len(self.analysis_history) > 100:
            self.analysis_history.pop(0)

        decisions = []

        # Update current energy and complexity estimates
        self.current_state.energy_level = analysis.rms_energy
        self.current_state.complexity = analysis.rhythm_strength

        # Decision 1: Adjust intensity based on energy
        if analysis.rms_energy > 0.8 and self.current_state.intensity < 8:
            decisions.append(AIDecision(
                'intensity', min(10, self.current_state.intensity + 1),
                f"Energy is high ({analysis.rms_energy:.2f}), increasing intensity",
                0.7
            ))
        elif analysis.rms_energy < 0.3 and self.current_state.intensity > 3:
            decisions.append(AIDecision(
                'intensity', max(0, self.current_state.intensity - 1),
                f"Energy is low ({analysis.rms_energy:.2f}), decreasing intensity",
                0.7
            ))

        # Decision 2: Adjust filter based on spectral content
        if analysis.spectral_centroid > 3000 and self.current_state.cutoff > 80:
            # Too bright, reduce cutoff
            decisions.append(AIDecision(
                'cutoff', max(50, self.current_state.cutoff - 10),
                f"Sound too bright ({analysis.spectral_centroid:.0f}Hz), reducing filter",
                0.6
            ))
        elif analysis.spectral_centroid < 1000 and self.current_state.cutoff < 120:
            # Too dark, increase cutoff
            decisions.append(AIDecision(
                'cutoff', min(130, self.current_state.cutoff + 10),
                f"Sound too dark ({analysis.spectral_centroid:.0f}Hz), opening filter",
                0.6
            ))

        # Decision 3: Suggest key/scale changes
        key_suggestion = self.music_theory.suggest_key_change(
            self.current_state.key, self.current_state.energy_level
        )
        if key_suggestion:
            decisions.append(AIDecision(
                'key', key_suggestion,
                f"Energy level suggests key change to {key_suggestion}",
                0.5
            ))

        scale_suggestion = self.music_theory.suggest_scale_change(
            self.current_state.scale, self.current_state.complexity
        )
        if scale_suggestion:
            decisions.append(AIDecision(
                'scale', scale_suggestion,
                f"Complexity suggests scale change to {scale_suggestion}",
                0.5
            ))

        return decisions

    async def _execute_decision(self, decision: AIDecision):
        """Execute an AI decision by sending OSC"""
        try:
            self.decision_history.append(decision)
            if len(self.decision_history) > 50:
                self.decision_history.pop(0)

            logger.info(f"AI Decision: {decision.parameter} = {decision.new_value} ({decision.reason})")

            # Update internal state
            setattr(self.current_state, decision.parameter, decision.new_value)

            # Send OSC command
            await self.osc_controller.send(decision.parameter, decision.new_value)

        except Exception as e:
            logger.error(f"Failed to execute decision: {e}")

    def get_status(self) -> Dict:
        """Get current AI status for UI"""
        recent_decisions = self.decision_history[-5:] if self.decision_history else []
        recent_analysis = self.analysis_history[-1] if self.analysis_history else None

        return {
            'is_running': self.is_running,
            'user_intent': self.user_intent,
            'current_state': {
                'bpm': self.current_state.bpm,
                'intensity': self.current_state.intensity,
                'energy_level': self.current_state.energy_level,
                'complexity': self.current_state.complexity
            },
            'recent_decisions': [
                {
                    'parameter': d.parameter,
                    'value': d.new_value,
                    'reason': d.reason,
                    'confidence': d.confidence
                } for d in recent_decisions
            ],
            'audio_analysis': {
                'energy': recent_analysis.rms_energy if recent_analysis else 0,
                'brightness': recent_analysis.spectral_centroid if recent_analysis else 0,
                'rhythm': recent_analysis.rhythm_strength if recent_analysis else 0
            } if recent_analysis else None
        }

