"""
Track Effects Service - Manages insert effect chains for tracks

Each track can have up to 8 insert effects in series:
- Effects are ordered in slots (0-7)
- Signal flows: synth → effect1 → effect2 → ... → mixer
- Effects are created in Group 2 (effects/mixer group)
- Effects use the track's bus for in-place processing

Architecture:
- Node IDs: 4000-4999 (reserved for effect synths)
- Effects read from track bus and write back to same bus (ReplaceOut)
- Effects are ordered BEFORE mixer channel in the node tree
"""
import logging
import uuid
from typing import Dict, List, Optional
from datetime import datetime

from backend.models.effects import EffectInstance, TrackEffectChain
from backend.services.effect_definitions import get_effect_definition

logger = logging.getLogger(__name__)


class TrackEffectsService:
    """
    Manages insert effect chains for sequencer tracks
    
    Architecture:
    - One effect chain per track (up to 8 slots)
    - Node IDs: 4000-4999 (reserved for effect synths)
    - Effects process audio in-place on track bus
    - Effects are ordered before mixer channel in node tree
    """
    
    def __init__(self, engine_manager, bus_manager, mixer_channel_service):
        self.engine_manager = engine_manager
        self.bus_manager = bus_manager
        self.mixer_channel_service = mixer_channel_service
        
        self.next_effect_node_id = 4000  # Reserved range for effect synths
        self.track_effect_chains: Dict[str, TrackEffectChain] = {}  # track_id -> effect chain
        
        logger.info("🎛️ Track effects service initialized")
    
    async def create_effect(
        self,
        track_id: str,
        effect_name: str,
        slot_index: Optional[int] = None,
        display_name: Optional[str] = None
    ) -> EffectInstance:
        """
        Create a new effect instance on a track
        
        Args:
            track_id: Sequencer track ID
            effect_name: Effect SynthDef name (e.g., "lpf", "reverb")
            slot_index: Slot position (0-7), auto-assigned if None
            display_name: Custom display name, auto-generated if None
            
        Returns:
            Created effect instance
        """
        try:
            # Get effect definition
            effect_def = get_effect_definition(effect_name)
            
            # Get or create effect chain for this track
            if track_id not in self.track_effect_chains:
                self.track_effect_chains[track_id] = TrackEffectChain(track_id=track_id)
            
            chain = self.track_effect_chains[track_id]
            
            # Auto-assign slot if not specified
            if slot_index is None:
                # Find first empty slot
                used_slots = {effect.slot_index for effect in chain.effects}
                for i in range(chain.max_slots):
                    if i not in used_slots:
                        slot_index = i
                        break
                else:
                    raise ValueError(f"Track {track_id} has no empty effect slots (max {chain.max_slots})")
            
            # Validate slot index
            if slot_index < 0 or slot_index >= chain.max_slots:
                raise ValueError(f"Invalid slot index {slot_index} (must be 0-{chain.max_slots-1})")
            
            # Check if slot is already occupied
            if any(effect.slot_index == slot_index for effect in chain.effects):
                raise ValueError(f"Slot {slot_index} is already occupied on track {track_id}")
            
            # Get track bus
            track_bus = self.bus_manager.get_track_bus(track_id)
            if track_bus is None:
                raise ValueError(f"Track {track_id} has no allocated bus")
            
            # Generate instance ID and display name
            instance_id = str(uuid.uuid4())
            if display_name is None:
                display_name = f"{effect_def.display_name} {slot_index + 1}"
            
            # Initialize parameters with defaults
            parameters = {param.name: param.default for param in effect_def.parameters}
            
            # Allocate node ID for effect synth
            node_id = self.next_effect_node_id
            self.next_effect_node_id += 1
            
            # Create effect instance model
            effect_instance = EffectInstance(
                id=instance_id,
                effect_name=effect_name,
                display_name=display_name,
                track_id=track_id,
                slot_index=slot_index,
                parameters=parameters,
                is_bypassed=False,
                is_enabled=True,
                sc_node_id=node_id,
                sc_bus_in=track_bus,
                sc_bus_out=track_bus,  # In-place processing
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            # Create effect synth in SuperCollider
            # Target: Group 2 (effects/mixer group)
            # Add action: addToHead (effects must come BEFORE mixer channel)
            await self._create_effect_synth(effect_instance)
            
            # Add to chain
            chain.effects.append(effect_instance)
            # Sort by slot index to maintain order
            chain.effects.sort(key=lambda e: e.slot_index)
            
            logger.info(f"🎛️ Created effect {effect_name} on track {track_id} slot {slot_index} (node {node_id}, bus {track_bus})")

            return effect_instance

        except Exception as e:
            logger.error(f"❌ Failed to create effect {effect_name} on track {track_id}: {e}")
            raise

    async def _create_effect_synth(self, effect: EffectInstance) -> None:
        """
        Create effect synth in SuperCollider

        Args:
            effect: Effect instance with SC parameters
        """
        # Build parameter list for OSC message
        params = [
            "inBus", effect.sc_bus_in,
            "outBus", effect.sc_bus_out,
        ]

        # Add effect-specific parameters
        for param_name, param_value in effect.parameters.items():
            params.append(param_name)
            params.append(param_value)

        # Create synth
        # Add action: 0 = addToHead (effects must come BEFORE mixer channel)
        # Target: Group 2 (effects/mixer group)
        self.engine_manager.send_message(
            "/s_new",
            effect.effect_name,  # SynthDef name
            effect.sc_node_id,
            0,  # Add action: addToHead
            2,  # Target group: effects/mixer group
            *params
        )

    async def update_effect_parameter(
        self,
        effect_id: str,
        parameter_name: str,
        value: float
    ) -> EffectInstance:
        """
        Update an effect parameter

        Args:
            effect_id: Effect instance ID
            parameter_name: Parameter name
            value: New parameter value

        Returns:
            Updated effect instance
        """
        try:
            # Find effect instance
            effect = self._find_effect_by_id(effect_id)
            if effect is None:
                raise ValueError(f"Effect {effect_id} not found")

            # Validate parameter exists
            effect_def = get_effect_definition(effect.effect_name)
            param_def = next((p for p in effect_def.parameters if p.name == parameter_name), None)
            if param_def is None:
                raise ValueError(f"Parameter {parameter_name} not found in effect {effect.effect_name}")

            # Clamp value to parameter range
            if param_def.min is not None and param_def.max is not None:
                value = max(param_def.min, min(param_def.max, value))

            # Update parameter in SuperCollider
            self.engine_manager.send_message("/n_set", effect.sc_node_id, parameter_name, value)

            # Update stored value
            effect.parameters[parameter_name] = value
            effect.updated_at = datetime.now()

            logger.debug(f"Updated effect {effect_id} parameter {parameter_name} = {value}")

            return effect

        except Exception as e:
            logger.error(f"❌ Failed to update effect parameter: {e}")
            raise

    async def update_effect_bypass(self, effect_id: str, is_bypassed: bool) -> EffectInstance:
        """
        Update effect bypass state

        Args:
            effect_id: Effect instance ID
            is_bypassed: New bypass state

        Returns:
            Updated effect instance
        """
        try:
            effect = self._find_effect_by_id(effect_id)
            if effect is None:
                raise ValueError(f"Effect {effect_id} not found")

            # Update bypass parameter in SuperCollider
            # bypass: 0=active, 1=bypassed
            self.engine_manager.send_message("/n_set", effect.sc_node_id, "bypass", 1 if is_bypassed else 0)

            # Update stored state
            effect.is_bypassed = is_bypassed
            effect.updated_at = datetime.now()

            logger.info(f"🎛️ {'Bypassed' if is_bypassed else 'Activated'} effect {effect_id}")

            return effect

        except Exception as e:
            logger.error(f"❌ Failed to update effect bypass: {e}")
            raise

    async def delete_effect(self, effect_id: str) -> None:
        """
        Delete an effect instance

        Args:
            effect_id: Effect instance ID
        """
        try:
            # Find effect and its chain
            effect = None
            chain = None
            for track_id, track_chain in self.track_effect_chains.items():
                for e in track_chain.effects:
                    if e.id == effect_id:
                        effect = e
                        chain = track_chain
                        break
                if effect:
                    break

            if effect is None:
                raise ValueError(f"Effect {effect_id} not found")

            # Free synth in SuperCollider
            self.engine_manager.send_message("/n_free", effect.sc_node_id)

            # Remove from chain
            chain.effects.remove(effect)

            logger.info(f"🗑️ Deleted effect {effect_id} (node {effect.sc_node_id})")

        except Exception as e:
            logger.error(f"❌ Failed to delete effect: {e}")
            raise

    async def move_effect(self, effect_id: str, new_slot_index: int) -> EffectInstance:
        """
        Move an effect to a different slot

        Args:
            effect_id: Effect instance ID
            new_slot_index: New slot position (0-7)

        Returns:
            Updated effect instance
        """
        try:
            # Find effect and its chain
            effect = None
            chain = None
            for track_id, track_chain in self.track_effect_chains.items():
                for e in track_chain.effects:
                    if e.id == effect_id:
                        effect = e
                        chain = track_chain
                        break
                if effect:
                    break

            if effect is None:
                raise ValueError(f"Effect {effect_id} not found")

            # Validate new slot index
            if new_slot_index < 0 or new_slot_index >= chain.max_slots:
                raise ValueError(f"Invalid slot index {new_slot_index} (must be 0-{chain.max_slots-1})")

            # Check if new slot is occupied by a different effect
            existing_effect = next((e for e in chain.effects if e.slot_index == new_slot_index and e.id != effect_id), None)
            if existing_effect:
                raise ValueError(f"Slot {new_slot_index} is already occupied")

            old_slot = effect.slot_index
            effect.slot_index = new_slot_index
            effect.updated_at = datetime.now()

            # Re-sort chain by slot index
            chain.effects.sort(key=lambda e: e.slot_index)

            # Note: In SuperCollider, node order matters for signal flow
            # We would need to recreate the effect synth in the correct position
            # For now, we'll just update the slot index in our model
            # TODO: Implement proper node reordering in SuperCollider

            logger.info(f"🎛️ Moved effect {effect_id} from slot {old_slot} to slot {new_slot_index}")

            return effect

        except Exception as e:
            logger.error(f"❌ Failed to move effect: {e}")
            raise

    def get_track_effect_chain(self, track_id: str) -> TrackEffectChain:
        """
        Get effect chain for a track

        Args:
            track_id: Sequencer track ID

        Returns:
            Track effect chain (empty if no effects)
        """
        if track_id not in self.track_effect_chains:
            return TrackEffectChain(track_id=track_id)
        return self.track_effect_chains[track_id]

    def get_effect(self, effect_id: str) -> Optional[EffectInstance]:
        """
        Get effect instance by ID

        Args:
            effect_id: Effect instance ID

        Returns:
            Effect instance or None if not found
        """
        return self._find_effect_by_id(effect_id)

    async def clear_track_effects(self, track_id: str) -> None:
        """
        Remove all effects from a track

        Args:
            track_id: Sequencer track ID
        """
        try:
            if track_id not in self.track_effect_chains:
                return

            chain = self.track_effect_chains[track_id]

            # Free all effect synths
            for effect in chain.effects:
                self.engine_manager.send_message("/n_free", effect.sc_node_id)
                logger.info(f"🗑️ Freed effect {effect.id} (node {effect.sc_node_id})")

            # Clear chain
            chain.effects.clear()

            logger.info(f"🗑️ Cleared all effects from track {track_id}")

        except Exception as e:
            logger.error(f"❌ Failed to clear track effects: {e}")
            raise

    def _find_effect_by_id(self, effect_id: str) -> Optional[EffectInstance]:
        """
        Find effect instance by ID across all tracks

        Args:
            effect_id: Effect instance ID

        Returns:
            Effect instance or None if not found
        """
        for chain in self.track_effect_chains.values():
            for effect in chain.effects:
                if effect.id == effect_id:
                    return effect
        return None

