"""
AI Agent Service - LLM-powered DAW control with efficient token usage

Performance optimizations:
- Event-driven triggering (not continuous polling)
- State diffs instead of full snapshots
- Compact prompts with structured output
- Caching of LLM responses
- Rate limiting to prevent token waste

Validation:
- Tool definitions dynamically generated from SYNTHDEF_REGISTRY
- Ensures AI can only select valid instruments (no hallucination)
"""
import logging
import re
import time
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path
import anthropic

from backend.models.daw_state import DAWStateSnapshot
from backend.models.ai_actions import DAWAction, ActionResult
from backend.models.composition import ChatMessage
from backend.services.ai.state_collector_service import DAWStateService
from backend.services.ai.action_executor_service import DAWActionService
from backend.services.perception.sample_analysis import SampleAnalyzer
from backend.services.perception.musical_perception import MusicalPerceptionAnalyzer
from backend.services.perception.composition_perception import CompositionPerceptionAnalyzer
from backend.models.instrument_types import get_valid_instruments_list
from backend.services.ai.tools.compose_tool import ComposeTool, COMPOSE_MUSIC_TOOL_SCHEMA, EDIT_CLIP_TOOL_SCHEMA
from backend.services.ai.routing import IntentRouter, Intent
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.services.daw.composition_service import CompositionService

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
        samples_dir: Optional[Path] = None,
        musical_perception_analyzer: Optional[MusicalPerceptionAnalyzer] = None,
        composition_perception_analyzer: Optional[CompositionPerceptionAnalyzer] = None,
        ws_manager=None,  # Optional[WebSocketManager] — avoid circular import via type hint
    ):
        self.state_service = state_service
        self.action_service = action_service
        self.composition_service = composition_service
        self.client = anthropic.AsyncAnthropic(api_key=api_key) if api_key else None
        self.model = model
        self.ws_manager = ws_manager  # For real-time pipeline events

        # Primary composition tool
        self.compose_tool = ComposeTool(action_service)

        # Intent router (LLM-based classification)
        self.router = IntentRouter(api_key=api_key)

        # Sample analyzer for audio understanding
        self.sample_analyzer = SampleAnalyzer(samples_dir=samples_dir)

        # Perception analyzers (Layer 2 & 3)
        self.musical_perception = musical_perception_analyzer or MusicalPerceptionAnalyzer()
        self.composition_perception = composition_perception_analyzer or CompositionPerceptionAnalyzer()

        # Track last state hash for efficient diffs (optional optimization)
        self.last_state_hash: Optional[str] = None

        # Chat history tracking (per composition)
        self.chat_histories: Dict[str, List[ChatMessage]] = {}

    async def _emit_pipeline(
        self,
        request_id: str,
        stage: str,
        status: str,
        detail: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Emit a real-time AI pipeline stage event via WebSocket (fire-and-forget)."""
        if not self.ws_manager:
            return
        try:
            await self.ws_manager.broadcast_ai_pipeline({
                "type":       "ai_pipeline",
                "request_id": request_id,
                "stage":      stage,
                "status":     status,
                "ts":         time.time(),
                "detail":     detail or {},
            })
        except Exception as e:
            logger.debug(f"Pipeline event broadcast failed (non-fatal): {e}")
    
    # Model identifiers for the execution_model shorthand values
    _EXECUTION_MODEL_MAP: Dict[str, str] = {
        "haiku":  "claude-haiku-4-5-20251001",
        "sonnet": "claude-sonnet-4-5-20250929",
        "opus":   "claude-opus-4-6",
    }

    # System-prompt appendix for each response style
    _RESPONSE_STYLE_APPENDIX: Dict[str, str] = {
        "concise":  "\n\nIMPORTANT: Keep responses very brief — 1-2 sentences maximum. Skip explanations. Just do it and confirm concisely.",
        "detailed": "\n\nIMPORTANT: Provide detailed explanations of every decision. Describe what you changed, why you made each choice, and the musical reasoning behind it.",
    }

    async def send_message(
        self,
        user_message: str,
        *,
        execution_model: Optional[str] = None,
        temperature: Optional[float] = None,
        response_style: str = "balanced",
        history_length: int = 6,
        use_intent_routing: bool = True,
        include_harmonic_context: bool = True,
        include_rhythmic_context: bool = True,
        include_timbre_context: bool = True,
    ) -> Dict[str, Any]:
        """
        ROUTED WORKFLOW-BASED EXECUTION (Anthropic Best Practices)

        1. Route request to intent category (unless use_intent_routing=False)
        2. Load only relevant tools for that intent
        3. Use specialized prompt for that intent
        4. Single LLM call with focused context

        This prevents tool bloat and prompt bloat while handling all use cases.

        Args:
            user_message: User's message/request
            execution_model: "haiku" | "sonnet" | "opus" shorthand, or None to use default
            temperature: Creativity 0.0–1.0 (None = Anthropic default)
            response_style: "concise" | "balanced" | "detailed" — modifies system prompt
            history_length: How many recent messages to include as context (2–20)
            use_intent_routing: If False skip routing and load all tools
            include_harmonic_context: Include chord/key/scale section in context
            include_rhythmic_context: Include rhythmic analysis section in context
            include_timbre_context: Include audio energy/brightness section in context

        Returns:
            Dict with 'response', 'actions_executed', 'musical_context', 'routing_intent'
        """
        # Unique ID for correlating pipeline events for this request
        request_id = f"req-{int(time.time() * 1000)}"

        # Resolve which model to use for this request
        effective_model = (
            self._EXECUTION_MODEL_MAP.get(execution_model, self.model)
            if execution_model else self.model
        )

        # STAGE: context — build DAW state snapshot
        await self._emit_pipeline(request_id, "context", "start")

        # FIX 1: Force-refresh key/scale analysis before building context so state.musical is never stale
        self.state_service.analyze_current_sequence()

        # Get current state
        state_response = self.state_service.get_state(previous_hash=self.last_state_hash)
        context_message = self._build_context_message(
            state_response.full_state,
            include_harmonic=include_harmonic_context,
            include_rhythmic=include_rhythmic_context,
            include_timbre=include_timbre_context,
        )

        # Emit context complete with a brief snapshot
        _state = state_response.full_state
        await self._emit_pipeline(request_id, "context", "complete", {
            "track_count": len(_state.sequence.tracks) if _state and _state.sequence else 0,
            "clip_count":  len(_state.sequence.clips) if _state and _state.sequence else 0,
            "tempo":       _state.sequence.tempo if _state and _state.sequence else None,
            "key":         f"{_state.musical.key} {_state.musical.scale}" if _state and _state.musical else None,
        })

        # ====================================================================
        # STEP 1: ROUTE REQUEST TO INTENT (LLM-based, or bypass)
        # ====================================================================
        instruments_catalog = self._build_instruments_catalog()
        effects_list = self._build_effects_list()
        kit_catalog = self._build_kit_catalog()
        genre_summary = self._build_genre_profiles_summary()
        all_tools = self._get_tool_definitions()
        intent = None

        if use_intent_routing:
            await self._emit_pipeline(request_id, "routing", "start", {"model": "haiku"})
            state_summary = self._build_brief_state_summary(state_response.full_state)
            intent = await self.router.route(user_message, daw_state_summary=state_summary)
            logger.info(f"🔀 Intent: {intent.value}")

            # ================================================================
            # STEP 2: GET FOCUSED TOOLS AND PROMPT FOR INTENT
            # ================================================================
            relevant_tool_names = self.router.get_tools_for_intent(intent)
            system_prompt = self.router.get_system_prompt_for_intent(
                intent, instruments_catalog, effects_list, kit_catalog, genre_summary
            )

            if relevant_tool_names:
                tools = [t for t in all_tools if t["name"] in relevant_tool_names]
                logger.info(f"🛠️  Using {len(tools)}/{len(all_tools)} tools for {intent.value}")
            else:
                tools = []
                logger.info(f"🛠️  No tools needed for {intent.value}")

            await self._emit_pipeline(request_id, "routing", "complete", {
                "intent": intent.value,
                "tools_loaded": len(tools),
                "model": "haiku",
            })
        else:
            # No routing — load all tools, use the general-purpose prompt
            tools = all_tools
            system_prompt = self.router.get_system_prompt_for_intent(
                Intent.GENERAL_CHAT, instruments_catalog, effects_list, kit_catalog, genre_summary
            )
            logger.info(f"🛠️  Routing bypassed — using all {len(tools)} tools")
            await self._emit_pipeline(request_id, "routing", "skipped", {"tools_loaded": len(tools)})

        # Apply response-style modifier (concise / detailed) to system prompt
        if response_style in self._RESPONSE_STYLE_APPENDIX:
            system_prompt += self._RESPONSE_STYLE_APPENDIX[response_style]

        # ====================================================================
        # STEP 3: SINGLE LLM CALL WITH FOCUSED CONTEXT
        # ====================================================================
        logger.info(f"🎯 Processing request: '{user_message}'")

        actions_executed = []
        assistant_message = ""

        # FIX 2: Include conversation history so AI has context from prior exchanges
        _tempo = state_response.full_state.tempo if state_response.full_state else 120.0
        messages = self._build_messages_with_history(user_message, context_message, history_length=history_length, tempo=_tempo)

        logger.info(f"🤖 Calling {effective_model} with {len(tools)} tools, {len(messages)} messages in context...")
        await self._emit_pipeline(request_id, "execution", "start", {
            "model": effective_model,
            "tool_count": len(tools),
            "history_messages": len(messages),
        })

        create_kwargs: Dict[str, Any] = dict(
            model=effective_model,
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=tools if tools else None,
        )
        if temperature is not None:
            create_kwargs["temperature"] = temperature

        response = await self.client.messages.create(**create_kwargs)

        tool_call_count = sum(1 for b in response.content if b.type == "tool_use")
        await self._emit_pipeline(request_id, "execution", "complete", {
            "model": effective_model,
            "tool_calls": tool_call_count,
            "stop_reason": response.stop_reason,
        })

        # Process response blocks, collecting tool calls and results
        tool_results = []
        _tool_action_results: list = []
        if tool_call_count > 0:
            await self._emit_pipeline(request_id, "tools", "start", {"total": tool_call_count})

        for block in response.content:
            if block.type == "text":
                assistant_message += block.text
            elif block.type == "tool_use":
                logger.info(f"🎯 AI calling tool: {block.name} with params: {block.input}")

                # Dispatch tool calls
                result = await self._dispatch_tool(block.name, block.input)

                actions_executed.append(result)
                _tool_action_results.append({"name": block.name, "success": result.success})

                result_content = f"Success: {result.message}" if result.success else f"Error: {result.error}"
                if result.data:
                    result_content += f"\nData: {result.data}"

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_content
                })

        if tool_call_count > 0:
            await self._emit_pipeline(request_id, "tools", "complete", {
                "actions": _tool_action_results,
                "succeeded": sum(1 for a in _tool_action_results if a["success"]),
                "total": tool_call_count,
            })

        # FIX 3: Send tool results back to LLM so it can respond to outcomes and recover from errors
        if tool_results:
            # Serialize assistant content blocks (tool_use objects → dicts for API)
            assistant_content = []
            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })

            # Minimal context for follow-up — just the original request + tool exchange.
            # Do NOT resend full DAW state or history; this is purely a summary call.
            follow_up_messages = [
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_content},
                {"role": "user", "content": tool_results}
            ]

            logger.info(f"🔄 Sending {len(tool_results)} tool result(s) back to LLM...")
            await self._emit_pipeline(request_id, "summary", "start", {
                "model": "haiku",
                "tool_results": len(tool_results),
            })
            follow_up = await self.client.messages.create(
                model="claude-haiku-4-5-20251001",  # Haiku — fast/cheap for summarizing results
                max_tokens=512,
                system=system_prompt,
                messages=follow_up_messages
            )

            for block in follow_up.content:
                if block.type == "text":
                    assistant_message += block.text

            await self._emit_pipeline(request_id, "summary", "complete", {"model": "haiku"})

        logger.info(f"✅ Execution complete: {len(actions_executed)} actions")

        # Log execution summary
        if actions_executed:
            action_summary = {}
            for action in actions_executed:
                action_type = action.action
                action_summary[action_type] = action_summary.get(action_type, 0) + 1
            logger.info(f"📊 Action summary: {action_summary}")
        else:
            logger.warning(f"⚠️ No actions were executed!")

        # Build response
        full_response = assistant_message if assistant_message else f"Executed {len(actions_executed)} actions successfully."

        # Auto-save composition as iteration if actions were executed
        if actions_executed and len(actions_executed) > 0:
            await self._save_ai_iteration(user_message, full_response, actions_executed)

        # Update state hash
        if state_response.full_state:
            self.last_state_hash = state_response.full_state.state_hash

        # Store actions count for API response
        self.last_actions_executed = len(actions_executed)

        await self._emit_pipeline(request_id, "response", "complete", {
            "actions": len(actions_executed),
            "has_tools": tool_call_count > 0,
        })

        return {
            "response": full_response,
            "actions_executed": actions_executed,
            "musical_context": context_message,
            "routing_intent": intent.value if intent else None,
        }

    async def send_contextual_message(
        self,
        message: str,
        entity_type: str,
        entity_id: str,
        composition_id: str,
        additional_context: Optional[Dict[str, Any]] = None,
        *,
        execution_model: Optional[str] = None,
        temperature: Optional[float] = None,
        response_style: str = "balanced",
    ) -> Dict[str, Any]:
        """
        Send contextual message scoped to a specific entity.

        Used for inline AI editing (right-click on track/clip/effect → natural language request).
        Uses the same routing system as send_message() for consistency and token efficiency.

        Entity context is appended to the user message; the system prompt comes from
        the intent router so Claude gets appropriate musical guidance for the request type.

        Args:
            message:           User's natural language request
            entity_type:       "track" | "clip" | "effect" | "mixer_channel" | "composition"
            entity_id:         ID of the specific entity being edited
            composition_id:    ID of the active composition
            additional_context: Reserved for future use
            execution_model:   "haiku" | "sonnet" | "opus" shorthand, or None for default
            temperature:       Creativity 0.0–1.0 (None = Anthropic default)
            response_style:    "concise" | "balanced" | "detailed"

        Returns:
            Dict with 'response', 'actions_executed', 'affected_entities',
            'routing_intent', 'musical_context'
        """
        from backend.services.ai.context_builder_service import ContextBuilderService

        if not self.client:
            return {"response": "AI not configured", "actions_executed": [], "affected_entities": []}

        effective_model = (
            self._EXECUTION_MODEL_MAP.get(execution_model, self.model)
            if execution_model else self.model
        )

        # ── Build entity-specific context ─────────────────────────────────────
        context_builder = ContextBuilderService(
            composition_state_service=self.action_service.composition_state,
            mixer_service=self.action_service.mixer,
            effects_service=self.action_service.track_effects
        )

        if entity_type == "track":
            entity_context = context_builder.build_track_context(composition_id, entity_id)
        elif entity_type == "clip":
            entity_context = context_builder.build_clip_context(composition_id, entity_id)
        elif entity_type == "effect":
            entity_context = context_builder.build_effect_context(composition_id, entity_id)
        elif entity_type == "mixer_channel":
            entity_context = context_builder.build_mixer_channel_context(composition_id, entity_id)
        elif entity_type == "composition":
            entity_context = context_builder.build_composition_context(composition_id)
        else:
            raise ValueError(f"Unknown entity type: {entity_type}")

        # ── Route intent ───────────────────────────────────────────────────────
        state = await self.state_service.get_current_state()
        daw_summary = self._build_brief_state_summary(state) if state else None
        intent = await self.router.route(message, daw_summary)

        # ── Resolve focused tool set ───────────────────────────────────────────
        tool_names = self.router.get_tools_for_intent(intent)
        all_tools = self._get_tool_definitions()
        tools = [t for t in all_tools if t.get("name") in tool_names] if tool_names else all_tools

        # ── Intent-specific system prompt ──────────────────────────────────────
        system_prompt = self.router.get_system_prompt_for_intent(
            intent=intent,
            instruments_catalog=self._build_instruments_catalog(),
            effects_list=self._build_effects_list(),
            kit_catalog=self._build_kit_catalog(),
            genre_profiles_summary=self._build_genre_profiles_summary(),
        )
        if response_style in self._RESPONSE_STYLE_APPENDIX:
            system_prompt += self._RESPONSE_STYLE_APPENDIX[response_style]

        # ── User message with entity context ──────────────────────────────────
        entity_context_str = self._format_entity_context(entity_type, entity_id, entity_context)
        user_content = f"{message}\n\n{entity_context_str}"

        logger.info(f"🎯 Contextual AI [{intent.value}] for {entity_type} {entity_id}: '{message}'")

        # ── Single LLM call ────────────────────────────────────────────────────
        create_kwargs: Dict[str, Any] = {
            "model": effective_model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_content}],
            "tools": tools,
        }
        if temperature is not None:
            create_kwargs["temperature"] = temperature

        response = await self.client.messages.create(**create_kwargs)

        # ── Process response ───────────────────────────────────────────────────
        actions_executed = []
        affected_entities = []
        assistant_message = ""
        tool_results = []

        for block in response.content:
            if block.type == "text":
                assistant_message += block.text
            elif block.type == "tool_use":
                logger.info(f"   🔧 Tool call: {block.name}")
                result = await self._dispatch_tool(block.name, block.input)
                actions_executed.append(result)
                if result.success and result.data:
                    if "track_id" in result.data:
                        affected_entities.append({"type": "track", "id": result.data["track_id"]})
                    if "clip_id" in result.data:
                        affected_entities.append({"type": "clip", "id": result.data["clip_id"]})
                result_content = f"Success: {result.message}" if result.success else f"Error: {result.error}"
                if result.data:
                    result_content += f"\nData: {result.data}"
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_content
                })

        # Send tool results back to LLM so it can acknowledge outcomes
        if tool_results:
            assistant_content = []
            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })

            follow_up_messages = [
                {"role": "user", "content": user_content},
                {"role": "assistant", "content": assistant_content},
                {"role": "user", "content": tool_results}
            ]

            logger.info(f"🔄 Sending {len(tool_results)} tool result(s) back to LLM...")
            follow_up = await self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=system_prompt,
                messages=follow_up_messages
            )
            for block in follow_up.content:
                if block.type == "text":
                    assistant_message += block.text

        logger.info(f"✅ Contextual complete: {len(actions_executed)} action(s), intent={intent.value}")

        return {
            "response": assistant_message or f"✅ Modified {entity_type}",
            "actions_executed": actions_executed,
            "affected_entities": affected_entities,
            "routing_intent": intent.value,
            "musical_context": str(entity_context),
        }

    def _extract_affected_entity(self, action: DAWAction, result: ActionResult) -> Optional[Dict[str, str]]:
        """Extract affected entity from action result for highlighting"""
        if not result.data:
            return None

        # Map action types to entity types
        if action.action == "create_track":
            return {"type": "track", "id": result.data.get("track_id")}
        elif action.action in ["create_midi_clip", "modify_clip"]:
            return {"type": "clip", "id": result.data.get("clip_id")}
        elif action.action == "add_effect":
            return {"type": "effect", "id": result.data.get("effect_id")}
        elif action.action == "set_track_parameter":
            return {"type": "track", "id": action.parameters.get("track_id")}

        return None

    async def _save_ai_iteration(self, user_message: str, assistant_response: str, actions_executed: List[ActionResult]) -> None:
        """Save composition as AI iteration after actions are executed"""
        try:
            # Check if we have all required services
            if not all([self.composition_service, self.action_service.composition_state,
                        self.action_service.mixer, self.action_service.track_effects]):
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
            self.chat_histories[composition_id].append(ChatMessage(
                role="user",
                content=user_message,
                timestamp=datetime.now(),
                actions_executed=None,
            ))

            # Add assistant response to chat history
            self.chat_histories[composition_id].append(ChatMessage(
                role="assistant",
                content=assistant_response,
                timestamp=datetime.now(),
                actions_executed=[
                    {
                        "action": result.action,
                        "success": result.success,
                        "data": result.data,
                        "error": result.error,
                    }
                    for result in actions_executed
                ],
            ))

            # Capture current composition state from services
            captured_composition = self.composition_service.capture_composition_from_services(
                composition_state_service=self.action_service.composition_state,
                mixer_service=self.action_service.mixer,
                effects_service=self.action_service.track_effects,
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

    def _format_entity_context(
        self,
        entity_type: str,
        entity_id: str,
        entity_context: Dict[str, Any],
    ) -> str:
        """
        Format entity-specific state for injection into the user message.

        The system prompt comes from the intent router; this just adds the
        concrete entity data so Claude knows exactly what it's editing.
        """
        import json

        scope_hint = {
            "track": (
                "Scope: modify this track's clips, parameters (volume/pan/mute/solo), "
                "effects, or instrument. Stay focused on this track unless asked otherwise."
            ),
            "clip": (
                "Scope: modify this clip's MIDI notes (use note names: C4, F#3, Bb2), "
                "timing, or gain. Never use raw MIDI numbers."
            ),
            "effect": (
                "Scope: adjust this effect's parameters, bypass state, or chain position."
            ),
            "mixer_channel": (
                "Scope: adjust fader level, pan, mute, or solo for this channel."
            ),
            "composition": (
                "Scope: global changes — tempo, arrangement, track structure."
            ),
        }.get(entity_type, f"Scope: modify this {entity_type}.")

        context_str = json.dumps(entity_context, indent=2)

        return (
            f"[Contextual edit — {entity_type.upper()} {entity_id}]\n"
            f"{scope_hint}\n\n"
            f"Current {entity_type} state:\n{context_str}"
        )



    async def _dispatch_tool(self, tool_name: str, tool_input: dict):
        """
        Central tool dispatch. Routes tool calls to the correct handler.
        All new musical tools go through this method.
        """
        if tool_name == "compose_music":
            return await self.compose_tool.execute(tool_input)

        elif tool_name == "edit_clip":
            return await self._handle_edit_clip(tool_input)

        else:
            # Standard DAW actions
            action = DAWAction(action=tool_name, parameters=tool_input)
            return await self.action_service.execute_action(action)

    async def _handle_edit_clip(self, params: dict):
        """
        Handle the edit_clip tool — supports add/replace/remove modes
        and accepts note names in addition to raw MIDI dicts.
        """
        from backend.models.ai_actions import ActionResult

        clip_id = params.get("clip_id")
        mode = params.get("mode", "replace")
        raw_notes = params.get("notes", [])
        transpose = params.get("transpose_semitones", 0)
        vel_scale = params.get("velocity_scale", 1.0)

        # Convert notes — accept both {pitch, beat, dur, vel} and {n, s, d, v}
        from backend.services.music.theory import note_name_to_midi

        def normalize_note(note: dict) -> dict:
            if "pitch" in note:
                try:
                    midi = note_name_to_midi(note["pitch"])
                except ValueError:
                    return None
                return {
                    "n": midi + int(transpose),
                    "s": float(note.get("beat", note.get("s", 0))),
                    "d": float(note.get("dur", note.get("d", 0.5))),
                    "v": min(127, max(0, int(note.get("vel", note.get("v", 100)) * vel_scale))),
                }
            else:
                n = note.get("n")
                if n is None:
                    return None
                return {
                    "n": int(n) + int(transpose),
                    "s": float(note.get("s", 0)),
                    "d": float(note.get("d", 0.5)),
                    "v": min(127, max(0, int(note.get("v", 100) * vel_scale))),
                }

        converted = [n for n in (normalize_note(r) for r in raw_notes) if n is not None]

        if mode == "add":
            # Get existing notes and merge
            comp_id = self.action_service.composition_state.current_composition_id
            composition = self.action_service.composition_state.get_composition(comp_id)
            existing = []
            if composition:
                for clip in composition.clips:
                    if clip.id == clip_id and clip.midi_events:
                        existing = [
                            {"n": e.note, "s": e.start_time, "d": e.duration, "v": e.velocity}
                            for e in clip.midi_events
                        ]
                        break
            merged = existing + converted
            action = DAWAction(action="modify_clip", parameters={"clip_id": clip_id, "notes": merged})
        elif mode == "remove":
            # Remove matching notes by pitch+beat proximity
            comp_id = self.action_service.composition_state.current_composition_id
            composition = self.action_service.composition_state.get_composition(comp_id)
            remaining = []
            if composition:
                for clip in composition.clips:
                    if clip.id == clip_id and clip.midi_events:
                        remove_set = {(n["n"], round(n["s"], 3)) for n in converted}
                        remaining = [
                            {"n": e.note, "s": e.start_time, "d": e.duration, "v": e.velocity}
                            for e in clip.midi_events
                            if (e.note, round(e.start_time, 3)) not in remove_set
                        ]
                        break
            action = DAWAction(action="modify_clip", parameters={"clip_id": clip_id, "notes": remaining})
        else:
            # replace (default)
            action = DAWAction(action="modify_clip", parameters={"clip_id": clip_id, "notes": converted})

        return await self.action_service.execute_action(action)

    def _build_instruments_catalog(self) -> str:
        """
        Build a role-grouped, compact instrument catalog for AI prompts.
        Groups by musical role rather than dumping all 195+ instruments.
        """
        from backend.services.daw.registry import SYNTHDEF_REGISTRY

        # Role groupings — what an AI producer thinks about
        role_groups = {
            "SYNTHS & LEADS": [],
            "BASS SYNTHS": [],
            "PADS & TEXTURES": [],
            "KEYS & MALLETS": [],
            "GM PIANO & KEYS": [],
            "GM STRINGS & ENSEMBLE": [],
            "GM BRASS & WINDS": [],
            "GM GUITAR & PLUCKED": [],
            "SPECIAL / WAVEFORMS": [],
        }

        category_to_role = {
            "Lead":   "SYNTHS & LEADS",
            "Synth":  "SYNTHS & LEADS",
            "Bass":   "BASS SYNTHS",
            "Pad":    "PADS & TEXTURES",
            "Keys":   "KEYS & MALLETS",
            "Piano":  "GM PIANO & KEYS",
            "Chromatic Percussion": "KEYS & MALLETS",
            "Organ":  "GM PIANO & KEYS",
            "Strings": "GM STRINGS & ENSEMBLE",
            "Ensemble": "GM STRINGS & ENSEMBLE",
            "Brass":  "GM BRASS & WINDS",
            "Reed":   "GM BRASS & WINDS",
            "Pipe":   "GM BRASS & WINDS",
            "Guitar": "GM GUITAR & PLUCKED",
            "Plucked": "GM GUITAR & PLUCKED",
            "Basic":  "SPECIAL / WAVEFORMS",
            "Ethnic": "GM GUITAR & PLUCKED",
            "Percussive": "KEYS & MALLETS",
            "Sound Effects": "SPECIAL / WAVEFORMS",
        }

        # Drums are handled separately via kit catalog
        skip_categories = {"Drums", "Percussion"}

        for synth in SYNTHDEF_REGISTRY:
            cat = synth.get("category", "")
            if cat in skip_categories:
                continue
            role = category_to_role.get(cat, "SPECIAL / WAVEFORMS")
            role_groups[role].append(f"{synth['name']}")

        lines = ["INSTRUMENTS (use as 'instrument' in tracks):"]
        for role, names in role_groups.items():
            if names:
                lines.append(f"  {role}: {', '.join(names[:12])}" +
                              (f" (+{len(names)-12} more)" if len(names) > 12 else ""))

        return "\n".join(lines)

    def _build_kit_catalog(self) -> str:
        """Build compact kit catalog for AI prompts."""
        try:
            from backend.services.music.genre_profiles import get_genre_kit_catalog_for_ai
            return get_genre_kit_catalog_for_ai()
        except Exception:
            return "DRUM KITS: trap-kit, 808-core, house-kit, boom-bap, jazz-kit, rock-kit"

    def _build_genre_profiles_summary(self) -> str:
        """Build a compact genre profiles summary for AI prompts."""
        try:
            from backend.services.music.genre_profiles import GENRE_PROFILES
            lines = ["GENRE PROFILES (suggested kit + scale + tempo):"]
            for name, profile in list(GENRE_PROFILES.items())[:10]:
                kit = profile.get("kit_id", "?")
                scales = profile.get("scales", ["minor"])[0]
                bpm = profile.get("tempo_default", 120)
                lines.append(f"  {name}: kit={kit}, scale={scales}, bpm={bpm}")
            return "\n".join(lines)
        except Exception:
            return ""

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

    def _build_messages_with_history(
        self,
        user_message: str,
        context_message: str,
        history_length: int = 6,
        tempo: float = 120.0,
    ) -> List[Dict[str, Any]]:
        """
        Build messages array including recent conversation history.

        Loads the last `history_length` messages from in-memory chat history so the AI
        remembers what was discussed and composed in prior turns.
        """
        messages = []

        composition_id = self.action_service.composition_state.current_composition_id
        if composition_id and composition_id in self.chat_histories:
            history = self.chat_histories[composition_id]
            recent = history[-history_length:] if len(history) > history_length else history

            for entry in recent:
                messages.append({
                    "role": entry.role,
                    "content": entry.content,
                })

            # API requires messages start with "user" role — drop any leading assistant entries
            while messages and messages[0]["role"] == "assistant":
                messages.pop(0)

        # Append current message with full DAW state context
        duration_hints = self._extract_duration_hints(user_message, tempo)
        messages.append({
            "role": "user",
            "content": f"{user_message}{duration_hints}\n\nCurrent DAW state:\n{context_message}"
        })

        return messages

    def _build_brief_state_summary(self, state: DAWStateSnapshot) -> str:
        """
        Build brief state summary for routing context.
        """
        if not state or not state.sequence:
            return "Empty composition"

        track_count = len(state.sequence.tracks)
        clip_count = len(state.sequence.clips)
        summary = f"{track_count} tracks, {clip_count} clips, {state.tempo} BPM"

        if state.musical and state.musical.key:
            summary += f", key: {state.musical.key}"

        return summary

    def _extract_duration_hints(self, message: str, tempo: float, beats_per_bar: int = 4) -> str:
        """
        Parse user message for time/duration expressions and return pre-computed beat equivalents.
        Handles: seconds, minutes, bars/measures, beats.
        Returns empty string when no time expressions are found.
        """
        spb = 60.0 / tempo  # seconds per beat
        hints = []

        # Seconds: "30 seconds", "30 second", "30-second", "30 sec", "30s"
        for m in re.finditer(r'(\d+(?:\.\d+)?)\s*[-\s]?(?:seconds?|secs?)\b', message, re.IGNORECASE):
            secs = float(m.group(1))
            beats = secs / spb
            bars = beats / beats_per_bar
            hints.append(f'"{m.group(0).strip()}" → {beats:.1f} beats ({bars:.1f} bars) at {tempo} BPM')

        # Minutes: "2 minutes", "2 minute", "2 min"
        for m in re.finditer(r'(\d+(?:\.\d+)?)\s*[-\s]?(?:minutes?|mins?)\b', message, re.IGNORECASE):
            mins = float(m.group(1))
            beats = mins * tempo
            bars = beats / beats_per_bar
            hints.append(f'"{m.group(0).strip()}" → {beats:.1f} beats ({bars:.1f} bars) at {tempo} BPM')

        # Bars/measures: "16 bars", "8 measures", "4 bar"
        for m in re.finditer(r'(\d+(?:\.\d+)?)\s*[-\s]?(?:bars?|measures?)\b', message, re.IGNORECASE):
            bars = float(m.group(1))
            beats = bars * beats_per_bar
            secs = beats * spb
            hints.append(f'"{m.group(0).strip()}" → {beats:.1f} beats ({secs:.1f}s) at {tempo} BPM')

        if not hints:
            return ""
        return "\n[Duration hints for this request]\n" + "\n".join(f"  • {h}" for h in hints)

    def _build_context_message(
        self,
        state: Optional[DAWStateSnapshot],
        *,
        include_harmonic: bool = True,
        include_rhythmic: bool = True,
        include_timbre: bool = True,
    ) -> str:
        """
        Build COMPLETE MUSICAL CONTEXT — everything AI needs to understand and modify the sequence.

        Args:
            include_harmonic: Include harmonic/chord analysis section.
            include_rhythmic: Include rhythmic/groove analysis section.
            include_timbre:   Include audio energy/brightness section.
        """
        if not state or not state.sequence:
            return "Current state: No active sequence"

        parts = []

        # === GLOBAL CONTEXT ===
        parts.append("=== GLOBAL CONTEXT ===")
        parts.append(f"Tempo: {state.tempo} BPM")
        parts.append(f"Time Signature: {state.sequence.time_sig}")
        parts.append(f"Playing: {state.playing} | Position: {state.position:.2f} beats")

        # === TIMING REFERENCE ===
        _spb = 60.0 / state.tempo  # seconds per beat
        _bpb = int(state.sequence.time_sig.split("/")[0]) if state.sequence.time_sig and "/" in state.sequence.time_sig else 4
        parts.append(f"\n=== TIMING REFERENCE ({state.tempo} BPM) ===")
        parts.append(f"  1 beat={_spb:.3f}s | 1 bar ({_bpb} beats)={_spb*_bpb:.2f}s | 8 bars={_spb*_bpb*8:.1f}s | 16 bars={_spb*_bpb*16:.1f}s")
        parts.append(f"  Conversion: beats = seconds × {state.tempo/60:.4f} | bars = beats ÷ {_bpb}")
        parts.append(f"  30s={30/_spb:.1f} beats ({30/(_spb*_bpb):.1f} bars) | 1min={60/_spb:.1f} beats ({60/(_spb*_bpb):.1f} bars)")

        if state.musical:
            parts.append(f"Key: {state.musical.key or 'Unknown'} | Scale: {state.musical.scale or 'Unknown'}")
            parts.append(f"Note Density: {state.musical.note_density:.2f} notes/beat")
            parts.append(f"Pitch Range: {state.musical.pitch_range[0]}-{state.musical.pitch_range[1]} (MIDI)")
            parts.append(f"Complexity: {state.musical.complexity:.0%}")

        if include_timbre and state.audio:
            parts.append(f"Energy: {state.audio.energy:.0%} | Brightness: {state.audio.brightness:.0%} | Loudness: {state.audio.loudness_db:.1f}dB")

        # === PERCEPTUAL ANALYSIS (NEW) ===
        perception_summary = self._build_perception_context(state)
        if perception_summary:
            parts.append("\n" + perception_summary)

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

        # === HARMONIC ANALYSIS (optional) ===
        if include_harmonic:
            parts.append("\n=== HARMONIC ANALYSIS ===")
            harmony_analysis = self._analyze_harmony_over_time(state.sequence)
            parts.append(harmony_analysis)

        # === RHYTHMIC ANALYSIS (optional) ===
        if include_rhythmic:
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

    def _build_perception_context(self, state: Optional[DAWStateSnapshot]) -> str:
        """
        Build perceptual analysis context using the 3-layer perception pipeline

        This gives the AI "ears" to understand how the music sounds, not just what notes are playing.
        """
        if not state or not state.sequence:
            return ""

        try:
            from backend.models.sequence import Clip

            parts = []
            parts.append("=== PERCEPTUAL ANALYSIS ===")

            # Get composition from state service
            composition_id = self.state_service.composition_state.current_composition_id
            if not composition_id:
                return ""

            composition = self.state_service.composition_state.get_composition(composition_id)
            if not composition:
                return ""

            # Layer 2: Analyze each track's perception
            track_perceptions = []
            for track in state.sequence.tracks:
                # Get clips for this track
                track_clips = [c for c in state.sequence.clips if c.track == track.id]

                # Convert compact clips to full Clip objects
                full_clips = []
                for compact_clip in track_clips:
                    full_clip = next((c for c in composition.clips if c.id == compact_clip.id), None)
                    if full_clip:
                        full_clips.append(full_clip)

                # Get sample analysis if available
                sample_analysis = None
                if track.type == "audio" and full_clips:
                    # Try to get sample analysis from first clip
                    first_clip = full_clips[0]
                    if hasattr(first_clip, 'audio_file_path') and first_clip.audio_file_path:
                        sample_analysis = self.sample_analyzer.analyze_sample(first_clip.audio_file_path)

                # Analyze track perception
                track_perception = self.musical_perception.analyze_track(
                    track_id=track.id,
                    track_name=track.name,
                    track_type=track.type,
                    clips=full_clips,
                    sample_analysis=sample_analysis,
                    audio_features=None  # Could add real-time audio features here
                )

                track_perceptions.append(track_perception)
                parts.append(f"  {track_perception.summary}")

            # Layer 3: Analyze composition-level perception
            if track_perceptions:
                composition_perception = self.composition_perception.analyze_composition(
                    composition_id=composition.id,
                    composition_name=composition.name,
                    track_perceptions=track_perceptions,
                    tempo=state.tempo,
                    time_signature=state.sequence.time_sig
                )

                parts.append(f"\n{composition_perception.summary}")

                # Derive insights from actual model fields (insights is not a model field)
                fb = composition_perception.frequency_balance
                insight_lines = []
                for r in fb.crowded_ranges:
                    insight_lines.append(f"Consider reducing elements in {r} to avoid masking")
                for r in fb.empty_ranges:
                    insight_lines.append(f"{r} is empty — could add content here")
                for conflict in composition_perception.harmonic_conflicts:
                    insight_lines.append(conflict.suggestion)

                if insight_lines:
                    parts.append("\nMix Insights:")
                    for line in insight_lines:
                        parts.append(f"  • {line}")

            return "\n".join(parts)

        except Exception as e:
            logger.error(f"Error building perception context: {e}", exc_info=True)
            return ""

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

    def _get_tool_definitions(self) -> List[Dict[str, Any]]:
        """
        Get Claude function calling tool definitions.

        compose_music and edit_clip are the primary tools.
        modify_clip kept for raw-MIDI fallback (used by _handle_edit_clip internally).
        """
        return [
            # ================================================================
            # PRIMARY TOOLS — musical abstraction level
            # ================================================================
            COMPOSE_MUSIC_TOOL_SCHEMA,
            EDIT_CLIP_TOOL_SCHEMA,

            # ================================================================
            # STANDARD DAW OPERATIONS
            # ================================================================
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
                        "instrument": {
                            "type": "string",
                            "enum": get_valid_instruments_list(),
                            "description": "New instrument name. Must be a valid SynthDef from SYNTHDEF_REGISTRY."
                        }
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
            {
                "name": "set_effect_parameter",
                "description": "Adjust a parameter on an existing effect (e.g. reverb room size, delay time, filter cutoff)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "effect_id": {"type": "string", "description": "Effect ID"},
                        "parameter": {"type": "string", "description": "Parameter name (e.g. 'room', 'decay', 'cutoff', 'mix')"},
                        "value": {"type": "number", "description": "New parameter value"}
                    },
                    "required": ["effect_id", "parameter", "value"]
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
            },
            {
                "name": "clear_composition",
                "description": "Remove ALL tracks, clips, and effects from the current composition. This is destructive and cannot be undone. Use only when explicitly asked to start fresh or delete everything.",
                "input_schema": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]

