"""
Unified Intelligent Agent
Combines user chat interaction and autonomous decision-making into one cohesive service
"""
import re
from typing import Dict, List, Tuple, Optional
from anthropic import Anthropic
from backend.core import get_logger, settings
from backend.models import AudioAnalysis, MusicalState, Decision

logger = get_logger(__name__)


class UnifiedIntelligentAgent:
    """
    Unified AI agent that handles both:
    1. User chat interaction with audio context
    2. Autonomous musical decision-making

    Uses a single LLM client and maintains conversation history.
    """

    def __init__(self, audio_engine=None, audio_analyzer=None):
        """Initialize the unified agent"""
        self.audio_engine = audio_engine
        self.audio_analyzer = audio_analyzer

        # LLM client
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in settings")

        self.client = Anthropic(api_key=settings.anthropic_api_key)
        logger.info(f"Unified Agent initialized with {settings.llm_model}")

        # State management
        self.is_running = False  # AI autonomous mode OFF by default
        self.is_playing = False  # Transport state

        # Current musical state
        self.current_state = MusicalState(
            bpm=120,
            intensity=5.0,
            complexity=5.0,
            key="C",
            scale="minor",
            energy_level=0.5
        )

        # History tracking
        self.conversation_history: List[Dict] = []
        self.recent_decisions: List[Decision] = []
        self.latest_audio: Optional[AudioAnalysis] = None
        self.llm_reasoning: str = ""

    async def process_user_message(self, message: str, audio_analysis: Dict) -> Tuple[str, str]:
        """
        Process user message with audio context and return intelligent response.
        Returns: (response_text, reasoning_text)
        """
        # Build context about current audio state
        audio_context = self._build_audio_context(audio_analysis)

        # Create system prompt
        system_prompt = """You are an AI DJ and music producer assistant controlling a live audio performance system.

You can hear and analyze the music in real-time through audio analysis data. You understand:
- Energy levels (RMS, loudness)
- Frequency content (spectral analysis, brightness)
- Rhythm and tempo
- Musical complexity

You can control these parameters:
- intensity (0-10): Controls arrangement complexity and section (intro/build/drop/breakdown)
- cutoff (50-130): Master filter cutoff frequency
- reverb (0-1): Reverb mix amount
- echo (0-1): Echo/delay mix amount
- bpm (60-180): Tempo
- key (a-g): Musical key
- scale (major, minor, dorian, phrygian, etc.): Musical scale

When users ask you to change the music, you should:
1. Analyze the current audio state
2. Understand what they want musically
3. Explain your reasoning
4. Make intelligent parameter changes

Be conversational, musical, and insightful. Show your understanding of the audio."""

        # Add audio context to the message
        full_message = f"{message}\n\n[Current Audio State]\n{audio_context}"

        # Add to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": full_message
        })

        # Keep conversation history manageable (last 10 messages)
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]

        try:
            # Call Claude
            response = self.client.messages.create(
                model=settings.llm_model,
                max_tokens=500,
                system=system_prompt,
                messages=self.conversation_history
            )

            assistant_message = response.content[0].text

            # Add assistant response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": assistant_message
            })

            # Store reasoning
            self.llm_reasoning = assistant_message

            # Return response and reasoning
            return (assistant_message, assistant_message)

        except Exception as e:
            logger.error(f"LLM error: {e}")
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            return (error_msg, "")

    async def analyze_and_decide(self, audio_analysis: AudioAnalysis) -> List[Decision]:
        """
        Analyze audio and make intelligent musical decisions using LLM.
        This is called autonomously by the feedback loop.
        Returns: List of Decision objects
        """
        # Store latest audio for status reporting
        self.latest_audio = audio_analysis

        # Update current state based on audio
        self.current_state.energy_level = audio_analysis.energy

        # Only make autonomous decisions if AI is running
        if not self.is_running:
            return []

        try:
            # Prepare audio analysis dict for LLM
            audio_dict = {
                'energy': audio_analysis.energy,
                'brightness': audio_analysis.brightness,
                'rhythm': audio_analysis.rhythm,
                'dominant_frequency': audio_analysis.dominant_frequency
            }

            # Prepare musical state dict for LLM
            state_dict = {
                'bpm': self.current_state.bpm,
                'intensity': self.current_state.intensity,
                'complexity': self.current_state.complexity,
                'key': self.current_state.key,
                'scale': self.current_state.scale,
                'energy_level': self.current_state.energy_level
            }

            # Call LLM to analyze and suggest changes
            llm_decisions, reasoning = await self._analyze_and_suggest_changes(
                audio_dict, state_dict
            )

            # Store reasoning for frontend display
            self.llm_reasoning = reasoning

            # Convert LLM decisions to Decision objects
            decisions = []
            for d in llm_decisions:
                decision = Decision(
                    parameter=d['parameter'],
                    value=d['value'],
                    confidence=d['confidence'],
                    reason=d['reason']
                )
                decisions.append(decision)

                # Update current state to reflect decision
                if d['parameter'] == 'bpm':
                    self.current_state.bpm = int(d['value'])
                elif d['parameter'] == 'intensity':
                    self.current_state.intensity = float(d['value'])
                elif d['parameter'] == 'key':
                    self.current_state.key = str(d['value'])
                elif d['parameter'] == 'scale':
                    self.current_state.scale = str(d['value'])

            logger.info(f"LLM suggested {len(decisions)} decisions. Reasoning: {reasoning[:100]}...")
            return decisions

        except Exception as e:
            logger.error(f"Error in analyze_and_decide: {e}")
            return []

    async def _analyze_and_suggest_changes(self, audio_analysis: Dict, musical_state: Dict) -> Tuple[List[Dict], str]:
        """
        Analyze current audio and musical state, suggest parameter changes autonomously.
        Returns: (list of decisions, reasoning text)

        Each decision is a dict with: parameter, value, confidence, reason
        """
        # Build context
        audio_context = self._build_audio_context({
            'audio_analysis': audio_analysis,
            'current_state': musical_state
        })

        # Create system prompt for autonomous decision-making
        system_prompt = """You are an AI DJ making real-time musical decisions for a live audio performance.

You analyze the current audio state and decide what parameter changes would improve the music.

Available parameters:
- intensity (0-10): Controls arrangement complexity
- cutoff (50-130): Master filter cutoff frequency
- reverb (0-1): Reverb mix amount
- echo (0-1): Echo/delay mix amount
- bpm (60-180): Tempo
- key (a-g): Musical key
- scale (major, minor, dorian, phrygian, etc.): Musical scale

Respond in this EXACT format:
REASONING: [Your musical reasoning about what you hear and what should change]
DECISIONS:
- parameter: value (confidence: 0.0-1.0) - reason
- parameter: value (confidence: 0.0-1.0) - reason

Example:
REASONING: The energy is high (0.75) but the mix sounds muddy. The brightness is low at 800Hz. I should open the filter to add clarity.
DECISIONS:
- cutoff: 110 (confidence: 0.8) - Open filter for more clarity
- reverb: 0.2 (confidence: 0.6) - Reduce reverb to clean up the mix

Only suggest 1-3 changes per cycle. Be conservative - only make changes when clearly beneficial."""

        prompt = f"Analyze the current state and suggest improvements:\n\n{audio_context}"

        try:
            response = self.client.messages.create(
                model=settings.llm_model,
                max_tokens=400,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text

            # Parse the response
            decisions, reasoning = self._parse_autonomous_response(response_text)

            return (decisions, reasoning)

        except Exception as e:
            logger.error(f"LLM autonomous analysis error: {e}")
            return ([], f"Error: {str(e)}")

    def _parse_autonomous_response(self, response: str) -> Tuple[List[Dict], str]:
        """Parse the LLM's autonomous response into decisions and reasoning"""
        decisions = []
        reasoning = ""

        # Extract reasoning
        reasoning_match = re.search(r'REASONING:\s*(.+?)(?=DECISIONS:|$)', response, re.DOTALL)
        if reasoning_match:
            reasoning = reasoning_match.group(1).strip()

        # Extract decisions
        decisions_section = re.search(r'DECISIONS:\s*(.+)', response, re.DOTALL)
        if decisions_section:
            decisions_text = decisions_section.group(1)

            # Parse each decision line
            # Format: - parameter: value (confidence: 0.8) - reason
            decision_pattern = r'-\s*(\w+):\s*([^\(]+)\s*\(confidence:\s*([\d.]+)\)\s*-\s*(.+)'

            for match in re.finditer(decision_pattern, decisions_text):
                parameter = match.group(1).strip()
                value_str = match.group(2).strip()
                confidence = float(match.group(3))
                reason = match.group(4).strip()

                # Convert value to appropriate type
                try:
                    # Try to convert to float/int
                    if '.' in value_str:
                        value = float(value_str)
                    else:
                        try:
                            value = int(value_str)
                        except:
                            value = value_str  # Keep as string (for key/scale)
                except:
                    value = value_str  # Keep as string

                decisions.append({
                    'parameter': parameter,
                    'value': value,
                    'confidence': confidence,
                    'reason': reason
                })

        return (decisions, reasoning)

    def _build_audio_context(self, audio_analysis: Dict) -> str:
        """Build human-readable audio context for LLM"""
        if not audio_analysis:
            return "No audio data available"

        audio = audio_analysis.get('audio_analysis', {})
        state = audio_analysis.get('current_state', {})

        energy = audio.get('energy', 0)
        brightness = audio.get('brightness', 0)
        rhythm = audio.get('rhythm', 0)

        context = f"""Energy: {energy:.2f} ({"high" if energy > 0.6 else "medium" if energy > 0.3 else "low"})
Brightness: {brightness:.0f} Hz ({"bright" if brightness > 2000 else "warm" if brightness > 1000 else "dark"})
Rhythm Strength: {rhythm:.2f} ({"strong" if rhythm > 0.6 else "moderate" if rhythm > 0.3 else "subtle"})
Current BPM: {state.get('bpm', 120)}
Current Intensity: {state.get('intensity', 5)}/10
Current Complexity: {state.get('complexity', 0.5):.1f}/1.0"""

        # Add spectral data if provided
        spectral_data = audio_analysis.get('spectral_data')
        if spectral_data:
            context += "\n\n[Attached Sample Spectral Analysis]"
            context += f"\nSample: {spectral_data.get('sample_name', 'Unknown')}"

            features = spectral_data.get('features', {})
            selected = spectral_data.get('selected_features', {})

            if selected.get('spectral'):
                context += f"\n\nSpectral Features:"
                context += f"\n- Centroid: {features.get('spectral_centroid', 0):.1f} Hz"
                context += f"\n- Rolloff: {features.get('spectral_rolloff', 0):.1f} Hz"
                context += f"\n- Bandwidth: {features.get('spectral_bandwidth', 0):.1f} Hz"
                context += f"\n- Flatness: {features.get('spectral_flatness', 0):.3f}"

            if selected.get('harmonics'):
                context += f"\n\nHarmonic Analysis:"
                context += f"\n- Fundamental: {features.get('fundamental_frequency', 0):.1f} Hz"
                harmonics = features.get('harmonics', [])
                if harmonics:
                    context += f"\n- Harmonics: {', '.join([f'{h:.1f}Hz' for h in harmonics[:5]])}"

            if selected.get('envelope'):
                context += f"\n\nEnvelope (ADSR):"
                context += f"\n- Attack: {features.get('attack_time', 0):.3f}s"
                context += f"\n- Decay: {features.get('decay_time', 0):.3f}s"
                context += f"\n- Sustain: {features.get('sustain_level', 0):.2f}"
                context += f"\n- Release: {features.get('release_time', 0):.3f}s"

            if selected.get('perceptual'):
                context += f"\n\nPerceptual Features:"
                context += f"\n- Brightness: {features.get('brightness', 0):.2f}"
                context += f"\n- Warmth: {features.get('warmth', 0):.2f}"
                context += f"\n- Roughness: {features.get('roughness', 0):.2f}"

        return context

    async def execute_decision(self, decision: Decision) -> None:
        """Execute a decision via audio engine"""
        try:
            # Add to history
            self.recent_decisions.append(decision)
            if len(self.recent_decisions) > 20:
                self.recent_decisions.pop(0)

            # Execute via audio engine
            if self.audio_engine:
                # TODO: Implement audio engine control
                # For now, just update state
                pass

            # Update current state
            if decision.parameter == "bpm":
                self.current_state.bpm = int(decision.value)
            elif decision.parameter == "intensity":
                self.current_state.intensity = float(decision.value)
            elif decision.parameter == "key":
                self.current_state.key = str(decision.value)
            elif decision.parameter == "scale":
                self.current_state.scale = str(decision.value)

            logger.info(f"Executed decision: {decision.parameter} = {decision.value} (confidence: {decision.confidence})")

        except Exception as e:
            logger.error(f"Failed to execute decision: {e}")

    def get_status(self) -> Dict:
        """Get current AI status for the frontend"""
        return {
            "is_running": self.is_running,
            "is_playing": self.is_playing,
            "audio_analysis": {
                "energy": self.latest_audio.energy if self.latest_audio else 0.0,
                "brightness": self.latest_audio.brightness if self.latest_audio else 0.0,
                "rhythm": self.latest_audio.rhythm if self.latest_audio else 0.0,
                "dominant_frequency": self.latest_audio.dominant_frequency if self.latest_audio else 0.0
            },
            "current_state": {
                "bpm": self.current_state.bpm,
                "key": self.current_state.key,
                "scale": self.current_state.scale,
                "intensity": self.current_state.intensity,
                "complexity": self.current_state.complexity,
                "energy_level": self.current_state.energy_level
            },
            "recent_decisions": [
                {
                    "parameter": d.parameter,
                    "value": d.value,
                    "confidence": d.confidence,
                    "reason": d.reason
                } for d in self.recent_decisions[-10:]
            ],
            "frequency_spectrum": self.audio_analyzer.get_frequency_spectrum(100) if self.audio_analyzer else [],
            "llm_reasoning": self.llm_reasoning
        }

    def get_reasoning(self) -> str:
        """Get the last reasoning from the AI"""
        if len(self.conversation_history) > 0:
            last_message = self.conversation_history[-1]
            if last_message['role'] == 'assistant':
                return last_message['content']
        return self.llm_reasoning if self.llm_reasoning else "No recent reasoning available"


