"""
Synthesis Agent Service
Uses LLM to generate Sonic Pi synthesis parameters from spectral analysis
"""
import json
from typing import Optional
from anthropic import Anthropic
from backend.core import get_logger, settings
from backend.models.sample import SpectralFeatures, SynthesisParameters

logger = get_logger(__name__)


class SynthesisAgent:
    """LLM agent that generates synthesis parameters from spectral features"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.anthropic_api_key
        if not self.api_key:
            logger.warning("No Anthropic API key provided - synthesis agent disabled")
            self.client = None
        else:
            self.client = Anthropic(api_key=self.api_key)
            logger.info("SynthesisAgent initialized with LLM")
            
    async def generate_synthesis_parameters(
        self, 
        spectral_features: SpectralFeatures
    ) -> SynthesisParameters:
        """Generate Sonic Pi synthesis parameters from spectral analysis"""
        
        if not self.client:
            raise ValueError("Synthesis agent not initialized - no API key")
            
        try:
            # Build prompt with spectral features
            prompt = self._build_synthesis_prompt(spectral_features)
            
            # Call LLM
            response = self.client.messages.create(
                model=settings.llm_model,
                max_tokens=2000,
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Parse response
            response_text = response.content[0].text
            logger.info(f"LLM synthesis response: {response_text[:200]}...")
            
            # Extract JSON from response
            params = self._parse_synthesis_response(response_text, spectral_features.sample_id)
            
            return params
            
        except Exception as e:
            logger.error(f"Failed to generate synthesis parameters: {e}")
            raise
            
    def _build_synthesis_prompt(self, features: SpectralFeatures) -> str:
        """Build prompt for LLM with spectral features"""
        
        # Convert harmonics to readable format
        harmonics_str = ", ".join([f"{h:.1f}Hz" for h in features.harmonics[:5]])
        
        prompt = f"""You are an expert in audio synthesis and Sonic Pi. Analyze these spectral features from an audio sample and generate optimal Sonic Pi synthesis parameters to replicate it.

SPECTRAL ANALYSIS:
- Fundamental Frequency: {features.fundamental_frequency:.1f} Hz
- Harmonics: {harmonics_str}
- Spectral Centroid: {features.spectral_centroid:.1f} Hz (brightness)
- Spectral Rolloff: {features.spectral_rolloff:.1f} Hz
- Spectral Flatness: {features.spectral_flatness:.3f} (0=tonal, 1=noisy)

ENVELOPE (ADSR):
- Attack: {features.attack_time:.3f}s
- Decay: {features.decay_time:.3f}s
- Sustain: {features.sustain_level:.3f}
- Release: {features.release_time:.3f}s

PERCEPTUAL QUALITIES:
- Brightness: {features.brightness:.3f}
- Roughness: {features.roughness:.3f}
- Warmth: {features.warmth:.3f}

Based on this analysis, generate Sonic Pi synthesis parameters. Respond with ONLY a JSON object in this exact format:

{{
  "synth_type": "saw|prophet|tb303|beep|dsaw|fm|pulse|subpulse|sine|square|tri|etc",
  "note": "C4|D#3|etc or frequency in Hz",
  "amp": 0.0-1.0,
  "pan": -1.0 to 1.0,
  "attack": seconds,
  "decay": seconds,
  "sustain": 0.0-1.0,
  "release": seconds,
  "cutoff": 0-130 (MIDI note for filter cutoff),
  "res": 0.0-1.0 (filter resonance),
  "detune": 0.0-1.0,
  "pulse_width": 0.0-1.0,
  "reverb": 0.0-1.0,
  "echo": 0.0-1.0,
  "reasoning": "Brief explanation of why you chose these parameters",
  "confidence": 0.0-1.0 (how confident you are this will match the original)
}}

Choose the synth type based on harmonic content:
- Rich harmonics + warmth → saw, prophet, dsaw
- Few harmonics + pure tone → sine, beep
- Noisy/flat spectrum → noise, cnoise
- Percussive/short → tb303, zawa
- Complex harmonics → fm, prophet

Match the ADSR envelope closely. Set cutoff based on spectral rolloff. Use detune for warmth."""

        return prompt
        
    def _parse_synthesis_response(self, response_text: str, sample_id: str) -> SynthesisParameters:
        """Parse LLM response and extract synthesis parameters"""
        
        try:
            # Find JSON in response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                raise ValueError("No JSON found in response")
                
            json_str = response_text[start_idx:end_idx]
            data = json.loads(json_str)
            
            # Create SynthesisParameters object
            params = SynthesisParameters(
                sample_id=sample_id,
                synth_type=data.get("synth_type", "saw"),
                note=str(data.get("note", "C4")),
                amp=float(data.get("amp", 0.8)),
                pan=float(data.get("pan", 0.0)),
                attack=float(data.get("attack", 0.01)),
                decay=float(data.get("decay", 0.1)),
                sustain=float(data.get("sustain", 0.7)),
                release=float(data.get("release", 0.5)),
                cutoff=float(data.get("cutoff", 100)),
                res=float(data.get("res", 0.5)),
                detune=float(data.get("detune", 0.0)),
                pulse_width=float(data.get("pulse_width", 0.5)),
                reverb=float(data.get("reverb", 0.0)),
                echo=float(data.get("echo", 0.0)),
                reasoning=data.get("reasoning", ""),
                confidence=float(data.get("confidence", 0.5))
            )
            
            return params
            
        except Exception as e:
            logger.error(f"Failed to parse synthesis response: {e}")
            logger.error(f"Response text: {response_text}")
            raise

