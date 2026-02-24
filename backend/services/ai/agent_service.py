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
from pathlib import Path
import anthropic

from backend.models.daw_state import DAWStateSnapshot, AudioFeatures, MusicalContext
from backend.models.ai_actions import DAWAction, ActionResult
from backend.services.ai.state_collector_service import DAWStateService
from backend.services.ai.action_executor_service import DAWActionService
from backend.services.analysis.sample_analyzer_service import SampleFileAnalyzer
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.services.persistence.composition_service import CompositionService
    from backend.services.daw.mixer_service import MixerService
    from backend.services.daw.effects_service import TrackEffectsService

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
        composition_service: Optional['CompositionService'] = None,
        api_key: Optional[str] = None,
        model: str = "claude-sonnet-4-5-20250929",
        samples_dir: Optional[Path] = None
    ):
        self.state_service = state_service
        self.action_service = action_service
        self.composition_service = composition_service
        self.client = anthropic.Anthropic(api_key=api_key) if api_key else None
        self.model = model

        # Sample analyzer for audio understanding
        self.sample_analyzer = SampleFileAnalyzer(samples_dir=samples_dir)

        # Track last state hash for efficient diffs (optional optimization)
        self.last_state_hash: Optional[str] = None

        # Chat history tracking (per composition)
        self.chat_histories: Dict[str, List[Dict[str, Any]]] = {}
    
    async def send_message(self, user_message: str) -> Dict[str, Any]:
        """
        TWO-STAGE AI EXECUTION:

        STAGE 1 (PLANNING): Analyze request + DAW state → Generate detailed execution plan
        STAGE 2 (EXECUTION): Execute plan with tool calls

        This ensures:
        - AI fully understands the request before acting
        - Complete workflows (e.g., create_track → create_midi_clip → add_effect)
        - No skipped steps or empty tracks
        - Better constraint enforcement

        Args:
            user_message: User's message/request

        Returns:
            Dict with 'response' (str) and 'actions_executed' (list of ActionResult)
        """
        # Get current state (FRESH - no history)
        state_response = self.state_service.get_state(previous_hash=self.last_state_hash)
        context_message = self._build_context_message(state_response.full_state)

        # ====================================================================
        # STAGE 1: PLANNING
        # ====================================================================
        logger.info(f"🎯 STAGE 1: Planning for request: '{user_message}'")

        planning_prompt = self._build_planning_prompt(user_message, context_message)

        planning_response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            system=planning_prompt,
            messages=[{
                "role": "user",
                "content": f"User request: {user_message}\n\nCurrent DAW state:\n{context_message}"
            }]
        )

        # Extract plan from response
        plan_text = ""
        for block in planning_response.content:
            if block.type == "text":
                plan_text += block.text

        logger.info(f"📋 Generated plan:\n{plan_text}")

        # ====================================================================
        # STAGE 2: EXECUTION (MULTI-TURN LOOP)
        # ====================================================================
        logger.info(f"⚡ STAGE 2: Executing plan")

        execution_prompt = self._build_execution_prompt()

        # Inject the plan into the execution request
        initial_message = f"""EXECUTION PLAN (follow this EXACTLY):
{plan_text}

Current DAW state:
{context_message}

Original user request: {user_message}

Execute the plan above using the available tools. Follow EVERY step in the plan.
Call ALL the tools needed to complete ALL steps. Don't stop after one tool call."""

        # Multi-turn execution loop
        actions_executed = []
        track_ids_created = []  # Track IDs from create_track actions
        assistant_message = ""
        track_name_to_id = {}  # Map track names to IDs for reference

        # Build conversation history for multi-turn execution
        messages = [{
            "role": "user",
            "content": initial_message
        }]

        max_turns = 10  # Safety limit to prevent infinite loops
        turn = 0

        while turn < max_turns:
            turn += 1
            logger.info(f"🔄 Execution turn {turn}/{max_turns}")

            # Call Claude with function calling for execution
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,  # More tokens for execution
                system=execution_prompt,
                messages=messages,
                tools=self._get_tool_definitions()
            )

            # Update last call time
            self.last_call_time = datetime.now()

            # Check if Claude made any tool calls
            tool_calls_made = False
            turn_results = []

            # Process response blocks
            for block in response.content:
                if block.type == "text":
                    assistant_message += block.text
                elif block.type == "tool_use":
                    tool_calls_made = True

                    # Execute action
                    action = DAWAction(
                        action=block.name,
                        parameters=block.input
                    )

                    logger.info(f"🎯 AI calling tool: {block.name} with params: {block.input}")

                    result = await self.action_service.execute_action(action)
                    actions_executed.append(result)

                    # Track create_track actions to detect empty tracks
                    if block.name == "create_track":
                        if result.success and result.data and "track_id" in result.data:
                            track_id = result.data["track_id"]
                            track_name = block.input.get("name", "Unknown")
                            track_ids_created.append(track_id)
                            track_name_to_id[track_name] = track_id
                            logger.info(f"✅ Created track: {track_name} -> {track_id}")

                    # Log if create_midi_clip is called
                    if block.name == "create_midi_clip":
                        track_id = block.input.get("track_id")
                        if track_id in track_ids_created:
                            track_ids_created.remove(track_id)  # Track now has content
                            logger.info(f"✅ Added clip to track: {track_id}")

                    # Add result to message
                    assistant_message += f"\n[Executed: {block.name}]"

                    # Build tool result message with track ID mapping if relevant
                    result_content = f"Success: {result.message}" if result.success else f"Error: {result.error}"

                    # If this was create_track, include the track_id in the result
                    if block.name == "create_track" and result.success and result.data:
                        track_id = result.data.get("track_id")
                        track_name = block.input.get("name")
                        result_content += f"\n✅ Track ID for '{track_name}': {track_id}"
                        result_content += f"\n⚠️ IMPORTANT: Use track_id='{track_id}' (not '{track_name}') for subsequent operations on this track"

                    # Store tool result for next turn
                    turn_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_content
                    })

            # If no tool calls were made, we're done
            if not tool_calls_made:
                logger.info(f"✅ Execution complete - no more tool calls")
                break

            # Add assistant response to conversation
            messages.append({
                "role": "assistant",
                "content": response.content
            })

            # Add tool results to conversation
            messages.append({
                "role": "user",
                "content": turn_results
            })

            logger.info(f"📊 Turn {turn} complete: {len(turn_results)} tools executed, {len(actions_executed)} total actions")

        # CRITICAL: Warn if tracks were created without clips
        if track_ids_created:
            logger.error(f"🚨 AI CREATED EMPTY TRACKS: {track_ids_created}")
            logger.error(f"🚨 This violates the system prompt! Tracks without clips are useless!")

        logger.info(f"✅ Execution complete after {turn} turns: {len(actions_executed)} total actions")

        # Log execution summary
        if actions_executed:
            action_summary = {}
            for action in actions_executed:
                action_type = action.action
                action_summary[action_type] = action_summary.get(action_type, 0) + 1

            logger.info(f"📊 Action summary: {action_summary}")
        else:
            logger.warning(f"⚠️ No actions were executed! This might indicate a problem.")

        # Build comprehensive response including plan
        full_response = f"""**PLAN:**
{plan_text}

**EXECUTION:**
{assistant_message}

**ACTIONS EXECUTED:** {len(actions_executed)}"""

        # Auto-save composition as iteration if actions were executed
        if actions_executed and len(actions_executed) > 0:
            await self._save_ai_iteration(user_message, full_response, actions_executed)

        # Update state hash
        if state_response.full_state:
            self.last_state_hash = state_response.full_state.state_hash

        # Store actions count for API response
        self.last_actions_executed = len(actions_executed)

        return {
            "response": full_response,
            "actions_executed": actions_executed,
            "musical_context": context_message,  # Include the full musical analysis
            "plan": plan_text  # Include the plan separately for frontend
        }

    async def _save_ai_iteration(self, user_message: str, assistant_response: str, actions_executed: List[ActionResult]) -> None:
        """Save composition as AI iteration after actions are executed"""
        try:
            # Check if we have all required services
            if not all([self.composition_service, self.action_service.composition_state,
                       self.action_service.mixer, self.action_service.effects]):
                logger.warning("⚠️ Cannot save AI iteration: missing required services")
                return

            # Get current composition ID
            composition_id = self.action_service.composition_state.current_composition_id
            if not composition_id:
                logger.warning("⚠️ Cannot save AI iteration: no active composition")
                return

            # Get composition
            composition = self.action_service.composition_state.get_composition(composition_id)
            if not composition:
                logger.warning(f"⚠️ Cannot save AI iteration: composition {composition_id} not found")
                return

            # Get or initialize chat history for this composition
            if composition_id not in self.chat_histories:
                self.chat_histories[composition_id] = []

            # Add user message to chat history
            self.chat_histories[composition_id].append({
                "role": "user",
                "content": user_message,
                "timestamp": datetime.now().isoformat(),
                "actions_executed": None
            })

            # Add assistant response to chat history
            self.chat_histories[composition_id].append({
                "role": "assistant",
                "content": assistant_response,
                "timestamp": datetime.now().isoformat(),
                "actions_executed": [
                    {
                        "action": result.action,
                        "success": result.success,
                        "data": result.data,
                        "error": result.error
                    }
                    for result in actions_executed
                ]
            })

            # Capture current composition state from services
            captured_composition = self.composition_service.capture_composition_from_services(
                composition_state_service=self.action_service.composition_state,
                mixer_service=self.action_service.mixer,
                effects_service=self.action_service.effects,
                composition_id=composition_id
            )

            if not captured_composition:
                logger.error("❌ Failed to capture composition for AI iteration")
                return

            # Update metadata
            if not captured_composition.metadata:
                captured_composition.metadata = {}
            captured_composition.metadata.update({
                "source": "ai_iteration",
                "user_message": user_message,
                "actions_count": len(actions_executed),
                "timestamp": datetime.now().isoformat()
            })

            # Update chat history
            captured_composition.chat_history = self.chat_histories[composition_id]

            # Save with history
            self.composition_service.save_composition(
                composition=captured_composition,
                create_history=True,  # Create history entry for AI iteration
                is_autosave=False
            )

            logger.info(f"💾 Saved AI iteration for composition {composition_id} with {len(self.chat_histories[composition_id])} chat messages")

        except Exception as e:
            logger.error(f"❌ Failed to save AI iteration: {e}", exc_info=True)

    def _build_planning_prompt(self, user_message: str, context_message: str) -> str:
        """Build STAGE 1 planning prompt"""
        instruments_list = self._build_instruments_list()
        effects_list = self._build_effects_list()

        return f"""You are a music production AI in PLANNING mode.

Your task: Analyze the user's request and current DAW state, then generate a DETAILED execution plan.

═══════════════════════════════════════════════════════════════════════════════
PLANNING GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

1. **Understand the request holistically**
   - What is the user trying to achieve musically?
   - What changes are needed to existing tracks/clips/effects/mixer?
   - What new elements need to be created?

2. **Analyze current state**
   - What tracks/clips/effects already exist?
   - What's the current tempo, key, style?
   - What's missing or needs modification?

3. **Generate COMPLETE workflow**
   - For NEW tracks: ALWAYS include create_track → create_midi_clip → add_effect
   - For MODIFICATIONS: Specify exact clips/tracks to modify and how
   - For MIXER changes: Specify exact parameter adjustments
   - For EFFECTS: Specify which tracks and which effects

4. **Be SPECIFIC with musical content**
   - Specify exact MIDI note patterns (not "add some notes")
   - Specify exact parameter values (not "adjust volume")
   - Specify exact timing (start_time, duration in beats)

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE INSTRUMENTS
═══════════════════════════════════════════════════════════════════════════════
{instruments_list}

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE EFFECTS
═══════════════════════════════════════════════════════════════════════════════
{effects_list}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Generate a plan in this format:

**ANALYSIS:**
[Brief analysis of the request and current state]

**PLAN:**
Step 1: [Action] - [Specific details]
  - Parameter 1: [value]
  - Parameter 2: [value]

Step 2: [Action] - [Specific details]
  - Parameter 1: [value]
  - Parameter 2: [value]

[Continue for all steps...]

**MUSICAL REASONING:**
[Explain why this plan achieves the user's goal]

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════════

🚨 **NEVER plan to create a track without immediately adding a clip with notes**
🚨 **ALWAYS specify exact MIDI note patterns** - use format: {{n: 60, s: 0, d: 1, v: 100}}
🚨 **ALWAYS specify exact parameter values** - no vague terms like "adjust" or "tweak"
🚨 **THINK COMPLETE WORKFLOWS** - don't plan half-finished actions

Remember: You're PLANNING, not executing. Be thorough and specific."""

    def _build_execution_prompt(self) -> str:
        """Build STAGE 2 execution prompt"""
        return """You are a music production AI in EXECUTION mode.

Your task: Execute the provided plan EXACTLY using the available tools.

═══════════════════════════════════════════════════════════════════════════════
EXECUTION RULES
═══════════════════════════════════════════════════════════════════════════════

1. **Execute ALL steps in ONE response**
   - Make MULTIPLE tool calls in a SINGLE response
   - Execute EVERY step in the plan sequentially
   - Use the EXACT parameters specified in the plan
   - Don't skip steps or improvise
   - Don't stop after one tool call - keep going until ALL steps are complete

2. **Use tools correctly**
   - create_track: Creates a new track (returns track_id)
   - create_midi_clip: Adds notes to a track (requires track_id from create_track)
   - modify_clip: Changes existing clip notes/timing
   - add_effect: Adds effect to track
   - set_track_parameter: Adjusts volume/pan/mute/solo
   - set_tempo: Changes global tempo

3. **Complete workflows**
   - ALWAYS call create_midi_clip immediately after create_track
   - ALWAYS use the track_id returned from create_track
   - ALWAYS include actual note data in create_midi_clip

4. **MIDI note format**
   - Use compact format: {{n: MIDI_NOTE, s: START_BEAT, d: DURATION, v: VELOCITY}}
   - Example: {{n: 60, s: 0, d: 1, v: 100}} = Middle C, beat 0, 1 beat long, velocity 100

5. **Multi-step execution**
   - If the plan has 14 steps, make 14 tool calls
   - If the plan has 5 steps, make 5 tool calls
   - Continue making tool calls until the entire plan is complete
   - You can make multiple tool calls in a single response

═══════════════════════════════════════════════════════════════════════════════
CRITICAL
═══════════════════════════════════════════════════════════════════════════════

🚨 **EXECUTE THE ENTIRE PLAN IN THIS RESPONSE** - Make ALL tool calls needed
🚨 **DON'T STOP AFTER ONE TOOL CALL** - Continue until all steps are done
🚨 **USE EXACT VALUES FROM PLAN** - Don't improvise or change parameters
🚨 **FOLLOW TOOL CALL ORDER** - create_track THEN create_midi_clip THEN add_effect

Example: If plan has steps 1-14, you should make 14 tool calls in your response.

Execute now."""

    def _build_instruments_list(self) -> str:
        """Build formatted list of available instruments from SYNTHDEF_REGISTRY"""
        # Lazy import to avoid circular dependency
        from backend.services.daw.synthdef_registry import SYNTHDEF_REGISTRY

        categories = {}
        for synth in SYNTHDEF_REGISTRY:
            cat = synth["category"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(f"  • {synth['name']} - {synth['description']}")

        lines = []
        for cat in sorted(categories.keys()):
            lines.append(f"\n{cat.upper()}:")
            lines.extend(sorted(categories[cat]))

        return "\n".join(lines)

    def _build_effects_list(self) -> str:
        """Build formatted list of available effects from EFFECT_DEFINITIONS"""
        # Lazy import to avoid circular dependency
        from backend.services.daw.effect_definitions import EFFECT_DEFINITIONS

        categories = {}
        for name, effect_def in EFFECT_DEFINITIONS.items():
            cat = effect_def.category
            if cat not in categories:
                categories[cat] = []

            # Build parameter list
            params = []
            for param in effect_def.parameters:
                if param.name == "bypass":
                    continue  # Skip bypass parameter in documentation
                param_str = f"{param.name}"
                if param.min is not None and param.max is not None:
                    param_str += f" ({param.min}-{param.max}"
                    if param.unit:
                        param_str += f" {param.unit}"
                    param_str += ")"
                params.append(param_str)

            params_str = ", ".join(params) if params else "no parameters"
            categories[cat].append(f"  • {name} - {effect_def.description}\n    Parameters: {params_str}")

        lines = []
        for cat in sorted(categories.keys()):
            lines.append(f"\n{cat.upper()}:")
            lines.extend(sorted(categories[cat]))

        return "\n".join(lines)

    def _build_system_prompt(self) -> str:
        """Build system prompt for Claude"""
        instruments_list = self._build_instruments_list()
        effects_list = self._build_effects_list()

        return f"""You are an AI music producer integrated into a DAW (Digital Audio Workstation).

IMPORTANT: Each request is ONE-SHOT with fresh DAW state. No conversation history.

Your role:
- Accept VAGUE, CREATIVE commands from users (e.g., "make this more ambient", "add tension", "recompose as jazz")
- Autonomously recompose and transform entire sequences
- Create reversible iterations that users can listen to and approve/reject
- Be creatively intelligent - interpret artistic intent and take over composition
- Suggest musical improvements and variations
- Execute actions immediately to transform the music

Guidelines:
- Each message is INDEPENDENT - you get the current DAW state fresh each time
- Embrace vague commands - use your creativity to interpret them
- Think holistically about the entire composition
- Create complete, musically coherent transformations
- Explain your creative reasoning briefly
- Use musical terminology appropriately
- When creating MIDI, use musically sensible note choices
- Consider the current key, tempo, and style
- Don't ask for clarification - be bold and creative with your interpretation
- EXECUTE ACTIONS to make changes happen

═══════════════════════════════════════════════════════════════════════════════
CRITICAL WORKFLOW RULES - READ THIS CAREFULLY
═══════════════════════════════════════════════════════════════════════════════

🚨 **NEVER CREATE EMPTY TRACKS** 🚨

When you create a track, you MUST IMMEDIATELY follow these steps IN THE SAME RESPONSE:

1. **create_track** - Create the track with name, type, and instrument
2. **create_midi_clip** - Add at least ONE clip with actual musical notes
3. **add_effect** (optional) - Add effects to enhance the sound

A track without clips is COMPLETELY USELESS. It's like ordering a pizza and leaving the box empty.
You MUST add musical content (clips with notes) to every track you create.

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE INSTRUMENTS (use in create_track "instrument" parameter)
═══════════════════════════════════════════════════════════════════════════════
{instruments_list}

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE EFFECTS (use in add_effect "effect_name" parameter)
═══════════════════════════════════════════════════════════════════════════════
{effects_list}

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE TOOLS
═══════════════════════════════════════════════════════════════════════════════

- create_track: Create a new track (MUST be followed by create_midi_clip)
- create_midi_clip: Add MIDI clips with notes to a track
- modify_clip: Change existing clip notes, timing, or properties
- delete_clip: Remove a clip from the sequence
- set_track_parameter: Adjust track volume, pan, mute, solo
- add_effect: Add effects to tracks
- set_tempo: Change global tempo
- play_composition/stop_playback: Control playback

═══════════════════════════════════════════════════════════════════════════════
MIDI NOTE FORMAT (COMPACT)
═══════════════════════════════════════════════════════════════════════════════

{{n: MIDI_NOTE, s: START_TIME, d: DURATION, v: VELOCITY}}

- n: MIDI note number (0-127, middle C = 60)
- s: Start time in beats (relative to clip start)
- d: Duration in beats
- v: Velocity (0-127, default 100)

Example: {{n: 60, s: 0, d: 1, v: 100}} = Middle C, starts at beat 0, lasts 1 beat

Common MIDI notes:
- C4 (middle C) = 60
- D4 = 62
- E4 = 64
- F4 = 65
- G4 = 67
- A4 = 69
- B4 = 71
- C5 = 72

═══════════════════════════════════════════════════════════════════════════════
COMPLETE WORKFLOW EXAMPLES - STUDY THESE CAREFULLY
═══════════════════════════════════════════════════════════════════════════════

Example 1: "Add a kick drum"
──────────────────────────────────────────────────────────────────────────────
Step 1: create_track(name="Kick Drum", type="midi", instrument="kick")
  → Returns: {{track_id: "abc123"}}

Step 2: create_midi_clip(
  track_id="abc123",
  start_time=0,
  duration=4,
  notes=[
    {{n: 36, s: 0, d: 0.5, v: 110}},    # Kick on beat 1
    {{n: 36, s: 2, d: 0.5, v: 110}}     # Kick on beat 3
  ]
)

Step 3: add_effect(track_id="abc123", effect_name="reverb")

Example 2: "Add a subtle beat that blends into the chorus"
──────────────────────────────────────────────────────────────────────────────
Step 1: create_track(name="Percussion", type="midi", instrument="triangle")
  → Returns: {{track_id: "xyz789"}}

Step 2: create_midi_clip(
  track_id="xyz789",
  start_time=0,
  duration=8,
  notes=[
    {{n: 81, s: 0.5, d: 0.25, v: 60}},   # Soft triangle on offbeat
    {{n: 81, s: 1.5, d: 0.25, v: 65}},
    {{n: 81, s: 2.5, d: 0.25, v: 70}},
    {{n: 81, s: 3.5, d: 0.25, v: 75}},
    {{n: 81, s: 4.5, d: 0.25, v: 80}},   # Building intensity
    {{n: 81, s: 5.5, d: 0.25, v: 85}},
    {{n: 81, s: 6.5, d: 0.25, v: 90}},
    {{n: 81, s: 7.5, d: 0.25, v: 95}}
  ]
)

Step 3: add_effect(track_id="xyz789", effect_name="reverb")
Step 4: set_track_parameter(track_id="xyz789", parameter="volume", value=0.6)

Example 3: "Add a bass line in D major"
──────────────────────────────────────────────────────────────────────────────
Step 1: create_track(name="Bass", type="midi", instrument="sine")
  → Returns: {{track_id: "bass001"}}

Step 2: create_midi_clip(
  track_id="bass001",
  start_time=0,
  duration=8,
  notes=[
    {{n: 50, s: 0, d: 1, v: 100}},    # D2
    {{n: 50, s: 1, d: 1, v: 90}},
    {{n: 54, s: 2, d: 1, v: 95}},     # F#2
    {{n: 57, s: 3, d: 1, v: 100}},    # A2
    {{n: 50, s: 4, d: 1, v: 100}},    # D2
    {{n: 50, s: 5, d: 1, v: 90}},
    {{n: 54, s: 6, d: 1, v: 95}},     # F#2
    {{n: 57, s: 7, d: 1, v: 100}}     # A2
  ]
)

Step 3: add_effect(track_id="bass001", effect_name="lpf")

Example 4: "Add a melodic pad"
──────────────────────────────────────────────────────────────────────────────
Step 1: create_track(name="Pad", type="midi", instrument="saw")
  → Returns: {{track_id: "pad001"}}

Step 2: create_midi_clip(
  track_id="pad001",
  start_time=0,
  duration=16,
  notes=[
    {{n: 62, s: 0, d: 4, v: 70}},     # D major chord
    {{n: 66, s: 0, d: 4, v: 70}},
    {{n: 69, s: 0, d: 4, v: 70}},
    {{n: 64, s: 4, d: 4, v: 70}},     # E minor chord
    {{n: 67, s: 4, d: 4, v: 70}},
    {{n: 71, s: 4, d: 4, v: 70}},
    {{n: 65, s: 8, d: 4, v: 70}},     # F# minor chord
    {{n: 69, s: 8, d: 4, v: 70}},
    {{n: 72, s: 8, d: 4, v: 70}},
    {{n: 62, s: 12, d: 4, v: 70}},    # D major chord
    {{n: 66, s: 12, d: 4, v: 70}},
    {{n: 69, s: 12, d: 4, v: 70}}
  ]
)

Step 3: add_effect(track_id="pad001", effect_name="reverb")
Step 4: set_track_parameter(track_id="pad001", parameter="volume", value=0.7)

═══════════════════════════════════════════════════════════════════════════════
REMEMBER
═══════════════════════════════════════════════════════════════════════════════

✅ DO: Create track → Add clip with notes → Add effects (complete workflow)
❌ DON'T: Create track and stop (empty track is useless)

✅ DO: Think about the complete musical gesture
❌ DON'T: Create infrastructure without content

✅ DO: Add actual note data with musically sensible patterns
❌ DON'T: Create clips without notes or with placeholder notes

When modifying sequences:
- You can see ALL tracks, clips, and notes in the context
- Use modify_clip to change existing clips (replaces all notes)
- Use delete_clip + create_midi_clip to restructure
- Create new tracks for new instruments/parts
- Think holistically about the entire composition
- ALWAYS follow through with complete workflows - never leave empty tracks"""

    def _build_context_message(self, state: Optional[DAWStateSnapshot]) -> str:
        """Build COMPLETE MUSICAL CONTEXT - everything AI needs to understand and modify the sequence"""
        if not state or not state.sequence:
            return "Current state: No active sequence"

        parts = []

        # === GLOBAL CONTEXT ===
        parts.append("=== GLOBAL CONTEXT ===")
        parts.append(f"Tempo: {state.tempo} BPM")
        parts.append(f"Time Signature: {state.sequence.time_sig}")
        parts.append(f"Playing: {state.playing} | Position: {state.position:.2f} beats")

        if state.musical:
            parts.append(f"Key: {state.musical.key or 'Unknown'} | Scale: {state.musical.scale or 'Unknown'}")
            parts.append(f"Note Density: {state.musical.note_density:.2f} notes/beat")
            parts.append(f"Pitch Range: {state.musical.pitch_range[0]}-{state.musical.pitch_range[1]} (MIDI)")
            parts.append(f"Complexity: {state.musical.complexity:.0%}")

        if state.audio:
            parts.append(f"Energy: {state.audio.energy:.0%} | Brightness: {state.audio.brightness:.0%} | Loudness: {state.audio.loudness_db:.1f}dB")

        # === TRACKS (with full details for modification) ===
        parts.append(f"\n=== TRACKS ({len(state.sequence.tracks)}) ===")
        for track in state.sequence.tracks:
            parts.append(f"\nTrack: {track.id}")
            parts.append(f"  name: {track.name}")
            parts.append(f"  type: {track.type}")
            parts.append(f"  instrument: {track.instrument or 'N/A'}")
            parts.append(f"  volume: {track.vol:.2f}")
            parts.append(f"  pan: {track.pan:.2f}")
            parts.append(f"  muted: {track.muted} | solo: {track.solo}")

            # Show effects if any
            if hasattr(track, 'effects') and track.effects:
                parts.append(f"  effects: {', '.join([f'{e.name}' for e in track.effects])}")

        # === CLIPS (with complete note data) ===
        parts.append(f"\n=== CLIPS ({len(state.sequence.clips)}) ===")
        for clip in state.sequence.clips:
            parts.append(f"\nClip: {clip.id}")
            parts.append(f"  name: {clip.name}")
            parts.append(f"  track: {clip.track}")
            parts.append(f"  type: {clip.type}")
            parts.append(f"  start: {clip.start} beats | duration: {clip.dur} beats")
            parts.append(f"  muted: {clip.muted}")

            # MIDI notes in compact format
            if clip.type == "midi" and clip.notes:
                parts.append(f"  notes ({len(clip.notes)}):")
                # Group notes by measure for readability
                notes_by_measure = {}
                for note in clip.notes:
                    abs_time = clip.start + note.s
                    measure = int(abs_time // 4)
                    if measure not in notes_by_measure:
                        notes_by_measure[measure] = []
                    notes_by_measure[measure].append({
                        'time': abs_time,
                        'beat': abs_time % 4,
                        'note': note.n,
                        'name': self._note_to_name(note.n),
                        'dur': note.d,
                        'vel': note.v
                    })

                # Show notes grouped by measure
                for measure in sorted(notes_by_measure.keys()):
                    measure_notes = sorted(notes_by_measure[measure], key=lambda x: x['beat'])
                    parts.append(f"    M{measure + 1}: " + ", ".join([
                        f"{n['name']}@{n['beat']:.2f}(d:{n['dur']} v:{n['vel']})"
                        for n in measure_notes
                    ]))

            # SAMPLE ANALYSIS (audio characteristics)
            elif clip.type == "audio" and clip.file:
                # clip.file contains the sample ID or file path
                analysis = self.sample_analyzer.analyze_sample(clip.file)
                if analysis:
                    parts.append(f"  audio_analysis:")
                    parts.append(f"    summary: {analysis.summary}")
                    parts.append(f"    spectral: {analysis.spectral.centroid:.0f}Hz centroid, {analysis.timbre.brightness:.2f} brightness")
                    parts.append(f"    temporal: {analysis.temporal.attack_time:.3f}s attack, {'percussive' if analysis.temporal.is_percussive else 'sustained'}")
                    if analysis.pitch.has_pitch and analysis.pitch.midi_note:
                        note_name = self._note_to_name(analysis.pitch.midi_note)
                        parts.append(f"    pitch: {note_name} ({analysis.pitch.fundamental_freq:.1f}Hz, confidence: {analysis.pitch.pitch_confidence:.0%})")
                    parts.append(f"    timbre_tags: {', '.join(analysis.timbre.tags)}")
                    parts.append(f"    frequency_distribution: sub-bass:{analysis.spectral.sub_bass_energy:.0%} bass:{analysis.spectral.bass_energy:.0%} mid:{analysis.spectral.mid_energy:.0%} high:{analysis.spectral.high_energy:.0%}")

        # === HARMONIC ANALYSIS ===
        parts.append("\n=== HARMONIC ANALYSIS ===")
        harmony_analysis = self._analyze_harmony_over_time(state.sequence)
        parts.append(harmony_analysis)

        # === RHYTHMIC ANALYSIS ===
        parts.append("\n=== RHYTHMIC ANALYSIS ===")
        rhythm_analysis = self._analyze_rhythm_patterns(state.sequence)
        parts.append(rhythm_analysis)

        # === ARRANGEMENT STRUCTURE ===
        parts.append("\n=== ARRANGEMENT ===")
        for track in state.sequence.tracks:
            track_clips = [c for c in state.sequence.clips if c.track == track.id]
            if track_clips:
                clip_timeline = ", ".join([f"{c.name}[{c.start}-{c.start+c.dur}]" for c in sorted(track_clips, key=lambda x: x.start)])
                parts.append(f"{track.name}: {clip_timeline}")

        return "\n".join(parts)

    def _note_to_name(self, midi_note: int) -> str:
        """Convert MIDI note number to name (e.g., 60 -> C4)"""
        note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        octave = (midi_note // 12) - 1
        note = note_names[midi_note % 12]
        return f"{note}{octave}"

    def _analyze_harmony_over_time(self, sequence) -> str:
        """Analyze what notes/chords happen at each time point"""
        from collections import defaultdict

        # Collect all notes at each beat
        notes_at_time = defaultdict(list)

        for clip in sequence.clips:
            if clip.type == "midi" and clip.notes:
                for note in clip.notes:
                    abs_time = clip.start + note.s
                    beat = int(abs_time)
                    notes_at_time[beat].append(note.n)

        if not notes_at_time:
            return "No harmonic content"

        # Analyze each beat
        harmony_parts = []
        for beat in sorted(notes_at_time.keys())[:16]:  # First 16 beats
            notes = sorted(set(notes_at_time[beat]))
            note_names = [self._note_to_name(n) for n in notes]

            # Detect chord if 3+ notes
            if len(notes) >= 3:
                chord = self._detect_chord(notes)
                harmony_parts.append(f"Beat {beat}: {', '.join(note_names)} ({chord})")
            else:
                harmony_parts.append(f"Beat {beat}: {', '.join(note_names)}")

        return "\n".join(harmony_parts)

    def _detect_chord(self, notes: list[int]) -> str:
        """Simple chord detection from MIDI notes"""
        if len(notes) < 3:
            return "melody"

        # Get intervals from root
        root = notes[0]
        intervals = tuple(sorted(set((n - root) % 12 for n in notes)))

        # Common chord patterns
        chord_types = {
            (0, 4, 7): "major",
            (0, 3, 7): "minor",
            (0, 4, 7, 11): "maj7",
            (0, 3, 7, 10): "min7",
            (0, 4, 7, 10): "dom7",
        }

        chord_type = chord_types.get(intervals, "unknown")
        return f"{self._note_to_name(root)} {chord_type}"

    def _analyze_rhythm_patterns(self, sequence) -> str:
        """Analyze rhythmic patterns and groove"""
        from collections import Counter

        # Collect all note timings
        timings = []
        durations = []

        for clip in sequence.clips:
            if clip.type == "midi" and clip.notes:
                for note in clip.notes:
                    abs_time = clip.start + note.s
                    timings.append(abs_time % 4)  # Position within 4-beat measure
                    durations.append(note.d)

        if not timings:
            return "No rhythmic content"

        # Analyze timing distribution
        timing_counts = Counter([round(t * 4) / 4 for t in timings])  # Quantize to 16th notes
        common_timings = timing_counts.most_common(5)

        # Analyze duration distribution
        duration_counts = Counter([round(d * 4) / 4 for d in durations])
        common_durations = duration_counts.most_common(3)

        parts = []
        parts.append(f"Common timings: {', '.join([f'{t:.2f}({c}x)' for t, c in common_timings])}")
        parts.append(f"Common durations: {', '.join([f'{d:.2f}({c}x)' for d, c in common_durations])}")

        # Detect syncopation
        on_beat = sum(1 for t in timings if t % 1.0 < 0.1)
        off_beat = len(timings) - on_beat
        if off_beat > on_beat:
            parts.append("Syncopated groove (more off-beat notes)")
        else:
            parts.append("On-beat groove (mostly on beats)")

        return "\n".join(parts)

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
                "description": "Create a new MIDI clip with notes on a track. This is how you add actual musical content to a track. You MUST call this immediately after create_track. The 'notes' array contains the actual musical pattern - don't leave it empty!",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID (UUID) to add clip to. MUST use the track_id returned from create_track, NOT the track name. Example: '17c79f6d-7507-4d40-baec-4fe84c3cf165'"},
                        "start_time": {"type": "number", "description": "Start time in beats (0 = beginning of sequence)"},
                        "duration": {"type": "number", "description": "Clip duration in beats (e.g., 4 for 4 bars, 8 for 8 bars)"},
                        "notes": {
                            "type": "array",
                            "description": "Array of MIDI notes in compact format: [{n: MIDI_NOTE, s: START_BEAT, d: DURATION, v: VELOCITY}, ...]. Example: [{n: 60, s: 0, d: 1, v: 100}, {n: 64, s: 1, d: 1, v: 100}] creates two notes. MUST contain at least one note!",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "n": {"type": "integer", "description": "MIDI note number (0-127). Middle C = 60, D = 62, E = 64, F = 65, G = 67, A = 69, B = 71, C5 = 72. Kick drum = 36."},
                                    "s": {"type": "number", "description": "Start time in beats RELATIVE to clip start (0 = clip start, 1 = one beat in, etc.)"},
                                    "d": {"type": "number", "description": "Note duration in beats (0.25 = sixteenth note, 0.5 = eighth note, 1 = quarter note, 2 = half note, 4 = whole note)"},
                                    "v": {"type": "integer", "description": "Velocity/volume (0-127, default 100). Higher = louder."}
                                },
                                "required": ["n", "s", "d"]
                            }
                        },
                        "name": {"type": "string", "description": "Clip name (optional, e.g., 'Kick Pattern', 'Bass Line')"}
                    },
                    "required": ["track_id", "start_time", "duration", "notes"]
                }
            },
            {
                "name": "modify_clip",
                "description": "Modify an existing clip (change notes, timing, or properties)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID to modify"},
                        "notes": {
                            "type": "array",
                            "description": "New notes array (replaces all notes): [{n: 60, s: 0, d: 1, v: 100}, ...]",
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
                        "start_time": {"type": "number", "description": "New start time in beats (optional)"},
                        "duration": {"type": "number", "description": "New duration in beats (optional)"},
                        "muted": {"type": "boolean", "description": "Mute state (optional)"}
                    },
                    "required": ["clip_id"]
                }
            },
            {
                "name": "delete_clip",
                "description": "Delete a clip from the sequence",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID to delete"}
                    },
                    "required": ["clip_id"]
                }
            },
            {
                "name": "create_track",
                "description": "Create a new track. WARNING: You MUST immediately follow this with create_midi_clip to add musical content. A track without clips is useless. Complete workflow: 1) create_track, 2) create_midi_clip with notes, 3) optionally add_effect.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Track name (e.g., 'Kick Drum', 'Bass', 'Pad')"},
                        "type": {"type": "string", "enum": ["midi", "audio"], "description": "Track type - use 'midi' for synthesized instruments"},
                        "instrument": {"type": "string", "description": "Instrument/synth name for MIDI tracks. Available: sine, saw, square, triangle, kick, snare, hihat. REQUIRED for MIDI tracks to produce sound."}
                    },
                    "required": ["name", "type", "instrument"]
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
                        "track_id": {"type": "string", "description": "Track ID (UUID). MUST use the track_id returned from create_track, NOT the track name."},
                        "parameter": {"type": "string", "enum": ["volume", "pan", "mute", "solo"]},
                        "value": {"description": "Parameter value (number for volume/pan, boolean for mute/solo)"}
                    },
                    "required": ["track_id", "parameter", "value"]
                }
            },
            {
                "name": "add_effect",
                "description": "Add an audio effect to a track to enhance the sound. Use this as the final step after creating a track and adding clips. Common effects: reverb (space/ambience), delay (echo), lpf (low-pass filter, removes highs), hpf (high-pass filter, removes lows), distortion (grit/saturation).",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID (UUID) to add effect to. MUST use the track_id returned from create_track, NOT the track name."},
                        "effect_name": {"type": "string", "description": "Effect type. Available: reverb, delay, lpf, hpf, distortion, chorus, flanger, phaser. Choose based on desired sound: reverb for space, delay for echo, lpf for warmth, hpf for clarity, distortion for grit."},
                        "slot_index": {"type": "integer", "description": "Effect slot index (optional, auto-assigns if not specified)"}
                    },
                    "required": ["track_id", "effect_name"]
                }
            },
            {
                "name": "play_composition",
                "description": "Start playback",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "composition_id": {"type": "string", "description": "Composition ID (optional, uses current)"}
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
            },
            # Extended Clip Operations
            {
                "name": "duplicate_clip",
                "description": "Duplicate a clip to create a copy. Useful for repeating patterns or creating variations.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID to duplicate"},
                        "start_time": {"type": "number", "description": "Start time for the duplicate in beats (optional, defaults to after original clip)"}
                    },
                    "required": ["clip_id"]
                }
            },
            {
                "name": "move_clip",
                "description": "Move a clip to a different track or time position",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID to move"},
                        "track_id": {"type": "string", "description": "New track ID (optional)"},
                        "start_time": {"type": "number", "description": "New start time in beats (optional)"}
                    },
                    "required": ["clip_id"]
                }
            },
            {
                "name": "split_clip",
                "description": "Split a clip into two clips at a specific time point",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID to split"},
                        "split_time": {"type": "number", "description": "Time to split at in beats (relative to clip start)"}
                    },
                    "required": ["clip_id", "split_time"]
                }
            },
            {
                "name": "set_clip_gain",
                "description": "Set the gain/volume of a specific clip",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "clip_id": {"type": "string", "description": "Clip ID"},
                        "gain": {"type": "number", "description": "Gain multiplier (0.0-2.0, 1.0 = unity)"}
                    },
                    "required": ["clip_id", "gain"]
                }
            },
            # Extended Track Operations
            {
                "name": "delete_track",
                "description": "Delete a track and all its clips",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID to delete"}
                    },
                    "required": ["track_id"]
                }
            },
            {
                "name": "rename_track",
                "description": "Rename a track",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID to rename"},
                        "name": {"type": "string", "description": "New track name"}
                    },
                    "required": ["track_id", "name"]
                }
            },
            {
                "name": "change_track_instrument",
                "description": "Change the instrument/synth of a MIDI track",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID"},
                        "instrument": {"type": "string", "description": "New instrument name (e.g., sine, saw, square, kick, snare, hihat)"}
                    },
                    "required": ["track_id", "instrument"]
                }
            },
            {
                "name": "reorder_tracks",
                "description": "Reorder tracks in the composition",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_order": {
                            "type": "array",
                            "description": "Array of track IDs in desired order",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["track_order"]
                }
            },
            # Extended Effect Operations
            {
                "name": "remove_effect",
                "description": "Remove an effect from a track",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "effect_id": {"type": "string", "description": "Effect ID to remove"}
                    },
                    "required": ["effect_id"]
                }
            },
            {
                "name": "bypass_effect",
                "description": "Bypass or unbypass an effect (turn it on/off without removing it)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "effect_id": {"type": "string", "description": "Effect ID"},
                        "bypassed": {"type": "boolean", "description": "True to bypass (turn off), false to unbypass (turn on)"}
                    },
                    "required": ["effect_id", "bypassed"]
                }
            },
            {
                "name": "reorder_effects",
                "description": "Reorder effects in a track's effect chain. Effect order matters - effects process audio sequentially.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "track_id": {"type": "string", "description": "Track ID"},
                        "effect_order": {
                            "type": "array",
                            "description": "Array of effect IDs in desired order",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["track_id", "effect_order"]
                }
            },
            # Extended Composition Operations
            {
                "name": "set_time_signature",
                "description": "Set the time signature of the composition",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "time_signature": {"type": "string", "description": "Time signature (e.g., '4/4', '3/4', '6/8')"}
                    },
                    "required": ["time_signature"]
                }
            },
            {
                "name": "set_loop_points",
                "description": "Set loop start and end points for playback",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "loop_start": {"type": "number", "description": "Loop start position in beats"},
                        "loop_end": {"type": "number", "description": "Loop end position in beats"},
                        "loop_enabled": {"type": "boolean", "description": "Enable/disable looping (optional)"}
                    },
                    "required": ["loop_start", "loop_end"]
                }
            },
            {
                "name": "seek_to_position",
                "description": "Move the playhead to a specific position",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "position": {"type": "number", "description": "Position in beats"}
                    },
                    "required": ["position"]
                }
            },
            {
                "name": "rename_composition",
                "description": "Rename the composition",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "New composition name"}
                    },
                    "required": ["name"]
                }
            }
        ]

