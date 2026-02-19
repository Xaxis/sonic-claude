"""
AI Agent Service - LLM-powered DAW control with efficient token usage

Performance optimizations:
- Event-driven triggering (not continuous polling)
- State diffs instead of full snapshots
- Compact prompts with structured output
- Caching of LLM responses
- Rate limiting to prevent token waste
"""
import logging
import asyncio
from typing import Optional, List, Dict, Any, Callable
from datetime import datetime, timedelta
import anthropic

from backend.models.daw_state import DAWStateSnapshot, AudioFeatures, MusicalContext
from backend.models.ai_actions import DAWAction, ActionResult
from backend.services.daw_state_service import DAWStateService
from backend.services.daw_action_service import DAWActionService

logger = logging.getLogger(__name__)


class AIAgentService:
    """
    AI Agent that analyzes DAW state and generates actions
    
    Efficiency strategies:
    1. Event-driven: Only calls LLM on significant changes
    2. Rate limiting: Max 1 call per N seconds
    3. State diffs: Sends only changes, not full state
    4. Structured output: Uses function calling for actions
    5. Caching: Remembers recent decisions
    """
    
    def __init__(
        self,
        state_service: DAWStateService,
        action_service: DAWActionService,
        api_key: str,
        model: str = "claude-3-5-sonnet-20241022"
    ):
        self.state_service = state_service
        self.action_service = action_service
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        
        # Efficiency controls
        self.min_call_interval = 2.0  # Minimum seconds between LLM calls
        self.last_call_time: Optional[datetime] = None
        self.last_state_hash: Optional[str] = None
        
        # Conversation history (limited to last N messages)
        self.conversation_history: List[Dict[str, Any]] = []
        self.max_history_length = 10
        
        # Event triggers (what causes LLM to be called)
        self.triggers: Dict[str, bool] = {
            "user_message": False,
            "playback_started": False,
            "playback_stopped": False,
            "significant_change": False,
            "periodic": False
        }
        
        # Autonomous mode
        self.autonomous_mode = False
        self.autonomous_interval = 10.0  # Seconds between autonomous checks
        self._autonomous_task: Optional[asyncio.Task] = None
    
    async def send_message(self, user_message: str) -> str:
        """
        Send user message and get AI response
        
        Args:
            user_message: User's message/request
        
        Returns:
            AI's text response
        """
        # Get current state
        state_response = self.state_service.get_state(previous_hash=self.last_state_hash)
        
        # Build system prompt
        system_prompt = self._build_system_prompt()
        
        # Build user message with context
        context_message = self._build_context_message(state_response.full_state)
        full_message = f"{context_message}\n\nUser: {user_message}"
        
        # Add to history
        self.conversation_history.append({
            "role": "user",
            "content": full_message
        })
        
        # Trim history
        if len(self.conversation_history) > self.max_history_length:
            self.conversation_history = self.conversation_history[-self.max_history_length:]
        
        # Call Claude with function calling
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=system_prompt,
            messages=self.conversation_history,
            tools=self._get_tool_definitions()
        )
        
        # Update last call time
        self.last_call_time = datetime.now()
        
        # Process response
        assistant_message = ""
        actions_executed = []
        
        for block in response.content:
            if block.type == "text":
                assistant_message += block.text
            elif block.type == "tool_use":
                # Execute action
                action = DAWAction(
                    action=block.name,
                    parameters=block.input
                )
                result = await self.action_service.execute_action(action)
                actions_executed.append(result)
                
                # Add result to conversation
                assistant_message += f"\n[Executed: {block.name}]"
        
        # Add assistant response to history
        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_message
        })
        
        # Update state hash
        if state_response.full_state:
            self.last_state_hash = state_response.full_state.state_hash
        
        return assistant_message
    
    async def analyze_and_suggest(self) -> Optional[List[ActionResult]]:
        """
        Analyze current state and suggest actions (autonomous mode)
        
        Returns:
            List of executed actions (if any)
        """
        # Rate limiting
        if self.last_call_time:
            elapsed = (datetime.now() - self.last_call_time).total_seconds()
            if elapsed < self.min_call_interval:
                logger.debug(f"Rate limited: {elapsed:.1f}s < {self.min_call_interval}s")
                return None
        
        # Get state (with diff detection)
        state_response = self.state_service.get_state(previous_hash=self.last_state_hash)
        
        # If no changes, skip
        if not state_response.full_state and not state_response.diff:
            logger.debug("No state changes, skipping LLM call")
            return None
        
        # Build analysis prompt
        prompt = self._build_analysis_prompt(state_response.full_state)
        
        # Call Claude
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=self._build_system_prompt(),
            messages=[{"role": "user", "content": prompt}],
            tools=self._get_tool_definitions()
        )
        
        # Update last call time
        self.last_call_time = datetime.now()
        
        # Execute suggested actions
        actions_executed = []
        for block in response.content:
            if block.type == "tool_use":
                action = DAWAction(
                    action=block.name,
                    parameters=block.input
                )
                result = await self.action_service.execute_action(action)
                actions_executed.append(result)
                logger.info(f"Autonomous action: {block.name} - {result.message}")
        
        # Update state hash
        if state_response.full_state:
            self.last_state_hash = state_response.full_state.state_hash
        
        return actions_executed if actions_executed else None

    def start_autonomous_mode(self):
        """Start autonomous analysis loop"""
        if self._autonomous_task:
            logger.warning("Autonomous mode already running")
            return

        self.autonomous_mode = True
        self._autonomous_task = asyncio.create_task(self._autonomous_loop())
        logger.info("Started autonomous mode")

    def stop_autonomous_mode(self):
        """Stop autonomous analysis loop"""
        self.autonomous_mode = False
        if self._autonomous_task:
            self._autonomous_task.cancel()
            self._autonomous_task = None
        logger.info("Stopped autonomous mode")

    async def _autonomous_loop(self):
        """Autonomous analysis loop"""
        while self.autonomous_mode:
            try:
                await self.analyze_and_suggest()
            except Exception as e:
                logger.error(f"Error in autonomous loop: {e}", exc_info=True)

            await asyncio.sleep(self.autonomous_interval)

    def _build_system_prompt(self) -> str:
        """Build system prompt for Claude"""
        return """You are an AI music producer integrated into a DAW (Digital Audio Workstation).

Your role:
- Analyze the current musical state (tempo, key, clips, tracks)
- Listen to audio features (energy, brightness, loudness)
- Suggest musical improvements and variations
- Create MIDI clips, modify parameters, add effects
- Collaborate with the user to create music

Guidelines:
- Be creative but respectful of the user's vision
- Explain your reasoning briefly
- Use musical terminology appropriately
- When creating MIDI, use musically sensible note choices
- Consider the current key and tempo

Available actions:
- create_midi_clip: Add new MIDI clips with notes
- modify_clip: Change existing clips
- set_track_parameter: Adjust volume, pan, mute, solo
- set_tempo: Change global tempo
- add_effect: Add effects to tracks
- play_sequence/stop_playback: Control playback

Note format for MIDI:
- n: MIDI note number (0-127, middle C = 60)
- s: Start time in beats
- d: Duration in beats
- v: Velocity (0-127, default 100)

Example: {n: 60, s: 0, d: 1, v: 100} = Middle C, starts at beat 0, lasts 1 beat"""

    def _build_context_message(self, state: Optional[DAWStateSnapshot]) -> str:
        """Build compact context message from state"""
        if not state:
            return "Current state: No active sequence"

        context_parts = [
            f"Tempo: {state.tempo} BPM",
            f"Playing: {state.playing}",
            f"Position: {state.position:.1f} beats"
        ]

        if state.musical:
            context_parts.append(f"Key: {state.musical.key or 'Unknown'}")
            context_parts.append(f"Complexity: {state.musical.complexity:.2f}")

        if state.audio:
            context_parts.append(f"Energy: {state.audio.energy:.2f}")
            context_parts.append(f"Brightness: {state.audio.brightness:.2f}")

        if state.sequence:
            context_parts.append(f"Tracks: {len(state.sequence.tracks)}")
            context_parts.append(f"Clips: {len(state.sequence.clips)}")

        return "Current DAW state:\n" + "\n".join(f"- {part}" for part in context_parts)

    def _build_analysis_prompt(self, state: Optional[DAWStateSnapshot]) -> str:
        """Build prompt for autonomous analysis"""
        context = self._build_context_message(state)
        return f"""{context}

Analyze the current musical state and suggest ONE improvement or addition.
If the music is playing and sounds good, you can suggest subtle enhancements.
If nothing is playing, you might suggest starting with a basic rhythm or melody.

Keep suggestions simple and musical. Explain your reasoning briefly."""

    def _get_tool_definitions(self) -> List[Dict[str, Any]]:
        """Get Claude function calling tool definitions"""
        return [
            {
                "name": "create_midi_clip",
                "description": "Create a new MIDI clip with notes on a track",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID to add clip to"},
                        "start_time": {"type": "number", "description": "Start time in beats"},
                        "duration": {"type": "number", "description": "Clip duration in beats"},
                        "notes": {
                            "type": "array",
                            "description": "Array of notes: [{n: 60, s: 0, d: 1, v: 100}, ...]",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "n": {"type": "integer", "description": "MIDI note (0-127)"},
                                    "s": {"type": "number", "description": "Start time in beats (relative to clip)"},
                                    "d": {"type": "number", "description": "Duration in beats"},
                                    "v": {"type": "integer", "description": "Velocity (0-127)"}
                                },
                                "required": ["n", "s", "d"]
                            }
                        },
                        "name": {"type": "string", "description": "Clip name (optional)"}
                    },
                    "required": ["track_id", "start_time", "duration", "notes"]
                }
            },
            {
                "name": "set_tempo",
                "description": "Set global tempo in BPM",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "tempo": {"type": "number", "description": "Tempo in BPM (20-300)"}
                    },
                    "required": ["tempo"]
                }
            },
            {
                "name": "set_track_parameter",
                "description": "Set track parameter (volume, pan, mute, solo)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string"},
                        "parameter": {"type": "string", "enum": ["volume", "pan", "mute", "solo"]},
                        "value": {"description": "Parameter value (number for volume/pan, boolean for mute/solo)"}
                    },
                    "required": ["track_id", "parameter", "value"]
                }
            },
            {
                "name": "play_sequence",
                "description": "Start playback",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "sequence_id": {"type": "string", "description": "Sequence ID (optional, uses current)"}
                    }
                }
            },
            {
                "name": "stop_playback",
                "description": "Stop playback",
                "input_schema": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]

