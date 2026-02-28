"""
Intent Routing System - Maps user requests to appropriate tool sets

Uses LLM-based classification for accurate intent detection.
"""
import logging
import anthropic
from typing import Dict, Any, List, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class Intent(str, Enum):
    """User intent categories"""
    CREATE_CONTENT = "create_content"  # "Add tracks", "Create composition"
    MODIFY_CONTENT = "modify_content"  # "Change notes", "Modify track"
    DELETE_CONTENT = "delete_content"  # "Remove track", "Delete clip"
    ADD_EFFECTS = "add_effects"  # "Add reverb", "Make it sound like..."
    PLAYBACK_CONTROL = "playback_control"  # "Play", "Stop", "Set tempo"
    QUERY_STATE = "query_state"  # "What tracks do I have?", "Show me..."
    GENERAL_CHAT = "general_chat"  # "How do I...", "What is..."


class IntentRouter:
    """
    Routes user requests to appropriate tool sets using LLM classification.

    Uses Claude Haiku for fast, accurate intent detection.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.client = anthropic.AsyncAnthropic(api_key=api_key) if api_key else None
        self.model = "claude-haiku-4-5-20251001"  # Fast, cheap, accurate

    async def route(self, user_message: str, daw_state_summary: Optional[str] = None) -> Intent:
        """
        Route user message to intent category using LLM.

        Args:
            user_message: User's message
            daw_state_summary: Optional summary of current DAW state for context

        Returns:
            Intent category
        """
        if not self.client:
            logger.warning("⚠️ No API key, defaulting to GENERAL_CHAT")
            return Intent.GENERAL_CHAT

        # Build classification prompt
        context = f"\n\nCurrent DAW state:\n{daw_state_summary}" if daw_state_summary else ""

        classification_prompt = f"""Classify the user's music production request into ONE of these categories:

CREATE_CONTENT: User wants to add/create new tracks, clips, compositions, or musical content
MODIFY_CONTENT: User wants to change/edit existing tracks, clips, notes, or properties
DELETE_CONTENT: User wants to remove/delete tracks, clips, or content
ADD_EFFECTS: User wants to add/modify effects, or change the sound/timbre
PLAYBACK_CONTROL: User wants to play, stop, or control playback/tempo
QUERY_STATE: User is asking questions about the current composition state
GENERAL_CHAT: User is asking general questions or needs help/guidance

User request: "{user_message}"{context}

Respond with ONLY the category name (e.g., "CREATE_CONTENT"). No explanation."""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=50,
                messages=[{
                    "role": "user",
                    "content": classification_prompt
                }]
            )

            # Extract intent from response
            intent_str = response.content[0].text.strip().upper()

            # Map to Intent enum
            intent_map = {
                "CREATE_CONTENT": Intent.CREATE_CONTENT,
                "MODIFY_CONTENT": Intent.MODIFY_CONTENT,
                "DELETE_CONTENT": Intent.DELETE_CONTENT,
                "ADD_EFFECTS": Intent.ADD_EFFECTS,
                "PLAYBACK_CONTROL": Intent.PLAYBACK_CONTROL,
                "QUERY_STATE": Intent.QUERY_STATE,
                "GENERAL_CHAT": Intent.GENERAL_CHAT
            }

            intent = intent_map.get(intent_str, Intent.GENERAL_CHAT)
            logger.info(f"🔀 LLM routed to {intent.value}")

            return intent

        except Exception as e:
            logger.error(f"❌ Intent routing failed: {e}, defaulting to GENERAL_CHAT")
            return Intent.GENERAL_CHAT
    
    def get_tools_for_intent(self, intent: Intent) -> List[str]:
        """
        Get relevant tool names for an intent.
        
        This prevents tool bloat by only loading tools needed for the task.
        
        Args:
            intent: Intent category
        
        Returns:
            List of tool names to include
        """
        tool_map = {
            Intent.CREATE_CONTENT: [
                "create_track_with_content",  # PRIMARY
                "create_track",  # Legacy
                "create_midi_clip",  # Legacy
                "set_tempo"
            ],
            Intent.MODIFY_CONTENT: [
                "modify_clip",
                "modify_track",
                "move_clip",
                "transpose_clip",
                "set_clip_gain"
            ],
            Intent.DELETE_CONTENT: [
                "delete_track",
                "delete_clip",
                "clear_composition"
            ],
            Intent.ADD_EFFECTS: [
                "add_effect",
                "modify_effect",
                "remove_effect"
            ],
            Intent.PLAYBACK_CONTROL: [
                "play_composition",
                "stop_playback",
                "set_tempo"
            ],
            Intent.QUERY_STATE: [
                # No tools needed - just return state info
            ],
            Intent.GENERAL_CHAT: [
                # All tools available for general requests
                "create_track_with_content",
                "create_track",
                "create_midi_clip",
                "modify_clip",
                "modify_track",
                "delete_track",
                "delete_clip",
                "add_effect",
                "play_composition",
                "stop_playback"
            ]
        }
        
        tools = tool_map.get(intent, [])
        logger.info(f"🛠️  Tools for {intent.value}: {len(tools)} tools")
        
        return tools
    
    def get_system_prompt_for_intent(self, intent: Intent, instruments_list: str, effects_list: str) -> str:
        """
        Get specialized system prompt for an intent.
        
        Each intent gets a focused prompt (10-20 lines) instead of one giant prompt.
        
        Args:
            intent: Intent category
            instruments_list: Available instruments
            effects_list: Available effects
        
        Returns:
            System prompt string
        """
        prompts = {
            Intent.CREATE_CONTENT: f"""You are a music production assistant. Help users create musical content.

When creating tracks:
- Use create_track_with_content (creates track + clip + effects atomically)
- Provide realistic MIDI notes based on instrument type
- Add appropriate effects for the genre

AVAILABLE INSTRUMENTS:
{instruments_list}

AVAILABLE EFFECTS:
{effects_list}

Always provide complete musical content.""",

            Intent.MODIFY_CONTENT: f"""You are a music production assistant. Help users modify existing content.

When modifying:
- Use modify_clip to change notes, timing, or properties
- Use modify_track to change track settings
- Use move_clip to reposition clips
- Use transpose_clip to shift pitch

Be precise with modifications - ask for clarification if needed.""",

            Intent.DELETE_CONTENT: """You are a music production assistant. Help users delete content.

When deleting:
- Confirm what to delete if ambiguous
- Use delete_track or delete_clip as appropriate
- Warn if deletion would remove significant work""",

            Intent.ADD_EFFECTS: f"""You are a music production assistant. Help users add and configure effects.

When adding effects:
- Use add_effect to add effects to tracks
- Choose effects based on desired sound:
  - reverb: space/ambience
  - delay: echo/rhythm
  - lpf: warmth (removes highs)
  - hpf: clarity (removes lows)
  - distortion: grit/saturation

AVAILABLE EFFECTS:
{effects_list}

Suggest effect parameters based on genre and desired sound.""",

            Intent.PLAYBACK_CONTROL: """You are a music production assistant. Help users control playback.

Available controls:
- play_composition: Start playback
- stop_playback: Stop playback
- set_tempo: Change BPM (20-300)

Be responsive and direct.""",

            Intent.QUERY_STATE: """You are a music production assistant. Help users understand their composition.

Analyze the current DAW state and answer questions about:
- What tracks exist
- What clips are present
- Current settings (tempo, effects, etc.)
- Composition structure

Be clear and informative.""",

            Intent.GENERAL_CHAT: f"""You are a music production assistant. Help users with any music production task.

You can:
- Create tracks with musical content
- Modify existing content
- Add effects
- Control playback
- Answer questions

AVAILABLE INSTRUMENTS:
{instruments_list}

AVAILABLE EFFECTS:
{effects_list}

Be helpful and use the appropriate tools for each request."""
        }
        
        return prompts.get(intent, prompts[Intent.GENERAL_CHAT])

