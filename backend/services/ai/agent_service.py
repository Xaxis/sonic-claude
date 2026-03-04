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
import asyncio
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
        model: str = "claude-sonnet-4-6",
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

    async def _api_call(self, **kwargs) -> anthropic.types.Message:
        """
        Wrapper around client.messages.create with retry logic for transient API errors.

        Retries up to 3 times (with 1s / 2s / 4s backoff) on:
          - 529 overloaded_error  (Anthropic servers temporarily at capacity)
          - 429 rate_limit_error  (per-minute token or request limit)

        Any other error is re-raised immediately.
        """
        _RETRYABLE = (529, 429)
        _BACKOFF = [1.0, 2.0, 4.0]

        last_exc: Exception = RuntimeError("No attempts made")
        for attempt, wait in enumerate([0.0] + _BACKOFF):
            if wait:
                logger.warning(f"⏳ Anthropic API transient error — retrying in {wait:.0f}s (attempt {attempt}/{len(_BACKOFF)})…")
                await asyncio.sleep(wait)
            try:
                return await self.client.messages.create(**kwargs)
            except anthropic.InternalServerError as exc:
                if exc.status_code in _RETRYABLE:
                    last_exc = exc
                else:
                    raise
            except anthropic.RateLimitError as exc:
                last_exc = exc

        raise last_exc

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
        "sonnet": "claude-sonnet-4-6",
        "opus":   "claude-opus-4-6",
    }

    # System-prompt appendix for each response style
    _RESPONSE_STYLE_APPENDIX: Dict[str, str] = {
        "concise":  "\n\nIMPORTANT: Keep responses very brief — 1-2 sentences maximum. Skip explanations. Just do it and confirm concisely.",
        "detailed": "\n\nIMPORTANT: Provide detailed explanations of every decision. Describe what you changed, why you made each choice, and the musical reasoning behind it.",
    }

    # P3: Shared catalog cache — built once, reused for every request
    _catalog_cache: Dict[str, str] = {}

    @classmethod
    def clear_catalog_cache(cls) -> None:
        """Clear catalog cache — call when registries are updated at runtime."""
        cls._catalog_cache.clear()
        logger.info("🗑️ Catalog cache cleared")

    # =========================================================================
    # SHARED REQUEST CONTEXT BUILDER
    # Eliminates ~150 lines of duplication between send_message / stream_message
    # =========================================================================

    async def _build_request_context(
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
        Build the full execution context shared by send_message() and stream_message().

        Handles in one place:
          - Model resolution
          - DAW state collection + context formatting
          - Catalog building (all cached after first call)
          - Intent routing + focused tool/prompt selection
          - Response-style modifier
          - Genre detection + prompt injection (best-effort)
          - Conversation history assembly

        Returns a context dict consumed by both the sync and streaming paths.
        Keys: effective_model, state_response, context_message, tools,
              system_prompt, intent, messages, temperature
        """
        effective_model = (
            self._EXECUTION_MODEL_MAP.get(execution_model, self.model)
            if execution_model else self.model
        )

        # Force-refresh key/scale analysis so state.musical is never stale
        self.state_service.analyze_current_sequence()
        state_response = self.state_service.get_state(previous_hash=self.last_state_hash)
        context_message = self._build_context_message(
            state_response.full_state,
            include_harmonic=include_harmonic_context,
            include_rhythmic=include_rhythmic_context,
            include_timbre=include_timbre_context,
        )

        # Catalogs are cached — no cost after first request
        instruments_catalog = self._build_instruments_catalog()
        effects_list        = self._build_effects_list()
        kit_catalog         = self._build_kit_catalog()
        genre_summary       = self._build_genre_profiles_summary()
        all_tools           = self._get_tool_definitions()

        # Route → focused tool set + intent-specific system prompt + genre (one Haiku call)
        route_result = None
        intent = None
        if use_intent_routing:
            state_summary = self._build_brief_state_summary(state_response.full_state)
            route_result = await self.router.route(user_message, daw_state_summary=state_summary)
            intent = route_result.intent
            logger.info(f"🔀 Intent: {intent.value}")

            relevant_tool_names = self.router.get_tools_for_intent(intent)
            system_prompt = self.router.get_system_prompt_for_intent(
                intent, instruments_catalog, effects_list, kit_catalog, genre_summary
            )
            if relevant_tool_names:
                tools = [t for t in all_tools if t["name"] in relevant_tool_names]
                logger.info(f"🛠️  Using {len(tools)}/{len(all_tools)} tools for {intent.value}")
            else:
                tools = []
                logger.info(f"🛠️  No tools for {intent.value} (informational response)")
        else:
            tools = all_tools
            system_prompt = self.router.get_system_prompt_for_intent(
                Intent.GENERAL_CHAT, instruments_catalog, effects_list, kit_catalog, genre_summary
            )
            logger.info(f"🛠️  Routing bypassed — using all {len(tools)} tools")

        # Apply response-style modifier (concise / detailed)
        if response_style in self._RESPONSE_STYLE_APPENDIX:
            system_prompt += self._RESPONSE_STYLE_APPENDIX[response_style]

        # Genre injection — sourced from LLM routing result (or keyword fallback if routing disabled)
        try:
            from backend.services.music.genre_profiles import get_genre_profile
            detected_genre = route_result.genre if route_result else self.router._resolve_genre(user_message, None)
            if detected_genre:
                profile = get_genre_profile(detected_genre)
                if profile:
                    logger.info(f"🎵 Genre: {detected_genre}")
                    progressions = profile.get("progressions", [])[:2]
                    tempo_range = profile.get("tempo_range", (100, 140))
                    if not isinstance(tempo_range, (tuple, list)) or len(tempo_range) < 2:
                        tempo_range = (100, 140)
                    scale = profile.get("scales", ["minor"])[0]
                    chord_inst = profile.get("chord_instrument", "pad")
                    lead_inst = profile.get("lead_instrument", "lead")
                    bass_inst = profile.get("bass_instrument", "bass")
                    bass_octave = profile.get("bass_octave", 2)
                    chord_rhythm = profile.get("chord_rhythm", "block")
                    arp_style = profile.get("arp_style", "up")
                    arp_rhythm = profile.get("arp_rhythm", "8th")
                    melody_contour = profile.get("melody_contour", "arch")
                    melody_density = profile.get("melody_density", "medium")
                    bass_gen = profile.get("bass_generator", "root_pulse")
                    prog_root = progressions[0][0][0] if progressions else "C"
                    example_chords = progressions[0] if progressions else ["Am", "F", "C", "G"]
                    genre_injection = (
                        f"\n\nDETECTED GENRE: {detected_genre.upper()}\n"
                        f"Core settings: kit={profile.get('kit_id')}, scale={scale}, "
                        f"tempo={profile.get('tempo_default', 120)} bpm (range {tempo_range[0]}–{tempo_range[1]})\n"
                        f"Instruments: lead={lead_inst}, chords={chord_inst}, bass={bass_inst}, bass_octave={bass_octave}\n"
                        f"Chord progressions: {progressions}\n"
                        f"Style: {profile.get('notes', '')}\n\n"
                        f"MELODIC GENERATOR RECOMMENDATIONS for {detected_genre}:\n"
                        f"  Bass:   instrument={bass_inst!r}, bass_line style={bass_gen!r}, octave={bass_octave}\n"
                        f"  Chords: instrument={chord_inst!r}, chord_pattern rhythm={chord_rhythm!r}\n"
                        f"  Arp:    instrument={lead_inst!r}, arp_pattern style={arp_style!r}, rhythm={arp_rhythm!r}\n"
                        f"  Melody: instrument={lead_inst!r}, scale_melody root={prog_root!r}, scale={scale!r}, "
                        f"contour={melody_contour!r}, density={melody_density!r}\n"
                        f"Example bass track: name='Bass', instrument={bass_inst!r}, "
                        f"bass_line chords={example_chords}, style={bass_gen!r}, octave={bass_octave}"
                    )
                    system_prompt += genre_injection
        except Exception as e:
            logger.warning(f"⚠️ Genre injection failed (non-fatal): {e}")

        # Build messages with conversation history
        _tempo = state_response.full_state.tempo if state_response.full_state else 120.0
        messages = self._build_messages_with_history(
            user_message, context_message, history_length=history_length, tempo=_tempo
        )

        return {
            "effective_model": effective_model,
            "state_response":  state_response,
            "context_message": context_message,
            "tools":           tools,
            "system_prompt":   system_prompt,
            "intent":          intent,
            "messages":        messages,
            "temperature":     temperature,
        }

    # =========================================================================
    # HELPER: persist chat + composition after any message
    # =========================================================================

    def _append_to_chat_history(
        self,
        composition_id: Optional[str],
        user_message: str,
        full_response: str,
        actions_executed: List,
    ) -> None:
        """Update in-memory chat history for both sync and streaming paths."""
        if not composition_id:
            return
        if composition_id not in self.chat_histories:
            self.chat_histories[composition_id] = []
        self.chat_histories[composition_id].append(ChatMessage(
            role="user",
            content=user_message,
            timestamp=datetime.now(),
            actions_executed=None,
        ))
        self.chat_histories[composition_id].append(ChatMessage(
            role="assistant",
            content=full_response,
            timestamp=datetime.now(),
            actions_executed=[
                {"action": r.action, "success": r.success, "data": r.data, "error": r.error}
                for r in actions_executed
            ] if actions_executed else None,
        ))

    # =========================================================================
    # HELPER: build tool-result content string (with error hints)
    # =========================================================================

    def _format_tool_result(self, tool_name: str, tool_input: dict, result) -> str:
        """Format a tool result as a string for the follow-up LLM call."""
        content = f"Success: {result.message}" if result.success else f"Error: {result.error}"
        if result.data:
            content += f"\nData: {result.data}"
        if not result.success:
            content += self._build_error_hint(tool_name, tool_input, result)
        return content

    # =========================================================================
    # PUBLIC: Non-streaming message execution
    # =========================================================================

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
        Routed, single-call LLM execution (non-streaming).

        1. Build full request context via _build_request_context()
        2. Single LLM call with focused tools + intent-specific prompt
        3. Dispatch tool calls, enrich error feedback
        4. Follow-up summary call (Haiku) when tools executed
        5. Persist chat history + composition snapshot

        Returns dict with: response, actions_executed, musical_context, routing_intent
        """
        request_id = f"req-{int(time.time() * 1000)}"
        await self._emit_pipeline(request_id, "context", "start")

        ctx = await self._build_request_context(
            user_message,
            execution_model=execution_model,
            temperature=temperature,
            response_style=response_style,
            history_length=history_length,
            use_intent_routing=use_intent_routing,
            include_harmonic_context=include_harmonic_context,
            include_rhythmic_context=include_rhythmic_context,
            include_timbre_context=include_timbre_context,
        )

        effective_model = ctx["effective_model"]
        state_response  = ctx["state_response"]
        context_message = ctx["context_message"]
        tools           = ctx["tools"]
        system_prompt   = ctx["system_prompt"]
        intent          = ctx["intent"]
        messages        = ctx["messages"]

        # Emit pipeline stage completions (WebSocket UI)
        _state = state_response.full_state
        await self._emit_pipeline(request_id, "context", "complete", {
            "track_count": len(_state.sequence.tracks) if _state and _state.sequence else 0,
            "clip_count":  len(_state.sequence.clips)  if _state and _state.sequence else 0,
            "tempo":       _state.sequence.tempo        if _state and _state.sequence else None,
            "key":         f"{_state.musical.key} {_state.musical.scale}" if _state and _state.musical else None,
        })
        if intent:
            await self._emit_pipeline(request_id, "routing", "complete", {
                "intent": intent.value, "tools_loaded": len(tools), "model": "haiku",
            })
        else:
            await self._emit_pipeline(request_id, "routing", "skipped", {"tools_loaded": len(tools)})

        logger.info(f"🎯 Processing: '{user_message}'")
        logger.info(f"🤖 {effective_model} | {len(tools)} tools | {len(messages)} messages")
        await self._emit_pipeline(request_id, "execution", "start", {
            "model": effective_model, "tool_count": len(tools), "history_messages": len(messages),
        })

        create_kwargs: Dict[str, Any] = dict(
            model=effective_model, max_tokens=8192,
            system=system_prompt, messages=messages,
            tools=tools if tools else None,
        )
        if ctx["temperature"] is not None:
            create_kwargs["temperature"] = ctx["temperature"]

        response = await self._api_call(**create_kwargs)

        tool_call_count = sum(1 for b in response.content if b.type == "tool_use")
        await self._emit_pipeline(request_id, "execution", "complete", {
            "model": effective_model, "tool_calls": tool_call_count, "stop_reason": response.stop_reason,
        })
        if response.stop_reason == "max_tokens":
            logger.warning(f"⚠️  Execution hit max_tokens — tool call may be incomplete")

        # Process response — collect text + dispatch tools
        assistant_message = ""
        actions_executed  = []
        tool_results      = []
        _tool_summaries: list = []

        if tool_call_count > 0:
            await self._emit_pipeline(request_id, "tools", "start", {"total": tool_call_count})

        for block in response.content:
            if block.type == "text":
                assistant_message += block.text
            elif block.type == "tool_use":
                logger.info(f"🔧 Tool: {block.name}")
                result = await self._dispatch_tool(block.name, block.input)
                actions_executed.append(result)
                _tool_summaries.append({"name": block.name, "success": result.success})
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": self._format_tool_result(block.name, block.input, result),
                })

        if tool_call_count > 0:
            await self._emit_pipeline(request_id, "tools", "complete", {
                "actions":   _tool_summaries,
                "succeeded": sum(1 for a in _tool_summaries if a["success"]),
                "total":     tool_call_count,
            })

        # Follow-up: send tool results back to LLM for summary (Haiku — fast/cheap)
        if tool_results:
            assistant_content = [
                {"type": "text", "text": b.text} if b.type == "text"
                else {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input}
                for b in response.content if b.type in ("text", "tool_use")
            ]
            follow_up_messages = [
                {"role": "user",      "content": user_message},
                {"role": "assistant", "content": assistant_content},
                {"role": "user",      "content": tool_results},
            ]
            logger.info(f"🔄 Summarising {len(tool_results)} tool result(s)…")
            await self._emit_pipeline(request_id, "summary", "start", {
                "model": "haiku", "tool_results": len(tool_results),
            })
            follow_up = await self._api_call(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=system_prompt,
                messages=follow_up_messages,
            )
            for block in follow_up.content:
                if block.type == "text":
                    assistant_message += block.text
            await self._emit_pipeline(request_id, "summary", "complete", {"model": "haiku"})

        logger.info(f"✅ Complete: {len(actions_executed)} actions")
        if actions_executed:
            action_counts: Dict[str, int] = {}
            for a in actions_executed:
                action_counts[a.action] = action_counts.get(a.action, 0) + 1
            logger.info(f"📊 {action_counts}")
            # Log success/failure for each action
            for a in actions_executed:
                if not a.success:
                    logger.warning(f"⚠️  Action {a.action} FAILED: {a.error} — {a.message}")
        else:
            logger.debug("No tool actions executed (conversational response)")

        full_response = assistant_message or f"Executed {len(actions_executed)} actions successfully."

        composition_id = self.action_service.composition_state.current_composition_id
        # DEBUG: log composition track count before save
        _comp_debug = self.action_service.composition_state.get_composition(composition_id) if composition_id else None
        logger.info(f"🔍 Pre-save state: comp_id={composition_id}, tracks={len(_comp_debug.tracks) if _comp_debug else 'N/A (comp not found)'}")
        self._append_to_chat_history(composition_id, user_message, full_response, actions_executed)
        if any(a.success for a in actions_executed):
            await self._save_ai_iteration(composition_id, user_message, full_response, actions_executed)

        # Update diff-detection hash for next request
        if state_response.full_state:
            self.last_state_hash = state_response.full_state.state_hash
        self.last_actions_executed = len(actions_executed)

        await self._emit_pipeline(request_id, "response", "complete", {
            "actions": len(actions_executed), "has_tools": tool_call_count > 0,
        })

        return {
            "response":        full_response,
            "actions_executed": actions_executed,
            "musical_context": context_message,
            "routing_intent":  intent.value if intent else None,
        }

    # =========================================================================
    # PUBLIC: Streaming message execution (SSE)
    # =========================================================================

    async def stream_message(
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
    ):
        """
        Streaming version of send_message() — yields SSE event strings.

        Uses the same _build_request_context() helper as send_message() to keep
        both paths in sync. Streams text tokens via client.messages.stream().

        Yields ``data: {...}\\n\\n`` lines (SSE format).
        Event types: stage | token | action | done | error
        """
        import json

        def sse(event: dict) -> str:
            return f"data: {json.dumps(event)}\n\n"

        ctx = await self._build_request_context(
            user_message,
            execution_model=execution_model,
            temperature=temperature,
            response_style=response_style,
            history_length=history_length,
            use_intent_routing=use_intent_routing,
            include_harmonic_context=include_harmonic_context,
            include_rhythmic_context=include_rhythmic_context,
            include_timbre_context=include_timbre_context,
        )

        effective_model = ctx["effective_model"]
        state_response  = ctx["state_response"]
        context_message = ctx["context_message"]
        tools           = ctx["tools"]
        system_prompt   = ctx["system_prompt"]
        intent          = ctx["intent"]
        messages        = ctx["messages"]

        # Emit context + routing stage events
        _state = state_response.full_state
        yield sse({
            "type": "stage", "stage": "context", "status": "complete",
            "track_count": len(_state.sequence.tracks) if _state and _state.sequence else 0,
            "clip_count":  len(_state.sequence.clips)  if _state and _state.sequence else 0,
        })
        if intent:
            yield sse({
                "type": "stage", "stage": "routing", "status": "complete",
                "intent": intent.value, "tools_loaded": len(tools),
            })
        else:
            yield sse({"type": "stage", "stage": "routing", "status": "skipped", "tools_loaded": len(tools)})

        # === Streaming execution ===
        yield sse({"type": "stage", "stage": "execution", "status": "start", "model": effective_model})

        assistant_message = ""
        create_kwargs: Dict[str, Any] = dict(
            model=effective_model, max_tokens=8192,
            system=system_prompt, messages=messages,
            tools=tools if tools else None,
        )
        if ctx["temperature"] is not None:
            create_kwargs["temperature"] = ctx["temperature"]

        final_message = None
        async with self.client.messages.stream(**create_kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    delta = getattr(event, "delta", None)
                    if delta and getattr(delta, "type", None) == "text_delta":
                        text = getattr(delta, "text", "")
                        if text:
                            assistant_message += text
                            yield sse({"type": "token", "content": text})
            final_message = await stream.get_final_message()

        # === Tool dispatch ===
        actions_executed = []
        tool_results     = []
        tool_calls       = [b for b in final_message.content if b.type == "tool_use"]

        if tool_calls:
            yield sse({"type": "stage", "stage": "tools", "status": "start", "total": len(tool_calls)})
            for block in tool_calls:
                result = await self._dispatch_tool(block.name, block.input)
                actions_executed.append(result)
                yield sse({"type": "action", "name": block.name, "success": result.success, "message": result.message or ""})
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": self._format_tool_result(block.name, block.input, result),
                })

        # === Streaming summary after tools ===
        if tool_results:
            assistant_content = [
                {"type": "text", "text": b.text} if b.type == "text"
                else {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input}
                for b in final_message.content if b.type in ("text", "tool_use")
            ]
            follow_up_messages = [
                {"role": "user",      "content": user_message},
                {"role": "assistant", "content": assistant_content},
                {"role": "user",      "content": tool_results},
            ]
            yield sse({"type": "stage", "stage": "summary", "status": "start"})
            async with self.client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=system_prompt,
                messages=follow_up_messages,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        delta = getattr(event, "delta", None)
                        if delta and getattr(delta, "type", None) == "text_delta":
                            text = getattr(delta, "text", "")
                            if text:
                                assistant_message += text
                                yield sse({"type": "token", "content": text})

        full_response = assistant_message or f"Executed {len(actions_executed)} actions successfully."

        composition_id = self.action_service.composition_state.current_composition_id
        self._append_to_chat_history(composition_id, user_message, full_response, actions_executed)
        if any(a.success for a in actions_executed):
            await self._save_ai_iteration(composition_id, user_message, full_response, actions_executed)

        # Update diff-detection hash for next request
        if state_response.full_state:
            self.last_state_hash = state_response.full_state.state_hash

        yield sse({
            "type": "done",
            "actions_executed": [{"action": a.action, "success": a.success, "message": a.message or ""} for a in actions_executed],
            "routing_intent":   intent.value if intent else None,
            "musical_context":  context_message,
        })

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
        route_result = await self.router.route(message, daw_summary)
        intent = route_result.intent

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
            "max_tokens": 8192,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_content}],
            "tools": tools,
        }
        if temperature is not None:
            create_kwargs["temperature"] = temperature

        response = await self._api_call(**create_kwargs)

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
            follow_up = await self._api_call(
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

    async def _save_ai_iteration(self, composition_id: Optional[str], user_message: str, assistant_response: str, actions_executed: List[ActionResult]) -> None:
        """Save composition as AI iteration after actions are executed.

        Chat history is already updated by the caller (send_message / stream_message).
        This method only handles the composition snapshot + file save.
        """
        try:
            # Check if we have all required services
            if not all([self.composition_service, self.action_service.composition_state,
                        self.action_service.mixer, self.action_service.track_effects]):
                logger.warning("⚠️ Cannot save AI iteration: missing required services")
                return

            if not composition_id:
                logger.warning("⚠️ Cannot save AI iteration: no active composition")
                return

            # Get composition
            composition = self.action_service.composition_state.get_composition(composition_id)
            if not composition:
                logger.warning(f"⚠️ Cannot save AI iteration: composition {composition_id} not found")
                return

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

            logger.info(f"🔍 Captured composition '{captured_composition.name}': {len(captured_composition.tracks)} tracks, {len(captured_composition.clips)} clips")

            # Update metadata
            if not captured_composition.metadata:
                captured_composition.metadata = {}
            captured_composition.metadata.update({
                "source": "ai_iteration",
                "user_message": user_message,
                "actions_count": len(actions_executed),
                "timestamp": datetime.now().isoformat()
            })

            # Persist the in-memory chat history (already updated by caller)
            captured_composition.chat_history = self.chat_histories.get(composition_id, [])

            # Save with history
            self.composition_service.save_composition(
                composition=captured_composition,
                create_history=True,  # Create history entry for AI iteration
                is_autosave=False
            )

            logger.info(f"💾 Saved AI iteration for composition {composition_id} with {len(self.chat_histories.get(composition_id, []))} chat messages")

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

    def _build_error_hint(self, tool_name: str, tool_input: dict, result) -> str:
        """
        P6: Build actionable hint text appended to tool error messages.
        Guides Claude toward a correct retry rather than a confused guess.
        """
        try:
            if tool_name == "compose_music":
                return self._hint_compose_music(tool_input, result)
            elif tool_name == "edit_clip":
                return self._hint_edit_clip(tool_input)
            else:
                # Generic DAW action hint
                failed_param = result.data.get("failed_param") if result.data else None
                if failed_param:
                    return f"\nHint: Check the '{failed_param}' parameter value and type."
            return ""
        except Exception:
            return ""

    def _hint_compose_music(self, tool_input: dict, result) -> str:
        """Build hint for a failed compose_music call."""
        hints = []
        error_str = (result.error or "").lower()

        # Empty / missing tracks array
        if "tracks" in error_str and "required" in error_str:
            hints.append(
                "You must pass a 'tracks' array with at least one track. "
                "Example: {\"tempo\": 120, \"tracks\": [{\"name\": \"Drums\", \"drum_pattern\": {\"kit_id\": \"trap-kit\"}}]}. "
                "Keep each track simple — fewer notes per track if the composition is large."
            )

        # Instrument error → show valid options by category
        if "instrument" in error_str or "synthdef" in error_str:
            try:
                from backend.services.daw.registry import SYNTHDEF_REGISTRY
                by_role: Dict[str, List[str]] = {}
                for s in SYNTHDEF_REGISTRY:
                    cat = s.get("category", "Other")
                    by_role.setdefault(cat, []).append(s["name"])
                sample_lines = []
                for cat, names in list(by_role.items())[:4]:
                    sample_lines.append(f"  {cat}: {', '.join(names[:5])}")
                hints.append("Valid instruments (sample):\n" + "\n".join(sample_lines))
                hints.append("For drum tracks, omit 'instrument' — the kit/drum_pattern sets it automatically.")
            except Exception:
                pass

        # Kit error → show valid kit IDs
        if "kit" in error_str:
            try:
                from backend.services.daw.registry import KIT_REGISTRY
                kit_ids = [k["id"] for k in KIT_REGISTRY[:8]]
                hints.append(f"Valid kit_id values: {', '.join(kit_ids)}")
            except Exception:
                pass

        # Drum voice error → show valid voice names
        if "voice" in error_str or "drum" in error_str:
            from backend.services.ai.tools.compose_tool import _DRUM_VOICE_TO_SYNTHDEF
            voice_names = list(_DRUM_VOICE_TO_SYNTHDEF.keys())[:12]
            hints.append(f"Valid drum voice names: {', '.join(voice_names)}")

        return ("\nHint: " + " | ".join(hints)) if hints else ""

    def _hint_edit_clip(self, tool_input: dict) -> str:
        """Build hint for a failed edit_clip call."""
        clip_id = tool_input.get("clip_id", "")
        if not clip_id or "not found" in clip_id.lower():
            try:
                comp_id = self.action_service.composition_state.current_composition_id
                comp = self.action_service.composition_state.get_composition(comp_id)
                if comp and comp.clips:
                    ids = [c.id for c in comp.clips[:6]]
                    return f"\nHint: clip_id '{clip_id}' not found. Available clip IDs: {', '.join(ids)}"
            except Exception:
                pass
        return ""

    async def _handle_edit_clip(self, params: dict):
        """
        Handle the edit_clip tool — supports add/replace/remove modes,
        clip resizing (duration_bars), and clip repositioning (start_bar).
        """
        from backend.models.ai_actions import ActionResult

        clip_id = params.get("clip_id")
        mode = params.get("mode", "replace")
        raw_notes = params.get("notes", [])
        transpose = params.get("transpose_semitones", 0)
        vel_scale = params.get("velocity_scale", 1.0)
        duration_bars = params.get("duration_bars")
        start_bar = params.get("start_bar")

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

        # Build base modify_clip params
        modify_params: dict = {"clip_id": clip_id}

        # Resize / reposition (independent of note edits — can be used alone)
        if duration_bars is not None:
            modify_params["duration"] = int(duration_bars) * 4  # bars → beats
        if start_bar is not None:
            modify_params["start_time"] = int(start_bar) * 4  # bars → beats

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
            modify_params["notes"] = existing + converted
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
            modify_params["notes"] = remaining
        elif converted:
            # replace (default) — only include notes if any were provided
            modify_params["notes"] = converted

        action = DAWAction(action="modify_clip", parameters=modify_params)
        return await self.action_service.execute_action(action)

    def _build_instruments_catalog(self) -> str:
        """Cached instrument catalog for AI prompts (P3)."""
        if "instruments" not in AIAgentService._catalog_cache:
            AIAgentService._catalog_cache["instruments"] = self._compute_instruments_catalog()
        return AIAgentService._catalog_cache["instruments"]

    def _compute_instruments_catalog(self) -> str:
        """
        Build a role-grouped instrument catalog for AI prompts with sonic descriptions.
        Annotates the most commonly used synths so Claude can pick musically appropriate ones.
        """
        from backend.services.daw.registry import SYNTHDEF_REGISTRY

        # Sonic descriptions for all synths — drives LLM instrument selection accuracy.
        # Format: name → brief timbral description (kept to ≤6 words for token efficiency).
        _SONIC_HINTS: Dict[str, str] = {
            # ── Synths & Leads ─────────────────────────────────────────────────
            "lead":        "bright cutting sawtooth lead",
            "supersaw":    "wide stacked detuned (EDM walls)",
            "glide":       "portamento monophonic lead",
            "fm":          "metallic bell-like FM",
            "stab":        "short punchy chord stab",
            "duo":         "dual detuned oscillators",
            "pwm":         "pulse-width-mod LFO sweep",
            "hoover":      "classic rave hoover w/glide",
            "polyBrass":   "polysynth brass stabs",
            "fmBell":      "DX7-style FM bell tones",
            "fmVibes":     "FM vibraphone w/vibrato",
            "bowedStr":    "physical model bowed string",
            "metalKlank":  "metallic resonant partials",
            "nylonStr":    "Karplus-Strong nylon guitar",
            "buzzLead":    "rich harmonic Blip oscillator",
            "analogLead":  "classic detuned mono lead",
            "squareLead":  "square wave lead synth",
            "fmLead":      "FM lead w/bright attack",
            "brass":       "filter-envelope brass stab",
            "chiptune":    "8-bit pulse wave",
            # ── Bass Synths ────────────────────────────────────────────────────
            "bass":        "deep subtractive bass",
            "acidbass":    "TB-303 squelch/resonance",
            "reese":       "detuned saw (DnB/techno)",
            "wobble":      "LFO filter sweep bass",
            "synthBass1":  "clean GM synth bass",
            "fmBass":      "FM bass decaying modulator",
            "moogBass":    "Moog ladder filter warmth",
            "darkBass":    "sub bass + detuned saws",
            "punchBass":   "hard attack fast filter sweep",
            "dubBass":     "reggae/dub sine dominant",
            "subBass":     "pure sine sub bass",
            "squareBass":  "square wave low-pass bass",
            # ── Pads & Textures ────────────────────────────────────────────────
            "pad":         "warm slow-attack atmosphere",
            "strings":     "lush detuned string ensemble",
            "warmPad":     "slow-attack detuned saw pad",
            "junoPad":     "Juno-106 stereo chorus pad",
            "choirPad":    "vowel formant choir texture",
            "spacePad":    "ambient shimmer LFO drift",
            "dreamPad":    "harmonic series per-voice drift",
            "atmospherePad": "dark textural pad w/noise",
            "loPad":       "filtered vintage bit-reduced pad",
            # ── Keys & Mallets ─────────────────────────────────────────────────
            "organ":       "Hammond B3 drawbar",
            "kalimba":     "thumb piano bright & short",
            "glass":       "ethereal bowl shimmer",
            "pluck":       "fast-decay pizzicato",
            "bell":        "clear resonant sine bell",
            "electricPiano1": "Rhodes/Wurlitzer",
            "clavinet":    "funky percussive clavinet",
            "tubeBell":    "tubular bells accurate partials",
            "rhodes":      "FM Rhodes electric piano",
            "wurli":       "Wurlitzer w/transient bark",
            "claviSynth":  "clavinet-style clicky keys",
            "fmEpiano":    "DX7-style FM e-piano feedback",
            # ── GM Bass (used directly in genre profiles) ──────────────────────
            "acousticBass":       "upright double bass (jazz/acoustic)",
            "electricBassFinger": "fingered electric bass (warm/smooth)",
            "electricBassPick":   "picked electric bass (bright/punchy)",
            "fretlessBass":       "fretless bass smooth glides",
            "slapBass1":          "slap/pop funk technique",
            "slapBass2":          "slap bass bright variant",
            "synthBass2":         "synth bass 2 brighter variant",
            # GM categories — instrument names are self-describing (standard GM)
        }

        role_groups: Dict[str, List[str]] = {
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
            name = synth["name"]
            role = category_to_role.get(cat, "SPECIAL / WAVEFORMS")
            hint = _SONIC_HINTS.get(name)
            entry = f"{name} ({hint})" if hint else name
            role_groups[role].append(entry)

        lines = ["INSTRUMENTS (use as 'instrument' in tracks):"]
        for role, entries in role_groups.items():
            if entries:
                lines.append(f"  {role}: {', '.join(entries)}")

        return "\n".join(lines)

    def _build_kit_catalog(self) -> str:
        """Cached kit catalog for AI prompts (P3)."""
        if "kits" not in AIAgentService._catalog_cache:
            AIAgentService._catalog_cache["kits"] = self._compute_kit_catalog()
        return AIAgentService._catalog_cache["kits"]

    def _compute_kit_catalog(self) -> str:
        """Build compact kit catalog for AI prompts."""
        try:
            from backend.services.music.genre_profiles import get_genre_kit_catalog_for_ai
            return get_genre_kit_catalog_for_ai()
        except Exception:
            return "DRUM KITS: trap-kit, 808-core, house-kit, boom-bap, jazz-kit, rock-kit"

    def _build_genre_profiles_summary(self) -> str:
        """Cached genre profiles summary for AI prompts (P3)."""
        if "genres" not in AIAgentService._catalog_cache:
            AIAgentService._catalog_cache["genres"] = self._compute_genre_profiles_summary()
        return AIAgentService._catalog_cache["genres"]

    def _compute_genre_profiles_summary(self) -> str:
        """
        Build a compact genre profiles summary for AI prompts.
        Includes instrument recommendations so the model can pick appropriate sounds
        even on intents where the full genre-injection block doesn't fire.
        """
        try:
            from backend.services.music.genre_profiles import GENRE_PROFILES
            lines = ["GENRE PROFILES (kit | scale | bpm | lead, chords, bass):"]
            for name, profile in GENRE_PROFILES.items():
                kit    = profile.get("kit_id", "?")
                scale  = profile.get("scales", ["minor"])[0]
                bpm    = profile.get("tempo_default", 120)
                lead   = profile.get("lead_instrument", "lead")
                chords = profile.get("chord_instrument", "pad")
                bass   = profile.get("bass_instrument", "bass")
                lines.append(
                    f"  {name}: kit={kit}, scale={scale}, bpm={bpm}"
                    f" | lead={lead}, chords={chords}, bass={bass}"
                )
            return "\n".join(lines)
        except Exception:
            return ""

    def _build_effects_list(self) -> str:
        """Cached effects list for AI prompts (P3)."""
        if "effects" not in AIAgentService._catalog_cache:
            AIAgentService._catalog_cache["effects"] = self._compute_effects_list()
        return AIAgentService._catalog_cache["effects"]

    def _compute_effects_list(self) -> str:
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

        # P4: Load-on-demand — restore history from persisted composition on first access
        if composition_id and composition_id not in self.chat_histories:
            comp = self.action_service.composition_state.get_composition(composition_id)
            if comp and comp.chat_history:
                self.chat_histories[composition_id] = list(comp.chat_history)
                logger.info(f"📜 Loaded {len(comp.chat_history)} messages from composition {composition_id}")
            else:
                self.chat_histories[composition_id] = []

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

