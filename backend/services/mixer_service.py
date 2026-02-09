"""
Mixer service - Track management and routing
"""
import logging
from typing import Dict, List, Optional
from ..core.engine_manager import AudioEngineManager
from ..models.track import Track, TrackType, Effect

logger = logging.getLogger(__name__)


class MixerService:
    """
    Mixer service
    Manages tracks, routing, volume/pan, and send/return buses
    """

    def __init__(self, engine: AudioEngineManager):
        """
        Initialize mixer service

        Args:
            engine: Audio engine manager instance
        """
        self.engine = engine

        # Track storage
        self.tracks: Dict[str, Track] = {}

        # Create default master track
        self._create_master_track()

    def _create_master_track(self):
        """Create default master track"""
        # Allocate master bus (hardware output 0-1)
        master_track = Track(
            id="master",
            name="Master",
            type=TrackType.MASTER,
            bus=0,  # Hardware output
            volume=1.0,
            pan=0.0
        )
        self.tracks["master"] = master_track
        logger.info("Created master track")

    async def create_track(
        self,
        name: str,
        track_type: TrackType = TrackType.AUDIO
    ) -> Track:
        """
        Create a new track

        Args:
            name: Track name
            track_type: Track type (AUDIO, MIDI, AUX)

        Returns:
            Track instance
        """
        # Allocate audio bus for track
        bus = self.engine.bus_manager.allocate_audio_bus(channels=2, name=f"{name}_bus")

        track_id = f"track_{len(self.tracks)}"
        track = Track(
            id=track_id,
            name=name,
            type=track_type,
            bus=bus.id
        )

        self.tracks[track_id] = track
        logger.info(f"Created track: {name} (bus {bus.id})")

        return track

    async def delete_track(self, track_id: str):
        """Delete a track"""
        if track_id == "master":
            raise ValueError("Cannot delete master track")

        if track_id in self.tracks:
            track = self.tracks[track_id]

            # Free bus
            self.engine.bus_manager.free_audio_bus(track.bus)

            # Remove track
            del self.tracks[track_id]
            logger.info(f"Deleted track: {track_id}")

    async def set_volume(self, track_id: str, volume: float):
        """Set track volume (0.0-2.0)"""
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.volume = max(0.0, min(2.0, volume))

        # TODO: Send OSC message to update volume
        logger.debug(f"Set track {track_id} volume = {track.volume}")

    async def set_pan(self, track_id: str, pan: float):
        """Set track pan (-1.0 to 1.0)"""
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.pan = max(-1.0, min(1.0, pan))

        # TODO: Send OSC message to update pan
        logger.debug(f"Set track {track_id} pan = {track.pan}")

    async def mute(self, track_id: str, muted: bool):
        """Mute/unmute track"""
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.muted = muted

        # TODO: Send OSC message to mute/unmute
        logger.info(f"Track {track_id} muted = {muted}")

    async def solo(self, track_id: str, soloed: bool):
        """Solo/unsolo track"""
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.soloed = soloed

        # TODO: Implement solo logic (mute all non-soloed tracks)
        logger.info(f"Track {track_id} soloed = {soloed}")

    def get_track(self, track_id: str) -> Optional[Track]:
        """Get track by ID"""
        return self.tracks.get(track_id)

    def get_all_tracks(self) -> List[Track]:
        """Get all tracks"""
        return list(self.tracks.values())

    # ===== AUX SEND/RETURN MANAGEMENT =====

    async def create_aux_track(self, name: str) -> Track:
        """
        Create an aux send/return track

        Args:
            name: Aux track name

        Returns:
            Aux track instance
        """
        return await self.create_track(name, TrackType.AUX)

    async def set_send_level(self, track_id: str, aux_track_id: str, level: float):
        """
        Set send level from track to aux

        Args:
            track_id: Source track ID
            aux_track_id: Destination aux track ID
            level: Send level (0.0-1.0)
        """
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")
        if aux_track_id not in self.tracks:
            raise ValueError(f"Aux track {aux_track_id} not found")

        track = self.tracks[track_id]
        aux_track = self.tracks[aux_track_id]

        if aux_track.type != TrackType.AUX:
            raise ValueError(f"Track {aux_track_id} is not an aux track")

        # Set send level
        track.set_send(aux_track_id, max(0.0, min(1.0, level)))

        # TODO: Send OSC message to create/update send
        logger.debug(f"Set send {track_id} -> {aux_track_id} = {level}")

    async def remove_send(self, track_id: str, aux_track_id: str):
        """Remove send from track to aux"""
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        if aux_track_id in track.send_levels:
            del track.send_levels[aux_track_id]
            logger.info(f"Removed send {track_id} -> {aux_track_id}")

    # ===== EFFECT CHAIN MANAGEMENT =====

    async def add_effect_to_track(self, track_id: str, effect: Effect):
        """
        Add effect to track's effect chain

        Args:
            track_id: Track ID
            effect: Effect instance
        """
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.add_effect(effect)

        # TODO: Send OSC message to insert effect in chain
        logger.info(f"Added effect {effect.id} ({effect.type}) to track {track_id}")

    async def remove_effect_from_track(self, track_id: str, effect_id: int):
        """
        Remove effect from track's effect chain

        Args:
            track_id: Track ID
            effect_id: Effect ID
        """
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.remove_effect(effect_id)

        # TODO: Send OSC message to remove effect from chain
        logger.info(f"Removed effect {effect_id} from track {track_id}")

    async def reorder_effects(self, track_id: str, effect_ids: List[int]):
        """
        Reorder effects in track's effect chain

        Args:
            track_id: Track ID
            effect_ids: Ordered list of effect IDs
        """
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]

        # Validate all effect IDs exist
        existing_ids = {e.id for e in track.effects}
        if set(effect_ids) != existing_ids:
            raise ValueError("Effect IDs don't match track's effects")

        # Reorder effects
        effect_map = {e.id: e for e in track.effects}
        track.effects = [effect_map[eid] for eid in effect_ids]

        # TODO: Send OSC messages to reorder effects
        logger.info(f"Reordered effects on track {track_id}")

    # ===== TRACK GROUPING =====

    async def create_group_track(self, name: str, track_ids: List[str]) -> Track:
        """
        Create a group track that routes multiple tracks

        Args:
            name: Group track name
            track_ids: List of track IDs to route to this group

        Returns:
            Group track instance
        """
        # Create group track (essentially an audio track)
        group_track = await self.create_track(name, TrackType.AUDIO)

        # Route all specified tracks to this group
        for track_id in track_ids:
            if track_id not in self.tracks:
                logger.warning(f"Track {track_id} not found, skipping")
                continue

            # TODO: Send OSC message to route track to group bus
            logger.debug(f"Routed track {track_id} to group {group_track.id}")

        logger.info(f"Created group track {name} with {len(track_ids)} tracks")
        return group_track

    # ===== MASTER BUS PROCESSING =====

    async def add_master_effect(self, effect: Effect):
        """Add effect to master bus"""
        await self.add_effect_to_track("master", effect)

    async def remove_master_effect(self, effect_id: int):
        """Remove effect from master bus"""
        await self.remove_effect_from_track("master", effect_id)

    async def set_master_volume(self, volume: float):
        """Set master output volume"""
        await self.set_volume("master", volume)

    # ===== UTILITY METHODS =====

    def get_tracks_by_type(self, track_type: TrackType) -> List[Track]:
        """Get all tracks of a specific type"""
        return [t for t in self.tracks.values() if t.type == track_type]

    def get_soloed_tracks(self) -> List[Track]:
        """Get all soloed tracks"""
        return [t for t in self.tracks.values() if t.soloed]

    def get_muted_tracks(self) -> List[Track]:
        """Get all muted tracks"""
        return [t for t in self.tracks.values() if t.muted]

    async def reset_all_sends(self, track_id: str):
        """Remove all sends from a track"""
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.send_levels.clear()
        logger.info(f"Reset all sends on track {track_id}")

    async def clear_all_effects(self, track_id: str):
        """Remove all effects from a track"""
        if track_id not in self.tracks:
            raise ValueError(f"Track {track_id} not found")

        track = self.tracks[track_id]
        track.effects.clear()
        logger.info(f"Cleared all effects from track {track_id}")

