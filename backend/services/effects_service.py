"""
Effects service - Audio effects processing
"""
import logging
from typing import Dict, List, Optional
from ..core.engine_manager import AudioEngineManager
from ..models.effect import Effect, EffectDef, EffectType

logger = logging.getLogger(__name__)


class EffectsService:
    """
    Effects service
    Manages effect definitions, instances, and processing chains
    """

    def __init__(self, engine: AudioEngineManager):
        """
        Initialize effects service

        Args:
            engine: Audio engine manager instance
        """
        self.engine = engine

        # Track active effects
        self.effects: Dict[int, Effect] = {}
        self.next_effect_id = 2000

        # EffectDef library
        self.effectdefs: Dict[str, EffectDef] = {}

        # Load default EffectDefs
        self._load_effectdefs()

    def _load_effectdefs(self):
        """Load comprehensive EffectDef library with LLM-friendly metadata"""

        # ===== REVERB EFFECTS =====
        self._register_reverb_effects()

        # ===== DELAY EFFECTS =====
        self._register_delay_effects()

        # ===== FILTER EFFECTS =====
        self._register_filter_effects()

        # ===== DISTORTION EFFECTS =====
        self._register_distortion_effects()

        # ===== MODULATION EFFECTS =====
        self._register_modulation_effects()

        # ===== DYNAMICS EFFECTS =====
        self._register_dynamics_effects()

        logger.info(f"Loaded {len(self.effectdefs)} EffectDefs across all categories")

    def _register_reverb_effects(self):
        """Register reverb effect definitions"""
        self.effectdefs["reverb"] = EffectDef(
            name="reverb",
            effect_type=EffectType.REVERB,
            parameters={"room_size": 0.5, "damping": 0.5, "wet": 0.3, "dry": 0.7, "width": 1.0},
            description="Reverb - simulates acoustic space reflections",
            parameter_ranges={
                "room_size": (0.0, 1.0),
                "damping": (0.0, 1.0),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0),
                "width": (0.0, 1.0)
            },
            parameter_descriptions={
                "room_size": "Size of the simulated room (0=small, 1=large)",
                "damping": "High frequency damping (0=bright, 1=dark)",
                "wet": "Wet signal level (reverb amount)",
                "dry": "Dry signal level (original signal)",
                "width": "Stereo width of reverb"
            }
        )

        self.effectdefs["hall_reverb"] = EffectDef(
            name="hall_reverb",
            effect_type=EffectType.REVERB,
            parameters={"size": 0.8, "decay": 3.0, "pre_delay": 0.02, "wet": 0.4, "dry": 0.6},
            description="Hall reverb - large concert hall simulation",
            parameter_ranges={
                "size": (0.0, 1.0),
                "decay": (0.1, 10.0),
                "pre_delay": (0.0, 0.1),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0)
            },
            parameter_descriptions={
                "size": "Hall size (0=small, 1=cathedral)",
                "decay": "Decay time in seconds",
                "pre_delay": "Pre-delay time in seconds",
                "wet": "Wet signal level",
                "dry": "Dry signal level"
            }
        )

        self.effectdefs["plate_reverb"] = EffectDef(
            name="plate_reverb",
            effect_type=EffectType.REVERB,
            parameters={"decay": 2.0, "damping": 0.3, "wet": 0.3, "dry": 0.7},
            description="Plate reverb - vintage plate reverb simulation",
            parameter_ranges={
                "decay": (0.1, 5.0),
                "damping": (0.0, 1.0),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0)
            },
            parameter_descriptions={
                "decay": "Decay time in seconds",
                "damping": "High frequency damping",
                "wet": "Wet signal level",
                "dry": "Dry signal level"
            }
        )

    def _register_delay_effects(self):
        """Register delay effect definitions"""
        self.effectdefs["delay"] = EffectDef(
            name="delay",
            effect_type=EffectType.DELAY,
            parameters={"time": 0.5, "feedback": 0.3, "wet": 0.3, "dry": 0.7},
            description="Delay - simple delay/echo effect",
            parameter_ranges={
                "time": (0.01, 2.0),
                "feedback": (0.0, 0.95),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0)
            },
            parameter_descriptions={
                "time": "Delay time in seconds",
                "feedback": "Feedback amount (0=single echo, 0.95=infinite)",
                "wet": "Wet signal level (delayed)",
                "dry": "Dry signal level (original)"
            }
        )



        self.effectdefs["ping_pong_delay"] = EffectDef(
            name="ping_pong_delay",
            effect_type=EffectType.DELAY,
            parameters={"time": 0.375, "feedback": 0.4, "wet": 0.4, "dry": 0.6},
            description="Ping pong delay - stereo bouncing delay",
            parameter_ranges={
                "time": (0.01, 2.0),
                "feedback": (0.0, 0.95),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0)
            },
            parameter_descriptions={
                "time": "Delay time in seconds",
                "feedback": "Feedback amount",
                "wet": "Wet signal level",
                "dry": "Dry signal level"
            }
        )

    def _register_filter_effects(self):
        """Register filter effect definitions"""
        self.effectdefs["lowpass"] = EffectDef(
            name="lowpass",
            effect_type=EffectType.FILTER,
            parameters={"cutoff": 1000.0, "resonance": 0.3},
            description="Low-pass filter - removes high frequencies",
            parameter_ranges={
                "cutoff": (20.0, 20000.0),
                "resonance": (0.1, 1.0)
            },
            parameter_descriptions={
                "cutoff": "Cutoff frequency in Hz",
                "resonance": "Filter resonance/Q (0.1=gentle, 1.0=sharp)"
            }
        )

        self.effectdefs["highpass"] = EffectDef(
            name="highpass",
            effect_type=EffectType.FILTER,
            parameters={"cutoff": 200.0, "resonance": 0.3},
            description="High-pass filter - removes low frequencies",
            parameter_ranges={
                "cutoff": (20.0, 20000.0),
                "resonance": (0.1, 1.0)
            },
            parameter_descriptions={
                "cutoff": "Cutoff frequency in Hz",
                "resonance": "Filter resonance/Q"
            }
        )

        self.effectdefs["eq"] = EffectDef(
            name="eq",
            effect_type=EffectType.EQ,
            parameters={"low": 0.0, "mid": 0.0, "high": 0.0, "low_freq": 100.0, "high_freq": 8000.0},
            description="3-band EQ - low/mid/high frequency control",
            parameter_ranges={
                "low": (-24.0, 24.0),
                "mid": (-24.0, 24.0),
                "high": (-24.0, 24.0),
                "low_freq": (20.0, 500.0),
                "high_freq": (2000.0, 20000.0)
            },
            parameter_descriptions={
                "low": "Low frequency gain in dB",
                "mid": "Mid frequency gain in dB",
                "high": "High frequency gain in dB",
                "low_freq": "Low/mid crossover frequency in Hz",
                "high_freq": "Mid/high crossover frequency in Hz"
            }
        )

    def _register_distortion_effects(self):
        """Register distortion effect definitions"""
        self.effectdefs["distortion"] = EffectDef(
            name="distortion",
            effect_type=EffectType.DISTORTION,
            parameters={"drive": 0.5, "tone": 0.5, "level": 0.7},
            description="Distortion - overdrive/distortion effect",
            parameter_ranges={
                "drive": (0.0, 1.0),
                "tone": (0.0, 1.0),
                "level": (0.0, 1.0)
            },
            parameter_descriptions={
                "drive": "Distortion amount (0=clean, 1=heavy)",
                "tone": "Tone control (0=dark, 1=bright)",
                "level": "Output level"
            }
        )

        self.effectdefs["bitcrusher"] = EffectDef(
            name="bitcrusher",
            effect_type=EffectType.BITCRUSHER,
            parameters={"bits": 8.0, "sample_rate": 8000.0, "wet": 0.7, "dry": 0.3},
            description="Bitcrusher - lo-fi digital degradation",
            parameter_ranges={
                "bits": (1.0, 16.0),
                "sample_rate": (100.0, 48000.0),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0)
            },
            parameter_descriptions={
                "bits": "Bit depth (1=extreme lo-fi, 16=clean)",
                "sample_rate": "Sample rate in Hz",
                "wet": "Wet signal level",
                "dry": "Dry signal level"
            }
        )

    def _register_modulation_effects(self):
        """Register modulation effect definitions"""
        self.effectdefs["chorus"] = EffectDef(
            name="chorus",
            effect_type=EffectType.CHORUS,
            parameters={"rate": 1.5, "depth": 0.3, "wet": 0.5, "dry": 0.5},
            description="Chorus - pitch modulation for thickness",
            parameter_ranges={
                "rate": (0.1, 10.0),
                "depth": (0.0, 1.0),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0)
            },
            parameter_descriptions={
                "rate": "Modulation rate in Hz",
                "depth": "Modulation depth",
                "wet": "Wet signal level",
                "dry": "Dry signal level"
            }
        )

        self.effectdefs["flanger"] = EffectDef(
            name="flanger",
            effect_type=EffectType.FLANGER,
            parameters={"rate": 0.5, "depth": 0.7, "feedback": 0.5, "wet": 0.5, "dry": 0.5},
            description="Flanger - jet-like sweeping effect",
            parameter_ranges={
                "rate": (0.1, 10.0),
                "depth": (0.0, 1.0),
                "feedback": (0.0, 0.95),
                "wet": (0.0, 1.0),
                "dry": (0.0, 1.0)
            },
            parameter_descriptions={
                "rate": "Modulation rate in Hz",
                "depth": "Modulation depth",
                "feedback": "Feedback amount",
                "wet": "Wet signal level",
                "dry": "Dry signal level"
            }
        )

    def _register_dynamics_effects(self):
        """Register dynamics effect definitions"""
        self.effectdefs["compressor"] = EffectDef(
            name="compressor",
            effect_type=EffectType.COMPRESSOR,
            parameters={"threshold": -20.0, "ratio": 4.0, "attack": 0.01, "release": 0.1, "makeup": 0.0},
            description="Compressor - dynamic range compression",
            parameter_ranges={
                "threshold": (-60.0, 0.0),
                "ratio": (1.0, 20.0),
                "attack": (0.001, 0.1),
                "release": (0.01, 1.0),
                "makeup": (0.0, 24.0)
            },
            parameter_descriptions={
                "threshold": "Threshold in dB",
                "ratio": "Compression ratio (1=no compression, 20=limiting)",
                "attack": "Attack time in seconds",
                "release": "Release time in seconds",
                "makeup": "Makeup gain in dB"
            }
        )

    async def create_effect(
        self,
        effectdef: str,
        parameters: Optional[Dict[str, float]] = None,
        group: int = 2,
        bus_in: Optional[int] = None,
        bus_out: Optional[int] = None
    ) -> Effect:
        """
        Create a new effect instance

        Args:
            effectdef: EffectDef name
            parameters: Initial parameter values
            group: Target group ID
            bus_in: Input bus ID
            bus_out: Output bus ID

        Returns:
            Effect instance
        """
        if effectdef not in self.effectdefs:
            raise ValueError(f"EffectDef '{effectdef}' not found")

        effect_id = self.next_effect_id
        self.next_effect_id += 1

        # Merge default parameters with provided ones
        effectdef_obj = self.effectdefs[effectdef]
        params = {**effectdef_obj.parameters, **(parameters or {})}

        # Add bus routing if specified
        if bus_in is not None:
            params["in"] = bus_in
        if bus_out is not None:
            params["out"] = bus_out

        effect = Effect(
            id=effect_id,
            effect_def=effectdef,
            parameters=params,
            group=group,
            bus_in=bus_in,
            bus_out=bus_out
        )

        self.effects[effect_id] = effect

        # Send OSC message to create effect on SuperCollider
        if self.engine.server and self.engine.is_running:
            try:
                # Build parameter list for OSC message
                osc_params = []
                for key, value in params.items():
                    osc_params.extend([key, value])

                # Send /s_new message for effect (effects are synths too)
                self.engine.server.send_message("/s_new", [effectdef, effect_id, 1, group] + osc_params)
                logger.info(f"Created effect {effect_id} ({effectdef}) on SuperCollider")
            except Exception as e:
                logger.error(f"Failed to send OSC message for effect creation: {e}")
        else:
            logger.warning(f"Created effect {effect_id} ({effectdef}) but SuperCollider not running")

        return effect

    async def free_effect(self, effect_id: int):
        """Free an effect"""
        if effect_id in self.effects:
            # Send OSC message to free effect on SuperCollider
            if self.engine.server and self.engine.is_running:
                try:
                    self.engine.server.send_message("/n_free", [effect_id])
                    logger.info(f"Freed effect {effect_id} on SuperCollider")
                except Exception as e:
                    logger.error(f"Failed to send OSC message for effect free: {e}")

            del self.effects[effect_id]
            logger.info(f"Freed effect {effect_id}")

    async def set_parameter(self, effect_id: int, param: str, value: float):
        """Set effect parameter"""
        if effect_id not in self.effects:
            raise ValueError(f"Effect {effect_id} not found")

        effect = self.effects[effect_id]
        effect.set(param, value)

        # Send OSC message to update parameter on SuperCollider
        if self.engine.server and self.engine.is_running:
            try:
                self.engine.server.send_message("/n_set", [effect_id, param, value])
                logger.debug(f"Set effect {effect_id} {param} = {value} on SuperCollider")
            except Exception as e:
                logger.error(f"Failed to send OSC message for effect parameter update: {e}")
        else:
            logger.debug(f"Set effect {effect_id} {param} = {value} (SuperCollider not running)")

    async def bypass_effect(self, effect_id: int, bypass: bool):
        """Bypass/enable an effect"""
        if effect_id not in self.effects:
            raise ValueError(f"Effect {effect_id} not found")

        effect = self.effects[effect_id]
        effect.bypass = bypass

        # Send OSC message to bypass effect (set wet/dry mix)
        if self.engine.server and self.engine.is_running:
            try:
                # When bypassed, set mix to 0 (all dry), otherwise 1 (all wet)
                mix_value = 0.0 if bypass else 1.0
                self.engine.server.send_message("/n_set", [effect_id, "mix", mix_value])
                logger.info(f"Effect {effect_id} bypass = {bypass} on SuperCollider")
            except Exception as e:
                logger.error(f"Failed to send OSC message for effect bypass: {e}")
        else:
            logger.info(f"Effect {effect_id} bypass = {bypass} (SuperCollider not running)")

    def get_effect(self, effect_id: int) -> Optional[Effect]:
        """Get effect by ID"""
        return self.effects.get(effect_id)

    def get_effectdefs(self) -> List[EffectDef]:
        """Get all available EffectDefs"""
        return list(self.effectdefs.values())

    def get_effectdefs_by_type(self, effect_type: EffectType) -> List[EffectDef]:
        """Get EffectDefs by type"""
        return [ed for ed in self.effectdefs.values() if ed.effect_type == effect_type]

    def register_effectdef(self, effectdef: EffectDef):
        """Register a new EffectDef"""
        self.effectdefs[effectdef.name] = effectdef
        logger.info(f"Registered EffectDef: {effectdef.name}")
